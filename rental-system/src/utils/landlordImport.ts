/**
 * 新房東「現況接管」匯入：驗證工作簿並規劃要寫入的文件（純函式）。
 *
 * 流程：畫面讀檔並用 importCells 正規化日期 → buildLandlordImportPlan 跨表驗證（零錯誤才有計畫）
 *   → planLandlordImportWrites 產生全部文件 → landlordImportService 寫入。
 * 寫入欄位與既有建檔路徑（租客列表、租客匯入、上線精靈）一致，匯入的租客不需要再補資料就能出帳。
 */
import { roomNameKey } from './roomBatch'
import { cellNumber, cellText, isMonth, isRealDate } from './importCells'
import { buildDeposits, leaseDurationYears } from './tenantRecords'
import type { WaterSettings, WaterMode } from './financials/water'

export type PaymentFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'yearly'

export interface PropertyImportRow { name: string; address?: string; waterMode?: string; waterBasis?: string; fixedWaterAmount?: unknown }
export interface RoomImportRow { propertyName: string; floor?: string; name: string; rent?: unknown; size?: unknown; layout?: string; waterMode?: string; waterNo?: string }
export interface TenantImportRow { roomName: string; name: string; phone?: string; email?: string; idNumber?: string; occupants?: unknown; emergencyContact?: string }
export interface LeaseImportRow { roomName: string; startDate: string; endDate: string; rent?: unknown; depositMonths?: unknown; paymentFrequency?: string; rentPaidThrough?: string }
export interface OutstandingImportRow { roomName: string; category: string; amount: unknown; dueDate: string; description?: string; coverFrom?: string; coverTo?: string }
export interface CreditImportRow { roomName: string; amount: unknown; note?: string }
export interface MeterReadingImportRow { roomName: string; date: string; reading: unknown }

export interface LandlordImportWorkbook {
  properties: PropertyImportRow[]
  rooms: RoomImportRow[]
  tenants: TenantImportRow[]
  leases: LeaseImportRow[]
  outstanding: OutstandingImportRow[]
  credits: CreditImportRow[]
  meterReadings: MeterReadingImportRow[]
}

export interface PlannedProperty { key: string; name: string; address: string; waterSettings?: WaterSettings }
export interface PlannedRoom {
  key: string; name: string; propertyKey: string; floor: string
  rent: number; size: number; layout: string; waterMode: '' | 'independent' | 'tenant_direct'; waterNo: string
  /** 最近一次電表讀數，作為之後抄表的起點 */
  baseline?: { date: string; reading: number }
}
export interface PlannedTenant {
  roomKey: string; name: string; phone: string; email: string; idNumber: string
  occupants: number; emergencyContact: string; credit: number; creditNote: string
}
export interface PlannedLease {
  roomKey: string; startDate: string; endDate: string; rent: number; depositMonths: number
  paymentFrequency: PaymentFrequency
  /** 舊系統已收租金涵蓋到的月份（YYYY-MM），出帳時不再重收 */
  rentPaidThrough: string
}
export interface PlannedOutstanding {
  roomKey: string; category: string; amount: number; dueDate: string; description: string; coverFrom: string; coverTo: string
}

export interface LandlordImportPlan {
  properties: PlannedProperty[]
  rooms: PlannedRoom[]
  tenants: PlannedTenant[]
  leases: PlannedLease[]
  outstanding: PlannedOutstanding[]
  summary: { properties: number; rooms: number; tenants: number; leases: number; bills: number; credits: number; meterBaselines: number }
}

/** 系統認得的收入類別；打錯字（如「租金」）會讓出帳認不出而重複收取 */
export const IMPORT_BILL_CATEGORIES = ['租金收入', '水費', '電費', '公共電費', '入住款項', '押金', '其他收入'] as const

