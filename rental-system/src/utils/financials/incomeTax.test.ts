import { describe, it, expect } from 'vitest'
import {
  progressiveTax, getMarginalRate, publicWelfareExemption, calcRentalTax,
  PUBLIC_WELFARE_MONTHLY_EXEMPTION, RENTAL_EXPENSE_RATE,
} from './incomeTax'

describe('progressiveTax', () => {
  it('零與負所得不課稅', () => {
    expect(progressiveTax(0)).toBe(0)
    expect(progressiveTax(-100)).toBe(0)
  })

  it('第一級距內按 5%', () => {
    expect(progressiveTax(500000)).toBe(25000)
  })

  it('跨級距時逐級累進，不是整筆套最高稅率', () => {
    // 560,000×5% = 28,000；剩餘 440,000×12% = 52,800
    expect(progressiveTax(1000000)).toBe(28000 + 52800)
  })

  it('恰好落在級距上緣時不跳級', () => {
    expect(progressiveTax(560000)).toBe(28000)
  })
})

describe('getMarginalRate', () => {
  it('依所得落點回傳邊際稅率', () => {
    expect(getMarginalRate(500000)).toBe(0.05)
    expect(getMarginalRate(560000)).toBe(0.05)
    expect(getMarginalRate(560001)).toBe(0.12)
    expect(getMarginalRate(9999999)).toBe(0.4)
  })
})

describe('publicWelfareExemption', () => {
  it('每屋每月上限 15,000，整屋共用一份而非每租客一份', () => {
    const rent = new Map([['pA', 1000000]])
    expect(publicWelfareExemption(rent, new Set(['pA']))).toBe(PUBLIC_WELFARE_MONTHLY_EXEMPTION * 12)
  })

  it('免的是租金收入，故不得超過該屋實際收入', () => {
    const rent = new Map([['pA', 90000]])
    expect(publicWelfareExemption(rent, new Set(['pA']))).toBe(90000)
  })

  it('多棟各自認定，只有具資格的棟才計入', () => {
    const rent = new Map([['pA', 1000000], ['pB', 1000000]])
    expect(publicWelfareExemption(rent, new Set(['pA']))).toBe(180000)
    expect(publicWelfareExemption(rent, new Set(['pA', 'pB']))).toBe(360000)
  })

  it('沒有具資格的建物時為零', () => {
    expect(publicWelfareExemption(new Map([['pA', 1000000]]), new Set())).toBe(0)
  })

  it('具資格但該屋當年無租金收入時為零', () => {
    expect(publicWelfareExemption(new Map(), new Set(['pA']))).toBe(0)
  })
})

describe('calcRentalTax', () => {
  it('免稅額先扣、餘額再扣 43%（與後扣的結果不同）', () => {
    const r = calcRentalTax({ grossRent: 1008000, exemption: 180000, otherIncome: 0 })
    expect(r.taxableRent).toBe(828000)
    expect(r.deduction).toBe(Math.round(828000 * RENTAL_EXPENSE_RATE))
    expect(r.rentalNetIncome).toBe(828000 - Math.round(828000 * 0.43))
    // 先扣得 471,960；若改成後扣會是 394,560
    expect(r.rentalNetIncome).toBe(471960)
  })

  it('無免稅額時租賃所得為收入的 57%', () => {
    const r = calcRentalTax({ grossRent: 1008000, exemption: 0, otherIncome: 0 })
    expect(r.rentalNetIncome).toBe(1008000 - Math.round(1008000 * 0.43))
    expect(r.saving).toBe(0)
  })

  it('租賃稅額為併入後總稅額減去僅其他所得的稅額', () => {
    const r = calcRentalTax({ grossRent: 600000, exemption: 0, otherIncome: 800000 })
    expect(r.totalIncome).toBe(800000 + r.rentalNetIncome)
    expect(r.taxAmount).toBe(
      progressiveTax(r.totalIncome) - progressiveTax(800000),
    )
  })

  it('公益出租人省下的稅為兩種情境的差額，且不為負', () => {
    const r = calcRentalTax({ grossRent: 1008000, exemption: 180000, otherIncome: 800000 })
    expect(r.saving).toBe(r.taxWithoutExemption - r.taxAmount)
    expect(r.saving).toBeGreaterThan(0)
  })

  it('其他所得越高，同一筆免稅額省下的稅越多（邊際稅率較高）', () => {
    const low = calcRentalTax({ grossRent: 1008000, exemption: 180000, otherIncome: 0 })
    const high = calcRentalTax({ grossRent: 1008000, exemption: 180000, otherIncome: 3000000 })
    expect(high.saving).toBeGreaterThan(low.saving)
  })

  it('免稅額超過租金收入時以收入為上限，不會算出負的應稅收入', () => {
    const r = calcRentalTax({ grossRent: 100000, exemption: 180000, otherIncome: 0 })
    expect(r.exemption).toBe(100000)
    expect(r.taxableRent).toBe(0)
    expect(r.taxAmount).toBe(0)
  })

  it('沒有租金收入時全為零', () => {
    const r = calcRentalTax({ grossRent: 0, exemption: 0, otherIncome: 500000 })
    expect(r.taxableRent).toBe(0)
    expect(r.taxAmount).toBe(0)
    expect(r.saving).toBe(0)
  })

  it('負數輸入視為零，不產生負稅額', () => {
    const r = calcRentalTax({ grossRent: -5000, exemption: -100, otherIncome: -200 })
    expect(r.grossRent).toBe(0)
    expect(r.taxAmount).toBe(0)
  })
})
