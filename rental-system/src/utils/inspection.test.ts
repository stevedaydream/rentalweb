import { describe, it, expect } from 'vitest'
import {
  makeEntry, entriesFromCatalog, seedEntriesFrom, entriesFromLegacy,
  photoRequired, entryReady, tenantProgress, paginate,
  canHandToTenant, canReturnToLandlord, unresolvedCount, canSign,
  effectiveCondition, contestedItems,
  markDispute, resolveDispute, clearDispute,
  toSummaryItems, cleanupAtFrom,
  TENANT_PAGE_SIZE, RETENTION_YEARS,
  type InspectionEntry,
} from './inspection'
import type { InspectionItem } from './inventory'

const k = (i: number) => `k${i}`
const photo = (id = 'p1') => ({ id, thumbUrl: `https://x/${id}.jpg` })

const entry = (over: Partial<InspectionEntry> = {}): InspectionEntry =>
  makeEntry(over.key || 'k0', { name: '冷氣', unitPrice: 8000, ...over })

describe('entriesFromCatalog', () => {
  it('物品帶單價，屋況一律 0 元且不進賠償', () => {
    const out = entriesFromCatalog(
      [{ name: '冷氣', unitPrice: 8000 }, { name: '冰箱', unitPrice: 6000 }],
      ['牆面與天花板'],
      k,
    )
    expect(out).toHaveLength(3)
    expect(out[0]).toMatchObject({ key: 'k0', kind: 'asset', name: '冷氣', unitPrice: 8000 })
    expect(out[2]).toMatchObject({ key: 'k2', kind: 'condition', name: '牆面與天花板', unitPrice: 0, quantity: 1 })
  })

  it('每一項的預設爭議狀態是 agreed、照片為空', () => {
    const out = entriesFromCatalog([{ name: '冷氣', unitPrice: 100 }], [], k)
    expect(out[0]!.dispute).toBe('agreed')
    expect(out[0]!.photos).toEqual([])
  })
})

describe('seedEntriesFrom', () => {
  const prev: InspectionEntry[] = [
    entry({ key: 'old1', tenantCondition: 'total', finalCondition: 'minor', dispute: 'resolved', photos: [photo()], note: '左下刮痕' }),
    entry({ key: 'old2', kind: 'condition', name: '地板', unitPrice: 0 }),
  ]

  it('只留品項骨架，狀況與照片全部清空', () => {
    const out = seedEntriesFrom(prev, k)
    expect(out[0]).toMatchObject({ key: 'k0', kind: 'asset', name: '冷氣', unitPrice: 8000, dispute: 'agreed' })
    expect(out[0]!.tenantCondition).toBeUndefined()
    expect(out[0]!.finalCondition).toBeUndefined()
    expect(out[0]!.photos).toEqual([])
    expect(out[0]!.note).toBeUndefined()
  })

  it('保留 kind，屋況項不會被誤轉成物品', () => {
    expect(seedEntriesFrom(prev, k)[1]!.kind).toBe('condition')
  })

  it('數量與單價缺漏時回到安全預設', () => {
    const broken = [makeEntry('x', { name: '桌', quantity: NaN as any, unitPrice: undefined as any })]
    const out = seedEntriesFrom(broken, k)
    expect(out[0]!.quantity).toBe(1)
    expect(out[0]!.unitPrice).toBe(0)
  })
})

describe('entriesFromLegacy', () => {
  const legacy: InspectionItem[] = [
    { name: '冷氣', quantity: 1, unitPrice: 8000, present: true, condition: 'normal' },
    { name: '洗衣機', quantity: 1, unitPrice: 5000, present: false, condition: 'normal' },
    { name: '  ', quantity: 1, unitPrice: 0, present: true, condition: 'normal' },
  ]

  it('略過房間本來就沒有的品項與空白名稱', () => {
    const out = entriesFromLegacy(legacy, k)
    expect(out.map(e => e.name)).toEqual(['冷氣'])
  })

  it('沒有 present 欄位的舊資料視為存在', () => {
    const out = entriesFromLegacy([{ name: '書桌', quantity: 2, unitPrice: 2000 } as InspectionItem], k)
    expect(out).toHaveLength(1)
    expect(out[0]!.quantity).toBe(2)
  })
})

