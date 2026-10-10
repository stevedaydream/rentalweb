import { createRequire } from 'node:module'
import { buildPlan, publicPlan, hash } from './planner.mjs'
import { validMonth, monthEnd } from './rules.mjs'

// index.js loads onCall through CommonJS. Use that same export condition so the
// callable wrapper recognizes instanceof HttpsError even with dual ESM/CJS SDK builds.
const { HttpsError } = createRequire(import.meta.url)('firebase-functions/v2/https')

const rows = snap => snap.docs.map(d => ({ ...d.data(), id: d.id }))
const fail = message => { throw new HttpsError('invalid-argument', message) }
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && !value.includes('/')
export const MAX_WRITES = 400

// Dependency injection lets the emulator tests exercise the actual transaction implementation.
export async function handleBilling(db, FieldValue, request) {
  if (!request.auth) throw new HttpsError('unauthenticated', '請先登入')
  const { month, mode, landlordId = request.auth.uid, operationId, selections } = request.data || {}
  if (!validMonth(month) || !validId(landlordId)) fail('月份或房東識別碼格式錯誤')
  if (mode !== 'preview' && mode !== 'commit') fail('操作必須是 preview 或 commit')
  if (mode === 'commit') {
    if (!validId(operationId) || !Array.isArray(selections) || !selections.length || selections.length > 100
      || selections.some(s => !s || !validId(s.tenantKey) || !/^[a-f0-9]{64}$/.test(s.version))
      || new Set(selections.map(s => s.tenantKey)).size !== selections.length) fail('出帳確認資料格式錯誤')
  }
  const requestHash = mode === 'commit' ? hash({ month, selections }) : null
  const runId = mode === 'commit' ? hash([landlordId, operationId]) : null
  const runRef = runId ? db.collection('billing_runs').doc(runId) : null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const at = new Date().toISOString()

  return db.runTransaction(async tx => {
    const caller = await tx.get(db.collection('users').doc(request.auth.uid))
    const role = caller.data()?.role
    if (role !== 'landlord' && role !== 'admin') throw new HttpsError('permission-denied', '僅房東或管理員可出帳')
    if (landlordId !== request.auth.uid && role !== 'admin') throw new HttpsError('permission-denied', '無權操作其他房東帳單')
    const profile = landlordId === request.auth.uid ? caller : await tx.get(db.collection('users').doc(landlordId))
    if (!profile.exists) throw new HttpsError('not-found', '找不到房東設定')
    const serviceState = await tx.get(db.collection('platform_accounts').doc(landlordId))
    if (['all', 'deleting', 'deleted'].includes(serviceState.data()?.mode) || serviceState.data()?.archived) throw new HttpsError('failed-precondition', '房東服務已暫停，無法出帳')
    if (role === 'landlord' && serviceState.data()?.mode === 'landlord') throw new HttpsError('permission-denied', '房東帳戶已暫停')
    if (mode === 'commit' && role === 'admin' && !request.data.adminReason?.trim()) fail('管理員出帳請填寫原因')
    if (runRef) {
      const previous = await tx.get(runRef)
      if (previous.exists) {
        if (previous.data().requestHash !== requestHash) fail('同一操作識別碼不能用於不同出帳內容')
        return { ...previous.data().result, replayed: true }
      }
    }
    const owned = name => db.collection(name).where('landlordId', '==', landlordId)
    // Do not use the paginated UI list or a 12-month cutoff: legacy bills and future
    // coverage must participate in duplicate detection. A large account fails explicitly.
    const read = async query => {
      const snap = await tx.get(query.limit(20001))
      if (snap.size > 20000) throw new HttpsError('resource-exhausted', '帳務資料量超出本次出帳上限，請先分區整理帳務資料')
      return rows(snap)
    }
    const [tenants, rooms, readings, publicMeters, groups, bills, properties, template, contracts] = await Promise.all([
      read(owned('tenants')), read(owned('rooms')),
      read(owned('meter_readings').where('periodEnd', '>=', `${month}-01`).where('periodEnd', '<=', monthEnd(month))),
      read(owned('public_meters')), read(owned('meter_groups')), read(owned('bills')),
      read(owned('properties')), tx.get(db.collection('contract_templates').doc(landlordId)),
      read(owned('contracts')),
    ])
    let plan
    try {
      plan = buildPlan({ landlordId, month, tenants, rooms, readings, publicMeters, groups, bills, settings: profile.data().settings,
        properties, contracts, templateFeeWater: template.exists ? template.data().feeWater : undefined })
    } catch (e) { throw new HttpsError('failed-precondition', e.message) }
    if (mode === 'preview') return publicPlan(plan)

    const selected = selections.map(s => {
      const p = plan.plans.find(p => p.tenantKey === s.tenantKey)
      if (!p || p.version !== s.version) {
        throw new HttpsError('failed-precondition', '帳單、租約、抄表或預收餘額已變動，請重新預覽後確認；已完成的批次會保留')
      }
      return p
    })
    const writeCount = selected.reduce((n, p) => n + p.bills.length + 1 + (role === 'admin' && !request.data.suppressNotification ? 1 : 0), role === 'admin' ? 4 : 2)
    if (writeCount > MAX_WRITES) throw new HttpsError('resource-exhausted', '本批帳單過多，請分批出帳；同一租約不可拆開扣款')
    const publicSelected = publicPlan({ ...plan, plans: selected }).plans
    const items = publicSelected.flatMap(p => p.items)
    const result = { month, billCount: items.length, items, tenantKeys: selected.map(p => p.tenantKey) }
    for (const p of selected) {
      for (const bill of p.bills) {
        const { id, creditApplied, ...data } = bill
        if (creditApplied > 0) {
          data.paidAmount = creditApplied
          data.payments = [{ amount: creditApplied, date: today, source: 'credit', note: '預收餘額沖抵', at }]
          if (creditApplied >= data.amount) Object.assign(data, { status: 'completed', paidAt: today })
        }
        tx.create(db.collection('bills').doc(id), { ...data, ...(role === 'admin' ? { adminOperationId: operationId, suppressNotification: request.data.suppressNotification === true } : {}), generationRunId: runId, createdAt: FieldValue.serverTimestamp() })
      }
      // Serialize concurrent runs for this lease, including those with zero credit.
      const update = { billingRevision: FieldValue.increment(1) }
      if (p.creditUsed > 0) {
        update.credit = p.creditBefore - p.creditUsed
        update.creditLog = FieldValue.arrayUnion({
          amount: -p.creditUsed, date: today, source: 'credit', note: `${month} 帳單沖抵`, at, generationRunId: runId,
        })
      }
      tx.update(db.collection('tenants').doc(p.tenantKey), update)
    }
    // The durable retry receipt and human-readable log commit with bills and balances.
    tx.create(runRef, { landlordId, month, requestHash, result, createdAt: FieldValue.serverTimestamp() })
    tx.create(db.collection('bill_generate_logs').doc(runId), {
      landlordId, month, generatedAt: FieldValue.serverTimestamp(), billCount: items.length, items,
      actorId: request.auth.uid, billingVersion: 2,
      allocations: plan.allocations.filter(a => selected.some(p => p.bills.some(b => b.calculation?.readingId === a.readingId))),
    })
    if (role === 'admin') {
      tx.create(db.collection('admin_audit').doc(runId), { actorId: request.auth.uid, landlordId, kind: 'bills', action: 'generate', reason: request.data.adminReason, after: result, at: FieldValue.serverTimestamp() })
      const { notify } = createRequire(import.meta.url)('../admin/service.cjs')
      notify(tx, db, landlordId, '平台管理員已補開帳單，請登入查看。', '/landlord/financials', runId)
      if (!request.data.suppressNotification) for (const p of selected) {
        const tenantUid = tenants.find(t => t.id === p.tenantKey)?.uid
        if (tenantUid) notify(tx, db, tenantUid, '平台管理員已補開您的帳單，請登入查看。', '/tenant/bills', runId)
      }
    }
    return { ...result, replayed: false }
  }, mode === 'preview' ? { readOnly: true } : { maxAttempts: 5 })
}
