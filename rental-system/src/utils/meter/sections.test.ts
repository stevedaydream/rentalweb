import { describe, it, expect } from 'vitest'
import {
  buildSections, groupProgress, pendingSaveRooms, validateReading,
  isPublic, isOccupied, isVacant, isBillable,
} from './sections'
import { UNGROUPED_ID, type MeterEntry, type SubGroup } from '../../components/meter/types'

const sg = (id: string, name = id): SubGroup => ({ id, name })

const entry = (over: Partial<MeterEntry> = {}): MeterEntry => ({
  roomId: 'r', name: 'r', tenantName: 't', status: 'occupied',
  lastReading: 0, lastReadingDate: '2026-08-01', currentReadingDate: '2026-08-31',
  existingReadingId: null, isLocked: false, roomLastMeterDate: '', groupId: 'g',
  ...over,
})
const occupiedRoom = (id: string, subGroupId: string, currentReading?: number) =>
  entry({ roomId: id, name: id, subGroupId, currentReading })
const vacantRoom = (id: string, subGroupId: string) =>
  entry({ roomId: id, name: id, subGroupId, tenantName: '', status: 'vacant' })
const publicMeter = (id: string, subGroupId: string, currentReading?: number, landlordPays = false) =>
  entry({ roomId: id, name: id, subGroupId, currentReading, tenantName: '', status: 'public', meterType: 'public', landlordPays })

/** 每度 1 元，方便手算 */
const costOf = (r: MeterEntry) => Math.max(0, (r.currentReading || 0) - r.lastReading)

// ---------------------------------------------------------------- 電表分類
describe('電表分類', () => {
  it('公共表、在租房間、空房三者互斥且涵蓋全部', () => {
    const all = [occupiedRoom('401', 'a'), vacantRoom('402', 'a'), publicMeter('pm', 'a')]
    for (const r of all) {
      expect([isPublic(r), isOccupied(r), isVacant(r)].filter(Boolean)).toHaveLength(1)
    }
  })

  it('有租客姓名或狀態為 occupied 皆視為在租', () => {
    expect(isOccupied(entry({ tenantName: '王小明', status: 'vacant' }))).toBe(true)
    expect(isOccupied(entry({ tenantName: '', status: 'occupied' }))).toBe(true)
    expect(isOccupied(entry({ tenantName: '', status: 'vacant' }))).toBe(false)
  })

  it('會出帳的電表 = 公共表 + 在租房間，空房不計費', () => {
    expect(isBillable(publicMeter('pm', 'a'))).toBe(true)
    expect(isBillable(occupiedRoom('401', 'a'))).toBe(true)
    expect(isBillable(vacantRoom('402', 'a'))).toBe(false)
  })
})

