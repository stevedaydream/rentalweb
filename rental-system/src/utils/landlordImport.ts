import { roomNameKey } from './roomBatch'

export type ImportWaterMode = 'unset' | 'landlord' | 'fixed' | 'split' | 'tenant_direct'
export type ImportWaterBasis = 'room' | 'person'

export interface PropertyImportRow { name: string; address?: string; waterMode?: string; waterBasis?: string; fixedWaterAmount?: unknown }
export interface RoomImportRow { propertyName: string; floor?: string; name: string; rent?: unknown; size?: unknown; layout?: string; waterMode?: string; waterNo?: string }
export interface TenantImportRow { roomName: string; name: string; phone?: string; email?: string; idNumber?: string; occupants?: unknown; emergencyContact?: string }
export interface LeaseImportRow { roomName: string; startDate: string; endDate: string; rent?: unknown; depositMonths?: unknown; paymentFrequency?: string }
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

export interface LandlordImportPlan {
  properties: Array<PropertyImportRow & { key: string; waterMode: ImportWaterMode; waterBasis: ImportWaterBasis; fixedWaterAmount: number }>
  rooms: Array<RoomImportRow & { key: string; propertyKey: string; rent: number; size: number }>
  tenants: Array<TenantImportRow & { roomKey: string; occupants: number; credit: number; creditNote: string }>
  leases: Array<LeaseImportRow & { roomKey: string; rent: number; depositMonths: number; paymentFrequency: 'monthly' | 'quarterly' | 'semiannual' | 'yearly' }>
  outstanding: Array<OutstandingImportRow & { roomKey: string; amount: number }>
  meterReadings: Array<MeterReadingImportRow & { roomKey: string; reading: number }>
  summary: { properties: number; rooms: number; tenants: number; leases: number; bills: number; meterReadings: number }
}

const waterModes = new Set<ImportWaterMode>(['unset', 'landlord', 'fixed', 'split', 'tenant_direct'])
const frequencies = new Set(['monthly', 'quarterly', 'semiannual', 'yearly'])
const isoDate = /^\d{4}-\d{2}-\d{2}$/
const month = /^\d{4}-\d{2}$/

export const importKey = (value: unknown) => roomNameKey(String(value ?? ''))
const text = (value: unknown) => String(value ?? '').trim()
const positiveInt = (value: unknown) => {
  const n = Number(value)
  return Number.isSafeInteger(n) && n > 0 ? n : 0
}
const nonNegative = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}
const dateOK = (value: unknown) => isoDate.test(text(value)) && !Number.isNaN(Date.parse(`${text(value)}T00:00:00Z`))

