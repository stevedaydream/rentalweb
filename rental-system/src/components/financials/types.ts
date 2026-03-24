export interface TaipowerBill {
  id: string
  month: string
  amount: number
  usage: number
  landlordId?: string
}

export interface ElectricityStats {
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
}

export interface TaipowerForm {
  month: string
  amount: number | undefined
  usage: number | undefined
}

export const statusLabels: Record<string, string> = {
  completed: '已結清',
  pending: '待收款',
  overdue: '逾期',
}

export const statusStyles: Record<string, string> = {
  completed: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  pending: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  overdue: 'text-red-600 bg-red-50 dark:bg-red-900/20',
}

export const statusIcons: Record<string, string> = {
  completed: 'check_circle',
  pending: 'schedule',
  overdue: 'warning',
}
