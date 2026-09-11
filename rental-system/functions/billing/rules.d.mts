export type PaymentFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'yearly'
export interface BillingTenant { paymentFrequency?: string; leaseStart?: string; leaseEnd?: string; rent?: number }
export interface RentBillLike { id?: string; date?: string; description?: string; coverFrom?: string; coverTo?: string }
export interface Coverage { from: string; to: string }
export const CYCLE_MONTHS: Readonly<Record<string, number>>
export function validMonth(value: unknown): boolean
export function validDate(value: unknown): boolean
export function monthEnd(month: string): string
export function addMonths(month: string, n: number): string
export function publicMeterShare(cost: number, roomCount: number): number
export function sumPublicShares(costs: number[], roomCount: number): number
export function coveragePeriod(freq: string | undefined, month: string): Coverage
export function leaseIncludesMonth(tenant: BillingTenant, month: string): boolean
export function shouldGenerateBill(tenant: BillingTenant, month: string): boolean
export function getBillingAmount(tenant: BillingTenant): number
export function getBillingDescription(tenant: BillingTenant, month: string): string
export function rentCoverage(bill: RentBillLike): Coverage | null
export function isMonthCovered(bills: RentBillLike[], month: string): boolean
export function overlapsCoverage(bills: RentBillLike[], period: Coverage): boolean
export function shouldGenerateRent(tenant: BillingTenant, month: string, bills: RentBillLike[]): boolean
export function rebillRent(tenant: BillingTenant, bill: RentBillLike): {
  amount: number; description: string; coverFrom: string; coverTo: string
} | null
