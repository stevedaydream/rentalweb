/**
 * 匯入頁面共用的 Excel 讀寫（需要傳入動態載入的 xlsx 模組）。
 */
import type * as XLSXModule from 'xlsx'

type XLSX = typeof XLSXModule

/** 讀工作表的資料列（略過標題列與全空白列），儲存格保留原始值，交給 importCells 正規化 */
export const readSheetRows = (X: XLSX, wb: XLSXModule.WorkBook, sheetName: string): unknown[][] => {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  const rows = X.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: true })
  return rows.slice(1).filter(r => r.some(c => String(c ?? '').trim()))
}

export const readWorkbook = async (X: XLSX, file: File) =>
  X.read(await file.arrayBuffer(), { type: 'array' })

/** 範本：第一張為填寫說明，其後每張只有標題列（日期可直接用 Excel 日期格式，讀檔時會換算） */
export const downloadTemplate = (
  X: XLSX, fileName: string, instructions: string[][],
  sheets: { name: string; headers: readonly string[]; widths?: number[] }[],
) => {
  const wb = X.utils.book_new()
  const guide = X.utils.aoa_to_sheet(instructions)
  guide['!cols'] = [{ wch: 18 }, { wch: 80 }]
  X.utils.book_append_sheet(wb, guide, '填寫說明')
  for (const sheet of sheets) {
    const ws = X.utils.aoa_to_sheet([[...sheet.headers]])
    ws['!cols'] = sheet.headers.map((_, i) => ({ wch: sheet.widths?.[i] ?? 14 }))
    X.utils.book_append_sheet(wb, ws, sheet.name)
  }
  X.writeFile(wb, fileName)
}
