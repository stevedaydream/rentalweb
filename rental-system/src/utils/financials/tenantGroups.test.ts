import { describe, it, expect } from 'vitest'
import {
  buildTenantGroups, groupKeyOf, isCollected, uncollectedIncome,
  OTHER_GROUP, OTHER_GROUP_LABEL, type GroupableBill,
} from './tenantGroups'

const bill = (over: Partial<GroupableBill> = {}): GroupableBill => ({
  id: Math.random().toString(36).slice(2),
  type: 'income', amount: 1000, status: 'pending',
  target: '楊凱傑 401', relatedTenantDocId: 't1',
  ...over,
})

describe('isCollected：已收款判定', () => {
  it.each([
    ['completed', true],
    ['paid', true],
    ['pending', false],
    ['overdue', false],
    ['waiting_confirmation', false],
  ])('狀態 %s → %s', (status, expected) => {
    expect(isCollected({ status })).toBe(expected)
  })
})

describe('groupKeyOf：歸戶鍵', () => {
  it('優先使用 relatedTenantDocId', () => {
    expect(groupKeyOf(bill({ relatedTenantDocId: 't1', tenantId: 'u1', target: 'X' }))).toBe('t1')
  })

  it('無 relatedTenantDocId 時退回 tenantId', () => {
    expect(groupKeyOf(bill({ relatedTenantDocId: undefined, tenantId: 'u1' }))).toBe('u1')
  })

  it('皆無時退回 target 字串（早期手動帳單）', () => {
    expect(groupKeyOf(bill({ relatedTenantDocId: undefined, tenantId: undefined, target: '401 楊凱傑' })))
      .toBe('401 楊凱傑')
  })

  it('支出一律歸入「其他」，即使帶有租客資訊', () => {
    expect(groupKeyOf(bill({ type: 'expense', relatedTenantDocId: 't1' }))).toBe(OTHER_GROUP)
  })

  it('收入但完全無歸戶資訊時歸入「其他」', () => {
    expect(groupKeyOf(bill({ relatedTenantDocId: undefined, tenantId: undefined, target: undefined })))
      .toBe(OTHER_GROUP)
  })
})

