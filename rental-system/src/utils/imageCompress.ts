/**
 * 點交照片壓縮。
 *
 * 一張照片產兩份：縮圖給畫面與 PDF，高解析檔備查。
 * 不存相機直出的真原檔——新手機一張可以到 8MB，體積會隨機型失控成長，
 * 而 2560px 放到 100% 看壁癌、刮痕、漏水一樣清楚。
 */

export const THUMB_MAX_EDGE = 1600
export const THUMB_QUALITY = 0.85
export const ORIG_MAX_EDGE = 2560
export const ORIG_QUALITY = 0.92

export interface Size { width: number; height: number }

/** 等比縮到最長邊不超過 max；比 max 小的圖不放大 */
export const fitWithin = (width: number, height: number, max: number): Size => {
  const w = Math.max(0, Math.floor(width))
  const h = Math.max(0, Math.floor(height))
  if (!w || !h) return { width: 0, height: 0 }
  const scale = Math.min(1, max / Math.max(w, h))
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

/**
 * 解碼成點陣圖。
 *
 * 優先 createImageBitmap 並要求套用 EXIF 方向——手機直拍的照片方向資訊在
 * EXIF 裡，直接畫到 canvas 會變成躺著的。舊瀏覽器沒有這個選項時退回 <img>。
 */
const decode = async (file: Blob): Promise<CanvasImageSource & Size> => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' }) as any
    } catch {
      // 部分瀏覽器不支援 imageOrientation 選項，改走 <img>
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('圖片解析失敗'))
      el.src = url
    })
    return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight }) as any
  } finally {
    // 立刻釋放會讓部分瀏覽器在 drawImage 前失效，故延後到下一輪事件迴圈
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

const toBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('影像壓縮失敗'))),
      'image/jpeg',
      quality,
    )
  })

/** 壓成 JPEG；maxEdge 為最長邊上限 */
export const compressImage = async (
  file: Blob, maxEdge: number, quality: number,
): Promise<Blob> => {
  const src = await decode(file)
  const { width, height } = fitWithin(src.width as number, src.height as number, maxEdge)
  if (!width || !height) throw new Error('圖片尺寸無效')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法建立繪圖環境')
  ctx.drawImage(src as CanvasImageSource, 0, 0, width, height)

  const blob = await toBlob(canvas, quality)
  if (typeof (src as ImageBitmap).close === 'function') (src as ImageBitmap).close()
  return blob
}

export interface CompressedPair {
  thumb: Blob
  orig: Blob
}

/** 一次產出縮圖與高解析檔 */
export const compressPair = async (file: Blob): Promise<CompressedPair> => ({
  thumb: await compressImage(file, THUMB_MAX_EDGE, THUMB_QUALITY),
  orig: await compressImage(file, ORIG_MAX_EDGE, ORIG_QUALITY),
})

/** Storage 路徑；縮圖與原檔分開放，排程只需刪 orig/ 底下的東西 */
export const photoPath = (
  inspectionId: string, entryKey: string, photoId: string, kind: 'thumb' | 'orig',
): string => `inspections/${inspectionId}/${kind}/${entryKey}_${photoId}.jpg`
