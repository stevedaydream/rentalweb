// 水費規則（前端與 Cloud Functions 共用）。決策見 project_decisions.md ADR-009。
//
// 建物設定 properties.waterSettings：
//   landlord 房東負擔｜fixed 固定月費｜split 台水帳單均攤｜tenant_direct 租客自行繳納｜unset 尚未設定
// 房間覆寫 rooms.waterMode：independent 獨立水號（實報實銷）｜tenant_direct；空字串＝依建物
import { validDate } from './rules.mjs'

export const WATER_MODES = Object.freeze(['unset', 'landlord', 'fixed', 'split', 'tenant_direct'])

const DAY = 86400000
const wholeMoney = value => {
  const n = Math.round(Number(value))
  return Number.isSafeInteger(n) && n > 0 ? n : 0
}

/** 居住人數；缺值或不合理一律視為 1 */
export const occupantsOf = tenant => {
  const n = Number(tenant?.occupants)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

/**
 * 建物水費設定補齊預設。未設定的建物依房東合約範本的水費負擔決定：
 * 範本寫房東負擔（或沒有範本）→ 房東負擔，行為與改版前相同；寫租客負擔 → 尚未設定，由房東自行選擇計費方式
 */
export const normalizeWaterSettings = (raw, templateFeeWater) => {
  const mode = raw && WATER_MODES.includes(raw.mode)
    ? raw.mode
    : templateFeeWater === 'tenant' ? 'unset' : 'landlord'
  return {
    mode,
    basis: raw?.basis === 'person' ? 'person' : 'room',
    fixedAmount: wholeMoney(raw?.fixedAmount),
  }
}

/** 房間實際適用的方式：房間覆寫優先於建物設定 */
export const effectiveWaterMode = (settings, room) => {
  if (room?.waterMode === 'independent' || room?.waterMode === 'tenant_direct') return room.waterMode
  return settings.mode
}

/** 固定月費一期的金額（不足月不拆） */
export const fixedWaterCharge = (settings, tenant, months) => {
  if (settings.mode !== 'fixed' || !settings.fixedAmount) return 0
  const m = Number.isInteger(months) && months > 0 ? months : 1
  return settings.fixedAmount * m * (settings.basis === 'person' ? occupantsOf(tenant) : 1)
}

export const fixedWaterDescription = (settings, tenant, cover) => {
  const unit = settings.basis === 'person' ? `每人每月 $${settings.fixedAmount} × ${occupantsOf(tenant)} 人` : `每月 $${settings.fixedAmount}`
  const period = cover.from === cover.to ? `${cover.from} 水費` : `${cover.from}～${cover.to} 水費`
  return `${period}（${unit}）`
}

/** 兩段日期（含首尾）重疊的天數 */
export const overlapDays = (aStart, aEnd, bStart, bEnd) => {
  const start = aStart > bStart ? aStart : bStart
  const end = aEnd < bEnd ? aEnd : bEnd
  if (start > end) return 0
  return Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1
}

const validPeriod = (start, end) => validDate(start) && validDate(end) && start <= end

/**
 * 參與者在計費期間內的居住天數。缺起租日視為期間開始前已入住、缺退租日視為仍在住；
 * 日期格式錯誤者回傳 null，由呼叫端提示人工處理。
 */
const stayDays = (p, periodStart, periodEnd) => {
  const from = p.leaseStart || periodStart
  const to = p.leaseEnd || periodEnd
  if (!validDate(from) || !validDate(to) || from > to) return null
  return overlapDays(from, to, periodStart, periodEnd)
}

/**
 * 整棟台水帳單均攤：權重＝居住天數（依人數時再乘人數），只計實際有住的人，空房不列入分母。
 * 各份四捨五入到元，與總額的差（可正可負）由房東吸收。
 */
export const splitWaterBill = ({ total, periodStart, periodEnd, basis, participants }) => {
  const amount = wholeMoney(total)
  if (!amount || !validPeriod(periodStart, periodEnd)) {
    return { shares: [], invalid: [], totalWeight: 0, remainder: amount }
  }
  const invalid = []
  const weighted = []
  for (const p of participants) {
    const days = stayDays(p, periodStart, periodEnd)
    if (days === null) { invalid.push(p.key); continue }
    if (days === 0) continue
    const people = basis === 'person' ? occupantsOf(p) : 1
    weighted.push({ key: p.key, days, people, weight: days * people })
  }
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0)
  const shares = weighted.map(w => ({ ...w, amount: totalWeight ? Math.round(amount * w.weight / totalWeight) : 0 }))
  const remainder = amount - shares.reduce((s, x) => s + x.amount, 0)
  return { shares, invalid, totalWeight, remainder }
}

/**
 * 獨立水號：該房租客付全額；期間內換租客或有空房時，依居住天數佔整個計費期間的比例，
 * 空房的部分由房東負擔。
 */
export const independentWaterShares = ({ total, periodStart, periodEnd, participants }) => {
  const amount = wholeMoney(total)
  if (!amount || !validPeriod(periodStart, periodEnd)) {
    return { shares: [], invalid: [], periodDays: 0, remainder: amount }
  }
  const periodDays = overlapDays(periodStart, periodEnd, periodStart, periodEnd)
  const invalid = []
  const shares = []
  for (const p of participants) {
    const days = stayDays(p, periodStart, periodEnd)
    if (days === null) { invalid.push(p.key); continue }
    if (days === 0) continue
    shares.push({ key: p.key, days, people: occupantsOf(p), weight: days, amount: Math.round(amount * days / periodDays) })
  }
  // 重疊入住（資料錯誤）時不讓合計超過帳單
  const sum = shares.reduce((s, x) => s + x.amount, 0)
  if (sum > amount) {
    const days = shares.reduce((s, x) => s + x.days, 0)
    shares.forEach(x => { x.amount = Math.round(amount * x.days / days) })
  }
  const remainder = amount - shares.reduce((s, x) => s + x.amount, 0)
  return { shares, invalid, periodDays, remainder }
}

/** 合約第五條水費文字；尚未設定時回傳空字串，由呼叫端沿用合約範本 */
export const waterContractText = (settings, room) => {
  const mode = effectiveWaterMode(settings, room)
  switch (mode) {
    case 'landlord': return '由出租人負擔'
    case 'fixed':
      return settings.fixedAmount
        ? `由承租人負擔（${settings.basis === 'person' ? '每人' : '每房'}每月 ${settings.fixedAmount} 元，隨租金繳納）`
        : ''
    case 'split': return `由承租人負擔（依台水帳單，按居住天數${settings.basis === 'person' ? '與人數' : ''}均攤）`
    case 'independent':
      return `由承租人負擔（獨立水號${room?.waterNo ? ` ${room.waterNo}` : ''}，依台水帳單實報實銷）`
    case 'tenant_direct': return '由承租人自行向台灣自來水公司繳納'
    default: return ''
  }
}

export const WATER_MODE_LABELS = Object.freeze({
  unset: '尚未設定',
  landlord: '房東負擔',
  fixed: '固定月費',
  split: '台水帳單均攤',
  tenant_direct: '租客自行繳納',
  independent: '獨立水號',
})
