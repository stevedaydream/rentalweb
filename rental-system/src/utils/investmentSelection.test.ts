import { describe, expect, it } from 'vitest'
import { summarizePropertyInvestment } from './investmentSelection'

describe('建物投資試算彙總', () => {
  const rooms = [
    { id: 'r1', name: '201', propertyId: 'p1', price: 12000, size: 8, purchaseCost: 3000000 },
    { id: 'r2', name: '202', propertyId: 'p1', price: 13500, size: 9.5, purchaseCost: 3200000 },
    { id: 'r3', name: '301', propertyId: 'p2', price: 15000, size: 10, purchaseCost: 3500000 },
  ]

  it('只彙總所選建物內的房間租金、坪數與購入成本', () => {
    expect(summarizePropertyInvestment(rooms, 'p1')).toMatchObject({
      roomCount: 2,
      monthlyRent: 25500,
      totalSize: 17.5,
      purchaseCost: 6200000,
    })
  })

  it('建物尚未指派房間時回傳零值', () => {
    expect(summarizePropertyInvestment(rooms, 'empty')).toMatchObject({
      rooms: [],
      roomCount: 0,
      monthlyRent: 0,
      totalSize: 0,
      purchaseCost: 0,
    })
  })
})
