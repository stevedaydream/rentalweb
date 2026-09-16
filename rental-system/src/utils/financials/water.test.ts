import { describe, it, expect } from 'vitest'
import {
  normalizeWaterSettings, effectiveWaterMode, fixedWaterCharge, fixedWaterDescription, overlapDays,
  splitWaterBill, independentWaterShares, waterContractText, occupantsOf,
} from './water'

describe('水費設定', () => {
  it('未設定的建物依合約範本：房東負擔沿用、租客負擔改為尚未設定', () => {
    expect(normalizeWaterSettings(undefined, 'landlord').mode).toBe('landlord')
    expect(normalizeWaterSettings(undefined, undefined).mode).toBe('landlord')
    expect(normalizeWaterSettings(null, 'tenant').mode).toBe('unset')
    expect(normalizeWaterSettings({ mode: 'fixed', basis: 'person', fixedAmount: 100.4 }, 'tenant'))
      .toEqual({ mode: 'fixed', basis: 'person', fixedAmount: 100 })
    expect(normalizeWaterSettings({ mode: 'bogus' as never }, 'landlord').mode).toBe('landlord')
  })

  it('房間覆寫優先於建物設定', () => {
    const s = normalizeWaterSettings({ mode: 'split' })
    expect(effectiveWaterMode(s, { waterMode: 'independent' })).toBe('independent')
    expect(effectiveWaterMode(s, { waterMode: 'tenant_direct' })).toBe('tenant_direct')
    expect(effectiveWaterMode(s, { waterMode: '' })).toBe('split')
    expect(effectiveWaterMode(s, null)).toBe('split')
  })

  it('居住人數缺值或不合理視為 1', () => {
    expect(occupantsOf({})).toBe(1)
    expect(occupantsOf({ occupants: 0 })).toBe(1)
    expect(occupantsOf({ occupants: 2.5 })).toBe(1)
    expect(occupantsOf({ occupants: 3 })).toBe(3)
  })
})

describe('固定月費', () => {
  const perPerson = normalizeWaterSettings({ mode: 'fixed', basis: 'person', fixedAmount: 100 })
  const perRoom = normalizeWaterSettings({ mode: 'fixed', basis: 'room', fixedAmount: 150 })

  it('每人 × 人數 × 月數；每房只乘月數', () => {
    expect(fixedWaterCharge(perPerson, { occupants: 2 }, 3)).toBe(600)
    expect(fixedWaterCharge(perRoom, { occupants: 2 }, 1)).toBe(150)
  })

  it('非固定月費或金額為 0 不收', () => {
    expect(fixedWaterCharge(normalizeWaterSettings({ mode: 'split' }), {}, 1)).toBe(0)
    expect(fixedWaterCharge(normalizeWaterSettings({ mode: 'fixed', fixedAmount: 0 }), {}, 1)).toBe(0)
  })

  it('摘要寫出期間與計算方式', () => {
    expect(fixedWaterDescription(perPerson, { occupants: 2 }, { from: '2026-09', to: '2026-09' }))
      .toBe('2026-09 水費（每人每月 $100 × 2 人）')
    expect(fixedWaterDescription(perRoom, {}, { from: '2026-09', to: '2026-11' }))
      .toBe('2026-09～2026-11 水費（每月 $150）')
  })
})

