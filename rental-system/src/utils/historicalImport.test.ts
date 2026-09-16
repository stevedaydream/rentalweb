import { describe, expect, it } from 'vitest'
import { buildHistoricalImportPlan } from './historicalImport'

describe('歷史資料遷移計畫', () => {
  it('以舊系統鍵連結已退租租客、帳單與多筆付款', () => {
    const result = buildHistoricalImportPlan({
      tenants: [{ legacyTenantKey: 'T-1', name: '王小明', legacyRoomKey: 'R-401', moveOutDate: '2025-08-31' }],
      bills: [{ legacyBillKey: 'B-1', legacyTenantKey: 'T-1', date: '2025-08-01', dueDate: '2025-08-05', category: '租金收入', amount: 12000 }],
      payments: [{ legacyPaymentKey: 'P-1', legacyBillKey: 'B-1', date: '2025-08-04', amount: 7000 }, { legacyPaymentKey: 'P-2', legacyBillKey: 'B-1', date: '2025-08-10', amount: 5000 }],
    })
    expect(result.errors).toEqual([])
    expect(result.plan?.tenants[0]).toMatchObject({ status: 'inactive', isHistorical: true })
    expect(result.plan?.bills[0]).toMatchObject({ paidAmount: 12000, status: 'completed' })
  })
  it('阻擋找不到帳單的付款與超額付款', () => {
    const result = buildHistoricalImportPlan({ tenants: [], bills: [{ legacyBillKey: 'B', date: '2025-01-01', dueDate: '2025-01-02', category: '租金收入', amount: 100 }], payments: [{ legacyPaymentKey: 'P', legacyBillKey: 'X', date: '2025-01-03', amount: 1 }] })
    expect(result.plan).toBeUndefined(); expect(result.errors.join('\n')).toContain('不存在的舊帳單鍵')
  })
})