/** 將房東填寫的單一工作簿轉成可執行的現況接管計畫；任何關聯錯誤都不產生計畫。 */
export const buildLandlordImportPlan = (raw: LandlordImportWorkbook): { errors: string[]; plan?: LandlordImportPlan } => {
  const errors: string[] = []
  const properties = raw.properties ?? []
  const rooms = raw.rooms ?? []
  const tenants = raw.tenants ?? []
  const leases = raw.leases ?? []
  const outstanding = raw.outstanding ?? []
  const credits = raw.credits ?? []
  const meterReadings = raw.meterReadings ?? []
  if (!properties.length) errors.push('「建物」至少需要一筆資料')
  if (!rooms.length) errors.push('「房間」至少需要一筆資料')

  const propertyKeys = new Set<string>()
  const plannedProperties: LandlordImportPlan['properties'] = properties.map((row, index) => {
    const name = text(row.name); const key = importKey(name)
    if (!key) errors.push(`建物第 ${index + 2} 列：建物名稱為必填`)
    else if (propertyKeys.has(key)) errors.push(`建物第 ${index + 2} 列：建物名稱重複「${name}」`)
    propertyKeys.add(key)
    const waterMode = waterModes.has(row.waterMode as ImportWaterMode) ? row.waterMode as ImportWaterMode : 'landlord'
    const waterBasis = row.waterBasis === 'person' ? 'person' : 'room'
    const fixedWaterAmount = nonNegative(row.fixedWaterAmount)
    if (waterMode === 'fixed' && !fixedWaterAmount) errors.push(`建物第 ${index + 2} 列：固定月費必須大於 0`)
    return { ...row, name, key, waterMode, waterBasis, fixedWaterAmount }
  })

  const roomKeys = new Set<string>()
  const plannedRooms: LandlordImportPlan['rooms'] = rooms.map((row, index) => {
    const name = text(row.name); const key = importKey(name); const propertyKey = importKey(row.propertyName)
    if (!key) errors.push(`房間第 ${index + 2} 列：房號為必填`)
    else if (roomKeys.has(key)) errors.push(`房間第 ${index + 2} 列：房號重複「${name}」`)
    roomKeys.add(key)
    if (!propertyKeys.has(propertyKey)) errors.push(`房間第 ${index + 2} 列：建物「${text(row.propertyName)}」不存在`)
    if (row.waterMode && row.waterMode !== 'independent' && row.waterMode !== 'tenant_direct') errors.push(`房間第 ${index + 2} 列：水費覆寫無效`)
    return { ...row, name, key, propertyKey, floor: text(row.floor), rent: nonNegative(row.rent), size: nonNegative(row.size), layout: text(row.layout) || '套房' }
  })

  const tenantByRoom = new Map<string, LandlordImportPlan['tenants'][number]>()
  const creditByRoom = new Map<string, { amount: number; note: string }>()
  credits.forEach((row, index) => {
    const roomKey = importKey(row.roomName); const amount = nonNegative(row.amount)
    if (!roomKeys.has(roomKey)) errors.push(`預收餘額第 ${index + 2} 列：房號「${text(row.roomName)}」不存在`)
    if (!amount) errors.push(`預收餘額第 ${index + 2} 列：金額必須大於 0`)
    if (creditByRoom.has(roomKey)) errors.push(`預收餘額第 ${index + 2} 列：同房號只能一筆`)
    creditByRoom.set(roomKey, { amount, note: text(row.note) })
  })
  tenants.forEach((row, index) => {
    const roomKey = importKey(row.roomName); const name = text(row.name)
    if (!name) errors.push(`租客第 ${index + 2} 列：姓名為必填`)
    if (!roomKeys.has(roomKey)) errors.push(`租客第 ${index + 2} 列：房號「${text(row.roomName)}」不存在`)
    if (tenantByRoom.has(roomKey)) errors.push(`租客第 ${index + 2} 列：同房號只能有一位現役租客`)
    const c = creditByRoom.get(roomKey)
    tenantByRoom.set(roomKey, { ...row, name, roomKey, occupants: positiveInt(row.occupants) || 1, credit: c?.amount || 0, creditNote: c?.note || '' })
  })

  const leaseByRoom = new Set<string>()
  const plannedLeases: LandlordImportPlan['leases'] = leases.map((row, index) => {
    const roomKey = importKey(row.roomName); const frequency = frequencies.has(row.paymentFrequency || '') ? row.paymentFrequency as LandlordImportPlan['leases'][number]['paymentFrequency'] : 'monthly'
    if (!tenantByRoom.has(roomKey)) errors.push(`租約第 ${index + 2} 列：房號「${text(row.roomName)}」沒有現役租客`)
    if (leaseByRoom.has(roomKey)) errors.push(`租約第 ${index + 2} 列：同房號只能有一份目前租約`)
    leaseByRoom.add(roomKey)
    if (!dateOK(row.startDate) || !dateOK(row.endDate) || text(row.startDate) > text(row.endDate)) errors.push(`租約第 ${index + 2} 列：租期必須是有效的 YYYY-MM-DD 且起日不晚於迄日`)
    const rent = positiveInt(row.rent); if (!rent) errors.push(`租約第 ${index + 2} 列：月租金必須大於 0`)
    return { ...row, roomKey, startDate: text(row.startDate), endDate: text(row.endDate), rent, depositMonths: positiveInt(row.depositMonths) || 2, paymentFrequency: frequency }
  })
  tenantByRoom.forEach((_, roomKey) => { if (!leaseByRoom.has(roomKey)) errors.push(`房號「${rooms.find(r => importKey(r.name) === roomKey)?.name || roomKey}」缺少目前租約`) })

  const plannedOutstanding: LandlordImportPlan['outstanding'] = outstanding.map((row, index) => {
    const roomKey = importKey(row.roomName); const category = text(row.category); const amount = positiveInt(row.amount)
    if (!tenantByRoom.has(roomKey)) errors.push(`未結清帳款第 ${index + 2} 列：房號「${text(row.roomName)}」沒有現役租客`)
    if (!category) errors.push(`未結清帳款第 ${index + 2} 列：類別為必填`)
    if (!amount) errors.push(`未結清帳款第 ${index + 2} 列：金額必須大於 0`)
    if (!dateOK(row.dueDate)) errors.push(`未結清帳款第 ${index + 2} 列：到期日必須是 YYYY-MM-DD`)
    if (category === '租金收入' && (!month.test(text(row.coverFrom)) || !month.test(text(row.coverTo)))) errors.push(`未結清帳款第 ${index + 2} 列：租金必填涵蓋起訖月份（YYYY-MM）`)
    return { ...row, roomKey, category, amount, dueDate: text(row.dueDate), description: text(row.description), coverFrom: text(row.coverFrom), coverTo: text(row.coverTo) }
  })

  const readingsByRoom = new Map<string, LandlordImportPlan['meterReadings']>()
  meterReadings.forEach((row, index) => {
    const roomKey = importKey(row.roomName); const reading = nonNegative(row.reading)
    if (!roomKeys.has(roomKey)) errors.push(`電表讀數第 ${index + 2} 列：房號「${text(row.roomName)}」不存在`)
    if (!dateOK(row.date)) errors.push(`電表讀數第 ${index + 2} 列：日期必須是 YYYY-MM-DD`)
    if (reading < 0) errors.push(`電表讀數第 ${index + 2} 列：讀數不可為負數`)
    const list = readingsByRoom.get(roomKey) || []
    list.push({ ...row, roomKey, date: text(row.date), reading })
    readingsByRoom.set(roomKey, list)
  })
  readingsByRoom.forEach((list, roomKey) => {
    list.sort((a, b) => a.date.localeCompare(b.date))
    if (list.length !== 2) errors.push(`房號「${rooms.find(r => importKey(r.name) === roomKey)?.name || roomKey}」電表必須提供最近兩期讀數`)
    else if (list[1]!.reading < list[0]!.reading) errors.push(`房號「${rooms.find(r => importKey(r.name) === roomKey)?.name || roomKey}」最近讀數不可小於前一期`)
  })
  plannedRooms.forEach(room => {
    if (!readingsByRoom.has(room.key)) errors.push(`房號「${room.name}」電表必須提供最近兩期讀數`)
  })

  if (errors.length) return { errors }
  const flattenedReadings = [...readingsByRoom.values()].flat()
  return { errors, plan: { properties: plannedProperties, rooms: plannedRooms, tenants: [...tenantByRoom.values()], leases: plannedLeases, outstanding: plannedOutstanding, meterReadings: flattenedReadings, summary: { properties: plannedProperties.length, rooms: plannedRooms.length, tenants: tenantByRoom.size, leases: plannedLeases.length, bills: plannedOutstanding.length, meterReadings: flattenedReadings.length } } }
}
