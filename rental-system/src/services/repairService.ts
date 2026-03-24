import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, where, getDocs,
  type Unsubscribe,
} from 'firebase/firestore'
import type { RepairRequest } from '../types/index'

export type RepairPayload = Omit<RepairRequest, 'id' | 'landlordId' | 'createdAt' | 'updatedAt'>

export const subscribeRepairs = (
  landlordId: string,
  callback: (repairs: RepairRequest[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'repair_requests'),
    where('landlordId', '==', landlordId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as RepairRequest))),
    onError
  )
}

export const getRepairs = async (landlordId: string): Promise<RepairRequest[]> => {
  const q = query(
    collection(db, 'repair_requests'),
    where('landlordId', '==', landlordId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as RepairRequest))
}

export const addRepair = (landlordId: string, payload: RepairPayload) =>
  addDoc(collection(db, 'repair_requests'), {
    ...payload,
    landlordId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

export const updateRepair = (id: string, payload: Partial<RepairPayload>) =>
  updateDoc(doc(db, 'repair_requests', id), {
    ...payload,
    updatedAt: serverTimestamp(),
  })

export const deleteRepair = (id: string) =>
  deleteDoc(doc(db, 'repair_requests', id))
