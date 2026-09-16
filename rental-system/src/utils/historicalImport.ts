/**
 * 歷史資料遷移（已退租租客、歷史帳單與逐筆付款）：驗證並規劃寫入（純函式）。
 *
 * 歷史資料只供查詢，不可觸發營運流程：
 * - 未繳清的歷史帳單狀態為 `archived`（歷史未結），不會出現在前期欠款、自動逾期或 LINE 欠費查詢
 *   （這些都只撈 pending／overdue／waiting_confirmation）
 * - 歷史租客不帶 room／roomId，出帳與電費不會把他們當成該房的住戶
 * - 以舊系統鍵比對已匯入的資料，同一份檔案重複匯入會被擋下
 */
import { cellNumber, cellText, isRealDate } from './importCells'
import { IMPORT_BILL_CATEGORIES, importKey, type ImportWrite } from './landlordImport'

export interface HistoricalTenantRow { legacyTenantKey: string; name: string; legacyRoomKey?: string; moveOutDate?: string; phone?: string }
export interface HistoricalBillRow { legacyBillKey: string; legacyTenantKey?: string; date: string; dueDate: string; category: string; amount: unknown; description?: string }
export interface HistoricalPaymentRow { legacyPaymentKey: string; legacyBillKey: string; date: string; amount: unknown; method?: string; note?: string }
export interface HistoricalImportInput { tenants: HistoricalTenantRow[]; bills: HistoricalBillRow[]; payments: HistoricalPaymentRow[] }

export interface HistoricalExisting {
  /** 已匯入過的舊租客鍵、舊帳單鍵、舊付款鍵 */
  tenantKeys?: string[]
  billKeys?: string[]
  paymentKeys?: string[]
  /** 目前的房間，舊房間鍵與房號相符時帳單可歸到該房與建物 */
  rooms?: { id: string; name: string; propertyId?: string }[]
}

export interface PlannedHistoricalTenant {
  legacyTenantKey: string; name: string; phone: string; legacyRoomKey: string; moveOutDate: string
}
export interface PlannedHistoricalBill {
  legacyBillKey: string; legacyTenantKey: string; date: string; dueDate: string; category: string
  amount: number; description: string; roomId: string; propertyId: string
  payments: { legacyPaymentKey: string; amount: number; date: string; note: string }[]
}
export interface HistoricalImportPlan {
  tenants: PlannedHistoricalTenant[]
  bills: PlannedHistoricalBill[]
  summary: { tenants: number; bills: number; payments: number; unsettled: number }
}

/** 舊系統鍵比對：去空白、不分大小寫 */
export const legacyKey = (value: unknown) => cellText(value).replace(/\s/g, '').toUpperCase()

const positiveWhole = (value: unknown) => {
  const n = cellNumber(value)
  return n !== null && Number.isSafeInteger(n) && n > 0 ? n : 0
}

