/**
 * 延後收款（純函式）。
 *
 * 房東同意租客晚點繳：把截止日改成新的收款日，原截止日另存 originalDueDate。
 * 新收款日（含當天）之前不算逾期、不算前期欠款，另列「延後收款」；
 * 過了新收款日仍未繳，就回到一般逾期。每次延後都寫入 history 留紀錄。
 */
import { outstandingOf, type PayableBill } from './payments'

export interface DeferrableBill extends PayableBill {
  dueDate?: string
  deferredUntil?: string
  originalDueDate?: string
  history?: { modifiedAt: string; data: any; note?: string }[]
}

/** 延後中：有約定的新收款日且尚未過期，帳單仍有未收金額 */
export const isDeferred = (b: DeferrableBill, today: string) =>
  b.type === 'income' && !!b.deferredUntil && b.deferredUntil >= today && outstandingOf(b) > 0

/** 可以延後的帳單：尚未收清的收入，且不是租客已上傳截圖等你確認的 */
export const canDefer = (b: DeferrableBill) =>
  b.type === 'income' && (b.status === 'pending' || b.status === 'overdue') && outstandingOf(b) > 0

/**
 * 延後後要寫回帳單的欄位。逾期的帳單改回待收；原截止日只記第一次，
 * 之後再延幾次都看得到最初約定的日期。
 */
export const deferUpdate = (b: DeferrableBill & { id?: string }, until: string, reason: string, now: string) => {
  const snapshot: Record<string, any> = { ...b }
  delete snapshot.history
  delete snapshot.id
  const note = `延後收款：${b.dueDate || '未設定'} → ${until}${reason ? `（${reason}）` : ''}`
  return {
    dueDate: until,
    deferredUntil: until,
    originalDueDate: b.originalDueDate || b.dueDate || '',
    status: 'pending' as const,
    history: [{ modifiedAt: now, note, data: snapshot }, ...(b.history || [])],
  }
}
