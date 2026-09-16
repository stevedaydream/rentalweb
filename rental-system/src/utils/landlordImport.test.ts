import { describe, expect, it } from 'vitest'
import { buildLandlordImportPlan, planLandlordImportWrites, type LandlordImportWorkbook, type LandlordImportPlan } from './landlordImport'
import { buildPlan } from '../../functions/billing/planner.mjs'

const workbook = (): LandlordImportWorkbook => ({
  properties: [
    { name: '復興路 1 號', address: '台北市中山區復興路 1 號', waterMode: '固定月費', waterBasis: '每人', fixedWaterAmount: '100' },
  ],
  rooms: [
    { propertyName: '復興路 1 號', floor: '4F', name: '401', rent: '12,000', size: 8, layout: '套房' },
    { propertyName: '復興路 1 號', floor: '4F', name: '402', rent: 11000, size: 7 },
  ],
  tenants: [
    { roomName: '401', name: '王小明', phone: '0912345678', occupants: 2, idNumber: 'a123456789' },
  ],
  leases: [
    { roomName: '401', startDate: '2026-07-01', endDate: '2027-06-30', rent: '12,000', depositMonths: 2, paymentFrequency: '季繳', rentPaidThrough: '2026-09' },
  ],
  outstanding: [
    { roomName: '401', category: '電費', amount: 850, dueDate: '2026-08-15' },
  ],
  credits: [{ roomName: '401', amount: '500' }],
  meterReadings: [
    { roomName: '401', date: '2026-07-31', reading: 100 },
    { roomName: '401', date: '2026-08-31', reading: 130 },
  ],
})

const errorsOf = (wb: LandlordImportWorkbook, existing = {}) => buildLandlordImportPlan(wb, existing).errors.join('\n')

describe('現況接管：驗證', () => {
  it('接受完整資料，千分位與中文選項都能辨識', () => {
    const { errors, plan } = buildLandlordImportPlan(workbook())
    expect(errors).toEqual([])
    expect(plan!.summary).toEqual({ properties: 1, rooms: 2, tenants: 1, leases: 1, bills: 1, credits: 1, meterBaselines: 1 })
    expect(plan!.properties[0]!.waterSettings).toEqual({ mode: 'fixed', basis: 'person', fixedAmount: 100 })
    expect(plan!.rooms[0]).toMatchObject({ rent: 12000, baseline: { date: '2026-08-31', reading: 130 } })
    expect(plan!.leases[0]).toMatchObject({ rent: 12000, paymentFrequency: 'quarterly', rentPaidThrough: '2026-09' })
    expect(plan!.tenants[0]).toMatchObject({ occupants: 2, credit: 500, idNumber: 'A123456789' })
  })

  it('水費方式留空不寫設定（依合約範本推定）；打錯字則報錯', () => {
    const wb = workbook()
    wb.properties[0] = { name: '復興路 1 號' }
    expect(buildLandlordImportPlan(wb).plan!.properties[0]!.waterSettings).toBeUndefined()
    wb.properties[0] = { name: '復興路 1 號', waterMode: 'fix' }
    expect(errorsOf(wb)).toContain('水費方式「fix」無法辨識')
    wb.properties[0] = { name: '復興路 1 號', waterMode: 'fixed', fixedWaterAmount: '' }
    expect(errorsOf(wb)).toContain('月費必須大於 0')
  })

  it('建物與房號正規化後不可重複，也不可與系統既有資料相同', () => {
    const wb = workbook()
    wb.properties.push({ name: ' 復興路　1 號 ' })
    wb.rooms.push({ propertyName: '復興路 1 號', name: '４０１' })
    const errors = errorsOf(wb, { propertyNames: [], roomNames: ['402'] })
    expect(errors).toContain('建物名稱重複')
    expect(errors).toContain('房號重複「４０１」')
    expect(errors).toContain('系統已有房號「402」')
  })

  it('預收餘額必須掛在現役租客上，不會無聲消失', () => {
    const wb = workbook()
    wb.credits = [{ roomName: '402', amount: 300 }]
    expect(errorsOf(wb)).toContain('預收餘額第 2 列：房號「402」沒有現役租客')
  })

  it('未結清帳款類別限定系統認得的類別，租金須有涵蓋月份', () => {
    const wb = workbook()
    wb.outstanding = [
      { roomName: '401', category: '租金', amount: 12000, dueDate: '2026-08-05' },
      { roomName: '401', category: '租金收入', amount: 12000, dueDate: '2026-08-05', coverFrom: '2026-09', coverTo: '2026-08' },
    ]
    const errors = errorsOf(wb)
    expect(errors).toContain('類別「租金」無法辨識')
    expect(errors).toContain('涵蓋起訖月份')
  })

  it('日期必須真實存在，數字無法辨識或為負數要報錯', () => {
    const wb = workbook()
    wb.leases[0] = { ...wb.leases[0]!, startDate: '2026-02-30' }
    wb.rooms[1] = { ...wb.rooms[1]!, rent: 'abc' }
    wb.meterReadings = [{ roomName: '401', date: '2026-08-31', reading: -5 }, { roomName: '402', date: '2026-08-31', reading: '' }]
    const errors = errorsOf(wb)
    expect(errors).toContain('起租日與到期日必須是有效日期')
    expect(errors).toContain('房間第 3 列：月租金必須是非負整數')
    expect(errors).toContain('電表讀數第 2 列：讀數必須是非負數字')
    expect(errors).toContain('電表讀數第 3 列：讀數必須是非負數字')
  })

  it('電表讀數選填；讀數倒退要報錯', () => {
    const wb = workbook()
    wb.meterReadings = []
    expect(buildLandlordImportPlan(wb).errors).toEqual([])
    wb.meterReadings = [{ roomName: '401', date: '2026-07-31', reading: 200 }, { roomName: '401', date: '2026-08-31', reading: 100 }]
    expect(errorsOf(wb)).toContain('不可比前一期小')
  })

  it('繳費週期與租金已繳至格式檢查；有租客就必須有租約', () => {
    const wb = workbook()
    wb.leases[0] = { ...wb.leases[0]!, paymentFrequency: '雙月繳', rentPaidThrough: '2027-09' }
    expect(errorsOf(wb)).toContain('繳費週期請填')
    expect(errorsOf(wb)).toContain('租金已繳至不可晚於到期月')
    wb.leases = []
    expect(errorsOf(wb)).toContain('房號「401」有現役租客但缺少目前租約')
  })
})

