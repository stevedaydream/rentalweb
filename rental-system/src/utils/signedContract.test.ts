import { describe, it, expect } from 'vitest';
import { signedContractState, overlappingSignedContracts, sameSigner } from './signedContract';
import type { SignedContractLike } from './signedContract';

const today = '2026-09-13';
const base: SignedContractLike = { id: 'a', tenantUid: 'u1', tenant: '葉偉恩', roomNo: '401',
  startDate: '2026-03-31', endDate: '2027-03-30', signedAt: { seconds: 100 } };
const state = (c: SignedContractLike, all = [c]) => signedContractState(c, all, today);

describe('電子合約狀態', () => {
  it('依台灣日期區分待生效、生效中、已到期，到期當天仍生效', () => {
    expect(state({ ...base, startDate: '2026-09-14' })).toBe('upcoming');
    expect(state(base)).toBe('active');
    expect(state({ ...base, endDate: '2026-09-13' })).toBe('active');
    expect(state({ ...base, endDate: '2026-09-12' })).toBe('expired');
    expect(state({ ...base, startDate: '' })).toBe('unknown');
  });
  it('同一承租人租期重疊時，舊資料以較晚簽署者為生效', () => {
    const newer = { ...base, id: 'b', signedAt: { seconds: 200 } };
    expect(state(base, [base, newer])).toBe('superseded');
    expect(state(newer, [base, newer])).toBe('active');
  });
  it('標記 supersededBy 者一律為已被取代，且不再取代他人', () => {
    const replaced = { ...base, id: 'b', signedAt: { seconds: 200 }, supersededBy: 'a' };
    expect(state(replaced, [base, replaced])).toBe('superseded');
    expect(state(base, [base, replaced])).toBe('active');
  });
  it('續約接續（租期不重疊）與不同承租人互不影響', () => {
    const renewal = { ...base, id: 'b', startDate: '2027-03-31', endDate: '2028-03-30', signedAt: { seconds: 200 } };
    expect(state(base, [base, renewal])).toBe('active');
    expect(state(renewal, [base, renewal])).toBe('upcoming');
    const other = { ...base, id: 'c', tenantUid: 'u2', signedAt: { seconds: 300 } };
    expect(state(base, [base, other])).toBe('active');
  });
  it('承租人比對：帳號優先，其次證件號碼，最後姓名加房號', () => {
    expect(sameSigner({ tenantUid: 'u1', tenant: 'A', roomNo: '1' }, { tenantUid: 'u2', tenant: 'A', roomNo: '1' })).toBe(false);
    expect(sameSigner({ tenantId: 'a123' }, { tenantUid: 'u1', tenantId: 'A123 ' })).toBe(true);
    expect(sameSigner({ tenant: '葉偉恩', roomNo: '401' }, { tenant: '葉偉恩', roomNo: '401', tenantUid: 'u1' })).toBe(true);
    expect(sameSigner({ tenant: '葉偉恩' }, { tenant: '葉偉恩' })).toBe(false);
  });
});

describe('簽署前重疊檢查', () => {
  it('只回傳同一承租人、租期重疊且尚未被取代的合約', () => {
    const expiredOld = { ...base, id: 'old', startDate: '2025-03-31', endDate: '2026-03-30' };
    const replaced = { ...base, id: 'r', supersededBy: 'a' };
    const draft = { tenantUid: 'u1', startDate: '2026-09-01', endDate: '2027-08-31' };
    expect(overlappingSignedContracts([base, expiredOld, replaced], draft).map(c => c.id)).toEqual(['a']);
    expect(overlappingSignedContracts([base], { ...draft, startDate: '2027-03-31', endDate: '2028-03-30' })).toEqual([]);
  });
});
