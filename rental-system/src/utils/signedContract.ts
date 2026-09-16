import { taipeiToday, validLeaseDate } from './roomLease';

export interface SignedContractLike {
  id?: string;
  tenantUid?: string | null;
  tenantId?: string;
  tenant?: string;
  roomNo?: string;
  startDate?: string;
  endDate?: string;
  signedAt?: { seconds?: number } | null;
  supersededBy?: string;
  /** 遠端簽署流程；舊資料沒有此欄位，視為雙方已簽 */
  status?: SignStatus;
}

export type SignStatus = 'awaiting_tenant' | 'awaiting_landlord' | 'signed';

export type SignedContractState = 'awaiting_tenant' | 'awaiting_landlord'
  | 'upcoming' | 'active' | 'superseded' | 'expired' | 'unknown';

export const SIGNED_CONTRACT_LABELS: Record<SignedContractState, string> = {
  awaiting_tenant: '待租客簽名', awaiting_landlord: '待房東確認',
  upcoming: '待生效', active: '生效中', superseded: '已被取代', expired: '已到期', unknown: '未知',
};

// 雙方都簽完才算數；簽署中的合約既不生效，也不取代其他合約
export const isPendingSignature = (c: SignedContractLike): c is SignedContractLike & { status: 'awaiting_tenant' | 'awaiting_landlord' } =>
  c.status === 'awaiting_tenant' || c.status === 'awaiting_landlord';

const norm = (v?: string | null) => (v || '').trim().toUpperCase();

// 同一承租人：帳號 → 證件號碼 → 姓名＋房號，取雙方都有的最可靠欄位比對
export const sameSigner = (a: SignedContractLike, b: SignedContractLike): boolean => {
  if (a.tenantUid && b.tenantUid) return a.tenantUid === b.tenantUid;
  if (norm(a.tenantId) && norm(b.tenantId)) return norm(a.tenantId) === norm(b.tenantId);
  return !!norm(a.tenant) && !!norm(a.roomNo) && norm(a.tenant) === norm(b.tenant) && norm(a.roomNo) === norm(b.roomNo);
};

export const periodsOverlap = (a: SignedContractLike, b: SignedContractLike): boolean =>
  validLeaseDate(a.startDate) && validLeaseDate(a.endDate) && validLeaseDate(b.startDate) && validLeaseDate(b.endDate)
  && a.startDate <= b.endDate && b.startDate <= a.endDate;

const signedMs = (c: SignedContractLike) => (c.signedAt?.seconds ?? 0) * 1000;

// 舊資料沒有 supersededBy：同一承租人租期重疊時，較晚簽署者為準
const isSuperseded = (c: SignedContractLike, all: SignedContractLike[]) => !!c.supersededBy
  || all.some(o => o !== c && !(o.id && o.id === c.id) && !o.supersededBy && !isPendingSignature(o) && sameSigner(o, c) && periodsOverlap(o, c) && signedMs(o) > signedMs(c));

export const signedContractState = (c: SignedContractLike, all: SignedContractLike[], today = taipeiToday()): SignedContractState => {
  if (isPendingSignature(c)) return c.status;
  if (isSuperseded(c, all)) return 'superseded';
  if (!validLeaseDate(c.startDate) || !validLeaseDate(c.endDate)) {
    return validLeaseDate(c.endDate) && today > c.endDate ? 'expired' : 'unknown';
  }
  if (today < c.startDate) return 'upcoming';
  return today > c.endDate ? 'expired' : 'active';
};

// 簽署新合約前：找出會被取代的既有合約（同一承租人、租期重疊、尚未被取代）
export const overlappingSignedContracts = <T extends SignedContractLike>(existing: T[], draft: SignedContractLike): T[] =>
  existing.filter(c => !isPendingSignature(c) && !(draft.id && c.id === draft.id) && sameSigner(c, draft) && periodsOverlap(c, draft) && !isSuperseded(c, existing));
