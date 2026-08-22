import { describe, it, expect } from 'vitest'
import { PropertyCostType, type Property, type PropertyCost } from '../../types/index'
import { buildReminders, daysBetween, dayLabel, subsidyActiveOn, type ReminderTenant } from './reminders'

const cost = (over: Partial<PropertyCost> = {}): PropertyCost => ({
  id: 'c1',
  landlordId: 'L',
  type: PropertyCostType.HouseTax,
  periodStart: '2025-07-01',
  periodEnd: '2026-06-30',
  amount: 18000,
  allocations: [{ propertyId: 'pA', amount: 18000 }],
  dueDate: '2026-05-31',
  ...over,
})

const prop = (over: Partial<Property> = {}): Property => ({
  id: 'pA', landlordId: 'L', name: '甲棟', ...over,
})

const run = (today: string, costs: PropertyCost[] = [], properties: Property[] = []) =>
  buildReminders({ today, costs, properties })

const roomProperty = new Map([['401', 'pA'], ['501', 'pA'], ['201', 'pB']])

const tenant = (over: Partial<ReminderTenant> = {}): ReminderTenant => ({
  id: 't1', name: '小明', room: '401', status: 'active', ...over,
})

const runT = (
  today: string,
  tenants: ReminderTenant[],
  properties: Property[] = [prop()],
) => buildReminders({ today, costs: [], properties, tenants, roomProperty })

describe('daysBetween / dayLabel', () => {
  it('計算天數差，跨月正確', () => {
    expect(daysBetween('2026-05-28', '2026-06-02')).toBe(5)
    expect(daysBetween('2026-06-02', '2026-05-28')).toBe(-5)
  })

  it('文字依過期與否切換', () => {
    expect(dayLabel(5)).toBe('剩 5 天')
    expect(dayLabel(0)).toBe('今天到期')
    expect(dayLabel(-3)).toBe('已逾期 3 天')
  })
})

describe('尚未登錄稅單的提醒', () => {
  it('房屋稅開徵前 7 天起提醒', () => {
    expect(run('2026-04-23').some(r => r.kind === 'cost_missing')).toBe(false)
    const r = run('2026-04-24').find(x => x.kind === 'cost_missing')
    expect(r).toBeDefined()
    expect(r!.title).toContain('房屋稅')
  })

  it('地價稅在 11 月開徵，房屋稅期間內不會誤報地價稅', () => {
    const may = run('2026-05-10')
    expect(may.some(r => r.id === 'missing:房屋稅:2026')).toBe(true)
    expect(may.some(r => r.id === 'missing:地價稅:2026')).toBe(false)

    const nov = run('2026-11-10')
    expect(nov.some(r => r.id === 'missing:地價稅:2026')).toBe(true)
    expect(nov.some(r => r.id === 'missing:房屋稅:2026')).toBe(false)
  })

  it('已登錄該年度稅單後不再提醒', () => {
    expect(run('2026-05-10', [cost()]).some(r => r.kind === 'cost_missing')).toBe(false)
  })

  it('登錄的是別的年度時仍然提醒', () => {
    const old = cost({ dueDate: '2025-05-31', periodEnd: '2025-06-30' })
    expect(run('2026-05-10', [old]).some(r => r.id === 'missing:房屋稅:2026')).toBe(true)
  })

  it('過了開徵月底就不再提醒，也不會回頭提醒去年', () => {
    expect(run('2026-06-01').some(r => r.kind === 'cost_missing')).toBe(false)
    expect(run('2026-01-15').some(r => r.kind === 'cost_missing')).toBe(false)
  })

  it('越接近月底越急', () => {
    expect(run('2026-05-01').find(r => r.kind === 'cost_missing')!.severity).toBe('warning')
    expect(run('2026-05-28').find(r => r.kind === 'cost_missing')!.severity).toBe('danger')
  })
})

