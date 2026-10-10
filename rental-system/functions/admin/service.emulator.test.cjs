const test = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { handleAdmin, assertAccess, isPaused } = require('./service.cjs')
const { handleSupport } = require('./support.cjs')
const { hash } = require('./policy.cjs')
const { handleLifecycle } = require('./lifecycle.cjs')
if (process.env.GCLOUD_PROJECT !== 'demo-admin-review' || !process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error('僅允許 demo-admin-review 模擬器')
const db = getFirestore(initializeApp({ projectId: 'demo-admin-review' }))
const admin = 'test-admin'
const authStub = { getUsers: async (identifiers) => ({ users: identifiers, notFound: [] }) }
const invoke = (data) => handleAdmin(db, authStub, { auth: { uid: admin }, data })
const request = (uid, data) => ({ auth: { uid }, data })
async function seed() {
  await db.doc(`users/${admin}`).set({ role: 'admin' })
  const lid = randomUUID(),
    tid = randomUUID(),
    rid = randomUUID()
  await db.doc(`users/${lid}`).set({ role: 'landlord', name: '虛構房東' })
  await db.doc(`tenants/${tid}`).set({ landlordId: lid, name: '虛構租客', credit: 0, roomId: rid })
  await db.doc(`rooms/${rid}`).set({ landlordId: lid, name: '101', status: 'vacant' })
  return { lid, tid, rid }
}
const detail = (kind, key) => invoke({ action: 'detail', kind, key })

test('整戶刪除在文件移除後中斷，維護區仍可找到工作並接續附件刪除', async () => {
  const { lid } = await seed()
  await db
    .doc(`properties/${randomUUID()}`)
    .set({
      landlordId: lid,
      photo: 'https://firebasestorage.googleapis.com/v0/b/demo-bucket/o/owned%2Ftest.png?alt=media',
    })
  let attempts = 0
  const bucket = {
    name: 'demo-bucket',
    file: () => ({
      delete: async () => {
        if (++attempts === 1) throw new Error('暫時無法刪除附件')
      },
    }),
  }
  const auth = {
    updateUser: async () => {},
    revokeRefreshTokens: async () => {},
    deleteUser: async () => {},
  }
  const run = (data) =>
    handleLifecycle(db, auth, bucket, request(admin, { landlordId: lid, ...data }))
  const plan = await run({ action: 'deletePreview' })
  const data = {
    action: 'deleteExecute',
    operationId: randomUUID(),
    reason: '測試中斷恢復',
    version: plan.version,
    confirmation: plan.confirmation,
  }
  await assert.rejects(run(data), /附件/)
  assert.equal((await db.doc(`users/${lid}`).get()).exists, false)
  assert.ok((await invoke({ action: 'deletionJobs' })).items.some((j) => j.id === data.operationId))
  await run(data)
  assert.equal((await db.doc(`platform_accounts/${lid}`).get()).data().mode, 'deleted')
  assert.equal(attempts, 2)
  assert.ok(
    !(await invoke({ action: 'deletionJobs' })).items.some((j) => j.id === data.operationId)
  )
})

test('LINE 重試使用相同識別碼，已接受的重複推播視為成功', async () => {
  const { deliver } = require('./support.cjs')
  const { lid } = await seed()
  const key = randomUUID()
  await db.doc('platform_private/line').set({ channelAccessToken: '虛構測試憑證' })
  await db.doc(`platform_line_bindings/${lid}`).set({ lineUserId: '虛構LINE帳號' })
  await db.doc(`platform_notifications/${key}`).set({
    recipientId: lid,
    lineStatus: 'pending',
    message: '測試提醒',
    path: '/landlord/support',
  })
  const keys = []
  const line = {
    messagingApi: {
      MessagingApiClient: class {
        async pushMessage(_message, retryKey) {
          keys.push(retryKey)
          throw Object.assign(new Error('測試錯誤'), { status: keys.length === 1 ? 503 : 409 })
        }
      },
    },
  }
  await assert.rejects(deliver(db, line, key))
  assert.equal((await db.doc(`platform_notifications/${key}`).get()).data().lineStatus, 'failed')
  await deliver(db, line, key)
  await deliver(db, line, key)
  assert.equal(keys.length, 2)
  assert.equal(keys[0], keys[1])
  assert.equal((await db.doc(`platform_notifications/${key}`).get()).data().lineStatus, 'sent')
})

test('排程續約維持目前租期，取消後才能編輯目前租期', async () => {
  const { lid, tid, rid } = await seed()
  const key = randomUUID()
  await db.doc(`contracts/${key}`).set({
    landlordId: lid,
    tenantDocId: tid,
    roomId: rid,
    status: 'active',
    startDate: '2026-10-01',
    endDate: '2027-09-30',
    rent: 5000,
  })
  await db.doc(`tenants/${tid}`).update({ contractId: key })
  const run = async (operation, input, patch) =>
    invoke({
      action: 'mutate',
      kind: 'contracts',
      key,
      operation,
      input,
      patch,
      version: (await detail('contracts', key)).version,
      operationId: randomUUID(),
      reason: '測試續約排程',
    })
  await run('renew', { startDate: '2027-10-01', endDate: '2028-09-30', rent: 5500 })
  assert.equal((await detail('contracts', key)).endDate, '2027-09-30')
  assert.equal((await detail('contracts', key)).pendingRenewal.rent, 5500)
  await assert.rejects(run('edit', undefined, { rent: 5600 }))
  await run('cancelRenewal')
  assert.equal((await detail('contracts', key)).pendingRenewal, null)
})

test('簽署確認驗證重疊預覽並保留已取代原件，簽署時間使用 Timestamp', async () => {
  const { lid } = await seed()
  const key = randomUUID(),
    old = randomUUID()
  const signature = 'data:image/png;base64,iVBORw0KGgo='
  const base = {
    landlordUid: lid,
    tenantId: 'TEST0001',
    startDate: '2026-10-01',
    endDate: '2027-09-30',
    signature,
  }
  await db.doc(`signed_contracts/${old}`).set({ ...base, status: 'signed' })
  await db.doc(`signed_contracts/${key}`).set({ ...base, status: 'awaiting_landlord' })
  const preview = await invoke({ action: 'signedPreview', key })
  assert.equal(preview.items.length, 1)
  const input = { signature, overlapVersion: preview.version }
  const data = {
    action: 'mutate',
    kind: 'signed_contracts',
    key,
    operation: 'confirm',
    input,
    reason: '測試房東核對',
    operationId: randomUUID(),
    version: (await detail('signed_contracts', key)).version,
  }
  await invoke(data)
  assert.equal((await detail('signed_contracts', old)).supersededBy, key)
  assert.ok((await db.doc(`signed_contracts/${key}`).get()).data().signedAt.toMillis())
  assert.equal((await invoke(data)).replayed, true)
  const log = (await db.doc(`admin_audit/${data.operationId}`).get()).data()
  assert.equal(log.after.landlordSignature.sha256, hash(signature))
  assert.equal(JSON.stringify(log).includes(signature), false)
})

test('租客登入帳號建立、停用、密碼重設及啟用連結可重試，稽核不存密碼', async () => {
  const { handleTenantAccount } = require('./accounts.cjs')
  const { getAuth } = require('firebase-admin/auth')
  const auth = getAuth()
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('需要 Auth 模擬器')
  const { tid, lid } = await seed()
  const billKey = randomUUID(),
    leaseKey = randomUUID()
  await db
    .doc(`bills/${billKey}`)
    .set({
      landlordId: lid,
      relatedTenantDocId: tid,
      tenantId: null,
      amount: 100,
      status: 'pending',
    })
  await db.doc(`contracts/${leaseKey}`).set({ landlordId: lid, tenantDocId: tid, tenantId: null })
  await db.doc(`tenants/${tid}`).update({
    phone: '09' + String(parseInt(randomUUID().slice(0, 8), 16) % 100000000).padStart(8, '0'),
    idNumber: 'TEST000123',
  })
  const run = async (operation, extra = {}) => {
    const data = {
      key: tid,
      operation,
      operationId: randomUUID(),
      version: (await detail('tenants', tid)).version,
      reason: '測試登入帳號',
      ...extra,
    }
    return { data, result: await handleTenantAccount(db, auth, request(admin, data)) }
  }
  const created = await run('create')
  assert.equal((await handleTenantAccount(db, auth, request(admin, created.data))).replayed, true)
  const uid = (await detail('tenants', tid)).uid
  assert.equal((await detail('bills', billKey)).tenantId, uid)
  assert.equal((await detail('contracts', leaseKey)).tenantId, uid)
  assert.equal((await auth.getUser(uid)).disabled, false)
  await run('disabled', { disabled: true })
  assert.equal((await auth.getUser(uid)).disabled, true)
  await run('disabled', { disabled: false })
  await run('reset', { password: 'NewTestPass123!' })
  const activation = await run('activation')
  assert.match(activation.result.url, /\/activate\/[a-f0-9]{64}$/)
  const log = await db.doc(`admin_audit/${activation.data.operationId}`).get()
  assert.equal(JSON.stringify(log.data()).includes('NewTestPass'), false)
  assert.equal((await db.doc(`platform_account_locks/${tid}`).get()).exists, false)
})

test('帳號配對只能使用未配對租客，跨房東遭拒絕', async () => {
  const { handleTenantAccount } = require('./accounts.cjs')
  const { tid, lid } = await seed()
  const other = await seed()
  const uid = randomUUID()
  await db.doc(`users/${uid}`).set({ role: 'tenant', landlordId: other.lid })
  const data = {
    key: tid,
    operation: 'pair',
    uid,
    operationId: randomUUID(),
    version: (await detail('tenants', tid)).version,
    reason: '測試配對',
  }
  await assert.rejects(handleTenantAccount(db, {}, request(admin, data)))
  await db.doc(`users/${uid}`).update({ landlordId: null })
  await handleTenantAccount(db, {}, request(admin, data))
  assert.equal((await detail('tenants', tid)).uid, uid)
  assert.equal((await db.doc(`users/${uid}`).get()).data().landlordId, lid)
})
test('刪除預覽變動後拒絕舊確認，整戶刪除保留租客帳號並解除關聯', async () => {
  const { lid, tid } = await seed()
  const uid = randomUUID()
  await db.doc(`users/${uid}`).set({ role: 'tenant', landlordId: lid })
  await db.doc(`tenants/${tid}`).update({ uid })
  const calls = []
  const auth = {
    updateUser: async (uid) => calls.push(['disable', uid]),
    revokeRefreshTokens: async () => {},
    deleteUser: async (uid) => calls.push(['delete', uid]),
  }
  const bucket = { name: 'demo-bucket', file: () => ({ delete: async () => {} }) }
  const run = (data) =>
    handleLifecycle(db, auth, bucket, request(admin, { landlordId: lid, ...data }))
  const p = await run({ action: 'deletePreview' })
  assert.equal(p.preservedAccounts, 1)
  await db.doc(`bills/${randomUUID()}`).set({ landlordId: lid, amount: 100 })
  await assert.rejects(
    run({
      action: 'deleteExecute',
      operationId: randomUUID(),
      version: p.version,
      confirmation: p.confirmation,
      reason: '測試刪除',
    })
  )
  const next = await run({ action: 'deletePreview' })
  const data = {
    action: 'deleteExecute',
    operationId: randomUUID(),
    version: next.version,
    confirmation: next.confirmation,
    reason: '測試刪除',
  }
  await run(data)
  assert.equal((await db.doc(`users/${uid}`).get()).data().landlordId, null)
  assert.equal((await db.doc(`tenants/${tid}`).get()).exists, false)
  assert.deepEqual(
    calls.filter((x) => x[0] === 'delete'),
    [['delete', lid]]
  )
  assert.equal((await run(data)).replayed, true)
})
test('整戶暫停時拒絕補開帳單，恢復後可預覽', async () => {
  const { lid } = await seed()
  await db.doc(`platform_accounts/${lid}`).set({ mode: 'all' })
  const run = () =>
    handleLifecycle(
      db,
      {},
      {},
      request(admin, { action: 'billingPreview', landlordId: lid, month: '2026-10' })
    )
  await assert.rejects(run())
  await db.doc(`platform_accounts/${lid}`).set({ mode: 'active' })
  assert.ok(Array.isArray((await run()).plans))
})
test('非管理員無法跨房東查詢或修改', async () => {
  const { lid } = await seed()
  await assert.rejects(handleAdmin(db, authStub, request(lid, { action: 'list', kind: 'users' })), {
    code: 'permission-denied',
  })
})
test('修改驗證版本、記錄前後內容，重試不重複寫入', async () => {
  const { tid } = await seed()
  const t = await detail('tenants', tid)
  const data = {
    action: 'mutate',
    kind: 'tenants',
    key: tid,
    operation: 'edit',
    patch: { name: '修改後' },
    version: t.version,
    operationId: randomUUID(),
  }
  await invoke(data)
  assert.equal((await detail('tenants', tid)).name, '修改後')
  assert.equal((await invoke(data)).replayed, true)
  await assert.rejects(invoke({ ...data, operationId: randomUUID() }), { code: 'aborted' })
  const audit = (await db.doc(`admin_audit/${data.operationId}`).get()).data()
  assert.equal(audit.before.name, '虛構租客')
  assert.equal(audit.after.name, '修改後')
})
test('收款依帳齡沖銷，溢繳入預收，重試不重複收款', async () => {
  const { tid, lid } = await seed()
  const a = randomUUID(),
    b = randomUUID()
  for (const [key, amount, date] of [
    [a, 100, '2026-08-01'],
    [b, 200, '2026-09-01'],
  ])
    await db.doc(`bills/${key}`).set({
      landlordId: lid,
      relatedTenantDocId: tid,
      type: 'income',
      amount,
      date,
      status: 'pending',
    })
  const t = await detail('tenants', tid)
  const data = {
    action: 'mutate',
    operation: 'collect',
    kind: 'tenants',
    key: tid,
    version: t.version,
    operationId: randomUUID(),
    reason: '登記測試收款',
    input: { amount: 350, date: '2026-10-10' },
  }
  await invoke(data)
  assert.equal((await detail('bills', a)).paidAmount, 100)
  assert.equal((await detail('bills', b)).paidAmount, 200)
  assert.equal((await detail('tenants', tid)).credit, 50)
  await invoke(data)
  assert.equal((await detail('tenants', tid)).credit, 50)
})
test('撤銷預收沖抵會退回餘額，已撤銷收款不可再次撤銷', async () => {
  const { tid, lid } = await seed()
  const key = randomUUID()
  await db.doc(`bills/${key}`).set({
    landlordId: lid,
    relatedTenantDocId: tid,
    type: 'income',
    amount: 100,
    status: 'completed',
    paidAmount: 100,
    payments: [{ amount: 100, source: 'credit', date: '2026-10-01' }],
  })
  const data = {
    action: 'mutate',
    operation: 'reverse',
    kind: 'bills',
    key,
    version: (await detail('bills', key)).version,
    operationId: randomUUID(),
    reason: '撤銷錯誤沖抵',
    input: { paymentIndex: 0 },
  }
  await invoke(data)
  assert.equal((await detail('tenants', tid)).credit, 100)
  assert.equal((await detail('bills', key)).paidAmount, 0)
  await assert.rejects(
    invoke({ ...data, operationId: randomUUID(), version: (await detail('bills', key)).version })
  )
})
test('已收款帳單禁止直接修改金額與作廢', async () => {
  const { lid } = await seed()
  const key = randomUUID()
  await db
    .doc(`bills/${key}`)
    .set({ landlordId: lid, type: 'income', amount: 100, status: 'completed' })
  const version = (await detail('bills', key)).version
  for (const operation of ['edit', 'void'])
    await assert.rejects(
      invoke({
        action: 'mutate',
        operation,
        kind: 'bills',
        key,
        version,
        operationId: randomUUID(),
        reason: '測試',
        patch: { amount: 10 },
      })
    )
})
test('只停用房東不影響租客，整戶停用同時限制租客', async () => {
  const { lid } = await seed()
  const uid = randomUUID()
  await db.doc(`users/${uid}`).set({ role: 'tenant', landlordId: lid })
  let state = await detail('platform_accounts', lid)
  await invoke({
    action: 'account',
    landlordId: lid,
    mode: 'landlord',
    archived: false,
    version: state.version,
    operationId: randomUUID(),
    reason: '測試停用',
  })
  await assert.rejects(assertAccess(db, lid), { code: 'permission-denied' })
  await assertAccess(db, uid)
  assert.equal(await isPaused(db, lid), false)
  state = await detail('platform_accounts', lid)
  await invoke({
    action: 'account',
    landlordId: lid,
    mode: 'all',
    archived: false,
    version: state.version,
    operationId: randomUUID(),
    reason: '測試整戶暫停',
  })
  await assert.rejects(assertAccess(db, uid), { code: 'permission-denied' })
  assert.equal(await isPaused(db, lid), true)
})
test('案件限制歸屬，留言重試不重複，結案後不可留言', async () => {
  const { lid } = await seed()
  const operationId = randomUUID()
  const create = { action: 'create', title: '虛構求助', text: '測試問題', operationId }
  await handleSupport(db, request(lid, create))
  assert.equal((await handleSupport(db, request(lid, create))).replayed, true)
  const other = await seed()
  await assert.rejects(
    handleSupport(db, request(other.lid, { action: 'detail', key: operationId })),
    { code: 'not-found' }
  )
  await handleSupport(
    db,
    request(admin, {
      action: 'status',
      key: operationId,
      status: 'closed',
      operationId: randomUUID(),
    })
  )
  await assert.rejects(
    handleSupport(
      db,
      request(lid, { action: 'reply', key: operationId, text: '回覆', operationId: randomUUID() })
    )
  )
})
test('新增租約同步房源租客，重複出租遭拒絕', async () => {
  const { lid, tid, rid } = await seed()
  const operationId = randomUUID()
  await invoke({
    action: 'domain',
    operation: 'create',
    kind: 'contracts',
    landlordId: lid,
    operationId,
    reason: '建立測試租約',
    patch: {
      tenantDocId: tid,
      roomId: rid,
      startDate: '2026-10-01',
      endDate: '2027-09-30',
      rent: 5000,
    },
  })
  assert.equal((await detail('rooms', rid)).status, 'occupied')
  assert.equal((await detail('tenants', tid)).contractId, operationId)
  await assert.rejects(
    invoke({
      action: 'domain',
      operation: 'create',
      kind: 'contracts',
      landlordId: lid,
      operationId: randomUUID(),
      reason: '重複租約',
      patch: {
        tenantDocId: tid,
        roomId: rid,
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        rent: 5000,
      },
    })
  )
})
test('租約異動以交易同步租客與房源', async () => {
  const { lid, tid, rid } = await seed()
  const key = randomUUID()
  await db.doc(`contracts/${key}`).set({
    landlordId: lid,
    tenantDocId: tid,
    roomId: rid,
    roomNumber: '101',
    status: 'active',
    startDate: '2026-10-01',
    endDate: '2027-09-30',
    rent: 5000,
  })
  await db.doc(`tenants/${tid}`).update({ contractId: key })
  await db.doc(`rooms/${rid}`).update({ status: 'occupied' })
  await invoke({
    action: 'mutate',
    kind: 'contracts',
    key,
    operation: 'edit',
    patch: { rent: 5500, endDate: '2028-09-30' },
    version: (await detail('contracts', key)).version,
    operationId: randomUUID(),
    reason: '調整測試租期',
  })
  assert.equal((await detail('tenants', tid)).rent, 5500)
  assert.equal((await detail('rooms', rid)).leaseEnd, '2028-09-30')
})
test('退租同步結束租約與房源，押金首月租金不重退', async () => {
  const { lid, tid, rid } = await seed()
  const key = randomUUID()
  await db.doc(`contracts/${key}`).set({
    landlordId: lid,
    tenantDocId: tid,
    roomId: rid,
    status: 'active',
    deposits: [
      { label: '押金', amount: 1000, status: 'paid' },
      { label: '首月租金', amount: 500, status: 'paid' },
    ],
  })
  await db.doc(`tenants/${tid}`).update({
    contractId: key,
    room: '101',
    leaseStart: '2026-10-01',
    leaseEnd: '2027-09-30',
    credit: 100,
  })
  await db.doc(`rooms/${rid}`).update({ status: 'occupied', lastMeterReading: 10 })
  const operationId = randomUUID()
  await invoke({
    action: 'domain',
    operation: 'moveout',
    landlordId: lid,
    key: tid,
    version: (await detail('tenants', tid)).version,
    operationId,
    reason: '測試退租',
    payload: {
      moveOutDate: '2026-10-10',
      moveOutReason: 'early',
      depositPaid: 1000,
      creditRefund: 100,
      electricitySettlement: 50,
      waterSettlement: 0,
      depositRefund: 1050,
      deductions: [],
      finalMeterReading: 20,
    },
  })
  assert.equal((await detail('rooms', rid)).status, 'vacant')
  assert.equal((await detail('tenants', tid)).credit, 0)
  assert.equal((await detail('contracts', key)).status, 'terminated')
  assert.equal((await detail('bills', operationId)).amount, 1050)
})
