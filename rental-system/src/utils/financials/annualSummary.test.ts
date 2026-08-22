import { describe, it, expect } from 'vitest'
import {
  buildAnnualSummary, totalOf, resolveBillPropertyId,
  UNASSIGNED_PROPERTY_ID, UNASSIGNED_PROPERTY_LABEL,
  type AnnualBill,
} from './annualSummary'

const properties = [{ id: 'pA', name: '甲棟' }, { id: 'pB', name: '乙棟' }]
const tenantRoom = new Map([['t1', '401'], ['t2', '501'], ['t3', '201']])
const roomProperty = new Map([['401', 'pA'], ['501', 'pA'], ['201', 'pB']])

const income = (category: string, amount: number, status: string, extra: Partial<AnnualBill> = {}): AnnualBill =>
  ({ type: 'income', category, amount, status, ...extra })
const expense = (category: string, amount: number, extra: Partial<AnnualBill> = {}): AnnualBill =>
  ({ type: 'expense', category, amount, status: 'completed', ...extra })

const build = (bills: AnnualBill[]) =>
  buildAnnualSummary({ bills, properties, tenantRoom, roomProperty })

describe('resolveBillPropertyId', () => {
  it('帳單自帶 propertyId 時直接採用', () => {
    const b = expense('房屋稅', 100, { propertyId: 'pB', relatedTenantDocId: 't1' })
    expect(resolveBillPropertyId(b, tenantRoom, roomProperty)).toBe('pB')
  })

  it('舊帳單靠 租客 → 房號 → 建物 回溯', () => {
    const b = income('租金收入', 100, 'completed', { relatedTenantDocId: 't3' })
    expect(resolveBillPropertyId(b, tenantRoom, roomProperty)).toBe('pB')
  })

  it('反查鏈斷掉即歸未指定', () => {
    expect(resolveBillPropertyId(income('租金收入', 1, 'completed'), tenantRoom, roomProperty))
      .toBe(UNASSIGNED_PROPERTY_ID)
    expect(resolveBillPropertyId(income('租金收入', 1, 'completed', { relatedTenantDocId: 'ghost' }), tenantRoom, roomProperty))
      .toBe(UNASSIGNED_PROPERTY_ID)
  })
})