const WATER_MODE_ALIASES: Record<string, WaterMode> = {
  landlord: 'landlord', 房東負擔: 'landlord',
  fixed: 'fixed', 固定月費: 'fixed',
  split: 'split', 台水帳單均攤: 'split', 均攤: 'split',
  tenant_direct: 'tenant_direct', 租客自行繳納: 'tenant_direct', 租客自繳: 'tenant_direct',
  unset: 'unset', 尚未設定: 'unset',
}
const WATER_BASIS_ALIASES: Record<string, 'room' | 'person'> = { room: 'room', 每房: 'room', 房: 'room', person: 'person', 每人: 'person', 人: 'person' }
const ROOM_WATER_ALIASES: Record<string, 'independent' | 'tenant_direct'> = {
  independent: 'independent', 獨立水號: 'independent', tenant_direct: 'tenant_direct', 租客自行繳納: 'tenant_direct', 租客自繳: 'tenant_direct',
}
const FREQUENCY_ALIASES: Record<string, PaymentFrequency> = {
  monthly: 'monthly', 月繳: 'monthly', quarterly: 'quarterly', 季繳: 'quarterly',
  semiannual: 'semiannual', 半年繳: 'semiannual', yearly: 'yearly', 年繳: 'yearly',
}

export const importKey = (value: unknown) => roomNameKey(cellText(value))

const lookup = <T>(aliases: Record<string, T>, value: unknown): T | undefined => {
  const t = cellText(value)
  return aliases[t] ?? aliases[t.toLowerCase()]
}

/** 非負數字欄位；空白為 fallback，無法辨識或負數回傳 null（由呼叫端報錯） */
const amountOf = (value: unknown, fallback = 0): number | null => {
  const n = cellNumber(value)
  if (n === null) return fallback
  return Number.isFinite(n) && n >= 0 ? n : null
}
const wholeOf = (value: unknown, fallback = 0): number | null => {
  const n = amountOf(value, fallback)
  return n !== null && Number.isSafeInteger(n) ? n : null
}

