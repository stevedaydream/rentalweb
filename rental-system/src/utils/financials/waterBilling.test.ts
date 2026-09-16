import { describe, it, expect } from 'vitest'
import { planWaterBill, tenantRoomOf, overlapsWaterBill, summarizeWater } from './waterBilling'

const properties = [
  { id: 'p1', name: '甲棟', waterSettings: { mode: 'split' as const, basis: 'room' as const } },
  { id: 'p2', name: '乙棟', waterSettings: { mode: 'landlord' as const } },
]
const rooms = [
  { id: 'r1', name: '401', propertyId: 'p1' },
  { id: 'r2', name: '402', propertyId: 'p1' },
  { id: 'r3', name: '403', propertyId: 'p1', waterMode: 'independent', waterNo: 'W-3' },
  { id: 'r4', name: '404', propertyId: 'p1', waterMode: 'tenant_direct' },
  { id: 'r9', name: '901', propertyId: 'p2' },
]
const year = { leaseStart: '2026-01-01', leaseEnd: '2026-12-31' }
const tenants = [
  { id: 't1', name: '甲', roomId: 'r1', uid: 'u1', ...year },
  { id: 't2', name: '乙', room: '402', ...year },
  { id: 't3', name: '丙', roomId: 'r3', ...year },
  { id: 't4', name: '丁', roomId: 'r4', ...year },
  { id: 't9', name: '戊', roomId: 'r9', ...year },
]
const period = { periodStart: '2026-07-01', periodEnd: '2026-08-30' }

describe('整棟台水帳單', () => {
  it('均攤只含本棟、依建物設定的房間，排除獨立水號與租客自繳', () => {
    const plan = planWaterBill({ scope: { kind: 'property', propertyId: 'p1' }, properties, rooms, tenants, ...period, total: 1000 })
    expect(plan.mode).toBe('split')
    expect(plan.rows.map(r => [r.tenantDocId, r.label, r.amount])).toEqual([['t1', '甲 401', 500], ['t2', '乙 402', 500]])
    expect(plan.rows[0]!.tenantUid).toBe('u1')
    expect(plan.propertyId).toBe('p1')
    expect(plan.remainder).toBe(0)
  })

  it('退租者以退租摘要日期計算，只付住的天數', () => {
    const list = [
      { id: 't1', name: '甲', roomId: 'r1', ...year },
      { id: 'old', name: '舊', roomId: 'r2', isHistorical: true, leaseStart: '', leaseEnd: '',
        moveOutSummary: { leaseStart: '2025-01-01', moveOutDate: '2026-07-31' } },
    ]
    const plan = planWaterBill({ scope: { kind: 'property', propertyId: 'p1' }, properties, rooms, tenants: list, ...period, total: 920 })
    expect(plan.rows.map(r => [r.tenantDocId, r.days, r.amount])).toEqual([['t1', 61, 610], ['old', 31, 310]])
  })

  it('非均攤的建物只記支出並說明原因', () => {
    const plan = planWaterBill({ scope: { kind: 'property', propertyId: 'p2' }, properties, rooms, tenants, ...period, total: 800 })
    expect(plan.mode).toBe('record_only')
    expect(plan.rows).toEqual([])
    expect(plan.note).toMatch(/房東負擔/)
  })

  it('未設定水費且範本為租客負擔時，只記支出並提示設定', () => {
    const plan = planWaterBill({
      scope: { kind: 'property', propertyId: 'p3' }, properties: [{ id: 'p3', name: '丙棟' }],
      rooms, tenants, templateFeeWater: 'tenant', ...period, total: 800,
    })
    expect(plan.mode).toBe('record_only')
    expect(plan.note).toMatch(/尚未設定/)
  })

  it('期間內沒有人住時不開單', () => {
    const plan = planWaterBill({
      scope: { kind: 'property', propertyId: 'p1' }, properties, rooms,
      tenants: [{ id: 'future', roomId: 'r1', leaseStart: '2026-10-01', leaseEnd: '2027-09-30' }], ...period, total: 800,
    })
    expect(plan.rows).toEqual([])
    expect(plan.note).toMatch(/沒有在住/)
  })

  it('租期日期錯誤列出供人工處理', () => {
    const plan = planWaterBill({
      scope: { kind: 'property', propertyId: 'p1' }, properties, rooms,
      tenants: [{ id: 'bad', name: '錯', roomId: 'r1', leaseStart: '2026-99-01', leaseEnd: '2026-12-31' }], ...period, total: 800,
    })
    expect(plan.invalid).toEqual(['錯 401'])
  })
})

