export const SIGNING_DETAIL_FIELDS = [
  { key: 'tenantPhone', label: '聯絡電話', maxLength: 40, required: true, type: 'tel' },
  { key: 'tenantAddress', label: '戶籍地址', maxLength: 300, required: true, type: 'text' },
  { key: 'tenantMailAddress', label: '通訊地址', maxLength: 300, type: 'text', placeholder: '同戶籍地址可留空' },
  { key: 'tenantEmail', label: 'Email', maxLength: 254, type: 'email' },
  { key: 'emergencyContact', label: '緊急聯絡人', maxLength: 200, type: 'text', placeholder: '姓名、關係與聯絡電話' },
  { key: 'guarantor', label: '保證人姓名', maxLength: 100, type: 'text' },
  { key: 'guarantorId', label: '保證人證件號碼', maxLength: 40, type: 'text' },
  { key: 'guarantorAddress', label: '保證人戶籍地址', maxLength: 300, type: 'text' },
  { key: 'guarantorMailAddress', label: '保證人通訊地址', maxLength: 300, type: 'text', placeholder: '同保證人戶籍地址可留空' },
  { key: 'guarantorPhone', label: '保證人聯絡電話', maxLength: 40, type: 'tel' },
]

export function pickSigningDetails(contract = {}) {
  return Object.fromEntries(SIGNING_DETAIL_FIELDS.map(({ key }) => [key, typeof contract[key] === 'string' ? contract[key] : '']))
}

export function normalizeSigningDetails(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('補填資料格式錯誤')
  const fields = new Set(SIGNING_DETAIL_FIELDS.map(({ key }) => key))
  if (Object.keys(raw).some(key => !fields.has(key))) throw new Error('包含不可修改的合約欄位')
  const result = {}
  for (const { key, label, maxLength, required } of SIGNING_DETAIL_FIELDS) {
    if (raw[key] !== undefined && typeof raw[key] !== 'string') throw new Error(`${label}格式錯誤`)
    const value = (raw[key] || '').trim()
    if (required && !value) throw new Error(`請填寫${label}`)
    if (value.length > maxLength) throw new Error(`${label}不可超過 ${maxLength} 字`)
    result[key] = value
  }
  for (const key of ['tenantPhone', 'guarantorPhone']) {
    if (result[key] && (!/^[+\d\s()\-#.]+$/.test(result[key]) || result[key].replace(/\D/g, '').length < 7)) {
      throw new Error(`請填寫有效的${key === 'tenantPhone' ? '聯絡電話' : '保證人聯絡電話'}`)
    }
  }
  if (result.tenantEmail && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result.tenantEmail)) throw new Error('請填寫有效的 Email')
  if (!result.guarantor && SIGNING_DETAIL_FIELDS.some(({ key }) => key.startsWith('guarantor') && result[key])) {
    throw new Error('填寫保證人資料時，請一併填寫保證人姓名')
  }
  result.guarantorId = result.guarantorId.toUpperCase()
  return result
}
