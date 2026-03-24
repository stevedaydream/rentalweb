import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, where,
  type Unsubscribe, type Timestamp,
} from 'firebase/firestore'

export interface AnnouncementDoc {
  id: string
  landlordId: string
  title: string
  category: string
  content: string
  isPinned: boolean
  views: number
  createdAt: Timestamp
}

export type AnnouncementPayload = Pick<AnnouncementDoc, 'title' | 'category' | 'content' | 'isPinned'>

export const subscribeAnnouncements = (
  landlordId: string,
  callback: (items: AnnouncementDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'announcements'),
    where('landlordId', '==', landlordId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AnnouncementDoc))),
    onError
  )
}

export const addAnnouncement = (landlordId: string, payload: AnnouncementPayload) =>
  addDoc(collection(db, 'announcements'), {
    ...payload,
    landlordId,
    views: 0,
    createdAt: serverTimestamp(),
  })

export const updateAnnouncement = (id: string, payload: Partial<AnnouncementPayload>) =>
  updateDoc(doc(db, 'announcements', id), payload)

export const deleteAnnouncement = (id: string) =>
  deleteDoc(doc(db, 'announcements', id))

export const toggleAnnouncementPin = (id: string, isPinned: boolean) =>
  updateDoc(doc(db, 'announcements', id), { isPinned })
