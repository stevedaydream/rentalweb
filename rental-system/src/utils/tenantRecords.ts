/**
 * 建立租客與租約文件時共用的欄位規則（租客匯入、新房東資料匯入共用），
 * 避免多條建檔路徑寫出不一致的資料。
 */

export type DepositStatus = 'unpaid' | 'paid'

export interface DepositItem {
  label: string
  amount: number
  status: DepositStatus
}

/**
 * 租約的押金明細。新簽約時押金與首月租金都還沒收；
 * 從舊系統接管的現役租客押金早已收取，且首月租金不屬於押金。
 */
export const buildDeposits = (
  rent: number, months: number,
  opts: { status?: DepositStatus; includeFirstRent?: boolean } = {},
): DepositItem[] => {
  const status = opts.status ?? 'unpaid'
  const items: DepositItem[] = []
  for (let n = 1; n <= months; n++) items.push({ label: `押金（第 ${n} 個月）`, amount: rent, status })
  if (opts.includeFirstRent ?? true) items.push({ label: '首月租金', amount: rent, status })
  return items
}

/** 起訖日推算租期年數（租客資料的 leaseDuration），取到半年 */
export const leaseDurationYears = (start: string, end: string): number => {
  const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 + 1
  if (!Number.isFinite(days) || days <= 0) return 1
  return Math.max(0.5, Math.round((days / 365.25) * 2) / 2)
}
