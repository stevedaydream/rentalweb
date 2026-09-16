import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
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

export interface SignLinkResult { code: string; url: string; expireAt: number; expireDays: number }

// 遠端簽約：為待租客簽名的合約產生（或重發）一次性簽署連結
export const requestContractSignLink = async (contractId: string): Promise<SignLinkResult> => {
  const fn = httpsCallable<{ contractId: string; origin: string }, SignLinkResult>(functions, 'createContractSignLink');
  const res = await fn({ contractId, origin: window.location.origin });
  return res.data;
};

// 房東核對後簽名：合約正式生效，並與「舊合約標記已被取代」同批寫入
export const confirmLandlordSignature = async (contractId: string, landlordSignature: string, supersedeIds: string[] = []) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'signed_contracts', contractId), {
    landlordSignature,
    status: 'signed',
    landlordSignedAt: serverTimestamp(),
    signedAt: serverTimestamp(),
  });
  for (const id of supersedeIds) {
    batch.update(doc(db, 'signed_contracts', id), { supersededBy: contractId, supersededAt: serverTimestamp() });
  }
  await batch.commit();
};

// 退回重簽：清掉租客簽名，回到待租客簽名（呼叫端再重發連結）
export const returnForResign = async (contractId: string) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'signed_contracts', contractId), {
    signature: '',
    status: 'awaiting_tenant',
    tenantSignedAt: null,
    tenantAcknowledgedAt: null,
    tenantAcknowledgedUid: null,
    returnedAt: serverTimestamp(),
  });
  await batch.commit();
};