export const buildHistoricalImportPlan = (
  input: HistoricalImportInput, existing: HistoricalExisting = {},
): { errors: string[]; plan?: HistoricalImportPlan } => {
  const errors: string[] = []
  const at = (sheet: string, i: number) => `${sheet}第 ${i + 2} 列`
  const oldTenants = new Set((existing.tenantKeys ?? []).map(legacyKey))
  const oldBills = new Set((existing.billKeys ?? []).map(legacyKey))
  const oldPayments = new Set((existing.paymentKeys ?? []).map(legacyKey))
  const roomByKey = new Map((existing.rooms ?? []).map(r => [importKey(r.name), r]))

  const tenants = new Map<string, PlannedHistoricalTenant>()
  ;(input.tenants ?? []).forEach((row, i) => {
    const key = legacyKey(row.legacyTenantKey); const name = cellText(row.name); const moveOutDate = cellText(row.moveOutDate)
    if (!key) { errors.push(`${at('歷史租客', i)}：舊租客鍵為必填`); return }
    if (tenants.has(key)) errors.push(`${at('歷史租客', i)}：舊租客鍵「${key}」重複`)
    if (oldTenants.has(key)) errors.push(`${at('歷史租客', i)}：舊租客鍵「${key}」已匯入過`)
    if (!name) errors.push(`${at('歷史租客', i)}：姓名為必填`)
    if (moveOutDate && !isRealDate(moveOutDate)) errors.push(`${at('歷史租客', i)}：退租日必須是有效日期`)
    tenants.set(key, { legacyTenantKey: key, name, phone: cellText(row.phone), legacyRoomKey: cellText(row.legacyRoomKey), moveOutDate })
  })

  const paymentsByBill = new Map<string, PlannedHistoricalBill['payments']>()
  const paymentKeys = new Set<string>()
  ;(input.payments ?? []).forEach((row, i) => {
    const key = legacyKey(row.legacyPaymentKey); const billKey = legacyKey(row.legacyBillKey)
    const amount = positiveWhole(row.amount); const date = cellText(row.date)
    if (!key) errors.push(`${at('歷史付款', i)}：舊付款鍵為必填`)
    else if (paymentKeys.has(key)) errors.push(`${at('歷史付款', i)}：舊付款鍵「${key}」重複`)
    else if (oldPayments.has(key)) errors.push(`${at('歷史付款', i)}：舊付款鍵「${key}」已匯入過`)
    paymentKeys.add(key)
    if (!billKey) errors.push(`${at('歷史付款', i)}：舊帳單鍵為必填`)
    if (!amount) errors.push(`${at('歷史付款', i)}：金額必須是正整數`)
    if (!isRealDate(date)) errors.push(`${at('歷史付款', i)}：付款日必須是有效日期`)
    const note = [cellText(row.method), cellText(row.note)].filter(Boolean).join('・')
    paymentsByBill.set(billKey, [...(paymentsByBill.get(billKey) ?? []), { legacyPaymentKey: key, amount, date, note }])
  })

  const bills = new Map<string, PlannedHistoricalBill>()
  ;(input.bills ?? []).forEach((row, i) => {
    const key = legacyKey(row.legacyBillKey); const tenantKey = legacyKey(row.legacyTenantKey)
    const date = cellText(row.date); const dueDate = cellText(row.dueDate); const category = cellText(row.category)
    const amount = positiveWhole(row.amount)
    if (!key) { errors.push(`${at('歷史帳單', i)}：舊帳單鍵為必填`); return }
    if (bills.has(key)) errors.push(`${at('歷史帳單', i)}：舊帳單鍵「${key}」重複`)
    if (oldBills.has(key)) errors.push(`${at('歷史帳單', i)}：舊帳單鍵「${key}」已匯入過`)
    if (!isRealDate(date) || !isRealDate(dueDate)) errors.push(`${at('歷史帳單', i)}：帳單日與到期日必須是有效日期`)
    if (!(IMPORT_BILL_CATEGORIES as readonly string[]).includes(category)) {
      errors.push(`${at('歷史帳單', i)}：類別「${category}」無法辨識，請填 ${IMPORT_BILL_CATEGORIES.join('、')}`)
    }
    if (!amount) errors.push(`${at('歷史帳單', i)}：金額必須是正整數`)
    if (tenantKey && !tenants.has(tenantKey)) errors.push(`${at('歷史帳單', i)}：找不到舊租客鍵「${tenantKey}」`)
    const payments = (paymentsByBill.get(key) ?? []).sort((a, b) => a.date.localeCompare(b.date))
    if (payments.reduce((s, p) => s + p.amount, 0) > amount) errors.push(`${at('歷史帳單', i)}：付款合計超過帳單金額`)
    const room = tenantKey ? roomByKey.get(importKey(tenants.get(tenantKey)?.legacyRoomKey)) : undefined
    bills.set(key, {
      legacyBillKey: key, legacyTenantKey: tenantKey, date, dueDate, category, amount,
      description: cellText(row.description), roomId: room?.id ?? '', propertyId: room?.propertyId ?? '', payments,
    })
  })
  paymentsByBill.forEach((_, billKey) => {
    if (billKey && !bills.has(billKey)) errors.push(`歷史付款：舊帳單鍵「${billKey}」不在「歷史帳單」工作表`)
  })

  if (errors.length) return { errors }
  const billList = [...bills.values()]
  return {
    errors,
    plan: {
      tenants: [...tenants.values()],
      bills: billList,
      summary: {
        tenants: tenants.size, bills: bills.size, payments: paymentKeys.size,
        unsettled: billList.filter(b => b.payments.reduce((s, p) => s + p.amount, 0) < b.amount).length,
      },
    },
  }
}

export const planHistoricalImportWrites = (
  plan: HistoricalImportPlan,
  ctx: { landlordId: string; runId: string; newId: (collection: string) => string; timestamp: unknown; nowIso: string },
): ImportWrite[] => {
  const { landlordId, runId, newId, timestamp: ts } = ctx
  const stamp = { importRunId: runId, createdAt: ts, updatedAt: ts }
  const tenantIds = new Map(plan.tenants.map(t => [t.legacyTenantKey, newId('tenants')]))
  const tenantOf = new Map(plan.tenants.map(t => [t.legacyTenantKey, t]))
  const writes: ImportWrite[] = []

  for (const t of plan.tenants) {
    writes.push({ collection: 'tenants', id: tenantIds.get(t.legacyTenantKey)!, data: {
      landlordId, name: t.name, phone: t.phone, status: 'inactive', isHistorical: true,
      legacyTenantKey: t.legacyTenantKey, legacyRoomKey: t.legacyRoomKey,
      // 刻意不寫 room／roomId：沒有起租日的歷史租客掛在房間上，會讓電費判定「租期不完整」
      moveOutSummary: { moveOutDate: t.moveOutDate, legacyRoom: t.legacyRoomKey, imported: true },
      ...stamp,
    } })
  }

  for (const b of plan.bills) {
    const paid = b.payments.reduce((s, p) => s + p.amount, 0)
    const settled = paid >= b.amount
    const tenant = b.legacyTenantKey ? tenantOf.get(b.legacyTenantKey) : undefined
    writes.push({ collection: 'bills', id: newId('bills'), data: {
      landlordId, type: 'income', category: b.category,
      relatedTenantDocId: tenant ? tenantIds.get(tenant.legacyTenantKey)! : null, tenantId: null,
      roomId: b.roomId, propertyId: b.propertyId,
      target: tenant ? `${tenant.name}${tenant.legacyRoomKey ? ` ${tenant.legacyRoomKey}` : ''}` : '歷史帳務',
      description: b.description || '歷史遷移', amount: b.amount, date: b.date, dueDate: b.dueDate,
      // 未繳清的歷史帳單不進入催繳流程
      status: settled ? 'completed' : 'archived',
      ...(settled && b.payments.length ? { paidAt: b.payments[b.payments.length - 1]!.date } : {}),
      paidAmount: paid,
      payments: b.payments.map(p => ({ amount: p.amount, date: p.date, source: 'manual', note: p.note || '歷史遷移', at: ctx.nowIso, legacyPaymentKey: p.legacyPaymentKey })),
      history: [], isHistorical: true, legacyBillKey: b.legacyBillKey, ...stamp,
    } })
  }
  return writes
}
