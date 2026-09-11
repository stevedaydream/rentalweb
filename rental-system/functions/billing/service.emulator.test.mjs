import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { handleBilling } from './service.mjs'
import { hash } from './planner.mjs'

// Hard stop before initializing an SDK unless this is the disposable demo emulator.
const projectId = process.env.GCLOUD_PROJECT
if (!process.env.FIRESTORE_EMULATOR_HOST || projectId !== 'demo-billing-review') {
  throw new Error('Run only with the demo-billing-review Firestore emulator; production access is forbidden')
}
const db = getFirestore(initializeApp({ projectId }))
const month = '2026-09'
async function seed(count = 1) {
  const owner = randomUUID()
  await db.doc(`users/${owner}`).set({ role: 'landlord', settings: { paymentDay: 12 } })
  const writes = []
  for (let i = 0; i < count; i++) {
    const id = `${owner}-${String(i).padStart(3, '0')}`
    writes.push([`tenants/${id}`, { landlordId: owner, name: `租客${i}`, roomId: id, room: `${i}`,
      leaseStart: '2026-01-01', leaseEnd: '2026-12-31', rent: 7000, credit: 7500 }])
    writes.push([`rooms/${id}`, { landlordId: owner, name: `${i}` }])
    writes.push([`meter_readings/${id}-a`, { landlordId: owner, roomId: id,
      periodStart: '2026-08-31', periodEnd: '2026-09-15', cost: 600, usage: 100 }])
    writes.push([`meter_readings/${id}-b`, { landlordId: owner, roomId: id,
      periodStart: '2026-09-15', periodEnd: '2026-09-30', cost: 400, usage: 60 }])
  }
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch()
    writes.slice(i, i + 400).forEach(([path, value]) => batch.set(db.doc(path), value))
    await batch.commit()
  }
  return owner
}
const invoke = (owner, data, auth = { uid: owner }) => handleBilling(db, FieldValue, { auth, data: { landlordId: owner, month, ...data } })
const preview = owner => invoke(owner, { mode: 'preview' })
const command = (plans, operationId = randomUUID()) => ({ mode: 'commit', operationId,
  selections: plans.map(p => ({ tenantKey: p.tenantKey, version: p.version })) })
const owned = (collection, owner) => db.collection(collection).where('landlordId', '==', owner).get()

test('preview is read-only and server rejects unauthenticated and cross-owner requests', async () => {
  const owner = await seed()
  const p = await preview(owner)
  assert.equal(p.plans[0].items.length, 3)
  assert.equal((await owned('bills', owner)).size, 0)
  assert.equal((await owned('billing_runs', owner)).size, 0)
  await assert.rejects(invoke(owner, { mode: 'preview' }, null), { code: 'unauthenticated' })
  const other = await seed()
  await assert.rejects(invoke(owner, { mode: 'preview' }, { uid: other }), { code: 'permission-denied' })
  await db.doc(`users/${other}`).update({ role: 'admin', settings: { paymentDay: 5 } })
  const asAdmin = await invoke(owner, { mode: 'preview' }, { uid: other })
  assert.equal(asAdmin.plans[0].items[0].dueDate, '2026-09-12')
})
test('two windows cannot duplicate bills or spend the same credit twice', async () => {
  const owner = await seed()
  const p = await preview(owner)
  const results = await Promise.allSettled([invoke(owner, command(p.plans)), invoke(owner, command(p.plans))])
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
  const failure = results.find(r => r.status === 'rejected')
  assert.equal(failure.reason.code, 'failed-precondition')
  const bills = await owned('bills', owner)
  assert.equal(bills.size, 3)
  assert.equal(bills.docs.reduce((sum, b) => sum + (b.data().paidAmount || 0), 0), 7500)
  assert.equal((await db.doc(`tenants/${p.plans[0].tenantKey}`).get()).data().credit, 0)
  assert.equal((await owned('bill_generate_logs', owner)).size, 1)
})
test('retrying the identical operation returns its receipt without writes', async () => {
  const owner = await seed()
  const p = await preview(owner)
  const c = command(p.plans)
  const result = await invoke(owner, c)
  const retry = await invoke(owner, c)
  assert.equal(result.billCount, 3)
  assert.equal(retry.replayed, true)
  assert.deepEqual(result.items, retry.items)
  assert.equal((await owned('bills', owner)).size, 3)
  assert.equal((await owned('billing_runs', owner)).size, 1)
  await assert.rejects(invoke(owner, { ...c, selections: c.selections.map(s => ({ ...s, version: '0'.repeat(64) })) }), { code: 'invalid-argument' })
})
test('log creation failure rolls back bills, balance and retry receipt together', async () => {
  const owner = await seed()
  const p = await preview(owner)
  const c = command(p.plans)
  const log = db.doc(`bill_generate_logs/${hash([owner, c.operationId])}`)
  await log.set({ landlordId: owner, injectedConflict: true })
  await assert.rejects(invoke(owner, c))
  assert.equal((await owned('bills', owner)).size, 0)
  assert.equal((await owned('billing_runs', owner)).size, 0)
  assert.equal((await db.doc(`tenants/${p.plans[0].tenantKey}`).get()).data().credit, 7500)
  await log.delete()
  assert.equal((await invoke(owner, c)).billCount, 3)
})
test('a newly added future bill invalidates the earlier rent preview', async () => {
  const owner = await seed()
  const tenant = (await owned('tenants', owner)).docs[0]
  await tenant.ref.update({ paymentFrequency: 'quarterly', leaseStart: '2026-09-01' })
  const p = await preview(owner)
  await db.collection('bills').add({ landlordId: owner, relatedTenantDocId: tenant.id, type: 'income',
    category: '租金收入', date: '2026-10-01', amount: 7000, status: 'pending' })
  await assert.rejects(invoke(owner, command(p.plans)), { code: 'failed-precondition' })
  assert.equal((await owned('bills', owner)).size, 1)
  assert.equal((await tenant.ref.get()).data().credit, 7500)
})
test('453 bills resume across a failed later batch without losing credit atomicity', async () => {
  const owner = await seed(151)
  const p = await preview(owner)
  assert.equal(p.plans.length, 151)
  const first = p.plans.slice(0, 99)
  const second = p.plans.slice(99)
  await invoke(owner, command(first))
  assert.equal((await owned('bills', owner)).size, 297)
  await db.doc(`tenants/${second[0].tenantKey}`).update({ credit: 10 })
  await assert.rejects(invoke(owner, command(second)), { code: 'failed-precondition' })
  assert.equal((await owned('bills', owner)).size, 297)
  assert.equal((await db.doc(`tenants/${second[1].tenantKey}`).get()).data().credit, 7500)
  const refreshed = await preview(owner)
  assert.equal(refreshed.plans.length, 52)
  await invoke(owner, command(refreshed.plans))
  assert.equal((await owned('bills', owner)).size, 453)
  assert.equal((await owned('billing_runs', owner)).size, 2)
  assert.equal((await owned('tenants', owner)).docs.every(t => t.data().credit === 0), true)
})

test.after(async () => { await db.terminate() })
