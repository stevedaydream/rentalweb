import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, where, getDocs,
  runTransaction, type Unsubscribe,
} from 'firebase/firestore'
import type { Room, ManagedRoom } from '../types/index'
import { editableRoomFields } from '../utils/roomLease'

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

// propertyId 只在表單確實改了建物時才傳入，避免開著舊表單蓋掉在建物分頁剛做的指派
export const saveManagedRoom = async (landlordId: string, form: Partial<ManagedRoom>,
  originalStatus?: Room['status'], propertyChange?: { propertyId: string }) => {
  const fields = { ...editableRoomFields(form), ...(propertyChange ?? {}) }
  if (!form.id) return addDoc(collection(db, 'rooms'), {
    ...fields, landlordId, status: form.status || 'vacant',
    landlordName: form.landlordName || '', landlordPhone: form.landlordPhone || '',
    isPublic: form.status === 'vacant' && !!form.isPublic,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  const ref = doc(db, 'rooms', form.id)
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists() || snap.data().landlordId !== landlordId) throw new Error('房源不存在或無權編輯')
    const current = snap.data()
    if (current.status !== originalStatus) throw new Error('出租狀態已更新，請關閉後重新開啟編輯')
    if (current.status === 'occupied' && form.name !== current.name) throw new Error('出租中房源請先完成退租再變更房號')
    tx.update(ref, { ...fields, status: form.status || current.status,
      isPublic: (form.status || current.status) === 'vacant' && !!form.isPublic,
      updatedAt: serverTimestamp() })
  })
}
