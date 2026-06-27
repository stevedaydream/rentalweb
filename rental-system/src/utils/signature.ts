// 電子簽名共用：房東簽名/印章存於 settings/{landlordId}.signatureImage（dataURL），
// 各單據（點交清單 / 結清單 / 收據）本地組裝時嵌入；租客簽名以 Signature.vue 當場擷取。
import { db } from '../firebase/config'
import { doc, getDoc } from 'firebase/firestore'

// 1×1 透明 GIF：簽名空白時填入，避免 <img> 破圖
export const BLANK_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

// 讀房東已存簽名/印章；無則回空字串（呼叫端再以 BLANK_PIXEL 墊底）
export const loadLandlordSignature = async (landlordId: string): Promise<string> => {
  try {
    const snap = await getDoc(doc(db, 'settings', landlordId))
    const img = snap.exists() ? (snap.data().signatureImage as string) : ''
    return img || ''
  } catch {
    return ''
  }
}

// 上傳印章圖：等比縮到 maxW 寬並轉 PNG dataURL，避免 Firestore 文件過大
export const fileToResizedDataUrl = (file: File, maxW = 420): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('讀取檔案失敗'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('圖片解析失敗'))
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('無法建立繪圖環境')); return }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
