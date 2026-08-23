/**
 * 點交照片：壓縮 → 落地待傳佇列 → 背景補傳。
 *
 * 拍完不等上傳完成就讓租客往下走，網路差的現場才不會卡在某一頁。
 * 上傳成功後由 onResolved 回填真正的 URL，呼叫端負責寫回 items。
 */
import { ref, computed, onUnmounted } from 'vue'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { v4 as uuid } from 'uuid'
import { compressPair, photoPath } from '../utils/imageCompress'
import { putPending, removePending, listPending, type PendingPhoto } from '../utils/photoQueue'
import type { InspectionPhoto } from '../utils/inspection'

export type PhotoPatch = Pick<InspectionPhoto, 'thumbUrl' | 'origUrl' | 'pending'>
export type OnResolved = (photoId: string, patch: Partial<PhotoPatch>) => void

export const useInspectionPhotos = (inspectionId: string) => {
  const storage = getStorage()
  // 上線事件觸發的補傳沿用最後一次 drain 指定的回填函式，否則傳上去了卻沒人寫回 items
  let resolver: OnResolved = () => {}
  const previews = ref<Record<string, string>>({})
  const pendingIds = ref<string[]>([])
  const draining = ref(false)

  const pendingCount = computed(() => pendingIds.value.length)

  const setPreview = (id: string, blob: Blob) => {
    const old = previews.value[id]
    if (old) URL.revokeObjectURL(old)
    previews.value = { ...previews.value, [id]: URL.createObjectURL(blob) }
  }

  const dropPreview = (id: string) => {
    const old = previews.value[id]
    if (old) URL.revokeObjectURL(old)
    const next = { ...previews.value }
    delete next[id]
    previews.value = next
  }

  const markPending = (id: string, on: boolean) => {
    const has = pendingIds.value.includes(id)
    if (on && !has) pendingIds.value = [...pendingIds.value, id]
    if (!on && has) pendingIds.value = pendingIds.value.filter(x => x !== id)
  }

  const upload = async (rec: PendingPhoto, blob: Blob, kind: 'thumb' | 'orig') => {
    const path = photoPath(inspectionId, rec.entryKey, rec.id, kind)
    const snap = await uploadBytes(storageRef(storage, path), blob, { contentType: 'image/jpeg' })
    return getDownloadURL(snap.ref)
  }

  /** 重新載入待傳佇列並重建預覽；重整或換頁回來時呼叫 */
  const init = async () => {
    for (const rec of await listPending(inspectionId)) {
      if (rec.thumb) setPreview(rec.id, rec.thumb)
      markPending(rec.id, true)
    }
  }

  /** 壓縮並排入佇列，立刻回傳可放進 items 的照片記錄（尚未有 URL） */
  const capture = async (entryKey: string, file: Blob): Promise<InspectionPhoto> => {
    const id = uuid()
    const { thumb, orig } = await compressPair(file)
    setPreview(id, thumb)
    await putPending({ id, inspectionId, entryKey, thumb, orig, at: Date.now() })
    markPending(id, true)
    return { id, thumbUrl: '', origUrl: '', pending: true, at: Date.now() }
  }

  /**
   * 嘗試把佇列清空。任何一張失敗就留在佇列裡，下次上線再試，
   * 不中斷其他張——一張壞掉的照片不該擋住整批。
   */
  const drain = async (onResolved?: OnResolved) => {
    if (onResolved) resolver = onResolved
    const onResolve = resolver
    if (draining.value) return
    draining.value = true
    try {
      for (const rec of await listPending(inspectionId)) {
        try {
          if (rec.thumb) {
            rec.thumbUrl = await upload(rec, rec.thumb, 'thumb')
            delete rec.thumb
            await putPending(rec)
            onResolve(rec.id, { thumbUrl: rec.thumbUrl, pending: true })
          }
          if (rec.orig) {
            rec.origUrl = await upload(rec, rec.orig, 'orig')
            delete rec.orig
            await putPending(rec)
          }
        } catch {
          continue // 網路不通，留在佇列
        }
        if (!rec.thumb && !rec.orig) {
          await removePending(rec.id)
          dropPreview(rec.id)
          markPending(rec.id, false)
          onResolve(rec.id, { thumbUrl: rec.thumbUrl || '', origUrl: rec.origUrl || '', pending: false })
        }
      }
    } finally {
      draining.value = false
    }
  }

  /** 租客刪照片：清佇列、清預覽，已經傳上去的一併刪掉不留孤兒檔 */
  const discard = async (photo: InspectionPhoto, entryKey: string) => {
    await removePending(photo.id)
    dropPreview(photo.id)
    markPending(photo.id, false)
    for (const kind of ['thumb', 'orig'] as const) {
      const url = kind === 'thumb' ? photo.thumbUrl : photo.origUrl
      if (!url) continue
      try {
        await deleteObject(storageRef(storage, photoPath(inspectionId, entryKey, photo.id, kind)))
      } catch {
        // 檔案不存在或權限不足都不該擋住刪除動作
      }
    }
  }

  const onOnline = () => { void drain() }
  if (typeof window !== 'undefined') window.addEventListener('online', onOnline)

  onUnmounted(() => {
    if (typeof window !== 'undefined') window.removeEventListener('online', onOnline)
    Object.values(previews.value).forEach(URL.revokeObjectURL)
  })

  return { previews, pendingCount, draining, init, capture, drain, discard }
}
