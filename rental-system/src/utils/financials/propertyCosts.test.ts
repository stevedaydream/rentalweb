import { describe, it, expect } from 'vitest'
import { PropertyCostType } from '../../types/index'
import {
  defaultPeriodFor, costYearOf, allocationTotal, evenSplit, validateCost, buildCostBills,
} from './propertyCosts'

describe('defaultPeriodFor', () => {
  it('房屋稅課稅期間跨年：前一年 7/1 ～ 當年 6/30，5/31 截止', () => {
    expect(defaultPeriodFor(PropertyCostType.HouseTax, 2026)).toEqual({
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
      dueDate: '2026-05-31',
    })
  })

  it('地價稅為曆年制，11/30 截止', () => {
    expect(defaultPeriodFor(PropertyCostType.LandTax, 2026)).toEqual({
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      dueDate: '2026-11-30',
    })
  })

  it('火災險依保單起訖，不給預設', () => {
    expect(defaultPeriodFor(PropertyCostType.FireInsurance, 2026)).toEqual({
      periodStart: '', periodEnd: '', dueDate: '',
    })
  })
})

describe('costYearOf', () => {
  it('房屋稅跨年期間以迄日認年度，與稅單年度一致', () => {
    expect(costYearOf({ periodEnd: '2026-06-30', dueDate: '2026-05-31' })).toBe(2026)
  })

  it('沒有期間時退回繳納期限', () => {
    expect(costYearOf({ periodEnd: '', dueDate: '2026-11-30' })).toBe(2026)
  })

  it('兩者皆無時回傳 null', () => {
    expect(costYearOf({ periodEnd: '', dueDate: '' })).toBeNull()
  })
})

describe('evenSplit', () => {
  it('整除時平均分配', () => {
    expect(evenSplit(900, ['a', 'b', 'c'])).toEqual([
      { propertyId: 'a', amount: 300 },
      { propertyId: 'b', amount: 300 },
      { propertyId: 'c', amount: 300 },
    ])
  })

  it('不整除時餘數給第一棟，加總分毫不差', () => {
    const r = evenSplit(1000, ['a', 'b', 'c'])
    expect(r).toEqual([
      { propertyId: 'a', amount: 334 },
      { propertyId: 'b', amount: 333 },
      { propertyId: 'c', amount: 333 },
    ])
    expect(allocationTotal(r)).toBe(1000)
  })

  it('不變量：任意金額與棟數，分攤加總皆等於總額', () => {
    for (const amount of [1, 7, 999, 12345, 6000]) {
      for (const n of [1, 2, 3, 5, 7]) {
        const ids = Array.from({ length: n }, (_, i) => `p${i}`)
        expect(allocationTotal(evenSplit(amount, ids))).toBe(amount)
      }
    }
  })

  it('沒有建物時回傳空陣列', () => {
    expect(evenSplit(1000, [])).toEqual([])
  })
})

describe('validateCost', () => {
  const base = {
    amount: 6000,
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
    allocations: [{ propertyId: 'pA', amount: 4200 }, { propertyId: 'pB', amount: 1800 }],
  }

  it('加總等於總額時通過', () => {
    expect(validateCost(base)).toBeNull()
  })

  it('分攤多於總額時擋下並說明差額', () => {
    const r = validateCost({ ...base, allocations: [{ propertyId: 'pA', amount: 6500 }] })
    expect(r).toContain('多 500')
  })

  it('分攤少於總額時擋下並說明差額', () => {
    const r = validateCost({ ...base, allocations: [{ propertyId: 'pA', amount: 5000 }] })
    expect(r).toContain('少 1,000')
  })

  it('金額為零或負數時擋下', () => {
    expect(validateCost({ ...base, amount: 0 })).toBe('請輸入金額')
    expect(validateCost({ ...base, amount: -100 })).toBe('請輸入金額')
  })

  it('期間未填或起日晚於迄日時擋下', () => {
    expect(validateCost({ ...base, periodStart: '' })).toBe('請填寫所屬期間')
    expect(validateCost({ ...base, periodStart: '2026-12-31', periodEnd: '2026-01-01' }))
      .toBe('所屬期間的起日不能晚於迄日')
  })

  it('沒有分攤或分攤未選建物時擋下', () => {
    expect(validateCost({ ...base, allocations: [] })).toBe('請至少分攤到一棟建物')
    expect(validateCost({ ...base, allocations: [{ propertyId: '', amount: 6000 }] }))
      .toBe('有分攤項目未選擇建物')
  })
})

describe('buildCostBills', () => {
  const names = new Map([['pA', '基隆復興路'], ['pB', '中山路']])
  const cost = {
    type: PropertyCostType.LandTax,
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
    docNo: 'A-123',
    allocations: [{ propertyId: 'pA', amount: 4200 }, { propertyId: 'pB', amount: 1800 }],
  }

  it('一棟一筆，金額取該棟分攤額', () => {
    const bills = buildCostBills(cost, '2026-11-20', names)
    expect(bills).toHaveLength(2)
    expect(bills[0]).toMatchObject({
      propertyId: 'pA', amount: 4200, date: '2026-11-20',
      type: 'expense', category: '地價稅', target: '基隆復興路',
    })
    expect(bills[1]!.target).toBe('中山路')
  })

  it('不變量：落帳金額加總等於稅單總額', () => {
    const bills = buildCostBills(cost, '2026-11-20', names)
    expect(bills.reduce((s, b) => s + b.amount, 0)).toBe(6000)
  })

  it('描述含期間與單號', () => {
    const [b] = buildCostBills(cost, '2026-11-20', names)
    expect(b!.description).toBe('2026-01-01 ~ 2026-12-31 · A-123')
  })

  it('沒有單號時描述只有期間', () => {
    const [b] = buildCostBills({ ...cost, docNo: undefined }, '2026-11-20', names)
    expect(b!.description).toBe('2026-01-01 ~ 2026-12-31')
  })

  it('分攤為 0 的建物不落帳', () => {
    const bills = buildCostBills(
      { ...cost, allocations: [{ propertyId: 'pA', amount: 6000 }, { propertyId: 'pB', amount: 0 }] },
      '2026-11-20', names,
    )
    expect(bills).toHaveLength(1)
  })

  it('建物已被刪除時仍落帳，標為未指定而非丟失金額', () => {
    const [b] = buildCostBills(
      { ...cost, allocations: [{ propertyId: 'ghost', amount: 6000 }] },
      '2026-11-20', new Map(),
    )
    expect(b!.target).toBe('未指定建物')
    expect(b!.amount).toBe(6000)
  })
})
