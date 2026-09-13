/**
 * 台電帳單雙寫的對應關係。
 *
 * 登錄台電帳單會同時寫 `taipower_bills`（電費盈虧結算用）與 `bills` 的台電支出（交易清單用）。
 * 新資料兩邊互存對方 id；舊資料沒有，只能以「月份＋金額＋總表」比對，
 * 且必須恰好一筆吻合才算數 —— 同月同額的帳單可能分屬兩棟，猜錯會刪到別棟的帳。
 */
import type { TaipowerBill } from '../../components/financials/types'

export const TAIPOWER_CATEGORY = '台電帳單'

export interface TaipowerExpense {
  id?: string
  category: string
  date?: string
  amount: number
  groupId?: string
  taipowerBillId?: string
}

export const findLinkedTaipowerBill = (
  expense: TaipowerExpense,
  taipowerBills: TaipowerBill[],
): TaipowerBill | undefined => {
  if (expense.category !== TAIPOWER_CATEGORY) return undefined
  if (expense.taipowerBillId) return taipowerBills.find(b => b.id === expense.taipowerBillId)
  const month = expense.date?.slice(0, 7)
  const hits = taipowerBills.filter(b =>
    b.month === month
    && Number(b.amount) === Number(expense.amount)
    && (!expense.groupId || (b.groupId || '') === expense.groupId)
    && (!b.expenseBillId || b.expenseBillId === expense.id))
  return hits.length === 1 ? hits[0] : undefined
}
