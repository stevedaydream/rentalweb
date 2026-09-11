import { describe, it, expect } from 'vitest'
import {
  collectedOf, outstandingOf, isPartial, allocatePayment, paymentUpdate,
  paymentEntry, applyCredit, planRebills, type PayableBill,
} from './payments'

const bill = (over: Partial<PayableBill & { description?: string; coverFrom?: string; coverTo?: string }> = {}) => ({
  id: Math.random().toString(36).slice(2),
  type: 'income' as const, amount: 7000, status: 'pending',
  date: '2026-08-01', dueDate: '2026-08-05', category: '租金收入',
  ...over,
})

describe('collectedOf／outstandingOf：已收與尚欠', () => {
  it('已結清一律視為全額，即使舊資料沒有 paidAmount', () => {
    expect(collectedOf(bill({ status: 'completed' }))).toBe(7000)
    expect(outstandingOf(bill({ status: 'completed' }))).toBe(0)
  })

  it('早期資料的 paid 狀態同樣視為結清', () => {
    expect(outstandingOf(bill({ status: 'paid' }))).toBe(0)
  })

  it('欠 7000 先繳 5000，剩 2000', () => {
    const b = bill({ paidAmount: 5000 })
    expect(collectedOf(b)).toBe(5000)
    expect(outstandingOf(b)).toBe(2000)
    expect(isPartial(b)).toBe(true)
  })

  it('沒有 paidAmount 的未繳單視為一毛未收', () => {
    expect(collectedOf(bill())).toBe(0)
    expect(isPartial(bill())).toBe(false)
  })

  it('paidAmount 超過帳單金額時以帳單金額為上限，不會出現負的欠款', () => {
    expect(outstandingOf(bill({ paidAmount: 9000 }))).toBe(0)
  })

  it('支出不算欠款', () => {
    expect(outstandingOf(bill({ type: 'expense' }))).toBe(0)
  })
})

describe('allocatePayment：由最舊的開始扣', () => {
  const julyRent = bill({ id: 'jul', date: '2026-07-01', dueDate: '2026-07-05' })
  const augRent = bill({ id: 'aug', date: '2026-08-01' })
  const augElec = bill({ id: 'elec', date: '2026-08-01', amount: 800, category: '電費' })

  it('欠 7000 先繳 5000：扣在最舊的那張，不算繳清', () => {
    const r = allocatePayment([augRent, julyRent], 5000)
    expect(r.allocations).toEqual([{ billId: 'jul', apply: 5000, settles: false }])
    expect(r.leftover).toBe(0)
  })

  it('繳的錢夠多時依序繳清，剩下的是溢繳', () => {
    const r = allocatePayment([augElec, augRent, julyRent], 16000)
    expect(r.allocations.map(a => a.billId)).toEqual(['jul', 'aug', 'elec'])
    expect(r.allocations.every(a => a.settles)).toBe(true)
    expect(r.leftover).toBe(1200)
  })

  it('同一天的帳單，租金先於電費', () => {
    const r = allocatePayment([augElec, augRent], 7000)
    expect(r.allocations[0]!.billId).toBe('aug')
  })

  it('部分付款過的帳單只扣剩餘金額', () => {
    const r = allocatePayment([bill({ id: 'p', paidAmount: 5000 })], 2000)
    expect(r.allocations).toEqual([{ billId: 'p', apply: 2000, settles: true }])
  })

  it('指定類別時先扣該類別，其餘再依帳齡', () => {
    const r = allocatePayment([julyRent, augElec], 800, { preferCategory: '電費' })
    expect(r.allocations).toEqual([{ billId: 'elec', apply: 800, settles: true }])
  })

  it('已結清與支出不參與分配；沒有未繳時全數為溢繳（預繳）', () => {
    const r = allocatePayment([bill({ status: 'completed' }), bill({ type: 'expense' })], 3000)
    expect(r.allocations).toEqual([])
    expect(r.leftover).toBe(3000)
  })

  it('不變量：分配額加溢繳恆等於收款金額', () => {
    for (const amount of [0, 1, 799, 5000, 7000, 14800, 99999]) {
      const r = allocatePayment([julyRent, augRent, augElec], amount)
      expect(r.allocations.reduce((s, a) => s + a.apply, 0) + r.leftover).toBe(amount)
    }
  })
})

