/**
 * 資料匯入的寫入與復原。
 *
 * - 寫入量在單一 batch 上限內時整批寫入，全有或全無
 * - 超過上限時分批寫入；任一批失敗就把已預先配置的文件全部刪除，並把任務標為 rolled_back
 * - 自動復原也失敗時任務停在 failed，可在匯入中心依 importRunId 手動清除後重新匯入
 */
import {
  collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch, type DocumentReference,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { getProperties } from './propertyService'
import { getRooms } from './roomService'
import { importKey, planLandlordImportWrites, type ImportWrite, type LandlordImportPlan } from '../utils/landlordImport'
import { planHistoricalImportWrites, type HistoricalImportPlan, type HistoricalExisting } from '../utils/historicalImport'
import { taipeiDate } from '../utils/importCells'

/** Firestore 單一 batch 上限 500 筆，保留任務文件等餘裕 */
const BATCH_LIMIT = 450

export type ImportSource = 'current_snapshot' | 'historical'
export type ImportStatus = 'running' | 'completed' | 'failed' | 'rolled_back'

export interface ImportRun {
  id: string
  landlordId: string
  fileName: string
  source: ImportSource
  status: ImportStatus
  summary: Record<string, number>
  error?: string
  createdAt?: { seconds: number }
}

/** 匯入可能建立文件的集合；清除時逐一以 importRunId 查詢 */
const IMPORT_COLLECTIONS: Record<ImportSource, string[]> = {
  current_snapshot: ['bills', 'contracts', 'tenants', 'rooms', 'properties', 'meter_groups'],
  historical: ['bills', 'tenants'],
}

const newIdFactory = () => (name: string) => doc(collection(db, name)).id

const commitInChunks = async (
  refs: DocumentReference[],
  apply: (batch: ReturnType<typeof writeBatch>, ref: DocumentReference, index: number) => void,
  onCommitted?: (count: number) => void,
) => {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    const chunk = refs.slice(i, i + BATCH_LIMIT)
    chunk.forEach((ref, j) => apply(batch, ref, i + j))
    await batch.commit()
    onCommitted?.(i + chunk.length)
  }
}

const markRun = async (runRef: DocumentReference, status: ImportStatus, extra: Record<string, unknown> = {}) => {
  const batch = writeBatch(db)
  batch.update(runRef, { status, updatedAt: serverTimestamp(), ...extra })
  await batch.commit()
}

const executeWrites = async (
  landlordId: string, runRef: DocumentReference, writes: ImportWrite[],
  meta: { fileName: string; source: ImportSource; templateVersion: number; summary: Record<string, number> },
) => {
  const runData = {
    landlordId, fileName: meta.fileName, source: meta.source, templateVersion: meta.templateVersion,
    summary: meta.summary, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }
  const refs = writes.map(w => doc(db, w.collection, w.id))

  if (writes.length + 1 <= BATCH_LIMIT) {
    const batch = writeBatch(db)
    writes.forEach((w, i) => batch.set(refs[i]!, w.data))
    batch.set(runRef, { ...runData, status: 'completed', completedAt: serverTimestamp() })
    await batch.commit()
    return
  }

  const start = writeBatch(db)
  start.set(runRef, { ...runData, status: 'running' })
  await start.commit()
  // 每批寫入全有或全無，只需刪除已成功提交的批次；
  // 規則對不存在的文件會拒絕刪除，不能把預先配置但沒寫入的 id 一起刪
  let committed = 0
  try {
    await commitInChunks(refs, (batch, ref, i) => batch.set(ref, writes[i]!.data), n => { committed = n })
    await markRun(runRef, 'completed', { completedAt: serverTimestamp() })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    try {
      await commitInChunks(refs.slice(0, committed), (batch, ref) => batch.delete(ref))
      await markRun(runRef, 'rolled_back', { error: message })
    } catch {
      await markRun(runRef, 'failed', { error: message }).catch(() => undefined)
      throw new Error(`匯入中斷且自動復原失敗，請到匯入中心清除這次匯入後再試（${message}）`)
    }
    throw new Error(`匯入中斷，已自動復原，資料未變動（${message}）`)
  }
}

