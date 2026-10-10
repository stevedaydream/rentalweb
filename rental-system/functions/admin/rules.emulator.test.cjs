const test = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { initializeApp: initializeAdmin } = require('firebase-admin/app')
const { getFirestore: getAdminFirestore } = require('firebase-admin/firestore')
const { initializeApp, deleteApp } = require('firebase/app')
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } = require('firebase/auth')
const {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} = require('firebase/firestore')
const {
  getStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
  getBytes,
} = require('firebase/storage')
if (
  process.env.GCLOUD_PROJECT !== 'demo-admin-review' ||
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST
)
  throw new Error('僅允許本機 demo-admin-review')
const admin = getAdminFirestore(
  initializeAdmin({
    projectId: 'demo-admin-review',
    storageBucket: 'demo-admin-review.firebasestorage.app',
  })
)
const clients = []
async function client(role, landlordId) {
  const app = initializeApp(
    {
      projectId: 'demo-admin-review',
      apiKey: 'demo-key',
      storageBucket: 'demo-admin-review.firebasestorage.app',
    },
    randomUUID()
  )
  clients.push(app)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://' + process.env.FIREBASE_AUTH_EMULATOR_HOST, {
    disableWarnings: true,
  })
  const credential = await createUserWithEmailAndPassword(
    auth,
    `${randomUUID()}@example.test`,
    'TestPass123!'
  )
  const db = getFirestore(app)
  connectFirestoreEmulator(
    db,
    ...[
      process.env.FIRESTORE_EMULATOR_HOST.split(':')[0],
      Number(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1]),
    ]
  )
  const storage = getStorage(app)
  connectStorageEmulator(
    storage,
    ...[
      process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(':')[0],
      Number(process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(':')[1]),
    ]
  )
  if (role)
    await admin
      .doc(`users/${credential.user.uid}`)
      .set({ role, ...(landlordId ? { landlordId } : {}) })
  return { app, db, storage, uid: credential.user.uid }
}
test.after(async () => {
  for (const app of clients) await deleteApp(app)
})
test('公開註冊無法建立管理員角色，仍可建立房東角色', async () => {
  const c = await client()
  await assert.rejects(setDoc(doc(c.db, 'users', c.uid), { role: 'admin' }))
  await setDoc(doc(c.db, 'users', c.uid), { role: 'landlord' })
})
test('房東不能替其他人升級角色，租客不能自行改房東', async () => {
  const l = await client('landlord'),
    t = await client('tenant', l.uid)
  await assert.rejects(updateDoc(doc(l.db, 'users', t.uid), { role: 'admin' }))
  await assert.rejects(updateDoc(doc(t.db, 'users', t.uid), { landlordId: 'other' }))
})
test('服務狀態只能由後端維護，整戶停用後拒絕業務讀寫但可讀自己帳號', async () => {
  const l = await client('landlord'),
    t = await client('tenant', l.uid)
  await assert.rejects(setDoc(doc(l.db, 'platform_accounts', l.uid), { mode: 'active' }))
  const key = randomUUID()
  await admin.doc(`bills/${key}`).set({ landlordId: l.uid, tenantId: t.uid, amount: 100 })
  await getDoc(doc(t.db, 'bills', key))
  await admin.doc(`platform_accounts/${l.uid}`).set({ mode: 'all' })
  await assert.rejects(getDoc(doc(t.db, 'bills', key)))
  await getDoc(doc(t.db, 'users', t.uid))
  await assert.rejects(updateDoc(doc(l.db, 'users', l.uid), { name: '繞過停用' }))
})
test('站內通知與稽核不可由客戶端偽造', async () => {
  const a = await client('admin')
  await assert.rejects(setDoc(doc(a.db, 'admin_audit', randomUUID()), { reason: '偽造' }))
  await assert.rejects(
    setDoc(doc(a.db, 'platform_notifications', randomUUID()), {
      recipientId: a.uid,
      message: '偽造',
    })
  )
})
test('求助附件僅參與者可讀，泛用 Storage 規則不可繞過', async () => {
  const l = await client('landlord'),
    other = await client('landlord'),
    a = await client('admin')
  const operationId = randomUUID()
  const path = `platform_support/${a.uid}/${operationId}/0`
  await uploadBytes(ref(a.storage, path), new Uint8Array([1, 2, 3]), { contentType: 'image/png' })
  await admin.doc(`platform_attachment_access/${operationId}`).set({ landlordId: l.uid })
  await getBytes(ref(l.storage, path))
  await assert.rejects(getBytes(ref(other.storage, path)))
  await assert.rejects(
    uploadBytes(
      ref(l.storage, `platform_support/${l.uid}/${randomUUID()}/0`),
      new Uint8Array([1]),
      { contentType: 'text/html' }
    )
  )
})

test('一般附件正常可用，整戶停用阻擋一般附件但保留平台求助', async () => {
  const l = await client('landlord')
  const ordinary = ref(l.storage, `contracts/${randomUUID()}/test.png`)
  await uploadBytes(ordinary, new Uint8Array([1, 2, 3]), { contentType: 'image/png' })
  await getBytes(ordinary)
  await admin.doc(`platform_accounts/${l.uid}`).set({ mode: 'all' })
  await assert.rejects(getBytes(ordinary))
  await assert.rejects(uploadBytes(ordinary, new Uint8Array([4]), { contentType: 'image/png' }))
  await uploadBytes(
    ref(l.storage, `platform_support/${l.uid}/${randomUUID()}/0`),
    new Uint8Array([1]),
    { contentType: 'image/png' }
  )
})