describe('獨立水號帳單', () => {
  it('該房租客實報實銷', () => {
    const plan = planWaterBill({ scope: { kind: 'room', roomId: 'r3' }, properties, rooms, tenants, ...period, total: 610 })
    expect(plan.mode).toBe('independent')
    expect(plan.targetName).toBe('甲棟 403')
    expect(plan.rows.map(r => [r.tenantDocId, r.amount])).toEqual([['t3', 610]])
  })

  it('不是獨立水號的房間只記支出', () => {
    const plan = planWaterBill({ scope: { kind: 'room', roomId: 'r1' }, properties, rooms, tenants, ...period, total: 610 })
    expect(plan.mode).toBe('record_only')
    expect(plan.propertyId).toBe('p1')
  })
})

describe('輔助判斷', () => {
  it('房間 id 優先，房號只在唯一時採用', () => {
    const dupRooms = [{ id: 'a', name: '101' }, { id: 'b', name: '101' }]
    expect(tenantRoomOf({ id: 'x', room: '101' }, dupRooms)).toBeNull()
    expect(tenantRoomOf({ id: 'x', roomId: 'b', room: '999' }, dupRooms)?.id).toBe('b')
  })

  it('同一對象期間重疊視為可能重複登錄', () => {
    const existing = [{ scopeKind: 'property', propertyId: 'p1', periodStart: '2026-05-01', periodEnd: '2026-06-30' }]
    expect(overlapsWaterBill(existing, { kind: 'property', propertyId: 'p1' }, '2026-06-30', '2026-08-30')).toBe(true)
    expect(overlapsWaterBill(existing, { kind: 'property', propertyId: 'p1' }, '2026-07-01', '2026-08-30')).toBe(false)
    expect(overlapsWaterBill(existing, { kind: 'property', propertyId: 'p2' }, '2026-05-01', '2026-06-30')).toBe(false)
  })
})

describe('水費盈虧彙總', () => {
  const names = new Map([['p1', '甲棟'], ['p2', '乙棟']])
  const collected = (b: { amount: number; paid?: boolean }) => (b.paid ? b.amount : 0)

  it('依建物加總台水支出、開出與已收水費，差額為開出減支出', () => {
    const rows = summarizeWater([
      { type: 'expense', category: '台水帳單', amount: 1000, propertyId: 'p1' },
      { type: 'income', category: '水費', amount: 500, propertyId: 'p1', paid: true },
      { type: 'income', category: '水費', amount: 499, propertyId: 'p1' },
      { type: 'income', category: '水費', amount: 300, propertyId: 'p2', paid: true },
      { type: 'income', category: '租金收入', amount: 7000, propertyId: 'p1' },
    ], names, collected)
    expect(rows).toEqual([
      { propertyId: 'p2', name: '乙棟', expense: 0, billed: 300, collected: 300, diff: 300 },
      { propertyId: 'p1', name: '甲棟', expense: 1000, billed: 999, collected: 500, diff: -1 },
    ].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW')))
  })

  it('沒有或不認得的建物歸到未指定建物；沒有水費活動時回傳空陣列', () => {
    expect(summarizeWater([{ type: 'expense', category: '台水帳單', amount: 10, propertyId: 'gone' }], names, () => 0)[0]!.name).toBe('未指定建物')
    expect(summarizeWater([{ type: 'income', category: '電費', amount: 10 }], names, () => 0)).toEqual([])
  })
})
