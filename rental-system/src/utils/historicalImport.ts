export interface HistoricalTenantRow { legacyTenantKey: string; name: string; legacyRoomKey?: string; moveOutDate?: string; phone?: string }
export interface HistoricalBillRow { legacyBillKey: string; legacyTenantKey?: string; date: string; dueDate: string; category: string; amount: unknown; description?: string }
export interface HistoricalPaymentRow { legacyPaymentKey: string; legacyBillKey: string; date: string; amount: unknown; method?: string; note?: string }
export interface HistoricalImportInput { tenants: HistoricalTenantRow[]; bills: HistoricalBillRow[]; payments: HistoricalPaymentRow[] }
const date = /^\d{4}-\d{2}-\d{2}$/
const key = (value: unknown) => String(value ?? '').trim().toUpperCase()
const money = (value: unknown) => { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : 0 }

/** 歷史資料只建立可查詢的資料列；不產生登入、通知、催繳或續約副作用。 */
export const buildHistoricalImportPlan = (input: HistoricalImportInput) => {
  const errors: string[] = []; const tenants = input.tenants ?? []; const bills = input.bills ?? []; const payments = input.payments ?? []
  const tenantKeys = new Set<string>(); const billKeys = new Set<string>()
  const plannedTenants = tenants.map((row, i) => { const legacyTenantKey = key(row.legacyTenantKey); if (!legacyTenantKey || tenantKeys.has(legacyTenantKey)) errors.push(`歷史租客第 ${i + 2} 列：舊租客鍵必須唯一`); tenantKeys.add(legacyTenantKey); if (!row.name?.trim()) errors.push(`歷史租客第 ${i + 2} 列：姓名為必填`); if (row.moveOutDate && !date.test(row.moveOutDate)) errors.push(`歷史租客第 ${i + 2} 列：退租日必須是 YYYY-MM-DD`); return { ...row, legacyTenantKey, status: 'inactive' as const, isHistorical: true } })
  const paymentsByBill = new Map<string, HistoricalPaymentRow[]>()
  payments.forEach((row, i) => { const legacyBillKey = key(row.legacyBillKey); const amount = money(row.amount); if (!legacyBillKey) errors.push(`歷史付款第 ${i + 2} 列：舊帳單鍵為必填`); if (!amount) errors.push(`歷史付款第 ${i + 2} 列：金額必須大於 0`); if (!date.test(row.date)) errors.push(`歷史付款第 ${i + 2} 列：日期必須是 YYYY-MM-DD`); const list = paymentsByBill.get(legacyBillKey) || []; list.push({ ...row, legacyBillKey, amount }); paymentsByBill.set(legacyBillKey, list) })
  const plannedBills = bills.map((row, i) => { const legacyBillKey = key(row.legacyBillKey); const amount = money(row.amount); if (!legacyBillKey || billKeys.has(legacyBillKey)) errors.push(`歷史帳單第 ${i + 2} 列：舊帳單鍵必須唯一`); billKeys.add(legacyBillKey); if (!date.test(row.date) || !date.test(row.dueDate)) errors.push(`歷史帳單第 ${i + 2} 列：日期必須是 YYYY-MM-DD`); if (!row.category?.trim() || !amount) errors.push(`歷史帳單第 ${i + 2} 列：類別與正整數金額為必填`); if (row.legacyTenantKey && !tenantKeys.has(key(row.legacyTenantKey))) errors.push(`歷史帳單第 ${i + 2} 列：找不到舊租客鍵「${row.legacyTenantKey}」`); const entries = paymentsByBill.get(legacyBillKey) || []; const paidAmount = entries.reduce((sum, payment) => sum + money(payment.amount), 0); if (paidAmount > amount) errors.push(`歷史帳單第 ${i + 2} 列：付款合計不可超過帳單金額`); return { ...row, legacyBillKey, amount, paidAmount, payments: entries.map(p => ({ amount: money(p.amount), date: p.date, source: 'manual' as const, note: p.note || '歷史遷移', at: p.date })), status: paidAmount >= amount ? 'completed' : 'pending', isHistorical: true } })
  paymentsByBill.forEach((_, legacyBillKey) => { if (!billKeys.has(legacyBillKey)) errors.push(`歷史付款：指向不存在的舊帳單鍵「${legacyBillKey}」`) })
  return errors.length ? { errors } : { errors, plan: { tenants: plannedTenants, bills: plannedBills } }
}
