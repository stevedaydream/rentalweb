const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { promoteRenewal, handlePromoteRenewal, todayInTaipei } = require('./service.cjs');
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-billing-review') {
  throw Error('Run only on the disposable demo-billing-review Firestore emulator');
}
const db = getFirestore(initializeApp({ projectId: process.env.GCLOUD_PROJECT }));
async function seed() {
  const owner = randomUUID(), id = randomUUID();
  const batch = db.batch();
  batch.set(db.doc(`users/${owner}`), { role: 'landlord' });
  batch.set(db.doc(`rooms/${id}`), { landlordId: owner, name: '501', status: 'occupied', leaseEnd: '2026-08-21', price: 9000 });
  batch.set(db.doc(`tenants/${id}`), { landlordId: owner, name: 'fixture', contractId: id, room: '501', leaseEnd: '2026-08-21', rent: 9000 });
  batch.set(db.doc(`contracts/${id}`), { landlordId: owner, tenantDocId: id, roomNumber: '501', status: 'active',
    startDate: '2025-08-22', endDate: '2026-08-21', rent: 9000, pendingRenewal: { startDate: '2026-08-22', endDate: '2027-08-21', rent: 10000 } });
  await batch.commit();
  return { owner, id };
}
const invoke = ({ owner, id }, today = '2026-09-13', store = db) => promoteRenewal(store, FieldValue, id, { auth: { uid: owner }, today });
const read = async id => Object.fromEntries(await Promise.all(['rooms', 'tenants', 'contracts'].map(async c => [c, (await db.doc(`${c}/${id}`).get()).data()])));

test('續約交易同時同步三處；重複與並行接續只成功一次', async () => {
  const f = await seed();
  const results = await Promise.all([invoke(f), invoke(f)]);
  assert.equal(results.filter(r => r.promoted).length, 1);
  const d = await read(f.id);
  assert.equal(d.rooms.leaseEnd, '2027-08-21');
  assert.equal(d.tenants.leaseEnd, d.rooms.leaseEnd);
  assert.equal(d.contracts.endDate, d.rooms.leaseEnd);
  assert.equal(d.tenants.rent, 10000);
  assert.equal(d.rooms.price, 9000);
  assert.equal(d.contracts.roomId, f.id);
  assert.equal(d.contracts.pendingRenewal, undefined);
  assert.equal((await invoke(f)).promoted, false);
});
test('保留當期到期日，未到下一期起日不提前接續', async () => {
  const f = await seed();
  assert.equal((await invoke(f, '2026-08-21')).promoted, false);
  await db.doc(`contracts/${f.id}`).update({ 'pendingRenewal.startDate': '2026-10-01' });
  assert.equal((await invoke(f)).promoted, false);
  assert.equal((await read(f.id)).contracts.endDate, '2026-08-21');
  assert.equal(todayInTaipei(new Date('2026-09-12T16:00:00Z')), '2026-09-13');
});
test('房源寫入失敗時三處全數回滾並保留待續約供重試', async () => {
  const f = await seed();
  const store = { collection: (...a) => db.collection(...a), runTransaction: fn => db.runTransaction(tx => fn({
    get: (...a) => tx.get(...a), update: (ref, data) => {
      if (ref.parent.id === 'rooms') throw Error('injected room failure');
      return tx.update(ref, data);
    },
  })) };
  await assert.rejects(invoke(f, '2026-09-13', store), /injected room failure/);
  const d = await read(f.id);
  assert.equal(d.contracts.endDate, '2026-08-21');
  assert.ok(d.contracts.pendingRenewal);
  assert.equal(d.tenants.leaseEnd, '2026-08-21');
  assert.equal((await invoke(f)).promoted, true);
});
test('登入與房東權限由後端驗證，管理員可代管', async () => {
  const f = await seed(), other = await seed();
  await assert.rejects(handlePromoteRenewal(db, FieldValue, { data: { contractId: f.id } }), { code: 'unauthenticated' });
  await assert.rejects(invoke({ ...f, owner: other.owner }), { code: 'permission-denied' });
  await db.doc(`users/${other.owner}`).update({ role: 'admin' });
  assert.equal((await invoke({ ...f, owner: other.owner })).promoted, true);
});
test('缺少租客或同名房源有歧義時，不清除待續約資料', async () => {
  const f = await seed();
  await db.doc(`tenants/${f.id}`).delete();
  await assert.rejects(invoke(f), { code: 'failed-precondition' });
  assert.ok((await read(f.id)).contracts.pendingRenewal);
  const g = await seed();
  await db.doc(`rooms/${randomUUID()}`).set({ landlordId: g.owner, name: '501', status: 'occupied' });
  await assert.rejects(invoke(g), { code: 'failed-precondition' });
  assert.ok((await read(g.id)).contracts.pendingRenewal);
});
test('另一份有效合約或跨房東租客關聯不得同步', async () => {
  const f = await seed();
  await db.doc(`contracts/${randomUUID()}`).set({ landlordId: f.owner, roomNumber: '501', status: 'active' });
  await assert.rejects(invoke(f), { code: 'failed-precondition' });
  const g = await seed();
  await db.doc(`tenants/${g.id}`).update({ landlordId: f.owner });
  await assert.rejects(invoke(g), { code: 'failed-precondition' });
});

test('無效日期或下一期未延長租期時不接續', async () => {
  const f = await seed();
  await db.doc(`contracts/${f.id}`).update({ 'pendingRenewal.endDate': '2026-08-21' });
  await assert.rejects(invoke(f), { code: 'failed-precondition' });
  await db.doc(`contracts/${f.id}`).update({ 'pendingRenewal.endDate': '2027-02-30' });
  await assert.rejects(invoke(f), { code: 'failed-precondition' });
  assert.ok((await read(f.id)).contracts.pendingRenewal);
});
