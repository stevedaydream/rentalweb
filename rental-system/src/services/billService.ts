import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs,
  onSnapshot, query, orderBy, serverTimestamp, where, limit,
  type Unsubscribe,
} from 'firebase/firestore'

// Firestore 'bills' collection uses a broader shape than the shared Bill type.
// These extended types reflect the actual document structure.
export interface BillDoc {
  id: string
  landlordId: string
  tenantId?: string | null
  relatedTenantDocId?: string
  relatedUsageId?: string
  date: string
  type: 'income' | 'expense'
  category: string
  target: string
  description: string
  amount: number
  status: 'completed' | 'pending' | 'overdue'
  dueDate?: string
  history?: BillHistory[]
  createdAt?: any
  updatedAt?: any
}

export interface BillHistory {
  modifiedAt: string
  data: any
}

export type BillPayload = Omit<BillDoc, 'id' | 'createdAt' | 'updatedAt'>

export const subscribeBills = (
  landlordId: string,
  callback: (bills: BillDoc[]) => void,
  onError?: (err: Error) => void,
  maxLimit = 100
): Unsubscribe => {
  const q = query(
    collection(db, 'bills'),
    where('landlordId', '==', landlordId),
    orderBy('date', 'desc'),
    limit(maxLimit)
  )
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as BillDoc))),
    onError
  )
}

export const addBill = (payload: BillPayload) =>
  addDoc(collection(db, 'bills'), {
    ...payload,
    history: payload.history ?? [],
    createdAt: serverTimestamp(),
  })

export const updateBill = (id: string, payload: Partial<BillPayload>) =>
  updateDoc(doc(db, 'bills', id), {
    ...payload,
    updatedAt: serverTimestamp(),
  })

export const deleteBill = (id: string) =>
  deleteDoc(doc(db, 'bills', id))

// Taipower bills (separate collection)
export interface TaipowerBillDoc {
  id: string
  landlordId: string
  month: string
  amount: number
  usage: number
  /** 所屬台電總表。舊資料沒有此欄位，僅在只有一顆總表時才視為該表的帳單 */
  groupId?: string
  createdAt?: any
}

export type TaipowerBillPayload = Omit<TaipowerBillDoc, 'id' | 'createdAt'>

export const subscribeTaipowerBills = (
  landlordId: string,
  callback: (bills: TaipowerBillDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'taipower_bills'),
    where('landlordId', '==', landlordId),
    orderBy('month', 'desc')
  )
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaipowerBillDoc))),
    onError
  )
}

export const addTaipowerBill = (payload: TaipowerBillPayload) =>
  addDoc(collection(db, 'taipower_bills'), {
    ...payload,
    createdAt: serverTimestamp(),
  })

/** 取得某月份的台電帳單（不限總表）。兩個等式條件可由單欄位索引合併，無須複合索引 */
export const getTaipowerBillsByMonth = async (
  landlordId: string,
  month: string,
): Promise<TaipowerBillDoc[]> => {
  const q = query(
    collection(db, 'taipower_bills'),
    where('landlordId', '==', landlordId),
    where('month', '==', month),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaipowerBillDoc))
}

/**
 * 寫入某總表某月份的台電帳單；已存在則更新，避免同月同表出現多筆。
 * 帳單分攤制的平均單價由此份資料推算，故必須持久化而非只存在畫面上。
 */
export const upsertTaipowerBill = async (
  landlordId: string,
  month: string,
  groupId: string,
  data: { usage: number; amount: number },
) => {
  const existing = (await getTaipowerBillsByMonth(landlordId, month))
    .find(b => (b.groupId || '') === groupId)
  if (existing) return updateDoc(doc(db, 'taipower_bills', existing.id), { ...data, groupId })
  return addDoc(collection(db, 'taipower_bills'), {
    landlordId, month, groupId, ...data, createdAt: serverTimestamp(),
  })
}
