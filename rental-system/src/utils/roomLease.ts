import type { ManagedRoom, RoomLeaseContract, RoomLeaseSummary } from '../types';

export const taipeiToday = (now = new Date()): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);

export const validLeaseDate = (value?: string): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;

export const leaseDaysRemaining = (end: string | undefined, today = taipeiToday()): number =>
  validLeaseDate(end) && validLeaseDate(today) ? (Date.parse(end) - Date.parse(today)) / 86400000 : Infinity;

export function resolveRoomLease(room: ManagedRoom, rooms: ManagedRoom[], contracts: RoomLeaseContract[],
  today = taipeiToday(), ready = true): RoomLeaseSummary {
  const unknown: RoomLeaseSummary = { state: 'unknown', label: ready ? '資料待確認' : '租約載入中',
    urgency: 'normal', days: Infinity, needsAttention: ready };
  if (room.status !== 'occupied') return { ...unknown, state: 'none', label: '無出租中租約', needsAttention: false };
  if (!ready) return unknown;
  const candidates = contracts.filter(c => c.status === 'active' && c.landlordId === room.landlordId
    && (c.roomId ? c.roomId === room.id : c.roomNumber === room.name));
  if (candidates.length !== 1) return unknown;
  const c = candidates[0]!;
  if (!c.roomId && rooms.filter(r => r.landlordId === room.landlordId && r.name === room.name).length !== 1) return unknown;
  if (!validLeaseDate(c.startDate) || !validLeaseDate(c.endDate) || c.startDate > c.endDate) return unknown;
  const days = leaseDaysRemaining(c.endDate, today);
  const base = { contract: c, startDate: c.startDate, endDate: c.endDate, days,
    needsAttention: room.leaseEnd !== c.endDate };
  const pr = c.pendingRenewal;
  if (pr && (!validLeaseDate(pr.startDate) || !validLeaseDate(pr.endDate) || pr.startDate > pr.endDate || pr.endDate <= c.endDate)) {
    return { ...unknown, ...base, needsAttention: true };
  }
  if (pr) {
    const overdue = today > c.endDate && today >= pr.startDate;
    return { ...base, pending: pr, state: overdue ? 'pending-activation' : 'renewed',
      label: overdue ? '續約待接續' : '已安排續約・待生效', urgency: 'normal',
      needsAttention: base.needsAttention || overdue };
  }
  if (today < c.startDate) return { ...base, state: 'upcoming', label: '租約待生效', urgency: 'normal' };
  return { ...base, state: days < 0 ? 'expired' : days <= 60 ? 'expiring' : 'active',
    label: days < 0 ? '已過期' : days === 0 ? '今日到期' : days <= 60 ? `${days} 天後到期` : '租約有效',
    urgency: days <= 30 ? 'critical' : days <= 60 ? 'warning' : 'normal' };
}

export function editableRoomFields(form: Partial<ManagedRoom>): Record<string, unknown> {
  const keys = ['name', 'address', 'price', 'size', 'layout', 'type', 'images', 'coverImage',
    'purchaseCost', 'subGroupId', 'isTest'] as const;
  return Object.fromEntries(keys.filter(k => form[k] !== undefined).map(k => [k, form[k]]));
}
