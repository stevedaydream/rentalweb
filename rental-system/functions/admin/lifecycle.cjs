const { FieldValue } = require('firebase-admin/firestore')
const { fail, id, hash, today, assertReason } = require('./policy.cjs')
const { caller, readAll, audit, notify } = require('./service.cjs')
const OWNED = [
  'properties',
  'rooms',
  'tenants',
  'bills',
  'contracts',
  'repair_requests',
  'maintenance',
  'announcements',
  'taipower_bills',
  'water_bills',
  'billing_runs',
  'data_imports',
  'messages',
  'meter_readings',
  'moveOutRecords',
  'receipts',
  'onboarding_invites',
  'payment_proofs',
  'bill_generate_logs',
  'inspections',
  'property_costs',
  'meter_groups',
  'public_meters',
  'tenant_activations',
  'contract_sign_links',
  'platform_account_jobs',
]
async function deletionPlan(db, bucket, landlordId) {
  const docs = new Map()
  const add = (kind, row) =>
    docs.set(`${kind}/${row.id}`, { path: `${kind}/${row.id}`, version: row.version })
  const tenantRows = await readAll(db.collection('tenants').where('landlordId', '==', landlordId))
  const accountRows = await readAll(db.collection('users').where('landlordId', '==', landlordId))
  const uidSet = new Set([
    ...accountRows.map((t) => t.id),
    ...tenantRows.map((t) => t.uid).filter(Boolean),
  ])
  const values = []
  for (const kind of OWNED)
    for (const row of await readAll(db.collection(kind).where('landlordId', '==', landlordId))) {
      add(kind, row)
      values.push(row)
    }
  for (const row of await readAll(
    db.collection('signed_contracts').where('landlordUid', '==', landlordId)
  )) {
    add('signed_contracts', row)
    values.push(row)
  }
  for (const kind of [
    'settings',
    'line_configs',
    'public_profiles',
    'contract_templates',
    'users',
    'platform_line_bindings',
  ]) {
    const snap = await db.collection(kind).doc(landlordId).get()
    if (snap.exists) {
      add(kind, { id: landlordId, version: hash(snap.data()) })
      values.push(snap.data())
    }
  }
  for (const kind of ['line_bindings', 'platform_line_codes'])
    for (const row of await readAll(db.collection(kind).where('uid', '==', landlordId)))
      add(kind, row)
  for (const t of tenantRows)
    for (const row of await readAll(
      db.collection('tenant_activations').where('tenantDocId', '==', t.id)
    ))
      add('tenant_activations', row)
  for (const row of await readAll(
    db.collection('platform_attachment_access').where('landlordId', '==', landlordId)
  ))
    add('platform_attachment_access', row)
  for (const row of await readAll(
    db.collection('platform_tickets').where('landlordId', '==', landlordId)
  )) {
    add('platform_tickets', row)
    for (const m of await readAll(
      db.collection('platform_tickets').doc(row.id).collection('messages')
    )) {
      add(`platform_tickets/${row.id}/messages`, m)
      values.push(m)
    }
  }
  const storagePaths = new Set()
  const walk = (value) => {
    if (typeof value === 'string') {
      const m = value.match(
        /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)/
      )
      if (m && m[1] === bucket.name) storagePaths.add(decodeURIComponent(m[2]))
      if (value.startsWith('platform_support/')) storagePaths.add(value)
    } else if (Array.isArray(value)) value.forEach(walk)
    else if (value && typeof value === 'object') Object.values(value).forEach(walk)
  }
  values.forEach(walk)
  if (bucket.getFiles) {
    const inspectionIds = [...docs.keys()]
      .filter((p) => p.startsWith('inspections/'))
      .map((p) => p.split('/')[1])
    const prefixes = [
      `paper_contracts/${landlordId}/`,
      `building-maps/${landlordId}/`,
      `property_costs/${landlordId}/`,
      `platform_support/${landlordId}/`,
      ...inspectionIds.map((key) => `inspections/${key}/`),
    ]
    for (const prefix of prefixes) {
      const [files] = await bucket.getFiles({ prefix, maxResults: 20001, autoPaginate: false })
      if (files.length > 20000) fail('附件數量超過掃描上限，請先分批整理', 'resource-exhausted')
      files.forEach((file) => storagePaths.add(file.name))
    }
  }
  const items = [...docs.values()].sort((a, b) => a.path.localeCompare(b.path))
  const preservedAccounts = [...uidSet].sort()
  const files = [...storagePaths].sort()
  const summary = items.reduce((a, d) => {
    const kind = d.path.split('/')[0]
    a[kind] = (a[kind] || 0) + 1
    return a
  }, {})
  return {
    items,
    preservedAccounts,
    files,
    summary,
    version: hash({ items, preservedAccounts, files }),
  }
}
async function handleLifecycle(db, auth, bucket, request) {
  await caller(db, request)
  const { action, landlordId, operationId, reason } = request.data || {}
  if (!id(landlordId)) fail('房東格式錯誤', 'invalid-argument')
  if (action === 'deletePreview') {
    const landlord = await db.collection('users').doc(landlordId).get()
    if (landlord.data()?.role !== 'landlord') fail('找不到房東')
    const plan = await deletionPlan(db, bucket, landlordId)
    return {
      summary: plan.summary,
      total: plan.items.length,
      preservedAccounts: plan.preservedAccounts.length,
      fileCount: plan.files.length,
      version: plan.version,
      confirmation: `刪除 ${landlordId}`,
    }
  }
  if (action === 'deleteExecute') {
    assertReason(reason)
    if (!id(operationId) || request.data.confirmation !== `刪除 ${landlordId}`)
      fail('確認文字不符', 'invalid-argument')
    const jobRef = db.collection('platform_delete_jobs').doc(operationId)
    let job = (await jobRef.get()).data()
    if (job && (job.landlordId !== landlordId || job.actorId !== request.auth.uid))
      fail('無權重試此刪除工作')
    if (!job) {
      const locks = await db
        .collection('platform_account_locks')
        .where('landlordId', '==', landlordId)
        .limit(1)
        .get()
      if (!locks.empty) fail('此房東尚有未完成的租客帳號操作，請先完成原操作再刪除')
      const plan = await deletionPlan(db, bucket, landlordId)
      if (plan.version !== request.data.version) fail('刪除範圍已變動，請重新預覽')
      const manifest = [
        ...plan.items.map((value) => ({ type: 'document', value })),
        ...plan.files.map((value) => ({ type: 'file', value })),
        ...plan.preservedAccounts.map((value) => ({ type: 'account', value })),
      ]
      const pages = []
      for (let i = 0; i < manifest.length; i += 200) pages.push(manifest.slice(i, i + 200))
      if (pages.length > 400) fail('刪除範圍超過單次工作上限，請分批處理', 'resource-exhausted')
      await db.runTransaction(async (tx) => {
        const state = await tx.get(db.collection('platform_accounts').doc(landlordId))
        const concurrent = await tx.get(jobRef)
        const locks = await tx.get(
          db.collection('platform_account_locks').where('landlordId', '==', landlordId).limit(1)
        )
        if (!locks.empty) fail('此房東尚有未完成的帳號操作')
        if (concurrent.exists || ['deleting', 'deleted'].includes(state.data()?.mode))
          fail('已有刪除工作正在執行')
        tx.set(db.collection('platform_accounts').doc(landlordId), {
          mode: 'deleting',
          jobId: operationId,
        })
        tx.create(jobRef, {
          landlordId,
          actorId: request.auth.uid,
          reason,
          summary: plan.summary,
          version: plan.version,
          phase: 'started',
          createdAt: FieldValue.serverTimestamp(),
        })
        pages.forEach((entries, i) =>
          tx.create(jobRef.collection('manifest').doc(String(i)), { entries })
        )
      })
      job = (await jobRef.get()).data()
    }
    if (job.phase === 'done') return { ok: true, replayed: true }
    const manifestPages = await jobRef.collection('manifest').get()
    const entries = manifestPages.docs.flatMap((d) => d.data().entries)
    job.items = entries.filter((e) => e.type === 'document').map((e) => e.value)
    job.files = entries.filter((e) => e.type === 'file').map((e) => e.value)
    job.preservedAccounts = entries.filter((e) => e.type === 'account').map((e) => e.value)
    // 先阻擋登入與新作業；失敗時保留工作清單，可用同一識別碼重試。
    try {
      await auth.updateUser(landlordId, { disabled: true })
      await auth.revokeRefreshTokens(landlordId)
    } catch (e) {
      if (e.code !== 'auth/user-not-found') throw e
    }
    for (const uid of job.preservedAccounts) {
      const ref = db.collection('users').doc(uid)
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        if (snap.exists && snap.data().landlordId === landlordId)
          tx.update(ref, {
            landlordId: null,
            roomId: FieldValue.delete(),
            boundLandlordCode: FieldValue.delete(),
          })
      })
    }
    // 執行前再次掃描，收回開始刪除前已在途的衍生文件。
    const current = await deletionPlan(db, bucket, landlordId)
    const paths = [...new Set([...job.items, ...current.items].map((x) => x.path))]
    for (let i = 0; i < paths.length; i += 400) {
      const batch = db.batch()
      paths.slice(i, i + 400).forEach((p) => batch.delete(db.doc(p)))
      await batch.commit()
    }
    for (const name of new Set([...job.files, ...current.files]))
      await bucket.file(name).delete({ ignoreNotFound: true })
    try {
      await auth.deleteUser(landlordId)
    } catch (e) {
      if (e.code !== 'auth/user-not-found') throw e
    }
    const batch = db.batch()
    batch.set(db.collection('platform_accounts').doc(landlordId), {
      mode: 'deleted',
      deletedAt: FieldValue.serverTimestamp(),
    })
    batch.update(jobRef, {
      phase: 'done',
      finishedAt: FieldValue.serverTimestamp(),
      items: FieldValue.delete(),
      files: FieldValue.delete(),
      preservedAccounts: FieldValue.delete(),
    })
    batch.set(db.collection('admin_audit').doc(operationId), {
      actorId: request.auth.uid,
      reason,
      action: 'delete',
      kind: 'users',
      key: landlordId,
      landlordId,
      summary: job.summary,
      at: FieldValue.serverTimestamp(),
    })
    await batch.commit()
    for (let i = 0; i < manifestPages.docs.length; i += 400) {
      const cleanup = db.batch()
      manifestPages.docs.slice(i, i + 400).forEach((d) => cleanup.delete(d.ref))
      await cleanup.commit()
    }
    return { ok: true }
  }
  if (action === 'billingPreview' || action === 'billingCommit') {
    const { handleBilling } = await import('../billing/service.mjs')
    const state = (await db.collection('platform_accounts').doc(landlordId).get()).data() || {}
    if (state.mode && state.mode !== 'active') fail('請先恢復房東服務，再補開帳單')
    if (action === 'billingPreview')
      return handleBilling(db, FieldValue, {
        ...request,
        data: { landlordId, month: request.data.month, mode: 'preview' },
      })
    assertReason(reason)
    if (!id(operationId) || typeof request.data.notify !== 'boolean')
      fail('補帳格式錯誤', 'invalid-argument')
    return handleBilling(db, FieldValue, {
      ...request,
      data: {
        ...request.data,
        mode: 'commit',
        adminReason: reason,
        suppressNotification: !request.data.notify,
      },
    })
  }
  fail('未知服務操作', 'invalid-argument')
}
module.exports = { deletionPlan, handleLifecycle }