describe('photoRequired / entryReady', () => {
  it('只有嚴重瑕疵強制拍照', () => {
    expect(photoRequired(entry({ tenantCondition: 'total' }))).toBe(true)
    expect(photoRequired(entry({ tenantCondition: 'minor' }))).toBe(false)
    expect(photoRequired(entry({ tenantCondition: 'normal' }))).toBe(false)
  })

  it('沒有判定就不算完成', () => {
    expect(entryReady(entry())).toBe(false)
  })

  it('嚴重瑕疵沒照片不算完成，有照片才算', () => {
    expect(entryReady(entry({ tenantCondition: 'total' }))).toBe(false)
    expect(entryReady(entry({ tenantCondition: 'total', photos: [photo()] }))).toBe(true)
  })

  it('輕微瑕疵沒照片也算完成', () => {
    expect(entryReady(entry({ tenantCondition: 'minor' }))).toBe(true)
  })
})

describe('tenantProgress', () => {
  it('回報已完成與總數', () => {
    const items = [
      entry({ key: 'a', tenantCondition: 'normal' }),
      entry({ key: 'b', tenantCondition: 'total' }),
      entry({ key: 'c' }),
    ]
    expect(tenantProgress(items)).toEqual({ done: 1, total: 3 })
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 7 }, (_, i) => entry({ key: `k${i}` }))

  it('預設每頁 3 項，最後一頁不補滿', () => {
    const pages = paginate(items)
    expect(TENANT_PAGE_SIZE).toBe(3)
    expect(pages.map(p => p.length)).toEqual([3, 3, 1])
  })

  it('空清單回傳空陣列而非一個空頁', () => {
    expect(paginate([])).toEqual([])
  })

  it('size 為 0 或負數時退回每頁 1 項，不會無窮迴圈', () => {
    expect(paginate(items, 0)).toHaveLength(7)
    expect(paginate(items, -5)).toHaveLength(7)
  })
})

describe('canHandToTenant', () => {
  it('至少要有一項', () => {
    expect(canHandToTenant([])).toBe(false)
  })

  it('有品項沒填名稱就不能遞出去', () => {
    expect(canHandToTenant([entry({ name: '' })])).toBe(false)
    expect(canHandToTenant([entry({ name: '   ' })])).toBe(false)
  })

  it('全部有名稱即可', () => {
    expect(canHandToTenant([entry(), entry({ key: 'b', name: '冰箱' })])).toBe(true)
  })
})

describe('canReturnToLandlord', () => {
  it('有任一項未判定就交不回去', () => {
    expect(canReturnToLandlord([entry({ tenantCondition: 'normal' }), entry({ key: 'b' })])).toBe(false)
  })

  it('嚴重瑕疵缺照片同樣擋住', () => {
    expect(canReturnToLandlord([entry({ tenantCondition: 'total' })])).toBe(false)
  })

  it('全部完成才放行', () => {
    expect(canReturnToLandlord([
      entry({ tenantCondition: 'normal' }),
      entry({ key: 'b', tenantCondition: 'total', photos: [photo()] }),
    ])).toBe(true)
  })
})

describe('歧異流轉', () => {
  const base = entry({ tenantCondition: 'total', note: '整面都是' })

  it('標記歧異時記下房東主張，且不預設最終判定', () => {
    const d = markDispute(base, 'normal', '舊漆剝落')
    expect(d.dispute).toBe('disputed')
    expect(d.landlordCondition).toBe('normal')
    expect(d.landlordNote).toBe('舊漆剝落')
    expect(d.finalCondition).toBeUndefined()
  })

  it('標記歧異不會動到租客原本的判定與說明', () => {
    const d = markDispute(base, 'normal')
    expect(d.tenantCondition).toBe('total')
    expect(d.note).toBe('整面都是')
  })

  it('達成共識可收斂成雙方都沒主張過的第三個結果', () => {
    const r = resolveDispute(markDispute(base, 'normal'), 'minor', '折衷')
    expect(r.dispute).toBe('resolved')
    expect(r.finalCondition).toBe('minor')
    expect(r.tenantCondition).toBe('total')
    expect(r.landlordCondition).toBe('normal')
  })

  it('註記共識時未填說明則沿用標歧異時的說明', () => {
    const r = resolveDispute(markDispute(base, 'normal', '舊漆剝落'), 'minor')
    expect(r.landlordNote).toBe('舊漆剝落')
  })

  it('收回歧異會清掉房東主張與共識', () => {
    const c = clearDispute(resolveDispute(markDispute(base, 'normal'), 'minor'))
    expect(c.dispute).toBe('agreed')
    expect(c.landlordCondition).toBeUndefined()
    expect(c.finalCondition).toBeUndefined()
  })
})

