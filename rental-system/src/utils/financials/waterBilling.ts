/**
 * 台水帳單登錄時的分攤規劃（ADR-009）。
 *
 * - 整棟帳單：建物為「台水帳單均攤」時，依計費期間內的居住天數（依人數時再乘人數）分給在住的租客；
 *   獨立水號與租客自繳的房間不列入。其他方式只記支出，供水費盈虧比較。
 * - 獨立水號帳單：該房租客實報實銷，期間內換人依天數比例，空房由房東負擔。
 */
import {
  normalizeWaterSettings, effectiveWaterMode, splitWaterBill, independentWaterShares,
  type WaterSettings, type WaterBasis,
} from './water'

export interface WaterTenantInput {
  id: string
  name?: string
  room?: string
  roomName?: string
  roomId?: string
  uid?: string | null
  leaseStart?: string
  leaseEnd?: string
  occupants?: number
  isHistorical?: boolean
  moveOutSummary?: { room?: string; leaseStart?: string; leaseEnd?: string; moveOutDate?: string } | null
}

export interface WaterRoomInput {
  id: string
  name: string
  propertyId?: string
  waterMode?: string
  waterNo?: string
}

export interface WaterPropertyInput {
  id: string
  name: string
  waterSettings?: Partial<WaterSettings>
}

export type WaterBillScope = { kind: 'property'; propertyId: string } | { kind: 'room'; roomId: string }

export interface WaterPlanRow {
  tenantDocId: string
  tenantUid: string | null
  label: string
  roomId: string
  roomName: string
  days: number
  people: number
  amount: number
}

export interface WaterPlan {
  mode: 'split' | 'independent' | 'record_only'
  basis: WaterBasis
  propertyId: string
  targetName: string
  rows: WaterPlanRow[]
  /** 四捨五入尾差或空房部分，由房東負擔 */
  remainder: number
  /** 租期日期無效、需人工處理的租客 */
  invalid: string[]
  note: string
}

const RECORD_ONLY_NOTE: Record<string, string> = {
  landlord: '此棟水費由房東負擔，只記錄支出。',
  fixed: '此棟以固定月費隨租金收取，只記錄支出；水費盈虧會比較兩者。',
  tenant_direct: '此棟由租客自行繳納，只記錄支出。',
  unset: '此棟尚未設定水費方式，只記錄支出。可到「房源管理 → 建物」設定。',
}

/** 退租者以退租摘要的實際日期與房號為準（與出帳規則一致） */
const effectiveTenant = (t: WaterTenantInput): WaterTenantInput => t.isHistorical && t.moveOutSummary
  ? {
      ...t,
      room: t.moveOutSummary.room || t.room,
      leaseStart: t.moveOutSummary.leaseStart || t.leaseStart,
      leaseEnd: t.moveOutSummary.moveOutDate || t.moveOutSummary.leaseEnd || t.leaseEnd,
    }
  : t

/** 房間 id 優先；舊資料只有房號時，唯一吻合才算 */
export const tenantRoomOf = (t: WaterTenantInput, rooms: WaterRoomInput[]): WaterRoomInput | null => {
  if (t.roomId) return rooms.find(r => r.id === t.roomId) ?? null
  const name = t.room || t.roomName
  const hits = rooms.filter(r => r.name === name)
  return hits.length === 1 ? hits[0]! : null
}

const labelOf = (t: WaterTenantInput, room: WaterRoomInput) => `${t.name || '未命名租客'} ${room.name}`.trim()

