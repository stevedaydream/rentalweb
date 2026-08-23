/**
 * QR 碼產生（純瀏覽器端）。
 *
 * 一律本地產生，不呼叫任何線上 QR 服務：QR 的內容就是啟用連結，
 * 而連結等同鑰匙。丟給第三方 API 等於把每一把鑰匙都寄出去一份。
 */
import qrcode from 'qrcode-generator'

/** 容錯等級；連結不長，用 M 即可，過高只會讓格子變密難掃 */
const ERROR_CORRECTION = 'M' as const

/** 每格像素；太小手機不容易對焦 */
const CELL_SIZE = 6

/** 外框留白格數；低於 4 格部分掃描器會讀不到 */
const MARGIN = 4

/** 產生可直接放進 <img src> 的 data URL */
export const toQrDataUrl = (text: string): string => {
  if (!text) return ''
  // typeNumber 0 = 依內容自動選擇版本
  const qr = qrcode(0, ERROR_CORRECTION)
  qr.addData(text)
  qr.make()
  return qr.createDataURL(CELL_SIZE, MARGIN)
}
