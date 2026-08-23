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

/**
 * 跨來源圖片（Storage 上的匯款截圖）在 foreignObject 裡畫不出來，必須先換成
 * data URL。抓不到的（CORS 沒開、檔案已刪）就地標上 SKIP_ATTR 排除掉——
 * 少一張截圖，總比整張帳單存不下來好。回傳還原函式，擷取後務必呼叫。
 */
const inlineRemoteImages = async (root: HTMLElement): Promise<() => void> => {
  const undos: Array<() => void> = []
  const imgs = Array.from(root.querySelectorAll('img')).filter((img) => {
    const src = img.currentSrc || img.src
    if (!/^https?:/i.test(src)) return false
    try { return new URL(src, location.href).origin !== location.origin } catch { return false }
  })
  await Promise.all(imgs.map(async (img) => {
    const original = img.getAttribute('src') || ''
    try {
      const res = await fetch(img.currentSrc || img.src, { mode: 'cors', credentials: 'omit' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
      img.setAttribute('src', dataUrl)
      undos.push(() => img.setAttribute('src', original))
      // 換完 src 要等瀏覽器解完圖，否則擷取當下畫出來的是空白
      try { await img.decode() } catch { /* 解不開就讓 filter 那關擋掉 */ }
    } catch {
      if (!img.hasAttribute(SKIP_ATTR)) {
        img.setAttribute(SKIP_ATTR, 'true')
        undos.push(() => img.removeAttribute(SKIP_ATTR))
      }
    }
  }))
  return () => undos.forEach(undo => undo())
}

export const captureElementPng = async (
  el: HTMLElement, backgroundColor: string,
): Promise<Blob> => {
  const restore = await inlineRemoteImages(el)
  try {
    const blob = await toBlob(el, {
      pixelRatio: 2,
      backgroundColor,
      // 呼叫端可用 SKIP_ATTR 排除不該入鏡的節點（按鈕、內嵌失敗的圖）
      filter: (node: HTMLElement) =>
        !(node instanceof Element) || !node.hasAttribute(SKIP_ATTR),
    })
    if (!blob) throw new Error('無法產生圖片')
    return blob
  } finally {
    restore()
  }
}

/**
 * 存成檔案。
 *
 * 這張圖是給租客自己留底的，不是拿去分享給房東——房東本來就知道他繳了。
 * 所以一律走下載，不叫系統分享選單。
 *
 * 用 blob URL 而非 data URL：iOS Safari 對 `<a download>` 帶 data URL
 * 的支援時好時壞，blob URL 穩定得多。
 */
export const downloadImage = (blob: Blob, fileName: string): void => {
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
}
