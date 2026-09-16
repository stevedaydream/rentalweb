import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPlan, tenantRoom, paidThroughCoverage } from './planner.mjs'
import { shouldGenerateBill, shouldGenerateRent, publicMeterShare, rentCoverage } from './rules.mjs'

export const fixture = () => ({
  landlordId: 'owner', month: '2026-09', settings: { paymentDay: 12 },
  tenants: [{ id: 'lease-a', name: '甲', roomId: 'room-a', room: '101', uid: 'user-a',
    leaseStart: '2026-01-01', leaseEnd: '2026-12-31', rent: 7000, credit: 7500 }],
  rooms: [{ id: 'room-a', name: '101', subGroupId: 'floor-a' }],
  groups: [{ id: 'group-a', subGroups: [{ id: 'floor-a' }] }], publicMeters: [], bills: [],
  readings: [{ id: 'reading-a', roomId: 'room-a', roomName: '101', periodStart: '2026-08-01',
    periodEnd: '2026-09-01', usage: 200, cost: 1000 }],
})

test('rent and electricity use a single credit balance in priority order', () => {
  const plan = buildPlan(fixture()).plans[0]
  assert.equal(plan.creditUsed, 7500)
  assert.deepEqual(plan.bills.map(b => b.creditApplied), [7000, 500])
  assert.equal(plan.bills[1].groupId, 'group-a')
})
test('future lease never bills monthly, quarterly, semiannual or yearly', () => {
  for (const paymentFrequency of ['monthly', 'quarterly', 'semiannual', 'yearly']) {
    assert.equal(shouldGenerateBill({ leaseStart: '2026-12-01', paymentFrequency }, '2025-12'), false)
    assert.equal(shouldGenerateRent({ leaseStart: '2026-12-01', paymentFrequency }, '2025-12', [{ date: '2025-01-01' }]), false)
  }
})
test('backdated quarterly bill cannot overlap a future monthly bill', () => {
  const input = fixture()
  input.tenants[0].paymentFrequency = 'quarterly'
  input.bills = [{ id: 'oct', relatedTenantDocId: 'lease-a', type: 'income', category: '租金收入', date: '2026-10-01' }]
  const plan = buildPlan(input)
  assert.equal(plan.plans[0].bills.some(b => b.category === '租金收入'), false)
  assert.match(plan.skipped.join(), /重疊/)
})
test('cross-lease cycle is blocked; last partial month remains whole-month with a warning', () => {
  const input = fixture()
  input.tenants[0].leaseEnd = '2026-09-15'
  let plan = buildPlan(input)
  assert.equal(plan.plans[0].bills[0].amount, 7000)
  assert.match(plan.warnings.join(), /不足整月/)
  input.tenants[0].paymentFrequency = 'quarterly'
  plan = buildPlan(input)
  assert.match(plan.warnings.join(), /超出租約終月/)
  assert.equal(plan.plans[0].bills.some(b => b.category === '租金收入'), false)
})
test('room ID wins over a renamed room; duplicate legacy names cannot select a tenant', () => {
  const rooms = [{ id: 'a', name: '101' }, { id: 'b', name: '101' }]
  assert.equal(tenantRoom({ room: '101' }, rooms), null)
  assert.equal(tenantRoom({ roomId: 'b', room: 'old-name' }, rooms).id, 'b')
  assert.equal(tenantRoom({ roomId: 'deleted', room: '101' }, rooms), null)
})
test('a reading crossing a tenant change is held for manual resolution', () => {
  const input = fixture()
  input.tenants[0].leaseStart = '2026-08-15'
  input.tenants.push({ ...input.tenants[0], id: 'old', uid: 'old-user', isHistorical: true,
    leaseStart: '2026-01-01', leaseEnd: '2026-08-14' })
  const plan = buildPlan(input)
  assert.equal(plan.plans.flatMap(p => p.bills).some(b => b.category === '電費'), false)
  assert.match(plan.warnings.join(), /跨租客/)
})
test('an old room reading is billed to its historical lease, not the current occupant', () => {
  const input = fixture()
  input.tenants[0].leaseStart = '2026-09-02'
  input.tenants.push({ ...input.tenants[0], id: 'old', uid: 'old-user', isHistorical: true,
    leaseStart: '2026-01-01', leaseEnd: '2026-09-01' })
  const bill = buildPlan(input).plans.flatMap(p => p.bills).find(b => b.category === '電費')
  assert.equal(bill.relatedTenantDocId, 'old')
})
test('all non-overlapping public readings are billed; shares plus landlord amounts conserve cost', () => {
  const input = fixture()
  input.rooms.push({ id: 'vacant-1', name: '102', subGroupId: 'floor-a' }, { id: 'vacant-2', name: '103', subGroupId: 'floor-a' })
  input.publicMeters = [{ id: 'public-a', name: '公共表', subGroupId: 'floor-a', groupId: 'group-a' }]
  input.readings = [
    { id: 'p1', meterType: 'public', roomId: 'public-a', periodStart: '2026-08-31', periodEnd: '2026-09-15', usage: 20, cost: 101 },
    { id: 'p2', meterType: 'public', roomId: 'public-a', periodStart: '2026-09-15', periodEnd: '2026-09-30', usage: 20, cost: 100 },
  ]
  const plan = buildPlan(input)
  assert.equal(plan.plans[0].bills.filter(b => b.category === '公共電費').length, 2)
  for (const a of plan.allocations) assert.equal(a.share + a.vacantAmount + a.roundingRemainder, a.total)
  assert.equal(publicMeterShare(101, 3), 33)
})
test('move-out snapshots restore old occupancy and stop at the actual move-out date', () => {
  const input = fixture()
  input.tenants[0] = { ...input.tenants[0], isHistorical: true, room: '', roomId: '', leaseStart: '', leaseEnd: '',
    moveOutSummary: { room: '101', leaseStart: '2026-01-01', leaseEnd: '2026-12-31', moveOutDate: '2026-09-01' } }
  const plan = buildPlan(input)
  assert.equal(plan.plans[0].bills.length, 1)
  assert.equal(plan.plans[0].bills[0].category, '電費')
  input.readings[0].periodEnd = '2026-09-15'
  assert.equal(buildPlan(input).plans.length, 0)
})
test('overlapping readings are never double billed', () => {
  const input = fixture()
  input.readings.push({ ...input.readings[0], id: 'duplicate' })
  const plan = buildPlan(input)
  assert.equal(plan.plans[0].bills.length, 1)
  assert.match(plan.warnings.join(), /期間重疊/)
})
test('old usage IDs deduplicate without a date cutoff', () => {
  const input = fixture()
  input.bills = [{ id: 'ancient', date: '2024-01-01', relatedUsageId: 'reading-a' }]
  assert.equal(buildPlan(input).plans[0].bills.length, 1)
})
test('explicit tenant document identity takes precedence over a shared login', () => {
  const input = fixture()
  input.bills = [{ id: 'other', relatedTenantDocId: 'other-lease', tenantId: 'user-a',
    type: 'income', category: '租金收入', date: '2026-09-01' }]
  assert.equal(buildPlan(input).plans[0].bills[0].category, '租金收入')
})
test('invalid coverage cannot silently become a one-month legacy bill', () => {
  assert.equal(rentCoverage({ date: '2026-09-01', coverFrom: '2026-10', coverTo: '2026-09' }), null)
  assert.equal(shouldGenerateRent({}, '2026-09', [{ coverFrom: '2026-09' }]), false)
})
test('payment deadline clamps to February end and honors the target landlord profile', () => {
  const input = fixture()
  input.month = '2026-02'
  input.settings.paymentDay = 31
  assert.equal(buildPlan(input).plans[0].bills[0].dueDate, '2026-02-28')
})
test('preview hash changes when money or lease terms change', () => {
  const input = fixture()
  const original = buildPlan(input).plans[0].version
  input.tenants[0].credit = 0
  assert.notEqual(buildPlan(input).plans[0].version, original)
})
test('fixed water fee is billed with rent, per person, for the same coverage', () => {
  const input = fixture()
  input.tenants[0].credit = 0
  input.tenants[0].occupants = 2
  input.tenants[0].paymentFrequency = 'quarterly'
  input.tenants[0].leaseStart = '2026-03-01'
  input.rooms[0].propertyId = 'prop-a'
  input.properties = [{ id: 'prop-a', name: '甲棟', waterSettings: { mode: 'fixed', basis: 'person', fixedAmount: 100 } }]
  const bills = buildPlan(input).plans[0].bills
  const water = bills.find(b => b.category === '水費')
  assert.equal(water.amount, 600)
  assert.equal(water.coverFrom, '2026-09')
  assert.equal(water.coverTo, '2026-11')
  assert.equal(water.propertyId, 'prop-a')
  assert.deepEqual(bills.map(b => b.category), ['租金收入', '水費', '電費'])
})
test('credit is applied to water right after rent', () => {
  const input = fixture()
  input.tenants[0].credit = 7050
  input.rooms[0].propertyId = 'prop-a'
  input.properties = [{ id: 'prop-a', waterSettings: { mode: 'fixed', basis: 'room', fixedAmount: 100 } }]
  const plan = buildPlan(input).plans[0]
  assert.deepEqual(plan.bills.map(b => b.creditApplied), [7000, 50, 0])
})
test('no water bill when rent is not billed, when the room pays independently, or when landlord pays', () => {
  const input = fixture()
  input.rooms[0].propertyId = 'prop-a'
  input.properties = [{ id: 'prop-a', waterSettings: { mode: 'fixed', fixedAmount: 100 } }]
  input.bills = [{ id: 'sep', relatedTenantDocId: 'lease-a', type: 'income', category: '租金收入', date: '2026-09-01' }]
  assert.equal(buildPlan(input).plans.flatMap(p => p.bills).some(b => b.category === '水費'), false)
  input.bills = []
  input.rooms[0].waterMode = 'independent'
  assert.equal(buildPlan(input).plans[0].bills.some(b => b.category === '水費'), false)
  input.rooms[0].waterMode = ''
  input.properties[0].waterSettings = { mode: 'landlord' }
  assert.equal(buildPlan(input).plans[0].bills.some(b => b.category === '水費'), false)
})
test('unset water mode warns instead of guessing; legacy tenant-pays template counts as unset', () => {
  const input = fixture()
  input.templateFeeWater = 'tenant'
  const plan = buildPlan(input)
  assert.equal(plan.plans[0].bills.some(b => b.category === '水費'), false)
  assert.match(plan.warnings.join(), /尚未設定水費方式/)
  input.templateFeeWater = 'landlord'
  assert.doesNotMatch(buildPlan(input).warnings.join(), /水費/)
})
test('fixed water without an amount warns and a rerun does not duplicate the water bill', () => {
  const input = fixture()
  input.rooms[0].propertyId = 'prop-a'
  input.properties = [{ id: 'prop-a', name: '甲棟', waterSettings: { mode: 'fixed', fixedAmount: 0 } }]
  assert.match(buildPlan(input).warnings.join(), /未設定金額/)
  input.properties[0].waterSettings.fixedAmount = 100
  const water = buildPlan(input).plans[0].bills.find(b => b.category === '水費')
  input.bills = [{ id: water.id }]
  assert.equal(buildPlan(input).plans[0].bills.some(b => b.category === '水費'), false)
})
test('imported rentPaidThrough prevents re-billing covered months and continues afterwards', () => {
  const input = fixture()
  input.readings = []
  input.tenants[0].credit = 0
  input.tenants[0].rentPaidThrough = '2026-09'
  let plan = buildPlan(input)
  assert.equal(plan.plans.length, 0)
  assert.match(plan.skipped.join(), /重疊/)
  input.month = '2026-10'
  plan = buildPlan(input)
  assert.equal(plan.plans[0].bills[0].coverFrom, '2026-10')
})
test('quarterly tenant paid through mid-cycle resumes after the paid quarter', () => {
  const input = fixture()
  input.readings = []
  input.tenants[0].credit = 0
  input.tenants[0].paymentFrequency = 'quarterly'
  input.tenants[0].leaseStart = '2026-07-01'
  input.tenants[0].rentPaidThrough = '2026-09'
  input.month = '2026-09'
  assert.equal(buildPlan(input).plans.length, 0)
  input.month = '2026-10'
  const bill = buildPlan(input).plans[0].bills[0]
  assert.deepEqual([bill.coverFrom, bill.coverTo], ['2026-10', '2026-12'])
})
test('invalid rentPaidThrough is ignored', () => {
  assert.equal(paidThroughCoverage({ id: 'x', rentPaidThrough: '2026/9' }), null)
  assert.deepEqual(paidThroughCoverage({ id: 'x', leaseStart: '2026-12-01', rentPaidThrough: '2026-09' }).coverFrom, '2026-09')
})
