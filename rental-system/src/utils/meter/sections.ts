/**
 * 抄表頁的分區與統計彙總（純函式）。
 *
 * 由 MeterReading.vue 的 sections / 各統計 computed 抽出，行為完全一致。
 * 依賴 calc 與 groups 兩層，但計算結果一律由呼叫端以 costOf 注入，
 * 避免本層再去解析設定與群組。
 */
import type { MeterEntry, MeterGroupDoc, SubGroup } from '../../components/meter/types'
import { calculateUsage } from './calc'

export interface DisplaySection {
  id: string
  name: string
  entries: MeterEntry[]
  totalUsage: number
  totalCost: number
  /** 公共電費 ÷ 子群組房數（不含房東負擔的表） */
  publicShare: number
}

/** 取得單一電表電費的函式，由呼叫端注入 */
export type CostOf = (room: MeterEntry) => number

export const isPublic = (r: MeterEntry) => r.meterType === 'public'
export const isOccupied = (r: MeterEntry) => !isPublic(r) && (!!r.tenantName || r.status === 'occupied')
export const isVacant = (r: MeterEntry) => !isPublic(r) && !r.tenantName && r.status !== 'occupied'
/** 會出帳的電表 = 在租房間 + 公共表（空房不計費） */
export const isBillable = (r: MeterEntry) => isPublic(r) || !!r.tenantName || r.status === 'occupied'

/**
 * 依子群組分區塊：房間在前、公共表在後；未落入任何子群組者歸入最後一區。
 * @param entries 已限縮至單一總表的電表清單
 * @param subGroups 該總表的子群組
 */
export const buildSections = (
  entries: MeterEntry[],
  subGroups: SubGroup[],
  costOf: CostOf,
): DisplaySection[] => {
  const result: DisplaySection[] = []
  const usedIds = new Set<string>()
  const occupied = entries.filter(isOccupied)
  const pubs = entries.filter(isPublic)

  const buildSection = (id: string, name: string, rooms: MeterEntry[], sectionPubs: MeterEntry[], allRoomCount: number): DisplaySection => {
    const sectionEntries = [...rooms, ...sectionPubs]
    sectionEntries.forEach(e => usedIds.add(e.roomId))
    const totalUsage = sectionEntries.reduce((sum, r) => sum + (r.currentReading ? calculateUsage(r) : 0), 0)
    const totalCost = sectionEntries.reduce((sum, r) => sum + (r.currentReading ? costOf(r) : 0), 0)
    const publicCost = sectionPubs.filter(p => !p.landlordPays)
      .reduce((sum, p) => sum + (p.currentReading ? costOf(p) : 0), 0)
    const publicShare = allRoomCount > 0 ? Math.round(publicCost / allRoomCount) : 0
    return { id, name, entries: sectionEntries, totalUsage: Math.round(totalUsage), totalCost, publicShare }
  }

  // 重複的群組文件可能共用同一組子群組 id，故去重
  const seen = new Set<string>()
  for (const sg of subGroups) {
    if (seen.has(sg.id)) continue
    seen.add(sg.id)
    const rooms = occupied.filter(r => r.subGroupId === sg.id)
    const sectionPubs = pubs.filter(r => r.subGroupId === sg.id)
    // 分攤基數 = 子群組內全部房間數（含空房），空房份額房東吸收
    const allRoomCount = entries.filter(r => !isPublic(r) && r.subGroupId === sg.id).length
    if (rooms.length || sectionPubs.length) result.push(buildSection(sg.id, sg.name, rooms, sectionPubs, allRoomCount))
  }

  const restRooms = occupied.filter(r => !usedIds.has(r.roomId))
  const restPubs = pubs.filter(r => !usedIds.has(r.roomId))
  if (restRooms.length || restPubs.length) {
    const restRoomCount = entries.filter(r => !isPublic(r) && !usedIds.has(r.roomId)).length
    result.push(buildSection('rest', result.length > 0 ? '未指定樓層' : '', restRooms, restPubs, restRoomCount))
  }
  return result
}

/** 某顆總表的抄表進度（分母為會出帳的電表數） */
export const groupProgress = (entries: MeterEntry[], groupId: string) => {
  const list = entries.filter(r => r.groupId === groupId && isBillable(r))
  return { total: list.length, filled: list.filter(r => r.currentReading !== undefined).length }
}

/** 待儲存：未鎖定、已填數值、且不小於上期讀數 */
export const pendingSaveRooms = (entries: MeterEntry[]) =>
  entries.filter(r => !r.isLocked && r.currentReading !== undefined && r.currentReading >= r.lastReading)

/** 本期讀數不得小於上期；未填則視為有效 */
export const validateReading = (room: MeterEntry) =>
  !((room.currentReading || 0) < room.lastReading && room.currentReading !== undefined)

/** 取得目前總表的子群組（找不到回空陣列） */
export const subGroupsOf = (groupDocs: MeterGroupDoc[], groupId: string): SubGroup[] =>
  groupDocs.find(g => g.id === groupId)?.subGroups ?? []
