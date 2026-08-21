import { describe, it, expect } from 'vitest'
import { UNGROUPED_ID } from '../../components/meter/types'
import {
  prevMonthOf,
  resolveBillGroupId,
  buildElectricityStatsList,
  UNGROUPED_LABEL,
  ALL_METERS_LABEL,
  type ElecBill,
} from './electricity'
import type { TaipowerBill } from '../../components/financials/types'

const A = { id: 'gA', name: '甲棟' }
const B = { id: 'gB', name: '乙棟' }

/** 房號 → subGroupId → groupId */
const roomSubGroup = new Map([['401', 'sgA'], ['402', 'sgA'], ['501', 'sgB']])
const subGroupToGroup = new Map([['sgA', 'gA'], ['sgB', 'gB']])
const tenantRoom = new Map([['t401', '401'], ['t402', '402'], ['t501', '501']])

const elec = (
  date: string,
  amount: number,
  status: string,
  extra: Partial<ElecBill> = {},
): ElecBill => ({ type: 'income', category: '電費', date, amount, status, ...extra })

const tp = (month: string, amount: number, groupId?: string): TaipowerBill =>
  ({ id: `tp-${month}-${groupId ?? 'x'}`, month, amount, usage: 0, groupId }) as TaipowerBill

const run = (
  viewMonth: string,
  groups: { id: string; name: string }[],
  taipowerBills: TaipowerBill[],
  bills: ElecBill[],
) =>
  buildElectricityStatsList({
    viewMonth, groups, taipowerBills, bills,
    tenantRoom, roomSubGroup, subGroupToGroup,
  })

describe('prevMonthOf', () => {
  it('一般月份退一個月', () => {
    expect(prevMonthOf('2026-08')).toBe('2026-07')
  })
  it('跨年退到前一年 12 月', () => {
    expect(prevMonthOf('2026-01')).toBe('2025-12')
  })
})

describe('resolveBillGroupId', () => {
  it('帳單自帶 groupId 時直接採用', () => {
    const b = elec('2026-07-05', 100, 'completed', { groupId: 'gB', relatedTenantDocId: 't401' })
    expect(resolveBillGroupId(b, tenantRoom, roomSubGroup, subGroupToGroup)).toBe('gB')
  })

  it('舊資料靠 租客 → 房號 → 子群組 回溯', () => {
    const b = elec('2026-07-05', 100, 'completed', { relatedTenantDocId: 't501' })
    expect(resolveBillGroupId(b, tenantRoom, roomSubGroup, subGroupToGroup)).toBe('gB')
  })

  it('反查鏈任一環節斷掉即歸未分組，不臆測', () => {
    const noTenant = elec('2026-07-05', 100, 'completed')
    expect(resolveBillGroupId(noTenant, tenantRoom, roomSubGroup, subGroupToGroup)).toBe(UNGROUPED_ID)

    const unknownTenant = elec('2026-07-05', 100, 'completed', { relatedTenantDocId: 'ghost' })
    expect(resolveBillGroupId(unknownTenant, tenantRoom, roomSubGroup, subGroupToGroup)).toBe(UNGROUPED_ID)

    const roomWithoutSubGroup = elec('2026-07-05', 100, 'completed', { relatedTenantDocId: 't999' })
    expect(resolveBillGroupId(roomWithoutSubGroup, tenantRoom, roomSubGroup, subGroupToGroup)).toBe(UNGROUPED_ID)
  })
})

