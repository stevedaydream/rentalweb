import { describe, it, expect } from 'vitest'
import { calculateElectricity } from './calc'
import {
  defaultSettings,
  normalizeSettings,
  type MeterEntry,
  type MeterGroup,
  type Settings,
} from '../../components/meter/types'

/**
 * 黃金測資：基隆復興路 7 間房 2026-07 / 2026-08 的真實度數。
 *
 * 設定＝雙月累積 + 平均費率 + 保底 5 元 + full-month 天數比例，
 * 級距分母 9（7 房 + 4樓/5樓兩個公共表）。
 *
 * ⚠ 402 與 503 的「Excel 實收」是使用者在 Excel 手動覆寫的值，非公式結果：
 *    402  Excel 465 = 手動改成「雙月度數 × 5」（公式為 701）
 *    503  Excel 5008 = 第 1 月手動放棄保底、改用原始金額 219.81（公式為 4863）
 *    故此處預期值採「系統應算出的正確值」，勿依 Excel 修改。
 */
const makeSettings = (): Settings => normalizeSettings({
  mode: 'tiered_avg',
  tieredConfig: {
    strategy: 'split',
    season: 'average',
    dayScaling: 'full-month',
    cycle: 'bimonthly',
    cycleAnchor: 'odd',
    minRate: 5,
  },
} as Partial<Settings>, defaultSettings)

const GROUP: MeterGroup = {
  id: 'g1',
  name: '基隆復興路總表',
  officialMetersCount: 1,
  roomCount: 9,
  masterLastReading: 0,
}

const entry = (over: Partial<MeterEntry>): MeterEntry => ({
  roomId: 'r', name: 'r', tenantName: 't', status: 'occupied',
  lastReading: 0, lastReadingDate: '2026-07-01',
  currentReadingDate: '2026-07-31',
  existingReadingId: null, isLocked: false, roomLastMeterDate: '',
  groupId: 'g1',
  ...over,
})

describe('黃金測資：基隆 7 房 2026-07（雙月帳期第 1 月）', () => {
  const s = makeSettings()
  const cases: [string, number, number][] = [
    // 房號, 度數, 應算出金額
    ['401', 72, 360],
    ['402', 194, 1056],
    ['403', 227, 1305],
    ['501', 253, 1501],
    ['502', 88, 440],
    ['503', 73, 365],
    ['504', 79, 395],
  ]
  it.each(cases)('%s 用電 %i 度 → NT$%i', (name, usage, expected) => {
    const room = entry({
      roomId: name, name,
      currentReading: usage,
      lastReadingDate: '2026-07-01', currentReadingDate: '2026-07-31',
    })
    expect(calculateElectricity(room, s, GROUP, '2026-07').cost).toBe(expected)
  })
})

describe('黃金測資：基隆 7 房 2026-08（雙月帳期第 2 月，累積相減）', () => {
  const s = makeSettings()
  const cases: [string, number, number, number, number][] = [
    // 房號, 第1月度數, 第1月已收, 本期度數, 應算出金額
    ['401', 72, 360, 175, 1096],
    ['402', 194, 1056, 93, 701],
    ['403', 227, 1305, 349, 2633],
    ['501', 253, 1501, 443, 3342],
    ['502', 88, 440, 235, 1589],
    ['503', 73, 365, 674, 4863],
    ['504', 79, 395, 112, 638],
  ]
  it.each(cases)('%s 第1月 %i 度/$%i + 本期 %i 度 → NT$%i',
    (name, firstUsage, firstCost, usage, expected) => {
      const room = entry({
        roomId: name, name,
        currentReading: usage,
        lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
        cycleFirstUsage: firstUsage, cycleFirstCost: firstCost,
      })
      expect(calculateElectricity(room, s, GROUP, '2026-08').cost).toBe(expected)
    })
})

describe('跨季期間 5/16~6/15（非夏 16 天 / 夏 15 天）', () => {
  // 獨立累進 + 季節自動判定，級距分母 9
  const s = normalizeSettings({
    mode: 'tiered',
    tieredConfig: {
      strategy: 'split', season: 'auto', dayScaling: 'full-month',
      cycle: 'monthly', cycleAnchor: 'odd', minRate: 0,
    },
  } as Partial<Settings>, defaultSettings)

  const cross = (usage: number) => calculateElectricity(
    entry({ currentReading: usage, lastReadingDate: '2026-05-16', currentReadingDate: '2026-06-15' }),
    s, GROUP, '2026-05',
  ).cost

  const seasonal = (usage: number, season: 'summer' | 'non-summer') => calculateElectricity(
    entry({ currentReading: usage, lastReadingDate: '2026-05-16', currentReadingDate: '2026-06-15' }),
    normalizeSettings({ ...s, tieredConfig: { ...s.tieredConfig, season } } as Partial<Settings>, defaultSettings),
    GROUP, '2026-05',
  ).cost

  const cases: [number, number][] = [
    [50, 121], [100, 366], [200, 1097], [300, 1849], [500, 3352],
  ]
  it.each(cases)('用電 %i 度 → NT$%i', (usage, expected) => {
    expect(cross(usage)).toBe(expected)
  })

  // 混合兩種費率的結果，必須落在「全用非夏月」與「全用夏月」之間。
  // 修正前的 bug 讓兩段各拿整期級距額度，結果比最便宜的還低。
  it.each(cases.map(([u]) => u))('用電 %i 度：金額落在全非夏與全夏月之間', (usage) => {
    const mixed = cross(usage)
    const nonSummer = seasonal(usage, 'non-summer')
    const summer = seasonal(usage, 'summer')
    expect(mixed).toBeGreaterThanOrEqual(Math.min(nonSummer, summer))
    expect(mixed).toBeLessThanOrEqual(Math.max(nonSummer, summer))
  })
})
