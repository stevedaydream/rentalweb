const { FieldValue } = require('firebase-admin/firestore')
const {
  fail,
  id,
  date,
  hash,
  today,
  assertReason,
  validatePatch,
  assertLease,
} = require('./policy.cjs')
const { audit, notify, serialize } = require('./service.cjs')
const fs = require('node:fs')
const path = require('node:path')
async function handleDomain(db, request) {
  const { operation, operationId, landlordId, reason, kind, patch = {} } = request.data
  if (!id(operationId) || !id(landlordId)) fail('操作格式錯誤', 'invalid-argument')
  assertReason(reason)
  const payloadHash = hash(request.data)
  return db.runTransaction(async (tx) => {
    const [previous, landlord, state] = await Promise.all([
      tx.get(db.collection('admin_audit').doc(operationId)),
      tx.get(db.collection('users').doc(landlordId)),
      tx.get(db.collection('platform_accounts').doc(landlordId)),
    ])
    if (previous.exists) {
      if (previous.data().payloadHash !== payloadHash) fail('操作識別碼已使用')
      return { id: previous.data().key, replayed: true }
    }
    if (
      landlord.data()?.role !== 'landlord' ||
      ['deleting', 'deleted'].includes(state.data()?.mode)
    )
      fail('房東不存在或正在刪除')
    let resultId = operationId
    let before = null
    let after
    let targetKind = kind
    let tenantUid
    const related = []
    if (operation === 'create') {
      if (!['properties', 'rooms', 'tenants', 'bills', 'contracts'].includes(kind))
        fail('不支援新增此類資料')
      if (kind === 'properties' || kind === 'rooms' || kind === 'tenants')
        validatePatch(kind, patch)
      if (['properties', 'rooms', 'tenants'].includes(kind) && !patch.name?.trim())
        fail('名稱不可空白')
      after = { ...patch, landlordId }
      if (kind === 'properties') {
        const meterRef = db.collection('meter_groups').doc()
        tx.create(meterRef, {
          landlordId,
          name: patch.name,
          subGroups: [],
          createdAt: FieldValue.serverTimestamp(),
        })
        after.meterGroupId = meterRef.id
        related.push({ path: meterRef.path, after: { name: patch.name, landlordId } })
      }
      if (kind === 'rooms') {
        if (!id(patch.propertyId)) fail('請指定建物')
        const [property, rooms] = await Promise.all([
          tx.get(db.collection('properties').doc(patch.propertyId)),
          tx.get(db.collection('rooms').where('landlordId', '==', landlordId)),
        ])
        if (property.data()?.landlordId !== landlordId) fail('建物不屬於此房東')
        const norm = (x) => String(x).normalize('NFKC').replace(/\s/g, '').toUpperCase()
        if (rooms.docs.some((d) => norm(d.data().name) === norm(patch.name))) fail('房號已存在')
        Object.assign(after, {
          status: 'vacant',
          isPublic: false,
          photos: [],
          price: patch.rent || 0,
        })
      }
      if (kind === 'tenants')
        Object.assign(after, {
          status: 'active',
          credit: 0,
          paymentFrequency: 'monthly',
          paymentStatus: 'pending',
          room: '',
          contractId: '',
        })
      if (kind === 'bills') {
        const allowed = [
          'relatedTenantDocId',
          'amount',
          'date',
          'dueDate',
          'description',
          'category',
          'type',
        ]
        if (
          Object.keys(patch).some((k) => !allowed.includes(k)) ||
          !Number.isInteger(patch.amount) ||
          patch.amount <= 0 ||
          !date(patch.date) ||
          !date(patch.dueDate) ||
          !['income', 'expense'].includes(patch.type) ||
          !patch.category?.trim()
        )
          fail('帳單內容錯誤')
        if (['台電帳單', '台水帳單'].includes(patch.category)) fail('台電／台水請由分攤流程建立')
        if (patch.relatedTenantDocId) {
          const t = await tx.get(db.collection('tenants').doc(patch.relatedTenantDocId))
          if (t.data()?.landlordId !== landlordId) fail('租客不屬於此房東')
          tenantUid = t.data().uid
          Object.assign(after, {
            tenantId: tenantUid || null,
            target: t.data().name,
            room: t.data().room || '',
          })
        } else if (patch.type === 'income') fail('收入帳單請指定租客')
        Object.assign(after, {
          status: 'pending',
          paidAmount: 0,
          payments: [],
          adminOperationId: operationId,
        })
      }
      if (kind === 'contracts') {
        if (
          Object.keys(patch).some(
            (k) => !['tenantDocId', 'roomId', 'startDate', 'endDate', 'rent'].includes(k)
          ) ||
          !id(patch.tenantDocId) ||
          !id(patch.roomId)
        )
          fail('租約關聯格式錯誤')
        assertLease(patch)
        const [tenant, room, leases] = await Promise.all([
          tx.get(db.collection('tenants').doc(patch.tenantDocId)),
          tx.get(db.collection('rooms').doc(patch.roomId)),
          tx.get(db.collection('contracts').where('landlordId', '==', landlordId)),
        ])
        if (tenant.data()?.landlordId !== landlordId || room.data()?.landlordId !== landlordId)
          fail('租客或房源不屬於此房東')
        if (
          room.data().status !== 'vacant' ||
          tenant.data().contractId ||
          leases.docs.some(
            (d) =>
              d.data().status === 'active' &&
              (d.data().roomId === patch.roomId || d.data().tenantDocId === patch.tenantDocId)
          )
        )
          fail('房源或租客已有租約，請先完成退租')
        tenantUid = tenant.data().uid
        Object.assign(after, {
          status: 'active',
          tenantId: tenantUid || null,
          tenantName: tenant.data().name,
          roomNumber: room.data().name,
          deposits: [],
        })
        const tenantUpdate = {
          contractId: operationId,
          roomId: patch.roomId,
          room: room.data().name,
          leaseStart: patch.startDate,
          leaseEnd: patch.endDate,
          rent: patch.rent,
          isHistorical: false,
          status: 'active',
        }
        tx.update(tenant.ref, { ...tenantUpdate, updatedAt: FieldValue.serverTimestamp() })
        tx.update(room.ref, {
          status: 'occupied',
          tenantName: tenant.data().name,
          leaseEnd: patch.endDate,
          updatedAt: FieldValue.serverTimestamp(),
        })
        related.push(
          { path: tenant.ref.path, before: serialize(tenant.data()), after: tenantUpdate },
          {
            path: room.ref.path,
            before: serialize(room.data()),
            after: { status: 'occupied', tenantName: tenant.data().name, leaseEnd: patch.endDate },
          }
        )
      }
      tx.create(db.collection(kind).doc(operationId), {
        ...after,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    } else if (operation === 'signedCreate') {
      const c = request.data.contract
      if (
        !c ||
        c.landlordUid !== landlordId ||
        !c.tenant?.trim() ||
        !c.tenantId?.trim() ||
        !date(c.startDate) ||
        !date(c.endDate) ||
        c.endDate < c.startDate ||
        !Number.isFinite(c.rentfee) ||
        c.rentfee <= 0
      )
        fail('合約內容不完整')
      if (c.tenantUid) {
        const t = await tx.get(db.collection('users').doc(c.tenantUid))
        if (t.data()?.landlordId !== landlordId) fail('租客帳號不屬於此房東')
      }
      const existing = await tx.get(
        db.collection('signed_contracts').where('landlordUid', '==', landlordId)
      )
      const overlaps = existing.docs.filter((d) => {
        const o = d.data()
        return (
          !o.supersededBy &&
          !['awaiting_tenant', 'awaiting_landlord', 'voided'].includes(o.status) &&
          (c.tenantUid && o.tenantUid
            ? c.tenantUid === o.tenantUid
            : String(c.tenantId).trim().toUpperCase() ===
              String(o.tenantId).trim().toUpperCase()) &&
          o.startDate <= c.endDate &&
          c.startDate <= o.endDate
        )
      })
      const supersede = request.data.supersedeIds || []
      if (
        c.status !== 'awaiting_tenant' &&
        (overlaps.some((d) => !supersede.includes(d.id)) ||
          supersede.some((x) => !overlaps.some((d) => d.id === x)))
      )
        fail('重疊合約已改變，請重新確認')
      const fields = [
        'landlordUid',
        'contractSource',
        'tenantUid',
        'landlord',
        'landlordId',
        'landlordPhone',
        'landlordAddress',
        'tenant',
        'tenantId',
        'tenantPhone',
        'tenantAddress',
        'tenantMailAddress',
        'roomNo',
        'address',
        'rentfee',
        'deposit',
        'startDate',
        'endDate',
        'duration',
        'paymentDay',
        'paymentFrequency',
        'bankCode',
        'bankAccount',
        'bankAccountName',
        'signature',
        'landlordSignature',
        'feeWater',
        'feeElectricity',
        'feeElectricityNote',
        'feeGas',
        'feeInternet',
        'feeManagement',
        'customArticle21',
        'attachments',
        'waterFeeText',
        'guarantor',
        'guarantorId',
        'guarantorPhone',
        'guarantorAddress',
        'guarantorMailAddress',
        'contractTerms',
        'today',
      ]
      after = Object.fromEntries(fields.filter((k) => c[k] !== undefined).map((k) => [k, c[k]]))
      Object.assign(after, {
        status: c.status === 'awaiting_tenant' ? 'awaiting_tenant' : 'signed',
        templateHtml: fs.readFileSync(
          path.join(__dirname, '../templates/contractTemplate.html'),
          'utf8'
        ),
        templateVersion: 2,
      })
      if (after.status === 'signed' && (!c.signature || !c.landlordSignature))
        fail('現場合約需雙方完成簽名；亦可改用遠端簽署')
      tx.create(db.collection('signed_contracts').doc(operationId), {
        ...after,
        signedAt: FieldValue.serverTimestamp(),
      })
      if (after.status === 'signed')
        for (const d of overlaps) {
          tx.update(d.ref, {
            supersededBy: operationId,
            supersededAt: FieldValue.serverTimestamp(),
          })
          related.push({
            path: d.ref.path,
            before: serialize(d.data()),
            after: { supersededBy: operationId },
          })
        }
      targetKind = 'signed_contracts'
      tenantUid = c.tenantUid
    } else if (operation === 'moveout') {
      const { key, version, payload: p } = request.data
      if (
        !id(key) ||
        !p ||
        !date(p.moveOutDate) ||
        !['expired', 'early', 'other'].includes(p.moveOutReason)
      )
        fail('退租內容錯誤')
      const tenant = await tx.get(db.collection('tenants').doc(key))
      const t = tenant.data()
      if (
        !t ||
        t.landlordId !== landlordId ||
        hash(t) !== version ||
        t.isHistorical ||
        !id(t.contractId)
      )
        fail('租客資料已改變或缺少有效租約')
      const [lease, rooms, leases] = await Promise.all([
        tx.get(db.collection('contracts').doc(t.contractId)),
        tx.get(db.collection('rooms').where('landlordId', '==', landlordId)),
        tx.get(db.collection('contracts').where('landlordId', '==', landlordId)),
      ])
      const matches = rooms.docs.filter((d) =>
        t.roomId ? d.id === t.roomId : d.data().name === t.room
      )
      if (
        lease.data()?.landlordId !== landlordId ||
        lease.data().status !== 'active' ||
        lease.data().tenantDocId !== key ||
        matches.length !== 1 ||
        leases.docs.some(
          (d) =>
            d.id !== t.contractId &&
            d.data().status === 'active' &&
            (d.data().roomId === matches[0].id || d.data().roomNumber === t.room)
        )
      )
        fail('租客、租約與房源狀態不一致')
      const deposit = (lease.data().deposits || [])
        .filter((d) => d.status === 'paid' && d.label !== '首月租金')
        .reduce((n, d) => n + Number(d.amount || 0), 0)
      if (p.depositPaid !== deposit || p.creditRefund !== (t.credit || 0))
        fail('押金或預收已變動，請重新預覽退租')
      for (const value of [
        p.electricitySettlement,
        p.waterSettlement,
        p.depositRefund,
        ...(p.deductions || []).map((d) => d.amount),
      ])
        if (!Number.isFinite(value) || value < 0 || value > 100000000) fail('結算金額錯誤')
      if (p.moveOutDate < t.leaseStart) fail('退租日不得早於起租日')
      if (
        p.finalMeterReading !== null &&
        (!Number.isFinite(p.finalMeterReading) ||
          p.finalMeterReading < Number(matches[0].data().lastMeterReading || 0))
      )
        fail('最終電表度數不可小於目前度數')
      before = serialize(t)
      targetKind = 'tenants'
      resultId = key
      tenantUid = t.uid
      const summary = {
        room: t.room,
        leaseStart: t.leaseStart || '',
        leaseEnd: t.leaseEnd || '',
        moveOutDate: p.moveOutDate,
        moveOutReason: p.moveOutReason,
        depositRefund: p.depositRefund,
        contractId: t.contractId,
      }
      after = {
        ...t,
        isHistorical: true,
        status: 'inactive',
        room: '',
        leaseStart: '',
        leaseEnd: '',
        rent: 0,
        contractId: '',
        credit: 0,
        creditLog: [
          ...(t.creditLog || []),
          ...((t.credit || 0) > 0
            ? [
                {
                  amount: -t.credit,
                  date: today(),
                  note: '退租併入退款',
                  at: new Date().toISOString(),
                  adminOperationId: operationId,
                },
              ]
            : []),
        ],
        moveOutSummary: summary,
      }
      tx.update(tenant.ref, { ...after, updatedAt: FieldValue.serverTimestamp() })
      tx.update(lease.ref, {
        status: 'terminated',
        ...p,
        terminatedAt: FieldValue.serverTimestamp(),
        pendingRenewal: FieldValue.delete(),
      })
      tx.update(matches[0].ref, {
        status: 'vacant',
        tenantName: '',
        leaseEnd: '',
        ...(p.finalMeterReading === null
          ? {}
          : { lastMeterReading: p.finalMeterReading, lastMeterDate: p.moveOutDate }),
      })
      related.push(
        {
          path: lease.ref.path,
          before: serialize(lease.data()),
          after: { status: 'terminated', ...p },
        },
        {
          path: matches[0].ref.path,
          before: serialize(matches[0].data()),
          after: { status: 'vacant' },
        }
      )
      tx.create(db.collection('moveOutRecords').doc(operationId), {
        landlordId,
        tenantDocId: key,
        contractId: t.contractId,
        tenantName: t.name,
        room: t.room,
        leaseStart: t.leaseStart || '',
        leaseEnd: t.leaseEnd || '',
        ...p,
        createdAt: FieldValue.serverTimestamp(),
      })
      if (p.depositRefund > 0)
        tx.create(db.collection('bills').doc(operationId), {
          landlordId,
          tenantId: t.uid || null,
          relatedTenantDocId: key,
          relatedContractId: t.contractId,
          date: today(),
          type: 'expense',
          category: '押金退還',
          description: `${t.name} 退租押金退還`,
          amount: p.depositRefund,
          status: 'completed',
          adminOperationId: operationId,
          createdAt: FieldValue.serverTimestamp(),
        })
    } else fail('未知業務操作')
    audit(tx, db, request, {
      payloadHash,
      kind: targetKind,
      key: resultId,
      action: operation,
      landlordId,
      before,
      after: serialize(after),
      related,
    })
    notify(
      tx,
      db,
      landlordId,
      '平台管理員已處理您的租務資料，請登入查看。',
      '/landlord/support',
      operationId
    )
    if (tenantUid)
      notify(
        tx,
        db,
        tenantUid,
        '平台管理員已處理您的租務資料，請登入查看。',
        targetKind === 'bills' ? '/tenant/bills' : '/tenant/contract',
        operationId
      )
    return { id: resultId }
  })
}
module.exports = { handleDomain }
