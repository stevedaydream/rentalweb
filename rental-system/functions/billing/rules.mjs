// Shared by Hosting and Cloud Functions. Keep billing arithmetic in one place.
export const CYCLE_MONTHS = Object.freeze({ monthly: 1, quarterly: 3, semiannual: 6, yearly: 12 })
export const validMonth = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
export const monthEnd = month => {
  if (!validMonth(month)) throw new Error('月份格式錯誤')
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}
export const addMonths = (month, n) => {
  if (!validMonth(month)) throw new Error('月份格式錯誤')
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)
}
// Every room pays the same whole-dollar amount. The landlord absorbs the remainder.
export const publicMeterShare = (cost, count) =>
  Number.isFinite(cost) && Number.isInteger(count) && count > 0 && cost > 0
    ? Math.floor(Math.round(cost) / count) : 0
export const sumPublicShares = (costs, count) => costs.reduce((s, c) => s + publicMeterShare(c, count), 0)
export const coveragePeriod = (freq, month) => ({
  from: month, to: addMonths(month, (CYCLE_MONTHS[freq || 'monthly'] ?? 1) - 1),
})
export const leaseIncludesMonth = (tenant, month) => validMonth(month)
  && (!tenant.leaseStart || (validDate(tenant.leaseStart) && tenant.leaseStart <= monthEnd(month)))
  && (!tenant.leaseEnd || (validDate(tenant.leaseEnd) && tenant.leaseEnd >= `${month}-01`))
  && !(tenant.leaseStart && tenant.leaseEnd && tenant.leaseStart > tenant.leaseEnd)
export const shouldGenerateBill = (tenant, month) => {
  if (!leaseIncludesMonth(tenant, month)) return false
  const freq = tenant.paymentFrequency || 'monthly'
  if (!Object.hasOwn(CYCLE_MONTHS, freq)) return false
  if (freq === 'monthly') return true
  if (!tenant.leaseStart) return false
  const [cy, cm] = month.split('-').map(Number)
  const [ly, lm] = tenant.leaseStart.slice(0, 7).split('-').map(Number)
  const diff = (cy - ly) * 12 + cm - lm
  return diff >= 0 && diff % CYCLE_MONTHS[freq] === 0
}
export const getBillingAmount = tenant => {
  const rent = Number(tenant.rent)
  return Number.isFinite(rent) && rent > 0
    ? Math.round(rent * (CYCLE_MONTHS[tenant.paymentFrequency || 'monthly'] ?? 1)) : 0
}
export const getBillingDescription = (tenant, month) => {
  const freq = tenant.paymentFrequency || 'monthly'
  if (!CYCLE_MONTHS[freq] || CYCLE_MONTHS[freq] === 1) return `${month} 月份房租`
  const label = { quarterly: '季度房租', semiannual: '半年度房租', yearly: '年度房租' }[freq]
  return `${month}～${coveragePeriod(freq, month).to} ${label}`
}
export const rentCoverage = bill => {
  if (bill.coverFrom || bill.coverTo) {
    return validMonth(bill.coverFrom) && validMonth(bill.coverTo) && bill.coverFrom <= bill.coverTo
      ? { from: bill.coverFrom, to: bill.coverTo } : null
  }
  const month = (bill.date || '').slice(0, 7)
  if (!validMonth(month)) return null
  const desc = bill.description || ''
  const range = desc.match(/^(\d{4}-\d{2})～(\d{4}-\d{2}) (?:季度|半年度|年度)房租/)
  if (range) return validMonth(range[1]) && validMonth(range[2]) && range[1] <= range[2]
    ? { from: range[1], to: range[2] } : null
  if (/^\d{4} 年度房租/.test(desc)) return { from: month, to: addMonths(month, 11) }
  return { from: month, to: month }
}
export const isMonthCovered = (bills, month) => bills.some(b => {
  const c = rentCoverage(b)
  return !!c && c.from <= month && month <= c.to
})
export const overlapsCoverage = (bills, period) => bills.some(b => {
  const c = rentCoverage(b)
  return !!c && c.from <= period.to && period.from <= c.to
})
export const shouldGenerateRent = (tenant, month, bills) => {
  if (!leaseIncludesMonth(tenant, month)) return false
  if (!Object.hasOwn(CYCLE_MONTHS, tenant.paymentFrequency || 'monthly')) return false
  if (bills.some(b => !rentCoverage(b))) return false
  const next = coveragePeriod(tenant.paymentFrequency, month)
  if (tenant.leaseEnd && next.to > tenant.leaseEnd.slice(0, 7)) return false
  if (overlapsCoverage(bills, next)) return false
  return bills.some(b => rentCoverage(b).to < month) || shouldGenerateBill(tenant, month)
}
export const rebillRent = (tenant, bill) => {
  const cur = rentCoverage(bill)
  if (!cur || !Object.hasOwn(CYCLE_MONTHS, tenant.paymentFrequency || 'monthly')) return null
  const next = coveragePeriod(tenant.paymentFrequency, cur.from)
  if (tenant.leaseEnd && next.to > tenant.leaseEnd.slice(0, 7)) return null
  return {
    amount: getBillingAmount(tenant), description: getBillingDescription(tenant, cur.from),
    coverFrom: next.from, coverTo: next.to,
  }
}
