const test = require('node:test')
const assert = require('node:assert/strict')
const { validatePatch, assertLease, scanAnomalies, needsReason, date } = require('./policy.cjs')
test('管理欄位白名單拒絕改寫權限與資料歸屬', () => {
  for (const patch of [{ role: 'admin' }, { landlordId: 'other' }, { credit: 100 }])
    assert.throws(() => validatePatch('tenants', patch))
})
test('金額與日期拒絕負值、無窮值及不存在的日期', () => {
  for (const amount of [-1, Infinity, NaN, 1.2])
    assert.throws(() => validatePatch('bills', { amount }))
  assert.equal(date('2026-02-30'), false)
  assert.equal(date('2028-02-29'), true)
  assert.throws(() => assertLease({ startDate: '2026-10-01', endDate: '2026-09-30', rent: 5000 }))
})
test('重要操作要求原因，一般基本資料編輯可選填', () => {
  assert.equal(needsReason('tenants', 'edit'), false)
  for (const [kind, action] of [
    ['bills', 'edit'],
    ['contracts', 'edit'],
    ['tenants', 'credit'],
    ['users', 'account'],
  ])
    assert.equal(needsReason(kind, action), true)
})
test('異常檢查可辨識跨房東房源及同房間多份有效租約', () => {
  const data = {
    users: [
      { id: 'l', role: 'landlord' },
      { id: 'other', role: 'landlord' },
    ],
    properties: [],
    rooms: [{ id: 'r', landlordId: 'other' }],
    tenants: [{ id: 't', landlordId: 'l', roomId: 'r', uid: 'missing' }],
    bills: [],
    signed_contracts: [],
    contracts: [
      { id: 'c1', landlordId: 'l', roomId: 'r', tenantDocId: 't', status: 'active' },
      { id: 'c2', landlordId: 'l', roomId: 'r', tenantDocId: 't', status: 'active' },
    ],
  }
  const issues = scanAnomalies(data)
  assert.ok(issues.some((i) => i.message === '房源關聯缺漏或跨房東'))
  assert.ok(issues.some((i) => i.message === '租客登入資料不存在'))
  assert.equal(issues.filter((i) => i.message === '同房源存在多份有效租約').length, 2)
})
