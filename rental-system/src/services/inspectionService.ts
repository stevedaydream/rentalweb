import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, doc, getDoc, getDocs, writeBatch,
  query, where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore'
import { v4 as uuid } from 'uuid'
import { DEFAULT_CATALOG, type CatalogItem, type InspectionItem } from '../utils/inventory'
import {
  entriesFromCatalog, entriesFromLegacy, seedEntriesFrom, toSummaryItems,
  DEFAULT_CONDITION_CATALOG,
  type Inspection, type InspectionEntry, type InspectionStatus, type InspectionType,
} from '../utils/inspection'

const COLL = 'inspections'

const newKey = () => uuid()

export const getInspection = async (id: string): Promise<Inspection | null> => {
  const snap = await getDoc(doc(db, COLL, id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Inspection) : null
}

/** 該租客歷次點交，新的在前 */
export const listInspectionsByTenant = async (
  landlordId: string, tenantDocId: string,
): Promise<Inspection[]> => {
  const snap = await getDocs(query(
    collection(db, COLL),
    where('landlordId', '==', landlordId),
    where('tenantDocId', '==', tenantDocId),
    orderBy('createdAt', 'desc'),
  ))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Inspection))
}

/** 同一間房最近一次點交，用來沿用品項骨架 */
const latestForRoom = async (landlordId: string, roomId: string): Promise<Inspection | null> => {
  if (!roomId) return null
  const snap = await getDocs(query(
    collection(db, COLL),
    where('landlordId', '==', landlordId),
    where('roomId', '==', roomId),
    orderBy('createdAt', 'desc'),
    limit(1),
  ))
  const d = snap.docs[0]
  return d ? ({ id: d.id, ...d.data() } as Inspection) : null
}

const loadCatalogs = async (landlordId: string): Promise<{ assets: CatalogItem[]; conditions: string[] }> => {
  try {
    const snap = await getDoc(doc(db, 'settings', landlordId))
    const data = snap.exists() ? snap.data() : {}
    const assets = data.inventoryCatalog as CatalogItem[] | undefined
    const conditions = data.conditionCatalog as string[] | undefined
    return {
      assets: Array.isArray(assets) && assets.length > 0 ? assets : DEFAULT_CATALOG,
      conditions: Array.isArray(conditions) && conditions.length > 0 ? conditions : DEFAULT_CONDITION_CATALOG,
    }
  } catch {
    return { assets: DEFAULT_CATALOG, conditions: DEFAULT_CONDITION_CATALOG }
  }
}

export interface SeedContext {
  landlordId: string
  tenantDocId: string
  tenantId?: string
  tenantName?: string
  roomId?: string
  roomName?: string
  type?: InspectionType
  /** 舊的 tenants.moveInInspection.items，沒有前次點交時的第二順位來源 */
  legacyItems?: InspectionItem[]
}

export interface SeedResult {
  items: InspectionEntry[]
  /** 品項從哪來，用於在畫面上說明「沿用 3F-A 上次的清單」 */
  source: 'previous' | 'legacy' | 'catalog'
  sourceLabel: string
}

/**
 * 建立初始品項清單。
 *
 * 優先序：同房間上次點交 → 該租客的舊 moveInInspection → 主檔預設。
 * 前兩者都只帶骨架，狀況與照片一律重來——帶著上次的判定會誘導這次照抄。
 */
export const seedItems = async (ctx: SeedContext): Promise<SeedResult> => {
  const prev = ctx.roomId ? await latestForRoom(ctx.landlordId, ctx.roomId) : null
  if (prev?.items?.length) {
    return {
      items: seedEntriesFrom(prev.items, newKey),
      source: 'previous',
      sourceLabel: `沿用「${prev.roomName || ctx.roomName || '此房間'}」上次點交的品項`,
    }
  }

  if (ctx.legacyItems?.length) {
    const items = entriesFromLegacy(ctx.legacyItems, newKey)
    if (items.length) {
      return { items, source: 'legacy', sourceLabel: '沿用此租客既有的入住點交清單' }
    }
  }

  const { assets, conditions } = await loadCatalogs(ctx.landlordId)
  return {
    items: entriesFromCatalog(assets, conditions, newKey),
    source: 'catalog',
    sourceLabel: '以物品主檔與屋況檢查項建立',
  }
}

/** 開新點交（狀態 draft）；品項已由 seedItems 備妥 */
export const createInspection = async (
  ctx: SeedContext, items: InspectionEntry[],
): Promise<string> => {
  const ref = await addDoc(collection(db, COLL), {
    landlordId: ctx.landlordId,
    tenantDocId: ctx.tenantDocId,
    tenantId: ctx.tenantId || '',
    tenantName: ctx.tenantName || '',
    roomId: ctx.roomId || '',
    roomName: ctx.roomName || '',
    type: ctx.type || 'movein',
    status: 'draft' as InspectionStatus,
    items,
    signatures: {},
    photoCleanupAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/** 尚未完成的點交（草稿或進行中），用來接回中斷的現場 */
export const findOpenInspection = async (
  landlordId: string, tenantDocId: string,
): Promise<Inspection | null> => {
  const all = await listInspectionsByTenant(landlordId, tenantDocId)
  return all.find(i => i.status !== 'signed') || null
}

export const saveItems = (id: string, items: InspectionEntry[]) =>
  updateDoc(doc(db, COLL, id), { items, updatedAt: serverTimestamp() })

export const setStatus = (id: string, status: InspectionStatus, extra: Record<string, any> = {}) =>
  updateDoc(doc(db, COLL, id), { status, ...extra, updatedAt: serverTimestamp() })

/** 遞給租客：先把當下品項存下來再換狀態，避免中途斷線丟掉編輯 */
export const handToTenant = async (id: string, items: InspectionEntry[]) => {
  await saveItems(id, items)
  await setStatus(id, 'tenant')
}

/**
 * 雙方簽名完成。
 *
 * 同時回寫一份摘要到 tenants.moveInInspection，讓退租儀不必認識新結構；
 * 兩筆寫入放同一個 batch，避免出現「點交完成了但退租看不到」的半套狀態。
 */
export const completeInspection = async (
  insp: Inspection,
  items: InspectionEntry[],
  signatures: { tenant: string; landlord: string },
) => {
  const batch = writeBatch(db)
  batch.update(doc(db, COLL, insp.id), {
    items,
    status: 'signed' as InspectionStatus,
    signatures: {
      tenant: { image: signatures.tenant, at: Date.now() },
      landlord: { image: signatures.landlord, at: Date.now() },
    },
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  if (insp.type !== 'moveout' && insp.tenantDocId) {
    batch.update(doc(db, 'tenants', insp.tenantDocId), {
      moveInInspection: {
        inspectedAt: Date.now(),
        inspectionId: insp.id,
        items: toSummaryItems(items),
      },
      updatedAt: serverTimestamp(),
    })
  }
  await batch.commit()
}
