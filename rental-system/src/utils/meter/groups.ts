/**
 * 電表歸屬與群組解析（純函式）。
 *
 * 由 MeterReading.vue 的 loadData 與相關 computed 抽出，行為完全一致。
 * rooms 只存 subGroupId、不存 groupId，故一律以 subGroupId 反查所屬總表。
 */
import {
  UNGROUPED_ID,
  defaultSettings,
  normalizeSettings,
  type MeterEntry,
  type MeterGroup,
  type MeterGroupDoc,
  type Settings,
} from '../../components/meter/types'

/**
 * 建立 subGroupId → groupId 反查表。
 * 若有重複的群組文件共用同一組子群組 id，以先出現者為準，避免歸屬跳動。
 */
export const buildSubGroupIndex = (groupDocs: MeterGroupDoc[]) => {
  const map = new Map<string, string>()
  groupDocs.forEach(g => (g.subGroups ?? []).forEach(sg => {
    if (!map.has(sg.id)) map.set(sg.id, g.id)
  }))
  return map
}

/**
 * 判定一顆電表所屬的總表。
 * @param explicitGroupId 公共電表自身帶的 groupId，存在且有效時優先採用
 */
export const resolveGroupId = (
  groupDocs: MeterGroupDoc[],
  index: Map<string, string>,
  subGroupId?: string,
  explicitGroupId?: string,
) => {
  if (explicitGroupId && groupDocs.some(g => g.id === explicitGroupId)) return explicitGroupId
  return (subGroupId && index.get(subGroupId)) || UNGROUPED_ID
}

/**
 * 依電表歸屬組出各總表的計算參數。
 * roomCount 即級距分母 = 該組內電表總數（房間 + 公共表，含空房）；
 * 未歸屬任何群組的電表自成一組，不會撐大其他棟的分母。
 * 尚未建立任何群組時，全部電表視為同一顆總表（維持舊行為）。
 */
export const buildMeterGroups = (groupDocs: MeterGroupDoc[], entries: MeterEntry[]): MeterGroup[] => {
  const countIn = (groupId: string) => entries.filter(m => m.groupId === groupId).length

  const built: MeterGroup[] = groupDocs.map(g => ({
    id: g.id,
    name: g.name || '未命名總表',
    officialMetersCount: g.officialMetersCount ?? 1,
    roomCount: Math.max(1, countIn(g.id)),
    masterLastReading: 0,
    masterCurrentReading: undefined,
    masterBillAmount: undefined,
  }))

  const ungroupedCount = countIn(UNGROUPED_ID)
  if (ungroupedCount > 0 || built.length === 0) {
    built.push({
      id: UNGROUPED_ID,
      name: built.length === 0 ? '本棟總表' : '未分組',
      officialMetersCount: 1,
      roomCount: Math.max(1, ungroupedCount),
      masterLastReading: 0,
      masterCurrentReading: undefined,
      masterBillAmount: undefined,
    })
  }
  return built
}

/** 台電帳單中帳單分攤制需要的欄位 */
export interface MasterBill {
  usage: number
  amount: number
  groupId?: string
}

/**
 * 把該月的台電帳單套進各總表，供帳單分攤制推算平均單價。
 *
 * 舊資料沒有 groupId：只有單一總表時可安全視為該表的帳單；
 * 多顆總表時不臆測歸屬，寧可留空讓使用者重新輸入，也不要把甲棟的
 * 帳單金額套到乙棟去分攤。
 */
export const applyMasterBills = (groups: MeterGroup[], bills: MasterBill[]): MeterGroup[] =>
  groups.map(g => {
    const bill = bills.find(b => b.groupId === g.id)
      ?? (groups.length === 1 ? bills.find(b => !b.groupId) : undefined)
    if (!bill) return g
    return {
      ...g,
      masterLastReading: 0,
      masterCurrentReading: bill.usage,
      masterBillAmount: bill.amount,
    }
  })

/** 群組層設定（已補齊新欄位）；未設專屬方案的群組不會出現在 map 中 */
export const buildGroupSettingsMap = (groupDocs: MeterGroupDoc[]) => {
  const map = new Map<string, Settings>()
  groupDocs.forEach(g => {
    if (g.electricitySettings) map.set(g.id, normalizeSettings(g.electricitySettings, defaultSettings))
  })
  return map
}

/** 設定優先序：房間個別 > 所屬總表 > 全域 */
export const resolveRoomSettings = (
  room: MeterEntry,
  groupSettings: Map<string, Settings>,
  global: Settings,
): Settings =>
  room.electricitySettings
  ?? (room.groupId ? groupSettings.get(room.groupId) : undefined)
  ?? global

/** 取得此電表所屬的總表；找不到時退回第一組，避免計算中斷 */
export const resolveRoomGroup = (room: MeterEntry, groups: MeterGroup[]): MeterGroup | undefined =>
  groups.find(g => g.id === room.groupId) ?? groups[0]
