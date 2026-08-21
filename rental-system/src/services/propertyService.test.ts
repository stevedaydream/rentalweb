import { describe, it, expect } from 'vitest'
import { planRoomAssignments } from './propertyService'

type TestRoom = { id: string; name: string; subGroupId?: string; propertyId?: string }

// 甲棟：sgA1(4樓)、sgA2(5樓)｜乙棟：sgB1(2樓)
const subGroupToGroup = new Map([
  ['sgA1', 'gA'],
  ['sgA2', 'gA'],
  ['sgB1', 'gB'],
])
const groupToProperty = new Map([
  ['gA', 'pA'],
  ['gB', 'pB'],
])

const plan = (rooms: TestRoom[]) =>
  planRoomAssignments(rooms, subGroupToGroup, groupToProperty)

describe('planRoomAssignments', () => {
  it('依 子群組 → 總表 → 建物 歸位，同棟不同樓歸同一建物', () => {
    const r = plan([
      { id: 'r1', name: '401', subGroupId: 'sgA1' },
      { id: 'r2', name: '501', subGroupId: 'sgA2' },
      { id: 'r3', name: '201', subGroupId: 'sgB1' },
    ])
    expect(r.assignments).toEqual([
      { roomId: 'r1', propertyId: 'pA' },
      { roomId: 'r2', propertyId: 'pA' },
      { roomId: 'r3', propertyId: 'pB' },
    ])
    expect(r.unassigned).toEqual([])
  })

  it('已指派過的房間不覆寫，即使推導結果不同', () => {
    const r = plan([
      { id: 'r1', name: '401', subGroupId: 'sgA1', propertyId: 'pB' },
    ])
    expect(r.assignments).toEqual([])
    expect(r.unassigned).toEqual([])
  })

  it('重複執行不會重複指派（第二次全部略過）', () => {
    const rooms: TestRoom[] = [{ id: 'r1', name: '401', subGroupId: 'sgA1' }]
    const first = plan(rooms)
    expect(first.assignments).toHaveLength(1)

    // 模擬第一次寫入後的狀態
    rooms[0]!.propertyId = first.assignments[0]!.propertyId
    expect(plan(rooms).assignments).toEqual([])
  })

  it('沒綁子群組的房間列為待手動指派', () => {
    const r = plan([{ id: 'r1', name: '無表房' }])
    expect(r.assignments).toEqual([])
    expect(r.unassigned).toEqual(['無表房'])
  })

  it('子群組所屬總表已刪除時不臆測', () => {
    const r = plan([{ id: 'r1', name: '401', subGroupId: 'sgGhost' }])
    expect(r.assignments).toEqual([])
    expect(r.unassigned).toEqual(['401'])
  })

  it('總表尚未種子出建物時不臆測', () => {
    const r = planRoomAssignments(
      [{ id: 'r1', name: '401', subGroupId: 'sgA1' }],
      subGroupToGroup,
      new Map(), // 還沒有任何建物
    )
    expect(r.assignments).toEqual([])
    expect(r.unassigned).toEqual(['401'])
  })

  it('propertyId 為空字串視同未指派（解除指派寫入的值）', () => {
    const r = plan([{ id: 'r1', name: '401', subGroupId: 'sgA1', propertyId: '' }])
    expect(r.assignments).toEqual([{ roomId: 'r1', propertyId: 'pA' }])
  })

  it('不變量：每間房恰好出現在 assignments 或 unassigned 其中一邊，或因已指派而兩邊都不出現', () => {
    const rooms: TestRoom[] = [
      { id: 'r1', name: '401', subGroupId: 'sgA1' },
      { id: 'r2', name: '201', subGroupId: 'sgB1' },
      { id: 'r3', name: '無表房' },
      { id: 'r4', name: '已指派', subGroupId: 'sgA1', propertyId: 'pA' },
    ]
    const r = plan(rooms)
    const touched = r.assignments.length + r.unassigned.length
    const alreadyAssigned = rooms.filter(x => x.propertyId).length
    expect(touched + alreadyAssigned).toBe(rooms.length)
  })
})