describe('台水帳單均攤', () => {
  const period = { periodStart: '2026-07-01', periodEnd: '2026-08-30' } // 61 天

  it('含首尾計算重疊天數', () => {
    expect(overlapDays('2026-07-01', '2026-08-30', '2026-07-01', '2026-08-30')).toBe(61)
    expect(overlapDays('2026-08-01', '2026-12-31', '2026-07-01', '2026-08-30')).toBe(30)
    expect(overlapDays('2026-09-01', '2026-12-31', '2026-07-01', '2026-08-30')).toBe(0)
  })

  it('依房×天均攤，期間中退租只付住的天數，空房不列入分母', () => {
    const r = splitWaterBill({
      ...period, total: 1000, basis: 'room',
      participants: [
        { key: 'a', leaseStart: '2026-01-01', leaseEnd: '2026-12-31' }, // 61 天
        { key: 'b', leaseStart: '2026-01-01', leaseEnd: '2026-07-31' }, // 31 天
        { key: 'c', leaseStart: '2026-09-01', leaseEnd: '2027-08-31' }, // 0 天
      ],
    })
    expect(r.shares.map(s => [s.key, s.days, s.amount])).toEqual([['a', 61, 663], ['b', 31, 337]])
    expect(r.remainder).toBe(0)
    expect(r.totalWeight).toBe(92)
  })

  it('依人×天時乘上人數', () => {
    const r = splitWaterBill({
      ...period, total: 900, basis: 'person',
      participants: [
        { key: 'a', leaseStart: '2026-01-01', leaseEnd: '2026-12-31', occupants: 2 },
        { key: 'b', leaseStart: '2026-01-01', leaseEnd: '2026-12-31', occupants: 1 },
      ],
    })
    expect(r.shares.map(s => s.amount)).toEqual([600, 300])
  })

  it('四捨五入尾差由房東吸收，各份相加與尾差等於總額', () => {
    const r = splitWaterBill({
      ...period, total: 1000, basis: 'room',
      participants: ['a', 'b', 'c'].map(key => ({ key, leaseStart: '2026-01-01', leaseEnd: '2026-12-31' })),
    })
    expect(r.shares.map(s => s.amount)).toEqual([333, 333, 333])
    expect(r.remainder).toBe(1)
    expect(r.shares.reduce((s, x) => s + x.amount, 0) + r.remainder).toBe(1000)
  })

  it('缺起訖日視為期間內都在住；日期錯誤列入 invalid 不參與', () => {
    const r = splitWaterBill({
      ...period, total: 600, basis: 'room',
      participants: [{ key: 'a' }, { key: 'bad', leaseStart: '2026-13-01', leaseEnd: '2026-12-31' }],
    })
    expect(r.shares.map(s => [s.key, s.amount])).toEqual([['a', 600]])
    expect(r.invalid).toEqual(['bad'])
  })

  it('沒有人住或期間／金額無效時不開單', () => {
    expect(splitWaterBill({ ...period, total: 500, basis: 'room', participants: [] }).shares).toEqual([])
    expect(splitWaterBill({ periodStart: '2026-08-30', periodEnd: '2026-07-01', total: 500, basis: 'room', participants: [{ key: 'a' }] }).shares).toEqual([])
    expect(splitWaterBill({ ...period, total: 0, basis: 'room', participants: [{ key: 'a' }] }).shares).toEqual([])
  })
})

describe('獨立水號', () => {
  const period = { periodStart: '2026-07-01', periodEnd: '2026-08-30', total: 610 }

  it('整期都在住付全額', () => {
    const r = independentWaterShares({ ...period, participants: [{ key: 'a', leaseStart: '2026-01-01', leaseEnd: '2026-12-31' }] })
    expect(r.shares.map(s => s.amount)).toEqual([610])
    expect(r.remainder).toBe(0)
  })

  it('期間內換租客依天數比例，空房天數由房東負擔', () => {
    const r = independentWaterShares({
      ...period,
      participants: [
        { key: 'old', leaseStart: '2026-01-01', leaseEnd: '2026-07-10' }, // 10 天
        { key: 'new', leaseStart: '2026-08-01', leaseEnd: '2027-07-31' }, // 30 天
      ],
    })
    expect(r.shares.map(s => [s.key, s.amount])).toEqual([['old', 100], ['new', 300]])
    expect(r.remainder).toBe(210)
  })

  it('租期重疊的錯誤資料不會讓合計超過帳單', () => {
    const r = independentWaterShares({
      ...period,
      participants: [{ key: 'a' }, { key: 'b' }],
    })
    expect(r.shares.reduce((s, x) => s + x.amount, 0)).toBeLessThanOrEqual(610)
  })
})

describe('合約水費文字', () => {
  it('依方式產生，尚未設定回傳空字串', () => {
    expect(waterContractText(normalizeWaterSettings({ mode: 'landlord' }), null)).toBe('由出租人負擔')
    expect(waterContractText(normalizeWaterSettings({ mode: 'fixed', basis: 'person', fixedAmount: 100 }), null))
      .toBe('由承租人負擔（每人每月 100 元，隨租金繳納）')
    expect(waterContractText(normalizeWaterSettings({ mode: 'split', basis: 'room' }), null))
      .toBe('由承租人負擔（依台水帳單，按居住天數均攤）')
    expect(waterContractText(normalizeWaterSettings({ mode: 'split' }), { waterMode: 'independent', waterNo: 'A-1' }))
      .toBe('由承租人負擔（獨立水號 A-1，依台水帳單實報實銷）')
    expect(waterContractText(normalizeWaterSettings({ mode: 'tenant_direct' }), null)).toBe('由承租人自行向台灣自來水公司繳納')
    expect(waterContractText(normalizeWaterSettings(null, 'tenant'), null)).toBe('')
    expect(waterContractText(normalizeWaterSettings({ mode: 'fixed', fixedAmount: 0 }), null)).toBe('')
  })
})
