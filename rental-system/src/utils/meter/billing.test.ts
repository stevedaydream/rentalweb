import { describe, it, expect } from 'vitest'
import {
  publicMeterShare, sumPublicShares,
  shouldGenerateBill, getBillingAmount, getBillingDescription,
  addMonths, rentCoverage, isMonthCovered, shouldGenerateRent, rebillRent,
} from './billing'
import { buildSections } from './sections'
import type { MeterEntry, SubGroup } from '../../components/meter/types'

describe('publicMeterShare：單表每房分攤', () => {
  it('電費平均分給子群組內全部房間（含空房）', () => {
    expect(publicMeterShare(1200, 3)).toBe(400)
  })

  it('除不盡時向下取整，尾差由房東負擔', () => {
    expect(publicMeterShare(100, 3)).toBe(33)
    expect(publicMeterShare(101, 3)).toBe(33)
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
    // 三表各 50 元 ÷ 3 房：逐表 floor(50/3)=16，合計 48
    expect(sumPublicShares([50, 50, 50], 3)).toBe(48)
  })

  it('與「先加總再除」的結果可能不同，此處採逐表制', () => {
    expect(sumPublicShares([50, 50, 50], 3)).toBe(48)
    expect(Math.round((50 + 50 + 50) / 3)).toBe(50) // 先加總再除的結果
  })

  it('單顆公共表時兩種算法一致', () => {
    for (const cost of [1318, 100, 7, 999]) {
      expect(sumPublicShares([cost], 3)).toBe(Math.floor(cost / 3))
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

  it('年繳明列跨年涵蓋期間', () => {
    expect(getBillingDescription({ paymentFrequency: 'yearly' }, '2026-08')).toBe('2026-08～2027-07 年度房租')
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

describe('addMonths：月份加減', () => {
  it.each([
    ['2026-08', 2, '2026-10'],
    ['2026-11', 3, '2027-02'],
    ['2026-01', -1, '2025-12'],
    ['2026-08', -12, '2025-08'],
  ])('%s %+d → %s', (ym, n, expected) => {
    expect(addMonths(ym, n)).toBe(expected)
  })
})

describe('rentCoverage：租金單涵蓋期間', () => {
  it('新單直接讀 coverFrom／coverTo', () => {
    expect(rentCoverage({ date: '2026-07-01', coverFrom: '2026-07', coverTo: '2026-09' }))
      .toEqual({ from: '2026-07', to: '2026-09' })
  })

  // 舊單沒有涵蓋欄位，只能從 getBillingDescription 的固定格式反推
  it.each([
    ['monthly', '2026-08', { from: '2026-08', to: '2026-08' }],
    ['quarterly', '2026-11', { from: '2026-11', to: '2027-01' }],
    ['semiannual', '2026-08', { from: '2026-08', to: '2027-01' }],
    ['yearly', '2026-03', { from: '2026-03', to: '2027-02' }],
  ])('舊的 %s 單由摘要反推（%s 起）', (freq, month, expected) => {
    const description = getBillingDescription({ paymentFrequency: freq }, month)
    expect(rentCoverage({ date: `${month}-01`, description })).toEqual(expected)
  })

  it('解析不了的手動租金單只涵蓋當月', () => {
    expect(rentCoverage({ date: '2026-08-15', description: '補收房租' }))
      .toEqual({ from: '2026-08', to: '2026-08' })
  })

  it('沒有日期的資料不涵蓋任何月份', () => {
    expect(rentCoverage({ description: '2026-07～2026-09 季度房租' })).toBeNull()
  })
})

describe('shouldGenerateRent：依涵蓋期間決定是否出租金', () => {
  const q = { date: '2026-07-01', description: '2026-07～2026-09 季度房租' }

  it('季繳改月繳：季繳單涵蓋的月份不再出帳，期滿後接月繳', () => {
    const monthly = { paymentFrequency: 'monthly' }
    expect(shouldGenerateRent(monthly, '2026-08', [q])).toBe(false)
    expect(shouldGenerateRent(monthly, '2026-09', [q])).toBe(false)
    expect(shouldGenerateRent(monthly, '2026-10', [q])).toBe(true)
  })

  it('月繳改季繳：不必對齊起租月，上一張到期的下個月就接季繳', () => {
    // 起租月推算的出帳月是 2、5、8、11 月；舊邏輯在 9 月改季繳會空窗到 11 月
    const quarterly = { paymentFrequency: 'quarterly', leaseStart: '2026-02-15' }
    const aug = { date: '2026-08-01', description: '2026-08 月份房租' }
    expect(shouldGenerateRent(quarterly, '2026-09', [aug])).toBe(true)
  })

  it('從未出過租金：沿用起租月推算', () => {
    const quarterly = { paymentFrequency: 'quarterly', leaseStart: '2026-02-15' }
    expect(shouldGenerateRent(quarterly, '2026-08', [])).toBe(true)
    expect(shouldGenerateRent(quarterly, '2026-09', [])).toBe(false)
  })

  it('本月已有手動新增的租金單時不重複出帳', () => {
    const manual = { date: '2026-08-10', description: '房租' }
    expect(shouldGenerateRent({ paymentFrequency: 'monthly' }, '2026-08', [manual])).toBe(false)
  })

  it('isMonthCovered 只看涵蓋區間', () => {
    expect(isMonthCovered([q], '2026-06')).toBe(false)
    expect(isMonthCovered([q], '2026-09')).toBe(true)
  })
})

describe('rebillRent：改成新繳費方式的一期', () => {
  it('季繳單改月繳：起始月不變，金額與摘要改為一個月', () => {
    expect(rebillRent(
      { paymentFrequency: 'monthly', rent: 7000 },
      { date: '2026-07-01', description: '2026-07～2026-09 季度房租' },
    )).toEqual({
      amount: 7000, description: '2026-07 月份房租', coverFrom: '2026-07', coverTo: '2026-07',
    })
  })
})
