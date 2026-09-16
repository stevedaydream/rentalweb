/**
 * 房源欄位讀取（純函式）。
 *
 * `rooms` 文件的月租金欄位名為 **`price`**（`RoomManagement` 的表單即以此
 * 欄位建檔），沒有 `rent`。共用型別曾誤宣告為 `rent?`，導致簽約流程讀取
 * `r.rent` 取到 undefined、租金帶入 0。凡是要取房源月租金一律走此函式，
 * 不要直接讀欄位。
 */

export interface RentBearingRoom {
  /** 月租金（正式欄位） */
  price?: number
  /** 舊欄位，僅為相容既有資料保留 */
  rent?: number
}

/**
 * 房源的月租金；取不到時回傳 0，不回傳 NaN。
 *
 * 依序嘗試 price → rent，以「正的有限數」為有效。新增房源時 `price`
 * 預設為 0，代表尚未設定而非租金為零，故不能用 `??`（只擋 null/undefined）
 * 決定是否退回舊欄位。
 */
export const roomMonthlyRent = (room: RentBearingRoom | null | undefined): number => {
  if (!room) return 0
  for (const raw of [room.price, room.rent]) {
    const value = Number(raw)
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

/**
 * 舊版新增房源時，沒有照片會把這張 Unsplash 圖當封面存進資料庫。
 * 它看起來像真實房間，會誤導租客，一律視為「沒有照片」。
 */
export const LEGACY_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80'

export interface ImageBearingRoom {
  coverImage?: string
  images?: string[]
}

/** 房間的照片（排除舊版佔位圖） */
export const roomPhotos = (room: ImageBearingRoom | null | undefined): string[] =>
  (room?.images ?? []).filter(u => !!u && u !== LEGACY_PLACEHOLDER_IMAGE)

/** 房間封面；沒有真實照片時回傳空字串，由畫面顯示「尚無照片」 */
export const roomCoverImage = (room: ImageBearingRoom | null | undefined): string => {
  const cover = room?.coverImage
  if (cover && cover !== LEGACY_PLACEHOLDER_IMAGE) return cover
  return roomPhotos(room)[0] ?? ''
}
