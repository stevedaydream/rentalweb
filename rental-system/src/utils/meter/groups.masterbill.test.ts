import { describe, it, expect } from 'vitest'
import { applyMasterBills, type MasterBill } from './groups'
import { calculateGroupAvgRate } from './calc'
import { UNGROUPED_ID, type MeterGroup } from '../../components/meter/types'

const g = (id: string): MeterGroup => ({
  id, name: id, officialMetersCount: 1, roomCount: 9, masterLastReading: 0,
})

describe('applyMasterBills：把台電帳單套進各總表', () => {
  it('依 groupId 對應到正確的總表', () => {
    const bills: MasterBill[] = [
      { groupId: 'keelung', usage: 2000, amount: 10000 },
      { groupId: 'taoyuan', usage: 500, amount: 3000 },
    ]
    const out = applyMasterBills([g('keelung'), g('taoyuan')], bills)
    expect(out[0]!.masterCurrentReading).toBe(2000)
    expect(out[0]!.masterBillAmount).toBe(10000)
    expect(out[1]!.masterCurrentReading).toBe(500)
    expect(out[1]!.masterBillAmount).toBe(3000)
  })

  it('沒有對應帳單的總表維持未填，不沿用其他棟的數字', () => {
    const out = applyMasterBills(
      [g('keelung'), g('taoyuan')],
      [{ groupId: 'keelung', usage: 2000, amount: 10000 }],
    )
    expect(out[1]!.masterCurrentReading).toBeUndefined()
    expect(out[1]!.masterBillAmount).toBeUndefined()
  })

  it('套用後平均單價正確', () => {
    const out = applyMasterBills([g('keelung')], [{ groupId: 'keelung', usage: 2000, amount: 10000 }])
    expect(calculateGroupAvgRate(out[0]!)).toBeCloseTo(5, 10)
  })

  it('masterLastReading 一律歸零：台電帳單記錄的是本期用電量而非累計讀數', () => {
    const out = applyMasterBills(
      [{ ...g('keelung'), masterLastReading: 999 }],
      [{ groupId: 'keelung', usage: 2000, amount: 10000 }],
    )
    expect(out[0]!.masterLastReading).toBe(0)
    expect(calculateGroupAvgRate(out[0]!)).toBeCloseTo(5, 10)
  })
})

describe('applyMasterBills：舊資料沒有 groupId', () => {
  it('只有一顆總表時視為該表的帳單', () => {
    const out = applyMasterBills([g('only')], [{ usage: 2000, amount: 10000 }])
    expect(out[0]!.masterCurrentReading).toBe(2000)
  })

  it('尚未建立群組（僅未分組虛擬總表）時同樣可套用', () => {
    const out = applyMasterBills([g(UNGROUPED_ID)], [{ usage: 2000, amount: 10000 }])
    expect(out[0]!.masterCurrentReading).toBe(2000)
  })

  // 寧可留空讓使用者重新輸入，也不要把甲棟的帳單金額套到乙棟去分攤
  it('多顆總表時不臆測歸屬，一律不套用', () => {
    const out = applyMasterBills([g('keelung'), g('taoyuan')], [{ usage: 2000, amount: 10000 }])
    expect(out[0]!.masterCurrentReading).toBeUndefined()
    expect(out[1]!.masterCurrentReading).toBeUndefined()
  })

  it('多顆總表時，有 groupId 的帳單仍正常套用', () => {
    const out = applyMasterBills(
      [g('keelung'), g('taoyuan')],
      [{ usage: 999, amount: 999 }, { groupId: 'taoyuan', usage: 500, amount: 3000 }],
    )
    expect(out[0]!.masterCurrentReading).toBeUndefined()
    expect(out[1]!.masterCurrentReading).toBe(500)
  })
})

describe('applyMasterBills：不變性', () => {
  it('沒有任何帳單時原樣回傳', () => {
    const input = [g('a'), g('b')]
    const out = applyMasterBills(input, [])
    expect(out).toEqual(input)
  })

  it('不修改傳入的群組物件', () => {
    const input = [g('a')]
    applyMasterBills(input, [{ groupId: 'a', usage: 100, amount: 500 }])
    expect(input[0]!.masterCurrentReading).toBeUndefined()
  })

  it('總表數量與順序不變', () => {
    const input = [g('a'), g('b'), g(UNGROUPED_ID)]
    const out = applyMasterBills(input, [{ groupId: 'b', usage: 1, amount: 1 }])
    expect(out.map(x => x.id)).toEqual(['a', 'b', UNGROUPED_ID])
  })
})