describe('unresolvedCount / canSign', () => {
  const agreed = entry({ key: 'a', tenantCondition: 'normal' })
  const disputed = markDispute(entry({ key: 'b', tenantCondition: 'total', photos: [photo()] }), 'normal')
  const resolved = resolveDispute(disputed, 'minor')

  it('只有 disputed 算未解決，resolved 不算', () => {
    expect(unresolvedCount([agreed, disputed, resolved])).toBe(1)
    expect(unresolvedCount([agreed, resolved])).toBe(0)
  })

  it('還有未解決歧異就簽不了', () => {
    expect(canSign({ status: 'review', items: [agreed, disputed] })).toBe(false)
  })

  it('歧異全部達成共識即可簽', () => {
    expect(canSign({ status: 'review', items: [agreed, resolved] })).toBe(true)
  })

  it('不在 review 階段一律不能簽，即使沒有歧異', () => {
    expect(canSign({ status: 'tenant', items: [agreed] })).toBe(false)
    expect(canSign({ status: 'draft', items: [agreed] })).toBe(false)
  })

  it('空清單不能簽', () => {
    expect(canSign({ status: 'review', items: [] })).toBe(false)
  })
})

describe('effectiveCondition / contestedItems', () => {
  it('有共識用共識，沒有就用租客判定', () => {
    expect(effectiveCondition(entry({ tenantCondition: 'total' }))).toBe('total')
    expect(effectiveCondition(entry({ tenantCondition: 'total', finalCondition: 'minor' }))).toBe('minor')
  })

  it('兩者皆無時退回正常', () => {
    expect(effectiveCondition(entry())).toBe('normal')
  })

  it('曾有歧異者包含已達成共識的項目', () => {
    const agreed = entry({ key: 'a', tenantCondition: 'normal' })
    const resolved = resolveDispute(markDispute(entry({ key: 'b' }), 'normal'), 'minor')
    expect(contestedItems([agreed, resolved]).map(e => e.key)).toEqual(['b'])
  })
})

describe('toSummaryItems', () => {
  const items = [
    entry({ key: 'a', tenantCondition: 'total', finalCondition: 'minor', dispute: 'resolved', note: '刮痕' }),
    entry({ key: 'b', kind: 'condition', name: '牆面與天花板', unitPrice: 0, tenantCondition: 'minor' }),
  ]

  it('只回寫物品，屋況項不進退租資產表', () => {
    const out = toSummaryItems(items)
    expect(out.map(i => i.name)).toEqual(['冷氣'])
  })

  it('condition 取協調後的共識而非租客原判', () => {
    expect(toSummaryItems(items)[0]!.condition).toBe('minor')
  })

  it('回寫的品項一律 present true，退租儀才會逐項點交', () => {
    expect(toSummaryItems(items)[0]!.present).toBe(true)
  })
})

describe('cleanupAtFrom', () => {
  it('自結清起算 RETENTION_YEARS 年', () => {
    const settled = new Date('2030-06-15T00:00:00Z').getTime()
    expect(RETENTION_YEARS).toBe(2)
    expect(new Date(cleanupAtFrom(settled)).toISOString().slice(0, 10)).toBe('2032-06-15')
  })

  it('閏日結清不會算出無效日期', () => {
    const settled = new Date('2028-02-29T00:00:00Z').getTime()
    expect(Number.isNaN(cleanupAtFrom(settled))).toBe(false)
  })
})
