import { describe, it, expect } from 'vitest'
import { calculateElectricity, calculateTieredLogic, getCycleIndex } from './calc'
import {
  defaultSettings,
  normalizeSettings,
  type MeterEntry,
  type MeterGroup,
  type Settings,
} from '../../components/meter/types'

const GROUP: MeterGroup = {
  id: 'g', name: 'G', officialMetersCount: 1, roomCount: 9, masterLastReading: 0,
}

const settings = (over: Partial<Settings['tieredConfig']> = {}): Settings => normalizeSettings({
  mode: 'tiered_avg',
  tieredConfig: {
    strategy: 'split', season: 'average', dayScaling: 'full-month',
    cycle: 'bimonthly', cycleAnchor: 'odd', minRate: 5, ...over,
  },
} as Partial<Settings>, defaultSettings)

const room = (over: Partial<MeterEntry> = {}): MeterEntry => ({
  roomId: 'r', name: '401', tenantName: 't', status: 'occupied',
  lastReading: 0, lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
  existingReadingId: null, isLocked: false, roomLastMeterDate: '', groupId: 'g',
  ...over,
})

describe('getCycleIndex：帳期序位', () => {
  it('單月制一律為第 1 月', () => {
    const s = settings({ cycle: 'monthly' })
    for (let m = 1; m <= 12; m++) {
      expect(getCycleIndex(s, `2026-${String(m).padStart(2, '0')}`)).toBe(1)
    }
  })

  it('奇數月起算：1/3/5/7/9/11 為第 1 月，2/4/6/8/10/12 為第 2 月', () => {
    const s = settings({ cycleAnchor: 'odd' })
    for (let m = 1; m <= 12; m++) {
      const month = `2026-${String(m).padStart(2, '0')}`
      expect(getCycleIndex(s, month)).toBe(m % 2 === 1 ? 1 : 2)
    }
  })

  it('偶數月起算：2/4/6/8/10/12 為第 1 月', () => {
    const s = settings({ cycleAnchor: 'even' })
    for (let m = 1; m <= 12; m++) {
      const month = `2026-${String(m).padStart(2, '0')}`
      expect(getCycleIndex(s, month)).toBe(m % 2 === 0 ? 1 : 2)
    }
  })

  it('相鄰兩個月必定一為第 1 月、一為第 2 月', () => {
    for (const anchor of ['odd', 'even'] as const) {
      const s = settings({ cycleAnchor: anchor })
      for (let m = 1; m <= 11; m++) {
        const a = getCycleIndex(s, `2026-${String(m).padStart(2, '0')}`)
        const b = getCycleIndex(s, `2026-${String(m + 1).padStart(2, '0')}`)
        expect(a).not.toBe(b)
      }
    }
  })

  it('跨年銜接：12 月與次年 1 月序位不同', () => {
    const s = settings({ cycleAnchor: 'odd' })
    expect(getCycleIndex(s, '2026-12')).toBe(2)
    expect(getCycleIndex(s, '2027-01')).toBe(1)
  })
})

