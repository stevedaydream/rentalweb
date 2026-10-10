import type { BillingBatch, TenantBillingPreview } from '../../services/billingGenerationService'

// Two writes are reserved for the retry receipt and generation log. Never split a lease.
export function billingBatches(
  plans: TenantBillingPreview[],
  newId: () => string = () => crypto.randomUUID(),
  options = { reservedWrites: 2, perTenantWrites: 1 }
): BillingBatch[] {
  const batches: BillingBatch[] = []
  let writes = options.reservedWrites
  let current: BillingBatch | undefined
  for (const plan of plans) {
    const size = plan.items.length + options.perTenantWrites
    if (size > 400 - options.reservedWrites)
      throw new Error(`${plan.target} 的單次帳單超過上限，請先整理抄表資料`)
    if (!current || writes + size > 400 || current.selections.length >= 100) {
      current = { operationId: newId(), selections: [] }
      batches.push(current)
      writes = options.reservedWrites
    }
    current.selections.push({ tenantKey: plan.tenantKey, version: plan.version })
    writes += size
  }
  return batches
}
