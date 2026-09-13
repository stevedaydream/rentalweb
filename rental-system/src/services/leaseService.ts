import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
import type { RoomLeaseContract } from '../types';

export const subscribeLeaseContracts = (landlordId: string, callback: (contracts: RoomLeaseContract[]) => void,
  onError: (error: Error) => void) => onSnapshot(query(collection(db, 'contracts'), where('landlordId', '==', landlordId)),
  snap => callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as RoomLeaseContract))), onError);

export const getLeaseContract = async (landlordId: string, id: string): Promise<RoomLeaseContract | null> => {
  const snap = await getDoc(doc(db, 'contracts', id));
  return snap.exists() && snap.data().landlordId === landlordId ? { ...snap.data(), id: snap.id } as RoomLeaseContract : null;
};

export const promotePendingRenewal = async (contractId: string) => {
  const call = httpsCallable<{ contractId: string }, { promoted: boolean; startDate?: string; endDate?: string; rent?: number }>(functions, 'promotePendingRenewal');
  return (await call({ contractId })).data;
};
