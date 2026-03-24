import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
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