describe('paymentUpdate：收款後寫回的欄位', () => {
  it('繳清：completed 並記收款日', () => {
    expect(paymentUpdate(bill({ paidAmount: 5000 }), 2000, '2026-08-10', '2026-08-10'))
      .toEqual({ paidAmount: 7000, status: 'completed', paidAt: '2026-08-10' })
  })

  it('未繳清且未過截止日：維持待收', () => {
    expect(paymentUpdate(bill(), 5000, '2026-08-03', '2026-08-03'))
      .toEqual({ paidAmount: 5000, status: 'pending' })
  })

  it('未繳清且已過截止日：逾期', () => {
    expect(paymentUpdate(bill(), 5000, '2026-08-10', '2026-08-10').status).toBe('overdue')
  })

  it('租客傳了截圖但只繳一部分：截圖處理完退回待收，不會卡在待確認', () => {
    expect(paymentUpdate(bill({ status: 'waiting_confirmation' }), 3000, '2026-08-02', '2026-08-02').status)
      .toBe('pending')
  })
})

describe('paymentEntry：收款紀錄', () => {
  it('沒有備註時不帶 note 欄位（Firestore 不接受 undefined）', () => {
    expect('note' in paymentEntry(5000, '2026-08-10', 'manual')).toBe(false)
    expect('note' in paymentEntry(5000, '2026-08-10', 'manual', '  ')).toBe(false)
  })

  it('有備註時保留', () => {
    expect(paymentEntry(5000, '2026-08-10', 'manual', '現金').note).toBe('現金')
  })
})

describe('applyCredit：預收餘額沖抵新帳單', () => {
  it('依序沖抵，用完為止', () => {
    expect(applyCredit([7000, 800], 7500)).toEqual({ applied: [7000, 500], remaining: 0 })
  })

  it('餘額多於帳單時留下剩餘', () => {
    expect(applyCredit([7000], 10000)).toEqual({ applied: [7000], remaining: 3000 })
  })

  it('沒有餘額時不沖抵', () => {
    expect(applyCredit([7000, 800], 0)).toEqual({ applied: [0, 0], remaining: 0 })
  })
})

describe('planRebills：季繳改月繳時重新出帳', () => {
  const quarterly = bill({
    id: 'q', date: '2026-07-01', amount: 21000,
    description: '2026-07～2026-09 季度房租',
  })
  const monthlyTenant = { paymentFrequency: 'monthly', rent: 7000 }

  it('尚未繳的季繳單改成起始月的一個月租金', () => {
    const [item] = planRebills(monthlyTenant, [quarterly], '2026-08')
    expect(item).toMatchObject({
      amount: 7000, description: '2026-07 月份房租',
      coverFrom: '2026-07', coverTo: '2026-07',
      collected: 0, settles: false, excess: 0,
    })
  })

  it('已經繳了一部分且超過新金額：視為繳清，多的轉預收', () => {
    const [item] = planRebills(monthlyTenant, [{ ...quarterly, paidAmount: 10000 }], '2026-08')
    expect(item).toMatchObject({ settles: true, excess: 3000 })
  })

  it('已繳清的季繳單不動（剩下的月份是預繳，期滿自然接月繳）', () => {
    expect(planRebills(monthlyTenant, [{ ...quarterly, status: 'completed' }], '2026-08')).toEqual([])
  })

  it('涵蓋期已經過去的舊帳不動', () => {
    expect(planRebills(monthlyTenant, [quarterly], '2026-10')).toEqual([])
  })

  it('繳費方式沒變時不動', () => {
    expect(planRebills({ paymentFrequency: 'quarterly', rent: 7000 }, [quarterly], '2026-08')).toEqual([])
  })

  it('月繳改季繳但下個月的單已經開了：擴大後會重疊，不動', () => {
    const aug = bill({ id: 'a', date: '2026-08-01', description: '2026-08 月份房租' })
    const sep = bill({ id: 's', date: '2026-09-01', description: '2026-09 月份房租' })
    expect(planRebills({ paymentFrequency: 'quarterly', rent: 7000 }, [aug, sep], '2026-08')
      .map(i => i.bill.id)).toEqual(['s'])
  })
})
