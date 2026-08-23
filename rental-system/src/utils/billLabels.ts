/**
 * 帳單分類的對外用語。
 *
 * `bills.category` 是房東的記帳分類，站在租客的角度那是**支出**，
 * 把「租金收入」原樣印在租客的帳單上很怪，也像是系統把內部欄位漏出去。
 * 凡是要給租客看或列印給租客的地方，一律經過這裡轉換。
 */

/** 只列需要改寫的；其餘（電費、水費、押金…）本來就是雙方通用的說法 */
const TENANT_LABEL: Record<string, string> = {
  租金收入: '房租',
  其他收入: '其他費用',
  台電帳單: '電費',
}

export const tenantCategoryLabel = (category?: string): string => {
  const key = (category || '').trim()
  if (!key) return ''
  return TENANT_LABEL[key] ?? key
}
