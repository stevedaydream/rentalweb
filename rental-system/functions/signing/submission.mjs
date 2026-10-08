import { HttpsError } from 'firebase-functions/v2/https'
import { normalizeSigningDetails } from './details.mjs'

export async function saveTenantSignature(db, FieldValue, { linkRef, contractRef }, { signature, tenantDetails }) {
  let details
  if (tenantDetails !== undefined) {
    try { details = normalizeSigningDetails(tenantDetails) }
    catch (error) { throw new HttpsError('invalid-argument', error.message) }
  }
  await db.runTransaction(async tx => {
    const [linkNow, contractNow] = await Promise.all([tx.get(linkRef), tx.get(contractRef)])
    if (!linkNow.exists || !contractNow.exists) throw new HttpsError('not-found', '連結或合約已不存在')
    const link = linkNow.data(), contract = contractNow.data()
    if (link.usedAt || contract.status !== 'awaiting_tenant') throw new HttpsError('failed-precondition', '此連結已使用過或合約已完成簽名')
    if (link.expireAt && Date.now() > link.expireAt) throw new HttpsError('deadline-exceeded', '連結已過期')
    if ((link.failedAttempts || 0) >= 5) throw new HttpsError('resource-exhausted', '驗證失敗次數過多')
    tx.update(contractRef, {
      ...details,
      ...(details ? { tenantDetailsSubmittedAt: FieldValue.serverTimestamp() } : {}),
      signature,
      status: 'awaiting_landlord',
      tenantSignedAt: FieldValue.serverTimestamp(),
      tenantAcknowledgedAt: FieldValue.serverTimestamp(),
      tenantAcknowledgedUid: contract.tenantUid || null,
    })
    tx.update(linkRef, { usedAt: FieldValue.serverTimestamp() })
  })
}