describe('雙月累積相減', () => {
  const s = settings()
  const secondMonth = (firstUsage: number, firstCost: number, usage: number) =>
    calculateElectricity(
      room({
        currentReading: usage,
        lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
        cycleFirstUsage: firstUsage, cycleFirstCost: firstCost,
      }),
      s, GROUP, '2026-08',
    )

  it('第 2 月金額 = 累積度數的累進金額 − 第 1 月已收', () => {
    const firstUsage = 227, firstCost = 1305, usage = 349
    const cum = calculateTieredLogic(firstUsage + usage, room({
      lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
    }), GROUP, s)
    expect(secondMonth(firstUsage, firstCost, usage).cost)
      .toBe(Math.round(cum.raw - firstCost))
  })

  it('計算明細會顯示累積度數與相減過程', () => {
    const log = secondMonth(227, 1305, 349).log
    expect(log).toContain('雙月帳期第 2 月')
    expect(log).toContain('帳期累積')
    expect(log).toContain('第1月已收')
  })

  it('缺少第 1 月資料時退回單月獨立計算（例如租客帳期中途入住）', () => {
    const standalone = calculateElectricity(
      room({ currentReading: 349, lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31' }),
      s, GROUP, '2026-08',
    ).cost
    expect(secondMonth(NaN as unknown as number, 1305, 349).cost).not.toBe(standalone)
    // cycleFirstUsage 未提供時才退回
    const noFirst = calculateElectricity(
      room({ currentReading: 349, lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31' }),
      s, GROUP, '2026-08',
    )
    expect(noFirst.log).not.toContain('雙月帳期第 2 月')
    expect(noFirst.cost).toBe(standalone)
  })

  it('第 1 月為 0 度時，累積等同本期度數', () => {
    const withZeroFirst = secondMonth(0, 0, 349).cost
    const cum = calculateTieredLogic(349, room({
      lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
    }), GROUP, s)
    expect(withZeroFirst).toBe(Math.round(cum.raw))
  })

  it('保底造成的超收在數學上無法觸發負數箝制，會先被累積保底分支攔截', () => {
    // 第 1 月 5 度被保底拉到 25 元。累積 10 度的平均單價仍低於保底，
    // 故先落入「累積平均單價 < 保底」分支，本期 = 5 度 × 5 元。
    // （minRate×u1 必定小於 minRate×(u1+u2)，保底超收不可能大於累積保底金額）
    const out = secondMonth(5, 25, 5)
    expect(out.cost).toBe(25)
    expect(out.log).toContain('累積平均單價')
  })

  it('第 1 月已收高於累積金額時本期歸零而非負數（帳期中途調整費率或電表數）', () => {
    // 保底停用時才會走到相減分支；第 1 月已收被外力墊高
    const noFloor = settings({ minRate: 0 })
    const out = calculateElectricity(
      room({
        currentReading: 10,
        lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
        cycleFirstUsage: 100, cycleFirstCost: 99999,
      }),
      noFloor, GROUP, '2026-08',
    )
    expect(out.cost).toBe(0)
    expect(out.log).toContain('本期歸零')
  })

  it('累積平均單價低於保底時，本期改以保底計費', () => {
    const out = secondMonth(5, 8, 5) // 累積 10 度，平均單價遠低於 5
    expect(out.cost).toBe(25)        // 本期 5 度 × 5 元
    expect(out.log).toContain('累積平均單價')
  })

  it('本期金額恆不為負', () => {
    for (const firstCost of [0, 100, 500, 2000, 99999]) {
      for (const usage of [0, 10, 100, 500]) {
        expect(secondMonth(100, firstCost, usage).cost).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('帳期總額不變量', () => {
  const s = settings({ minRate: 0 }) // 排除保底干擾，專測累積相減本身

  it('兩個月收取總額 = 累積度數的累進金額（誤差僅來自四捨五入）', () => {
    const period = { lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31' }
    for (const [u1, u2] of [[72, 175], [194, 93], [227, 349], [253, 443], [88, 235]] as const) {
      const first = calculateElectricity(room({ ...period, currentReading: u1 }), s, GROUP, '2026-07')
      const second = calculateElectricity(
        room({ ...period, currentReading: u2, cycleFirstUsage: u1, cycleFirstCost: first.cost }),
        s, GROUP, '2026-08',
      )
      const cum = calculateTieredLogic(u1 + u2, room(period), GROUP, s)
      expect(first.cost + second.cost).toBe(Math.round(cum.raw))
    }
  })

  it('第 2 月金額不得低於「單獨計算本期度數」以外的合理範圍：累積制必然不便宜', () => {
    const period = { lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31' }
    for (const [u1, u2] of [[100, 100], [200, 300], [50, 400]] as const) {
      const first = calculateElectricity(room({ ...period, currentReading: u1 }), s, GROUP, '2026-07')
      const second = calculateElectricity(
        room({ ...period, currentReading: u2, cycleFirstUsage: u1, cycleFirstCost: first.cost }),
        s, GROUP, '2026-08',
      ).cost
      const standalone = calculateElectricity(
        room({ ...period, currentReading: u2 }), s, GROUP, '2026-07').cost
      // 累積後落入更高級距，第 2 月金額應不低於單獨計算
      expect(second).toBeGreaterThanOrEqual(standalone)
    }
  })
})
