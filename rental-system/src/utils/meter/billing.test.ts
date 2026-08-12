import { describe, it, expect } from 'vitest'
import {
  publicMeterShare, sumPublicShares,
  shouldGenerateBill, getBillingAmount, getBillingDescription,
} from './billing'
import { buildSections } from './sections'
import type { MeterEntry, SubGroup } from '../../components/meter/types'

describe('publicMeterShare：單表每房分攤', () => {
  it('電費平均分給子群組內全部房間（含空房）', () => {
    expect(publicMeterShare(1200, 3)).toBe(400)
  })

  it('除不盡時四捨五入', () => {
    expect(publicMeterShare(100, 3)).toBe(33)
    expect(publicMeterShare(101, 3)).toBe(34)
  })

  it.each([
    ['房間數為 0', 100, 0],
    ['房間數為負', 100, -1],
    ['電費為 0', 0, 3],
    ['電費為負', -100, 3],
  ])('%s 時回傳 0，不得除以零或產生負分攤', (_label, cost, rooms) => {
    const share = publicMeterShare(cost, rooms)
    expect(share).toBe(0)
    expect(Number.isFinite(share)).toBe(true)
  })
})

describe('sumPublicShares：子群組合計', () => {
  it('逐表各自除後相加（與帳單生成一致）', () => {
    // 三表各 50 元 ÷ 3 房：逐表 round(50/3)=17，合計 51
    expect(sumPublicShares([50, 50, 50], 3)).toBe(51)
  })

  it('與「先加總再除」的結果可能不同，此處採逐表制', () => {
    expect(sumPublicShares([50, 50, 50], 3)).toBe(51)
    expect(Math.round((50 + 50 + 50) / 3)).toBe(50) // 先加總再除的結果
  })

  it('單顆公共表時兩種算法一致', () => {
    for (const cost of [1318, 100, 7, 999]) {
      expect(sumPublicShares([cost], 3)).toBe(Math.round(cost / 3))
    }
  })

  it('沒有公共表時為 0', () => {
    expect(sumPublicShares([], 3)).toBe(0)
  })

  it('分攤額為 0 的表不影響合計', () => {
    expect(sumPublicShares([0, 100], 3)).toBe(33)
  })
})

describe('抄表頁預估與帳單生成必須一致', () => {
  const entry = (over: Partial<MeterEntry>): MeterEntry => ({
    roomId: 'r', name: 'r', tenantName: 't', status: 'occupied',
    lastReading: 0, lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
    existingReadingId: null, isLocked: false, roomLastMeterDate: '', groupId: 'g',
    ...over,
  })
  const subGroups: SubGroup[] = [{ id: '4F', name: '4樓' }]
  const costOf = (r: MeterEntry) => Math.max(0, (r.currentReading || 0) - r.lastReading)

  it.each([
    [[50, 50, 50]],
    [[7, 7, 7, 7]],
    [[10, 11]],
    [[1318]],
  ])('公共表電費 %j 時，抄表頁分攤 = 各表帳單金額之和', (costs) => {
    const rooms = ['401', '402', '403'].map(id => entry({ roomId: id, name: id, subGroupId: '4F', currentReading: 100 }))
    const pubs = costs.map((c, i) => entry({
      roomId: `pm${i}`, name: `pm${i}`, subGroupId: '4F', currentReading: c,
      tenantName: '', status: 'public', meterType: 'public',
    }))
    const displayed = buildSections([...rooms, ...pubs], subGroups, costOf)[0]!.publicShare
    const billed = costs.reduce((sum, c) => sum + publicMeterShare(c, rooms.length), 0)
    expect(displayed).toBe(billed)
  })
})

