const { FieldValue } = require('firebase-admin/firestore')
const {
  fail,
  id,
  date,
  today,
  hash,
  owner,
  schemas,
  validatePatch,
  needsReason,
  assertReason,
  assertLease,
  scanAnomalies,
} = require('./policy.cjs')
const crypto = require('node:crypto')
const serialize = (value) => JSON.parse(JSON.stringify(value))
const rows = (snap) =>
  snap.docs.map((d) => ({ ...serialize(d.data()), id: d.id, version: hash(d.data()) }))
const MAX = 20000
async function readAll(query) {
  const snap = await query.limit(MAX + 1).get()
  if (snap.size > MAX) fail('資料超出本次操作上限，請縮小範圍', 'resource-exhausted')
  return rows(snap)
}
async function caller(db, request, roles = ['admin']) {
  if (!request.auth) fail('請先登入', 'unauthenticated')
  const snap = await db.collection('users').doc(request.auth.uid).get()
  if (!roles.includes(snap.data()?.role)) fail('無權使用此操作', 'permission-denied')
  return { ...snap.data(), id: snap.id }
}
async function serviceAccount(db, uid) {
  return (await db.collection('platform_accounts').doc(uid).get()).data() || {}
}
async function isPaused(db, landlordId) {
  if (!id(landlordId)) return true
  const s = await serviceAccount(db, landlordId)
  return !!s.archived || ['all', 'deleting', 'deleted'].includes(s.mode)
}
async function assertAccess(db, uid, { support = false } = {}) {
  const user = (await db.collection('users').doc(uid).get()).data()
  if (!user || user.role === 'admin' || support) return
  const lid = user.role === 'landlord' ? uid : user.landlordId
  if (!lid) return
  const state = await serviceAccount(db, lid)
  if (
    (user.role === 'landlord' && state.mode === 'landlord') ||
    ['all', 'deleting', 'deleted'].includes(state.mode) ||
    state.archived
  )
    fail('服務已暫停，請聯繫平台客服', 'permission-denied')
}
function notify(tx, db, recipientId, message, path, key) {
  if (!id(recipientId)) return
  tx.set(db.collection('platform_notifications').doc(hash([key, recipientId])), {
    recipientId,
    message,
    path,
    isRead: false,
    lineStatus: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  })
}
function audit(tx, db, request, details) {
  const snapshot = (value, key = '') => {
    if (
      typeof value === 'string' &&
      (/signature|templateHtml/i.test(key) || value.startsWith('data:image/'))
    )
      return { sha256: hash(value), bytes: Buffer.byteLength(value) }
    if (Array.isArray(value)) return value.map((v) => snapshot(v))
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, snapshot(v, k)]))
    return value
  }
  tx.create(db.collection('admin_audit').doc(request.data.operationId), {
    actorId: request.auth.uid,
    reason: request.data.reason?.trim() || '',
    at: FieldValue.serverTimestamp(),
    ...snapshot(details),
  })
}
async function overview(db) {
  const entries = await Promise.all(
    Object.keys(schemas).map(async (kind) => [kind, await readAll(db.collection(kind))])
  )
  const data = Object.fromEntries(entries)
  const issues = scanAnomalies(data)
  const authUsers = data.tenants.filter((t) => t.uid)
  return {
    counts: {
      ...Object.fromEntries(entries.map(([k, v]) => [k, v.length])),
      users: data.users.filter((u) => u.role === 'landlord').length,
    },
    issues,
    authUsers: [...new Set(authUsers.map((t) => t.uid))],
  }
}
async function list(db, data) {
  const { kind, landlordId, after } = data
  if (!schemas[kind] && !['admin_audit', 'platform_accounts', 'platform_tickets'].includes(kind))
    fail('未知清單', 'invalid-argument')
  let q = db.collection(kind)
  if (kind === 'users') q = q.where('role', '==', 'landlord')
  if (landlordId) {
    if (!id(landlordId)) fail('房東格式錯誤', 'invalid-argument')
    if (kind !== 'users')
      q = q.where(kind === 'signed_contracts' ? 'landlordUid' : 'landlordId', '==', landlordId)
  }
  if (kind === 'users') {
    const states = new Map(
      (await readAll(db.collection('platform_accounts'))).map((s) => [s.id, s])
    )
    const term = String(data.search || '')
      .trim()
      .toLocaleLowerCase()
    let items = (await readAll(q.orderBy('__name__'))).map((r) => ({
      ...r,
      serviceState: states.get(r.id) || { mode: 'active' },
    }))
    if (!data.includeArchived) items = items.filter((r) => !r.serviceState.archived)
    if (term)
      items = items.filter((r) =>
        [r.name, r.phone, r.email, r.id].some(
          (v) => typeof v === 'string' && v.toLocaleLowerCase().includes(term)
        )
      )
    if (after) items = items.filter((r) => r.id > after)
    return { items: items.slice(0, 100), next: items.length > 100 ? items[99].id : null }
  }
  if (data.search?.trim()) {
    const term = data.search.trim().toLocaleLowerCase()
    const items = (await readAll(q)).filter((r) =>
      [r.name, r.phone, r.email, r.room, r.roomNumber, r.description, r.tenant, r.id].some(
        (v) => typeof v === 'string' && v.toLocaleLowerCase().includes(term)
      )
    )
    return { items, next: null }
  }
  q = q.orderBy('__name__')
  if (after) {
    if (!id(after)) fail('分頁格式錯誤', 'invalid-argument')
    q = q.startAfter(after)
  }
  const result = rows(await q.limit(101).get())
  return { items: result.slice(0, 100), next: result.length > 100 ? result[99].id : null }
}
async function mutate(db, request) {
  const { kind, key, action = 'edit', patch, version, operationId, reason } = request.data
  if (!schemas[kind] || !id(key) || !id(operationId)) fail('操作格式錯誤', 'invalid-argument')
  if (needsReason(kind, action)) assertReason(reason)
  if (action === 'edit') validatePatch(kind, patch)
  const payloadHash = hash({
    kind,
    key,
    action,
    patch: patch || null,
    input: request.data.input || null,
    reason: reason || '',
  })
  const ref = db.collection(kind).doc(key)
  const payments = await import('../billing/payments.mjs')
  return db.runTransaction(async (tx) => {
    const [previous, snap] = await Promise.all([
      tx.get(db.collection('admin_audit').doc(operationId)),
      tx.get(ref),
    ])
    if (previous.exists) {
      if (previous.data().payloadHash !== payloadHash) fail('操作識別碼已使用')
      return { ok: true, ...previous.data().result, replayed: true }
    }
    if (!snap.exists) fail('資料不存在', 'not-found')
    const before = snap.data()
    if (version !== hash(before)) fail('資料已被更新，請重新載入後操作', 'aborted')
    const lid = owner(kind, before, key)
    if (!id(lid)) fail('缺少房東關聯，請先查明異常')
    const landlord = await tx.get(db.collection('users').doc(lid))
    const state = await tx.get(db.collection('platform_accounts').doc(lid))
    if (
      landlord.data()?.role !== 'landlord' ||
      ['deleting', 'deleted'].includes(state.data()?.mode)
    )
      fail('房東不存在或正在刪除')
    let updates = {}
    let result = {}
    let tenantUid = before.tenantUid || before.tenantId || (kind === 'tenants' ? before.uid : null)
    const related = []
    const change = (r, old, next) => {
      related.push({ path: r.path, before: serialize(old), after: serialize(next) })
      tx.update(r, { ...next, updatedAt: FieldValue.serverTimestamp() })
    }
    if (action === 'edit') {
      updates = { ...patch }
      if (kind === 'users' && before.role !== 'landlord') fail('此處只可修改房東帳戶')
      if (kind === 'rooms') {
        if (patch.rent !== undefined) updates.price = patch.rent
        const [allRooms, property] = await Promise.all([
          tx.get(db.collection('rooms').where('landlordId', '==', lid)),
          patch.propertyId
            ? tx.get(db.collection('properties').doc(patch.propertyId))
            : Promise.resolve(null),
        ])
        const norm = (v) => String(v).normalize('NFKC').replace(/\s/g, '').toUpperCase()
        if (
          patch.name !== undefined &&
          (!norm(patch.name) ||
            allRooms.docs.some((d) => d.id !== key && norm(d.data().name) === norm(patch.name)))
        )
          fail('房號不可空白或重複')
        if (before.status === 'occupied' && patch.name && patch.name !== before.name)
          fail('出租中房源請先完成退租再變更房號')
        if (property && property.data()?.landlordId !== lid) fail('建物不屬於此房東')
      }
      if (kind === 'bills') {
        if (
          payments.collectedOf(before) > 0 ||
          before.status === 'archived' ||
          before.status === 'cancelled'
        )
          fail('已收款或歷史帳單請使用沖正／作廢流程')
        if (before.taipowerBillId || before.waterBillId || before.propertyCostId)
          fail('此為連動支出，請由原始台電／台水／建物費用流程修正')
      }
      if (kind === 'contracts') {
        if (before.status !== 'active') fail('只有有效租約可異動')
        if (before.pendingRenewal) fail('請先取消排程續約，再修改目前租期')
        const next = { ...before, ...patch }
        assertLease(next)
        if (!id(before.tenantDocId)) fail('租約缺少租客關聯')
        const [tenant, roomList, leases] = await Promise.all([
          tx.get(db.collection('tenants').doc(before.tenantDocId)),
          tx.get(db.collection('rooms').where('landlordId', '==', lid)),
          tx.get(db.collection('contracts').where('landlordId', '==', lid)),
        ])
        const t = tenant.data()
        const matches = roomList.docs.filter((d) =>
          before.roomId ? d.id === before.roomId : d.data().name === before.roomNumber
        )
        if (!t || t.landlordId !== lid || t.contractId !== key || matches.length !== 1)
          fail('租約、租客與房源關聯不一致')
        if (
          leases.docs.some(
            (d) =>
              d.id !== key &&
              d.data().status === 'active' &&
              (d.data().roomId === matches[0].id || d.data().roomNumber === matches[0].data().name)
          )
        )
          fail('房源存在多份有效租約')
        tenantUid = t.uid
        change(tenant.ref, t, {
          leaseStart: next.startDate,
          leaseEnd: next.endDate,
          rent: next.rent,
        })
        change(matches[0].ref, matches[0].data(), { leaseEnd: next.endDate })
      }
    } else if (['renew', 'cancelRenewal'].includes(action) && kind === 'contracts') {
      if (before.status !== 'active' || !id(before.tenantDocId))
        fail('只有關聯完整的有效租約可續約')
      const tenant = await tx.get(db.collection('tenants').doc(before.tenantDocId))
      if (tenant.data()?.landlordId !== lid || tenant.data()?.contractId !== key)
        fail('租客與目前租約關聯不一致')
      tenantUid = tenant.data().uid
      if (action === 'cancelRenewal') {
        if (!before.pendingRenewal) fail('目前沒有排程續約')
        updates = { pendingRenewal: null }
      } else {
        const next = request.data.input || {}
        assertLease(next)
        if (next.startDate <= before.endDate) fail('續約起租日需在目前租期結束之後')
        updates = {
          pendingRenewal: { startDate: next.startDate, endDate: next.endDate, rent: next.rent },
          lastRenewedAt: new Date().toISOString(),
          renewalStatus: null,
          renewalNote: null,
          renewalRespondedAt: null,
          landlordRenewalDecision: null,
        }
      }
    } else if (['confirm', 'return', 'signLink'].includes(action) && kind === 'signed_contracts') {
      const links = await tx.get(
        db.collection('contract_sign_links').where('contractId', '==', key)
      )
      const input = request.data.input || {}
      if (action === 'signLink') {
        if (before.status !== 'awaiting_tenant') fail('合約目前不是待租客簽署')
        const code = crypto.randomBytes(32).toString('hex')
        const expireAt = Date.now() + 7 * 86400000
        const { SITE_URL } = require('../line/presentation.cjs')
        const origin =
          process.env.FUNCTIONS_EMULATOR === 'true' &&
          /^http:\/\/(localhost|127\.0\.0\.1):517[34]$/.test(input.origin || '')
            ? input.origin
            : SITE_URL
        tx.create(db.collection('contract_sign_links').doc(code), {
          contractId: key,
          landlordId: lid,
          expireAt,
          usedAt: null,
          failedAttempts: 0,
          createdAt: FieldValue.serverTimestamp(),
        })
        updates = { signLinkSentAt: new Date().toISOString() }
        result = { code, url: `${origin}/sign/${code}`, expireAt, expireDays: 7 }
      } else {
        if (before.status !== 'awaiting_landlord') fail('合約目前不是待房東核對')
        if (action === 'return')
          updates = {
            signature: '',
            status: 'awaiting_tenant',
            tenantSignedAt: null,
            tenantAcknowledgedAt: null,
            tenantAcknowledgedUid: null,
            returnedAt: today(),
          }
        else {
          if (
            typeof input.signature !== 'string' ||
            !input.signature.startsWith('data:image/png;base64,') ||
            input.signature.length > 600 * 1024 ||
            !before.signature
          )
            fail('請由房東完成簽名')
          const all = await tx.get(
            db.collection('signed_contracts').where('landlordUid', '==', lid)
          )
          const overlaps = all.docs.filter((d) => {
            const o = d.data()
            const same =
              before.tenantUid && o.tenantUid
                ? before.tenantUid === o.tenantUid
                : String(before.tenantId || '')
                    .trim()
                    .toUpperCase() ===
                  String(o.tenantId || '')
                    .trim()
                    .toUpperCase()
            return (
              d.id !== key &&
              same &&
              !o.supersededBy &&
              !['awaiting_tenant', 'awaiting_landlord', 'voided'].includes(o.status) &&
              o.startDate <= before.endDate &&
              before.startDate <= o.endDate
            )
          })
          if (hash(overlaps.map((d) => [d.id, hash(d.data())])) !== input.overlapVersion)
            fail('重疊合約狀態已變動，請重新預覽')
          for (const d of overlaps)
            change(d.ref, d.data(), { supersededBy: key, supersededAt: new Date().toISOString() })
          updates = {
            landlordSignature: input.signature,
            status: 'signed',
            landlordSignedAt: new Date().toISOString(),
            signedAt: new Date().toISOString(),
          }
        }
      }
      for (const link of links.docs)
        tx.update(link.ref, { usedAt: FieldValue.serverTimestamp(), cancelled: true })
    } else if (action === 'void' && kind === 'signed_contracts') {
      if (before.status === 'voided' || before.supersededBy) fail('此合約已作廢或被取代')
      const links = await tx.get(
        db.collection('contract_sign_links').where('contractId', '==', key)
      )
      for (const link of links.docs) tx.update(link.ref, { used: true, cancelled: true })
      updates = {
        status: 'voided',
        voidReason: reason,
        voidedAt: today(),
        supersededBy: `void:${operationId}`,
      }
    } else if (action === 'void' && kind === 'bills') {
      if (payments.collectedOf(before) > 0) fail('帳單已有收款，請先撤銷收款')
      if (before.taipowerBillId || before.waterBillId || before.propertyCostId)
        fail('連動支出須由原始流程處理')
      updates = {
        status: 'cancelled',
        cancelledAt: today(),
        originalAmount: before.amount,
        amount: 0,
        voidReason: reason,
      }
    } else if (action === 'collect' && kind === 'tenants') {
      const input = request.data.input || {}
      if (
        !Number.isInteger(input.amount) ||
        input.amount <= 0 ||
        input.amount > 100000000 ||
        !date(input.date)
      )
        fail('收款金額或日期錯誤', 'invalid-argument')
      const all = await tx.get(db.collection('bills').where('landlordId', '==', lid))
      const eligible = all.docs
        .filter(
          (d) =>
            d.data().relatedTenantDocId === key || (before.uid && d.data().tenantId === before.uid)
        )
        .filter((d) => !['archived', 'cancelled'].includes(d.data().status))
      const plan = payments.allocatePayment(
        eligible.map((d) => ({ ...d.data(), id: d.id })),
        input.amount
      )
      if (plan.allocations.length > 300) fail('本次收款帳單過多，請分批處理')
      for (const a of plan.allocations) {
        const bill = eligible.find((d) => d.id === a.billId)
        change(bill.ref, bill.data(), {
          ...payments.paymentUpdate(bill.data(), a.apply, input.date, today()),
          payments: [
            ...(bill.data().payments || []),
            {
              ...payments.paymentEntry(a.apply, input.date, 'manual', reason),
              adminOperationId: operationId,
            },
          ],
        })
      }
      updates = {
        credit: (before.credit || 0) + plan.leftover,
        creditLog: [
          ...(before.creditLog || []),
          ...(plan.leftover
            ? [
                {
                  amount: plan.leftover,
                  date: input.date,
                  note: reason,
                  at: new Date().toISOString(),
                  adminOperationId: operationId,
                },
              ]
            : []),
        ],
      }
    } else if (action === 'credit' && kind === 'tenants') {
      const amount = request.data.input?.amount
      if (
        !Number.isInteger(amount) ||
        Math.abs(amount) > 100000000 ||
        (before.credit || 0) + amount < 0 ||
        amount === 0
      )
        fail('預收調整金額錯誤', 'invalid-argument')
      updates = {
        credit: (before.credit || 0) + amount,
        creditLog: [
          ...(before.creditLog || []),
          {
            amount,
            date: today(),
            note: reason,
            at: new Date().toISOString(),
            adminOperationId: operationId,
          },
        ],
      }
    } else if (action === 'reverse' && kind === 'bills') {
      if (!Array.isArray(before.payments) || !before.payments.length)
        fail('此舊帳單沒有逐筆收款紀錄，不能自動撤銷')
      const index = request.data.input?.paymentIndex
      const entry = before.payments[index]
      if (!Number.isInteger(index) || !entry || entry.reversedAt || entry.amount <= 0)
        fail('請選擇尚未撤銷的收款')
      let tenant
      if (entry.source === 'credit') {
        if (!id(before.relatedTenantDocId)) fail('缺少租客關聯，無法退回預收')
        tenant = await tx.get(db.collection('tenants').doc(before.relatedTenantDocId))
        if (tenant.data()?.landlordId !== lid) fail('租客關聯錯誤')
      }
      const paid = payments.collectedOf(before) - entry.amount
      if (paid < 0) fail('收款紀錄與金額不一致')
      const log = before.payments.map((p, i) =>
        i === index
          ? {
              ...p,
              reversedAt: new Date().toISOString(),
              reverseReason: reason,
              reversalId: operationId,
            }
          : p
      )
      updates = {
        paidAmount: paid,
        paidAt: null,
        payments: log,
        status: before.dueDate < today() ? 'overdue' : 'pending',
      }
      if (tenant)
        change(tenant.ref, tenant.data(), {
          credit: (tenant.data().credit || 0) + entry.amount,
          creditLog: [
            ...(tenant.data().creditLog || []),
            {
              amount: entry.amount,
              date: today(),
              note: reason,
              at: new Date().toISOString(),
              adminOperationId: operationId,
            },
          ],
        })
    } else fail('不支援的操作', 'invalid-argument')
    tx.update(ref, {
      ...updates,
      ...(action === 'confirm'
        ? { signedAt: FieldValue.serverTimestamp(), landlordSignedAt: FieldValue.serverTimestamp() }
        : {}),
      ...(kind === 'contracts' && action === 'edit'
        ? { rentContinuityStart: FieldValue.delete() }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    })
    audit(tx, db, request, {
      payloadHash,
      kind,
      key,
      action,
      landlordId: lid,
      before: serialize(before),
      after: serialize({ ...before, ...updates }),
      related,
      result,
    })
    if (needsReason(kind, action)) {
      const message = '平台管理員已處理您的租務資料，請登入系統查看。'
      notify(tx, db, lid, message, '/landlord/support', operationId)
      if (tenantUid)
        notify(
          tx,
          db,
          tenantUid,
          message,
          kind === 'bills' || action === 'collect' || action === 'credit'
            ? '/tenant/bills'
            : '/tenant/contract',
          operationId
        )
    }
    return { ok: true, ...result }
  })
}
async function account(db, request) {
  const { landlordId, mode, archived, reason, operationId, version } = request.data
  if (
    !id(landlordId) ||
    !id(operationId) ||
    !['active', 'landlord', 'all'].includes(mode) ||
    typeof archived !== 'boolean'
  )
    fail('帳戶操作格式錯誤', 'invalid-argument')
  assertReason(reason)
  return db.runTransaction(async (tx) => {
    const ref = db.collection('platform_accounts').doc(landlordId)
    const [state, landlord, previous, tenants] = await Promise.all([
      tx.get(ref),
      tx.get(db.collection('users').doc(landlordId)),
      tx.get(db.collection('admin_audit').doc(operationId)),
      tx.get(db.collection('users').where('landlordId', '==', landlordId)),
    ])
    const payloadHash = hash({ landlordId, mode, archived, reason })
    if (previous.exists) {
      if (previous.data().payloadHash !== payloadHash) fail('操作識別碼已使用')
      return { ok: true, replayed: true }
    }
    if (landlord.data()?.role !== 'landlord') fail('找不到房東')
    const before = state.data() || {}
    if (version !== hash(before) || ['deleting', 'deleted'].includes(before.mode))
      fail('帳戶狀態已改變，請重新載入')
    if (tenants.size > 300) fail('帳戶關聯過多，請分批維護', 'resource-exhausted')
    const after = {
      mode,
      archived,
      reason,
      updatedAt: new Date().toISOString(),
      actorId: request.auth.uid,
      pauses: [
        ...(before.pauses || []),
        ...(mode === 'all' && before.mode !== 'all' ? [{ from: today(), to: null }] : []),
      ].map((p, i, a) =>
        mode !== 'all' && i === a.length - 1 && !p.to ? { ...p, to: today() } : p
      ),
    }
    tx.set(ref, after)
    audit(tx, db, request, {
      payloadHash,
      kind: 'platform_accounts',
      key: landlordId,
      action: 'account',
      landlordId,
      before,
      after,
    })
    notify(
      tx,
      db,
      landlordId,
      `平台管理員已更新帳戶服務狀態：${archived ? '已封存' : mode === 'active' ? '已恢復' : mode === 'all' ? '整戶暫停' : '房東帳號暫停'}。`,
      '/landlord/support',
      operationId
    )
    if (mode === 'all' || before.mode === 'all')
      for (const user of tenants.docs)
        notify(
          tx,
          db,
          user.id,
          '平台管理員已更新您所屬房東的服務狀態，請登入查看。',
          '/tenant/profile',
          operationId
        )
    return { ok: true, version: hash(after) }
  })
}
async function handleAdmin(db, auth, request) {
  await caller(db, request)
  switch (request.data?.action) {
    case 'deletionJobs': {
      const jobs = await readAll(db.collection('platform_delete_jobs'))
      return {
        items: jobs
          .filter((j) => j.phase !== 'done')
          .map((j) => ({
            id: j.id,
            landlordId: j.landlordId,
            reason: j.reason,
            version: j.version,
            summary: j.summary,
            phase: j.phase,
          })),
      }
    }
    case 'signedPreview': {
      const { key } = request.data
      if (!id(key)) fail('合約格式錯誤')
      const snap = await db.collection('signed_contracts').doc(key).get()
      const c = snap.data()
      if (!c) fail('合約不存在')
      const all = await db
        .collection('signed_contracts')
        .where('landlordUid', '==', c.landlordUid)
        .get()
      const overlaps = all.docs.filter((d) => {
        const o = d.data()
        const same =
          c.tenantUid && o.tenantUid
            ? c.tenantUid === o.tenantUid
            : String(c.tenantId || '')
                .trim()
                .toUpperCase() ===
              String(o.tenantId || '')
                .trim()
                .toUpperCase()
        return (
          d.id !== key &&
          same &&
          !o.supersededBy &&
          !['awaiting_tenant', 'awaiting_landlord', 'voided'].includes(o.status) &&
          o.startDate <= c.endDate &&
          c.startDate <= o.endDate
        )
      })
      return {
        items: overlaps.map((d) => ({
          id: d.id,
          tenant: d.data().tenant,
          startDate: d.data().startDate,
          endDate: d.data().endDate,
        })),
        version: hash(overlaps.map((d) => [d.id, hash(d.data())])),
      }
    }
    case 'lineConfig': {
      const config = (await db.collection('platform_private').doc('line').get()).data() || {}
      return {
        botId: config.botId || '',
        configured: !!config.channelAccessToken && !!config.channelSecret,
      }
    }
    case 'saveLineConfig': {
      const { botId, channelSecret, channelAccessToken, operationId, reason } = request.data
      assertReason(reason)
      if (
        !id(operationId) ||
        typeof botId !== 'string' ||
        !/^@[A-Za-z0-9._-]{1,64}$/.test(botId) ||
        typeof channelSecret !== 'string' ||
        !channelSecret ||
        typeof channelAccessToken !== 'string' ||
        !channelAccessToken ||
        channelAccessToken.length > 4000 ||
        channelSecret.length > 1000
      )
        fail('請填寫完整 Bot 設定', 'invalid-argument')
      await db.runTransaction(async (tx) => {
        const ref = db.collection('platform_private').doc('line')
        const [previous, current] = await Promise.all([
          tx.get(db.collection('admin_audit').doc(operationId)),
          tx.get(ref),
        ])
        const payloadHash = hash({ botId, channelSecret, channelAccessToken, reason })
        if (previous.exists) {
          if (previous.data().payloadHash !== payloadHash) fail('操作識別碼已使用')
          return
        }
        tx.set(ref, {
          botId,
          channelSecret,
          channelAccessToken,
          updatedAt: FieldValue.serverTimestamp(),
        })
        audit(tx, db, request, {
          payloadHash,
          kind: 'platform_private',
          key: 'line',
          action: 'configure',
          before: {
            botId: current.data()?.botId || '',
            configured: !!current.data()?.channelAccessToken,
          },
          after: { botId, configured: true },
        })
      })
      return { ok: true }
    }
    case 'feature': {
      const { role, feature, disabled, operationId, reason } = request.data
      assertReason(reason)
      const features = {
        landlord: [
          'rooms',
          'tenants',
          'financials',
          'meter',
          'meter-history',
          'repairs',
          'messages',
          'announcements',
          'contract',
          'receipts',
          'investment',
          'building',
          'reviews',
          'inspection',
        ],
        tenant: [
          'bills',
          'announcements',
          'repairs',
          'contact',
          'building',
          'contract',
          'inspection',
        ],
      }
      if (!features[role]?.includes(feature) || typeof disabled !== 'boolean' || !id(operationId))
        fail('功能格式錯誤')
      await db.runTransaction(async (tx) => {
        const ref = db.collection('system_config').doc('features')
        const [snap, previous] = await Promise.all([
          tx.get(ref),
          tx.get(db.collection('admin_audit').doc(operationId)),
        ])
        const payloadHash = hash({ role, feature, disabled, reason })
        if (previous.exists) {
          if (previous.data().payloadHash !== payloadHash) fail('操作識別碼已使用')
          return
        }
        const before = snap.data() || {}
        const after = { disabled: { ...(before.disabled || {}), [`${role}.${feature}`]: disabled } }
        tx.set(ref, { ...after, updatedAt: new Date().toISOString() })
        audit(tx, db, request, {
          payloadHash,
          kind: 'system_config',
          key: 'features',
          action: 'configure',
          before,
          after,
        })
      })
      return { ok: true }
    }
    case 'search': {
      const term = String(request.data.search || '')
        .trim()
        .toLocaleLowerCase()
      if (term.length < 2) fail('請輸入至少兩個字', 'invalid-argument')
      const found = []
      for (const kind of ['users', 'tenants', 'rooms']) {
        const source = await readAll(
          kind === 'users'
            ? db.collection(kind).where('role', '==', 'landlord')
            : db.collection(kind)
        )
        found.push(
          ...source
            .filter((r) =>
              [r.name, r.phone, r.email, r.room, r.landlordCode].some(
                (v) => typeof v === 'string' && v.toLocaleLowerCase().includes(term)
              )
            )
            .map((r) => ({ ...r, kind }))
        )
      }
      if (found.length > 200) fail('符合資料超過 200 筆，請輸入更精確的關鍵字')
      return { items: found }
    }
    case 'overview': {
      const data = await overview(db)
      for (let i = 0; i < data.authUsers.length; i += 100) {
        const part = data.authUsers.slice(i, i + 100)
        const found = await auth.getUsers(part.map((uid) => ({ uid })))
        for (const missing of found.notFound)
          data.issues.push({
            key: `auth/${missing.uid}`,
            kind: 'tenants',
            id: '',
            landlordId: '',
            label: missing.uid,
            message: 'Firebase 登入帳號不存在',
          })
      }
      delete data.authUsers
      return data
    }
    case 'list':
      return list(db, request.data)
    case 'detail': {
      const { kind, key } = request.data
      if ((!schemas[kind] && !['platform_accounts', 'admin_audit'].includes(kind)) || !id(key))
        fail('查詢格式錯誤', 'invalid-argument')
      const snap = await db.collection(kind).doc(key).get()
      const value = snap.data() || {}
      return {
        ...serialize(value),
        ...(kind === 'rooms' ? { rent: value.rent ?? value.price ?? 0 } : {}),
        id: key,
        version: hash(value),
        exists: snap.exists,
      }
    }
    case 'mutate':
      return mutate(db, { ...request, data: { ...request.data, action: request.data.operation } })
    case 'account':
      return account(db, request)
    case 'domain':
      return require('./domain.cjs').handleDomain(db, request)
    default:
      fail('未知管理操作', 'invalid-argument')
  }
}
module.exports = {
  caller,
  readAll,
  rows,
  serialize,
  notify,
  audit,
  handleAdmin,
  mutate,
  account,
  isPaused,
  assertAccess,
  serviceAccount,
}
