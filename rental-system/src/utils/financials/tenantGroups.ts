/**
 * 帳務管理「依租客」檢視的分組規則（純函式）。
 *
 * 收款時關心的是「這位租客繳了沒」，而非逐筆帳單；分組僅為顯示層，
 * 收款狀態仍逐筆儲存於各自的 bills 文件。
 */

/** 無法歸戶者（支出、台電帳單、未指定對象）集中於此組 */
export const OTHER_GROUP = '__other__'
export const OTHER_GROUP_LABEL = '其他（支出・台電帳單）'

export interface GroupableBill {
  id: string
  type: 'income' | 'expense'
  amount: number
  status: string
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
  /** 尚未收款的收入金額 */
  unpaid: number
  unpaidCount: number
  allCollected: boolean
}

/** 已收款：completed 為現行寫法，paid 為早期資料 */
export const isCollected = (b: Pick<GroupableBill, 'status'>) =>
  b.status === 'completed' || b.status === 'paid'

/**
 * 歸戶鍵。優先用 relatedTenantDocId（自動生成與新版手動帳單皆有），
 * 退回 tenantId、再退回 target 字串（早期手動帳單只有這個）。
 */
export const groupKeyOf = (b: GroupableBill) =>
  b.type === 'expense'
    ? OTHER_GROUP
    : (b.relatedTenantDocId || b.tenantId || b.target || OTHER_GROUP)

/**
 * 依租客彙總。待收的租客排前面，方便由上而下逐一收款；
 * 「其他」一律置底。
 */
export const buildTenantGroups = <T extends GroupableBill>(bills: T[]): TenantGroup<T>[] => {
  const map = new Map<string, TenantGroup<T>>()

  for (const b of bills) {
    const key = groupKeyOf(b)
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: key === OTHER_GROUP ? OTHER_GROUP_LABEL : (b.target || '未指定對象'),
        items: [], total: 0, unpaid: 0, unpaidCount: 0, allCollected: true,
      })
    }
    const g = map.get(key)!
    g.items.push(b)
    g.total += b.type === 'income' ? b.amount : -b.amount
    if (b.type === 'income' && !isCollected(b)) {
      g.unpaid += b.amount
      g.unpaidCount++
      g.allCollected = false
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.key === OTHER_GROUP) return 1
    if (b.key === OTHER_GROUP) return -1
    if (a.allCollected !== b.allCollected) return a.allCollected ? 1 : -1
    return a.label.localeCompare(b.label)
  })
}

/** 該組中尚未收款的收入帳單，供批次標記收款 */
export const uncollectedIncome = <T extends GroupableBill>(group: TenantGroup<T>): T[] =>
  group.items.filter(b => b.type === 'income' && !isCollected(b))
