/**
 * 房東簽名保險箱：以 PIN 派生金鑰加密簽名圖，存入 Firestore。
 *
 * 為什麼要加密而非只驗證 PIN：
 * 簽名以明文 dataURL 存在 `settings/{landlordId}` 時，任何能讀到該文件的
 * 路徑（其他房東帳號、資料庫外洩、開發者工具）都能直接取得簽名圖，
 * 「驗證式」PIN 完全繞得過。加密後沒有 PIN 拿到的只是密文。
 *
 * ⚠ 這道保護的是「簽名被再利用」，不是「被看見」：
 * 租客簽署時合約上本來就會顯示房東簽名，截圖無法防範。PIN 阻止的是
 * 拿到裝置後把簽名下載、或蓋到其他單據上。
 */

/** PBKDF2 迭代次數（OWASP 對 PBKDF2-HMAC-SHA256 的建議下限） */
const ITERATIONS = 210_000
const KEY_LENGTH = 256
const SALT_BYTES = 16
const IV_BYTES = 12

export interface SignatureVault {
  /** 格式版本，日後調整參數時用來辨識舊資料 */
  v: 1
  salt: string
  iv: string
  cipher: string
}

export class WrongPinError extends Error {
  constructor() {
    super('PIN 碼不正確')
    this.name = 'WrongPinError'
  }
}

/** PIN 規則：4~8 位數字。太短無法抵抗猜測，太長不利現場輸入 */
export const isValidPin = (pin: string) => /^\d{4,8}$/.test(pin)

const toBase64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

const fromBase64 = (b64: string) => {
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}

const deriveKey = async (pin: string, salt: Uint8Array) => {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** 以 PIN 加密簽名 dataURL。每次加密都用新的 salt 與 iv */
export const encryptSignature = async (dataUrl: string, pin: string): Promise<SignatureVault> => {
  if (!dataUrl) throw new Error('簽名內容為空')
  if (!isValidPin(pin)) throw new Error('PIN 碼須為 4~8 位數字')
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(pin, salt)
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(dataUrl),
  )
  return { v: 1, salt: toBase64(salt), iv: toBase64(iv), cipher: toBase64(cipher) }
}

/**
 * 以 PIN 解密。PIN 錯誤時 AES-GCM 的驗證標籤會失敗，
 * 統一轉成 WrongPinError，呼叫端不必辨識瀏覽器各自的錯誤型別。
 */
export const decryptSignature = async (vault: SignatureVault, pin: string): Promise<string> => {
  if (!vault?.cipher) throw new Error('尚未設定加密簽名')
  try {
    const key = await deriveKey(pin, fromBase64(vault.salt))
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(vault.iv) as BufferSource },
      key,
      fromBase64(vault.cipher) as BufferSource,
    )
    return new TextDecoder().decode(plain)
  } catch {
    throw new WrongPinError()
  }
}

/** 判斷 Firestore 取回的欄位是否為合法的保險箱結構 */
export const isSignatureVault = (value: unknown): value is SignatureVault => {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<SignatureVault>
  return v.v === 1 && typeof v.salt === 'string' && typeof v.iv === 'string' && typeof v.cipher === 'string'
}
