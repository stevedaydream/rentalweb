import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSigningDetails, pickSigningDetails } from './details.mjs'
import { saveTenantSignature } from './submission.mjs'

const valid = { tenantPhone: ' 0912345678 ', tenantAddress: ' 測試地址 ', tenantEmail: 'test@example.com' }
const signature = 'data:image/png;base64,test'

function fixture({ link = {}, contract = {}, failLink = false } = {}) {
  const linkRef = { id: 'link' }, contractRef = { id: 'contract' }
  const documents = new Map([
    [linkRef, { expireAt: Date.now() + 60000, usedAt: null, ...link }],
    [contractRef, { status: 'awaiting_tenant', tenantUid: 'tenant', tenant: '測試租客', tenantId: 'TEST-ID', rentfee: 9000, ...contract }],
  ])
  const db = { runTransaction: async callback => {
    const updates = []
    await callback({
      get: async ref => ({ exists: documents.has(ref), data: () => documents.get(ref) }),
      update: (ref, data) => {
        if (failLink && ref === linkRef) throw new Error('模擬交易失敗')
        updates.push([ref, data])
      },
    })
    for (const [ref, data] of updates) documents.set(ref, { ...documents.get(ref), ...data })
  } }
  return {
    documents, linkRef, contractRef,
    submit: payload => saveTenantSignature(db, { serverTimestamp: () => 'timestamp' }, { linkRef, contractRef }, { signature, ...payload }),
  }
}

test('補填資料修剪空白、可省略選填欄位，保證人證件轉大寫', () => {
  const details = normalizeSigningDetails({ ...valid, guarantor: ' 測試保證人 ', guarantorId: ' abc123 ' })
  assert.equal(details.tenantPhone, '0912345678')
  assert.equal(details.tenantAddress, '測試地址')
  assert.equal(details.tenantMailAddress, '')
  assert.equal(details.guarantorId, 'ABC123')
  assert.equal(pickSigningDetails({ ...valid, rentfee: 1 }).rentfee, undefined)
})

test('缺少必填、錯誤型別、過長欄位與無效聯絡資料均拒絕', () => {
  for (const value of [null, [], {}, { ...valid, tenantAddress: ' ' }, { ...valid, tenantPhone: 912345678 },
    { ...valid, tenantPhone: '123' }, { ...valid, tenantEmail: 'not-email' },
    { ...valid, tenantAddress: '字'.repeat(301) }, { ...valid, guarantorPhone: '0912345678' }]) {
    assert.throws(() => normalizeSigningDetails(value))
  }
})

test('禁止透過補填資料竄改姓名、證件、租金、租期、範本與權限欄位', async () => {
  for (const key of ['tenant', 'tenantId', 'rentfee', 'startDate', 'status', 'templateHtml', 'landlordUid', '__proto__']) {
    const f = fixture()
    await assert.rejects(f.submit({ tenantDetails: { ...valid, [key]: 'changed' } }), { code: 'invalid-argument' })
    assert.equal(f.documents.get(f.linkRef).usedAt, null)
    assert.equal(f.documents.get(f.contractRef).signature, undefined)
  }
})

test('補填資料、簽名與連結使用狀態同批保存，重複送出不覆寫', async () => {
  const f = fixture()
  await f.submit({ tenantDetails: valid })
  const saved = f.documents.get(f.contractRef)
  assert.equal(saved.tenantPhone, '0912345678')
  assert.equal(saved.tenantEmail, 'test@example.com')
  assert.equal(saved.signature, signature)
  assert.equal(saved.tenantDetailsSubmittedAt, 'timestamp')
  assert.equal(saved.status, 'awaiting_landlord')
  assert.equal(saved.tenantAcknowledgedUid, 'tenant')
  assert.equal(saved.rentfee, 9000)
  assert.equal(saved.tenantId, 'TEST-ID')
  assert.equal(f.documents.get(f.linkRef).usedAt, 'timestamp')
  await assert.rejects(f.submit({ tenantDetails: { ...valid, tenantAddress: '另一個地址' } }), { code: 'failed-precondition' })
  assert.equal(f.documents.get(f.contractRef).tenantAddress, '測試地址')
})

test('交易失敗不保存部分資料，也不消耗簽署連結', async () => {
  const f = fixture({ failLink: true })
  await assert.rejects(f.submit({ tenantDetails: valid }), /模擬交易失敗/)
  assert.equal(f.documents.get(f.contractRef).tenantAddress, undefined)
  assert.equal(f.documents.get(f.contractRef).status, 'awaiting_tenant')
  assert.equal(f.documents.get(f.linkRef).usedAt, null)
})

test('交易內重新擋下過期、鎖定與取消的簽約', async () => {
  for (const [options, code] of [
    [{ link: { expireAt: Date.now() - 1 } }, 'deadline-exceeded'],
    [{ link: { failedAttempts: 5 } }, 'resource-exhausted'],
    [{ contract: { status: 'cancelled' } }, 'failed-precondition'],
  ]) {
    const f = fixture(options)
    await assert.rejects(f.submit({ tenantDetails: valid }), { code })
    assert.equal(f.documents.get(f.linkRef).usedAt, null)
  }
})

test('舊版簽署頁未送補填資料時保留原合約欄位', async () => {
  const f = fixture({ contract: { tenantPhone: '0911111111', tenantAddress: '原地址' } })
  await f.submit({})
  const saved = f.documents.get(f.contractRef)
  assert.equal(saved.tenantPhone, '0911111111')
  assert.equal(saved.tenantAddress, '原地址')
  assert.equal(saved.tenantDetailsSubmittedAt, undefined)
  assert.equal(saved.status, 'awaiting_landlord')
})
