/**
 * 稅費與保險的待辦提醒（純函式）。
 *
 * 稅單寄來前房東不知道金額，所以提醒天然分兩段：
 *   1. 開徵期到了但系統還沒登錄 → 去拿稅單
 *   2. 已登錄但還沒繳，期限逼近或已逾期 → 去繳
 * 火險則是保單迄日前要續保。
 */
import { PropertyCostType, type Property, type PropertyCost, type RentSubsidy } from '../../types/index'

export type ReminderSeverity = 'info' | 'warning' | 'danger'

export type ReminderKind =
  | 'cost_missing'
  | 'cost_due'
  | 'cost_overdue'
  | 'fire_expiring'
  | 'fire_expired'
  | 'subsidy_expiring'
  | 'welfare_unclaimed'
  | 'welfare_stale'

export interface Reminder {
  /** 穩定識別，供列表 key 與推播去重 */
  id: string
  kind: ReminderKind
  severity: ReminderSeverity
  title: string
  detail: string
  /** 距今天數，負數為已過期 */
  days: number
}

/** 開徵月日：房屋稅 5 月、地價稅 11 月 */
const LEVY_START: Partial<Record<PropertyCostType, { month: number; day: number }>> = {
  [PropertyCostType.HouseTax]: { month: 5, day: 1 },
  [PropertyCostType.LandTax]: { month: 11, day: 1 },
}

/** 開徵前幾天開始提醒「去拿稅單」 */
export const LEVY_LEAD_DAYS = 7
/** 繳納期限前幾天內開始提醒 */
export const DUE_WINDOW_DAYS = 14
/** 火險到期前幾天開始提醒續保 */
export const FIRE_LEAD_DAYS = 30
/** 租金補貼到期前幾天開始提醒（補貼一斷，公益出租人資格跟著沒了） */
export const SUBSIDY_LEAD_DAYS = 30

const toDate = (s: string) => new Date(`${s}T00:00:00`)

