import { describe, it, expect } from 'vitest'
import { calculateElectricity, calculateGroupAvgRate } from './calc'
import {
  defaultSettings,
  normalizeSettings,
  type MeterEntry,
  type MeterGroup,
  type Settings,
} from '../../components/meter/types'

const group = (over: Partial<MeterGroup> = {}): MeterGroup => ({
  id: 'g', name: 'G', officialMetersCount: 1, roomCount: 9, masterLastReading: 0, ...over,
})

const room = (over: Partial<MeterEntry> = {}): MeterEntry => ({
  roomId: 'r', name: '401', tenantName: 't', status: 'occupied',
  lastReading: 0, lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
  existingReadingId: null, isLocked: false, roomLastMeterDate: '', groupId: 'g',
  ...over,
})

const mode = (m: string, over: Partial<Settings> = {}): Settings =>
  normalizeSettings({ mode: m, ...over } as Partial<Settings>, defaultSettings)

// ---------------------------------------------------------------- 項目 5
describe('calculateGroupAvgRate：帳單分攤制平均單價', () => {
  it('平均單價 = 總帳單金額 ÷ 總用電度數', () => {
    expect(calculateGroupAvgRate(group({ masterCurrentReading: 2000, masterBillAmount: 10000 })))
      .toBeCloseTo(5, 10)
  })

  it('masterLastReading 有值時，度數為兩者之差', () => {
    expect(calculateGroupAvgRate(group({
      masterLastReading: 1000, masterCurrentReading: 3000, masterBillAmount: 10000,
    }))).toBeCloseTo(5, 10)
  })

  it.each([
    ['未輸入本期總度數', { masterBillAmount: 10000 }],
    ['未輸入總帳單金額', { masterCurrentReading: 2000 }],
    ['本期總度數為 0', { masterCurrentReading: 0, masterBillAmount: 10000 }],
    ['總帳單金額為 0', { masterCurrentReading: 2000, masterBillAmount: 0 }],
    ['兩者皆未輸入', {}],
  ])('%s 時回傳 0，不得產生 NaN 或 Infinity', (_label, over) => {
    const rate = calculateGroupAvgRate(group(over as Partial<MeterGroup>))
    expect(rate).toBe(0)
    expect(Number.isFinite(rate)).toBe(true)
  })

  it('本期讀數小於上期時度數視為 0，回傳 0 而非負單價', () => {
    expect(calculateGroupAvgRate(group({
      masterLastReading: 3000, masterCurrentReading: 1000, masterBillAmount: 10000,
    }))).toBe(0)
  })
})

describe('帳單分攤制：分攤到各房', () => {
  const s = mode('bill_share')
  const g = group({ masterCurrentReading: 2000, masterBillAmount: 10000 }) // 5 元/度

  it('房間電費 = 用電度數 × 平均單價', () => {
    expect(calculateElectricity(room({ currentReading: 100 }), s, g, '2026-08').cost).toBe(500)
    expect(calculateElectricity(room({ currentReading: 253 }), s, g, '2026-08').cost).toBe(1265)
  })

  it('各房電費總和約等於總帳單金額（誤差僅來自逐房四捨五入）', () => {
    const usages = [72, 194, 227, 253, 88, 73, 79, 514, 500] // 合計 2000 度
    const total = usages.reduce((sum, u) =>
      sum + calculateElectricity(room({ currentReading: u }), s, g, '2026-08').cost, 0)
    expect(Math.abs(total - 10000)).toBeLessThanOrEqual(usages.length / 2)
  })

  it('尚未輸入總表資料時電費為 0，不得產生 NaN', () => {
    const res = calculateElectricity(room({ currentReading: 100 }), s, group(), '2026-08')
    expect(res.cost).toBe(0)
    expect(Number.isNaN(res.cost)).toBe(false)
  })

  it('無所屬總表時回傳 0 並說明原因', () => {
    const res = calculateElectricity(room({ currentReading: 100 }), s, undefined, '2026-08')
    expect(res.cost).toBe(0)
    expect(res.log).toContain('無群組設定')
  })

  it('不受保底單價影響（分攤制的單價由台電帳單決定）', () => {
    const withFloor = mode('bill_share')
    withFloor.tieredConfig.minRate = 5
    const cheap = group({ masterCurrentReading: 2000, masterBillAmount: 2000 }) // 1 元/度
    expect(calculateElectricity(room({ currentReading: 100 }), withFloor, cheap, '2026-08').cost)
      .toBe(100)
  })
})

// ---------------------------------------------------------------- 項目 6
describe('固定費率', () => {
  it('電費 = 用電度數 × 每度單價', () => {
    const s = mode('fixed', { fixedRate: 5 })
    expect(calculateElectricity(room({ currentReading: 100 }), s, group(), '2026-08').cost).toBe(500)
    expect(calculateElectricity(room({ currentReading: 73 }), s, group(), '2026-08').cost).toBe(365)
  })

  it('小數單價依四捨五入', () => {
    const s = mode('fixed', { fixedRate: 4.5 })
    expect(calculateElectricity(room({ currentReading: 101 }), s, group(), '2026-08').cost).toBe(455)
  })

  it('不需要所屬總表也能計算', () => {
    const s = mode('fixed', { fixedRate: 5 })
    expect(calculateElectricity(room({ currentReading: 100 }), s, undefined, '2026-08').cost).toBe(500)
  })

  it('不受級距分母影響（電表數變動不改變金額）', () => {
    const s = mode('fixed', { fixedRate: 5 })
    for (const roomCount of [1, 9, 50]) {
      expect(calculateElectricity(room({ currentReading: 100 }), s, group({ roomCount }), '2026-08').cost)
        .toBe(500)
    }
  })

  it('不受計費期間長度影響', () => {
    const s = mode('fixed', { fixedRate: 5 })
    const short = room({ currentReading: 100, lastReadingDate: '2026-08-20', currentReadingDate: '2026-08-31' })
    const long = room({ currentReading: 100, lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31' })
    expect(calculateElectricity(short, s, group(), '2026-08').cost)
      .toBe(calculateElectricity(long, s, group(), '2026-08').cost)
  })

  it('不套用保底單價（固定費率本身即為約定單價）', () => {
    const s = mode('fixed', { fixedRate: 3 })
    s.tieredConfig.minRate = 5
    expect(calculateElectricity(room({ currentReading: 100 }), s, group(), '2026-08').cost).toBe(300)
  })

  it('不走雙月累積（固定費率無級距，累積無意義）', () => {
    const s = mode('fixed', { fixedRate: 5 })
    s.tieredConfig.cycle = 'bimonthly'
    const res = calculateElectricity(
      room({ currentReading: 100, cycleFirstUsage: 200, cycleFirstCost: 1000 }),
      s, group(), '2026-08',
    )
    expect(res.cost).toBe(500)
    expect(res.log).not.toContain('雙月帳期')
  })

  it('單調性：用電越多金額不得減少', () => {
    const s = mode('fixed', { fixedRate: 5 })
    let prev = -1
    for (let u = 0; u <= 500; u += 17) {
      const cost = calculateElectricity(room({ currentReading: u }), s, group(), '2026-08').cost
      expect(cost).toBeGreaterThanOrEqual(prev)
      prev = cost
    }
  })
})
