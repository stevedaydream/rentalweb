import { describe, it, expect } from 'vitest'
import {
  normalizeSettings,
  settingsFingerprint,
  defaultSettings,
  defaultTieredConfig,
  type Settings,
} from './types'

describe('normalizeSettings', () => {
  it('補齊舊資料缺少的 tieredConfig 欄位', () => {
    // 舊 Firestore 文件只有 strategy / season 兩個欄位
    const legacy = {
      mode: 'tiered',
      fixedRate: 5,
      tieredConfig: { strategy: 'split', season: 'auto' },
      tiers: defaultSettings.tiers,
    } as unknown as Partial<Settings>

    const s = normalizeSettings(legacy, defaultSettings)

    expect(s.tieredConfig.dayScaling).toBe(defaultTieredConfig.dayScaling)
    expect(s.tieredConfig.cycle).toBe(defaultTieredConfig.cycle)
    expect(s.tieredConfig.cycleAnchor).toBe(defaultTieredConfig.cycleAnchor)
    expect(s.tieredConfig.minRate).toBe(defaultTieredConfig.minRate)
  })

  it('不覆寫舊資料既有的值', () => {
    const raw = {
      mode: 'tiered_avg',
      fixedRate: 7,
      tieredConfig: { strategy: 'standard', season: 'average', minRate: 0 },
    } as unknown as Partial<Settings>

    const s = normalizeSettings(raw, defaultSettings)

    expect(s.mode).toBe('tiered_avg')
    expect(s.fixedRate).toBe(7)
    expect(s.tieredConfig.strategy).toBe('standard')
    expect(s.tieredConfig.season).toBe('average')
    expect(s.tieredConfig.minRate).toBe(0) // 0 代表停用保底，不可被預設值 5 蓋掉
  })

  it('raw 未提供 tiers 時沿用 base 的 tiers', () => {
    const s = normalizeSettings({ mode: 'tiered' } as Partial<Settings>, defaultSettings)
    expect(s.tiers).toEqual(defaultSettings.tiers)
  })

  it('raw 為 undefined 時回傳等同 base 的設定', () => {
    const s = normalizeSettings(undefined, defaultSettings)
    expect(settingsFingerprint(s)).toBe(settingsFingerprint(defaultSettings))
  })
})

describe('settingsFingerprint', () => {
  it('內容相同但物件鍵序不同者，指紋一致', () => {
    const a: Settings = JSON.parse(JSON.stringify(defaultSettings))
    const b: Settings = {
      // 刻意用不同的鍵序建構
      tiers: JSON.parse(JSON.stringify(defaultSettings.tiers)),
      tieredConfig: {
        minRate: defaultSettings.tieredConfig.minRate,
        cycleAnchor: defaultSettings.tieredConfig.cycleAnchor,
        cycle: defaultSettings.tieredConfig.cycle,
        dayScaling: defaultSettings.tieredConfig.dayScaling,
        season: defaultSettings.tieredConfig.season,
        strategy: defaultSettings.tieredConfig.strategy,
      },
      fixedRate: defaultSettings.fixedRate,
      mode: defaultSettings.mode,
    }
    expect(settingsFingerprint(b)).toBe(settingsFingerprint(a))
  })

  it('舊資料缺欄位時以預設值補齊後比對，不應誤判為不一致', () => {
    const legacy = {
      ...defaultSettings,
      tieredConfig: { strategy: 'split', season: 'auto' },
    } as unknown as Settings
    // defaultSettings 的 tieredConfig 即為 defaultTieredConfig，補齊後應相同
    expect(settingsFingerprint(legacy)).toBe(settingsFingerprint(defaultSettings))
  })

  it('費率不同時指紋不同', () => {
    const changed: Settings = JSON.parse(JSON.stringify(defaultSettings))
    changed.tiers[0]!.summerRate = 99
    expect(settingsFingerprint(changed)).not.toBe(settingsFingerprint(defaultSettings))
  })

  it('保底單價不同時指紋不同', () => {
    const changed: Settings = JSON.parse(JSON.stringify(defaultSettings))
    changed.tieredConfig.minRate = 0
    expect(settingsFingerprint(changed)).not.toBe(settingsFingerprint(defaultSettings))
  })
})