export const daysBetween = (from: string, to: string): number => {
  const a = toDate(from), b = toDate(to)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return NaN
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

const shiftDays = (dateStr: string, delta: number): string => {
  const d = toDate(dateStr)
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 距今天數轉成人看得懂的字 */
export const dayLabel = (days: number): string => {
  if (days < 0) return `已逾期 ${-days} 天`
  if (days === 0) return '今天到期'
  return `剩 ${days} 天`
}

/** 提醒只看得懂的租客欄位 */
export interface ReminderTenant {
  id: string
  name: string
  room: string
  status?: string
  rentSubsidy?: RentSubsidy
}

export interface ReminderInput {
  /** 今天 YYYY-MM-DD */
  today: string
  costs: PropertyCost[]
  properties: Property[]
  tenants?: ReminderTenant[]
  /** 房號 → propertyId，用來把租客歸到門牌 */
  roomProperty?: Map<string, string>
}

/** 補貼在該日仍有效：有勾選，且今天落在起訖之間（未填起訖視為不設限） */
export const subsidyActiveOn = (today: string, s?: RentSubsidy): boolean => {
  if (!s?.hasSubsidy) return false
  if (s.from && today < s.from) return false
  if (s.to && today > s.to) return false
  return true
}

/**
 * 該年度該稅目是否還沒登錄。
 *
 * 以繳納期限的年份認年度——房屋稅的課稅期間跨年，用 periodEnd 或 dueDate
 * 都會落在開徵年，兩者一致。
 */
const hasCostForYear = (costs: PropertyCost[], type: PropertyCostType, year: number) =>
  costs.some(c => c.type === type && (c.dueDate || c.periodEnd || '').startsWith(String(year)))

export const buildReminders = (input: ReminderInput): Reminder[] => {
  const { today, costs, properties } = input
  const out: Reminder[] = []
  const thisYear = Number(today.slice(0, 4))

  // --- 開徵了但還沒登錄 ---
  for (const type of [PropertyCostType.HouseTax, PropertyCostType.LandTax]) {
    const levy = LEVY_START[type]
    if (!levy) continue

    // 開徵當年的期間；跨年時（今天在開徵日之前）不回頭提醒去年
    const levyDate = `${thisYear}-${pad(levy.month)}-${pad(levy.day)}`
    const windowStart = shiftDays(levyDate, -LEVY_LEAD_DAYS)
    // 開徵月的月底為登錄期限
    const windowEnd = `${thisYear}-${pad(levy.month)}-${pad(new Date(thisYear, levy.month, 0).getDate())}`

    if (today < windowStart || today > windowEnd) continue
    if (hasCostForYear(costs, type, thisYear)) continue

    const days = daysBetween(today, windowEnd)
    out.push({
      id: `missing:${type}:${thisYear}`,
      kind: 'cost_missing',
      severity: days <= 7 ? 'danger' : 'warning',
      title: `${thisYear} 年 ${type}尚未登錄`,
      detail: `${levy.month} 月開徵，${windowEnd} 前繳納。收到稅單後請到「稅費與保險」登錄。`,
      days,
    })
  }

  // --- 已登錄但未繳 ---
  for (const c of costs) {
    if (c.paidAt || !c.dueDate) continue
    const days = daysBetween(today, c.dueDate)
    if (Number.isNaN(days)) continue

    if (days < 0) {
      out.push({
        id: `overdue:${c.id}`,
        kind: 'cost_overdue',
        severity: 'danger',
        title: `${c.type} 已逾期`,
        detail: `NT$ ${c.amount.toLocaleString()}，期限 ${c.dueDate}（${dayLabel(days)}）`,
        days,
      })
    } else if (days <= DUE_WINDOW_DAYS) {
      out.push({
        id: `due:${c.id}`,
        kind: 'cost_due',
        severity: days <= 3 ? 'danger' : 'warning',
        title: `${c.type} 即將到期`,
        detail: `NT$ ${c.amount.toLocaleString()}，期限 ${c.dueDate}（${dayLabel(days)}）`,
        days,
      })
    }
  }

  // --- 火險續保 ---
  for (const p of properties) {
    const end = p.fireInsurance?.endDate
    if (!end) continue
    const days = daysBetween(today, end)
    if (Number.isNaN(days)) continue

    if (days < 0) {
      out.push({
        id: `fire-expired:${p.id}`,
        kind: 'fire_expired',
        severity: 'danger',
        title: `${p.name} 火險已到期`,
        detail: `保單迄日 ${end}（${dayLabel(days)}），請確認是否已續保。`,
        days,
      })
    } else if (days <= FIRE_LEAD_DAYS) {
      out.push({
        id: `fire:${p.id}`,
        kind: 'fire_expiring',
        severity: days <= 7 ? 'danger' : 'warning',
        title: `${p.name} 火險即將到期`,
        detail: `保單迄日 ${end}（${dayLabel(days)}）`,
        days,
      })
    }
  }

  // --- 租金補貼與公益出租人資格落差 ---
  const tenants = (input.tenants ?? []).filter(t => t.status !== 'inactive')
  const roomProperty = input.roomProperty ?? new Map<string, string>()

  // 補貼快到期：資格是跟著補貼走的，補貼一斷公益出租人身分就沒了
  for (const t of tenants) {
    const to = t.rentSubsidy?.to
    if (!t.rentSubsidy?.hasSubsidy || !to) continue
    const days = daysBetween(today, to)
    if (Number.isNaN(days) || days < 0 || days > SUBSIDY_LEAD_DAYS) continue

    out.push({
      id: `subsidy:${t.id}`,
      kind: 'subsidy_expiring',
      severity: days <= 7 ? 'danger' : 'warning',
      title: `${t.name} 的租金補貼即將到期`,
      detail: `補貼迄日 ${to}（${dayLabel(days)}）。補貼中斷後，該門牌可能失去公益出租人資格。`,
      days,
    })
  }

  // 逐棟比對「實際有補貼中的租客」與「已登錄的核定年度」
  const withActiveSubsidy = new Set<string>()
  for (const t of tenants) {
    if (!subsidyActiveOn(today, t.rentSubsidy)) continue
    const propertyId = roomProperty.get(t.room)
    if (propertyId) withActiveSubsidy.add(propertyId)
  }

  if (tenants.length > 0) {
    for (const p of properties) {
      const declared = p.publicWelfare?.some(
        w => w.year === thisYear && (w.houseTax || w.landTax || w.incomeTax),
      ) ?? false
      const actual = withActiveSubsidy.has(p.id)

      if (actual && !declared) {
        out.push({
          id: `welfare-unclaimed:${p.id}:${thisYear}`,
          kind: 'welfare_unclaimed',
          severity: 'info',
          title: `${p.name} 可能符合公益出租人`,
          detail: `該門牌有補貼中的租客，但尚未登錄 ${thisYear} 年度核定。可享綜所稅每屋每月 15,000 元免稅額、房屋稅自住稅率與地價稅自用住宅稅率。`,
          days: 0,
        })
      } else if (declared && !actual) {
        out.push({
          id: `welfare-stale:${p.id}:${thisYear}`,
          kind: 'welfare_stale',
          severity: 'warning',
          title: `${p.name} 的公益出租人資格待確認`,
          detail: `已登錄 ${thisYear} 年度核定，但目前沒有補貼中的租客。請確認資格是否仍有效。`,
          days: 0,
        })
      }
    }
  }

  // 越急的排越前面；同樣急迫時逾期優先
  const rank: Record<ReminderSeverity, number> = { danger: 0, warning: 1, info: 2 }
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || a.days - b.days)
}
