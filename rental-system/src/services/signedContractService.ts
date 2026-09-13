import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { overlappingSignedContracts } from '../utils/signedContract';
import type { SignedContractLike } from '../utils/signedContract';

export type SignedContractDoc = SignedContractLike & { id: string; [key: string]: unknown };

export const findOverlappingSignedContracts = async (landlordUid: string, draft: SignedContractLike) => {
  const snap = await getDocs(query(collection(db, 'signed_contracts'), where('landlordUid', '==', landlordUid)));
  return overlappingSignedContracts(snap.docs.map(d => ({ ...d.data(), id: d.id }) as SignedContractDoc), draft);
};

// 新合約與「舊合約標記已被取代」同批寫入，避免只寫一半
export const createSignedContract = async (data: Record<string, unknown>, supersedeIds: string[] = []) => {
  const ref = doc(collection(db, 'signed_contracts'));
  const batch = writeBatch(db);
  batch.set(ref, data);
  for (const id of supersedeIds) {
    batch.update(doc(db, 'signed_contracts', id), { supersededBy: ref.id, supersededAt: serverTimestamp() });
  }
  await batch.commit();
  return ref;
};
