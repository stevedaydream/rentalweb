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

/** 已收款：completed 為現行寫法，paid 為早期資料 */
export const isCollected = (b: Pick<PayableBill, 'status'>) =>
  b.status === 'completed' || b.status === 'paid'

const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))

/** 已收金額。已結清者一律視為全額（舊資料沒有 paidAmount） */
export const collectedOf = (b: Pick<PayableBill, 'amount' | 'status' | 'paidAmount'>): number => {
  const amount = num(b.amount)
  if (isCollected(b)) return amount
  return Math.min(amount, num(b.paidAmount))
}

/** 尚欠金額；支出恆為 0 */
export const outstandingOf = (b: Pick<PayableBill, 'type' | 'amount' | 'status' | 'paidAmount'>): number =>
  b.type === 'expense' ? 0 : num(b.amount) - collectedOf(b)

/** 繳了一部分但還沒繳清 */
export const isPartial = (b: Pick<PayableBill, 'amount' | 'status' | 'paidAmount'>) =>
  !isCollected(b) && collectedOf(b) > 0

const CATEGORY_ORDER: Record<string, number> = { '租金收入': 0, '水費': 1, '電費': 2, '公共電費': 3 }

/** 帳齡排序：帳單日期 → 截止日 → 同一天租金先於電費 */
export const byAge = (a: PayableBill, b: PayableBill) =>
  (a.date || '').localeCompare(b.date || '') ||
  (a.dueDate || '').localeCompare(b.dueDate || '') ||
  (CATEGORY_ORDER[a.category ?? ''] ?? 9) - (CATEGORY_ORDER[b.category ?? ''] ?? 9)

export interface Allocation {
  billId: string
  apply: number
  /** 這筆扣完後是否繳清 */
  settles: boolean
}

export interface AllocationResult {
  allocations: Allocation[]
  /** 扣完所有未繳仍剩下的錢（溢繳，轉預收餘額） */
  leftover: number
}

/**
 * 把一筆收款分配到未繳帳單上：由最舊的開始扣。
 *
 * preferCategory：房東手動登記收款時選的類別先扣（標了「電費」就先沖電費），
 * 其餘再依帳齡。
 */
export const allocatePayment = (
  bills: PayableBill[],
  amount: number,
  opts: { preferCategory?: string } = {},
): AllocationResult => {
  const open = bills.filter(b => outstandingOf(b) > 0).sort(byAge)
  const pref = opts.preferCategory
  const ordered = pref
    ? [...open.filter(b => b.category === pref), ...open.filter(b => b.category !== pref)]
    : open

  let left = num(amount)
  const allocations: Allocation[] = []
  for (const b of ordered) {
    if (left <= 0) break
    const due = outstandingOf(b)
    const apply = Math.min(due, left)
    allocations.push({ billId: b.id, apply, settles: apply === due })
    left -= apply
  }
  return { allocations, leftover: left }
}

/**
 * 收一筆款後帳單應寫回的欄位（payments 由呼叫端以 arrayUnion 附加）。
 *
 * 繳清 → completed。未繳清者若原為待確認（租客傳過截圖），
 * 截圖已經處理過了，依截止日退回待收或逾期。
 */
export const paymentUpdate = (b: PayableBill, apply: number, paidDate: string, today: string) => {
  const amount = num(b.amount)
  const paid = Math.min(amount, collectedOf(b) + num(apply))
  if (paid >= amount) return { paidAmount: amount, status: 'completed', paidAt: paidDate }
  const overdue = !!b.dueDate && b.dueDate < today
  return { paidAmount: paid, status: overdue ? 'overdue' : 'pending' }
}

/** 組一筆收款紀錄。Firestore 不接受 undefined 欄位，沒有備註就不帶 note */
export const paymentEntry = (
  amount: number, date: string, source: PaymentEntry['source'], note?: string,
): PaymentEntry => {
  const e: PaymentEntry = { amount: num(amount), date, source, at: new Date().toISOString() }
  if (note?.trim()) e.note = note.trim()
  return e
}

/**
 * 以預收餘額沖抵新開的帳單（依傳入順序，呼叫端先把租金排在前面）。
 * 回傳每筆沖抵額與沖抵後剩下的餘額。
 */
export const applyCredit = (amounts: number[], credit: number) => {
  let left = num(credit)
  const applied = amounts.map(a => {
    const x = Math.min(num(a), left)
    left -= x
    return x
  })
  return { applied, remaining: left }
}

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
