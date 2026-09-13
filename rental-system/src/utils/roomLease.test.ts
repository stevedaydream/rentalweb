import { describe, it, expect } from 'vitest';
import { resolveRoomLease, leaseDaysRemaining, taipeiToday, editableRoomFields } from './roomLease';
import type { ManagedRoom, RoomLeaseContract } from '../types';

const room: ManagedRoom = { id: 'room', landlordId: 'owner', name: '501', status: 'occupied',
  leaseEnd: '2026-08-21', address: '', price: 9000, size: 8, layout: '', type: '' };
const contract: RoomLeaseContract = { id: 'current', landlordId: 'owner', roomNumber: '501', status: 'active',
  startDate: '2026-08-22', endDate: '2027-08-21', tenantName: '租客' };
const summary = (c: RoomLeaseContract[] = [contract], r = room, all = [r]) => resolveRoomLease(r, all, c, '2026-09-13');

describe('房源以目前有效合約判定租期', () => {
  it.each([
    ['501', '2026-08-21', '2026-08-22', '2027-08-21'],
    ['503', '2026-07-28', '2026-07-01', '2026-12-31'],
  ])('%s 舊房源到期日不會蓋過已續約合約', (name, oldEnd, startDate, endDate) => {
    const r = { ...room, name, leaseEnd: oldEnd };
    const s = summary([{ ...contract, roomNumber: name, startDate, endDate }], r);
    expect(s.state).toBe('active');
    expect(s.endDate).toBe(endDate);
    expect(s.needsAttention).toBe(true);
  });
  it('忽略已失效舊合約，不依查詢順序取第一份', () => {
    expect(summary([{ ...contract, id: 'old', status: 'inactive', endDate: '2026-08-21' }, contract]).state).toBe('active');
  });
  it('有多份有效合約、缺少合約、錯誤日期或讀取失敗時要求確認', () => {
    for (const list of [[], [contract, { ...contract, id: 'duplicate' }], [{ ...contract, endDate: '2026-02-30' }]]) {
      expect(summary(list).state).toBe('unknown');
    }
    expect(resolveRoomLease(room, [room], [], '2026-09-13', false).label).toBe('租約載入中');
  });
  it('跨房東及不同房源 ID 不會誤配，重複房號須有明確 ID', () => {
    expect(summary([{ ...contract, landlordId: 'other' }]).state).toBe('unknown');
    expect(summary([{ ...contract, roomId: 'other' }]).state).toBe('unknown');
    const all = [room, { ...room, id: 'another-building' }];
    expect(summary([contract], room, all).state).toBe('unknown');
    expect(summary([{ ...contract, roomId: room.id }], room, all).state).toBe('active');
  });
  it('當期尚未結束時保留當期，另顯示下一期且不顯示緊急到期', () => {
    const s = summary([{ ...contract, endDate: '2026-09-30', pendingRenewal: { startDate: '2026-10-01', endDate: '2027-09-30', rent: 9000 } }]);
    expect(s.state).toBe('renewed');
    expect(s.endDate).toBe('2026-09-30');
    expect(s.urgency).toBe('normal');
  });
  it('已到接續日卻未接續時標示待接續，不宣稱已生效', () => {
    expect(summary([{ ...contract, startDate: '2025-08-22', endDate: '2026-08-21', pendingRenewal: {
      startDate: '2026-08-22', endDate: '2027-08-21', rent: 9000,
    } }]).state).toBe('pending-activation');
  });
  it('租客確認續租意願不等於已安排下一期', () => {
    expect(summary([{ ...contract, endDate: '2026-09-30', renewalStatus: 'confirmed' }]).state).toBe('expiring');
  });
  it('待租房不帶入舊合約', () => expect(summary([contract], { ...room, status: 'vacant' }).state).toBe('none'));
});

describe('台灣日期與房源編輯保護', () => {
  it('台灣跨午夜即切換日期，到期當天仍有效', () => {
    expect(taipeiToday(new Date('2026-09-12T16:00:00Z'))).toBe('2026-09-13');
    expect(leaseDaysRemaining('2026-09-13', '2026-09-13')).toBe(0);
    expect(leaseDaysRemaining('2026-09-12', '2026-09-13')).toBe(-1);
    expect(leaseDaysRemaining('invalid')).toBe(Infinity);
  });
  it('只儲存可編輯欄位，舊租期、租客、建物歸屬與房東不得被表單覆蓋', () => {
    const patch = editableRoomFields({ ...room, tenantName: '舊租客', propertyId: 'old', landlordName: 'old', images: ['new.jpg'] });
    expect(patch.images).toEqual(['new.jpg']);
    for (const key of ['leaseEnd', 'tenantName', 'tenantId', 'landlordId', 'propertyId', 'landlordName', 'status', 'id']) expect(patch).not.toHaveProperty(key);
  });
});
