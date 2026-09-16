export interface TaipowerBill {
  id: string
  month: string
  amount: number
  usage: number
  landlordId?: string
  /** 所屬台電總表（棟）。台電按電號寄帳單，故逐總表歸屬；舊資料可能沒有 */
  groupId?: string
  /** 對應交易清單的台電支出（bills）；舊資料沒有 */
  expenseBillId?: string
}

export interface ElectricityStats {
  groupId: string
  groupName: string
  periodStr: string
  estimated: number
  collected: number
  collectionRate: number
  taipowerBill: TaipowerBill | undefined
  profit: number
  billCount: number
  statusLabel: string
}

export interface TransactionHistory {
  modifiedAt: string
  data: any
}

export interface TransactionForm {
  type: 'income' | 'expense'
  amount: number | undefined
  date: string
  category: string
  target: string
  description: string
  status: 'completed' | 'pending' | 'overdue'
  // 從下拉選單挑到租客時填入，讓手動新增的帳單能與自動生成的一樣正確歸戶
  relatedTenantDocId?: string
  tenantId?: string | null
  /** 手動新增電費時依租客房號推得，電費盈虧才歸得到棟 */
  groupId?: string
  /** 台電支出對應的 taipower_bills；刪除與編輯時同步 */
  taipowerBillId?: string
  /** 支出所屬建物（如屋頂防水工程）；年度損益依此歸棟 */
  propertyId?: string
}

export interface TaipowerForm {
  month: string
  amount: number | undefined
  usage: number | undefined
  groupId: string
}

export const statusLabels: Record<string, string> = {
  completed: '已結清',
  pending: '待收款',
  overdue: '逾期',
  waiting_confirmation: '待確認',
}

export const statusStyles: Record<string, string> = {
  completed: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  pending: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  overdue: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  waiting_confirmation: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
}

export const statusIcons: Record<string, string> = {
  completed: 'check_circle',
  pending: 'schedule',
  overdue: 'warning',
  waiting_confirmation: 'hourglass_top',
}
