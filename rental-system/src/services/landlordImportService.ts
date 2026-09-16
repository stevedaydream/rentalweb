import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getProperties } from './propertyService'
import { getRooms } from './roomService'
import { importKey, type LandlordImportPlan } from '../utils/landlordImport'

// 單個作業最多會寫兩份文件（建物＋總表、租客＋房間），保守留在 500 上限內。
const BATCH_SIZE = 150

export interface LandlordImportResult { runId: string; summary: LandlordImportPlan['summary'] }

/**
 * 寫入已通過驗證的「現況接管」計畫。
 * 文件 ID 全在寫入前配置，讓跨集合關聯可在分批 Firestore batch 中保持一致；
 * runId 可供日後稽核與受條件限制的復原功能辨認來源。
 */
export const executeLandlordImport = async (
  landlordId: string,
  plan: LandlordImportPlan,
  fileName: string,
  templateVersion: number,
): Promise<LandlordImportResult> => {
  const [existingProperties, existingRooms] = await Promise.all([getProperties(landlordId), getRooms(landlordId)])
  const propertyKeys = new Set(existingProperties.map(p => importKey(p.name)))
  const roomKeys = new Set(existingRooms.map(r => importKey(r.name)))
  const conflicts = [
    ...plan.properties.filter(p => propertyKeys.has(p.key)).map(p => `建物「${p.name}」已存在`),
    ...plan.rooms.filter(r => roomKeys.has(r.key)).map(r => `房號「${r.name}」已存在`),
  ]
  if (conflicts.length) throw new Error(`資料已變更，請重新預覽：${conflicts.join('；')}`)

  const runRef = doc(collection(db, 'data_imports'))
  const propertyRefs = new Map(plan.properties.map(p => [p.key, doc(collection(db, 'properties'))]))
  const groupRefs = new Map(plan.properties.map(p => [p.key, doc(collection(db, 'meter_groups'))]))
  const roomRefs = new Map(plan.rooms.map(r => [r.key, doc(collection(db, 'rooms'))]))
  const tenantRefs = new Map(plan.tenants.map(t => [t.roomKey, doc(collection(db, 'tenants'))]))
  const subGroups = new Map<string, { id: string; name: string }[]>()
  for (const room of plan.rooms) {
    const list = subGroups.get(room.propertyKey) || []
    const floor = room.floor || '未分層'
    if (!list.some(s => importKey(s.name) === importKey(floor))) list.push({ id: `imp_${crypto.randomUUID()}`, name: floor })
    subGroups.set(room.propertyKey, list)
  }
  const subGroupFor = (propertyKey: string, floor: string) =>
    (subGroups.get(propertyKey) || []).find(s => importKey(s.name) === importKey(floor || '未分層'))?.id || ''
  const latestReading = new Map<string, { date: string; reading: number }>()
  plan.meterReadings.forEach(r => {
    const current = latestReading.get(r.roomKey)
    if (!current || r.date > current.date) latestReading.set(r.roomKey, { date: r.date, reading: r.reading })
  })

  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = []
  operations.push(batch => batch.set(runRef, {
    landlordId, fileName, templateVersion, status: 'running', source: 'current_snapshot',
    summary: plan.summary, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }))
  plan.properties.forEach(p => operations.push(batch => {
    const propertyRef = propertyRefs.get(p.key)!; const groupRef = groupRefs.get(p.key)!
    batch.set(groupRef, { landlordId, name: p.name, subGroups: subGroups.get(p.key) || [], officialMetersCount: 1, importRunId: runRef.id, createdAt: serverTimestamp() })
    batch.set(propertyRef, { landlordId, name: p.name, address: p.address || '', meterGroupId: groupRef.id,
      waterSettings: { mode: p.waterMode, basis: p.waterBasis, fixedAmount: p.fixedWaterAmount }, importRunId: runRef.id, createdAt: serverTimestamp() })
  }))
  plan.rooms.forEach(r => operations.push(batch => {
    const latest = latestReading.get(r.key)
    batch.set(roomRefs.get(r.key)!, {
      landlordId, name: r.name, propertyId: propertyRefs.get(r.propertyKey)!.id,
      subGroupId: subGroupFor(r.propertyKey, r.floor || ''), price: r.rent, size: r.size, layout: r.layout,
      type: '公寓', address: plan.properties.find(p => p.key === r.propertyKey)?.address || '', status: tenantRefs.has(r.key) ? 'occupied' : 'vacant',
      isPublic: false, images: [], coverImage: '', waterMode: r.waterMode || '', waterNo: r.waterNo || '',
      ...(latest ? { lastMeterReading: latest.reading, lastMeterDate: latest.date } : {}), importRunId: runRef.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
  }))
  plan.tenants.forEach(t => operations.push(batch => {
    const room = plan.rooms.find(r => r.key === t.roomKey)!; const lease = plan.leases.find(l => l.roomKey === t.roomKey)!
    batch.set(tenantRefs.get(t.roomKey)!, { landlordId, name: t.name, phone: t.phone || '', email: t.email || '', idNumber: t.idNumber || '', emergencyContact: t.emergencyContact || '',
      occupants: t.occupants, roomId: roomRefs.get(t.roomKey)!.id, roomName: room.name, room: room.name, status: 'active',
      leaseStart: lease.startDate, leaseEnd: lease.endDate, rent: lease.rent, credit: t.credit,
      creditLog: t.credit ? [{ amount: t.credit, date: lease.startDate, source: 'migration', note: t.creditNote || '舊系統接管預收餘額' }] : [], importRunId: runRef.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    batch.update(roomRefs.get(t.roomKey)!, { tenantName: t.name, tenantId: tenantRefs.get(t.roomKey)!.id, leaseEnd: lease.endDate })
  }))
  plan.leases.forEach(l => operations.push(batch => batch.set(doc(collection(db, 'contracts')), {
    landlordId, tenantDocId: tenantRefs.get(l.roomKey)!.id, tenantName: plan.tenants.find(t => t.roomKey === l.roomKey)!.name,
    roomId: roomRefs.get(l.roomKey)!.id, roomNumber: plan.rooms.find(r => r.key === l.roomKey)!.name,
    startDate: l.startDate, endDate: l.endDate, rent: l.rent, depositMonths: l.depositMonths, paymentFrequency: l.paymentFrequency,
    status: 'active', imported: true, importRunId: runRef.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })))
  plan.outstanding.forEach(b => operations.push(batch => {
    const tenant = plan.tenants.find(t => t.roomKey === b.roomKey)!; const room = plan.rooms.find(r => r.key === b.roomKey)!
    const today = new Date().toISOString().slice(0, 10)
    batch.set(doc(collection(db, 'bills')), { landlordId, relatedTenantDocId: tenantRefs.get(b.roomKey)!.id, tenantId: null,
      propertyId: propertyRefs.get(room.propertyKey)!.id, target: `${tenant.name} ${room.name}`, date: b.dueDate, dueDate: b.dueDate,
      type: 'income', category: b.category, description: b.description || `舊系統未結清${b.category}`, amount: b.amount,
      status: b.dueDate < today ? 'overdue' : 'pending', paidAmount: 0, payments: [], coverFrom: b.coverFrom || null, coverTo: b.coverTo || null,
      imported: true, importRunId: runRef.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }))
  plan.meterReadings.forEach((r, index) => operations.push(batch => {
    const list = plan.meterReadings.filter(x => x.roomKey === r.roomKey).sort((a, b) => a.date.localeCompare(b.date))
    const prior = list[Math.max(0, list.indexOf(r) - 1)]!
    batch.set(doc(collection(db, 'meter_readings')), { landlordId, roomId: roomRefs.get(r.roomKey)!.id, roomName: plan.rooms.find(room => room.key === r.roomKey)!.name,
      lastReading: prior.reading, currentReading: r.reading, usage: r.reading - prior.reading, cost: 0,
      periodStart: prior.date, periodEnd: r.date, importBaseline: true, importRunId: runRef.id, createdAt: serverTimestamp(), importOrder: index })
  }))

  try {
    for (let index = 0; index < operations.length; index += BATCH_SIZE) {
      const batch = writeBatch(db)
      operations.slice(index, index + BATCH_SIZE).forEach(op => op(batch))
      await batch.commit()
    }
    const completion = writeBatch(db)
    completion.update(runRef, { status: 'completed', completedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    await completion.commit()
  } catch (error) {
    const failure = writeBatch(db)
    failure.update(runRef, { status: 'failed', failedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    await failure.commit().catch(() => undefined)
    throw error
  }
  return { runId: runRef.id, summary: plan.summary }
}
