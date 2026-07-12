import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, getDocs, serverTimestamp,
} from 'firebase/firestore'
import type { PublicMeterDoc } from '../components/meter/types'

export type PublicMeterPayload = Omit<PublicMeterDoc, 'id' | 'landlordId' | 'createdAt'>

export const getPublicMeters = async (landlordId: string): Promise<PublicMeterDoc[]> => {
  const q = query(
    collection(db, 'public_meters'),
    where('landlordId', '==', landlordId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PublicMeterDoc))
}

export const addPublicMeter = (landlordId: string, payload: PublicMeterPayload) =>
  addDoc(collection(db, 'public_meters'), {
    ...payload,
    landlordId,
    createdAt: serverTimestamp(),
  })

export const updatePublicMeter = (id: string, payload: Partial<PublicMeterPayload>) =>
  updateDoc(doc(db, 'public_meters', id), payload)

export const deletePublicMeter = (id: string) =>
  deleteDoc(doc(db, 'public_meters', id))