describe('shouldGenerateBill：租金出帳月份', () => {
  it('月繳每月都出帳，且不需要起租日', () => {
    for (let m = 1; m <= 12; m++) {
      expect(shouldGenerateBill({ paymentFrequency: 'monthly' }, `2026-${String(m).padStart(2, '0')}`)).toBe(true)
    }
  })

  it('未設定繳費方式時視為月繳', () => {
    expect(shouldGenerateBill({}, '2026-08')).toBe(true)
  })

  // 這是最容易踩的坑：非月繳又沒填起租日，會永遠不出帳且無任何警告
  it.each(['quarterly', 'semiannual', 'yearly'])('%s 但未填起租日時不出帳', (freq) => {
    expect(shouldGenerateBill({ paymentFrequency: freq }, '2026-08')).toBe(false)
  })

  it('季繳自起租月起每 3 個月出帳一次', () => {
    const t = { paymentFrequency: 'quarterly', leaseStart: '2026-02-15' }
    const billed = Array.from({ length: 12 }, (_, i) =>
      shouldGenerateBill(t, `2026-${String(i + 1).padStart(2, '0')}`))
    expect(billed).toEqual([
      false, true, false, false, true, false,
      false, true, false, false, true, false,
    ])
  })

  it('半年繳自起租月起每 6 個月出帳一次', () => {
    const t = { paymentFrequency: 'semiannual', leaseStart: '2023-08-24' }
    expect(shouldGenerateBill(t, '2026-08')).toBe(true)
    expect(shouldGenerateBill(t, '2026-09')).toBe(false)
    expect(shouldGenerateBill(t, '2027-02')).toBe(true)
  })

  it('年繳自起租月起每 12 個月出帳一次', () => {
    const t = { paymentFrequency: 'yearly', leaseStart: '2025-03-01' }
    expect(shouldGenerateBill(t, '2026-03')).toBe(true)
    expect(shouldGenerateBill(t, '2026-04')).toBe(false)
  })

  it('跨年計算正確（起租日早於本年）', () => {
    const t = { paymentFrequency: 'semiannual', leaseStart: '2024-11-01' }
    expect(shouldGenerateBill(t, '2026-11')).toBe(true)
    expect(shouldGenerateBill(t, '2026-05')).toBe(true)
    expect(shouldGenerateBill(t, '2026-06')).toBe(false)
  })

  it('一個週期內恰有一個月出帳', () => {
    const t = { paymentFrequency: 'quarterly', leaseStart: '2026-01-01' }
    const months = ['2026-04', '2026-05', '2026-06']
    expect(months.filter(m => shouldGenerateBill(t, m))).toHaveLength(1)
  })
})

describe('getBillingAmount：一期應收', () => {
  it.each([
    ['monthly', 1], ['quarterly', 3], ['semiannual', 6], ['yearly', 12],
  ])('%s 為月租 × %i', (freq, months) => {
    expect(getBillingAmount({ paymentFrequency: freq, rent: 7000 })).toBe(7000 * months)
  })

  it('未設定繳費方式時視為月繳', () => {
    expect(getBillingAmount({ rent: 7000 })).toBe(7000)
  })

  it('未設定租金時為 0，不得產生 NaN', () => {
    expect(getBillingAmount({ paymentFrequency: 'semiannual' })).toBe(0)
  })
})

describe('getBillingDescription：帳單摘要', () => {
  it('月繳標示單一月份', () => {
    expect(getBillingDescription({ paymentFrequency: 'monthly' }, '2026-08')).toBe('2026-08 月份房租')
  })

  it('季繳標示三個月區間', () => {
    expect(getBillingDescription({ paymentFrequency: 'quarterly' }, '2026-08'))
      .toBe('2026-08～2026-10 季度房租')
  })

  it('半年繳標示六個月區間', () => {
    expect(getBillingDescription({ paymentFrequency: 'semiannual' }, '2026-08'))
      .toBe('2026-08～2027-01 半年度房租')
  })

  it('年繳標示年度', () => {
    expect(getBillingDescription({ paymentFrequency: 'yearly' }, '2026-08')).toBe('2026 年度房租')
  })

  // 跨年區間。抽出前以 `m + span > 12 ? m + span - 12 : m + span` 計算，
  // 對所有合法輸入皆正確；此處鎖定行為，確保改寫成通用取模後結果不變。
  it.each([
    ['quarterly', '2026-11', '2026-11～2027-01 季度房租'],
    ['quarterly', '2026-12', '2026-12～2027-02 季度房租'],
    ['semiannual', '2026-12', '2026-12～2027-05 半年度房租'],
    ['semiannual', '2026-10', '2026-10～2027-03 半年度房租'],
  ])('%s 自 %s 起算的跨年區間正確', (freq, month, expected) => {
    expect(getBillingDescription({ paymentFrequency: freq }, month)).toBe(expected)
  })

  it('區間結束月份必為起始月 + 週期 − 1', () => {
    for (const [freq, span] of [['quarterly', 3], ['semiannual', 6]] as const) {
      for (let m = 1; m <= 12; m++) {
        const month = `2026-${String(m).padStart(2, '0')}`
        const desc = getBillingDescription({ paymentFrequency: freq }, month)
        const endM = Number(desc.split('～')[1]!.split(' ')[0]!.split('-')[1])
        expect(endM).toBe(((m + span - 2) % 12) + 1)
      }
    }
  })
})
