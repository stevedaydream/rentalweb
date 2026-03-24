import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, where, getDocs,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Room } from '../types/index'

export type RoomPayload = Omit<Room, 'id' | 'landlordId' | 'createdAt'>

export const subscribeRooms = (
  landlordId: string,
  callback: (rooms: Room[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'rooms'),
    where('landlordId', '==', landlordId),
    orderBy('name', 'asc')
  )
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Room))),
    onError
  )
}

export const getRooms = async (landlordId: string): Promise<Room[]> => {
  const q = query(
    collection(db, 'rooms'),
    where('landlordId', '==', landlordId),
    orderBy('name', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Room))
}

export const addRoom = (landlordId: string, payload: RoomPayload) =>
  addDoc(collection(db, 'rooms'), {
    ...payload,
    landlordId,
    createdAt: serverTimestamp(),
  })

export const updateRoom = (id: string, payload: Partial<RoomPayload>) =>
  updateDoc(doc(db, 'rooms', id), payload)

export const deleteRoom = (id: string) =>
  deleteDoc(doc(db, 'rooms', id))
