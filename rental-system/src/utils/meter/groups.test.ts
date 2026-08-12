import { describe, it, expect } from 'vitest'
import {
  buildSubGroupIndex,
  resolveGroupId,
  buildMeterGroups,
  buildGroupSettingsMap,
  resolveRoomSettings,
  resolveRoomGroup,
} from './groups'
import {
  UNGROUPED_ID,
  defaultSettings,
  normalizeSettings,
  type MeterEntry,
  type MeterGroup,
  type MeterGroupDoc,
  type Settings,
} from '../../components/meter/types'

const doc = (id: string, subGroupIds: string[], over: Partial<MeterGroupDoc> = {}): MeterGroupDoc => ({
  id, landlordId: 'u', name: id,
  subGroups: subGroupIds.map(sg => ({ id: sg, name: sg })),
  ...over,
})

const entry = (over: Partial<MeterEntry> = {}): MeterEntry => ({
  roomId: 'r', name: 'r', tenantName: 't', status: 'occupied',
  lastReading: 0, lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
  existingReadingId: null, isLocked: false, roomLastMeterDate: '',
  ...over,
})

// ---------------------------------------------------------------- 項目 7
describe('buildSubGroupIndex 與 resolveGroupId：電表歸屬', () => {
  const docs = [doc('keelung', ['k4', 'k5']), doc('taoyuan', ['t1'])]
  const index = buildSubGroupIndex(docs)

  it('依 subGroupId 反查所屬總表', () => {
    expect(resolveGroupId(docs, index, 'k4')).toBe('keelung')
    expect(resolveGroupId(docs, index, 'k5')).toBe('keelung')
    expect(resolveGroupId(docs, index, 't1')).toBe('taoyuan')
  })

  it('未綁定子群組時歸為未分組', () => {
    expect(resolveGroupId(docs, index, '')).toBe(UNGROUPED_ID)
    expect(resolveGroupId(docs, index, undefined)).toBe(UNGROUPED_ID)
  })

  it('子群組 id 不存在於任何總表時歸為未分組', () => {
    expect(resolveGroupId(docs, index, 'ghost')).toBe(UNGROUPED_ID)
  })

  it('公共電表自身的 groupId 優先於 subGroupId 反查', () => {
    expect(resolveGroupId(docs, index, 'k4', 'taoyuan')).toBe('taoyuan')
  })

  it('公共電表的 groupId 指向已刪除的總表時，退回用 subGroupId 反查', () => {
    expect(resolveGroupId(docs, index, 'k4', 'deleted-group')).toBe('keelung')
  })

  it('groupId 與 subGroupId 皆無效時歸為未分組', () => {
    expect(resolveGroupId(docs, index, 'ghost', 'deleted-group')).toBe(UNGROUPED_ID)
  })

  // 迴歸：舊版 saveGroupData 會產生兩筆 subGroups id 完全相同的群組文件
  it('重複的群組文件共用同一組子群組 id 時，以先出現者為準', () => {
    const dup = [doc('first', ['sg1', 'sg2']), doc('second', ['sg1', 'sg2'])]
    const dupIndex = buildSubGroupIndex(dup)
    expect(resolveGroupId(dup, dupIndex, 'sg1')).toBe('first')
    expect(resolveGroupId(dup, dupIndex, 'sg2')).toBe('first')
  })

  it('沒有任何群組時一律歸為未分組', () => {
    expect(resolveGroupId([], buildSubGroupIndex([]), 'sg1')).toBe(UNGROUPED_ID)
  })
})

// ---------------------------------------------------------------- 項目 8
describe('buildMeterGroups：級距分母', () => {
  const docs = [doc('keelung', ['k4', 'k5']), doc('taoyuan', ['t1'])]

  it('每組分母 = 該組內電表數（房間 + 公共表，含空房）', () => {
    const entries = [
      entry({ roomId: '401', groupId: 'keelung' }),
      entry({ roomId: '402', groupId: 'keelung' }),
      entry({ roomId: 'pm4', groupId: 'keelung', meterType: 'public' }),
      entry({ roomId: 'vac', groupId: 'keelung', tenantName: '', status: 'vacant' }),
      entry({ roomId: 'ty1', groupId: 'taoyuan' }),
    ]
    const groups = buildMeterGroups(docs, entries)
    expect(groups.find(g => g.id === 'keelung')!.roomCount).toBe(4)
    expect(groups.find(g => g.id === 'taoyuan')!.roomCount).toBe(1)
  })

  it('未分組電表自成一組，不撐大其他棟的分母', () => {
    const entries = [
      entry({ roomId: '401', groupId: 'keelung' }),
      entry({ roomId: 'test', groupId: UNGROUPED_ID }),
      entry({ roomId: 'other', groupId: UNGROUPED_ID }),
    ]
    const groups = buildMeterGroups(docs, entries)
    expect(groups.find(g => g.id === 'keelung')!.roomCount).toBe(1)
    expect(groups.find(g => g.id === UNGROUPED_ID)!.roomCount).toBe(2)
  })

  it('沒有未分組電表時不產生未分組總表', () => {
    const groups = buildMeterGroups(docs, [entry({ groupId: 'keelung' })])
    expect(groups.some(g => g.id === UNGROUPED_ID)).toBe(false)
  })

  it('尚未建立任何群組時，全部電表視為同一顆總表（維持舊行為）', () => {
    const entries = [
      entry({ roomId: 'a', groupId: UNGROUPED_ID }),
      entry({ roomId: 'b', groupId: UNGROUPED_ID }),
    ]
    const groups = buildMeterGroups([], entries)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.id).toBe(UNGROUPED_ID)
    expect(groups[0]!.name).toBe('本棟總表')
    expect(groups[0]!.roomCount).toBe(2)
  })

  it('分母永遠至少為 1，不得為 0（避免除以零）', () => {
    const groups = buildMeterGroups(docs, [])
    for (const g of groups) expect(g.roomCount).toBeGreaterThanOrEqual(1)
  })

  // 迴歸：officialMetersCount 為 0 會讓 scaleFactor 歸零，所有級距上限失效，
  // 全部用電落到最高費率（300 度從 925 元變成 2538 元）
  it.each([
    ['未設定', undefined],
    ['為 0', 0],
    ['為負數', -3],
    ['為 NaN', NaN],
  ])('officialMetersCount %s 時修正為 1', (_label, omc) => {
    const groups = buildMeterGroups(
      [doc('g', ['sg'], { officialMetersCount: omc as number })],
      [entry({ groupId: 'g' })],
    )
    expect(groups[0]!.officialMetersCount).toBe(1)
  })

  it('officialMetersCount 有效時原樣保留', () => {
    const groups = buildMeterGroups(
      [doc('g', ['sg'], { officialMetersCount: 3 })], [entry({ groupId: 'g' })])
    expect(groups[0]!.officialMetersCount).toBe(3)
  })

  it('總表名稱為空時顯示預設名稱', () => {
    const groups = buildMeterGroups([doc('g', ['sg'], { name: '' })], [entry({ groupId: 'g' })])
    expect(groups[0]!.name).toBe('未命名總表')
  })
})

