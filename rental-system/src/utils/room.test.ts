import { describe, it, expect } from 'vitest'
import { roomMonthlyRent } from './room'

describe('roomMonthlyRent：房源月租金', () => {
  // 迴歸：簽約流程曾讀取 r.rent，但 rooms 文件的欄位是 price，
  // 導致選了房源卻帶入租金 0
  it('讀取正式欄位 price', () => {
    expect(roomMonthlyRent({ price: 8000 })).toBe(8000)
  })

  it('沒有 price 時退回舊欄位 rent', () => {
    expect(roomMonthlyRent({ rent: 7000 })).toBe(7000)
  })

  it('兩者皆有時以 price 為準', () => {
    expect(roomMonthlyRent({ price: 8000, rent: 7000 })).toBe(8000)
  })

  it('price 為字串數字時仍可取得（Firestore 可能存成字串）', () => {
    expect(roomMonthlyRent({ price: '8000' as unknown as number })).toBe(8000)
  })

  it.each([
    ['兩個欄位皆無', {}],
    ['price 為 0', { price: 0 }],
    ['price 為負', { price: -100 }],
    ['price 非數字', { price: 'abc' as unknown as number }],
    ['房源為 null', null],
    ['房源為 undefined', undefined],
  ])('%s 時回傳 0，不得回傳 NaN', (_label, room) => {
    const rent = roomMonthlyRent(room)
    expect(rent).toBe(0)
    expect(Number.isNaN(rent)).toBe(false)
  })

  it('price 為 0 時不會退回 rent（0 是明確的「未設定租金」）', () => {
    expect(roomMonthlyRent({ price: 0, rent: 7000 })).toBe(7000)
  })
})
