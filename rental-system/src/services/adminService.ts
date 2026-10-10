import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../firebase/config'
export type AdminRow = { id: string; version: string; [key: string]: any }
export const resourceLabels: Record<string, string> = {
  users: '房東',
  properties: '建物',
  rooms: '房間',
  tenants: '租客',
  bills: '帳單',
  contracts: '租約',
  signed_contracts: '簽署合約',
  admin_audit: '操作紀錄',
}
export const editableFields: Record<string, Record<string, string>> = {
  users: { name: '姓名', phone: '電話', email: '聯絡信箱' },
  properties: { name: '建物名稱', address: '地址' },
  rooms: {
    name: '房號',
    address: '地址',
    rent: '月租金',
    size: '坪數',
    layout: '格局',
    propertyId: '所屬建物',
    description: '說明',
  },
  tenants: {
    name: '姓名',
    phone: '電話',
    email: '聯絡信箱',
    idNumber: '證件號碼',
    address: '戶籍地址',
    emergencyContact: '緊急聯絡人',
    occupants: '居住人數',
    notes: '備註',
  },
  bills: { amount: '金額', date: '帳單日期', dueDate: '截止日', description: '說明' },
  contracts: { startDate: '起租日', endDate: '到期日', rent: '月租金' },
  signed_contracts: {},
  admin_audit: {},
}
export async function adminCall<T = any>(data: Record<string, unknown>): Promise<T> {
  let storageKey = ''
  if (data.operationId) {
    const { operationId: _operationId, ...payload } = data
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify([auth.currentUser?.uid, payload]))
    )
    storageKey =
      'admin-operation:' +
      Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('')
    try {
      const pending = sessionStorage.getItem(storageKey)
      data = { ...data, operationId: pending || data.operationId }
      sessionStorage.setItem(storageKey, String(data.operationId))
    } catch {
      storageKey = ''
    }
  }
  const result = (
    await httpsCallable<Record<string, unknown>, T>(functions, 'adminOperations', {
      timeout: 320000,
    })(data)
  ).data
  if (storageKey) {
    try {
      sessionStorage.removeItem(storageKey)
    } catch {
      /* 操作已完成，無須因本機儲存限制回報失敗。 */
    }
  }
  return result
}
export async function lifecycleCall<T = any>(data: Record<string, unknown>): Promise<T> {
  return (
    await httpsCallable<Record<string, unknown>, T>(functions, 'adminLifecycle', {
      timeout: 550000,
    })(data)
  ).data
}
export async function supportCall<T = any>(data: Record<string, unknown>): Promise<T> {
  return (await httpsCallable<Record<string, unknown>, T>(functions, 'platformSupport')(data)).data
}
export const fieldType = (key: string) =>
  ['rent', 'amount', 'size', 'occupants'].includes(key)
    ? 'number'
    : ['date', 'dueDate', 'startDate', 'endDate'].includes(key)
      ? 'date'
      : key === 'email'
        ? 'email'
        : 'text'
export const rowLabel = (row: AdminRow) =>
  row.name || row.tenant || row.tenantName || row.description || row.title || row.id
export function displayDate(value: any) {
  if (!value) return '—'
  const seconds = value.seconds ?? value._seconds
  return seconds
    ? new Date(seconds * 1000).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
    : String(value)
}