/** 現況接管預覽需要比對的既有建物與房號 */
export const getCurrentImportContext = async (landlordId: string) => {
  const [properties, rooms, profile] = await Promise.all([
    getProperties(landlordId), getRooms(landlordId), getDoc(doc(db, 'users', landlordId)),
  ])
  return {
    propertyNames: properties.map(p => p.name),
    roomNames: rooms.map(r => r.name),
    paymentDay: Number(profile.data()?.settings?.paymentDay) || 5,
  }
}

export const executeLandlordImport = async (
  landlordId: string, plan: LandlordImportPlan, fileName: string, templateVersion: number,
) => {
  // 預覽之後資料可能又變動，寫入前重新比對
  const context = await getCurrentImportContext(landlordId)
  const propertyKeys = new Set(context.propertyNames.map(importKey))
  const roomKeys = new Set(context.roomNames.map(importKey))
  const conflicts = [
    ...plan.properties.filter(p => propertyKeys.has(p.key)).map(p => `建物「${p.name}」`),
    ...plan.rooms.filter(r => roomKeys.has(r.key)).map(r => `房號「${r.name}」`),
  ]
  if (conflicts.length) throw new Error(`資料已變更，請重新選擇檔案預覽：${conflicts.join('、')}已存在`)

  const runRef = doc(collection(db, 'data_imports'))
  const writes = planLandlordImportWrites(plan, {
    landlordId, runId: runRef.id, newId: newIdFactory(), timestamp: serverTimestamp(),
    nowIso: new Date().toISOString(), today: taipeiDate(), paymentDay: context.paymentDay,
  })
  await executeWrites(landlordId, runRef, writes, { fileName, source: 'current_snapshot', templateVersion, summary: plan.summary })
  return { runId: runRef.id, summary: plan.summary }
}

/** 歷史遷移預覽需要比對的已匯入舊系統鍵與目前房間 */
export const getHistoricalImportContext = async (landlordId: string): Promise<HistoricalExisting> => {
  const [tenantSnap, billSnap, rooms] = await Promise.all([
    getDocs(query(collection(db, 'tenants'), where('landlordId', '==', landlordId), where('isHistorical', '==', true))),
    getDocs(query(collection(db, 'bills'), where('landlordId', '==', landlordId), where('isHistorical', '==', true))),
    getRooms(landlordId),
  ])
  const bills = billSnap.docs.map(d => d.data())
  return {
    tenantKeys: tenantSnap.docs.map(d => d.data().legacyTenantKey).filter(Boolean),
    billKeys: bills.map(b => b.legacyBillKey).filter(Boolean),
    paymentKeys: bills.flatMap(b => (b.payments ?? []).map((p: { legacyPaymentKey?: string }) => p.legacyPaymentKey)).filter(Boolean),
    rooms: rooms.map(r => ({ id: r.id, name: r.name, propertyId: r.propertyId })),
  }
}

export const executeHistoricalImport = async (landlordId: string, plan: HistoricalImportPlan, fileName: string) => {
  const runRef = doc(collection(db, 'data_imports'))
  const writes = planHistoricalImportWrites(plan, {
    landlordId, runId: runRef.id, newId: newIdFactory(), timestamp: serverTimestamp(), nowIso: new Date().toISOString(),
  })
  await executeWrites(landlordId, runRef, writes, { fileName, source: 'historical', templateVersion: 2, summary: plan.summary })
  return { runId: runRef.id, summary: plan.summary }
}

export const getImportRuns = async (landlordId: string): Promise<ImportRun[]> => {
  const snap = await getDocs(query(collection(db, 'data_imports'), where('landlordId', '==', landlordId)))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ImportRun))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

/** 清除一次未完成的匯入：刪除所有帶此 importRunId 的文件，任務標為 rolled_back */
export const rollbackImportRun = async (landlordId: string, run: ImportRun) => {
  if (run.landlordId !== landlordId) throw new Error('無權清除這次匯入')
  const runRef = doc(db, 'data_imports', run.id)
  const refs: DocumentReference[] = []
  for (const name of IMPORT_COLLECTIONS[run.source] ?? []) {
    const snap = await getDocs(query(collection(db, name), where('landlordId', '==', landlordId), where('importRunId', '==', run.id)))
    refs.push(...snap.docs.map(d => d.ref))
  }
  await commitInChunks(refs, (batch, ref) => batch.delete(ref))
  await markRun(runRef, 'rolled_back', { rolledBackAt: serverTimestamp(), rolledBackCount: refs.length })
  return refs.length
}
