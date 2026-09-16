/**
 * 台水帳單（water_bills）與其帳務落帳。
 *
 * 一張台水帳單同批寫入：water_bills 主檔、帳務「台水帳單」支出、各租客「水費」帳單，
 * 三者互存 id，刪除支出時才找得到主檔（比照台電帳單雙寫）。
 */
import { db } from '../firebase/config'
import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore'
import type { WaterPlan, WaterPlanRow, WaterBillScope } from '../utils/financials/waterBilling'

export const WATER_EXPENSE_CATEGORY = '台水帳單'
export const WATER_INCOME_CATEGORY = '水費'

export interface WaterBillDoc {
  id: string
  landlordId: string
  scopeKind: 'property' | 'room'
  propertyId: string
  roomId?: string
  targetName: string
  periodStart: string
  periodEnd: string
  amount: number
  mode: WaterPlan['mode']
  basis: WaterPlan['basis']
  shares: { tenantDocId: string; label: string; days: number; people: number; amount: number }[]
  remainder: number
  expenseBillId: string
  incomeBillIds: string[]
}

export const getWaterBills = async (landlordId: string): Promise<WaterBillDoc[]> => {
  const snap = await getDocs(query(collection(db, 'water_bills'), where('landlordId', '==', landlordId)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as WaterBillDoc))
}

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const saveWaterBill = async (landlordId: string, input: {
  scope: WaterBillScope
  plan: WaterPlan
  rows: WaterPlanRow[]
  periodStart: string
  periodEnd: string
  total: number
  /** 繳費日（支出日期，也是水費帳單的帳務日期） */
  date: string
}) => {
  const { scope, plan, periodStart, periodEnd, total, date } = input
  const rows = input.rows.filter(r => r.amount > 0)
  const batch = writeBatch(db)
  const waterRef = doc(collection(db, 'water_bills'))
  const expenseRef = doc(collection(db, 'bills'))
  const period = `${periodStart}～${periodEnd}`
  const dueDate = addDays(date, 14)

  const incomeIds = rows.map(row => {
    const ref = doc(collection(db, 'bills'))
    const detail = plan.mode === 'independent'
      ? `獨立水號，住 ${row.days} 天`
      : `整棟 $${total}，住 ${row.days} 天${plan.basis === 'person' ? ` × ${row.people} 人` : ''}`
    batch.set(ref, {
      landlordId, type: 'income', category: WATER_INCOME_CATEGORY,
      target: row.label, description: `水費 ${period}（${detail}）`,
      amount: row.amount, status: 'pending', date, dueDate,
      relatedTenantDocId: row.tenantDocId, tenantId: row.tenantUid, roomId: row.roomId,
      propertyId: plan.propertyId, waterBillId: waterRef.id,
      history: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    return ref.id
  })

  batch.set(expenseRef, {
    landlordId, type: 'expense', category: WATER_EXPENSE_CATEGORY,
    target: plan.targetName, description: `台水帳單 ${period}（${plan.targetName}）`,
    amount: total, status: 'completed', date, paidAt: date,
    propertyId: plan.propertyId, waterBillId: waterRef.id,
    history: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })

  batch.set(waterRef, {
    landlordId, scopeKind: scope.kind, propertyId: plan.propertyId,
    ...(scope.kind === 'room' ? { roomId: scope.roomId } : {}),
    targetName: plan.targetName, periodStart, periodEnd, amount: total,
    mode: plan.mode, basis: plan.basis,
    shares: rows.map(r => ({ tenantDocId: r.tenantDocId, label: r.label, days: r.days, people: r.people, amount: r.amount })),
    remainder: total - rows.reduce((s, r) => s + r.amount, 0),
    expenseBillId: expenseRef.id, incomeBillIds: incomeIds, date,
    createdAt: serverTimestamp(),
  })

  await batch.commit()
  return { waterBillId: waterRef.id, incomeCount: incomeIds.length }
}
