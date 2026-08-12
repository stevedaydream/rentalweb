import { describe, it, expect } from 'vitest'
import { calculateElectricity, getDaysDiff } from './calc'
import {
  defaultSettings,
  normalizeSettings,
  type MeterEntry,
  type MeterGroup,
  type Settings,
} from '../../components/meter/types'

const GROUP: MeterGroup = {
  id: 'g1', name: 'G', officialMetersCount: 1, roomCount: 9, masterLastReading: 0,
}

const tiered = (): Settings => normalizeSettings({
  mode: 'tiered',
  tieredConfig: {
    strategy: 'split', season: 'auto', dayScaling: 'full-month',
    cycle: 'monthly', cycleAnchor: 'odd', minRate: 5,
  },
} as Partial<Settings>, defaultSettings)

const entry = (over: Partial<MeterEntry>): MeterEntry => ({
  roomId: 'r', name: '401', tenantName: 't', status: 'occupied',
  lastReading: 0, lastReadingDate: '2026-08-01',
  currentReading: 100, currentReadingDate: '2026-08-31',
  existingReadingId: null, isLocked: false, roomLastMeterDate: '',
  groupId: 'g1',
  ...over,
})

describe('計費期間日期無效時的防護', () => {
  it('getDaysDiff 對無效日期回傳 NaN（由呼叫端判斷，不臆測天數）', () => {
    expect(getDaysDiff('2026-08-01', '')).toBeNaN()
    expect(getDaysDiff('', '2026-08-31')).toBeNaN()
    expect(getDaysDiff('bad', 'bad')).toBeNaN()
  })

  it.each([
    ['迄日為空', { currentReadingDate: '' }],
    ['起日為空', { lastReadingDate: '' }],
    ['兩者皆無效', { lastReadingDate: 'x', currentReadingDate: 'y' }],
  ])('累進計費遇到%s時回傳 0 並說明原因，不得產生 NaN', (_label, over) => {
    const res = calculateElectricity(entry(over as Partial<MeterEntry>), tiered(), GROUP, '2026-08')
    expect(res.cost).toBe(0)
    expect(Number.isNaN(res.cost)).toBe(false)
    expect(res.log).toContain('計費期間日期無效')
  })

  it('日期無效時不得因 NaN 比較而靜默套用保底單價', () => {
    // 迴歸：NaN >= minRate 為 false，舊行為會落入 applyMinRate 改成 usage × 5，
    // 100 度會無聲變成 500 元
    const res = calculateElectricity(entry({ currentReadingDate: '' }), tiered(), GROUP, '2026-08')
    expect(res.cost).not.toBe(500)
    expect(res.cost).toBe(0)
  })

  it('固定費率不依賴計費期間，日期無效仍正常計算', () => {
    const fixed = normalizeSettings(
      { mode: 'fixed', fixedRate: 5 } as Partial<Settings>, defaultSettings)
    const res = calculateElectricity(entry({ currentReadingDate: '' }), fixed, GROUP, '2026-08')
    expect(res.cost).toBe(500)
  })

  it('無用量時回傳 0，不進入累進計算', () => {
    const res = calculateElectricity(entry({ currentReading: 0 }), tiered(), GROUP, '2026-08')
    expect(res.cost).toBe(0)
    expect(res.log).toBe('無用量')
  })

  it('本期讀數小於上期時視為 0 度，不得出現負數電費', () => {
    const res = calculateElectricity(
      entry({ lastReading: 500, currentReading: 100 }), tiered(), GROUP, '2026-08')
    expect(res.cost).toBe(0)
  })

  it('累進模式但無所屬總表時回傳 0 並說明原因', () => {
    const res = calculateElectricity(entry({}), tiered(), undefined, '2026-08')
    expect(res.cost).toBe(0)
    expect(res.log).toContain('無群組設定')
  })
})
