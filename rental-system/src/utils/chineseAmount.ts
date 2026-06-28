// 阿拉伯數字金額 → 國字大寫（財務單據防偽標準寫法），例如 10000 → 新臺幣壹萬元整
const DIGITS = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖']
const SMALL_UNITS = ['', '拾', '佰', '仟']
const BIG_UNITS = ['', '萬', '億', '兆']

// 將四位數字組轉成國字（含十百千），如 1050 → 壹仟零伍拾
const fourDigitsToChinese = (group: number): string => {
  let s = ''
  let zeroPending = false
  const str = String(group).padStart(4, '0')
  for (let i = 0; i < 4; i++) {
    const d = Number(str[i])
    const unit = SMALL_UNITS[3 - i]
    if (d === 0) {
      zeroPending = s.length > 0
    } else {
      if (zeroPending) { s += DIGITS[0]; zeroPending = false }
      s += (DIGITS[d] ?? '') + (unit ?? '')
    }
  }
  return s
}

/**
 * 金額轉「新臺幣…元整」。負數或非有限數回傳空字串。
 * 僅處理整數元（單據不含小數）。
 */
export const amountToChineseCapital = (amount: number): string => {
  const n = Math.floor(Number(amount))
  if (!Number.isFinite(n) || n < 0) return ''
  if (n === 0) return '新臺幣零元整'

  // 依萬/億/兆分組（每 4 位一組，低位在前）
  const groups: number[] = []
  let rest = n
  while (rest > 0) {
    groups.push(rest % 10000)
    rest = Math.floor(rest / 10000)
  }

  let result = ''
  let gapZero = false // 高位組末尾為零或中間整組為零 → 下一非零組前需補一個「零」
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i] as number
    if (g === 0) {
      if (result) gapZero = true
      continue
    }
    // 補「零」：與高位之間有缺位（gapZero），或本組千位為零（g < 1000）
    if (result && (gapZero || g < 1000)) result += DIGITS[0]
    result += fourDigitsToChinese(g) + BIG_UNITS[i]
    gapZero = g % 10 === 0 // 本組個位為零 → 與下一組之間有缺位
  }

  return `新臺幣${result}元整`
}