describe('buildTenantGroups：彙總', () => {
  it('同一租客的多筆帳單併為一組', () => {
    const groups = buildTenantGroups([
      bill({ relatedTenantDocId: 't1', amount: 7000 }),
      bill({ relatedTenantDocId: 't1', amount: 1096 }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]!.items).toHaveLength(2)
    expect(groups[0]!.total).toBe(8096)
  })

  it('待收金額只計未收款的收入', () => {
    const groups = buildTenantGroups([
      bill({ relatedTenantDocId: 't1', amount: 7000, status: 'completed' }),
      bill({ relatedTenantDocId: 't1', amount: 1096, status: 'pending' }),
    ])
    expect(groups[0]!.total).toBe(8096)
    expect(groups[0]!.unpaid).toBe(1096)
    expect(groups[0]!.unpaidCount).toBe(1)
    expect(groups[0]!.allCollected).toBe(false)
  })

  it('全部收款後 allCollected 為 true 且待收為 0', () => {
    const groups = buildTenantGroups([
      bill({ relatedTenantDocId: 't1', status: 'completed' }),
      bill({ relatedTenantDocId: 't1', status: 'paid' }),
    ])
    expect(groups[0]!.allCollected).toBe(true)
    expect(groups[0]!.unpaid).toBe(0)
  })

  it('逾期與待確認皆視為未收', () => {
    const groups = buildTenantGroups([
      bill({ relatedTenantDocId: 't1', amount: 100, status: 'overdue' }),
      bill({ relatedTenantDocId: 't1', amount: 200, status: 'waiting_confirmation' }),
    ])
    expect(groups[0]!.unpaidCount).toBe(2)
    expect(groups[0]!.unpaid).toBe(300)
  })

  it('支出以負數計入合計，且不影響待收', () => {
    const groups = buildTenantGroups([
      bill({ type: 'expense', amount: 5000 }),
      bill({ type: 'expense', amount: 3000, status: 'completed' }),
    ])
    const other = groups.find(g => g.key === OTHER_GROUP)!
    expect(other.total).toBe(-8000)
    expect(other.unpaid).toBe(0)
    expect(other.allCollected).toBe(true)
  })

  it('組名取自 target，「其他」使用固定標籤', () => {
    const groups = buildTenantGroups([
      bill({ relatedTenantDocId: 't1', target: '楊凱傑 401' }),
      bill({ type: 'expense', target: '台灣電力公司' }),
    ])
    expect(groups.find(g => g.key === 't1')!.label).toBe('楊凱傑 401')
    expect(groups.find(g => g.key === OTHER_GROUP)!.label).toBe(OTHER_GROUP_LABEL)
  })

  it('沒有 target 的收入顯示為未指定對象', () => {
    const groups = buildTenantGroups([bill({ relatedTenantDocId: 't1', target: '' })])
    expect(groups[0]!.label).toBe('未指定對象')
  })

  it('空清單回傳空陣列', () => {
    expect(buildTenantGroups([])).toEqual([])
  })
})

describe('buildTenantGroups：排序', () => {
  it('待收的租客排在已收之前', () => {
    const groups = buildTenantGroups([
      bill({ relatedTenantDocId: 'a', target: 'A', status: 'completed' }),
      bill({ relatedTenantDocId: 'b', target: 'B', status: 'pending' }),
    ])
    expect(groups.map(g => g.key)).toEqual(['b', 'a'])
  })

  it('「其他」一律置底', () => {
    const groups = buildTenantGroups([
      bill({ type: 'expense' }),
      bill({ relatedTenantDocId: 'a', target: 'A', status: 'completed' }),
      bill({ relatedTenantDocId: 'b', target: 'B', status: 'pending' }),
    ])
    expect(groups[groups.length - 1]!.key).toBe(OTHER_GROUP)
  })

  it('同為待收或同為已收時依名稱排序', () => {
    const groups = buildTenantGroups([
      bill({ relatedTenantDocId: 'c', target: '503' }),
      bill({ relatedTenantDocId: 'a', target: '401' }),
      bill({ relatedTenantDocId: 'b', target: '402' }),
    ])
    expect(groups.map(g => g.label)).toEqual(['401', '402', '503'])
  })
})

describe('不變量', () => {
  const bills = [
    bill({ relatedTenantDocId: 't1', amount: 7000, status: 'completed' }),
    bill({ relatedTenantDocId: 't1', amount: 1096, status: 'pending' }),
    bill({ relatedTenantDocId: 't2', amount: 5500, status: 'pending' }),
    bill({ type: 'expense', amount: 8591, status: 'completed' }),
  ]

  it('每筆帳單恰好出現在一個組別中', () => {
    const groups = buildTenantGroups(bills)
    const ids = groups.flatMap(g => g.items.map(i => i.id))
    expect(ids).toHaveLength(bills.length)
    expect(new Set(ids).size).toBe(bills.length)
  })

  it('各組合計相加等於全部收入減支出', () => {
    const expected = bills.reduce((s, b) => s + (b.type === 'income' ? b.amount : -b.amount), 0)
    expect(buildTenantGroups(bills).reduce((s, g) => s + g.total, 0)).toBe(expected)
  })

  it('各組待收相加等於全部未收收入', () => {
    const expected = bills
      .filter(b => b.type === 'income' && !isCollected(b))
      .reduce((s, b) => s + b.amount, 0)
    expect(buildTenantGroups(bills).reduce((s, g) => s + g.unpaid, 0)).toBe(expected)
  })

  it('uncollectedIncome 的筆數與金額和該組的統計一致', () => {
    for (const g of buildTenantGroups(bills)) {
      const targets = uncollectedIncome(g)
      expect(targets).toHaveLength(g.unpaidCount)
      expect(targets.reduce((s, b) => s + b.amount, 0)).toBe(g.unpaid)
    }
  })

  it('uncollectedIncome 不會包含支出', () => {
    const other = buildTenantGroups(bills).find(g => g.key === OTHER_GROUP)!
    expect(uncollectedIncome(other)).toHaveLength(0)
  })
})
