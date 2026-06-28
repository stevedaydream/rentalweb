// 點交（入住 / 退租）共用：物品主檔預設、毀損等級、賠償比例與計算。
// 由 Settings 物品主檔、MoveInInspectionModal、MoveOutWizard 三處共用，避免規則散落。

export interface CatalogItem {
  name: string
  unitPrice: number
}

// 退租毀損等級
export type Condition = 'normal' | 'minor' | 'total'

export const CONDITION_LABELS: Record<Condition, string> = {
  normal: '正常',
  minor: '輕微毀損',
  total: '完全毀損',
}

// 各等級賠償比例（佔該品項單價）；輕微 30%、完全 100%（房東可逐項覆寫）
export const DAMAGE_RATIO: Record<Condition, number> = {
  normal: 0,
  minor: 0.3,
  total: 1,
}

// 入住點交逐項紀錄（存於 tenants doc 的 moveInInspection.items）
export interface InspectionItem {
  name: string
  quantity: number
  unitPrice: number
  present: boolean        // 房間是否有此物品
  condition: Condition    // 入住當下狀況（預設正常，可記既有瑕疵）
  note?: string
}

// 首次使用的預設品項（房東可在 Settings 增刪改價）
export const DEFAULT_CATALOG: CatalogItem[] = [
  { name: '冷氣', unitPrice: 8000 },
  { name: '冰箱', unitPrice: 6000 },
  { name: '洗衣機', unitPrice: 5000 },
  { name: '熱水器', unitPrice: 4000 },
  { name: '電視', unitPrice: 5000 },
  { name: '床架', unitPrice: 3000 },
  { name: '床墊', unitPrice: 3000 },
  { name: '衣櫃', unitPrice: 3000 },
  { name: '書桌', unitPrice: 2000 },
  { name: '椅子', unitPrice: 800 },
  { name: '窗簾', unitPrice: 1500 },
  { name: '抽油煙機', unitPrice: 2500 },
  { name: '瓦斯爐', unitPrice: 2000 },
  { name: '鞋櫃', unitPrice: 1500 },
]

// 賠償金額 = 單價 × 數量 × 比例（四捨五入到元）
export const calcCompensation = (unitPrice: number, quantity: number, ratio: number): number =>
  Math.round((Number(unitPrice) || 0) * (Number(quantity) || 0) * (Number(ratio) || 0))

// 依毀損等級取預設比例
export const defaultRatioFor = (condition: Condition): number => DAMAGE_RATIO[condition] ?? 0
