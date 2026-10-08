import { validDate } from './rules.mjs'

export function continuesMonthlyRent(contract, tenant) {
  const next = contract.pendingRenewal
  if ((tenant.paymentFrequency || 'monthly') !== 'monthly'
    || !validDate(contract.startDate) || !validDate(contract.endDate)
    || contract.startDate > contract.endDate || !next
    || !validDate(next.startDate) || !validDate(next.endDate) || next.endDate < next.startDate
    || typeof contract.rent !== 'number' || contract.rent <= 0
    || tenant.rent !== contract.rent || next.rent !== contract.rent) return false
  const tomorrow = new Date(`${contract.endDate}T00:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return next.startDate === tomorrow.toISOString().slice(0, 10)
}

export function continuityStart(contract) {
  return validDate(contract.rentContinuityStart) && contract.rentContinuityStart <= contract.startDate
    ? contract.rentContinuityStart : contract.startDate
}

export function effectiveRentLease(tenant, contracts, landlordId) {
  if ((tenant.paymentFrequency || 'monthly') !== 'monthly') return tenant
  const contract = contracts.find(c => c.id === tenant.contractId)
  if (!contract || contract.status !== 'active' || contract.landlordId !== landlordId
    || tenant.landlordId !== landlordId || contract.tenantDocId !== tenant.id
    || (contract.roomId && tenant.roomId && contract.roomId !== tenant.roomId)
    || contract.startDate !== tenant.leaseStart || contract.endDate !== tenant.leaseEnd
    || contract.rent !== tenant.rent || !validDate(contract.startDate) || !validDate(contract.endDate)
    || contract.startDate > contract.endDate) return tenant
  return { ...tenant, leaseStart: continuityStart(contract),
    leaseEnd: continuesMonthlyRent(contract, tenant) ? contract.pendingRenewal.endDate : tenant.leaseEnd }
}
