import { describe, expect, it } from 'vitest'
import { buildLandlordImportPlan } from './landlordImport'

const workbook = {
  properties: [
    { name: '復興路 1 號', address: '台北市中山區復興路 1 號', waterMode: 'fixed', waterBasis: 'person', fixedWaterAmount: 100 },
  ],
  rooms: [
    { propertyName: '復興路 1 號', floor: '4F', name: '401', rent: 12000, size: 8, layout: '套房' },
  ],
  tenants: [
    { roomName: '401', name: '王小明', phone: '0912345678', occupants: 2 },
  ],
  leases: [
    { roomName: '401', startDate: '2026-09-01', endDate: '2027-08-31', rent: 12000, depositMonths: 2, paymentFrequency: 'monthly' },
  ],
  outstanding: [
    { roomName: '401', category: '租金收入', amount: 12000, dueDate: '2026-09-05', coverFrom: '2026-09', coverTo: '2026-09' },
  ],
  credits: [{ roomName: '401', amount: 500 }],
  meterReadings: [
    { roomName: '401', date: '2026-07-31', reading: 100 },
    { roomName: '401', date: '2026-08-31', reading: 130 },
  ],
}

describe('新房東現況匯入計畫', () => {
  it('接受完整且可營運的現況接管資料', () => {
    const result = buildLandlordImportPlan(workbook)
    expect(result.errors).toEqual([])
    expect(result.plan?.summary).toEqual({ properties: 1, rooms: 1, tenants: 1, leases: 1, bills: 1, meterReadings: 2 })
    expect(result.plan?.tenants[0]).toMatchObject({ roomName: '401', occupants: 2, credit: 500 })
  })

  it('阻擋正規化後重複的建物與找不到的跨表關聯', () => {
    const result = buildLandlordImportPlan({
      ...workbook,
      properties: [...workbook.properties, { name: ' 復興路　1 號 ', waterMode: 'landlord' }],
      tenants: [{ roomName: '999', name: '王小明' }],
    })
    expect(result.plan).toBeUndefined()
    expect(result.errors.join('\n')).toContain('建物名稱重複')
    expect(result.errors.join('\n')).toContain('房號「999」不存在')
  })

  it('要求 ISO 日期、未結清租金的涵蓋月份與每表剛好兩期讀數', () => {
    const result = buildLandlordImportPlan({
      ...workbook,
      leases: [{ ...workbook.leases[0]!, startDate: '2026/09/01' }],
      outstanding: [{ ...workbook.outstanding[0]!, coverFrom: '' }],
      meterReadings: [{ roomName: '401', date: '2026-08-31', reading: 130 }],
    })
    expect(result.plan).toBeUndefined()
    expect(result.errors.join('\n')).toContain('YYYY-MM-DD')
    expect(result.errors.join('\n')).toContain('涵蓋起訖月份')
    expect(result.errors.join('\n')).toContain('最近兩期')
  })

  it('每個匯入房間都需要兩期電表基準，不能漏填', () => {
    const result = buildLandlordImportPlan({ ...workbook, meterReadings: [] })
    expect(result.plan).toBeUndefined()
    expect(result.errors.join('\n')).toContain('房號「401」電表必須提供最近兩期讀數')
  })
})