describe('已登錄未繳的提醒', () => {
  it('期限 14 天內開始提醒', () => {
    expect(run('2026-05-16', [cost()]).some(r => r.kind === 'cost_due')).toBe(false)
    expect(run('2026-05-17', [cost()]).some(r => r.kind === 'cost_due')).toBe(true)
  })

  it('剩 3 天內升為最高等級', () => {
    expect(run('2026-05-20', [cost()]).find(r => r.kind === 'cost_due')!.severity).toBe('warning')
    expect(run('2026-05-29', [cost()]).find(r => r.kind === 'cost_due')!.severity).toBe('danger')
  })

  it('逾期另立一類且為最高等級', () => {
    const r = run('2026-06-05', [cost()]).find(x => x.kind === 'cost_overdue')
    expect(r).toBeDefined()
    expect(r!.severity).toBe('danger')
    expect(r!.detail).toContain('已逾期 5 天')
  })

  it('已繳的不再提醒', () => {
    expect(run('2026-06-05', [cost({ paidAt: '2026-05-20' })])).toEqual([])
  })

  it('沒有期限的不提醒，也不會因此壞掉', () => {
    expect(run('2026-06-05', [cost({ dueDate: '' })])).toEqual([])
  })
})

describe('火險續保提醒', () => {
  const withPolicy = (endDate: string) =>
    prop({ fireInsurance: { endDate, insurer: '○○產險' } })

  it('到期前 30 天起提醒', () => {
    expect(run('2026-08-14', [], [withPolicy('2026-09-14')]).some(r => r.kind === 'fire_expiring')).toBe(false)
    expect(run('2026-08-15', [], [withPolicy('2026-09-14')]).some(r => r.kind === 'fire_expiring')).toBe(true)
  })

  it('剩 7 天內升為最高等級', () => {
    expect(run('2026-09-08', [], [withPolicy('2026-09-14')]).find(r => r.kind === 'fire_expiring')!.severity).toBe('danger')
  })

  it('已過期另立一類', () => {
    const r = run('2026-09-20', [], [withPolicy('2026-09-14')]).find(x => x.kind === 'fire_expired')
    expect(r).toBeDefined()
    expect(r!.detail).toContain('已逾期 6 天')
  })

  it('沒填保單迄日的建物不提醒', () => {
    expect(run('2026-09-20', [], [prop()])).toEqual([])
  })

  it('多棟各自提醒，標題帶建物名', () => {
    const list = run('2026-09-01', [], [
      withPolicy('2026-09-14'),
      prop({ id: 'pB', name: '乙棟', fireInsurance: { endDate: '2026-09-20' } }),
    ])
    expect(list).toHaveLength(2)
    expect(list.map(r => r.title)).toEqual(
      expect.arrayContaining([expect.stringContaining('甲棟'), expect.stringContaining('乙棟')]),
    )
  })
})

describe('排序', () => {
  it('最急的排最前面，逾期優先於即將到期', () => {
    const list = run('2026-05-29', [
      cost({ id: 'c1', dueDate: '2026-05-31' }),
      cost({ id: 'c2', type: PropertyCostType.LandTax, dueDate: '2026-05-20' }),
    ], [prop({ fireInsurance: { endDate: '2026-06-20' } })])

    expect(list[0]!.kind).toBe('cost_overdue')
    expect(list[list.length - 1]!.severity).toBe('warning')
  })

  it('無事可辦時回傳空陣列', () => {
    expect(run('2026-03-15')).toEqual([])
  })
})

describe('subsidyActiveOn', () => {
  it('未勾選補貼一律無效', () => {
    expect(subsidyActiveOn('2026-06-01', { hasSubsidy: false, from: '2026-01-01', to: '2026-12-31' })).toBe(false)
  })

  it('落在起訖之間才有效', () => {
    const s = { hasSubsidy: true, from: '2026-01-01', to: '2026-12-31' }
    expect(subsidyActiveOn('2025-12-31', s)).toBe(false)
    expect(subsidyActiveOn('2026-01-01', s)).toBe(true)
    expect(subsidyActiveOn('2026-12-31', s)).toBe(true)
    expect(subsidyActiveOn('2027-01-01', s)).toBe(false)
  })

  it('未填起訖視為不設限', () => {
    expect(subsidyActiveOn('2026-06-01', { hasSubsidy: true })).toBe(true)
  })
})

