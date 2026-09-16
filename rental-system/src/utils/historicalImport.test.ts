import { describe, expect, it } from 'vitest'
import { buildHistoricalImportPlan, planHistoricalImportWrites, type HistoricalImportInput } from './historicalImport'
import { buildPlan } from '../../functions/billing/planner.mjs'

const input = (): HistoricalImportInput => ({
  tenants: [{ legacyTenantKey: 't-1', name: '舊租客', legacyRoomKey: '401', moveOutDate: '2025-12-31', phone: '0912000000' }],
  bills: [
    { legacyBillKey: 'b-1', legacyTenantKey: 'T-1', date: '2025-11-01', dueDate: '2025-11-05', category: '租金收入', amount: '12,000' },
    { legacyBillKey: 'b-2', legacyTenantKey: 't-1', date: '2025-12-01', dueDate: '2025-12-05', category: '電費', amount: 900 },
  ],
  payments: [
    { legacyPaymentKey: 'p-1', legacyBillKey: 'b-1', date: '2025-11-03', amount: 7000, method: '轉帳' },
    { legacyPaymentKey: 'p-2', legacyBillKey: 'b-1', date: '2025-11-10', amount: 5000 },
    { legacyPaymentKey: 'p-3', legacyBillKey: 'b-2', date: '2025-12-20', amount: 400 },
  ],
})
const rooms = [{ id: 'room-401', name: '401', propertyId: 'prop-a' }]

describe('歷史遷移：驗證', () => {
  it('舊系統鍵不分大小寫串連三張表，並計算未結清筆數', () => {
    const { errors, plan } = buildHistoricalImportPlan(input(), { rooms })
    expect(errors).toEqual([])
    expect(plan!.summary).toEqual({ tenants: 1, bills: 2, payments: 3, unsettled: 1 })
    expect(plan!.bills[0]).toMatchObject({ amount: 12000, roomId: 'room-401', propertyId: 'prop-a' })
  })

  it('已匯入過的舊系統鍵擋下，避免重複匯入', () => {
    const errors = buildHistoricalImportPlan(input(), { tenantKeys: ['T-1'], billKeys: ['b-2'], paymentKeys: ['P-3'] }).errors.join('\n')
    expect(errors).toContain('舊租客鍵「T-1」已匯入過')
    expect(errors).toContain('舊帳單鍵「B-2」已匯入過')
    expect(errors).toContain('舊付款鍵「P-3」已匯入過')
  })

  it('付款鍵重複、付款超過帳單、日期不存在、類別錯誤都要報錯', () => {
    const data = input()
    data.payments.push({ legacyPaymentKey: 'p-1', legacyBillKey: 'b-2', date: '2025-02-30', amount: 900 })
    data.bills.push({ legacyBillKey: 'b-3', date: '2025-12-01', dueDate: '2025-12-05', category: '租金', amount: 1 })
    const errors = buildHistoricalImportPlan(data).errors.join('\n')
    expect(errors).toContain('舊付款鍵「P-1」重複')
    expect(errors).toContain('付款日必須是有效日期')
    expect(errors).toContain('付款合計超過帳單金額')
    expect(errors).toContain('類別「租金」無法辨識')
  })

  it('付款指向不存在的帳單要報錯', () => {
    const data = input()
    data.payments.push({ legacyPaymentKey: 'p-9', legacyBillKey: 'nope', date: '2025-12-01', amount: 1 })
    expect(buildHistoricalImportPlan(data).errors.join('\n')).toContain('舊帳單鍵「NOPE」不在「歷史帳單」工作表')
  })
})

describe('歷史遷移：寫入規劃', () => {
  const plan = buildHistoricalImportPlan(input(), { rooms }).plan!
  let seq = 0
  const writes = planHistoricalImportWrites(plan, {
    landlordId: 'owner', runId: 'run1', newId: c => `${c}-${++seq}`, timestamp: 'TS', nowIso: '2026-09-17T00:00:00.000Z',
  })
  const bills = writes.filter(w => w.collection === 'bills')
  const tenant = writes.find(w => w.collection === 'tenants')!

  it('付清為已結清，未付清為歷史未結（不進入催繳查詢）', () => {
    expect(bills[0]!.data).toMatchObject({ status: 'completed', paidAmount: 12000, paidAt: '2025-11-10', target: '舊租客 401' })
    expect(bills[1]!.data).toMatchObject({ status: 'archived', paidAmount: 400, isHistorical: true })
    expect(['pending', 'overdue', 'waiting_confirmation']).not.toContain(bills[1]!.data.status)
    expect((bills[0]!.data.payments as { note: string; legacyPaymentKey: string }[])[0]).toMatchObject({ note: '轉帳', legacyPaymentKey: 'P-1' })
  })

  it('歷史租客不掛房間，出帳的電費判定不受影響', () => {
    expect(tenant.data).toMatchObject({ isHistorical: true, status: 'inactive', legacyTenantKey: 'T-1', moveOutSummary: { moveOutDate: '2025-12-31' } })
    expect(tenant.data).not.toHaveProperty('room')
    expect(tenant.data).not.toHaveProperty('roomId')
    const current = { id: 'now', name: '新租客', roomId: 'room-401', room: '401', leaseStart: '2026-01-01', leaseEnd: '2026-12-31', rent: 8000 }
    const plan2 = buildPlan({
      landlordId: 'owner', month: '2026-09', settings: {}, publicMeters: [], groups: [], properties: [],
      tenants: [current, { id: tenant.id, ...tenant.data }], rooms: [{ id: 'room-401', name: '401' }],
      bills: bills.map(b => ({ id: b.id, ...b.data })),
      readings: [{ id: 'r1', roomId: 'room-401', roomName: '401', periodStart: '2026-08-01', periodEnd: '2026-09-01', usage: 10, cost: 50 }],
    })
    expect(plan2.warnings.join()).not.toMatch(/跨租客/)
    expect(plan2.plans[0]!.bills.map(b => b.category)).toEqual(['租金收入', '電費'])
  })
})
