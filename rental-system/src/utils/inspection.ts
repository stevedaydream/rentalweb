/**
 * 雙方點交（inspections）共用型別與純函式。
 *
 * 流程是四階段狀態機：draft（房東選項目）→ tenant（租客逐項確認）
 * → review（房東二次確認、標歧異、協調共識）→ signing（雙方簽名）→ signed（完成）。
 * signing 獨立成一個持久狀態，是為了讓平板在簽名頁沒電時能接回同一頁。
 *
 * 房東在 review 階段不是「改掉」租客的判定，而是標記歧異、記下自己的主張，
 * 雙方口頭協調後再收斂成 finalCondition。三個值全部留底，退租爭議時才拿得出軌跡。
 *
 * 閘門集中在這裡（canHandToTenant / canReturnToLandlord / canSign），
 * UI 只負責呈現，避免規則散落在三個元件裡各寫一份。
 */
import { DAMAGE_RATIO, type CatalogItem, type Condition, type InspectionItem } from './inventory'

export type InspectionStatus = 'draft' | 'tenant' | 'review' | 'signing' | 'signed'
export type InspectionType = 'movein' | 'moveout'

/** 逐項的爭議狀態；agreed 為預設（房東接受租客判定） */
export type DisputeState = 'agreed' | 'disputed' | 'resolved'

/** asset＝物品，退租可據以計賠；condition＝屋況，僅存證不進賠償公式 */
export type EntryKind = 'asset' | 'condition'

export interface InspectionPhoto {
  id: string
  /** 1600px/JPEG85，畫面與 PDF 用 */
  thumbUrl: string
  /** 2560px/JPEG92，備查用；退租結清滿 RETENTION_YEARS 年後由排程刪除 */
  origUrl?: string
  /** 尚未（完全）上傳完畢；現場沒網路時照片先落在裝置的待傳佇列 */
  pending?: boolean
  at?: any
}

/** 退租點交時帶入的入住基準，供逐項對照；入住點交本身沒有這個欄位 */
export interface InspectionBaseline {
  condition: Condition
  note?: string
  photos: InspectionPhoto[]
}

export interface InspectionEntry {
  key: string
  kind: EntryKind
  name: string
  quantity: number
  /** condition 類恆為 0，不進賠償計算 */
  unitPrice: number
  /** 租客判定 */
  tenantCondition?: Condition
  /** 房東主張，僅 dispute !== 'agreed' 時有值 */
  landlordCondition?: Condition
  /** 協調後共識，僅 dispute === 'resolved' 時有值 */
  finalCondition?: Condition
  dispute: DisputeState
  /** 租客勾選的瑕疵原因（快捷選項） */
  reasons?: string[]
  /** 租客自行補充的說明（選「其他」時） */
  note?: string
  /** 房東標歧異／註記共識時的說明 */
  landlordNote?: string
  photos: InspectionPhoto[]
  /** 入住當時的狀況與照片（僅退租點交） */
  baseline?: InspectionBaseline
}

export interface InspectionSignature {
  image: string
  at?: any
}

export interface Inspection {
  id: string
  landlordId: string
  tenantDocId: string
  /** 租客的 Auth uid；點交當下可能還沒建帳號，故可空 */
  tenantId?: string
  tenantName?: string
  roomId?: string
  roomName?: string
  type: InspectionType
  status: InspectionStatus
  items: InspectionEntry[]
  signatures?: { tenant?: InspectionSignature; landlord?: InspectionSignature }
  /** 原檔可刪除的時間點（毫秒）；退租結清後才寫入 */
  photoCleanupAt?: number | null
  createdAt?: any
  updatedAt?: any
  completedAt?: any
}

/** 入住點交的用語與退租不同：退租講「毀損」，入住講「既有瑕疵」 */
export const CONDITION_LABELS: Record<Condition, string> = {
  normal: '正常',
  minor: '輕微瑕疵',
  total: '嚴重瑕疵',
}

/** 租客逐項確認時每頁顯示幾項；一頁塞太多會讓人整頁亂點 */
export const TENANT_PAGE_SIZE = 3

/** 原檔保留年限，自退租結清起算 */
export const RETENTION_YEARS = 2

/** 首次點交某房間時的屋況檢查項預設（房東可在設定增刪） */
export const DEFAULT_CONDITION_CATALOG: string[] = [
  // 牆面與天花板改列可賠償物品（見 inventory.ts）：髒汙／發霉／殘膠／打洞須油漆修補
  '地板',
  '門窗與鎖具',
  '衛浴設備',
  '給排水',
  '電源開關與插座',
  '照明',
  '電錶與瓦斯錶讀數',
]