describe('現況接管：寫入規劃', () => {
  const plan = buildLandlordImportPlan(workbook()).plan as LandlordImportPlan
  let seq = 0
  const writes = planLandlordImportWrites(plan, {
    landlordId: 'owner', runId: 'run1', newId: c => `${c}-${++seq}`, timestamp: 'TS',
    nowIso: '2026-09-17T00:00:00.000Z', today: '2026-09-17', paymentDay: 5,
  })
  const of = (collection: string) => writes.filter(w => w.collection === collection)

  it('租客帶齊出帳與租客列表需要的欄位，並連到租約', () => {
    const tenant = of('tenants')[0]!
    const contract = of('contracts')[0]!
    expect(tenant.data).toMatchObject({
      landlordId: 'owner', room: '401', roomId: of('rooms')[0]!.id, paymentFrequency: 'quarterly',
      depositMonths: 2, leaseDuration: 1, paymentStatus: 'normal', rent: 12000, occupants: 2,
      contractId: contract.id, rentPaidThrough: '2026-09', credit: 500, importRunId: 'run1',
    })
    expect(tenant.data.creditLog).toEqual([{ amount: 500, date: '2026-09-17', source: 'manual', note: '舊系統接管預收餘額', at: '2026-09-17T00:00:00.000Z' }])
    expect(contract.data).toMatchObject({
      tenantDocId: tenant.id, roomNumber: '401', paymentFrequency: 'quarterly', paymentDay: 5, status: 'active',
      deposits: [
        { label: '押金（第 1 個月）', amount: 12000, status: 'paid' },
        { label: '押金（第 2 個月）', amount: 12000, status: 'paid' },
      ],
    })
  })

  it('房間只記電表起點，不建立抄表紀錄；空房為待租', () => {
    expect(of('meter_readings')).toEqual([])
    const [r401, r402] = of('rooms')
    expect(r401!.data).toMatchObject({ status: 'occupied', tenantName: '王小明', leaseEnd: '2027-06-30', lastMeterReading: 130, lastMeterDate: '2026-08-31' })
    expect(r402!.data).toMatchObject({ status: 'vacant', tenantName: '' })
    expect(r402!.data).not.toHaveProperty('lastMeterReading')
    const group = of('meter_groups')[0]!
    expect((group.data.subGroups as { name: string }[]).map(s => s.name)).toEqual(['4F'])
    expect(r401!.data.subGroupId).toBe((group.data.subGroups as { id: string }[])[0]!.id)
  })

  it('建物寫入水費設定與總表；逾期的未結清帳款標為逾期', () => {
    expect(of('properties')[0]!.data).toMatchObject({ meterGroupId: of('meter_groups')[0]!.id, waterSettings: { mode: 'fixed' } })
    const bill = of('bills')[0]!.data
    expect(bill).toMatchObject({ category: '電費', status: 'overdue', relatedTenantDocId: of('tenants')[0]!.id, target: '王小明 401', history: [] })
    expect(bill).not.toHaveProperty('coverFrom')
  })

  it('匯入後出帳：已繳至的季度不重收，下一季從 10 月開始並帶水費', () => {
    const tenant = { id: of('tenants')[0]!.id, ...of('tenants')[0]!.data, credit: 0 }
    const rooms = of('rooms').map(w => ({ id: w.id, ...w.data }))
    const properties = of('properties').map(w => ({ id: w.id, ...w.data }))
    const input = { landlordId: 'owner', tenants: [tenant], rooms, properties, readings: [], publicMeters: [], groups: [], bills: [], settings: { paymentDay: 5 } }
    expect(buildPlan({ ...input, month: '2026-09' }).plans).toEqual([])
    const bills = buildPlan({ ...input, month: '2026-10' }).plans[0]!.bills
    expect(bills.map(b => [b.category, b.amount, b.coverFrom, b.coverTo]))
      .toEqual([['租金收入', 36000, '2026-10', '2026-12'], ['水費', 600, '2026-10', '2026-12']])
  })
})