export const planWaterBill = (input: {
  scope: WaterBillScope
  properties: WaterPropertyInput[]
  rooms: WaterRoomInput[]
  tenants: WaterTenantInput[]
  templateFeeWater?: string
  periodStart: string
  periodEnd: string
  total: number
}): WaterPlan => {
  const { scope, properties, rooms, periodStart, periodEnd, total } = input
  const tenants = input.tenants.map(effectiveTenant)
  const withRoom = tenants
    .map(t => ({ t, room: tenantRoomOf(t, rooms) }))
    .filter((x): x is { t: WaterTenantInput; room: WaterRoomInput } => !!x.room)

  const toRows = (
    shares: { key: string; days: number; people: number; amount: number }[],
    lookup: Map<string, { t: WaterTenantInput; room: WaterRoomInput }>,
  ): WaterPlanRow[] => shares.map(s => {
    const { t, room } = lookup.get(s.key)!
    return {
      tenantDocId: t.id, tenantUid: t.uid ?? null, label: labelOf(t, room),
      roomId: room.id, roomName: room.name, days: s.days, people: s.people, amount: s.amount,
    }
  })
  const invalidLabels = (keys: string[], lookup: Map<string, { t: WaterTenantInput; room: WaterRoomInput }>) =>
    keys.map(k => { const x = lookup.get(k)!; return labelOf(x.t, x.room) })

  if (scope.kind === 'room') {
    const room = rooms.find(r => r.id === scope.roomId)
    const property = properties.find(p => p.id === room?.propertyId)
    const base = { basis: 'room' as WaterBasis, propertyId: room?.propertyId || '', targetName: room?.name || '', invalid: [] }
    if (!room || room.waterMode !== 'independent') {
      return { ...base, mode: 'record_only', rows: [], remainder: Math.round(total) || 0, note: '此房間不是獨立水號，只記錄支出。' }
    }
    const members = withRoom.filter(x => x.room.id === room.id)
    const lookup = new Map(members.map(x => [x.t.id, x]))
    const r = independentWaterShares({
      total, periodStart, periodEnd,
      participants: members.map(x => ({ key: x.t.id, leaseStart: x.t.leaseStart, leaseEnd: x.t.leaseEnd, occupants: x.t.occupants })),
    })
    return {
      ...base, mode: 'independent', targetName: `${property?.name ? `${property.name} ` : ''}${room.name}`,
      rows: toRows(r.shares, lookup), remainder: r.remainder, invalid: invalidLabels(r.invalid, lookup),
      note: r.remainder > 0 ? '期間內有空房的天數由房東負擔。' : '',
    }
  }

  const property = properties.find(p => p.id === scope.propertyId)
  const settings = normalizeWaterSettings(property?.waterSettings, input.templateFeeWater)
  const base = { basis: settings.basis, propertyId: property?.id || '', targetName: property?.name || '', invalid: [] }
  if (!property || settings.mode !== 'split') {
    return { ...base, mode: 'record_only', rows: [], remainder: Math.round(total) || 0, note: RECORD_ONLY_NOTE[settings.mode] ?? '' }
  }
  // 獨立水號、租客自繳的房間不分攤整棟帳單
  const members = withRoom.filter(x => x.room.propertyId === property.id && effectiveWaterMode(settings, x.room) === 'split')
  const lookup = new Map(members.map(x => [x.t.id, x]))
  const r = splitWaterBill({
    total, periodStart, periodEnd, basis: settings.basis,
    participants: members.map(x => ({ key: x.t.id, leaseStart: x.t.leaseStart, leaseEnd: x.t.leaseEnd, occupants: x.t.occupants })),
  })
  return {
    ...base, mode: 'split', rows: toRows(r.shares, lookup), remainder: r.remainder,
    invalid: invalidLabels(r.invalid, lookup),
    note: r.shares.length ? '' : '計費期間內沒有在住的租客，只記錄支出。',
  }
}

/** 已登錄的台水帳單是否與新帳單的對象、期間重疊（提醒可能重複登錄） */
export const overlapsWaterBill = (
  existing: { scopeKind: string; propertyId?: string; roomId?: string; periodStart: string; periodEnd: string }[],
  scope: WaterBillScope, periodStart: string, periodEnd: string,
) => existing.some(b => b.scopeKind === scope.kind
  && (scope.kind === 'property' ? b.propertyId === scope.propertyId : b.roomId === scope.roomId)
  && b.periodStart <= periodEnd && periodStart <= b.periodEnd)

export interface WaterSummaryRow {
  propertyId: string
  name: string
  /** 台水帳單支出 */
  expense: number
  /** 向租客開出的水費 */
  billed: number
  /** 已收到的水費 */
  collected: number
  /** 開出的水費 − 台水支出；正數＝房東多收、負數＝房東貼補 */
  diff: number
}

export const UNASSIGNED_WATER_PROPERTY = '__unassigned__'

/** 依建物彙總當期（呼叫端先篩好的帳單）水費收支；沒有水費活動的建物不列出 */
export const summarizeWater = <T extends { type: string; category: string; amount: number; propertyId?: string }>(
  bills: T[],
  propertyNames: Map<string, string>,
  collectedOf: (bill: T) => number,
): WaterSummaryRow[] => {
  const rows = new Map<string, WaterSummaryRow>()
  const rowOf = (id?: string) => {
    const key = id && propertyNames.has(id) ? id : UNASSIGNED_WATER_PROPERTY
    if (!rows.has(key)) {
      rows.set(key, { propertyId: key, name: propertyNames.get(key) ?? '未指定建物', expense: 0, billed: 0, collected: 0, diff: 0 })
    }
    return rows.get(key)!
  }
  for (const b of bills) {
    const amount = Number(b.amount) || 0
    if (b.type === 'expense' && b.category === '台水帳單') rowOf(b.propertyId).expense += amount
    if (b.type === 'income' && b.category === '水費') {
      const row = rowOf(b.propertyId)
      row.billed += amount
      row.collected += collectedOf(b)
    }
  }
  return [...rows.values()]
    .map(r => ({ ...r, diff: r.billed - r.expense }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))
}
