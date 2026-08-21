/**
 * 電費盈虧分析（純函式）。
 *
 * 台電是「一個電號一張帳單」，所以盈虧必須逐總表（棟）各自結算：
 * 拿甲棟的台電帳單去對全棟的電費收入，數字沒有意義。
 *
 * 期間錨定台電帳單的「迄月」而非檢視月份 —— 台電雙月結算，迄月固定
 * 落在單月或雙月，若跟著檢視月份走，同一期會在迄月與次月被結算兩次，
 * 且次月會把下一期的電費提前算進來。
 */
import { UNGROUPED_ID } from '../../components/meter/types'
import type { TaipowerBill, ElectricityStats } from '../../components/financials/types'
import { isCollected } from './tenantGroups'

/** 電費盈虧只看得懂的帳單欄位 */
export interface ElecBill {
  type: 'income' | 'expense'
  category: string
  date?: string
  amount: number
  status?: string
  /** 所屬台電總表；生成帳單時寫入，舊資料沒有 */
  groupId?: string
  relatedTenantDocId?: string
}

export interface GroupRef {
  id: string
  name: string
}

export const UNGROUPED_LABEL = '未分組電表'
/** 尚未建立任何總表時的單一卡片標題（此時不存在「分錯棟」的問題） */
export const ALL_METERS_LABEL = '全部電表'

/** 前一個月（YYYY-MM）。跨年由 Date 自行進位。 */
export const prevMonthOf = (yearMonth: string): string => {
  const [y, m] = yearMonth.split('-').map(Number) as [number, number]
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 電費／公共電費的收入帳單 */
export const isElecIncome = (b: ElecBill) =>
  b.type === 'income' && (b.category === '電費' || b.category === '公共電費')

/**
 * 帳單歸屬的台電總表。
 *
 * 新帳單生成時直接寫 groupId；舊資料沒有，退回
 * relatedTenantDocId → 租客房號 → rooms.subGroupId → 總表 反查。
 * 任一環節斷掉即歸為未分組，不臆測。
 */
export const resolveBillGroupId = (
  bill: ElecBill,
  tenantRoom: Map<string, string>,
  roomSubGroup: Map<string, string>,
  subGroupToGroup: Map<string, string>,
): string => {
  if (bill.groupId) return bill.groupId
  const room = bill.relatedTenantDocId ? tenantRoom.get(bill.relatedTenantDocId) : undefined
  const subGroupId = room ? roomSubGroup.get(room) : undefined
  return (subGroupId && subGroupToGroup.get(subGroupId)) || UNGROUPED_ID
}

export interface ElectricityStatsInput {
  /** 目前檢視的月份（YYYY-MM） */
  viewMonth: string
  /** 台電總表（棟） */
  groups: GroupRef[]
  taipowerBills: TaipowerBill[]
  bills: ElecBill[]
  /** tenants 文件 id → 房號 */
  tenantRoom: Map<string, string>
  /** 房號 → subGroupId */
  roomSubGroup: Map<string, string>
  /** subGroupId → groupId */
  subGroupToGroup: Map<string, string>
}

/**
 * 逐總表算出電費盈虧。
 *
 * 只有一顆總表時，沒有 groupId 的舊資料（台電帳單與電費帳單）一律視為屬於它 ——
 * 這是安全的，因為不存在第二個候選。多顆總表時不臆測，歸入「未分組」卡片，
 * 寧可讓房東看到有東西沒歸位，也不要把甲棟的帳算到乙棟。
 */
export const buildElectricityStatsList = (input: ElectricityStatsInput): ElectricityStats[] => {
  const { viewMonth, groups, taipowerBills, bills, tenantRoom, roomSubGroup, subGroupToGroup } = input

  // 尚未建立任何總表：全部歸入單一張卡，行為與改版前的單卡一致
  const baseGroups: GroupRef[] = groups.length
    ? groups
    : [{ id: UNGROUPED_ID, name: ALL_METERS_LABEL }]
  const soleGroupId = baseGroups.length === 1 ? baseGroups[0]!.id : null
  const knownIds = new Set(baseGroups.map(g => g.id))

  // groupId 指向已刪除的總表時視同未標記，退回回溯／單一總表規則，
  // 免得那筆資料從所有卡片上憑空消失（與 meter/groups.ts resolveGroupId 同一原則）
  const settle = (id: string | undefined) =>
    (id && knownIds.has(id) ? id : null) ?? soleGroupId ?? UNGROUPED_ID

  const groupOfTaipower = (b: TaipowerBill) => settle(b.groupId)
  const groupOfBill = (b: ElecBill) => {
    const resolved = resolveBillGroupId(b, tenantRoom, roomSubGroup, subGroupToGroup)
    return settle(resolved === UNGROUPED_ID ? undefined : resolved)
  }

  const elecBills = bills.filter(isElecIncome)

  // 未分組卡片只在真的有東西無法歸位時才出現
  const hasUngrouped =
    !knownIds.has(UNGROUPED_ID) && (
      taipowerBills.some(b => groupOfTaipower(b) === UNGROUPED_ID) ||
      elecBills.some(b => groupOfBill(b) === UNGROUPED_ID)
    )

  const cards: GroupRef[] = hasUngrouped
    ? [...baseGroups, { id: UNGROUPED_ID, name: UNGROUPED_LABEL }]
    : [...baseGroups]

  return cards.map(group => {
    const groupTaipower = taipowerBills.filter(b => groupOfTaipower(b) === group.id)
    const groupElec = elecBills.filter(b => groupOfBill(b) === group.id)

    // 錨定「迄月 ≤ 檢視月份」中最近的一張；不倚賴查詢回傳順序
    const bill = groupTaipower
      .filter(b => b.month && b.month <= viewMonth)
      .reduce<TaipowerBill | undefined>(
        (best, b) => (!best || b.month > best.month ? b : best),
        undefined,
      )

    const anchor = bill?.month ?? viewMonth
    const prev = prevMonthOf(anchor)

    const inPeriod = groupElec.filter(
      b => b.date?.startsWith(anchor) || b.date?.startsWith(prev),
    )
    const estimated = inPeriod.reduce((s, b) => s + b.amount, 0)
    const collected = inPeriod
      .filter(b => isCollected({ status: b.status ?? '' }))
      .reduce((s, b) => s + b.amount, 0)

    return {
      groupId: group.id,
      groupName: group.name,
      periodStr: `${prev} ~ ${anchor}${anchor !== viewMonth ? '（最近一期）' : ''}`,
      estimated,
      collected,
      collectionRate: estimated > 0 ? Math.round((collected / estimated) * 100) : 0,
      taipowerBill: bill,
      profit: bill ? collected - bill.amount : 0,
      billCount: inPeriod.length,
      statusLabel: bill ? '已結算' : '等待帳單',
    }
  })
}