// ---------------------------------------------------------------- 項目 10
describe('buildSections：依子群組分區', () => {
  const subGroups = [sg('4F', '4樓'), sg('5F', '5樓')]

  it('房間依 subGroupId 落入對應區塊，房間在前公共表在後', () => {
    const entries = [
      occupiedRoom('401', '4F', 100), publicMeter('pm4', '4F', 20),
      occupiedRoom('501', '5F', 200),
    ]
    const out = buildSections(entries, subGroups, costOf)
    expect(out.map(s => s.name)).toEqual(['4樓', '5樓'])
    expect(out[0]!.entries.map(e => e.roomId)).toEqual(['401', 'pm4'])
  })

  it('沒有任何電表的子群組不產生區塊', () => {
    const out = buildSections([occupiedRoom('401', '4F', 100)], subGroups, costOf)
    expect(out).toHaveLength(1)
    expect(out[0]!.name).toBe('4樓')
  })

  it('未指定樓層的電表歸入最後一區', () => {
    const entries = [occupiedRoom('401', '4F', 100), occupiedRoom('x', '', 50)]
    const out = buildSections(entries, subGroups, costOf)
    expect(out).toHaveLength(2)
    expect(out[1]!.name).toBe('未指定樓層')
    expect(out[1]!.entries.map(e => e.roomId)).toEqual(['x'])
  })

  it('完全沒有子群組時，單一區塊且不顯示名稱', () => {
    const out = buildSections([occupiedRoom('a', '', 100)], [], costOf)
    expect(out).toHaveLength(1)
    expect(out[0]!.name).toBe('')
  })

  // 迴歸：重複的群組文件可能帶來相同的子群組 id
  it('重複的子群組 id 只渲染一次', () => {
    const out = buildSections(
      [occupiedRoom('401', '4F', 100)],
      [sg('4F', '4樓'), sg('4F', '4樓')],
      costOf,
    )
    expect(out).toHaveLength(1)
  })

  it('每個電表最多只出現在一個區塊', () => {
    const entries = [
      occupiedRoom('401', '4F', 100), occupiedRoom('501', '5F', 200), occupiedRoom('x', '', 50),
    ]
    const seen = buildSections(entries, subGroups, costOf).flatMap(s => s.entries.map(e => e.roomId))
    expect(seen).toHaveLength(new Set(seen).size)
  })

  it('空房不出現在區塊中（另於空房區塊呈現）', () => {
    const entries = [occupiedRoom('401', '4F', 100), vacantRoom('402', '4F')]
    const out = buildSections(entries, subGroups, costOf)
    expect(out[0]!.entries.map(e => e.roomId)).toEqual(['401'])
  })

  it('尚未填寫讀數的電表不計入用電與電費', () => {
    const entries = [occupiedRoom('401', '4F', 100), occupiedRoom('402', '4F', undefined)]
    const out = buildSections(entries, subGroups, costOf)
    expect(out[0]!.totalUsage).toBe(100)
    expect(out[0]!.totalCost).toBe(100)
  })

  it('區塊用電與電費為該區塊全部電表之和（含公共表）', () => {
    const entries = [
      occupiedRoom('401', '4F', 100), occupiedRoom('402', '4F', 250), publicMeter('pm4', '4F', 20),
    ]
    const out = buildSections(entries, subGroups, costOf)
    expect(out[0]!.totalUsage).toBe(370)
    expect(out[0]!.totalCost).toBe(370)
  })
})

// ---------------------------------------------------------------- 項目 11
describe('publicShare：公共電費分攤', () => {
  const subGroups = [sg('4F', '4樓')]

  it('分攤基數為子群組內全部房間數，含空房（空房份額由房東吸收）', () => {
    const entries = [
      occupiedRoom('401', '4F', 100), occupiedRoom('402', '4F', 100),
      vacantRoom('403', '4F'), publicMeter('pm4', '4F', 120),
    ]
    // 公共 120 元 ÷ 3 房（含空房）= 40，而非 ÷ 2 = 60
    expect(buildSections(entries, subGroups, costOf)[0]!.publicShare).toBe(40)
  })

  it('標記房東負擔的公共表不列入分攤', () => {
    const entries = [
      occupiedRoom('401', '4F', 100),
      publicMeter('pm4', '4F', 120, true),
    ]
    const out = buildSections(entries, subGroups, costOf)
    expect(out[0]!.publicShare).toBe(0)
    expect(out[0]!.totalCost).toBe(220) // 但仍計入該區塊總電費
  })

  it('同一子群組多顆公共表時先加總再除（取整只做一次）', () => {
    const entries = [
      occupiedRoom('401', '4F', 100), occupiedRoom('402', '4F', 100), occupiedRoom('403', '4F', 100),
      publicMeter('pmA', '4F', 10), publicMeter('pmB', '4F', 11),
    ]
    // (10 + 11) ÷ 3 = 7；若逐表取整則為 round(10/3)+round(11/3) = 3+4 = 7（此例相同）
    expect(buildSections(entries, subGroups, costOf)[0]!.publicShare).toBe(7)
  })

  it('沒有公共表時分攤為 0', () => {
    expect(buildSections([occupiedRoom('401', '4F', 100)], subGroups, costOf)[0]!.publicShare).toBe(0)
  })

  it('公共表尚未抄表時分攤為 0', () => {
    const entries = [occupiedRoom('401', '4F', 100), publicMeter('pm4', '4F', undefined)]
    expect(buildSections(entries, subGroups, costOf)[0]!.publicShare).toBe(0)
  })

  it('子群組內沒有任何房間時分攤為 0，不得除以零', () => {
    const out = buildSections([publicMeter('pm4', '4F', 120)], subGroups, costOf)
    expect(out[0]!.publicShare).toBe(0)
    expect(Number.isFinite(out[0]!.publicShare)).toBe(true)
  })
})

