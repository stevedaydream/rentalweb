import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { cellDate, cellMonth, cellNumber, cellPhone, cellText, isRealDate, isMonth, taipeiDate } from './importCells'

const parse = XLSX.SSF.parse_date_code

describe('匯入儲存格正規化', () => {
  it('Excel 日期序號不經時區換算', () => {
    expect(cellDate(46266, parse)).toBe('2026-09-01')
    expect(cellMonth(46266, parse)).toBe('2026-09')
  })

  it('實際讀檔：日期儲存格與千分位金額都能還原', () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([['日期', '金額'], [new Date(2026, 8, 1), 12000]])
    ws.B2!.z = '#,##0'
    XLSX.utils.book_append_sheet(wb, ws, 'S')
    const read = XLSX.read(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }), { type: 'array' })
    const [, row] = XLSX.utils.sheet_to_json<unknown[]>(read.Sheets.S!, { header: 1, defval: '', raw: true })
    expect(cellDate(row![0], parse)).toBe('2026-09-01')
    expect(cellNumber(row![1])).toBe(12000)
  })

  it('文字日期：分隔符號、補零與民國年', () => {
    expect(cellDate('2026/9/1')).toBe('2026-09-01')
    expect(cellDate('2026.09.01')).toBe('2026-09-01')
    expect(cellDate('115/9/1')).toBe('2026-09-01')
    expect(cellDate(new Date(2026, 8, 1))).toBe('2026-09-01')
    expect(cellDate('九月一日')).toBe('九月一日')
    expect(cellMonth('2026/9')).toBe('2026-09')
    expect(cellMonth('115-10')).toBe('2026-10')
    expect(cellMonth('2026-09-15')).toBe('2026-09')
  })

  it('數字：千分位、全形、貨幣符號；空白為 null、無法辨識為 NaN', () => {
    expect(cellNumber('12,000')).toBe(12000)
    expect(cellNumber('１２０００')).toBe(12000)
    expect(cellNumber('NT$ 8,000')).toBe(8000)
    expect(cellNumber('500元')).toBe(500)
    expect(cellNumber('-5')).toBe(-5)
    expect(cellNumber('')).toBeNull()
    expect(cellNumber('  ')).toBeNull()
    expect(Number.isNaN(cellNumber('abc'))).toBe(true)
  })

  it('真實日期與月份檢查', () => {
    expect(isRealDate('2026-02-28')).toBe(true)
    expect(isRealDate('2026-02-30')).toBe(false)
    expect(isRealDate('2026-13-01')).toBe(false)
    expect(isMonth('2026-12')).toBe(true)
    expect(isMonth('2026-13')).toBe(false)
    expect(cellText(null)).toBe('')
  })

  it('電話被存成數字時補回開頭的 0', () => {
    expect(cellPhone(912345678)).toBe('0912345678')
    expect(cellPhone(223456789)).toBe('0223456789')
    expect(cellPhone('0912-345-678')).toBe('0912-345-678')
  })

  it('台灣日期跨午夜', () => {
    expect(taipeiDate(new Date('2026-09-16T16:30:00Z'))).toBe('2026-09-17')
  })
})
