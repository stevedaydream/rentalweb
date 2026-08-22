/**
 * 台灣租賃所得的綜合所得稅試算（純函式）。
 *
 * 僅供房東自行估算，不等於申報結果：未計免稅額、標準／列舉扣除額、
 * 扶養親屬等個人因素，也未含折舊與房貸利息這類系統沒有的必要費用。
 */

/** 綜合所得稅累進級距 */
export const TAX_BRACKETS = [
  { limit: 560000, rate: 0.05 },
  { limit: 1260000, rate: 0.12 },
  { limit: 2520000, rate: 0.20 },
  { limit: 4720000, rate: 0.30 },
  { limit: Infinity, rate: 0.40 },
]

/** 財政部租賃所得必要費用標準扣除率 */
export const RENTAL_EXPENSE_RATE = 0.43

/** 公益出租人：每屋每月租金收入免稅上限 */
export const PUBLIC_WELFARE_MONTHLY_EXEMPTION = 15000

export const progressiveTax = (income: number): number => {
  let tax = 0
  let prev = 0
  for (const bracket of TAX_BRACKETS) {
    if (income <= prev) break
    const taxable = Math.min(income, bracket.limit) - prev
    tax += taxable * bracket.rate
    prev = bracket.limit
    if (income <= bracket.limit) break
  }
  return Math.round(tax)
}

export const getMarginalRate = (income: number): number => {
  for (const bracket of TAX_BRACKETS) {
    if (income <= bracket.limit) return bracket.rate
  }
  return 0.4
}

/**
 * 公益出租人免稅額。
 *
 * 資格跟門牌走，**整個門牌每月共用一個 15,000 元額度**，不會因為分租
 * 多間而變成多份；且免的是「租金收入」，故不得超過該屋當年實際租金收入。
 *
 * 目前核定狀態只存到年度，故一律以 12 個月計。若該年度是中途取得或
 * 失去資格，這個數字會偏高。
 */
export const publicWelfareExemption = (
  annualRentByProperty: Map<string, number>,
  qualifiedPropertyIds: Set<string>,
  months = 12,
): number => {
  let total = 0
  for (const propertyId of qualifiedPropertyIds) {
    const rent = annualRentByProperty.get(propertyId) ?? 0
    total += Math.min(rent, PUBLIC_WELFARE_MONTHLY_EXEMPTION * months)
  }
  return total
}

export interface RentalTaxInput {
  /** 全年租金收入 */
  grossRent: number
  /** 公益出租人免稅額 */
  exemption: number
  /** 租賃以外的年所得（薪資等），用於決定累進級距 */
  otherIncome: number
}

export interface RentalTaxResult {
  grossRent: number
  exemption: number
  /** 扣除免稅額後的應稅租金收入 */
  taxableRent: number
  /** 必要費用（43% 標準扣除） */
  deduction: number
  /** 租賃所得 */
  rentalNetIncome: number
  /** 綜合所得總額 */
  totalIncome: number
  marginalRate: number
  /** 租賃部分應納稅額 */
  taxAmount: number
  /** 若不具公益出租人資格時的應納稅額 */
  taxWithoutExemption: number
  /** 公益出租人省下的稅 */
  saving: number
}

/** 租賃部分的稅額 = 併入後的總稅額 - 僅其他所得的稅額 */
const rentalTaxOn = (taxableRent: number, otherIncome: number) => {
  const net = taxableRent - Math.round(taxableRent * RENTAL_EXPENSE_RATE)
  const total = Math.max(0, otherIncome + net)
  return Math.max(0, progressiveTax(total) - progressiveTax(Math.max(0, otherIncome)))
}

/**
 * 免稅額**先扣**，餘額再扣 43% 必要費用。
 *
 * 順序影響很大：收入 1,008,000、免稅額 180,000 時，先扣免稅額得
 * 471,960，後扣則得 394,560。採先扣是因為「免納所得稅」意謂那部分
 * 根本不計入所得。
 */
export const calcRentalTax = (input: RentalTaxInput): RentalTaxResult => {
  const grossRent = Math.max(0, Math.round(input.grossRent) || 0)
  const exemption = Math.min(Math.max(0, Math.round(input.exemption) || 0), grossRent)
  const otherIncome = Math.max(0, Math.round(input.otherIncome) || 0)

  const taxableRent = grossRent - exemption
  const deduction = Math.round(taxableRent * RENTAL_EXPENSE_RATE)
  const rentalNetIncome = taxableRent - deduction
  const totalIncome = otherIncome + rentalNetIncome

  const taxAmount = rentalTaxOn(taxableRent, otherIncome)
  const taxWithoutExemption = rentalTaxOn(grossRent, otherIncome)

  return {
    grossRent,
    exemption,
    taxableRent,
    deduction,
    rentalNetIncome,
    totalIncome,
    marginalRate: getMarginalRate(totalIncome),
    taxAmount,
    taxWithoutExemption,
    saving: Math.max(0, taxWithoutExemption - taxAmount),
  }
}
