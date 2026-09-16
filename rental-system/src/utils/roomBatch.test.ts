import { describe, it, expect } from 'vitest'
import {
  generateRoomNames, floorRange, findDuplicates, isDuplicateRoomName, floorLabel, matchesFloor, roomNameKey,
} from './roomBatch'

describe('批量房號產生', () => {
  it('樓層＋兩位序號', () => {
    expect(generateRoomNames([{ floor: 4, count: 3 }, { floor: 5, count: 1 }], { scheme: 'number' }).map(r => r.name))
      .toEqual(['401', '402', '403', '501'])
  })

  it('樓層＋字母，超過 26 間接 AA', () => {
    const names = generateRoomNames([{ floor: 4, count: 28 }], { scheme: 'letter' }).map(r => r.name)
    expect(names.slice(0, 2)).toEqual(['4A', '4B'])
    expect(names.slice(-3)).toEqual(['4Z', '4AA', '4AB'])
  })

  it('前後綴與地下樓層', () => {
    expect(generateRoomNames([{ floor: -1, count: 1 }, { floor: 2, count: 1 }], { scheme: 'number', prefix: ' 桃園-', suffix: '室' })
      .map(r => r.name)).toEqual(['桃園-B101室', '桃園-201室'])
  })

  it('間數為 0 或負數時不產生，並保留每列樓層', () => {
    const rows = generateRoomNames([{ floor: 3, count: 0 }, { floor: 4, count: -2 }, { floor: 5, count: 2 }], { scheme: 'letter' })
    expect(rows).toEqual([{ floor: 5, name: '5A' }, { floor: 5, name: '5B' }])
  })

  it('樓層範圍含兩端、可顛倒、略過 0 樓', () => {
    expect(floorRange(2, 5)).toEqual([2, 3, 4, 5])
    expect(floorRange(5, 2)).toEqual([2, 3, 4, 5])
    expect(floorRange(-1, 1)).toEqual([-1, 1])
  })
})

describe('樓層子群組名稱', () => {
  it('新建用 4F、B1F', () => {
    expect(floorLabel(4)).toBe('4F')
    expect(floorLabel(-1)).toBe('B1F')
  })
  it('既有「4樓」「4 f」都視為同一層，不同層不相符', () => {
    expect(matchesFloor('4樓', 4)).toBe(true)
    expect(matchesFloor(' 4 f', 4)).toBe(true)
    expect(matchesFloor('B1', -1)).toBe(true)
    expect(matchesFloor('14F', 4)).toBe(false)
    expect(matchesFloor('公共區', 4)).toBe(false)
  })
})

describe('房號重複檢查', () => {
  it('比對鍵忽略空白、大小寫與全形', () => {
    expect(roomNameKey(' ４ａ ')).toBe('4A')
  })

  it('與既有房間同名標 existing，批次內重複的第二筆起標 batch', () => {
    expect(findDuplicates(['401', '402', '4O2', '402', '401 '], ['401'])).toEqual(['existing', null, null, 'batch', 'existing'])
  })

  it('空白房號不算重複（由必填檢查處理）', () => {
    expect(findDuplicates(['', ' '], [])).toEqual([null, null])
  })

  it('單間存檔：排除自己，其他房間同名即重複', () => {
    const rooms = [{ id: 'a', name: '4A' }, { id: 'b', name: '4B' }]
    expect(isDuplicateRoomName('4a', rooms, 'a')).toBe(false)
    expect(isDuplicateRoomName('4b', rooms, 'a')).toBe(true)
    expect(isDuplicateRoomName('4B', rooms)).toBe(true)
    expect(isDuplicateRoomName('', rooms)).toBe(false)
  })
})
