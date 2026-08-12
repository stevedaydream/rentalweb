import { describe, it, expect } from 'vitest'
import { applyMinRate, calculateTieredLogic, type TieredResult } from './calc'
import {
  defaultSettings,
  normalizeSettings,
  type MeterEntry,
  type MeterGroup,
  type Settings,
} from '../../components/meter/types'

const res = (raw: number): TieredResult => ({ cost: Math.round(raw), raw, log: 'base' })

describe('applyMinRate：停用條件', () => {
  it.each([
    ['minRate = 0', 0],
    ['minRate 為負', -5],
    ['minRate 為 NaN', NaN],
    ['minRate 為 undefined', undefined as unknown as number],
  ])('%s 時完全不套用', (_label, minRate) => {
    const base = res(100)
    expect(applyMinRate(base, 100, minRate)).toBe(base)
  })

  it('用電為 0 時不套用（否則 0 度也會被收 0 元以外的金額）', () => {
    const base = res(0)
    expect(applyMinRate(base, 0, 5)).toBe(base)
  })

  it('用電為負時不套用', () => {
    const base = res(0)
    expect(applyMinRate(base, -10, 5)).toBe(base)
  })
})

describe('applyMinRate：觸發條件與邊界', () => {
  it('平均單價恰等於保底時不套用（>= 為不觸發）', () => {
    const base = res(500) // 100 度 → 平均 5.0
    expect(applyMinRate(base, 100, 5)).toBe(base)
  })

  it('平均單價略低於保底時套用', () => {
    const out = applyMinRate(res(499.9), 100, 5)
    expect(out.cost).toBe(500)
    expect(out.raw).toBe(500)
  })

  it('平均單價略高於保底時不套用', () => {
    const base = res(500.1)
    expect(applyMinRate(base, 100, 5)).toBe(base)
  })

  it('套用後金額 = 用電度數 × 保底單價', () => {
    for (const [usage, minRate] of [[73, 5], [88, 5], [200, 3.5], [1, 5]] as const) {
      const out = applyMinRate(res(0), usage, minRate)
      expect(out.cost).toBe(Math.round(usage * minRate))
    }
  })

  it('計算明細會說明觸發保底的原因', () => {
    const out = applyMinRate(res(100), 100, 5)
    expect(out.log).toContain('保底')
    expect(out.log).toContain('平均單價')
  })
})

describe('applyMinRate：不變量', () => {
  it('永遠不會讓金額變低', () => {
    for (let raw = 0; raw <= 2000; raw += 37) {
      for (const usage of [1, 50, 100, 500]) {
        for (const minRate of [0, 3, 5, 8]) {
          const out = applyMinRate(res(raw), usage, minRate)
          expect(out.raw).toBeGreaterThanOrEqual(raw)
        }
      }
    }
  })

  it('套用後的平均單價恰等於保底單價', () => {
    const out = applyMinRate(res(10), 100, 5)
    expect(out.raw / 100).toBeCloseTo(5, 10)
  })
})

// --- 與累進計算串接 ---
const room = (over: Partial<MeterEntry> = {}): MeterEntry => ({
  roomId: 'r', name: '401', tenantName: 't', status: 'occupied',
  lastReading: 0, lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
  existingReadingId: null, isLocked: false, roomLastMeterDate: '', groupId: 'g',
  ...over,
})
const GROUP: MeterGroup = {
  id: 'g', name: 'G', officialMetersCount: 1, roomCount: 9, masterLastReading: 0,
}
const avgSettings = (): Settings => normalizeSettings({
  mode: 'tiered_avg',
  tieredConfig: {
    strategy: 'split', season: 'average', dayScaling: 'full-month',
    cycle: 'monthly', cycleAnchor: 'odd', minRate: 5,
  },
} as Partial<Settings>, defaultSettings)

describe('串接累進計算', () => {
  it('低用量房間會被拉到保底單價（黃金測資 503：73 度 → 365 元）', () => {
    const s = avgSettings()
    const tiered = calculateTieredLogic(73, room(), GROUP, s)
    expect(tiered.raw / 73).toBeLessThan(5) // 累進算出的平均單價低於保底
    expect(applyMinRate(tiered, 73, 5).cost).toBe(365)
  })

  it('高用量房間不受保底影響（黃金測資 501：253 度）', () => {
    const s = avgSettings()
    const tiered = calculateTieredLogic(253, room(), GROUP, s)
    expect(tiered.raw / 253).toBeGreaterThan(5)
    expect(applyMinRate(tiered, 253, 5).cost).toBe(tiered.cost)
  })

  it('保底單價越高，金額不得下降', () => {
    const s = avgSettings()
    const tiered = calculateTieredLogic(100, room(), GROUP, s)
    let prev = -1
    for (const minRate of [0, 1, 3, 5, 7, 10]) {
      const cost = applyMinRate(tiered, 100, minRate).cost
      expect(cost).toBeGreaterThanOrEqual(prev)
      prev = cost
    }
  })
})
