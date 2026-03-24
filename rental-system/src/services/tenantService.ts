import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, where, getDocs,
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
