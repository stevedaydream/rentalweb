/**
 * Excel 儲存格值的正規化（資料匯入共用）。
 *
 * 讀檔一律用 `sheet_to_json(..., { raw: true })` 取原始值：
 * - 格式化文字（raw:false）會把日期變成 `9/1/26`、金額變成 `12,000`，驗證全錯
 * - `cellDates` 產生的 Date 以本地時區建立，`toISOString()` 在台灣會少一天
 * 日期序號改由 SheetJS 的 `SSF.parse_date_code` 換算年月日，不經過時區。
 */

export type DateCodeParser = (serial: number) => { y: number; m: number; d: number } | null | undefined

const pad = (n: number) => String(n).padStart(2, '0')

/** 真實存在的日期（排除 2026-02-30、2026-13-01） */
export const isRealDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d!))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d
}

export const isMonth = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)

export const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/**
 * 數字欄位：空白回傳 null；可接受千分位、全形數字、NT$／元；無法辨識回傳 NaN（由呼叫端報錯）
 */
export const cellNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  const text = cellText(value)
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，\s]/g, '')
    .replace(/^(NT\$|\$)/i, '')
    .replace(/元$/, '')
  if (!text) return null
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : NaN
}

/** 西元或民國年（< 1911 視為民國）轉西元 */
const westernYear = (y: number) => (y < 1911 ? y + 1911 : y)

/**
 * 日期欄位 → YYYY-MM-DD。接受 Excel 日期序號、Date、`2026-9-1`、`2026/9/1`、`2026.9.1`、民國 `115/9/1`。
 * 無法辨識時原樣回傳，交給驗證報錯。
 */
export const cellDate = (value: unknown, parseDateCode?: DateCodeParser): string => {
  if (typeof value === 'number' && parseDateCode && value > 0) {
    const c = parseDateCode(value)
    return c ? `${c.y}-${pad(c.m)}-${pad(c.d)}` : String(value)
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }
  const text = cellText(value)
  const m = text.match(/^(\d{2,4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (!m) return text
  return `${westernYear(Number(m[1]))}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`
}

/** 月份欄位 → YYYY-MM。接受日期序號（取年月）、`2026-9`、`2026/09`、民國 `115/9`、完整日期 */
export const cellMonth = (value: unknown, parseDateCode?: DateCodeParser): string => {
  if (typeof value === 'number' || value instanceof Date) return cellDate(value, parseDateCode).slice(0, 7)
  const text = cellText(value)
  const m = text.match(/^(\d{2,4})[-/.](\d{1,2})$/)
  if (m) return `${westernYear(Number(m[1]))}-${pad(Number(m[2]))}`
  const full = cellDate(text)
  return isRealDate(full) ? full.slice(0, 7) : text
}

/** 台灣日期 YYYY-MM-DD */
export const taipeiDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now)

/** 電話：Excel 把 0912345678、0223456789 存成數字時會掉開頭的 0；台灣號碼去掉 0 後為 8～9 碼，補回 */
export const cellPhone = (value: unknown): string => {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    const digits = String(value)
    return digits.length === 8 || digits.length === 9 ? `0${digits}` : digits
  }
  return cellText(value)
}
