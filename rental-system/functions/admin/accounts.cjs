const { FieldValue } = require('firebase-admin/firestore')
const { caller, audit, notify, serialize } = require('./service.cjs')
const { fail, id, hash, assertReason } = require('./policy.cjs')
const crypto = require('node:crypto')
async function linkedDocuments(db, key, landlordId, tx) {
  const read = (q) => (tx ? tx.get(q) : q.get())
  const groups = await Promise.all([
    read(db.collection('contracts').where('tenantDocId', '==', key).limit(301)),
    read(db.collection('bills').where('relatedTenantDocId', '==', key).limit(301)),
  ])
  const docs = groups.flatMap((s) => s.docs)
  if (docs.length > 300) fail('租客關聯文件超過帳號操作上限，請先整理歷史資料')
  if (docs.some((d) => d.data().landlordId !== landlordId)) fail('租客關聯文件跨房東，請先查明異常')
  return docs
}
async function handleTenantAccount(db, auth, request) {
  await caller(db, request)
  const { key, operation = 'status', operationId, reason } = request.data || {}
  if (!id(key)) fail('租客格式錯誤')
  const tenantRef = db.collection('tenants').doc(key)
  const snap = await tenantRef.get()
  let tenant = snap.data()
  if (!tenant) fail('租客不存在', 'not-found')
  if (operation === 'candidates') {
    const { readAll } = require('./service.cjs')
    const users = await readAll(db.collection('users').where('role', '==', 'tenant'))
    const assigned = new Set(
      (await readAll(db.collection('tenants'))).map((t) => t.uid).filter(Boolean)
    )
    return {
      items: users
        .filter((u) => (!u.landlordId || u.landlordId === tenant.landlordId) && !assigned.has(u.id))
        .map((u) => ({ id: u.id, name: u.name || '', email: u.email || '' })),
    }
  }
  if (operation === 'pair') {
    assertReason(reason)
    if (!id(operationId) || !id(request.data.uid)) fail('請選擇租客登入帳號')
    return db.runTransaction(async (tx) => {
      const uid = request.data.uid
      const [previous, current, user, others, contracts, state] = await Promise.all([
        tx.get(db.doc(`admin_audit/${operationId}`)),
        tx.get(tenantRef),
        tx.get(db.doc(`users/${uid}`)),
        tx.get(db.collection('tenants').where('uid', '==', uid)),
        tx.get(db.collection('contracts').where('tenantDocId', '==', key)),
        tx.get(db.doc(`platform_accounts/${tenant.landlordId}`)),
      ])
      const payloadHash = hash({ key, uid, reason })
      if (previous.exists) {
        if (previous.data().payloadHash !== payloadHash) fail('操作識別碼已使用')
        return { ok: true, replayed: true }
      }
      if (['deleting', 'deleted'].includes(state.data()?.mode)) fail('房東正在刪除')
      if (hash(current.data()) !== request.data.version || current.data().uid)
        fail('租客已更新或已有登入帳號')
      if (
        user.data()?.role !== 'tenant' ||
        (user.data().landlordId && user.data().landlordId !== tenant.landlordId) ||
        !others.empty
      )
        fail('此帳號已配對或屬於其他房東')
      if (contracts.size > 300) fail('租約數量超過操作上限')
      const linked = await linkedDocuments(db, key, tenant.landlordId, tx)
      tx.update(tenantRef, { uid, updatedAt: FieldValue.serverTimestamp() })
      tx.update(user.ref, {
        landlordId: tenant.landlordId,
        updatedAt: FieldValue.serverTimestamp(),
      })
      for (const c of linked)
        tx.update(c.ref, { tenantId: uid, updatedAt: FieldValue.serverTimestamp() })
      audit(tx, db, request, {
        payloadHash,
        kind: 'tenants',
        key,
        action: 'account_pair',
        landlordId: tenant.landlordId,
        before: { uid: null },
        after: { uid },
        related: [
          ...linked.map((d) => ({
            path: d.ref.path,
            before: { tenantId: d.data().tenantId || null },
            after: { tenantId: uid },
          })),
          {
            path: user.ref.path,
            before: { landlordId: user.data().landlordId || null },
            after: { landlordId: tenant.landlordId },
          },
        ],
      })
      notify(
        tx,
        db,
        uid,
        '平台管理員已完成您的租客帳號配對，請登入查看。',
        '/tenant/profile',
        operationId
      )
      notify(
        tx,
        db,
        tenant.landlordId,
        '平台管理員已完成租客帳號配對，請登入查看。',
        '/landlord/tenants',
        operationId
      )
      return { ok: true }
    })
  }
  if (operation === 'status') {
    const lock = (await db.doc(`platform_account_locks/${key}`).get()).data()
    const job = lock
      ? (await db.doc(`platform_account_jobs/${lock.operationId}`).get()).data()
      : null
    const pending = job
      ? {
          operationId: lock.operationId,
          operation: job.operation,
          reason: job.reason || '',
          disabled: job.disabled ?? true,
          version: job.version,
        }
      : null
    if (!tenant.uid) return { status: 'missing', pending }
    try {
      const record = await auth.getUser(tenant.uid)
      return {
        status: record.disabled ? 'disabled' : record.metadata.lastSignInTime ? 'active' : 'unused',
        lastSignIn: record.metadata.lastSignInTime || null,
        email: record.email || '',
        pending,
      }
    } catch (e) {
      if (e.code === 'auth/user-not-found') return { status: 'deleted', pending }
      throw e
    }
  }
  if (!id(operationId) || !['create', 'reset', 'disabled', 'activation'].includes(operation))
    fail('帳號操作格式錯誤')
  assertReason(reason)
  const payloadHash = hash({
    key,
    operation,
    reason,
    disabled: request.data.disabled ?? null,
    password: request.data.password ? hash(request.data.password) : null,
  })
  const jobRef = db.collection('platform_account_jobs').doc(operationId),
    lockRef = db.collection('platform_account_locks').doc(key)
  if (!(await jobRef.get()).exists) {
    if (operation === 'create') {
      await linkedDocuments(db, key, tenant.landlordId)
      if (!/^09\d{8}$/.test(tenant.phone || '') || String(tenant.idNumber || '').length < 6)
        fail('請先填寫有效手機與證件號碼')
      if (tenant.uid) {
        try {
          await auth.getUser(tenant.uid)
          fail('此租客已有登入帳號')
        } catch (e) {
          if (e.code !== 'auth/user-not-found') throw e
        }
      }
    } else {
      if (!tenant.uid) fail('請先建立登入帳號')
      if (operation === 'reset') {
        const password = request.data.password || tenant.idNumber
        if (typeof password !== 'string' || password.length < 6 || password.length > 128)
          fail('新密碼需 6～128 個字元')
      }
      if (operation === 'disabled' && typeof request.data.disabled !== 'boolean')
        fail('請指定停用或恢復')
      if (operation === 'activation' && !tenant.idNumber) fail('租客缺少證件號碼')
    }
  }
  const job = await db.runTransaction(async (tx) => {
    const [previous, current, lock, state] = await Promise.all([
      tx.get(jobRef),
      tx.get(tenantRef),
      tx.get(lockRef),
      tx.get(db.collection('platform_accounts').doc(tenant.landlordId)),
    ])
    if (previous.exists) {
      if (
        previous.data().payloadHash !== payloadHash ||
        previous.data().actorId !== request.auth.uid
      )
        fail('操作識別碼已使用')
      return previous.data()
    }
    if (['deleting', 'deleted'].includes(state.data()?.mode)) fail('房東正在刪除')
    if (lock.exists) fail('此租客有未完成帳號操作，請重試原操作')
    if (hash(current.data()) !== request.data.version) fail('租客資料已更新，請重新載入')
    const value = {
      actorId: request.auth.uid,
      payloadHash,
      operation,
      reason,
      version: request.data.version,
      disabled: request.data.disabled ?? null,
      landlordId: tenant.landlordId,
      before: serialize(current.data()),
      phase: 'started',
      uid: tenant.uid || `managed-${hash([tenant.landlordId, key]).slice(0, 40)}`,
      code: operation === 'activation' ? crypto.randomBytes(32).toString('hex') : null,
    }
    tx.create(jobRef, value)
    tx.create(lockRef, { operationId, landlordId: tenant.landlordId })
    return value
  })
  if (job.phase === 'done') return { ok: true, ...job.result, replayed: true }
  tenant = job.before
  const uid = job.uid
  let after = { uid }
  let result = {}
  if (operation === 'create') {
    if (!/^09\d{8}$/.test(tenant.phone || '') || String(tenant.idNumber || '').length < 6)
      fail('請先填寫有效手機與證件號碼')
    const email = `${tenant.phone}@tenant.myrental`
    try {
      await auth.createUser({ uid, email, password: tenant.idNumber, displayName: tenant.name })
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        await db.runTransaction(async (tx) => {
          const lock = await tx.get(lockRef)
          if (lock.data()?.operationId === operationId) {
            tx.delete(lockRef)
            tx.delete(jobRef)
          }
        })
        fail('此手機已被其他登入帳號使用，請確認手機或帳號關聯')
      }
      if (e.code !== 'auth/uid-already-exists') throw e
      const current = await auth.getUser(uid)
      if (current.email !== email) fail('既有帳號資料不一致')
    }
    after = { uid, email, disabled: false }
  } else {
    if (!tenant.uid) fail('請先建立登入帳號')
    if (operation === 'reset') {
      const password = request.data.password || tenant.idNumber
      if (typeof password !== 'string' || password.length < 6 || password.length > 128)
        fail('新密碼需 6～128 個字元')
      await auth.updateUser(uid, { password })
      await auth.revokeRefreshTokens(uid)
      after = { uid, passwordReset: true }
    } else if (operation === 'disabled') {
      if (typeof request.data.disabled !== 'boolean') fail('請指定停用或恢復')
      await auth.updateUser(uid, { disabled: request.data.disabled })
      if (request.data.disabled) await auth.revokeRefreshTokens(uid)
      after = { uid, disabled: request.data.disabled }
    } else {
      if (!tenant.idNumber) fail('租客缺少證件號碼')
      const { SITE_URL } = require('../line/presentation.cjs')
      const origin =
        /^http:\/\/(localhost|127\.0\.0\.1):517[34]$/.test(request.data.origin || '') &&
        process.env.FUNCTIONS_EMULATOR === 'true'
          ? request.data.origin
          : SITE_URL
      result = { url: `${origin}/activate/${job.code}`, expireDays: 7 }
      after = { uid, activationIssued: true }
    }
  }
  await db.runTransaction(async (tx) => {
    const current = await tx.get(jobRef)
    if (current.data().phase === 'done') return
    const user = await tx.get(db.collection('users').doc(uid))
    const state = await tx.get(db.collection('platform_accounts').doc(tenant.landlordId))
    if (['deleting', 'deleted'].includes(state.data()?.mode)) fail('房東正在刪除，帳號操作已停止')
    const existingLinks =
      operation === 'activation'
        ? await tx.get(db.collection('tenant_activations').where('tenantDocId', '==', key))
        : null
    const linked =
      operation === 'create' ? await linkedDocuments(db, key, tenant.landlordId, tx) : []
    if (operation === 'create') {
      if (
        user.exists &&
        (user.data().role !== 'tenant' || user.data().landlordId !== tenant.landlordId)
      )
        fail('登入帳號歸屬不一致')
      tx.set(
        db.collection('users').doc(uid),
        {
          uid,
          role: 'tenant',
          landlordId: tenant.landlordId,
          name: tenant.name,
          phone: tenant.phone,
          email: after.email,
          isLandlordCreated: true,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      tx.update(tenantRef, { uid, updatedAt: FieldValue.serverTimestamp() })
      for (const d of linked)
        tx.update(d.ref, { tenantId: uid, updatedAt: FieldValue.serverTimestamp() })
    } else
      tx.update(tenantRef, {
        accountRevision: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })
    if (existingLinks) {
      for (const link of existingLinks.docs) if (!link.data().usedAt) tx.delete(link.ref)
      tx.set(db.collection('tenant_activations').doc(job.code), {
        tenantDocId: key,
        uid,
        landlordId: tenant.landlordId,
        expireAt: Date.now() + 7 * 86400000,
        usedAt: null,
        createdAt: FieldValue.serverTimestamp(),
      })
    }
    audit(tx, db, request, {
      kind: 'tenants',
      key,
      action: `account_${operation}`,
      landlordId: tenant.landlordId,
      before: { uid: job.before.uid || null },
      after,
      related: linked.map((d) => ({
        path: d.ref.path,
        before: { tenantId: d.data().tenantId || null },
        after: { tenantId: uid },
      })),
    })
    notify(
      tx,
      db,
      tenant.landlordId,
      '平台管理員已更新租客登入帳號，請登入查看。',
      '/landlord/tenants',
      operationId
    )
    notify(
      tx,
      db,
      uid,
      '平台管理員已更新您的登入帳號，請登入查看。',
      '/tenant/profile',
      operationId
    )
    tx.update(jobRef, { phase: 'done', result, completedAt: FieldValue.serverTimestamp() })
    tx.delete(lockRef)
  })
  return { ok: true, ...result }
}
module.exports = { handleTenantAccount }
