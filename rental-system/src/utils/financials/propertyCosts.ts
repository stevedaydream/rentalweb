/**
 * 建物年度費用的計算規則（純函式）。
 *
 * 三種費用的期間語意各不相同，繳納期限也固定，故由種類與年度推導預設值：
 *   房屋稅  課稅期間 前一年 7/1 ～ 當年 6/30，5 月開徵，5/31 截止
 *   地價稅  曆年制 1/1 ～ 12/31，11 月開徵，11/30 截止
 *   火災險  依保單起訖，續保期限即保單起日
 */
import { PropertyCostType, type CostAllocation, type PropertyCost } from '../../types/index'

export interface CostPeriod {
  periodStart: string
  periodEnd: string
  dueDate: string
}

/** 依費用種類與年度給出預設期間與繳納期限；火災險無固定期間，回傳空字串由使用者填 */
export const defaultPeriodFor = (type: PropertyCostType, year: number): CostPeriod => {
  const y = String(year).padStart(4, '0')
  const prev = String(year - 1).padStart(4, '0')
  switch (type) {
    case PropertyCostType.HouseTax:
      return { periodStart: `${prev}-07-01`, periodEnd: `${y}-06-30`, dueDate: `${y}-05-31` }
    case PropertyCostType.LandTax:
      return { periodStart: `${y}-01-01`, periodEnd: `${y}-12-31`, dueDate: `${y}-11-30` }
    default:
      return { periodStart: '', periodEnd: '', dueDate: '' }
  }
}

/**
 * 費用歸屬的年度。
 *
 * 以 periodEnd 為準：房屋稅的課稅期間跨年（前一年 7/1 ～ 當年 6/30），
 * 用起日會把它算成前一年，與稅單上的年度對不起來。
 */
export const costYearOf = (cost: Pick<PropertyCost, 'periodEnd' | 'dueDate'>): number | null => {
  const src = cost.periodEnd || cost.dueDate
  const year = Number(src?.slice(0, 4))
  return Number.isFinite(year) && year > 0 ? year : null
}

export const allocationTotal = (allocations: CostAllocation[]): number =>
  allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

/**
 * 平均分攤，餘數給第一棟，確保加總與總額分毫不差。
 * 不按面積或公告地價自動推算——系統沒有這些資料，寧可讓房東自己填。
 */
export const evenSplit = (amount: number, propertyIds: string[]): CostAllocation[] => {
  if (propertyIds.length === 0) return []
  const total = Math.round(Number(amount) || 0)
  const base = Math.floor(total / propertyIds.length)
  const remainder = total - base * propertyIds.length
  return propertyIds.map((propertyId, i) => ({
    propertyId,
    amount: i === 0 ? base + remainder : base,
  }))
}

/** 表單送出前的檢核；回傳 null 代表通過 */
export const validateCost = (cost: {
  amount?: number
  allocations: CostAllocation[]
  periodStart?: string
  periodEnd?: string
}): string | null => {
  const amount = Number(cost.amount) || 0
  if (amount <= 0) return '請輸入金額'
  if (!cost.periodStart || !cost.periodEnd) return '請填寫所屬期間'
  if (cost.periodStart > cost.periodEnd) return '所屬期間的起日不能晚於迄日'
  if (cost.allocations.length === 0) return '請至少分攤到一棟建物'
  if (cost.allocations.some(a => !a.propertyId)) return '有分攤項目未選擇建物'

  const diff = allocationTotal(cost.allocations) - amount
  if (diff !== 0) {
    return diff > 0
      ? `分攤金額比總額多 ${diff.toLocaleString()} 元`
      : `分攤金額比總額少 ${(-diff).toLocaleString()} 元`
  }
  return null
}

export interface CostBillDraft {
  propertyId: string
  amount: number
  date: string
  type: 'expense'
  category: PropertyCostType
  target: string
  description: string
}

/**
 * 標記已繳時要落到 bills 的內容：一棟一筆，金額取該棟的分攤額。
 * 拆成多筆而非一筆總額，年度分棟損益才算得出來。
 */
export const buildCostBills = (
  cost: Pick<PropertyCost, 'type' | 'periodStart' | 'periodEnd' | 'allocations' | 'docNo'>,
  paidAt: string,
  propertyNames: Map<string, string>,
): CostBillDraft[] =>
  cost.allocations
    .filter(a => a.amount !== 0)
    .map(a => ({
      propertyId: a.propertyId,
      amount: a.amount,
      date: paidAt,
      type: 'expense' as const,
      category: cost.type,
      target: propertyNames.get(a.propertyId) || '未指定建物',
      description: [
        `${cost.periodStart} ~ ${cost.periodEnd}`,
        cost.docNo,
      ].filter(Boolean).join(' · '),
    }))
