import { createHash } from 'node:crypto'
import {
  CYCLE_MONTHS, validMonth, validDate, monthEnd, coveragePeriod, leaseIncludesMonth,
  shouldGenerateRent, getBillingAmount, getBillingDescription, rentCoverage,
  overlapsCoverage, publicMeterShare,
} from './rules.mjs'

export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const money = value => Number.isSafeInteger(Math.round(Number(value))) && Number(value) >= 0 ? Math.round(Number(value)) : null
const labelOf = tenant => `${tenant.name || '未命名租客'} ${tenant.room || tenant.roomName || ''}`.trim()
const order = { '租金收入': 0, '電費': 1, '公共電費': 2 }

// Explicit IDs are authoritative. Legacy names are only accepted when unique.
export function tenantRoom(tenant, rooms) {
  if (tenant.roomId) return rooms.find(r => r.id === tenant.roomId) || null
  const matches = rooms.filter(r => r.name === (tenant.room || tenant.roomName))
  return matches.length === 1 ? matches[0] : null
}

export function buildPlan(input) {
  const { landlordId, month, tenants: sourceTenants, rooms, readings, publicMeters, groups, bills, settings = {} } = input
  // MoveOutWizard clears live lease fields and retains the actual dates in this snapshot.
  const tenants = sourceTenants.map(t => t.isHistorical && t.moveOutSummary ? {
    ...t, room: t.moveOutSummary.room || t.room,
    leaseStart: t.moveOutSummary.leaseStart || t.leaseStart,
    leaseEnd: t.moveOutSummary.moveOutDate || t.moveOutSummary.leaseEnd || t.leaseEnd,
  } : t)
  if (!validMonth(month)) throw new Error('月份格式錯誤，請使用 YYYY-MM')
  const warnings = []
  const skipped = []
  const allocations = []
  const plans = new Map()
  const end = monthEnd(month)
  const day = Number(settings.paymentDay ?? 12)
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('繳費截止日須為 1～31 號')
  const dueDate = `${month}-${String(Math.min(day, Number(end.slice(-2)))).padStart(2, '0')}`
  const roomByTenant = new Map(tenants.map(t => [t.id, tenantRoom(t, rooms)]))
  const usedUsage = new Set(bills.map(b => b.relatedUsageId).filter(Boolean))
  const existingIds = new Set(bills.map(b => b.id))
  const groupBySub = new Map()
  groups.forEach(g => (g.subGroups || []).forEach(s => {
    if (!groupBySub.has(s.id)) groupBySub.set(s.id, g.id)
  }))
  const add = (tenant, category, description, amount, identity, extra = {}) => {
    const id = `auto_${hash([landlordId, ...identity])}`
    if (existingIds.has(id)) return
    const credit = money(tenant.credit ?? 0)
    if (credit === null) {
      warnings.push(`${labelOf(tenant)}：預收餘額無效，請先核對，未出帳`)
      return
    }
    if (!plans.has(tenant.id)) plans.set(tenant.id, {
      tenantKey: tenant.id, target: labelOf(tenant), creditBefore: credit, creditUsed: 0, bills: [],
    })
    const room = roomByTenant.get(tenant.id)
    plans.get(tenant.id).bills.push({
      id, tenantId: tenant.uid || null, relatedTenantDocId: tenant.id, landlordId,
      roomId: room?.id || '', leaseStart: tenant.leaseStart || '', leaseEnd: tenant.leaseEnd || '',
      type: 'income', category, target: labelOf(tenant), description, amount,
      status: 'pending', dueDate, date: `${month}-01`, history: [], billingVersion: 2, ...extra,
    })
  }

  for (const tenant of [...tenants].sort((a, b) => a.id.localeCompare(b.id))) {
    if (tenant.isHistorical) continue
    const label = labelOf(tenant)
    if (!roomByTenant.get(tenant.id)) {
      warnings.push(`${label}：未綁定可唯一識別的房間，未出租金`)
      continue
    }
    if (!leaseIncludesMonth(tenant, month)) {
      skipped.push(`${label}：本月不在租期內或租期格式無效，未出租金`)
      continue
    }
    const freq = tenant.paymentFrequency || 'monthly'
    if (!Object.hasOwn(CYCLE_MONTHS, freq)) {
      warnings.push(`${label}：繳費方式無效，未出租金`)
      continue
    }
    const mine = bills.filter(b => b.type === 'income' && b.category === '租金收入'
      && (b.relatedTenantDocId ? b.relatedTenantDocId === tenant.id : tenant.uid && b.tenantId === tenant.uid))
    if (mine.some(b => !b.relatedTenantDocId) && tenants.filter(t => t.uid && t.uid === tenant.uid).length > 1) {
      warnings.push(`${label}：舊租金單僅記錄帳號，無法區分多份租約，請先確認歸屬`)
      continue
    }
    const cover = coveragePeriod(freq, month)
    if (mine.some(b => !rentCoverage(b))) {
      warnings.push(`${label}：既有租金單涵蓋期間無效，請先修正`)
      continue
    }
    if (overlapsCoverage(mine, cover)) {
      skipped.push(`${label}：${cover.from}～${cover.to} 與既有租金單重疊，未出租金`)
      continue
    }
    if (tenant.leaseEnd && cover.to > tenant.leaseEnd.slice(0, 7)) {
      warnings.push(`${label}：本期 ${cover.from}～${cover.to} 超出租約終月，請確認續約或改開末期租金`)
      continue
    }
    if (!shouldGenerateRent(tenant, month, mine)) {
      const reason = freq !== 'monthly' && !tenant.leaseStart ? '非月繳但缺少起租日' : '尚未到租金出帳週期'
      skipped.push(`${label}：${reason}，未出租金`)
      continue
    }
    const amount = getBillingAmount(tenant)
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      warnings.push(`${label}：租金金額無效，未出租金`)
      continue
    }
    if (!tenant.leaseStart) warnings.push(`${label}：缺少起租日，租金沿用月繳整月計收，請補齊租期`)
    if ((tenant.leaseStart?.slice(0, 7) === month && tenant.leaseStart.slice(-2) !== '01')
      || (tenant.leaseEnd?.slice(0, 7) === cover.to && tenant.leaseEnd !== monthEnd(cover.to))) {
      warnings.push(`${label}：首月或末月不足整月，本次按整月計收，請確認`)
    }
    add(tenant, '租金收入', getBillingDescription(tenant, month), amount,
      ['rent', tenant.id, month], { coverFrom: cover.from, coverTo: cover.to })
  }

  const currentReadings = readings.filter(r => r.periodEnd >= `${month}-01` && r.periodEnd <= end)
  const safeReadings = currentReadings.filter(r => {
    if (!validDate(r.periodStart) || !validDate(r.periodEnd) || r.periodStart >= r.periodEnd
      || money(r.cost) === null || !Number.isFinite(Number(r.usage)) || Number(r.usage) < 0) {
      warnings.push(`抄表 ${r.roomName || r.roomId || r.id}：期間或金額／度數無效，未出電費`)
      return false
    }
    const overlapping = currentReadings.some(o => o.id !== r.id && o.roomId === r.roomId
      && (o.meterType === 'public') === (r.meterType === 'public')
      && o.periodStart < r.periodEnd && r.periodStart < o.periodEnd)
    if (overlapping) {
      warnings.push(`抄表 ${r.roomName || r.roomId}：同表期間重疊，請先確認，未出電費`)
      return false
    }
    return true
  })
  const occupant = (room, reading) => {
    const matches = tenants.filter(t => roomByTenant.get(t.id)?.id === room.id)
    const uncertain = matches.some(t => !validDate(t.leaseStart) || !validDate(t.leaseEnd) || t.leaseStart > t.leaseEnd)
    const active = matches.filter(t => validDate(t.leaseStart) && validDate(t.leaseEnd)
      && t.leaseStart <= reading.periodEnd && t.leaseEnd >= reading.periodStart)
    if (!uncertain && active.length === 1
      && active[0].leaseStart <= reading.periodStart && active[0].leaseEnd >= reading.periodEnd) return active[0]
    if (uncertain || active.length > 0) {
      warnings.push(`${room.name} ${reading.periodStart}～${reading.periodEnd}：租期不完整或跨租客／空房期間，請分段抄表或人工確認，未出電費`)
      return 'unresolved'
    }
    return null
  }
  for (const reading of safeReadings.filter(r => r.meterType !== 'public')) {
    if (usedUsage.has(reading.id) || money(reading.cost) === 0) continue
    // A reading already has a stable roomId; never reassign it using its display name.
    const room = rooms.find(r => r.id === reading.roomId)
    if (!room) {
      warnings.push(`抄表 ${reading.roomName || reading.id}：缺少有效房間 ID，未出電費`)
      continue
    }
    const tenant = occupant(room, reading)
    if (!tenant || tenant === 'unresolved') continue
    add(tenant, '電費', `${month} 電費 (${reading.periodStart}~${reading.periodEnd} 用電 ${reading.usage}度)`,
      money(reading.cost), ['usage', reading.id], {
        relatedUsageId: reading.id, date: reading.periodEnd,
        groupId: groupBySub.get(room.subGroupId) || '__ungrouped__',
        calculation: { readingId: reading.id, periodStart: reading.periodStart, periodEnd: reading.periodEnd,
          usage: Number(reading.usage), originalCost: Number(reading.cost) },
      })
  }
  for (const pm of publicMeters) {
    if (pm.landlordPays) continue
    if (!pm.subGroupId) {
      warnings.push(`公共電表「${pm.name}」未指定分攤子群組，未生成分攤帳單`)
      continue
    }
    const meterReadings = safeReadings.filter(r => r.meterType === 'public' && r.roomId === pm.id)
    if (!meterReadings.length) {
      warnings.push(`公共電表「${pm.name}」本月無可用抄表紀錄，未生成分攤帳單`)
      continue
    }
    const shareRooms = rooms.filter(r => (r.subGroupId || '') === (pm.subGroupId || ''))
    if (!shareRooms.length) {
      warnings.push(`公共電表「${pm.name}」未綁定房間，未生成分攤帳單`)
      continue
    }
    for (const reading of meterReadings) {
      const total = money(reading.cost)
      if (!total) continue
      const share = publicMeterShare(total, shareRooms.length)
      const existingShares = bills.filter(b => shareRooms.some(room => b.relatedUsageId === `${reading.id}_${room.id}`))
      if (existingShares.some(b => Number(b.amount) !== share
        || (b.calculation && (b.calculation.total !== total
          || JSON.stringify(b.calculation.roomIds) !== JSON.stringify(shareRooms.map(r => r.id).sort()))))) {
        warnings.push(`公共電表「${pm.name}」已有不同金額或分攤基礎的帳單，請先核對，未補開其餘分攤`)
        continue
      }
      const allocation = {
        readingId: reading.id, name: pm.name, total, roomCount: shareRooms.length, share,
        roundingRemainder: total - share * shareRooms.length, vacantAmount: 0, unresolvedAmount: 0,
        roomIds: shareRooms.map(r => r.id).sort(), policy: 'equal-floor-landlord-remainder',
      }
      for (const room of shareRooms) {
        const tenant = occupant(room, reading)
        if (!tenant) { allocation.vacantAmount += share; continue }
        if (tenant === 'unresolved') { allocation.unresolvedAmount += share; continue }
        const key = `${reading.id}_${room.id}`
        if (usedUsage.has(key) || share === 0) continue
        add(tenant, '公共電費', `${month} 公共電費分攤（${pm.name} $${total} ÷ ${shareRooms.length} 房，尾差房東負擔）`,
          share, ['public', reading.id, room.id], {
            relatedUsageId: key, groupId: pm.groupId || groupBySub.get(pm.subGroupId) || '__ungrouped__',
            date: reading.periodEnd,
            calculation: { readingId: reading.id, periodStart: reading.periodStart, periodEnd: reading.periodEnd,
              total, roomCount: shareRooms.length, share, roundingRemainder: allocation.roundingRemainder,
              roomIds: allocation.roomIds, policy: allocation.policy },
          })
      }
      allocations.push(allocation)
    }
  }
  const result = [...plans.values()].map(plan => {
    plan.bills.sort((a, b) => order[a.category] - order[b.category] || a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    let credit = plan.creditBefore
    for (const bill of plan.bills) {
      const used = Math.min(credit, bill.amount)
      bill.creditApplied = used
      credit -= used
    }
    plan.creditUsed = plan.creditBefore - credit
    plan.version = hash(plan)
    return plan
  })
  return { month, plans: result, warnings: [...new Set(warnings)], skipped: [...new Set(skipped)], allocations }
}

export const publicPlan = plan => ({
  ...plan,
  plans: plan.plans.map(p => ({
    tenantKey: p.tenantKey, target: p.target, version: p.version, creditBefore: p.creditBefore, creditUsed: p.creditUsed,
    items: p.bills.map(b => ({
      target: b.target, category: b.category, description: b.description, amount: b.amount,
      tenantKey: p.tenantKey, creditApplied: b.creditApplied, dueDate: b.dueDate,
    })),
  })),
})