describe('buildElectricityStatsList - 期間錨定台電帳單迄月', () => {
  const bills = [
    elec('2026-06-05', 1000, 'completed', { groupId: 'gA' }),
    elec('2026-07-05', 1200, 'completed', { groupId: 'gA' }),
    elec('2026-07-05', 900, 'pending', { groupId: 'gA' }),
    elec('2026-08-05', 1500, 'pending', { groupId: 'gA' }),
  ]
  const taipower = [tp('2026-07', 3000, 'gA')]

  it('迄月當月：區間為前月~迄月，盈虧＝已收－台電', () => {
    const [a] = run('2026-07', [A], taipower, bills)
    expect(a!.periodStr).toBe('2026-06 ~ 2026-07')
    expect(a!.estimated).toBe(3100)
    expect(a!.collected).toBe(2200)
    expect(a!.profit).toBe(2200 - 3000)
    expect(a!.statusLabel).toBe('已結算')
  })

  it('迄月的次月：沿用同一期，數字與迄月當月完全一致（不重複結算）', () => {
    const [jul] = run('2026-07', [A], taipower, bills)
    const [aug] = run('2026-08', [A], taipower, bills)
    expect(aug!.periodStr).toBe('2026-06 ~ 2026-07（最近一期）')
    expect(aug!.estimated).toBe(jul!.estimated)
    expect(aug!.collected).toBe(jul!.collected)
    expect(aug!.profit).toBe(jul!.profit)
  })

  it('不會把尚未結算的次月電費提前算進來', () => {
    const [aug] = run('2026-08', [A], taipower, bills)
    expect(aug!.billCount).toBe(3) // 06 一筆 + 07 兩筆，不含 08
  })

  it('檢視月份早於任何帳單迄月時不抓未來帳單，維持等待帳單', () => {
    const [jun] = run('2026-06', [A], taipower, bills)
    expect(jun!.taipowerBill).toBeUndefined()
    expect(jun!.statusLabel).toBe('等待帳單')
    expect(jun!.periodStr).toBe('2026-05 ~ 2026-06')
    expect(jun!.profit).toBe(0)
  })

  it('完全沒有台電帳單時退回以檢視月份為準', () => {
    const [a] = run('2026-08', [A], [], bills)
    expect(a!.periodStr).toBe('2026-07 ~ 2026-08')
    expect(a!.statusLabel).toBe('等待帳單')
  })

  it('回收率依區間內金額計算', () => {
    const [a] = run('2026-07', [A], taipower, bills)
    expect(a!.collectionRate).toBe(Math.round((2200 / 3100) * 100))
  })
})

describe('buildElectricityStatsList - 逐棟結算', () => {
  const bills = [
    elec('2026-07-05', 1000, 'completed', { groupId: 'gA' }),
    elec('2026-07-05', 400, 'completed', { groupId: 'gB' }),
  ]
  const taipower = [tp('2026-07', 3000, 'gA'), tp('2026-07', 500, 'gB')]

  it('每棟各自拿自己的台電帳單對自己的電費收入', () => {
    const list = run('2026-07', [A, B], taipower, bills)
    expect(list).toHaveLength(2)

    const a = list.find(x => x.groupId === 'gA')!
    expect(a.groupName).toBe('甲棟')
    expect(a.collected).toBe(1000)
    expect(a.taipowerBill!.amount).toBe(3000)
    expect(a.profit).toBe(-2000)

    const b = list.find(x => x.groupId === 'gB')!
    expect(b.collected).toBe(400)
    expect(b.taipowerBill!.amount).toBe(500)
    expect(b.profit).toBe(-100)
  })

  it('甲棟的台電帳單不會被套到乙棟', () => {
    const list = run('2026-07', [A, B], [tp('2026-07', 3000, 'gA')], bills)
    const b = list.find(x => x.groupId === 'gB')!
    expect(b.taipowerBill).toBeUndefined()
    expect(b.statusLabel).toBe('等待帳單')
    expect(b.profit).toBe(0)
  })

  it('不變量：各棟電費收入相加等於全部可歸屬的電費收入', () => {
    const list = run('2026-07', [A, B], taipower, bills)
    const sum = list.reduce((s, x) => s + x.estimated, 0)
    expect(sum).toBe(1400)
  })
})

