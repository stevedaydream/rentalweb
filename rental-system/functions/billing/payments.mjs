const num = v => Math.max(0, Math.round(Number(v) || 0));
export const isCollected = b => b.status === 'completed' || b.status === 'paid';
export const collectedOf = b => isCollected(b) ? num(b.amount) : Math.min(num(b.amount), num(b.paidAmount));
export const outstandingOf = b => b.type === 'expense' ? 0 : num(b.amount) - collectedOf(b);
export const isPartial = b => !isCollected(b) && collectedOf(b) > 0;
const order = { '租金收入': 0, '水費': 1, '電費': 2, '公共電費': 3 };
export const byAge = (a, b) => (a.date || '').localeCompare(b.date || '') || (a.dueDate || '').localeCompare(b.dueDate || '') || (order[a.category] ?? 9) - (order[b.category] ?? 9);
export function allocatePayment(bills, amount, opts = {}) {
  const open = bills.filter(b => outstandingOf(b) > 0).sort(byAge);
  const ordered = opts.preferCategory ? [...open.filter(b => b.category === opts.preferCategory), ...open.filter(b => b.category !== opts.preferCategory)] : open;
  let left = num(amount);
  const allocations = [];
  for (const b of ordered) {
    if (left <= 0) break;
    const apply = Math.min(outstandingOf(b), left);
    allocations.push({ billId: b.id, apply, settles: apply === outstandingOf(b) });
    left -= apply;
  }
  return { allocations, leftover: left };
}
export function paymentUpdate(b, apply, paidDate, today) {
  const paid = Math.min(num(b.amount), collectedOf(b) + num(apply));
  return paid >= num(b.amount) ? { paidAmount: num(b.amount), status: 'completed', paidAt: paidDate }
    : { paidAmount: paid, status: b.dueDate && b.dueDate < today ? 'overdue' : 'pending' };
}
export function paymentEntry(amount, date, source, note) {
  return { amount: num(amount), date, source, at: new Date().toISOString(), ...(note?.trim() ? { note: note.trim() } : {}) };
}
export function applyCredit(amounts, credit) {
  let left = num(credit);
  const applied = amounts.map(a => { const x = Math.min(num(a), left); left -= x; return x; });
  return { applied, remaining: left };
}
