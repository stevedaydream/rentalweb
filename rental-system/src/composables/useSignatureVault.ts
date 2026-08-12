/**
 * 房東簽名保險箱的工作階段狀態。
 *
 * 解鎖後把明文簽名放在 sessionStorage：關閉分頁或登出即消失，
 * 不落地到 localStorage。交手機給租客簽名前可呼叫 lock() 手動鎖回。
 */
import { ref, computed } from 'vue'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import {
  decryptSignature, encryptSignature, isSignatureVault,
  type SignatureVault,
} from '../utils/signatureVault'

const SESSION_KEY = 'landlordSignature:unlocked'

/** 目前工作階段已解鎖的簽名（明文 dataURL） */
const unlockedSignature = ref<string>(
  (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) || '',
)
/** 該房東是否已設定加密簽名 */
const hasVault = ref(false)
/** 尚未加密的舊簽名（明文），供提示使用者升級 */
const legacyPlainSignature = ref('')
const loaded = ref(false)

const settingsRef = (landlordId: string) => doc(db, 'settings', landlordId)

export const useSignatureVault = () => {
  const isUnlocked = computed(() => !!unlockedSignature.value)

  /** 讀取簽名狀態：是否已加密、是否仍為舊的明文簽名 */
  const load = async (landlordId: string) => {
    try {
      const snap = await getDoc(settingsRef(landlordId))
      const data = snap.exists() ? snap.data() : {}
      hasVault.value = isSignatureVault(data.signatureVault)
      legacyPlainSignature.value = typeof data.signatureImage === 'string' ? data.signatureImage : ''
    } catch {
      hasVault.value = false
      legacyPlainSignature.value = ''
    } finally {
      loaded.value = true
    }
  }

  /** 以 PIN 解鎖；PIN 錯誤時由 decryptSignature 拋出 WrongPinError */
  const unlock = async (landlordId: string, pin: string) => {
    const snap = await getDoc(settingsRef(landlordId))
    const vault = snap.exists() ? snap.data().signatureVault : null
    if (!isSignatureVault(vault)) throw new Error('尚未設定加密簽名')
    const plain = await decryptSignature(vault as SignatureVault, pin)
    unlockedSignature.value = plain
    sessionStorage.setItem(SESSION_KEY, plain)
    return plain
  }

  /** 鎖回：清除工作階段中的明文，交出裝置前使用 */
  const lock = () => {
    unlockedSignature.value = ''
    sessionStorage.removeItem(SESSION_KEY)
  }

  /**
   * 儲存簽名並以 PIN 加密。同時清掉舊的明文欄位，
   * 否則加密後明文仍留在資料庫，等於沒加密。
   */
  const save = async (landlordId: string, dataUrl: string, pin: string) => {
    const vault = await encryptSignature(dataUrl, pin)
    await setDoc(settingsRef(landlordId), { signatureVault: vault, signatureImage: '' }, { merge: true })
    hasVault.value = true
    legacyPlainSignature.value = ''
    unlockedSignature.value = dataUrl
    sessionStorage.setItem(SESSION_KEY, dataUrl)
  }

  /** 移除已儲存的簽名（保險箱與舊明文一併清除） */
  const remove = async (landlordId: string) => {
    await setDoc(settingsRef(landlordId), { signatureVault: null, signatureImage: '' }, { merge: true })
    hasVault.value = false
    legacyPlainSignature.value = ''
    lock()
  }

  return {
    unlockedSignature, hasVault, legacyPlainSignature, loaded, isUnlocked,
    load, unlock, lock, save, remove,
  }
}
