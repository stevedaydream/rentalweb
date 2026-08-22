import { db } from '../firebase/config'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, getDocs, serverTimestamp,
} from 'firebase/firestore'
import type { PropertyCost } from '../types/index'
import { buildCostBills } from '../utils/financials/propertyCosts'

export type PropertyCostPayload = Omit<
  PropertyCost, 'id' | 'landlordId' | 'createdAt' | 'paidAt' | 'billIds'
>

export const getPropertyCosts = async (landlordId: string): Promise<PropertyCost[]> => {
  const snap = await getDocs(
    query(collection(db, 'property_costs'), where('landlordId', '==', landlordId)),
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as PropertyCost))
    // 新的在前：先看繳納期限，同期限再看種類，讓同一年度的稅單排在一起
    .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || '') || a.type.localeCompare(b.type))
}

export const addPropertyCost = (landlordId: string, payload: PropertyCostPayload) =>
  addDoc(collection(db, 'property_costs'), {
    ...payload,
    landlordId,
    createdAt: serverTimestamp(),
  })

export const updatePropertyCost = (id: string, payload: Partial<PropertyCostPayload>) =>
  updateDoc(doc(db, 'property_costs', id), payload)

/** 刪除費用，一併回收已落帳的 bills，避免帳務頁留下對不到主檔的支出 */
export const deletePropertyCost = async (cost: PropertyCost) => {
  await removeCostBills(cost.billIds)
  await deleteDoc(doc(db, 'property_costs', cost.id))
}

const removeCostBills = async (billIds?: string[]) => {
  if (!billIds?.length) return
  await Promise.all(
    billIds.map(id =>
      deleteDoc(doc(db, 'bills', id)).catch(e => {
        // 已被使用者從帳務頁手動刪掉的視為完成，不阻斷整個流程
        console.warn('remove cost bill failed:', id, e)
      }),
    ),
  )
}

/**
 * 標記已繳：依 allocations 一棟一筆落到 bills，並把產生的 id 記回主檔。
 *
 * 落帳只發生在這一刻——帳務頁的「本月支出」不看狀態、月內全算，未繳的
 * 稅單若先落帳會讓當月支出提前虛增，故 bills 只承載真正的現金流。
 */
export const markCostPaid = async (
  cost: PropertyCost,
  paidAt: string,
  propertyNames: Map<string, string>,
): Promise<string[]> => {
  // 重複標記時先清掉舊帳，避免同一筆費用落兩次
  await removeCostBills(cost.billIds)

  const drafts = buildCostBills(cost, paidAt, propertyNames)
  const refs = await Promise.all(
    drafts.map(d =>
      addDoc(collection(db, 'bills'), {
        ...d,
        landlordId: cost.landlordId,
        status: 'completed',
        paidAt,
        history: [],
        createdAt: serverTimestamp(),
      }),
    ),
  )
  const billIds = refs.map(r => r.id)
  await updateDoc(doc(db, 'property_costs', cost.id), { paidAt, billIds })
  return billIds
}

/** 取消已繳：回收落帳的 bills 並清除繳納紀錄 */
export const unmarkCostPaid = async (cost: PropertyCost) => {
  await removeCostBills(cost.billIds)
  await updateDoc(doc(db, 'property_costs', cost.id), { paidAt: '', billIds: [] })
}