export const buildLandlordImportPlan = (
  raw: LandlordImportWorkbook,
  existing: { propertyNames?: string[]; roomNames?: string[] } = {},
): { errors: string[]; plan?: LandlordImportPlan } => {
  const errors: string[] = []
  const at = (sheet: string, index: number) => `${sheet}第 ${index + 2} 列`
  const existingProperties = new Set((existing.propertyNames ?? []).map(importKey))
  const existingRooms = new Set((existing.roomNames ?? []).map(importKey))

  const propertiesIn = raw.properties ?? []
  const roomsIn = raw.rooms ?? []
  if (!propertiesIn.length) errors.push('「建物」至少需要一筆資料')
  if (!roomsIn.length) errors.push('「房間」至少需要一筆資料')

  // 建物
  const properties = new Map<string, PlannedProperty>()
  propertiesIn.forEach((row, i) => {
    const name = cellText(row.name); const key = importKey(name)
    if (!key) { errors.push(`${at('建物', i)}：建物名稱為必填`); return }
    if (properties.has(key)) errors.push(`${at('建物', i)}：建物名稱重複「${name}」`)
    if (existingProperties.has(key)) errors.push(`${at('建物', i)}：系統已有建物「${name}」`)
    let waterSettings: WaterSettings | undefined
    if (cellText(row.waterMode)) {
      const mode = lookup(WATER_MODE_ALIASES, row.waterMode)
      const basis = cellText(row.waterBasis) ? lookup(WATER_BASIS_ALIASES, row.waterBasis) : 'room'
      const fixedAmount = wholeOf(row.fixedWaterAmount)
      if (!mode) errors.push(`${at('建物', i)}：水費方式「${cellText(row.waterMode)}」無法辨識`)
      if (!basis) errors.push(`${at('建物', i)}：均攤基準請填「每房」或「每人」`)
      if (fixedAmount === null) errors.push(`${at('建物', i)}：固定月費必須是正整數`)
      if (mode === 'fixed' && !fixedAmount) errors.push(`${at('建物', i)}：水費為固定月費時，月費必須大於 0`)
      if (mode && basis && fixedAmount !== null) waterSettings = { mode, basis, fixedAmount: mode === 'fixed' ? fixedAmount : 0 }
    }
    properties.set(key, { key, name, address: cellText(row.address), ...(waterSettings ? { waterSettings } : {}) })
  })

  // 房間
  const rooms = new Map<string, PlannedRoom>()
  roomsIn.forEach((row, i) => {
    const name = cellText(row.name); const key = importKey(name); const propertyKey = importKey(row.propertyName)
    if (!key) { errors.push(`${at('房間', i)}：房號為必填`); return }
    if (rooms.has(key)) errors.push(`${at('房間', i)}：房號重複「${name}」`)
    if (existingRooms.has(key)) errors.push(`${at('房間', i)}：系統已有房號「${name}」`)
    if (!properties.has(propertyKey)) errors.push(`${at('房間', i)}：建物「${cellText(row.propertyName)}」不在「建物」工作表`)
    const rent = wholeOf(row.rent); const size = amountOf(row.size)
    if (rent === null) errors.push(`${at('房間', i)}：月租金必須是非負整數`)
    if (size === null) errors.push(`${at('房間', i)}：坪數必須是非負數字`)
    const waterMode = cellText(row.waterMode) ? lookup(ROOM_WATER_ALIASES, row.waterMode) : ''
    if (waterMode === undefined) errors.push(`${at('房間', i)}：水費覆寫請填「獨立水號」「租客自繳」或留空`)
    rooms.set(key, {
      key, name, propertyKey, floor: cellText(row.floor), rent: rent ?? 0, size: size ?? 0,
      layout: cellText(row.layout) || '獨立套房', waterMode: waterMode ?? '', waterNo: cellText(row.waterNo),
    })
  })
  const roomName = (key: string) => rooms.get(key)?.name || key

  // 租客（每房一位現役租客）
  const tenants = new Map<string, PlannedTenant>()
  ;(raw.tenants ?? []).forEach((row, i) => {
    const roomKey = importKey(row.roomName); const name = cellText(row.name)
    if (!name) errors.push(`${at('租客', i)}：姓名為必填`)
    if (!rooms.has(roomKey)) { errors.push(`${at('租客', i)}：房號「${cellText(row.roomName)}」不在「房間」工作表`); return }
    if (tenants.has(roomKey)) errors.push(`${at('租客', i)}：同一房號只能有一位現役租客`)
    const occupants = cellText(row.occupants) ? wholeOf(row.occupants) : 1
    if (!occupants) errors.push(`${at('租客', i)}：居住人數必須是正整數`)
    tenants.set(roomKey, {
      roomKey, name, phone: cellText(row.phone), email: cellText(row.email),
      idNumber: cellText(row.idNumber).toUpperCase(), occupants: occupants || 1,
      emergencyContact: cellText(row.emergencyContact), credit: 0, creditNote: '',
    })
  })

  // 預收餘額：必須掛在現役租客上，否則會無聲消失
  let creditCount = 0
  const creditRooms = new Set<string>()
  ;(raw.credits ?? []).forEach((row, i) => {
    const roomKey = importKey(row.roomName); const amount = wholeOf(row.amount, 0)
    const tenant = tenants.get(roomKey)
    if (!tenant) errors.push(`${at('預收餘額', i)}：房號「${cellText(row.roomName)}」沒有現役租客`)
    if (!amount) errors.push(`${at('預收餘額', i)}：金額必須是正整數`)
    if (creditRooms.has(roomKey)) errors.push(`${at('預收餘額', i)}：同一房號只能一筆`)
    creditRooms.add(roomKey)
    if (tenant && amount) { tenant.credit = amount; tenant.creditNote = cellText(row.note); creditCount++ }
  })

  // 目前租約
  const leases = new Map<string, PlannedLease>()
  ;(raw.leases ?? []).forEach((row, i) => {
    const roomKey = importKey(row.roomName)
    if (!tenants.has(roomKey)) errors.push(`${at('目前租約', i)}：房號「${cellText(row.roomName)}」沒有現役租客`)
    if (leases.has(roomKey)) errors.push(`${at('目前租約', i)}：同一房號只能有一份目前租約`)
    const startDate = cellText(row.startDate); const endDate = cellText(row.endDate)
    if (!isRealDate(startDate) || !isRealDate(endDate) || startDate > endDate) {
      errors.push(`${at('目前租約', i)}：起租日與到期日必須是有效日期，且起租日不晚於到期日`)
    }
    const rent = wholeOf(row.rent)
    if (!rent) errors.push(`${at('目前租約', i)}：月租金必須是大於 0 的整數`)
    const depositMonths = cellText(row.depositMonths) ? wholeOf(row.depositMonths) : 2
    if (depositMonths === null) errors.push(`${at('目前租約', i)}：押金月數必須是非負整數`)
    const paymentFrequency = cellText(row.paymentFrequency) ? lookup(FREQUENCY_ALIASES, row.paymentFrequency) : 'monthly'
    if (!paymentFrequency) errors.push(`${at('目前租約', i)}：繳費週期請填月繳、季繳、半年繳或年繳`)
    const rentPaidThrough = cellText(row.rentPaidThrough)
    if (rentPaidThrough && !isMonth(rentPaidThrough)) errors.push(`${at('目前租約', i)}：租金已繳至請填 YYYY-MM`)
    else if (rentPaidThrough && isRealDate(endDate) && rentPaidThrough > endDate.slice(0, 7)) {
      errors.push(`${at('目前租約', i)}：租金已繳至不可晚於到期月`)
    }
    leases.set(roomKey, {
      roomKey, startDate, endDate, rent: rent ?? 0, depositMonths: depositMonths ?? 2,
      paymentFrequency: paymentFrequency ?? 'monthly', rentPaidThrough,
    })
  })
  tenants.forEach((_, roomKey) => {
    if (!leases.has(roomKey)) errors.push(`房號「${roomName(roomKey)}」有現役租客但缺少目前租約`)
  })

  // 未結清帳款
  const outstanding: PlannedOutstanding[] = (raw.outstanding ?? []).map((row, i) => {
    const roomKey = importKey(row.roomName); const category = cellText(row.category); const amount = wholeOf(row.amount, 0)
    if (!tenants.has(roomKey)) errors.push(`${at('未結清帳款', i)}：房號「${cellText(row.roomName)}」沒有現役租客`)
    if (!(IMPORT_BILL_CATEGORIES as readonly string[]).includes(category)) {
      errors.push(`${at('未結清帳款', i)}：類別「${category}」無法辨識，請填 ${IMPORT_BILL_CATEGORIES.join('、')}`)
    }
    if (!amount) errors.push(`${at('未結清帳款', i)}：金額必須是正整數`)
    const dueDate = cellText(row.dueDate)
    if (!isRealDate(dueDate)) errors.push(`${at('未結清帳款', i)}：原到期日必須是有效日期`)
    const coverFrom = cellText(row.coverFrom); const coverTo = cellText(row.coverTo)
    if (category === '租金收入' && (!isMonth(coverFrom) || !isMonth(coverTo) || coverFrom > coverTo)) {
      errors.push(`${at('未結清帳款', i)}：租金必須填寫涵蓋起訖月份（YYYY-MM，起月不晚於迄月）`)
    }
    return {
      roomKey, category, amount: amount ?? 0, dueDate, description: cellText(row.description),
      coverFrom: category === '租金收入' ? coverFrom : '', coverTo: category === '租金收入' ? coverTo : '',
    }
  })

  // 電表讀數（選填）：取最近一期作為之後抄表的起點
  const readings = new Map<string, { date: string; reading: number }[]>()
  ;(raw.meterReadings ?? []).forEach((row, i) => {
    const roomKey = importKey(row.roomName); const date = cellText(row.date); const reading = amountOf(row.reading, NaN)
    if (!rooms.has(roomKey)) errors.push(`${at('電表讀數', i)}：房號「${cellText(row.roomName)}」不在「房間」工作表`)
    if (!isRealDate(date)) errors.push(`${at('電表讀數', i)}：讀表日期必須是有效日期`)
    if (reading === null || Number.isNaN(reading)) { errors.push(`${at('電表讀數', i)}：讀數必須是非負數字`); return }
    readings.set(roomKey, [...(readings.get(roomKey) ?? []), { date, reading }])
  })
  readings.forEach((list, roomKey) => {
    list.sort((a, b) => a.date.localeCompare(b.date))
    if (new Set(list.map(r => r.date)).size !== list.length) errors.push(`房號「${roomName(roomKey)}」有重複日期的電表讀數`)
    if (list.some((r, i) => i > 0 && r.reading < list[i - 1]!.reading)) errors.push(`房號「${roomName(roomKey)}」電表讀數不可比前一期小`)
    const room = rooms.get(roomKey)
    if (room) room.baseline = list[list.length - 1]
  })

  if (errors.length) return { errors }
  const roomList = [...rooms.values()]
  return {
    errors,
    plan: {
      properties: [...properties.values()], rooms: roomList, tenants: [...tenants.values()],
      leases: [...leases.values()], outstanding,
      summary: {
        properties: properties.size, rooms: rooms.size, tenants: tenants.size, leases: leases.size,
        bills: outstanding.length, credits: creditCount, meterBaselines: roomList.filter(r => r.baseline).length,
      },
    },
  }
}

