import { describe, it, expect } from 'vitest'
import { calculateTieredLogic } from './calc'
import {
  defaultSettings,
  normalizeSettings,
  type MeterEntry,
  type MeterGroup,
  type Settings,
} from '../../components/meter/types'

const room = (over: Partial<MeterEntry> = {}): MeterEntry => ({
  roomId: 'r', name: '401', tenantName: 't', status: 'occupied',
  lastReading: 0, lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
  existingReadingId: null, isLocked: false, roomLastMeterDate: '', groupId: 'g',
  ...over,
})

const group = (over: Partial<MeterGroup> = {}): MeterGroup => ({
  id: 'g', name: 'G', officialMetersCount: 1, roomCount: 1, masterLastReading: 0, ...over,
})

/** 基準設定：不縮放天數、標準台電、強制夏月 → scaleFactor = 1，可手算驗證 */
const plain = (over: Partial<Settings['tieredConfig']> = {}): Settings => normalizeSettings({
  mode: 'tiered',
  tieredConfig: {
    strategy: 'standard', season: 'summer', dayScaling: 'none',
    cycle: 'monthly', cycleAnchor: 'odd', minRate: 0, ...over,
  },
} as Partial<Settings>, defaultSettings)

// 夏月費率：120@1.68 / 330@2.45 / 500@3.70 / 700@5.04 / 1000@6.24 / 以上@8.46
describe('級距切分（scaleFactor = 1，可手算）', () => {
  const cases: [number, number][] = [
    [100, 168],   // 100×1.68
    [120, 202],   // 級距上界：120×1.68 = 201.6
    [121, 204],   // 跨界 1 度：201.6 + 1×2.45
    [200, 398],   // 201.6 + 80×2.45
    [330, 716],   // 201.6 + 210×2.45 = 716.1
    [500, 1345],  // 716.1 + 170×3.70 = 1345.1
    [700, 2353],  // 1345.1 + 200×5.04 = 2353.1
    [1000, 4225], // 2353.1 + 300×6.24 = 4225.1
    [1500, 8455], // 4225.1 + 500×8.46 = 8455.1
  ]
  it.each(cases)('用電 %i 度 → NT$%i', (usage, expected) => {
    expect(calculateTieredLogic(usage, room(), group(), plain()).cost).toBe(expected)
  })

  it('每個級距邊界的前後 1 度，單價應等於該級距費率', () => {
    const s = plain()
    const at = (u: number) => calculateTieredLogic(u, room(), group(), s).raw
    const marginal = (u: number) => at(u + 1) - at(u)
    expect(marginal(119)).toBeCloseTo(1.68, 6)
    expect(marginal(120)).toBeCloseTo(2.45, 6)
    expect(marginal(329)).toBeCloseTo(2.45, 6)
    expect(marginal(330)).toBeCloseTo(3.70, 6)
    expect(marginal(999)).toBeCloseTo(6.24, 6)
    expect(marginal(1000)).toBeCloseTo(8.46, 6)
  })
})

describe('最高級距一律無上限', () => {
  const withTopLimit = (limit: number) => {
    const s = plain()
    s.tiers = JSON.parse(JSON.stringify(defaultSettings.tiers))
    s.tiers[s.tiers.length - 1]!.limit = limit
    return s
  }

  // 迴歸：最高級距上限原本取 tier.limit，房東若把 99999 改成 2000，
  // 超過 2000 度的用電會在迴圈結束後被靜默丟棄，完全不收費。
  it('房東自訂最高級距上限時，超出的度數仍須計費', () => {
    const s = withTopLimit(1200)
    const a = calculateTieredLogic(1500, room(), group(), s).cost
    const b = calculateTieredLogic(3000, room(), group(), s).cost
    expect(b).toBeGreaterThan(a)
  })

  it('最高級距上限不影響金額（1200 與 99999 結果相同）', () => {
    for (const usage of [900, 1500, 3000]) {
      expect(calculateTieredLogic(usage, room(), group(), withTopLimit(1200)).cost)
        .toBe(calculateTieredLogic(usage, room(), group(), withTopLimit(99999)).cost)
    }
  })

  it('第 1001 度之後每度皆為最高費率 8.46', () => {
    const s = withTopLimit(1200)
    const a = calculateTieredLogic(1000, room(), group(), s).raw
    const b = calculateTieredLogic(2000, room(), group(), s).raw
    expect((b - a) / 1000).toBeCloseTo(8.46, 6)
  })
})

describe('單調性不變量', () => {
  it('用電越多，金額不得減少（各種設定組合）', () => {
    const configs = [
      plain(),
      plain({ strategy: 'split' }),
      plain({ season: 'non-summer' }),
      plain({ season: 'average' }),
      plain({ dayScaling: 'legacy' }),
      plain({ dayScaling: 'full-month' }),
    ]
    for (const s of configs) {
      let prev = -1
      for (let u = 0; u <= 2000; u += 37) {
        const cost = calculateTieredLogic(u, room(), group({ roomCount: 9 }), s).raw
        expect(cost).toBeGreaterThanOrEqual(prev)
        prev = cost
      }
    }
  })

  it('金額恆為有限數，不得出現 NaN 或 Infinity', () => {
    for (const s of [plain(), plain({ strategy: 'split' }), plain({ season: 'auto' })]) {
      for (const u of [0, 1, 120, 1000, 99999]) {
        const r = calculateTieredLogic(u, room(), group({ roomCount: 9 }), s)
        expect(Number.isFinite(r.raw)).toBe(true)
        expect(Number.isFinite(r.cost)).toBe(true)
      }
    }
  })
})

