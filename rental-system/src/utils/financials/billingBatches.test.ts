import { describe, it, expect } from 'vitest'
import { billingBatches } from './billingBatches'

describe('出帳分批保留租約與餘額的原子性', () => {
  it('跨越 450 筆時也不拆開同一租約', () => {
    const plans = Array.from({ length: 151 }, (_, i) => ({
      tenantKey: `tenant-${i}`, target: `${i}`, version: 'v', creditBefore: 1000, creditUsed: 1000,
      items: Array.from({ length: 3 }, () => ({ target: '', category: '租金收入', description: '', amount: 500 })),
    }))
    let id = 0
    const batches = billingBatches(plans, () => `run-${++id}`)
    expect(batches).toHaveLength(2)
    expect(batches.flatMap(b => b.selections).map(s => s.tenantKey)).toEqual(plans.map(p => p.tenantKey))
    for (const b of batches) expect(2 + b.selections.length * 4).toBeLessThanOrEqual(400)
    expect(new Set(batches.map(b => b.operationId)).size).toBe(2)
  })
  it('超大單一租約須先處理，不能切開餘額扣款', () => {
    expect(() => billingBatches([{ tenantKey: 'x', target: '甲', version: 'v', creditBefore: 0, creditUsed: 0,
      items: Array.from({ length: 398 }, () => ({ target: '', category: '', description: '', amount: 1 })) }]))
      .toThrow('超過上限')
  })
})