export interface ImportWrite {
  collection: string
  id: string
  data: Record<string, unknown>
}

export interface ImportWriteContext {
  landlordId: string
  runId: string
  /** 預先配置文件 id，跨集合的關聯才能在寫入前就決定 */
  newId: (collection: string) => string
  /** serverTimestamp() 等時間戳記值 */
  timestamp: unknown
  /** 現在時刻 ISO 字串（預收紀錄 at） */
  nowIso: string
  /** 台灣今天 YYYY-MM-DD */
  today: string
  /** 房東設定的繳費日 */
  paymentDay: number
}

/** 規劃現況接管要建立的全部文件（全部是新文件，寫入順序即陣列順序） */
export const planLandlordImportWrites = (plan: LandlordImportPlan, ctx: ImportWriteContext): ImportWrite[] => {
  const { landlordId, runId, newId, timestamp: ts } = ctx
  const stamp = { importRunId: runId, createdAt: ts }
  const writes: ImportWrite[] = []

  const propertyIds = new Map(plan.properties.map(p => [p.key, newId('properties')]))
  const groupIds = new Map(plan.properties.map(p => [p.key, newId('meter_groups')]))
  const roomIds = new Map(plan.rooms.map(r => [r.key, newId('rooms')]))
  const tenantIds = new Map(plan.tenants.map(t => [t.roomKey, newId('tenants')]))
  const contractIds = new Map(plan.leases.map(l => [l.roomKey, newId('contracts')]))
  const leaseOf = new Map(plan.leases.map(l => [l.roomKey, l]))
  const tenantOf = new Map(plan.tenants.map(t => [t.roomKey, t]))
  const propertyOf = new Map(plan.properties.map(p => [p.key, p]))
  const roomOf = new Map(plan.rooms.map(r => [r.key, r]))

  // 樓層＝電表子群組；空白樓層歸到「未分層」
  const subGroups = new Map<string, { id: string; name: string }[]>()
  let subGroupSeq = 0
  for (const room of plan.rooms) {
    const list = subGroups.get(room.propertyKey) ?? []
    const floor = room.floor || '未分層'
    if (!list.some(s => importKey(s.name) === importKey(floor))) list.push({ id: `sg_imp_${runId}_${++subGroupSeq}`, name: floor })
    subGroups.set(room.propertyKey, list)
  }
  const subGroupOf = (room: PlannedRoom) =>
    (subGroups.get(room.propertyKey) ?? []).find(s => importKey(s.name) === importKey(room.floor || '未分層'))?.id ?? ''

  for (const p of plan.properties) {
    writes.push({ collection: 'meter_groups', id: groupIds.get(p.key)!, data: {
      landlordId, name: p.name, subGroups: subGroups.get(p.key) ?? [], officialMetersCount: 1, ...stamp,
    } })
    writes.push({ collection: 'properties', id: propertyIds.get(p.key)!, data: {
      landlordId, name: p.name, address: p.address, meterGroupId: groupIds.get(p.key)!,
      ...(p.waterSettings ? { waterSettings: p.waterSettings } : {}), ...stamp,
    } })
  }

  for (const r of plan.rooms) {
    const tenant = tenantOf.get(r.key)
    const lease = leaseOf.get(r.key)
    writes.push({ collection: 'rooms', id: roomIds.get(r.key)!, data: {
      landlordId, name: r.name, propertyId: propertyIds.get(r.propertyKey)!, subGroupId: subGroupOf(r),
      price: r.rent, size: r.size, layout: r.layout, type: '公寓', address: propertyOf.get(r.propertyKey)?.address ?? '',
      status: tenant ? 'occupied' : 'vacant', tenantName: tenant?.name ?? '', leaseEnd: lease?.endDate ?? '',
      isPublic: false, images: [], coverImage: '', waterMode: r.waterMode, waterNo: r.waterNo,
      ...(r.baseline ? { lastMeterReading: r.baseline.reading, lastMeterDate: r.baseline.date } : {}),
      ...stamp, updatedAt: ts,
    } })
  }

  for (const t of plan.tenants) {
    const lease = leaseOf.get(t.roomKey)!
    const room = roomOf.get(t.roomKey)!
    writes.push({ collection: 'tenants', id: tenantIds.get(t.roomKey)!, data: {
      landlordId, name: t.name, phone: t.phone, email: t.email, idNumber: t.idNumber,
      emergencyContact: t.emergencyContact, note: '', occupants: t.occupants,
      roomId: roomIds.get(t.roomKey)!, room: room.name,
      leaseStart: lease.startDate, leaseEnd: lease.endDate, leaseDuration: leaseDurationYears(lease.startDate, lease.endDate),
      rent: lease.rent, depositMonths: lease.depositMonths, paymentFrequency: lease.paymentFrequency,
      ...(lease.rentPaidThrough ? { rentPaidThrough: lease.rentPaidThrough } : {}),
      paymentStatus: 'normal', contractId: contractIds.get(t.roomKey)!,
      credit: t.credit,
      creditLog: t.credit ? [{ amount: t.credit, date: ctx.today, source: 'manual', note: t.creditNote || '舊系統接管預收餘額', at: ctx.nowIso }] : [],
      ...stamp, updatedAt: ts,
    } })
  }

  for (const l of plan.leases) {
    const tenant = tenantOf.get(l.roomKey)!
    const room = roomOf.get(l.roomKey)!
    writes.push({ collection: 'contracts', id: contractIds.get(l.roomKey)!, data: {
      landlordId, tenantDocId: tenantIds.get(l.roomKey)!, tenantName: tenant.name,
      roomId: roomIds.get(l.roomKey)!, roomNumber: room.name, address: propertyOf.get(room.propertyKey)?.address ?? '',
      startDate: l.startDate, endDate: l.endDate, rent: l.rent, depositMonths: l.depositMonths,
      paymentFrequency: l.paymentFrequency, paymentDay: ctx.paymentDay, status: 'active',
      // 現役租客的押金早已收取
      deposits: buildDeposits(l.rent, l.depositMonths, { status: 'paid', includeFirstRent: false }),
      imported: true, ...stamp, updatedAt: ts,
    } })
  }

  for (const b of plan.outstanding) {
    const tenant = tenantOf.get(b.roomKey)!
    const room = roomOf.get(b.roomKey)!
    writes.push({ collection: 'bills', id: newId('bills'), data: {
      landlordId, type: 'income', category: b.category,
      relatedTenantDocId: tenantIds.get(b.roomKey)!, tenantId: null, roomId: roomIds.get(b.roomKey)!,
      propertyId: propertyIds.get(room.propertyKey)!, target: `${tenant.name} ${room.name}`,
      description: b.description || `舊系統未結清${b.category}`, amount: b.amount,
      date: b.dueDate, dueDate: b.dueDate, status: b.dueDate < ctx.today ? 'overdue' : 'pending',
      paidAmount: 0, payments: [], history: [],
      ...(b.category === '租金收入' ? { coverFrom: b.coverFrom, coverTo: b.coverTo } : {}),
      imported: true, ...stamp, updatedAt: ts,
    } })
  }

  return writes
}
