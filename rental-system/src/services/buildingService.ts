/**
 * 以建物為主的房源建立流程。
 *
 * 建物（properties）與台電總表（meter_groups）資料上仍各自獨立（一棟可能兩個電號），
 * 但操作上以建物為主：建物預設對應一顆同名總表（properties.meterGroupId），
 * 樓層即該總表的子群組，房間選「建物＋樓層」電表歸屬就跟著帶好。
 */
import { db } from '../firebase/config'
import {
  collection, doc, getDocs, query, where, serverTimestamp, writeBatch, getDoc, updateDoc,
} from 'firebase/firestore'
import type { Property } from '../types/index'
import type { MeterGroupDoc, SubGroup } from '../components/meter/types'
import { addProperty, updateProperty } from './propertyService'
import { addMeterGroup } from './meterGroupService'
import { floorLabel, matchesFloor, findDuplicates, roomNameKey } from '../utils/roomBatch'

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const readGroup = async (id: string): Promise<MeterGroupDoc | null> => {
  const snap = await getDoc(doc(db, 'meter_groups', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as MeterGroupDoc) : null
}

/** 新增建物並同時建立同名電表總表 */
export const createPropertyWithMeterGroup = async (
  landlordId: string, input: { name: string; address?: string },
): Promise<Property> => {
  const name = input.name.trim()
  const address = input.address?.trim() || ''
  const groupRef = await addMeterGroup(landlordId, { name, subGroups: [] })
  const ref = await addProperty(landlordId, { name, address, meterGroupId: groupRef.id })
  return { id: ref.id, landlordId, name, address, meterGroupId: groupRef.id }
}

/**
 * 取得建物對應的總表；沒有就建立一顆同名總表並記回建物。
 * 舊建物沿用種子來源 seededFromGroupId（若該總表仍存在）。
 */
export const ensurePropertyMeterGroup = async (landlordId: string, property: Property): Promise<MeterGroupDoc> => {
  for (const id of [property.meterGroupId, property.seededFromGroupId]) {
    if (!id) continue
    const g = await readGroup(id)
    if (g && g.landlordId === landlordId) {
      if (property.meterGroupId !== g.id) {
        await updateProperty(property.id, { meterGroupId: g.id })
        property.meterGroupId = g.id
      }
      return g
    }
  }
  const ref = await addMeterGroup(landlordId, { name: property.name, subGroups: [] })
  await updateProperty(property.id, { meterGroupId: ref.id })
  property.meterGroupId = ref.id
  return { id: ref.id, landlordId, name: property.name, subGroups: [] }
}

/**
 * 確保總表底下有這些樓層的子群組（名稱比對容許「4F」「4樓」），回傳 樓層 → 子群組 id。
 * 缺的一次寫回；子群組 id 沿用電表設定頁的產生方式。
 */
export const ensureFloorSubGroups = async (group: MeterGroupDoc, floors: number[]): Promise<Map<number, string>> => {
  const subGroups: SubGroup[] = [...(group.subGroups ?? [])]
  const result = new Map<number, string>()
  let changed = false
  for (const floor of [...new Set(floors)]) {
    const hit = subGroups.find(sg => matchesFloor(sg.name || '', floor))
    if (hit) { result.set(floor, hit.id); continue }
    const sg = { id: genId('sg'), name: floorLabel(floor) }
    subGroups.push(sg)
    result.set(floor, sg.id)
    changed = true
  }
  if (changed) {
    await updateDoc(doc(db, 'meter_groups', group.id), { subGroups })
    group.subGroups = subGroups
  }
  return result
}

/** 單間表單「＋新增樓層」：以自由文字名稱新增子群組（同名則沿用） */
export const ensureNamedSubGroup = async (group: MeterGroupDoc, name: string): Promise<string> => {
  const trimmed = name.trim()
  const subGroups: SubGroup[] = [...(group.subGroups ?? [])]
  const hit = subGroups.find(sg => (sg.name || '').replace(/\s/g, '').toUpperCase() === trimmed.replace(/\s/g, '').toUpperCase())
  if (hit) return hit.id
  const sg = { id: genId('sg'), name: trimmed }
  subGroups.push(sg)
  await updateDoc(doc(db, 'meter_groups', group.id), { subGroups })
  group.subGroups = subGroups
  return sg.id
}

export interface BatchRoomRow {
  floor: number
  name: string
  price: number
  size: number
  layout: string
}

export interface BatchCreateResult {
  created: number
  /** 寫入前重新比對時才發現與既有房間同名而略過的房號 */
  skipped: string[]
}

/**
 * 批量建立房間：先確保總表與樓層子群組，再以 batch 寫入。
 * 寫入前重新讀取房東全部房號再比對一次，避免預覽後別的分頁剛好建了同名房間。
 */
export const batchCreateRooms = async (
  landlordId: string,
  property: Property,
  rows: BatchRoomRow[],
  landlord: { name?: string; phone?: string },
): Promise<BatchCreateResult> => {
  const snap = await getDocs(query(collection(db, 'rooms'), where('landlordId', '==', landlordId)))
  const existingNames = snap.docs.map(d => String(d.data().name || ''))
  const dup = findDuplicates(rows.map(r => r.name), existingNames)
  const valid = rows.filter((r, i) => !dup[i] && roomNameKey(r.name))
  const skipped = rows.filter((_, i) => dup[i]).map(r => r.name)
  if (!valid.length) return { created: 0, skipped }

  const group = await ensurePropertyMeterGroup(landlordId, property)
  const floorMap = await ensureFloorSubGroups(group, valid.map(r => r.floor))

  // Firestore 單一 batch 上限 500 筆
  for (let i = 0; i < valid.length; i += 400) {
    const batch = writeBatch(db)
    for (const r of valid.slice(i, i + 400)) {
      batch.set(doc(collection(db, 'rooms')), {
        name: r.name.trim(),
        price: Number(r.price) || 0,
        size: Number(r.size) || 0,
        layout: r.layout,
        type: '公寓',
        address: property.address || '',
        status: 'vacant',
        isPublic: false,
        images: [],
        coverImage: '',
        propertyId: property.id,
        subGroupId: floorMap.get(r.floor) || '',
        landlordId,
        landlordName: landlord.name || '',
        landlordPhone: landlord.phone || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    await batch.commit()
  }
  return { created: valid.length, skipped }
}
