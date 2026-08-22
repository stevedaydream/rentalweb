/**
 * 年度損益彙總（純函式）。
 *
 * 逐建物結算：房屋稅／地價稅／火災險本來就按建物課，租金與電費則要
 * 靠帳單歸棟才算得出「哪一棟賺多少」。
 *
 * 淨利採實收減實付：待收的租金列出來但不計入淨利，與帳務頁月度統計
 * 的口徑一致（該頁 income 只計已收，pending 另計）。
 */
import { isCollected } from './tenantGroups'

export const UNASSIGNED_PROPERTY_ID = '__unassigned__'
export const UNASSIGNED_PROPERTY_LABEL = '未指定建物'

export interface AnnualBill {
  type: 'income' | 'expense'
  category: string
  amount: number
  status?: string
  /** 落帳時寫入；租金與電費等舊帳單沒有，需回溯歸屬 */
  propertyId?: string
  relatedTenantDocId?: string
}

export interface CategoryTotal {
  category: string
  amount: number
  count: number
}

export interface PropertySummary {
  propertyId: string
  propertyName: string
  income: CategoryTotal[]
  expense: CategoryTotal[]
  /** 已收 */
  collected: number
  /** 待收（不計入淨利） */
  pending: number
  totalExpense: number
  /** 已收 − 支出 */
  net: number
  /** 租金收入（已收），公益出租人免稅額的上限依據 */
  rentCollected: number
}

/**
 * 帳單歸屬的建物。
 *
 * 落帳時寫入的 propertyId 優先；租金與電費等既有帳單沒有這個欄位，
 * 退回 relatedTenantDocId → 租客房號 → rooms.propertyId 回溯。
 * 任一環節斷掉即歸為未指定，不臆測。
 */
export const resolveBillPropertyId = (
  bill: AnnualBill,
  tenantRoom: Map<string, string>,
  roomProperty: Map<string, string>,
): string => {
  if (bill.propertyId) return bill.propertyId
  const room = bill.relatedTenantDocId ? tenantRoom.get(bill.relatedTenantDocId) : undefined
  const propertyId = room ? roomProperty.get(room) : undefined
  return propertyId || UNASSIGNED_PROPERTY_ID
}

const RENT_CATEGORY = '租金收入'

const tally = (map: Map<string, CategoryTotal>, category: string, amount: number) => {
  const cur = map.get(category) ?? { category, amount: 0, count: 0 }
  cur.amount += amount
  cur.count++
  map.set(category, cur)
}

const toSortedList = (map: Map<string, CategoryTotal>) =>
  Array.from(map.values()).sort((a, b) => b.amount - a.amount)

export interface AnnualSummaryInput {
  bills: AnnualBill[]
  properties: { id: string; name: string }[]
  /** tenants 文件 id → 房號 */
  tenantRoom: Map<string, string>
  /** 房號 → propertyId */
  roomProperty: Map<string, string>
}

/**
 * 逐建物彙總。所有建物一律出現（即使當年沒有任何帳單），未能歸屬的
 * 帳單另立一組，讓房東看得到有東西沒歸位而不是被靜靜吞掉。
 */
export const buildAnnualSummary = (input: AnnualSummaryInput): PropertySummary[] => {
  const { bills, properties, tenantRoom, roomProperty } = input

  const buckets = new Map<string, {
    income: Map<string, CategoryTotal>
    expense: Map<string, CategoryTotal>
    collected: number
    pending: number
    totalExpense: number
    rentCollected: number
  }>()

  const ensure = (id: string) => {
    if (!buckets.has(id)) {
      buckets.set(id, {
        income: new Map(), expense: new Map(),
        collected: 0, pending: 0, totalExpense: 0, rentCollected: 0,
      })
    }
    return buckets.get(id)!
  }

  properties.forEach(p => ensure(p.id))

  for (const bill of bills) {
    const propertyId = resolveBillPropertyId(bill, tenantRoom, roomProperty)
    const b = ensure(propertyId)
    const amount = Number(bill.amount) || 0

    if (bill.type === 'expense') {
      tally(b.expense, bill.category, amount)
      b.totalExpense += amount
      continue
    }

    tally(b.income, bill.category, amount)
    if (isCollected({ status: bill.status ?? '' })) {
      b.collected += amount
      if (bill.category === RENT_CATEGORY) b.rentCollected += amount
    } else {
      b.pending += amount
    }
  }

  const nameOf = (id: string) =>
    id === UNASSIGNED_PROPERTY_ID
      ? UNASSIGNED_PROPERTY_LABEL
      : properties.find(p => p.id === id)?.name || UNASSIGNED_PROPERTY_LABEL

  return Array.from(buckets.entries())
    .map(([propertyId, b]): PropertySummary => ({
      propertyId,
      propertyName: nameOf(propertyId),
      income: toSortedList(b.income),
      expense: toSortedList(b.expense),
      collected: b.collected,
      pending: b.pending,
      totalExpense: b.totalExpense,
      net: b.collected - b.totalExpense,
      rentCollected: b.rentCollected,
    }))
    // 未指定墊底，其餘依名稱排序
    .sort((a, b) => {
      if (a.propertyId === UNASSIGNED_PROPERTY_ID) return 1
      if (b.propertyId === UNASSIGNED_PROPERTY_ID) return -1
      return a.propertyName.localeCompare(b.propertyName, 'zh-TW')
    })
}

/** 把逐建物結果併成總計，欄位語意與 PropertySummary 相同 */
export const totalOf = (summaries: PropertySummary[]): Omit<PropertySummary, 'propertyId' | 'propertyName'> => {
  const income = new Map<string, CategoryTotal>()
  const expense = new Map<string, CategoryTotal>()
  let collected = 0, pending = 0, totalExpense = 0, rentCollected = 0

  for (const s of summaries) {
    s.income.forEach(c => {
      const cur = income.get(c.category) ?? { category: c.category, amount: 0, count: 0 }
      income.set(c.category, { category: c.category, amount: cur.amount + c.amount, count: cur.count + c.count })
    })
    s.expense.forEach(c => {
      const cur = expense.get(c.category) ?? { category: c.category, amount: 0, count: 0 }
      expense.set(c.category, { category: c.category, amount: cur.amount + c.amount, count: cur.count + c.count })
    })
    collected += s.collected
    pending += s.pending
    totalExpense += s.totalExpense
    rentCollected += s.rentCollected
  }

  return {
    income: toSortedList(income),
    expense: toSortedList(expense),
    collected, pending, totalExpense,
    net: collected - totalExpense,
    rentCollected,
  }
}