/**
 * 瑕疵原因快捷選項。
 *
 * 現場請人打字最容易得到空白或「有問題」三個字，給按鈕才問得出可用的描述；
 * 保留「其他」讓真的講不清楚的情況有出口。
 */
export const DEFECT_REASONS: string[] = [
  '髒汙', '發霉', '殘膠', '打洞', '刮痕', '凹損', '掉漆', '鬆動', '缺件', '功能異常',
]

export const OTHER_REASON = '其他'

/** 顯示與列印用的完整說明：快捷原因在前，自由文字在後 */
export const composeNote = (e: Pick<InspectionEntry, 'reasons' | 'note'>): string =>
  [...(e.reasons || []), (e.note || '').trim()].filter(Boolean).join('、')

// ── 建構 ────────────────────────────────────────────────────

export const makeEntry = (key: string, patch: Partial<InspectionEntry> = {}): InspectionEntry => ({
  key,
  kind: 'asset',
  name: '',
  quantity: 1,
  unitPrice: 0,
  dispute: 'agreed',
  photos: [],
  ...patch,
})

/**
 * 由主檔建立初始清單：物品帶單價，屋況一律 quantity 1 / unitPrice 0。
 * keyFor 由呼叫端提供（實務上是 uuid），保持本函式可測。
 */
export const entriesFromCatalog = (
  assets: CatalogItem[],
  conditions: string[],
  keyFor: (index: number) => string,
): InspectionEntry[] => {
  let i = 0
  const out: InspectionEntry[] = []
  for (const a of assets) {
    out.push(makeEntry(keyFor(i++), {
      kind: 'asset', name: a.name, quantity: 1, unitPrice: Number(a.unitPrice) || 0,
    }))
  }
  for (const name of conditions) {
    out.push(makeEntry(keyFor(i++), { kind: 'condition', name, quantity: 1, unitPrice: 0 }))
  }
  return out
}

/**
 * 沿用同一間房上次的點交：只留下品項骨架，狀況／照片／歧異全部清空。
 * 帶著上次的判定會誘導這次的租客照抄，反而失去點交的意義。
 */
export const seedEntriesFrom = (
  prev: InspectionEntry[],
  keyFor: (index: number) => string,
): InspectionEntry[] =>
  prev.map((e, i) => makeEntry(keyFor(i), {
    kind: e.kind,
    name: e.name,
    quantity: Number(e.quantity) || 1,
    unitPrice: Number(e.unitPrice) || 0,
  }))

/**
 * 由已簽署的入住點交建立退租點交的品項。
 *
 * 與 seedEntriesFrom 的差別在於**保留入住基準**：退租要比對的不是「現在壞不壞」，
 * 而是「跟入住時比有沒有變差」。入住當時的狀況與照片一併帶著，租客與房東
 * 在現場就看得到對照，不必回頭翻舊文件。
 */
export const seedEntriesForMoveOut = (
  moveInItems: InspectionEntry[],
  keyFor: (index: number) => string,
): InspectionEntry[] =>
  moveInItems.map((e, i) => makeEntry(keyFor(i), {
    kind: e.kind,
    name: e.name,
    quantity: Number(e.quantity) || 1,
    unitPrice: Number(e.unitPrice) || 0,
    baseline: {
      condition: effectiveCondition(e),
      note: composeNote(e),
      photos: (e.photos || []).filter(p => p.thumbUrl),
    },
  }))

/** 承接舊的 tenants.moveInInspection.items；present 為 false 者當初就不在房間裡 */
export const entriesFromLegacy = (
  items: InspectionItem[],
  keyFor: (index: number) => string,
): InspectionEntry[] =>
  items
    .filter(it => it.present !== false && (it.name || '').trim())
    .map((it, i) => makeEntry(keyFor(i), {
      kind: 'asset',
      name: it.name.trim(),
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
    }))

// ── 判定與閘門 ──────────────────────────────────────────────

/** 嚴重瑕疵沒有照片等於沒講；輕微只提示不強制 */
export const photoRequired = (e: InspectionEntry): boolean => e.tenantCondition === 'total'

/** 租客該項是否已完成（有判定，且該拍的拍了） */
export const entryReady = (e: InspectionEntry): boolean => {
  if (!e.tenantCondition) return false
  return !photoRequired(e) || e.photos.length > 0
}

export const tenantProgress = (items: InspectionEntry[]) => ({
  done: items.filter(entryReady).length,
  total: items.length,
})

