/**
 * 出帳規則（純函式）：公共電費分攤與租金週期。
 *
 * 抄表頁的預估與帳單生成必須呼叫同一份實作，否則兩邊各自取整就會分歧
 * —— 房東在抄表頁看到的分攤金額與實際開出的帳單對不上。
 */

/**
 * 單一顆公共電表的每房分攤額。
 * 逐表各自除、各自取整，與帳單生成一致（每顆表各開一筆帳單）。
 */
export const publicMeterShare = (cost: number, roomCount: number) =>
  roomCount > 0 && cost > 0 ? Math.round(cost / roomCount) : 0

/**
 * 一個子群組內全部公共電表的每房分攤合計。
 * 以 publicMeterShare 逐表計算後相加，確保與帳單總額一致。
 * @param costs 已排除「房東負擔」的公共電表電費
 */
export const sumPublicShares = (costs: number[], roomCount: number) =>
  costs.reduce((sum, cost) => sum + publicMeterShare(cost, roomCount), 0)

// --- 租金週期 ---

export type PaymentFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'yearly'

export interface BillingTenant {
  paymentFrequency?: string
  leaseStart?: string
  rent?: number
}

const CYCLE_MONTHS: Record<string, number> = {
  monthly: 1, quarterly: 3, semiannual: 6, yearly: 12,
}

/**
 * 本月是否該為此租客產生租金帳單。
 *
 * 非月繳者以 leaseStart 為週期起點；**未填起租日則永遠不出帳**，
 * 且不會有任何警告 —— 設定非月繳時務必確認起租日已填。
 */
export const shouldGenerateBill = (tenant: BillingTenant, month: string): boolean => {
  const freq = tenant.paymentFrequency || 'monthly'
  if (freq === 'monthly') return true
  if (!tenant.leaseStart) return false
  const [cy, cm] = month.split('-').map(Number) as [number, number]
  const [ly, lm] = tenant.leaseStart.substring(0, 7).split('-').map(Number) as [number, number]
  const diff = (cy - ly) * 12 + (cm - lm)
  const cycle = CYCLE_MONTHS[freq]
  if (!cycle) return true
  return diff % cycle === 0
}

/** 一期應收租金 = 月租 × 週期月數 */
export const getBillingAmount = (tenant: BillingTenant): number => {
  const rent = Number(tenant.rent) || 0
  return rent * (CYCLE_MONTHS[tenant.paymentFrequency || 'monthly'] ?? 1)
}

/** 帳單摘要文字，標明所涵蓋的期間 */
export const getBillingDescription = (tenant: BillingTenant, month: string): string => {
  const freq = tenant.paymentFrequency || 'monthly'
  if (freq === 'yearly') return `${month.substring(0, 4)} 年度房租`
  const span = CYCLE_MONTHS[freq]
  if (!span || span === 1) return `${month} 月份房租`

  const [y, m] = month.split('-').map(Number) as [number, number]
  const endIdx = m + span - 1
  const endY = y + Math.floor((endIdx - 1) / 12)
  const endM = ((endIdx - 1) % 12) + 1
  const label = freq === 'quarterly' ? '季度房租' : '半年度房租'
  return `${month}～${endY}-${String(endM).padStart(2, '0')} ${label}`
}
