import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, where, getDocs, writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import type { MeterReading } from '../types/index'

export interface MeterReadingDoc extends MeterReading {
  yearMonth: string
  lastReading: number
  currentReading: number
  usage: number
  cost: number
  periodStart: string
  periodEnd: string
  paymentStatus: string
  calcLog?: string
  mode?: string
}

export type MeterReadingPayload = Omit<MeterReadingDoc, 'id' | 'createdAt'>

export const subscribeMeterReadings = (
  landlordId: string,
  callback: (readings: MeterReadingDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'meter_readings'),
    where('landlordId', '==', landlordId),
    orderBy('yearMonth', 'desc')
  )
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as MeterReadingDoc))),
    onError
  )
}

export const getMeterReadingsByMonth = async (
  yearMonthStart: string,
  yearMonthEnd: string
): Promise<MeterReadingDoc[]> => {
  const q = query(
    collection(db, 'meter_readings'),
    where('periodEnd', '>=', yearMonthStart),
    where('periodEnd', '<=', yearMonthEnd)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as MeterReadingDoc))
}

export const addMeterReading = (payload: MeterReadingPayload) =>
  addDoc(collection(db, 'meter_readings'), {
    ...payload,
    createdAt: serverTimestamp(),
  })

export const updateMeterReading = (id: string, payload: Partial<MeterReadingPayload>) =>
  updateDoc(doc(db, 'meter_readings', id), payload)

export const deleteMeterReading = (id: string) =>
  deleteDoc(doc(db, 'meter_readings', id))

/** Batch-import historical readings (handles 400-op Firestore batch limit) */
export const batchImportMeterReadings = async (readings: MeterReadingPayload[]): Promise<number> => {
  const BATCH_LIMIT = 400
  let batch = writeBatch(db)
  let opCount = 0
  let total = 0

  for (const reading of readings) {
    const ref = doc(collection(db, 'meter_readings'))
    batch.set(ref, { ...reading, createdAt: serverTimestamp() })
    opCount++
    total++
    if (opCount >= BATCH_LIMIT) {
      await batch.commit()
      batch = writeBatch(db)
      opCount = 0
    }
  }
  if (opCount > 0) await batch.commit()
  return total
}
