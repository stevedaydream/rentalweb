import { describe, it, expect } from 'vitest'
import { isDeferred, canDefer, deferUpdate, type DeferrableBill } from './deferral'

const bill = (over: Partial<DeferrableBill> = {}): DeferrableBill => ({
  id: 'b1', type: 'income', amount: 7000, status: 'overdue',
  date: '2026-09-01', dueDate: '2026-09-12', ...over,
})

describe('isDeferred：新收款日之前不算欠繳', () => {
  it('新收款日當天以前算延後中', () => {
    const b = bill({ status: 'pending', deferredUntil: '2026-10-20' })
    expect(isDeferred(b, '2026-10-05')).toBe(true)
    expect(isDeferred(b, '2026-10-20')).toBe(true)
  })
  it('過了新收款日就回到一般欠繳', () => {
    expect(isDeferred(bill({ deferredUntil: '2026-10-20' }), '2026-10-21')).toBe(false)
  })
  it('已收清或支出不算', () => {
    expect(isDeferred(bill({ status: 'completed', deferredUntil: '2026-10-20' }), '2026-10-05')).toBe(false)
    expect(isDeferred(bill({ type: 'expense', deferredUntil: '2026-10-20' }), '2026-10-05')).toBe(false)
  })
})

describe('canDefer', () => {
  it('待收與逾期可延後，待確認與已收不行', () => {
    expect(canDefer(bill())).toBe(true)
    expect(canDefer(bill({ status: 'pending' }))).toBe(true)
    expect(canDefer(bill({ status: 'waiting_confirmation' }))).toBe(false)
    expect(canDefer(bill({ status: 'completed' }))).toBe(false)
  })
})

describe('deferUpdate', () => {
  it('逾期改回待收，截止日改成新收款日並保留原截止日與紀錄', () => {
    const u = deferUpdate(bill(), '2026-10-20', '發薪日', '2026-10-05T00:00:00.000Z')
    expect(u.status).toBe('pending')
    expect(u.dueDate).toBe('2026-10-20')
    expect(u.deferredUntil).toBe('2026-10-20')
    expect(u.originalDueDate).toBe('2026-09-12')
    expect(u.history[0]!.note).toBe('延後收款：2026-09-12 → 2026-10-20（發薪日）')
    expect(u.history[0]!.data.status).toBe('overdue')
  })
  it('再次延後時保留最初的截止日，紀錄累加', () => {
    const first = { ...bill(), ...deferUpdate(bill(), '2026-10-20', '', 'a') }
    const second = deferUpdate(first, '2026-10-31', '', 'b')
    expect(second.originalDueDate).toBe('2026-09-12')
    expect(second.history).toHaveLength(2)
    expect(second.history[0]!.note).toBe('延後收款：2026-10-20 → 2026-10-31')
  })
})
