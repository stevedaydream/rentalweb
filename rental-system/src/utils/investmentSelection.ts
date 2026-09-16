export interface InvestmentRoom {
  id: string
  name: string
  propertyId?: string
  price?: number
  size?: number
  purchaseCost?: number
}

const nonNegativeAmount = (value: unknown) => Math.max(0, Number(value) || 0)

export const summarizePropertyInvestment = <T extends InvestmentRoom>(rooms: T[], propertyId: string) => {
  const propertyRooms = rooms.filter(room => room.propertyId === propertyId)

  return {
    rooms: propertyRooms,
    roomCount: propertyRooms.length,
    monthlyRent: propertyRooms.reduce((sum, room) => sum + nonNegativeAmount(room.price), 0),
    totalSize: propertyRooms.reduce((sum, room) => sum + nonNegativeAmount(room.size), 0),
    purchaseCost: propertyRooms.reduce((sum, room) => sum + nonNegativeAmount(room.purchaseCost), 0),
  }
}