/** 切成每頁 size 項；size < 1 視為 1，避免無窮迴圈 */
export const paginate = (items: InspectionEntry[], size = TENANT_PAGE_SIZE): InspectionEntry[][] => {
  const n = Math.max(1, Math.floor(size))
  const pages: InspectionEntry[][] = []
  for (let i = 0; i < items.length; i += n) pages.push(items.slice(i, i + n))
  return pages
}

/** 遞給租客前：至少一項，且每項都要有名稱 */
export const canHandToTenant = (items: InspectionEntry[]): boolean =>
  items.length > 0 && items.every(e => (e.name || '').trim().length > 0)

/** 交還房東前：每項都要有判定，嚴重瑕疵要有照片 */
export const canReturnToLandlord = (items: InspectionEntry[]): boolean =>
  items.length > 0 && items.every(entryReady)

/** 尚未協調出共識的歧異數；> 0 就進不了簽名 */
export const unresolvedCount = (items: InspectionEntry[]): number =>
  items.filter(e => e.dispute === 'disputed').length

export const canSign = (insp: Pick<Inspection, 'status' | 'items'>): boolean =>
  insp.status === 'review' && insp.items.length > 0 && unresolvedCount(insp.items) === 0

/** 這一項最終算什麼狀況：有共識用共識，否則用租客判定 */
export const effectiveCondition = (e: InspectionEntry): Condition =>
  e.finalCondition ?? e.tenantCondition ?? 'normal'

/** 曾經有過歧異的項目（含已達成共識），PDF 與簽名頁要置頂標示 */
export const contestedItems = (items: InspectionEntry[]): InspectionEntry[] =>
  items.filter(e => e.dispute !== 'agreed')

// ── 歧異流轉 ────────────────────────────────────────────────

export const markDispute = (
  e: InspectionEntry, landlordCondition: Condition, landlordNote = '',
): InspectionEntry => ({
  ...e,
  dispute: 'disputed',
  landlordCondition,
  landlordNote,
  finalCondition: undefined,
})

export const resolveDispute = (
  e: InspectionEntry, finalCondition: Condition, landlordNote = '',
): InspectionEntry => ({
  ...e,
  dispute: 'resolved',
  finalCondition,
  landlordNote: landlordNote || e.landlordNote || '',
})

/** 房東反悔，收回歧異標記，回到接受租客判定 */
export const clearDispute = (e: InspectionEntry): InspectionEntry => ({
  ...e,
  dispute: 'agreed',
  landlordCondition: undefined,
  finalCondition: undefined,
  landlordNote: '',
})

/** 狀況的嚴重度排序，用於判斷有沒有變差 */
const SEVERITY: Record<Condition, number> = { normal: 0, minor: 1, total: 2 }

/**
 * 建議賠償比例：只賠「惡化的部分」。
 *
 * 入住就已經是輕微瑕疵、退租仍是輕微，租客沒有讓它變差，不該賠；
 * 入住輕微、退租全損，賠的是 100% 減去入住當時就存在的 30%。
 * 房東仍可逐項覆寫——這是建議值，不是判決。
 */
export const suggestedRatio = (
  baseline: Condition | undefined, moveOut: Condition,
): number => {
  const from = SEVERITY[baseline ?? 'normal']
  const to = SEVERITY[moveOut]
  if (to <= from) return 0
  const ratio = DAMAGE_RATIO[moveOut] - DAMAGE_RATIO[baseline ?? 'normal']
  return Math.max(0, Math.round(ratio * 100) / 100)
}

// ── 對外輸出 ────────────────────────────────────────────────

/**
 * 回寫 tenants.moveInInspection 的摘要。
 *
 * 只取 asset：MoveOutWizard 依 unitPrice 逐項計賠，把單價 0 的屋況項餵給它
 * 只會在退租資產表上多出一堆賠 0 元的雜訊。屋況證據留在 inspections 本體。
 */
export const toSummaryItems = (items: InspectionEntry[]): InspectionItem[] =>
  items
    .filter(e => e.kind === 'asset')
    .map(e => ({
      name: e.name,
      quantity: Number(e.quantity) || 1,
      unitPrice: Number(e.unitPrice) || 0,
      present: true,
      condition: effectiveCondition(e),
      note: e.note || '',
    }))

/** 退租結清時間 → 原檔可刪除的時間點 */
export const cleanupAtFrom = (settledAtMs: number): number => {
  const d = new Date(settledAtMs)
  d.setFullYear(d.getFullYear() + RETENTION_YEARS)
  return d.getTime()
}