describe('buildElectricityStatsList - 舊資料相容', () => {
  it('只有一顆總表時，沒有 groupId 的舊台電帳單視為屬於它', () => {
    const bills = [elec('2026-07-05', 1000, 'completed', { relatedTenantDocId: 't401' })]
    const [a] = run('2026-07', [A], [tp('2026-07', 800)], bills)
    expect(a!.taipowerBill!.amount).toBe(800)
    expect(a!.profit).toBe(200)
    expect(a!.groupId).toBe('gA')
  })

  it('只有一顆總表時，無法回溯歸屬的舊電費帳單也歸給它，不另開未分組卡', () => {
    const orphan = [elec('2026-07-05', 700, 'completed')]
    const list = run('2026-07', [A], [tp('2026-07', 500)], orphan)
    expect(list).toHaveLength(1)
    expect(list[0]!.collected).toBe(700)
  })

  it('多顆總表時不臆測，無 groupId 的舊資料落到未分組卡', () => {
    const bills = [
      elec('2026-07-05', 1000, 'completed', { groupId: 'gA' }),
      elec('2026-07-05', 700, 'completed'), // 無從歸屬
    ]
    const list = run('2026-07', [A, B], [tp('2026-07', 3000, 'gA'), tp('2026-07', 200)], bills)

    const ungrouped = list.find(x => x.groupId === UNGROUPED_ID)!
    expect(ungrouped).toBeDefined()
    expect(ungrouped.groupName).toBe(UNGROUPED_LABEL)
    expect(ungrouped.collected).toBe(700)
    expect(ungrouped.taipowerBill!.amount).toBe(200)

    // 甲棟不受未分組資料污染
    const a = list.find(x => x.groupId === 'gA')!
    expect(a.collected).toBe(1000)
    expect(a.taipowerBill!.amount).toBe(3000)
  })

  it('沒有東西無法歸位時不產生未分組卡', () => {
    const bills = [elec('2026-07-05', 1000, 'completed', { groupId: 'gA' })]
    const list = run('2026-07', [A, B], [tp('2026-07', 3000, 'gA')], bills)
    expect(list.map(x => x.groupId)).toEqual(['gA', 'gB'])
  })
})

describe('buildElectricityStatsList - 帳單篩選', () => {
  it('只計電費與公共電費的收入，支出與其他類別不算', () => {
    const bills: ElecBill[] = [
      elec('2026-07-05', 1000, 'completed', { groupId: 'gA' }),
      elec('2026-07-05', 300, 'completed', { groupId: 'gA', category: '公共電費' }),
      elec('2026-07-05', 9999, 'completed', { groupId: 'gA', category: '租金收入' }),
      elec('2026-07-15', 5000, 'completed', { groupId: 'gA', type: 'expense', category: '台電帳單' }),
    ]
    const [a] = run('2026-07', [A], [tp('2026-07', 1000, 'gA')], bills)
    expect(a!.estimated).toBe(1300)
    expect(a!.billCount).toBe(2)
  })

  it('paid 為早期已收寫法，也要算進實收', () => {
    const bills = [elec('2026-07-05', 500, 'paid', { groupId: 'gA' })]
    const [a] = run('2026-07', [A], [tp('2026-07', 100, 'gA')], bills)
    expect(a!.collected).toBe(500)
  })
})

describe('buildElectricityStatsList - 尚未建立總表 / 總表被刪', () => {
  it('完全沒有總表時只出一張卡，且不叫「未分組」', () => {
    const bills = [elec('2026-07-05', 1000, 'completed', { relatedTenantDocId: 't401' })]
    const list = run('2026-07', [], [tp('2026-07', 800)], bills)
    expect(list).toHaveLength(1)
    expect(list[0]!.groupName).toBe(ALL_METERS_LABEL)
    expect(list[0]!.collected).toBe(1000)
    expect(list[0]!.taipowerBill!.amount).toBe(800)
    expect(list[0]!.profit).toBe(200)
  })

  it('groupId 指向已刪除的總表時，資料不會憑空消失', () => {
    const bills = [
      elec('2026-07-05', 1000, 'completed', { groupId: 'gA' }),
      elec('2026-07-05', 600, 'completed', { groupId: 'gDeleted' }),
    ]
    const taipower = [tp('2026-07', 3000, 'gA'), tp('2026-07', 400, 'gDeleted')]
    const list = run('2026-07', [A, B], taipower, bills)

    const total = list.reduce((sum, x) => sum + x.estimated, 0)
    expect(total).toBe(1600)

    const ungrouped = list.find(x => x.groupId === UNGROUPED_ID)!
    expect(ungrouped.collected).toBe(600)
    expect(ungrouped.taipowerBill!.amount).toBe(400)
  })

  it('單一總表 + groupId 指向已刪除的總表時，退回歸給唯一那顆', () => {
    const bills = [elec('2026-07-05', 900, 'completed', { groupId: 'gDeleted' })]
    const list = run('2026-07', [A], [tp('2026-07', 500, 'gDeleted')], bills)
    expect(list).toHaveLength(1)
    expect(list[0]!.groupId).toBe('gA')
    expect(list[0]!.collected).toBe(900)
    expect(list[0]!.profit).toBe(400)
  })
})
