import { describe, it, expect } from 'vitest'
import { getDaysDiff, getFullMonthDays, countSummerDays } from './calc'

describe('getDaysDiff：抄表區間天數（含頭尾）', () => {
  it('7/1~7/31 = 31 天', () => {
    expect(getDaysDiff('2026-07-01', '2026-07-31')).toBe(31)
  })

  it('跨月 7/11~8/10 = 31 天', () => {
    expect(getDaysDiff('2026-07-11', '2026-08-10')).toBe(31)
  })

  it('同一天 = 1 天', () => {
    expect(getDaysDiff('2026-07-01', '2026-07-01')).toBe(1)
  })

  it('2 月（平年）2/1~2/28 = 28 天', () => {
    expect(getDaysDiff('2026-02-01', '2026-02-28')).toBe(28)
  })

  it('閏年 2/1~2/29 = 29 天', () => {
    expect(getDaysDiff('2024-02-01', '2024-02-29')).toBe(29)
  })

  it('跨年 12/25~1/5 = 12 天', () => {
    expect(getDaysDiff('2025-12-25', '2026-01-05')).toBe(12)
  })

  it('起訖顛倒時取絕對值，不回傳負數', () => {
    expect(getDaysDiff('2026-07-31', '2026-07-01')).toBe(31)
  })
})

describe('getFullMonthDays：自起日起算滿一個月的天數', () => {
  it('8/1 起 → 31 天', () => {
    expect(getFullMonthDays('2026-08-01')).toBe(31)
  })

  it('2/1 起（平年）→ 28 天', () => {
    expect(getFullMonthDays('2026-02-01')).toBe(28)
  })

  it('2/1 起（閏年）→ 29 天', () => {
    expect(getFullMonthDays('2024-02-01')).toBe(29)
  })

  it('4/1 起 → 30 天', () => {
    expect(getFullMonthDays('2026-04-01')).toBe(30)
  })

  it('月中起算 8/15 → 31 天（8/15~9/14）', () => {
    expect(getFullMonthDays('2026-08-15')).toBe(31)
  })

  it('跨年 12/1 起 → 31 天', () => {
    expect(getFullMonthDays('2025-12-01')).toBe(31)
  })

  it('格式無效時回傳 30 作為安全預設', () => {
    expect(getFullMonthDays('')).toBe(30)
    expect(getFullMonthDays('not-a-date')).toBe(30)
  })

  // 迴歸：new Date(2026, 1, 31) 會被 JS 正規化成 3/3，若不夾到月底
  // 1/31 起算會算出 31 天，使 2 月那期級距被錯誤縮小、多收電費
  describe('月底起算須夾到目標月份的最後一天', () => {
    it('1/31 起 → 28 天（平年 1/31~2/27）', () => {
      expect(getFullMonthDays('2026-01-31')).toBe(28)
    })

    it('1/31 起（閏年）→ 29 天', () => {
      expect(getFullMonthDays('2024-01-31')).toBe(29)
    })

    it('3/31 起 → 30 天（3/31~4/29）', () => {
      expect(getFullMonthDays('2026-03-31')).toBe(30)
    })

    it('8/31 起 → 30 天（8/31~9/29）', () => {
      expect(getFullMonthDays('2026-08-31')).toBe(30)
    })

    // 夾的是「迄日」而非天數：1/29 起算滿一個月為 1/29~2/27，共 30 天
    it('1/29 起 → 30 天、1/30 起 → 29 天（迄日皆夾到 2/28）', () => {
      expect(getFullMonthDays('2026-01-29')).toBe(30)
      expect(getFullMonthDays('2026-01-30')).toBe(29)
    })

    it('月底起算的完整期間，天數比例仍為 1', () => {
      for (const [start, end] of [
        ['2026-01-29', '2026-02-27'],
        ['2026-01-30', '2026-02-27'],
        ['2026-01-31', '2026-02-27'],
        ['2026-03-31', '2026-04-29'],
        ['2026-08-31', '2026-09-29'],
      ] as const) {
        expect(getDaysDiff(start, end) / getFullMonthDays(start)).toBe(1)
      }
    })
  })

  it('完整月的天數比例為 1：整月不縮放級距', () => {
    // dayScaling='full-month' 的核心保證
    for (const [start, end] of [
      ['2026-08-01', '2026-08-31'],
      ['2026-02-01', '2026-02-28'],
      ['2026-04-01', '2026-04-30'],
      ['2026-07-11', '2026-08-10'],
    ] as const) {
      expect(getDaysDiff(start, end) / getFullMonthDays(start)).toBe(1)
    }
  })
})

describe('countSummerDays：台電夏月 6/1~9/30', () => {
  it('全在夏月內：8/1~8/31 = 31 天', () => {
    expect(countSummerDays('2026-08-01', '2026-08-31')).toBe(31)
  })

  it('全在非夏月：3/1~3/31 = 0 天', () => {
    expect(countSummerDays('2026-03-01', '2026-03-31')).toBe(0)
  })

  it('夏月起始邊界：5/31 不算、6/1 起算', () => {
    expect(countSummerDays('2026-05-31', '2026-05-31')).toBe(0)
    expect(countSummerDays('2026-06-01', '2026-06-01')).toBe(1)
  })

  it('夏月結束邊界：9/30 仍算、10/1 不算', () => {
    expect(countSummerDays('2026-09-30', '2026-09-30')).toBe(1)
    expect(countSummerDays('2026-10-01', '2026-10-01')).toBe(0)
  })

  it('跨季區間 5/16~6/15：夏月 15 天', () => {
    expect(countSummerDays('2026-05-16', '2026-06-15')).toBe(15)
  })

  it('跨季區間 9/16~10/15：夏月 15 天', () => {
    expect(countSummerDays('2026-09-16', '2026-10-15')).toBe(15)
  })

  it('整個夏月 6/1~9/30 = 122 天', () => {
    expect(countSummerDays('2026-06-01', '2026-09-30')).toBe(122)
  })

  it('夏月天數不會超過區間總天數', () => {
    for (const [start, end] of [
      ['2026-05-16', '2026-06-15'],
      ['2026-09-16', '2026-10-15'],
      ['2026-06-01', '2026-09-30'],
      ['2026-01-01', '2026-12-31'],
    ] as const) {
      expect(countSummerDays(start, end)).toBeLessThanOrEqual(getDaysDiff(start, end))
    }
  })
})
