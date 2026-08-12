/**
 * 電費計算核心（純函式）。
 *
 * 由 MeterReading.vue 抽出，行為與抽出前完全一致：原本相依的 Vue ref
 * （selectedMonth / settings / meterGroups）一律改為明確參數傳入。
 */
import type { MeterEntry, MeterGroup, Settings } from '../../components/meter/types'

export interface CostResult {
  cost: number
  log: string
}

export interface TieredResult extends CostResult {
  /** 未四捨五入的金額。雙月累積相減需要全精度，取整會累積誤差 */
  raw: number
}

/**
 * 抄表區間天數，含頭尾（7/1~7/31 = 31 天）。
 * 日期無效時回傳 NaN；呼叫端須自行判斷，不在此處臆測天數。
 */
export const getDaysDiff = (start: string, end: string) => {
  const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

/**
 * 一個「完整計費月」的天數：自 start 起算滿一個月（含頭尾）
 * 例：8/1 起算 → 31 天（8/1~8/31）；2/1 起算 → 28 天
 *
 * 月底起算須把「日」夾到目標月份的最後一天：new Date(2026, 1, 31) 會被
 * JS 正規化成 3/3 而非 2/28，導致 1/31 起算算出 31 天（正解 28 天），
 * 使 2 月那期的天數比例變成 0.903、級距被錯誤縮小。
 */
export const getFullMonthDays = (start: string) => {
  const [y, m, d] = start.split('-').map(Number)
  if (!y || !m || !d) return 30
  const lastDayOfNextMonth = new Date(y, m + 1, 0).getDate()
  const clampedDay = Math.min(d, lastDayOfNextMonth)
  const diff = new Date(y, m, clampedDay).getTime() - new Date(y, m - 1, d).getTime()
  return Math.round(diff / 86400000)
}

/** 區間內的夏月天數（台電夏月 = 6/1~9/30） */
export const countSummerDays = (start: string, end: string) => {
  let count = 0
  const current = new Date(start)
  const endDate = new Date(end)
  while (current <= endDate) {
    const m = current.getMonth()
    if (m >= 5 && m <= 8) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

/** 帳單分攤制：總表帳單金額 ÷ 總表用電度數 = 平均單價 */
export const calculateGroupAvgRate = (group: MeterGroup) => {
  if (!group.masterCurrentReading || !group.masterBillAmount) return 0
  const usage = Math.max(0, group.masterCurrentReading - (group.masterLastReading || 0))
  return usage === 0 ? 0 : group.masterBillAmount / usage
}

/**
 * 指定月份在台電雙月帳期中的序位（1 = 單月/預估，2 = 雙月/結算）。
 * 帳期設定可能因群組而異，故同時依 settings 與月份判定。
 * @param month 'YYYY-MM'
 */
export const getCycleIndex = (s: Settings, month: string): 1 | 2 => {
  const cfg = s.tieredConfig
  if (cfg.cycle !== 'bimonthly') return 1
  const m = Number(month.split('-')[1])
  const isFirst = cfg.cycleAnchor === 'even' ? m % 2 === 0 : m % 2 === 1
  return isFirst ? 1 : 2
}

/** 累進級距計算。usage 為要跑累進的度數（雙月第 2 月時是帳期累積度數） */
export const calculateTieredLogic = (
  usage: number,
  room: MeterEntry,
  group: MeterGroup,
  s: Settings,
): TieredResult => {
  const activeSettings = s
  let totalCost = 0
  let log = ''
  const days = getDaysDiff(room.lastReadingDate, room.currentReadingDate)
  const summerDays = countSummerDays(room.lastReadingDate, room.currentReadingDate)

  let usageSummer = 0
  let usageNonSummer = 0
  let useAverageRate = false
  // 各季節段分到的級距額度比例：跨季期間須依天數拆分，否則兩段都拿到整期額度
  let summerShare = 1
  let nonSummerShare = 1

  // tiered_avg 模式：不分夏/非夏，直接用平均費率
  const isAvgMode = activeSettings.mode === 'tiered_avg'

  if (isAvgMode || activeSettings.tieredConfig.season === 'average') {
    useAverageRate = true
    log += isAvgMode ? `模式: 平均費率（不分夏/非夏）\n` : `季節判定: 採用平均費率 (夏月+非夏月)/2\n`
  } else if (activeSettings.tieredConfig.season === 'summer') {
    usageSummer = usage
  } else if (activeSettings.tieredConfig.season === 'non-summer') {
    usageNonSummer = usage
  } else {
    const summerRatio = summerDays / days
    usageSummer = usage * summerRatio
    usageNonSummer = usage * (1 - summerRatio)
    summerShare = summerRatio
    nonSummerShare = 1 - summerRatio
    log += `季節判定 (共${days}天): 夏月${summerDays}天 / 非夏月${days - summerDays}天\n`
    log += `用量拆分: 夏月 ${usageSummer.toFixed(1)}度 / 非夏月 ${usageNonSummer.toFixed(1)}度\n`
    if (summerDays > 0 && summerDays < days) {
      log += `級距額度亦依天數拆分: 夏月 ${(summerShare * 100).toFixed(1)}% / 非夏月 ${(nonSummerShare * 100).toFixed(1)}%\n`
    }
    log += `\n`
  }

  const dayScaling = activeSettings.tieredConfig.dayScaling ?? 'full-month'
  let scaleFactor = 1
  if (dayScaling === 'legacy') {
    scaleFactor = days / 30
    log += `天數比例: ${days}天 / 30 = ${scaleFactor.toFixed(3)}\n`
  } else if (dayScaling === 'full-month') {
    const fullDays = getFullMonthDays(room.lastReadingDate)
    scaleFactor = days / fullDays
    log += scaleFactor === 1
      ? `天數比例: 完整月 (${days}天)，不縮放\n`
      : `天數比例: ${days}天 / 完整月${fullDays}天 = ${scaleFactor.toFixed(3)}\n`
  }
  if (activeSettings.tieredConfig.strategy === 'split') {
    scaleFactor *= (group.officialMetersCount / group.roomCount)
    log += `級距策略: 資本拆分 (總表${group.officialMetersCount} / 電表數${group.roomCount})\n`
  } else {
    scaleFactor *= group.officialMetersCount
    log += `級距策略: 標準台電 (總表${group.officialMetersCount})\n`
  }
  log += `級距調整係數: ${scaleFactor.toFixed(4)}\n`

  const calcPart = (amount: number, type: 'summer' | 'non-summer' | 'average', share = 1) => {
    const partScale = scaleFactor * share
    let remaining = amount
    let cost = 0
    let prevLimit = 0
    let partLog = type === 'summer' ? '--- [夏月計算] ---\n' : type === 'non-summer' ? '--- [非夏月計算] ---\n' : '--- [平均費率計算] ---\n'
    if (share !== 1) partLog += `本段級距係數: ${partScale.toFixed(4)}\n`
    for (const tier of activeSettings.tiers) {
      if (remaining <= 0) break
      const scaledLimit = (tier.limit === 99999) ? 99999 : tier.limit * partScale
      const gap = scaledLimit - (prevLimit * partScale)
      const inTier = Math.min(remaining, gap)
      if (inTier > 0) {
        const rate = type === 'summer' ? tier.summerRate : type === 'non-summer' ? tier.nonSummerRate : (tier.summerRate + tier.nonSummerRate) / 2
        const tierCost = inTier * rate
        cost += tierCost
        partLog += `級距${tier.limit}: ${inTier.toFixed(1)}度 x $${rate.toFixed(3)} = $${tierCost.toFixed(1)}\n`
        remaining -= inTier
      }
      prevLimit = tier.limit
    }
    return { cost, log: partLog }
  }

  if (useAverageRate) {
    const res = calcPart(usage, 'average')
    totalCost += res.cost
    log += res.log
  } else {
    if (usageSummer > 0) { const res = calcPart(usageSummer, 'summer', summerShare); totalCost += res.cost; log += res.log }
    if (usageNonSummer > 0) { const res = calcPart(usageNonSummer, 'non-summer', nonSummerShare); totalCost += res.cost; log += res.log }
  }
  return { cost: Math.round(totalCost), raw: totalCost, log }
}

/** 保底單價：算出的平均單價低於 minRate 時，改用 minRate 計費 */
export const applyMinRate = (res: TieredResult, usage: number, minRate: number): TieredResult => {
  if (!(minRate > 0) || usage <= 0) return res
  const avg = res.raw / usage
  if (avg >= minRate) return res
  const cost = Math.round(usage * minRate)
  return {
    cost,
    raw: usage * minRate,
    log: `${res.log}\n平均單價 $${avg.toFixed(3)} < 保底 $${minRate} → 改用保底: ${usage}度 x $${minRate} = $${cost}`,
  }
}

/** 單一電表本期用電度數 */
export const calculateUsage = (room: MeterEntry) =>
  Math.max(0, (room.currentReading || 0) - room.lastReading)

/**
 * 單一電表本期電費。
 * @param s      此電表實際採用的設定（呼叫端已解析房間 > 群組 > 全域）
 * @param group  此電表所屬總表；bill_share 與級距分母需要
 * @param month  抄表月份 'YYYY-MM'，用於判定雙月帳期序位
 */
export const calculateElectricity = (
  room: MeterEntry,
  s: Settings,
  group: MeterGroup | undefined,
  month: string,
): CostResult => {
  const usage = calculateUsage(room)
  if (usage === 0) return { cost: 0, log: '無用量' }
  if (s.mode === 'fixed') {
    const cost = Math.round(usage * s.fixedRate)
    return { cost, log: `固定費率: ${usage}度 x $${s.fixedRate} = $${cost}` }
  }
  if (!group) return { cost: 0, log: '錯誤: 無群組設定' }
  if (s.mode === 'bill_share') {
    const rate = calculateGroupAvgRate(group)
    const cost = Math.round(usage * rate)
    return { cost, log: `帳單分攤: ${usage}度 x 平均單價$${rate.toFixed(4)} = $${cost}` }
  }

  // 'tiered' 和 'tiered_avg' 皆走此路徑。
  // 累進計費依賴計費期間，日期無效會讓 days 變 NaN 並一路污染到金額；
  // 更危險的是接著 applyMinRate 會因 NaN 比較為 false 而靜默套用保底單價，
  // 等於無聲改用 5 元/度出帳。此處直接擋下並明示原因。
  const days = getDaysDiff(room.lastReadingDate, room.currentReadingDate)
  if (!Number.isFinite(days) || days <= 0) {
    return {
      cost: 0,
      log: `錯誤: 計費期間日期無效（起「${room.lastReadingDate || '未填'}」迄「${room.currentReadingDate || '未填'}」），無法計算累進電費`,
    }
  }

  const minRate = s.tieredConfig.minRate ?? 0
  const isCycleSecond = s.tieredConfig.cycle === 'bimonthly'
    && getCycleIndex(s, month) === 2
    && room.cycleFirstUsage != null
    && room.cycleFirstCost != null

  if (!isCycleSecond) {
    return applyMinRate(calculateTieredLogic(usage, room, group, s), usage, minRate)
  }

  // 雙月帳期第 2 月：以「帳期累積度數」跑累進，再扣掉第 1 月已收金額
  const firstUsage = room.cycleFirstUsage!
  const firstCost = room.cycleFirstCost!
  const cumUsage = firstUsage + usage
  const res = calculateTieredLogic(cumUsage, room, group, s)
  const header = `【雙月帳期第 2 月】\n帳期累積: 第1月 ${firstUsage}度 + 本期 ${usage}度 = ${cumUsage}度\n`
  const cumAvg = res.raw / cumUsage

  if (minRate > 0 && cumAvg < minRate) {
    const cost = Math.round(usage * minRate)
    return {
      cost,
      log: `${header}${res.log}\n累積平均單價 $${cumAvg.toFixed(3)} < 保底 $${minRate}`
        + `\n→ 本期 = ${usage}度 x $${minRate} = $${cost}`,
    }
  }

  const diff = res.raw - firstCost
  const cost = Math.round(Math.max(0, diff))
  return {
    cost,
    log: `${header}${res.log}\n累積金額 $${res.raw.toFixed(2)} − 第1月已收 $${firstCost.toFixed(2)} = $${cost}`
      + (diff < 0 ? `\n※ 第1月已收超過累積金額（第1月觸發保底），本期歸零` : ''),
  }
}