describe('buildAnnualSummary', () => {
  it('逐建物分開結算，淨利為已收減支出', () => {
    const list = build([
      income('租金收入', 120000, 'completed', { relatedTenantDocId: 't1' }),
      income('電費', 8000, 'completed', { relatedTenantDocId: 't1' }),
      expense('房屋稅', 18000, { propertyId: 'pA' }),
      income('租金收入', 60000, 'completed', { relatedTenantDocId: 't3' }),
      expense('地價稅', 6000, { propertyId: 'pB' }),
    ])

    const a = list.find(x => x.propertyId === 'pA')!
    expect(a.collected).toBe(128000)
    expect(a.totalExpense).toBe(18000)
    expect(a.net).toBe(110000)
    expect(a.rentCollected).toBe(120000)

    const b = list.find(x => x.propertyId === 'pB')!
    expect(b.net).toBe(54000)
  })

  it('待收不計入淨利，另計於 pending', () => {
    const list = build([
      income('租金收入', 100000, 'completed', { relatedTenantDocId: 't1' }),
      income('租金收入', 20000, 'pending', { relatedTenantDocId: 't1' }),
    ])
    const a = list.find(x => x.propertyId === 'pA')!
    expect(a.collected).toBe(100000)
    expect(a.pending).toBe(20000)
    expect(a.net).toBe(100000)
    expect(a.rentCollected).toBe(100000)
  })

  it('rentCollected 只算租金收入，不含電費', () => {
    const list = build([
      income('租金收入', 100000, 'completed', { relatedTenantDocId: 't1' }),
      income('電費', 30000, 'completed', { relatedTenantDocId: 't1' }),
      income('公共電費', 5000, 'completed', { relatedTenantDocId: 't1' }),
    ])
    expect(list.find(x => x.propertyId === 'pA')!.rentCollected).toBe(100000)
  })

  it('沒有任何帳單的建物仍會出現，數字為零', () => {
    const list = build([income('租金收入', 100, 'completed', { relatedTenantDocId: 't1' })])
    const b = list.find(x => x.propertyId === 'pB')!
    expect(b).toBeDefined()
    expect(b.net).toBe(0)
    expect(b.income).toEqual([])
  })

  it('無法歸屬的帳單另立一組並墊底，不會被吞掉', () => {
    const list = build([
      income('租金收入', 100000, 'completed', { relatedTenantDocId: 't1' }),
      income('其他收入', 7000, 'completed'),
    ])
    expect(list[list.length - 1]!.propertyId).toBe(UNASSIGNED_PROPERTY_ID)
    expect(list[list.length - 1]!.propertyName).toBe(UNASSIGNED_PROPERTY_LABEL)
    expect(list[list.length - 1]!.collected).toBe(7000)
  })

  it('沒有未歸屬帳單時不產生未指定組', () => {
    const list = build([income('租金收入', 100, 'completed', { relatedTenantDocId: 't1' })])
    expect(list.some(x => x.propertyId === UNASSIGNED_PROPERTY_ID)).toBe(false)
  })

  it('分類明細依金額由大到小排序並累計筆數', () => {
    const list = build([
      expense('房屋稅', 18000, { propertyId: 'pA' }),
      expense('修繕費', 3000, { propertyId: 'pA' }),
      expense('修繕費', 2000, { propertyId: 'pA' }),
      expense('火災險', 8000, { propertyId: 'pA' }),
    ])
    const a = list.find(x => x.propertyId === 'pA')!
    expect(a.expense.map(c => c.category)).toEqual(['房屋稅', '火災險', '修繕費'])
    expect(a.expense.find(c => c.category === '修繕費')).toMatchObject({ amount: 5000, count: 2 })
  })

  it('paid 為早期已收寫法，也計為已收', () => {
    const list = build([income('租金收入', 50000, 'paid', { relatedTenantDocId: 't1' })])
    expect(list.find(x => x.propertyId === 'pA')!.collected).toBe(50000)
  })
})

describe('totalOf', () => {
  const bills = [
    income('租金收入', 120000, 'completed', { relatedTenantDocId: 't1' }),
    income('租金收入', 20000, 'pending', { relatedTenantDocId: 't1' }),
    expense('房屋稅', 18000, { propertyId: 'pA' }),
    income('租金收入', 60000, 'completed', { relatedTenantDocId: 't3' }),
    expense('地價稅', 6000, { propertyId: 'pB' }),
    income('其他收入', 7000, 'completed'),
  ]

  it('不變量：總計等於各棟相加', () => {
    const list = build(bills)
    const t = totalOf(list)
    expect(t.collected).toBe(list.reduce((s, x) => s + x.collected, 0))
    expect(t.pending).toBe(list.reduce((s, x) => s + x.pending, 0))
    expect(t.totalExpense).toBe(list.reduce((s, x) => s + x.totalExpense, 0))
    expect(t.net).toBe(t.collected - t.totalExpense)
  })

  it('不變量：總計的收入與支出金額等於原始帳單加總', () => {
    const t = totalOf(build(bills))
    const rawIncome = bills.filter(b => b.type === 'income').reduce((s, b) => s + b.amount, 0)
    const rawExpense = bills.filter(b => b.type === 'expense').reduce((s, b) => s + b.amount, 0)
    expect(t.income.reduce((s, c) => s + c.amount, 0)).toBe(rawIncome)
    expect(t.expense.reduce((s, c) => s + c.amount, 0)).toBe(rawExpense)
  })

  it('同類別跨棟合併並累加筆數', () => {
    const t = totalOf(build(bills))
    expect(t.income.find(c => c.category === '租金收入')).toMatchObject({ amount: 200000, count: 3 })
  })

  it('空清單回傳全零', () => {
    const t = totalOf([])
    expect(t).toMatchObject({ collected: 0, pending: 0, totalExpense: 0, net: 0, rentCollected: 0 })
  })
})
