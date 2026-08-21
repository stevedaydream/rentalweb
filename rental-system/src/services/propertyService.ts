import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, getDocs, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import type { Property, Room } from '../types/index'
import { getMeterGroups } from './meterGroupService'
import { buildSubGroupIndex } from '../utils/meter/groups'

export type PropertyPayload = Omit<Property, 'id' | 'landlordId' | 'createdAt'>

export const getProperties = async (landlordId: string): Promise<Property[]> => {
  const snap = await getDocs(
    query(collection(db, 'properties'), where('landlordId', '==', landlordId)),
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Property))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-TW'))
}

export const addProperty = (landlordId: string, payload: PropertyPayload) =>
  addDoc(collection(db, 'properties'), {
    ...payload,
    landlordId,
    createdAt: serverTimestamp(),
  })

export const updateProperty = (id: string, payload: Partial<PropertyPayload>) =>
  updateDoc(doc(db, 'properties', id), payload)

export const deleteProperty = (id: string) => deleteDoc(doc(db, 'properties', id))

/** 把房間指派給建物；傳 null 代表解除指派 */
export const assignRoomProperty = (roomId: string, propertyId: string | null) =>
  updateDoc(doc(db, 'rooms', roomId), { propertyId: propertyId ?? '' })

export interface RoomAssignment {
  roomId: string
  propertyId: string
}

export interface AssignmentPlan {
  assignments: RoomAssignment[]
  /** 無法自動歸屬的房間名稱 */
  unassigned: string[]
}

/**
 * 決定每間房該歸哪一棟：subGroupId → groupId → propertyId。
 *
 * 已有 propertyId 的房間一律略過——房東手動指派過的結果優先於自動推導，
 * 且這讓整個遷移可以重複執行。任一環節斷掉（沒綁子群組、子群組所屬總表
 * 已刪、該總表尚未種子出建物）就列為待手動指派，不臆測。
 */
export const planRoomAssignments = (
  rooms: Pick<Room, 'id' | 'name' | 'subGroupId' | 'propertyId'>[],
  subGroupToGroup: Map<string, string>,
  groupToProperty: Map<string, string>,
): AssignmentPlan => {
  const assignments: RoomAssignment[] = []
  const unassigned: string[] = []

  for (const room of rooms) {
    if (room.propertyId) continue
    const groupId = room.subGroupId ? subGroupToGroup.get(room.subGroupId) : undefined
    const propertyId = groupId ? groupToProperty.get(groupId) : undefined
    if (!propertyId) {
      unassigned.push(room.name)
      continue
    }
    assignments.push({ roomId: room.id, propertyId })
  }

  return { assignments, unassigned }
}

export interface SeedResult {
  /** 本次新建立的建物 */
  createdProperties: number
  /** 本次自動回填 propertyId 的房間 */
  assignedRooms: number
  /** 仍無法自動歸屬、需手動指派的房間 */
  unassignedRooms: string[]
}

/**
 * 從 meter_groups 種子出建物，並回填 rooms.propertyId。
 *
 * 系統原本沒有建物實體，但 meter_groups 早已是一棟一筆（其註解寫明
 * 「一個房東可有多顆總表（多棟物件）」），名稱也多是地址，因此拿它當
 * 種子最省事。rooms 只存 subGroupId，靠 subGroupId → groupId → property
 * 回填。
 *
 * 冪等：已種子過的總表以 seededFromGroupId 認得，不會重複建立；已有
 * propertyId 的房間不會被覆寫（房東手動改過的指派優先於自動推導）。
 *
 * seededFromGroupId 僅為此處的冪等標記——建物與台電總表語意上互相獨立，
 * 日後一棟兩電號或公共電表跨棟時，兩者本來就會對不起來。
 */
export const seedPropertiesFromMeterGroups = async (
  landlordId: string,
): Promise<SeedResult> => {
  const [groups, existing, roomsSnap] = await Promise.all([
    getMeterGroups(landlordId),
    getProperties(landlordId),
    getDocs(query(collection(db, 'rooms'), where('landlordId', '==', landlordId))),
  ])

  const rooms = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Room))

  // groupId → propertyId，先放已種子過的
  const groupToProperty = new Map<string, string>()
  existing.forEach(p => {
    if (p.seededFromGroupId) groupToProperty.set(p.seededFromGroupId, p.id)
  })

  let createdProperties = 0
  for (const g of groups) {
    if (groupToProperty.has(g.id)) continue
    const ref = await addProperty(landlordId, {
      name: g.name || '未命名建物',
      seededFromGroupId: g.id,
    })
    groupToProperty.set(g.id, ref.id)
    createdProperties++
  }

  // 房間回填：subGroupId → groupId → propertyId
  const plan = planRoomAssignments(rooms, buildSubGroupIndex(groups), groupToProperty)

  if (plan.assignments.length > 0) {
    const batch = writeBatch(db)
    plan.assignments.forEach(a => batch.update(doc(db, 'rooms', a.roomId), { propertyId: a.propertyId }))
    await batch.commit()
  }

  return {
    createdProperties,
    assignedRooms: plan.assignments.length,
    unassignedRooms: plan.unassigned,
  }
}
