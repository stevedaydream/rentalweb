/**
 * 帳務管理「依租客」檢視的分組規則（純函式）。
 *
 * 收款時關心的是「這位租客繳了沒」，而非逐筆帳單；分組僅為顯示層，
 * 收款狀態仍逐筆儲存於各自的 bills 文件。
 */
import { isCollected, outstandingOf, byAge } from './payments'

export { isCollected }

/** 無法歸戶者（支出、台電帳單、未指定對象）集中於此組 */
export const OTHER_GROUP = '__other__'
export const OTHER_GROUP_LABEL = '其他（支出・台電帳單）'

export interface GroupableBill {
  id: string
  type: 'income' | 'expense'
  amount: number
  status: string
  paidAmount?: number
  date?: string
  dueDate?: string
  category?: string
  target?: string
  tenantId?: string
  relatedTenantDocId?: string
}

export interface TenantGroup<T extends GroupableBill = GroupableBill> {
  key: string
  label: string
  items: T[]
  /** 收入計正、支出計負 */
  total: number
  /** 本月尚未收到的金額（部分付款者只計剩餘） */
  unpaid: number
  unpaidCount: number
  allCollected: boolean
  /** 本月以前還沒繳清的帳單（依帳齡排序） */
  prior: T[]
  priorOutstanding: number
  /** 本月待收＋前期未繳 */
  owed: number
}

/**
 * 歸戶鍵。優先用 relatedTenantDocId（自動生成與新版手動帳單皆有），
 * 退回 tenantId、再退回 target 字串（早期手動帳單只有這個）。
 */
export const groupKeyOf = (b: GroupableBill) =>
  b.type === 'expense'
    ? OTHER_GROUP
    : (b.relatedTenantDocId || b.tenantId || b.target || OTHER_GROUP)

/**
 * 依租客彙總。欠錢的租客（含前期未繳）排前面，方便由上而下逐一收款；
 * 「其他」一律置底。
 *
 * @param prior 本月以前的未繳帳單。只出現在前期、本月沒有帳單的租客也會成組，
 *              否則上個月欠租、這個月還沒出帳的人會從畫面上消失
 */
export const buildTenantGroups = <T extends GroupableBill>(bills: T[], prior: T[] = []): TenantGroup<T>[] => {
  const map = new Map<string, TenantGroup<T>>()
  const ensure = (b: T) => {
    const key = groupKeyOf(b)
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: key === OTHER_GROUP ? OTHER_GROUP_LABEL : (b.target || '未指定對象'),
        items: [], total: 0, unpaid: 0, unpaidCount: 0, allCollected: true,
        prior: [], priorOutstanding: 0, owed: 0,
      })
    }
    return map.get(key)!
  }

  for (const b of bills) {
    const g = ensure(b)
    g.items.push(b)
    g.total += b.type === 'income' ? b.amount : -b.amount
    if (b.type === 'income' && !isCollected(b)) {
      g.unpaid += outstandingOf(b)
      g.unpaidCount++
      g.allCollected = false
    }
  }

  for (const b of prior) {
    if (b.type !== 'income' || outstandingOf(b) <= 0) continue
    const g = ensure(b)
    g.prior.push(b)
    g.priorOutstanding += outstandingOf(b)
  }

  for (const g of map.values()) {
    g.prior.sort(byAge)
    g.owed = g.unpaid + g.priorOutstanding
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.key === OTHER_GROUP) return 1
    if (b.key === OTHER_GROUP) return -1
    if ((a.owed > 0) !== (b.owed > 0)) return a.owed > 0 ? -1 : 1
    return a.label.localeCompare(b.label)
  })
}

/** 該組中尚未收款的收入帳單（前期在前、本月在後），供批次收款 */
export const uncollectedIncome = <T extends GroupableBill>(group: TenantGroup<T>): T[] => [
  ...group.prior,
  ...group.items.filter(b => b.type === 'income' && !isCollected(b)),
]
