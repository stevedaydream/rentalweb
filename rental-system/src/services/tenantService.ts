import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, where, getDocs, limit,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Tenant } from '../types/index'

export type TenantPayload = Omit<Tenant, 'id' | 'landlordId' | 'createdAt'>

export const subscribeTenants = (
  landlordId: string,
  callback: (tenants: Tenant[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'tenants'),
    where('landlordId', '==', landlordId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant))),
    onError
  )
}

export const getTenants = async (landlordId: string): Promise<Tenant[]> => {
  const q = query(
    collection(db, 'tenants'),
    where('landlordId', '==', landlordId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant))
}

export const addTenant = (landlordId: string, payload: TenantPayload) =>
  addDoc(collection(db, 'tenants'), {
    ...payload,
    landlordId,
    createdAt: serverTimestamp(),
  })

export const updateTenant = (id: string, payload: Partial<TenantPayload>) =>
  updateDoc(doc(db, 'tenants', id), payload)

export const deleteTenant = (id: string) =>
  deleteDoc(doc(db, 'tenants', id))

/**
 * 租客本人查自己的租客檔案。
 *
 * 房東手動建立的租客以 `uid` 關聯；自行註冊、只有 `users` 文件而房東尚未
 * 建檔的租客查不到，回 null 由呼叫端顯示提示，不視為錯誤。
 */
export const getTenantByUid = async (uid: string): Promise<Tenant | null> => {
  const snap = await getDocs(query(collection(db, 'tenants'), where('uid', '==', uid), limit(1)))
  const d = snap.docs[0]
  return d ? ({ id: d.id, ...d.data() } as Tenant) : null
}

/**
 * 租客本人更新聯絡方式。
 *
 * 欄位刻意寫死不接整包 payload——firestore.rules 只放行這三個 key，
 * 多帶任何一個欄位整筆更新都會被拒，寫成通用函式只會在呼叫端埋雷。
 */
export const updateTenantContact = (
  id: string,
  contact: { email: string; emergencyContact: string }
) =>
  updateDoc(doc(db, 'tenants', id), {
    email: contact.email,
    emergencyContact: contact.emergencyContact,
    updatedAt: serverTimestamp(),
  })