describe('租金補貼到期提醒', () => {
  const subsidised = (to: string) => tenant({ rentSubsidy: { hasSubsidy: true, from: '2025-01-01', to } })

  it('到期前 30 天起提醒', () => {
    expect(runT('2026-05-31', [subsidised('2026-07-01')]).some(r => r.kind === 'subsidy_expiring')).toBe(false)
    expect(runT('2026-06-01', [subsidised('2026-07-01')]).some(r => r.kind === 'subsidy_expiring')).toBe(true)
  })

  it('剩 7 天內升為最高等級，內容說明資格會受影響', () => {
    const r = runT('2026-06-28', [subsidised('2026-07-01')]).find(x => x.kind === 'subsidy_expiring')!
    expect(r.severity).toBe('danger')
    expect(r.detail).toContain('公益出租人')
  })

  it('已過期就不再提醒到期（改由資格落差接手）', () => {
    expect(runT('2026-07-10', [subsidised('2026-07-01')]).some(r => r.kind === 'subsidy_expiring')).toBe(false)
  })

  it('已退租的租客不提醒', () => {
    const inactive = tenant({ status: 'inactive', rentSubsidy: { hasSubsidy: true, to: '2026-07-01' } })
    expect(runT('2026-06-20', [inactive]).some(r => r.kind === 'subsidy_expiring')).toBe(false)
  })

  it('沒填補貼迄日的不提醒', () => {
    expect(runT('2026-06-20', [tenant({ rentSubsidy: { hasSubsidy: true } })])
      .some(r => r.kind === 'subsidy_expiring')).toBe(false)
  })
})

describe('公益出租人資格落差', () => {
  const active = tenant({ rentSubsidy: { hasSubsidy: true, from: '2026-01-01', to: '2026-12-31' } })
  const declared = prop({
    publicWelfare: [{ year: 2026, houseTax: true, landTax: false, incomeTax: true }],
  })

  it('有補貼租客但未登錄核定時提示可申請', () => {
    const r = runT('2026-06-01', [active], [prop()]).find(x => x.kind === 'welfare_unclaimed')
    expect(r).toBeDefined()
    expect(r!.severity).toBe('info')
    expect(r!.detail).toContain('15,000')
  })

  it('已登錄核定且有補貼租客時不提示', () => {
    expect(runT('2026-06-01', [active], [declared])).toEqual([])
  })

  it('已登錄核定但補貼已失效時提示待確認', () => {
    const expired = tenant({ rentSubsidy: { hasSubsidy: true, from: '2025-01-01', to: '2025-12-31' } })
    const r = runT('2026-06-01', [expired], [declared]).find(x => x.kind === 'welfare_stale')
    expect(r).toBeDefined()
    expect(r!.severity).toBe('warning')
  })

  it('落差判斷逐棟獨立：甲棟有補貼不影響乙棟', () => {
    const list = runT('2026-06-01', [active], [prop(), prop({ id: 'pB', name: '乙棟' })])
    const ids = list.filter(r => r.kind === 'welfare_unclaimed').map(r => r.id)
    expect(ids).toEqual(['welfare-unclaimed:pA:2026'])
  })

  it('租客房號未歸到建物時不會誤判成有資格', () => {
    const orphan = tenant({ room: '999', rentSubsidy: { hasSubsidy: true, to: '2026-12-31' } })
    expect(runT('2026-06-01', [orphan], [prop()]).some(r => r.kind === 'welfare_unclaimed')).toBe(false)
  })

  it('完全沒有租客資料時不做落差判斷，避免誤報', () => {
    expect(buildReminders({ today: '2026-06-01', costs: [], properties: [declared], tenants: [] })).toEqual([])
  })
})
