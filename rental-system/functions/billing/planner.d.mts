// 出帳規劃（planner.mjs）的型別；前端測試用來驗證匯入資料能直接出帳
export interface PlannedBill {
  id: string
  category: string
  amount: number
  description: string
  coverFrom?: string
  coverTo?: string
  creditApplied: number
  [key: string]: unknown
}

export interface TenantPlan {
  tenantKey: string
  target: string
  creditBefore: number
  creditUsed: number
  bills: PlannedBill[]
  version: string
}

export interface BillingPlan {
  month: string
  plans: TenantPlan[]
  warnings: string[]
  skipped: string[]
  allocations: unknown[]
}

export function hash(value: unknown): string
export function tenantRoom(tenant: Record<string, unknown>, rooms: Record<string, unknown>[]): Record<string, unknown> | null
export function paidThroughCoverage(tenant: Record<string, unknown>): Record<string, unknown> | null
export function buildPlan(input: {
  landlordId: string
  month: string
  tenants: Record<string, unknown>[]
  rooms: Record<string, unknown>[]
  readings: Record<string, unknown>[]
  publicMeters: Record<string, unknown>[]
  groups: Record<string, unknown>[]
  bills: Record<string, unknown>[]
  settings?: Record<string, unknown>
  properties?: Record<string, unknown>[]
  templateFeeWater?: string
}): BillingPlan
export function publicPlan(plan: BillingPlan): unknown
