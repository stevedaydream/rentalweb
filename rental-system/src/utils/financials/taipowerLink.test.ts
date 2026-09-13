import { describe, it, expect } from 'vitest'
import { findLinkedTaipowerBill, type TaipowerExpense } from './taipowerLink'
import type { TaipowerBill } from '../../components/financials/types'

const tp = (id: string, month: string, amount: number, groupId?: string, expenseBillId?: string): TaipowerBill =>
  ({ id, month, amount, usage: 0, groupId, expenseBillId })

const expense = (extra: Partial<TaipowerExpense> = {}): TaipowerExpense =>
  ({ id: 'e1', category: '台電帳單', date: '2026-02-15', amount: 7130, groupId: 'keelung', ...extra })

describe('findLinkedTaipowerBill', () => {
  it('有記錄 id 時直接採用', () => {
    const bills = [tp('a', '2026-02', 7130, 'keelung'), tp('b', '2026-02', 7130, 'taoyuan')]
    expect(findLinkedTaipowerBill(expense({ taipowerBillId: 'b' }), bills)?.id).toBe('b')
  })

  it('記錄的 id 已不存在時不改用比對，避免刪到別筆', () => {
    expect(findLinkedTaipowerBill(expense({ taipowerBillId: 'gone' }), [tp('a', '2026-02', 7130, 'keelung')])).toBeUndefined()
  })

  it('舊資料依月份＋金額＋總表比對；同月同額分屬兩棟時只取同棟那筆', () => {
    const bills = [tp('a', '2026-02', 7130, 'keelung'), tp('b', '2026-02', 7130, 'taoyuan')]
    expect(findLinkedTaipowerBill(expense(), bills)?.id).toBe('a')
  })

  it('舊支出沒有總表且同月同額不只一筆時不猜', () => {
    const bills = [tp('a', '2026-02', 7130, 'keelung'), tp('b', '2026-02', 7130, 'taoyuan')]
    expect(findLinkedTaipowerBill(expense({ groupId: undefined }), bills)).toBeUndefined()
  })

  it('月份或金額不同、或已連結其他支出的台電帳單不算', () => {
    expect(findLinkedTaipowerBill(expense(), [tp('a', '2026-03', 7130, 'keelung')])).toBeUndefined()
    expect(findLinkedTaipowerBill(expense(), [tp('a', '2026-02', 7000, 'keelung')])).toBeUndefined()
    expect(findLinkedTaipowerBill(expense(), [tp('a', '2026-02', 7130, 'keelung', 'other')])).toBeUndefined()
    expect(findLinkedTaipowerBill(expense(), [tp('a', '2026-02', 7130, 'keelung', 'e1')])?.id).toBe('a')
  })

  it('不是台電支出一律不對應', () => {
    expect(findLinkedTaipowerBill(expense({ category: '電費' }), [tp('a', '2026-02', 7130, 'keelung')])).toBeUndefined()
  })
})
