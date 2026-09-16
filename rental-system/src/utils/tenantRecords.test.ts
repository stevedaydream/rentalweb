import { describe, it, expect } from 'vitest'
import { buildDeposits, leaseDurationYears } from './tenantRecords'

describe('租約共用欄位', () => {
  it('新簽約：押金與首月租金都未收', () => {
    expect(buildDeposits(8000, 2)).toEqual([
      { label: '押金（第 1 個月）', amount: 8000, status: 'unpaid' },
      { label: '押金（第 2 個月）', amount: 8000, status: 'unpaid' },
      { label: '首月租金', amount: 8000, status: 'unpaid' },
    ])
  })
  it('接管現役租客：押金已收、不含首月租金', () => {
    expect(buildDeposits(8000, 1, { status: 'paid', includeFirstRent: false }))
      .toEqual([{ label: '押金（第 1 個月）', amount: 8000, status: 'paid' }])
  })
  it('起訖日換算租期年數', () => {
    expect(leaseDurationYears('2026-09-01', '2027-08-31')).toBe(1)
    expect(leaseDurationYears('2026-09-01', '2027-02-28')).toBe(0.5)
    expect(leaseDurationYears('2026-09-01', '2028-08-31')).toBe(2)
    expect(leaseDurationYears('bad', '2027-08-31')).toBe(1)
  })
})
