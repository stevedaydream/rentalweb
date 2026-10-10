import { beforeEach, expect, it, vi } from 'vitest'
const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('firebase/functions', () => ({ httpsCallable: () => send }))
vi.mock('../firebase/config', () => ({
  functions: {},
  auth: { currentUser: { uid: 'test-admin' } },
}))
import { adminCall } from './adminService'
const pending = new Map<string, string>()
beforeEach(() => {
  send.mockReset()
  pending.clear()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => pending.get(key) || null,
    setItem: (key: string, value: string) => pending.set(key, value),
    removeItem: (key: string) => pending.delete(key),
  })
})

it('收款回應遺失後沿用原操作識別碼，成功後清除重試憑據', async () => {
  send.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: { ok: true } })
  const data = {
    action: 'mutate',
    operation: 'collect',
    kind: 'tenants',
    key: 'tenant',
    version: 'v1',
    reason: '登記收款',
    input: { amount: 100 },
  }
  await expect(adminCall({ ...data, operationId: 'first' })).rejects.toThrow('network')
  expect([...pending.values()]).toEqual(['first'])
  await adminCall({ ...data, operationId: 'retry' })
  expect(send.mock.calls.map((call) => call[0].operationId)).toEqual(['first', 'first'])
  expect(pending.size).toBe(0)
})

it('不同版本與金額使用獨立操作，避免把新的處理誤認為重試', async () => {
  send.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: { ok: true } })
  const data = {
    action: 'mutate',
    operation: 'credit',
    key: 'tenant',
    version: 'v1',
    input: { amount: 100 },
  }
  await expect(adminCall({ ...data, operationId: 'old' })).rejects.toThrow()
  await adminCall({ ...data, version: 'v2', input: { amount: 200 }, operationId: 'new' })
  expect(send.mock.calls[1]![0].operationId).toBe('new')
})
