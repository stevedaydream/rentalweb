import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase/config'

export interface GeneratedBillItem {
  target: string
  category: string
  description: string
  amount: number
  tenantKey?: string
  creditApplied?: number
  dueDate?: string
}
export interface TenantBillingPreview {
  tenantKey: string
  target: string
  version: string
  creditBefore: number
  creditUsed: number
  items: GeneratedBillItem[]
}
export interface BillingPreview {
  month: string
  plans: TenantBillingPreview[]
  warnings: string[]
  skipped: string[]
  allocations: {
    readingId: string; name: string; total: number; roomCount: number; share: number
    roundingRemainder: number; vacantAmount: number; unresolvedAmount: number
  }[]
}
export interface BillingCommit {
  month: string
  billCount: number
  items: GeneratedBillItem[]
  tenantKeys: string[]
  replayed: boolean
}
export interface BillingBatch {
  operationId: string
  selections: { tenantKey: string; version: string }[]
}
export async function previewBills(landlordId: string, month: string) {
  const call = httpsCallable<unknown, BillingPreview>(functions, 'generateMonthlyBills', { timeout: 150000 })
  return (await call({ landlordId, month, mode: 'preview' })).data
}
export async function commitBills(landlordId: string, month: string, batch: BillingBatch) {
  const call = httpsCallable<unknown, BillingCommit>(functions, 'generateMonthlyBills', { timeout: 150000 })
  return (await call({ landlordId, month, mode: 'commit', ...batch })).data
}
