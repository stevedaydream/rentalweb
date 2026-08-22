import { describe, it, expect } from 'vitest'
import { accountStateOf, summarizeAccounts, type AccountStatus } from './tenantAccount'

const status = (over: Partial<AccountStatus> = {}): AccountStatus => ({
  exists: true, lastSignInAt: null, createdAt: '2026-05-04T00:00:00Z',
  disabled: false, lineBound: false, ...over,
})

describe('accountStateOf', () => {
  it('沒有 uid 即未建立帳號', () => {
    expect(accountStateOf({}, {}).key).toBe('none')
    expect(accountStateOf({ uid: '' }, {}).key).toBe('none')
  })

  it('尚未查回時為 loading，而非誤判成沒帳號', () => {
    const r = accountStateOf({ uid: 'u1' }, null)
    expect(r.key).toBe('loading')
  })

  it('已建立但從未登入', () => {
    const r = accountStateOf({ uid: 'u1' }, { u1: status() })
    expect(r.key).toBe('pending')
    expect(r.lastSignInDate).toBeNull()
  })

  it('登入過即為已啟用，並帶出最後登入日', () => {
    const r = accountStateOf({ uid: 'u1' }, { u1: status({ lastSignInAt: '2026-08-20T13:45:00Z' }) })
    expect(r.key).toBe('active')
    expect(r.lastSignInDate).toBe('2026-08-20')
  })

  it('查回但查無此 uid 代表 Auth 帳號已刪除，與 loading 要分得出來', () => {
    expect(accountStateOf({ uid: 'ghost' }, {}).key).toBe('orphan')
    expect(accountStateOf({ uid: 'u1' }, { u1: status({ exists: false }) }).key).toBe('orphan')
  })

  it('停用優先於登入狀態顯示', () => {
    const r = accountStateOf({ uid: 'u1' }, { u1: status({ disabled: true, lastSignInAt: '2026-08-20T00:00:00Z' }) })
    expect(r.key).toBe('disabled')
    // 停用後仍保留最後登入日供判斷
    expect(r.lastSignInDate).toBe('2026-08-20')
  })

  it('LINE 綁定狀態獨立於帳號狀態，兩種組合都要正確', () => {
    const boundNotLoggedIn = accountStateOf({ uid: 'u1' }, { u1: status({ lineBound: true }) })
    expect(boundNotLoggedIn.key).toBe('pending')
    expect(boundNotLoggedIn.lineBound).toBe(true)

    const loggedInNotBound = accountStateOf({ uid: 'u1' }, { u1: status({ lastSignInAt: '2026-08-20T00:00:00Z' }) })
    expect(loggedInNotBound.key).toBe('active')
    expect(loggedInNotBound.lineBound).toBe(false)
  })

  it('無效的登入時間字串視為未登入，不會壞掉', () => {
    const r = accountStateOf({ uid: 'u1' }, { u1: status({ lastSignInAt: 'not-a-date' }) })
    expect(r.key).toBe('pending')
    expect(r.lastSignInDate).toBeNull()
  })
})

describe('summarizeAccounts', () => {
  it('逐一分類並計數', () => {
    const statuses = {
      a: status({ lastSignInAt: '2026-08-20T00:00:00Z' }),
      b: status(),
      c: status({ disabled: true }),
    }
    const r = summarizeAccounts(
      [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }, { uid: 'ghost' }, {}],
      statuses,
    )
    expect(r).toMatchObject({ active: 1, pending: 1, disabled: 1, orphan: 1, none: 1 })
  })

  it('不變量：各狀態筆數相加等於租客總數', () => {
    const tenants = [{ uid: 'a' }, { uid: 'b' }, {}, { uid: 'ghost' }]
    const total = Object.values(summarizeAccounts(tenants, { a: status() }))
      .reduce((s, n) => s + n, 0)
    expect(total).toBe(tenants.length)
  })

  it('尚未查回時全部歸為 loading', () => {
    const r = summarizeAccounts([{ uid: 'a' }, { uid: 'b' }], null)
    expect(r.loading).toBe(2)
  })
})
