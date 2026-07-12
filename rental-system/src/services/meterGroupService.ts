import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, getDocs, serverTimestamp,
} from 'firebase/firestore'
import type { MeterGroupDoc } from '../components/meter/types'

export type MeterGroupPayload = Omit<MeterGroupDoc, 'id' | 'landlordId' | 'createdAt'>

export const getMeterGroups = async (landlordId: string): Promise<MeterGroupDoc[]> => {
  const q = query(
    collection(db, 'meter_groups'),
    where('landlordId', '==', landlordId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as MeterGroupDoc))
}

export const addMeterGroup = (landlordId: string, payload: MeterGroupPayload) =>
  addDoc(collection(db, 'meter_groups'), {
    ...payload,
    landlordId,
    createdAt: serverTimestamp(),
  })

export const updateMeterGroup = (id: string, payload: Partial<MeterGroupPayload>) =>
  updateDoc(doc(db, 'meter_groups', id), payload)

export const deleteMeterGroup = (id: string) =>
  deleteDoc(doc(db, 'meter_groups', id))