describe('resolveRoomGroup：取得電表所屬總表', () => {
  const groups: MeterGroup[] = [
    { id: 'keelung', name: 'K', officialMetersCount: 1, roomCount: 9, masterLastReading: 0 },
    { id: 'taoyuan', name: 'T', officialMetersCount: 1, roomCount: 1, masterLastReading: 0 },
  ]

  it('依 groupId 取得對應總表', () => {
    expect(resolveRoomGroup(entry({ groupId: 'taoyuan' }), groups)!.id).toBe('taoyuan')
  })

  it('找不到時退回第一組，避免計算中斷', () => {
    expect(resolveRoomGroup(entry({ groupId: 'ghost' }), groups)!.id).toBe('keelung')
    expect(resolveRoomGroup(entry({}), groups)!.id).toBe('keelung')
  })

  it('完全沒有總表時回傳 undefined，由呼叫端處理', () => {
    expect(resolveRoomGroup(entry({ groupId: 'x' }), [])).toBeUndefined()
  })
})

// ---------------------------------------------------------------- 項目 9
describe('設定優先序：房間個別 > 所屬總表 > 全域', () => {
  const global = normalizeSettings({ mode: 'tiered', fixedRate: 1 } as Partial<Settings>, defaultSettings)
  const groupSettings = buildGroupSettingsMap([
    doc('keelung', ['k4'], {
      electricitySettings: normalizeSettings(
        { mode: 'tiered_avg', fixedRate: 2 } as Partial<Settings>, defaultSettings),
    }),
    doc('taoyuan', ['t1']),
  ])

  it('三層皆有時採用房間個別設定', () => {
    const room = entry({
      groupId: 'keelung',
      electricitySettings: normalizeSettings({ mode: 'fixed', fixedRate: 3 } as Partial<Settings>, defaultSettings),
    })
    expect(resolveRoomSettings(room, groupSettings, global).fixedRate).toBe(3)
  })

  it('無房間設定時採用所屬總表設定', () => {
    expect(resolveRoomSettings(entry({ groupId: 'keelung' }), groupSettings, global).fixedRate).toBe(2)
  })

  it('所屬總表未設專屬方案時採用全域', () => {
    expect(resolveRoomSettings(entry({ groupId: 'taoyuan' }), groupSettings, global).fixedRate).toBe(1)
  })

  it('未分組電表採用全域設定', () => {
    expect(resolveRoomSettings(entry({ groupId: UNGROUPED_ID }), groupSettings, global).fixedRate).toBe(1)
  })

  it('沒有 groupId 時採用全域設定', () => {
    expect(resolveRoomSettings(entry({}), groupSettings, global).fixedRate).toBe(1)
  })

  it('房間設定為 null 時視為未設定，往上取用', () => {
    const room = entry({ groupId: 'keelung', electricitySettings: null as unknown as Settings })
    expect(resolveRoomSettings(room, groupSettings, global).fixedRate).toBe(2)
  })
})

describe('buildGroupSettingsMap', () => {
  it('未設專屬方案的總表不會出現在 map 中', () => {
    const map = buildGroupSettingsMap([doc('a', ['sa']), doc('b', ['sb'])])
    expect(map.size).toBe(0)
  })

  it('補齊群組設定中缺少的新欄位', () => {
    const map = buildGroupSettingsMap([
      doc('a', ['sa'], {
        electricitySettings: {
          mode: 'tiered', fixedRate: 5,
          tieredConfig: { strategy: 'split', season: 'auto' },
          tiers: defaultSettings.tiers,
        } as unknown as Settings,
      }),
    ])
    const s = map.get('a')!
    expect(s.tieredConfig.minRate).toBe(defaultSettings.tieredConfig.minRate)
    expect(s.tieredConfig.cycle).toBe(defaultSettings.tieredConfig.cycle)
    expect(s.tieredConfig.dayScaling).toBe(defaultSettings.tieredConfig.dayScaling)
  })
})
