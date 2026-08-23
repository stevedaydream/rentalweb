/**
 * 點交照片的本地待傳佇列（IndexedDB）。
 *
 * 現場常常是地下室或剛交屋還沒牽網路，照片傳不上去不該把租客卡在那一頁。
 * 壓縮完先落地到 IndexedDB，畫面用本地預覽照常往下走，網路回來再補傳。
 *
 * 私密瀏覽或瀏覽器封鎖儲存時 IndexedDB 會直接拋錯，退回記憶體 Map：
 * 至少同一個工作階段內不會掉，重整才會，總比整個流程走不下去好。
 */

const DB_NAME = 'inspection-photos'
const STORE = 'pending'
const VERSION = 1

export interface PendingPhoto {
  id: string
  inspectionId: string
  entryKey: string
  /** 已上傳後刪除；兩者皆無代表可從佇列移除 */
  thumb?: Blob
  orig?: Blob
  thumbUrl?: string
  origUrl?: string
  at: number
}

const memory = new Map<string, PendingPhoto>()
let dbPromise: Promise<IDBDatabase | null> | null = null

const openDb = (): Promise<IDBDatabase | null> => {
  if (dbPromise) return dbPromise
  dbPromise = new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') { resolve(null); return }
      const req = indexedDB.open(DB_NAME, VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('inspectionId', 'inspectionId')
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

const tx = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> => {
  const db = await openDb()
  if (!db) return null
  return new Promise(resolve => {
    try {
      const store = db.transaction(STORE, mode).objectStore(STORE)
      const req = run(store)
      req.onsuccess = () => resolve(req.result as T)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export const putPending = async (rec: PendingPhoto): Promise<void> => {
  memory.set(rec.id, rec)
  await tx('readwrite', s => s.put(rec) as IDBRequest<any>)
}

export const removePending = async (id: string): Promise<void> => {
  memory.delete(id)
  await tx('readwrite', s => s.delete(id) as IDBRequest<any>)
}

/** 某次點交尚未傳完的照片，依拍攝順序 */
export const listPending = async (inspectionId: string): Promise<PendingPhoto[]> => {
  const rows = await tx<PendingPhoto[]>('readonly', s => s.getAll() as IDBRequest<PendingPhoto[]>)
  const source = rows ?? [...memory.values()]
  return source
    .filter(r => r.inspectionId === inspectionId)
    .sort((a, b) => a.at - b.at)
}

/** 清掉整次點交的殘留（完成或放棄時呼叫） */
export const clearPending = async (inspectionId: string): Promise<void> => {
  for (const r of await listPending(inspectionId)) await removePending(r.id)
}