describe('天數比例三策略', () => {
  const usage = 300
  const full = room({ lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31' }) // 31 天
  const half = room({ lastReadingDate: '2026-08-15', currentReadingDate: '2026-08-31' }) // 17 天

  it("'none'：完全不隨天數變動", () => {
    const s = plain({ dayScaling: 'none' })
    expect(calculateTieredLogic(usage, half, group(), s).cost)
      .toBe(calculateTieredLogic(usage, full, group(), s).cost)
  })

  it("'full-month'：完整月不縮放，不完整月縮小級距使金額變高", () => {
    const s = plain({ dayScaling: 'full-month' })
    const a = calculateTieredLogic(usage, full, group(), s).cost
    const b = calculateTieredLogic(usage, half, group(), s).cost
    expect(a).toBe(calculateTieredLogic(usage, full, group(), plain({ dayScaling: 'none' })).cost)
    expect(b).toBeGreaterThan(a) // 級距額度變小 → 同樣度數落入更貴級距
  })

  it("'legacy'：一律除以 30 天，31 天的完整月也會略微放大級距", () => {
    const s = plain({ dayScaling: 'legacy' })
    const a = calculateTieredLogic(usage, full, group(), s).cost
    const none = calculateTieredLogic(usage, full, group(), plain({ dayScaling: 'none' })).cost
    expect(a).toBeLessThan(none) // 31/30 > 1 → 級距放大 → 金額略低
  })
})

describe('級距策略 split 與 standard', () => {
  it('split：級距除以群組電表數，電表數越多級距越小、金額越高', () => {
    const s = plain({ strategy: 'split' })
    const c1 = calculateTieredLogic(300, room(), group({ roomCount: 1 }), s).cost
    const c9 = calculateTieredLogic(300, room(), group({ roomCount: 9 }), s).cost
    expect(c9).toBeGreaterThan(c1)
  })

  it('split 且電表數為 1 時，等同 standard 且總表數為 1', () => {
    expect(calculateTieredLogic(300, room(), group({ roomCount: 1 }), plain({ strategy: 'split' })).cost)
      .toBe(calculateTieredLogic(300, room(), group({ officialMetersCount: 1 }), plain()).cost)
  })

  it('standard：級距依總表數放大，總表數越多級距越大、金額越低', () => {
    const s = plain({ strategy: 'standard' })
    const c1 = calculateTieredLogic(300, room(), group({ officialMetersCount: 1 }), s).cost
    const c2 = calculateTieredLogic(300, room(), group({ officialMetersCount: 2 }), s).cost
    expect(c2).toBeLessThan(c1)
  })
})

describe('季節拆分依天數比例', () => {
  const cross = room({ lastReadingDate: '2026-05-16', currentReadingDate: '2026-06-15' }) // 非夏16/夏15

  it('跨季金額落在全非夏與全夏月之間', () => {
    const g = group({ roomCount: 9 })
    for (const usage of [50, 100, 300, 800]) {
      const mixed = calculateTieredLogic(usage, cross, g, plain({ season: 'auto' })).raw
      const n = calculateTieredLogic(usage, cross, g, plain({ season: 'non-summer' })).raw
      const s = calculateTieredLogic(usage, cross, g, plain({ season: 'summer' })).raw
      expect(mixed).toBeGreaterThanOrEqual(Math.min(n, s))
      expect(mixed).toBeLessThanOrEqual(Math.max(n, s))
    }
  })

  it('完全落在夏月內時，auto 與強制夏月結果相同', () => {
    const inSummer = room({ lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31' })
    const g = group({ roomCount: 9 })
    expect(calculateTieredLogic(300, inSummer, g, plain({ season: 'auto' })).cost)
      .toBe(calculateTieredLogic(300, inSummer, g, plain({ season: 'summer' })).cost)
  })

  it('完全落在非夏月內時，auto 與強制非夏月結果相同', () => {
    const inWinter = room({ lastReadingDate: '2026-03-01', currentReadingDate: '2026-03-31' })
    const g = group({ roomCount: 9 })
    expect(calculateTieredLogic(300, inWinter, g, plain({ season: 'auto' })).cost)
      .toBe(calculateTieredLogic(300, inWinter, g, plain({ season: 'non-summer' })).cost)
  })

  it("'average' 費率介於夏月與非夏月之間", () => {
    const g = group({ roomCount: 9 })
    const avg = calculateTieredLogic(300, room(), g, plain({ season: 'average' })).raw
    const n = calculateTieredLogic(300, room(), g, plain({ season: 'non-summer' })).raw
    const s = calculateTieredLogic(300, room(), g, plain({ season: 'summer' })).raw
    expect(avg).toBeGreaterThan(n)
    expect(avg).toBeLessThan(s)
  })
})
