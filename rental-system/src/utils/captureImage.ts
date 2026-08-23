/**
 * 把畫面區塊存成圖片。
 *
 * 用 html-to-image（SVG foreignObject）而非 html2canvas：後者停在 2022 年的
 * 1.4.1，完全不認得 `oklch()`，而 Tailwind v4 的預設色盤整包都是 oklch，
 * 於是每次擷取都直接拋例外。foreignObject 是交給瀏覽器自己畫，
 * 瀏覽器支援的顏色它就支援。
 */
import { toBlob } from 'html-to-image'

export const captureElementPng = async (
  el: HTMLElement, backgroundColor: string,
): Promise<Blob> => {
  const blob = await toBlob(el, {
    pixelRatio: 2,
    backgroundColor,
    // 產生的圖只給人看，跳過會拖慢或失敗的外部資源
    cacheBust: true,
  })
  if (!blob) throw new Error('無法產生圖片')
  return blob
}

/** 手機上多半沒有「下載」的概念，能直接分享到 LINE 才是使用者要的 */
const canShareFile = (file: File): boolean => {
  const nav = navigator as Navigator & { canShare?: (d: any) => boolean }
  return typeof nav.share === 'function' && !!nav.canShare?.({ files: [file] })
}

export type SaveResult = 'shared' | 'downloaded'

/**
 * 優先叫出系統分享（手機可直接傳 LINE），不支援才退回下載。
 *
 * 用 blob URL 而非 data URL：iOS Safari 對 `<a download>` 帶 data URL
 * 的支援時好時壞，blob URL 穩定得多。
 */
export const saveOrShareImage = async (
  blob: Blob, fileName: string,
): Promise<SaveResult> => {
  const file = new File([blob], fileName, { type: 'image/png' })

  if (canShareFile(file)) {
    try {
      await (navigator as any).share({ files: [file], title: fileName })
      return 'shared'
    } catch (e: any) {
      // 使用者自己取消不算失敗，也不該再退回下載
      if (e?.name === 'AbortError') return 'shared'
    }
  }

  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    // 立即撤銷會讓部分瀏覽器來不及讀取
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  return 'downloaded'
}
