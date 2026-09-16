/**
 * 批量建立房間的純函式：房號產生、樓層名稱、重複檢查。
 *
 * 系統多處以「房號文字」對應房間（租客 roomNumber、抄表、帳單 target、
 * 合約 roomNo、電費歸棟），同一房東底下房號必須唯一，否則會安靜地對錯房。
 */

export type RoomNamingScheme = 'number' | 'letter'

export interface FloorPlan {
  floor: number
  count: number
}

export interface NamingOptions {
  scheme: RoomNamingScheme
  prefix?: string
  suffix?: string
}

export interface GeneratedRoom {
  floor: number
  name: string
}

export type DuplicateKind = 'existing' | 'batch'

/** 樓層子群組的名稱（電表子群組以此比對，既有「4樓」也視為同一層） */
export const floorLabel = (floor: number) => (floor < 0 ? `B${-floor}F` : `${floor}F`)

const FLOOR_ALIASES = (floor: number) => {
  if (floor < 0) return [`B${-floor}F`, `B${-floor}`, `地下${-floor}樓`]
  return [`${floor}F`, `${floor}樓`, `${floor}`]
}

/** 子群組名稱是否代表這一層（容許「4F」「4樓」「4」等寫法、忽略大小寫與空白） */
export const matchesFloor = (subGroupName: string, floor: number) => {
  const n = subGroupName.replace(/\s/g, '').toUpperCase()
  return FLOOR_ALIASES(floor).some(a => a.toUpperCase() === n)
}

const letter = (i: number) => {
  // 1 → A、26 → Z、27 → AA
  let s = ''
  let n = i
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const floorToken = (floor: number) => (floor < 0 ? `B${-floor}` : String(floor))

/** 依樓層與每層間數產生房號：number → 401、402；letter → 4A、4B */
export const generateRoomNames = (plans: FloorPlan[], opts: NamingOptions): GeneratedRoom[] => {
  const prefix = opts.prefix?.trim() ?? ''
  const suffix = opts.suffix?.trim() ?? ''
  const out: GeneratedRoom[] = []
  for (const { floor, count } of plans) {
    const n = Math.max(0, Math.floor(count))
    for (let i = 1; i <= n; i++) {
      const seq = opts.scheme === 'letter' ? letter(i) : String(i).padStart(2, '0')
      out.push({ floor, name: `${prefix}${floorToken(floor)}${seq}${suffix}` })
    }
  }
  return out
}

/** 起訖樓層展開成樓層清單（含兩端；可顛倒輸入；0 樓略過） */
export const floorRange = (from: number, to: number): number[] => {
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  const floors: number[] = []
  for (let f = lo; f <= hi; f++) if (f !== 0) floors.push(f)
  return floors
}

/** 房號比對鍵：去空白、全形轉半形、不分大小寫 */
export const roomNameKey = (name: string) =>
  name
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s/g, '')
    .toUpperCase()

/**
 * 標出每一列的重複狀況：與既有房間同名為 existing；批次內重複時，第一筆保留、之後為 batch。
 * 回傳與 names 等長的陣列，不重複者為 null。
 */
export const findDuplicates = (names: string[], existingNames: string[]): (DuplicateKind | null)[] => {
  const existing = new Set(existingNames.map(roomNameKey))
  const seen = new Set<string>()
  return names.map(name => {
    const key = roomNameKey(name)
    if (!key) return null
    if (existing.has(key)) return 'existing'
    if (seen.has(key)) return 'batch'
    seen.add(key)
    return null
  })
}

/** 單間存檔用：房號是否與其他房間重複（編輯時排除自己） */
export const isDuplicateRoomName = (
  name: string,
  rooms: { id: string; name: string }[],
  selfId?: string,
) => {
  const key = roomNameKey(name)
  return !!key && rooms.some(r => r.id !== selfId && roomNameKey(r.name || '') === key)
}
