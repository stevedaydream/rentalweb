const { FieldValue, Timestamp } = require('firebase-admin/firestore')
const { caller, readAll, notify, serialize } = require('./service.cjs')
const { fail, id, hash } = require('./policy.cjs')
const crypto = require('node:crypto')
const statuses = ['open', 'working', 'waiting', 'closed']
async function handleSupport(db, request) {
  const user = await caller(db, request, ['admin', 'landlord', 'tenant'])
  const { action, key, operationId } = request.data || {}
  if (user.role === 'tenant' && !['notifications', 'readNotification'].includes(action))
    fail('無權使用求助管理', 'permission-denied')
  if (action === 'list') {
    const q =
      user.role === 'admin'
        ? db.collection('platform_tickets')
        : db.collection('platform_tickets').where('landlordId', '==', user.id)
    return { items: await readAll(q) }
  }
  if (action === 'notifications')
    return {
      items: await readAll(
        db.collection('platform_notifications').where('recipientId', '==', user.id)
      ),
    }
  if (action === 'readNotification') {
    if (!id(key)) fail('通知格式錯誤', 'invalid-argument')
    const ref = db.collection('platform_notifications').doc(key)
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      if (snap.data()?.recipientId !== user.id) fail('無權修改通知', 'permission-denied')
      tx.update(ref, { isRead: true })
    })
    return { ok: true }
  }
  if (action === 'bindCode') {
    const code = crypto.randomBytes(12).toString('hex')
    await db
      .collection('platform_line_codes')
      .doc(code)
      .set({ uid: user.id, expiresAt: Timestamp.fromMillis(Date.now() + 600000) })
    return { code, expiresAt: Date.now() + 600000 }
  }
  if (action === 'binding') {
    const [binding, config] = await Promise.all([
      db.collection('platform_line_bindings').doc(user.id).get(),
      db.collection('platform_private').doc('line').get(),
    ])
    return { bound: !!binding.data()?.lineUserId, botId: config.data()?.botId || '' }
  }
  if (action === 'unbind') {
    await db.collection('platform_line_bindings').doc(user.id).delete()
    return { ok: true }
  }
  if (action === 'detail') {
    if (!id(key)) fail('案件格式錯誤', 'invalid-argument')
    const snap = await db.collection('platform_tickets').doc(key).get()
    if (!snap.exists || (user.role !== 'admin' && snap.data().landlordId !== user.id))
      fail('找不到案件', 'not-found')
    const unreadField = user.role === 'admin' ? 'unreadAdmin' : 'unreadLandlord'
    if (snap.data()[unreadField]) await snap.ref.update({ [unreadField]: false })
    return {
      ...serialize(snap.data()),
      id: key,
      messages: await readAll(snap.ref.collection('messages')),
    }
  }
  if (!['create', 'reply', 'status'].includes(action) || !id(operationId))
    fail('案件操作格式錯誤', 'invalid-argument')
  if (action === 'create' && user.role !== 'landlord') fail('請由房東建立求助案件')
  const text = request.data.text?.trim()
  if (action !== 'status' && (typeof text !== 'string' || !text || text.length > 5000))
    fail('請填寫問題或留言（最多 5000 字）', 'invalid-argument')
  const attachments = request.data.attachments || []
  if (
    !Array.isArray(attachments) ||
    attachments.length > 5 ||
    attachments.some(
      (p) =>
        typeof p !== 'string' ||
        !p.startsWith(`platform_support/${user.id}/${operationId}/`) ||
        p.includes('..')
    )
  )
    fail('附件格式錯誤', 'invalid-argument')
  const title = request.data.title?.trim()
  if (action === 'create' && (typeof title !== 'string' || !title || title.length > 100))
    fail('請填寫案件標題（最多 100 字）', 'invalid-argument')
  const ticketId = action === 'create' ? operationId : key
  if (!id(ticketId)) fail('案件格式錯誤', 'invalid-argument')
  if (action === 'status' && (user.role !== 'admin' || !statuses.includes(request.data.status)))
    fail('無權變更案件狀態', 'permission-denied')
  const admins = await db.collection('users').where('role', '==', 'admin').get()
  const payloadHash = hash({
    action,
    key: key || null,
    title: title || null,
    text: text || null,
    attachments,
    status: request.data.status || null,
  })
  const ref = db.collection('platform_tickets').doc(ticketId)
  return db.runTransaction(async (tx) => {
    const [snap, receipt] = await Promise.all([
      tx.get(ref),
      tx.get(db.collection('platform_support_runs').doc(operationId)),
    ])
    if (receipt.exists) {
      if (receipt.data().payloadHash !== payloadHash || receipt.data().actorId !== user.id)
        fail('操作識別碼已使用')
      return { id: ticketId, replayed: true }
    }
    if (
      action !== 'create' &&
      (!snap.exists || (user.role !== 'admin' && snap.data().landlordId !== user.id))
    )
      fail('找不到案件', 'not-found')
    const ticket =
      action === 'create'
        ? {
            landlordId: user.id,
            landlordName: user.name || '',
            title,
            status: 'open',
            createdAt: FieldValue.serverTimestamp(),
          }
        : snap.data()
    const status =
      action === 'status'
        ? request.data.status
        : user.role === 'admin'
          ? 'waiting'
          : action === 'create'
            ? 'open'
            : 'working'
    if (action !== 'create' && action !== 'status' && ticket.status === 'closed')
      fail('案件已結案，請另開新案件')
    tx.set(ref, {
      ...ticket,
      status,
      updatedAt: FieldValue.serverTimestamp(),
      lastActor: user.role,
      unreadAdmin: user.role !== 'admin',
      unreadLandlord: user.role === 'admin',
    })
    if (action !== 'status')
      tx.create(ref.collection('messages').doc(operationId), {
        actorId: user.id,
        actorRole: user.role,
        text,
        attachments,
        createdAt: FieldValue.serverTimestamp(),
      })
    if (attachments.length)
      tx.create(db.collection('platform_attachment_access').doc(operationId), {
        landlordId: ticket.landlordId,
        ticketId,
      })
    tx.create(db.collection('platform_support_runs').doc(operationId), {
      actorId: user.id,
      payloadHash,
    })
    const targets = user.role === 'admin' ? [ticket.landlordId] : admins.docs.map((d) => d.id)
    for (const uid of targets)
      notify(
        tx,
        db,
        uid,
        action === 'status' ? '平台求助案件狀態已更新。' : '平台求助案件有新的訊息。',
        `${user.role === 'admin' ? '/landlord' : '/admin'}/support?ticket=${ticketId}`,
        operationId
      )
    return { id: ticketId }
  })
}
async function platformWebhook(db, line, req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  const config = (await db.collection('platform_private').doc('line').get()).data()
  if (!config?.channelSecret || !config?.channelAccessToken)
    return res.status(503).send('尚未設定平台客服 Bot')
  if (
    !line.validateSignature(
      req.rawBody,
      config.channelSecret,
      req.headers['x-line-signature'] || ''
    )
  )
    return res.status(401).send('Invalid signature')
  const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: config.channelAccessToken,
  })
  for (const event of req.body.events || []) {
    if (!event.replyToken || !event.source?.userId || !['follow', 'message'].includes(event.type))
      continue
    const text = event.message?.text?.trim()
    let reply = '平台客服：請登入租屋管理系統，至「平台求助」開案或回覆。'
    if (text && /^[a-f0-9]{24}$/.test(text)) {
      try {
        await db.runTransaction(async (tx) => {
          const code = db.collection('platform_line_codes').doc(text)
          const snap = await tx.get(code)
          if (!snap.exists || snap.data().expiresAt.toMillis() < Date.now()) fail('綁定碼已失效')
          const existing = await tx.get(
            db.collection('platform_line_bindings').where('lineUserId', '==', event.source.userId)
          )
          if (existing.docs.some((d) => d.id !== snap.data().uid)) fail('此 LINE 已綁定其他帳號')
          tx.set(db.collection('platform_line_bindings').doc(snap.data().uid), {
            lineUserId: event.source.userId,
          })
          tx.delete(code)
        })
        reply = '平台客服通知已綁定。案件內容請至系統查看與回覆。'
      } catch {
        reply = '綁定碼無效或已過期，請回系統重新取得。'
      }
    }
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: reply }],
    })
  }
  return res.json({ ok: true })
}
async function deliver(db, line, notificationId) {
  const ref = db.collection('platform_notifications').doc(notificationId)
  const snap = await ref.get()
  if (!snap.exists || snap.data().lineStatus === 'sent') return
  const n = snap.data()
  const [binding, config, user] = await Promise.all([
    db.collection('platform_line_bindings').doc(n.recipientId).get(),
    db.collection('platform_private').doc('line').get(),
    db.collection('users').doc(n.recipientId).get(),
  ])
  let lineUserId = binding.data()?.lineUserId
  let token = config.data()?.channelAccessToken
  if (user.data()?.role === 'tenant') {
    lineUserId = user.data().lineUserId
    token = user.data().landlordId
      ? (await db.collection('line_configs').doc(user.data().landlordId).get()).data()
          ?.channelAccessToken
      : null
  }
  if (!lineUserId || !token) {
    await ref.update({ lineStatus: 'unbound' })
    return
  }
  const { SITE_URL } = require('../line/presentation.cjs')
  const client = new line.messagingApi.MessagingApiClient({ channelAccessToken: token })
  try {
    await client.pushMessage(
      {
        to: lineUserId,
        messages: [
          {
            type: 'text',
            text: `${n.message}\n${SITE_URL}${n.path}${n.path.includes('?') ? '&' : '?'}openExternalBrowser=1`,
          },
        ],
      },
      hash(notificationId).slice(0, 8) + '-0000-4000-8000-' + hash(notificationId).slice(8, 20)
    )
    await ref.update({ lineStatus: 'sent', lineSentAt: FieldValue.serverTimestamp() })
  } catch (e) {
    const status = e.statusCode || e.status
    if (status === 409) {
      await ref.update({ lineStatus: 'sent', lineSentAt: FieldValue.serverTimestamp() })
      return
    }
    await ref.update({ lineStatus: 'failed', lineError: String(status || 'network') })
    throw e
  }
}
module.exports = { handleSupport, platformWebhook, deliver }