// ---------------------------------------------------------------- 項目 12
describe('groupProgress：抄表進度', () => {
  const entries = [
    occupiedRoom('401', '4F', 100), occupiedRoom('402', '4F', undefined),
    publicMeter('pm4', '4F', 20), vacantRoom('403', '4F'),
    entry({ roomId: 'ty', groupId: 'taoyuan', currentReading: 5 }),
  ]

  it('分母為會出帳的電表數，空房不計入', () => {
    expect(groupProgress(entries, 'g')).toEqual({ total: 3, filled: 2 })
  })

  it('只統計指定總表的電表', () => {
    expect(groupProgress(entries, 'taoyuan')).toEqual({ total: 1, filled: 1 })
  })

  it('沒有電表的總表回傳 0/0', () => {
    expect(groupProgress(entries, UNGROUPED_ID)).toEqual({ total: 0, filled: 0 })
  })

  it('讀數為 0 仍算已填寫', () => {
    expect(groupProgress([occupiedRoom('401', '4F', 0)], 'g')).toEqual({ total: 1, filled: 1 })
  })
})

describe('pendingSaveRooms：待儲存判定', () => {
  it('已鎖定的列不列入', () => {
    expect(pendingSaveRooms([entry({ currentReading: 100, isLocked: true })])).toHaveLength(0)
  })

  it('未填讀數的列不列入', () => {
    expect(pendingSaveRooms([entry({ currentReading: undefined })])).toHaveLength(0)
  })

  it('本期讀數小於上期的列不列入', () => {
    expect(pendingSaveRooms([entry({ lastReading: 500, currentReading: 100 })])).toHaveLength(0)
  })

  it('讀數等於上期（零用量）仍可儲存', () => {
    expect(pendingSaveRooms([entry({ lastReading: 500, currentReading: 500 })])).toHaveLength(1)
  })

  it('讀數為 0 且上期為 0 時可儲存', () => {
    expect(pendingSaveRooms([entry({ lastReading: 0, currentReading: 0 })])).toHaveLength(1)
  })

  it('空房與公共表同樣可儲存讀數', () => {
    const list = [vacantRoom('403', '4F'), publicMeter('pm', '4F', 20)]
    list[0]!.currentReading = 10
    expect(pendingSaveRooms(list)).toHaveLength(2)
  })
})

describe('validateReading：讀數合理性', () => {
  it('未填寫時視為有效', () => {
    expect(validateReading(entry({ currentReading: undefined, lastReading: 500 }))).toBe(true)
  })

  it('本期不小於上期時有效', () => {
    expect(validateReading(entry({ lastReading: 500, currentReading: 500 }))).toBe(true)
    expect(validateReading(entry({ lastReading: 500, currentReading: 501 }))).toBe(true)
  })

  it('本期小於上期時無效', () => {
    expect(validateReading(entry({ lastReading: 500, currentReading: 499 }))).toBe(false)
    expect(validateReading(entry({ lastReading: 500, currentReading: 0 }))).toBe(false)
  })

  it('與 pendingSaveRooms 的判定一致', () => {
    const cases = [
      entry({ lastReading: 500, currentReading: 499 }),
      entry({ lastReading: 500, currentReading: 500 }),
      entry({ lastReading: 0, currentReading: 0 }),
    ]
    for (const c of cases) {
      expect(validateReading(c)).toBe(pendingSaveRooms([c]).length === 1)
    }
  })
})
