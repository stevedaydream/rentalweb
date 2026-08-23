/**
 * 把畫面區塊存成圖片。
 *
 * 用 html-to-image（SVG foreignObject）而非 html2canvas：後者停在 2022 年的
 * 1.4.1，完全不認得 `oklch()`，而 Tailwind v4 的預設色盤整包都是 oklch，
 * 於是每次擷取都直接拋例外。foreignObject 是交給瀏覽器自己畫，
 * 瀏覽器支援的顏色它就支援。
 */
import { toBlob } from 'html-to-image'

/** 標了這個屬性的節點不會進到圖片裡 */
export const SKIP_ATTR = 'data-capture-skip'

export const captureElementPng = async (
  el: HTMLElement, backgroundColor: string,
): Promise<Blob> => {
  const blob = await toBlob(el, {
    pixelRatio: 2,
    backgroundColor,
    // 跨來源圖片必須內嵌才畫得出來，內嵌失敗會讓整張擷取失敗，
    // 故由呼叫端以 SKIP_ATTR 標記排除（例如租客自己上傳的匯款截圖）
    filter: (node: HTMLElement) =>
      !(node instanceof Element) || !node.hasAttribute(SKIP_ATTR),
  })
  if (!blob) throw new Error('無法產生圖片')
  return blob
}

/** 手機上多半沒有「下載」的概念，能直接分享到 LINE 才是使用者要的 */
const canShareFile = (file: File): boolean => {
  const nav = navigator as Navigator & { canShare?: (d: any) => boolean }
  return typeof nav.share === 'function' && !!nav.canShare?.({ files: [file] })
}

/**
 * 這台裝置按下去會叫出分享還是直接下載。
 * 給呼叫端決定按鈕要寫什麼——按鈕寫「下載」卻跳出分享選單是最惱人的那種不一致。
 */
export const willShareImage = (): boolean => {
  try {
    return canShareFile(new File([new Blob()], 'probe.png', { type: 'image/png' }))
  } catch {
    return false
  }
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
