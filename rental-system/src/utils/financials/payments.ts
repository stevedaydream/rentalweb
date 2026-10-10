/**
 * 收款規則（純函式）：部分付款、依帳齡沖銷、預收餘額、改繳費方式重新出帳。
 *
 * 帳單 status 維持原本四態（pending／overdue／waiting_confirmation／completed），
 * 部分付款只是多記一個 paidAmount —— 若另開 partial 狀態，前後端十幾處以
 * `status in [pending, overdue]` 撈未繳的查詢（LINE 查帳單、催繳、退租結算…）
 * 會全部漏掉繳了一半的帳單。
 */
import {
  rentCoverage, rebillRent, type BillingTenant, type RentBillLike,
} from '../meter/billing'

export interface PayableBill {
  id: string
  type: 'income' | 'expense'
  amount: number
  status: string
  /** 已收金額；舊資料沒有此欄位 */
  paidAmount?: number
  date?: string
  dueDate?: string
  category?: string
}

/** 單次收款紀錄，逐筆附在帳單的 payments 陣列 */
export interface PaymentEntry {
  amount: number
  /** 收款日 YYYY-MM-DD */
  date: string
  /** manual＝房東登記收款；credit＝預收餘額沖抵 */
  source: 'manual' | 'credit'
  note?: string
  /** 記錄時間（ISO）；陣列元素內不能用 serverTimestamp */
  at: string
}

export interface Allocation { billId: string; apply: number; settles: boolean }
export interface AllocationResult { allocations: Allocation[]; leftover: number }

export { isCollected, collectedOf, outstandingOf, isPartial, byAge, allocatePayment, paymentUpdate, paymentEntry, applyCredit } from '../../../functions/billing/payments.mjs'
import { collectedOf, outstandingOf } from '../../../functions/billing/payments.mjs'
const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))

// --- 改繳費方式後重新出帳 ---

export interface RebillItem<T> {
  bill: T
  amount: number
  description: string
  coverFrom: string
  coverTo: string
  /** 此帳單已收的錢 */
  collected: number
  /** 改完後已收的錢足以繳清 */
  settles: boolean
  /** 改完後已收超過新金額的部分（轉預收餘額） */
  excess: number
}

/**
 * 改了繳費方式（或租金）後，哪些尚未繳清的租金單要跟著改成新週期的一期。
 *
 * - 已繳清的不動：季繳單繳清了，剩下的月份本來就是預繳，涵蓋期滿後自然接月繳
 * - 涵蓋期已經過去的舊帳不動：那是當時的約定
 * - 改完會與其他租金單的涵蓋期重疊者不動（例如月繳改季繳，但下個月的單已經開了），
 *   否則重疊的月份會收兩次
 */
export const planRebills = <T extends PayableBill & RentBillLike>(
  tenant: BillingTenant,
  rentBills: T[],
  currentMonth: string,
): RebillItem<T>[] => {
  const items: RebillItem<T>[] = []
  for (const b of rentBills) {
    if (b.type !== 'income' || outstandingOf(b) <= 0) continue
    // 退租末期按日計租的單是依實際天數算的，不能改回整期
    if (b.prorated) continue
    const cur = rentCoverage(b)
    const plan = rebillRent(tenant, b)
    if (!cur || !plan || cur.to < currentMonth) continue
    if (plan.coverTo === cur.to && plan.amount === num(b.amount)) continue

    const overlaps = rentBills.some(o => {
      if (o.id === b.id) return false
      const c = rentCoverage(o)
      return !!c && c.from <= plan.coverTo && plan.coverFrom <= c.to
    })
    if (overlaps) continue

    const collected = collectedOf(b)
    items.push({
      bill: b,
      ...plan,
      collected,
      settles: collected >= plan.amount,
      excess: Math.max(0, collected - plan.amount),
    })
  }
  return items
}
