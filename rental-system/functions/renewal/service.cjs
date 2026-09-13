const { HttpsError } = require('firebase-functions/v2/https');

const todayInTaipei = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);
const validId = v => typeof v === 'string' && v.length > 0 && v.length <= 128 && !v.includes('/');
const validDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const invalid = message => { throw new HttpsError('failed-precondition', message); };

async function promoteRenewal(db, FieldValue, contractId, { auth, today = todayInTaipei() } = {}) {
  if (!validId(contractId)) throw new HttpsError('invalid-argument', '合約識別碼格式錯誤');
  return db.runTransaction(async tx => {
    const ref = db.collection('contracts').doc(contractId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', '找不到合約');
    const c = snap.data();
    if (auth) {
      const profile = await tx.get(db.collection('users').doc(auth.uid));
      const role = profile.data()?.role;
      if (role !== 'admin' && !(role === 'landlord' && c.landlordId === auth.uid)) {
        throw new HttpsError('permission-denied', '無權接續此合約');
      }
    }
    const pr = c.pendingRenewal;
    if (c.status !== 'active' || !pr) return { promoted: false };
    if (!validDate(c.endDate) || !validDate(pr.startDate) || !validDate(pr.endDate)
      || pr.endDate < pr.startDate || pr.endDate <= c.endDate
      || typeof pr.rent !== 'number' || !Number.isFinite(pr.rent) || pr.rent < 0) {
      invalid('續約租期或租金資料不完整');
    }
    if (today <= c.endDate || today < pr.startDate) return { promoted: false };
    if (!validId(c.landlordId) || !validId(c.tenantDocId)) invalid('合約缺少房東或租客關聯');
    const tenantRef = db.collection('tenants').doc(c.tenantDocId);
    const tenantSnap = await tx.get(tenantRef);
    const tenant = tenantSnap.data();
    if (!tenant || tenant.landlordId !== c.landlordId || tenant.contractId !== contractId || tenant.status === 'inactive') {
      invalid('租客與目前合約關聯不一致');
    }
    const [roomSnap, contractSnap] = await Promise.all([
      tx.get(db.collection('rooms').where('landlordId', '==', c.landlordId)),
      tx.get(db.collection('contracts').where('landlordId', '==', c.landlordId)),
    ]);
    if (c.roomId && tenant.roomId && c.roomId !== tenant.roomId) invalid('合約與租客房源關聯不一致');
    const roomId = c.roomId || tenant.roomId;
    const matches = roomSnap.docs.filter(r => roomId ? r.id === roomId : r.data().name === c.roomNumber);
    if (matches.length !== 1) invalid('無法唯一確認房源，請先確認房源關聯');
    const room = matches[0];
    const data = room.data();
    const sameNameCount = roomSnap.docs.filter(r => r.data().name === data.name).length;
    const active = contractSnap.docs.filter(d => {
      const other = d.data();
      return other.status === 'active' && (other.roomId ? other.roomId === room.id : other.roomNumber === data.name);
    });
    if (data.status !== 'occupied' || active.length !== 1 || active[0].id !== contractId
      || (!c.roomId && sameNameCount !== 1)) invalid('房源出租狀態或有效合約不一致');
    const updatedAt = FieldValue.serverTimestamp();
    tx.update(ref, { startDate: pr.startDate, endDate: pr.endDate, rent: pr.rent,
      roomId: room.id, previousEndDate: c.endDate, pendingRenewal: FieldValue.delete(), updatedAt });
    tx.update(tenantRef, { leaseStart: pr.startDate, leaseEnd: pr.endDate, rent: pr.rent, roomId: room.id, updatedAt });
    tx.update(room.ref, { leaseEnd: pr.endDate, tenantName: tenant.name || c.tenantName || '', updatedAt });
    return { promoted: true, startDate: pr.startDate, endDate: pr.endDate, rent: pr.rent };
  });
}

async function handlePromoteRenewal(db, FieldValue, request) {
  if (!request.auth) throw new HttpsError('unauthenticated', '請先登入');
  return promoteRenewal(db, FieldValue, request.data?.contractId, { auth: request.auth });
}

module.exports = { promoteRenewal, handlePromoteRenewal, todayInTaipei };
