import { describe, it, expect } from 'vitest'
import {
  escapeHtml, buildItemRows, buildContestedSection, buildPhotoSection,
  buildPdfData, pdfFileName,
} from './inspectionPdf'
import { makeEntry, markDispute, resolveDispute, type InspectionEntry } from './inspection'

const entry = (over: Partial<InspectionEntry> = {}): InspectionEntry =>
  makeEntry(over.key || 'k0', { name: '冷氣', quantity: 1, unitPrice: 8000, ...over })

const photo = (id = 'p1', thumbUrl = 'https://x/p1.jpg') => ({ id, thumbUrl })

describe('escapeHtml', () => {
  it('跳脫會破壞版面或注入標籤的字元', () => {
    expect(escapeHtml('<img onerror="x">')).toBe('&lt;img onerror=&quot;x&quot;&gt;')
    expect(escapeHtml("A&B'C")).toBe('A&amp;B&#39;C')
  })

  it('null 與 undefined 回空字串而非字面值', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })
})

describe('buildItemRows', () => {
  it('物品列出數量與單價', () => {
    const html = buildItemRows([entry({ tenantCondition: 'normal' })])
    expect(html).toContain('物品')
    expect(html).toContain('NT$ 8,000')
  })

  it('單價一律標示單位，避免被誤讀為總價', () => {
    const html = buildItemRows([entry({ tenantCondition: 'normal' })])
    expect(html).toContain('/件')
  })

  it('數量大於一時附上全損上限', () => {
    const html = buildItemRows([entry({ quantity: 2, tenantCondition: 'normal' })])
    expect(html).toContain('NT$ 8,000')
    expect(html).toContain('上限 NT$ 16,000')
  })

  it('單件不顯示上限，免得每一列都多一行雜訊', () => {
    expect(buildItemRows([entry({ tenantCondition: 'normal' })])).not.toContain('上限')
  })

  it('說明含快捷原因與自由文字', () => {
    const html = buildItemRows([entry({
      tenantCondition: 'minor', reasons: ['髒汙', '打洞'], note: '靠窗那面',
    })])
    expect(html).toContain('髒汙、打洞、靠窗那面')
  })

  it('屋況項不列單價，避免看起來像可以求償', () => {
    const html = buildItemRows([entry({ kind: 'condition', name: '牆面', unitPrice: 0, tenantCondition: 'minor' })])
    expect(html).toContain('屋況')
    expect(html).not.toContain('NT$')
  })

  it('最終狀況取共識，租客判定原樣保留', () => {
    const e = resolveDispute(markDispute(entry({ tenantCondition: 'total' }), 'normal'), 'minor')
    const html = buildItemRows([e])
    expect(html).toContain('嚴重瑕疵')
    expect(html).toContain('輕微瑕疵')
  })

  it('品項名稱經過跳脫', () => {
    const html = buildItemRows([entry({ name: '<b>冷氣</b>', tenantCondition: 'normal' })])
    expect(html).not.toContain('<b>冷氣</b>')
    expect(html).toContain('&lt;b&gt;冷氣&lt;/b&gt;')
  })
})

describe('buildContestedSection', () => {
  const agreed = entry({ key: 'a', tenantCondition: 'normal' })
  const resolved = resolveDispute(
    markDispute(entry({ key: 'b', name: '牆面', tenantCondition: 'total' }), 'normal', '舊漆剝落'),
    'minor',
  )

  it('沒有歧異時整段消失，不留空表格', () => {
    expect(buildContestedSection([agreed])).toBe('')
  })

  it('列出三方判定與說明', () => {
    const html = buildContestedSection([agreed, resolved])
    expect(html).toContain('牆面')
    expect(html).toContain('舊漆剝落')
    expect(html).toContain('協調紀錄')
  })

  it('只收曾有歧異的項目', () => {
    expect(buildContestedSection([agreed, resolved])).not.toContain('冷氣')
  })
})

describe('buildPhotoSection', () => {
  it('沒有照片時整段消失', () => {
    expect(buildPhotoSection([entry({ tenantCondition: 'normal' })])).toBe('')
  })

  it('只收有縮圖網址的照片；純本地待傳的不進 PDF', () => {
    const local = entry({ key: 'a', tenantCondition: 'total', photos: [{ id: 'p1', thumbUrl: '', pending: true }] })
    expect(buildPhotoSection([local])).toBe('')
  })

  it('列出品項與其縮圖', () => {
    const html = buildPhotoSection([entry({ tenantCondition: 'total', photos: [photo()] })])
    expect(html).toContain('瑕疵存證')
    expect(html).toContain('https://x/p1.jpg')
  })
})

describe('buildPdfData', () => {
  const insp = {
    id: 'abcdef123456',
    type: 'movein' as const,
    tenantName: '王小明',
    roomName: '3F-A',
    items: [
      entry({ key: 'a', tenantCondition: 'normal' }),
      resolveDispute(markDispute(entry({ key: 'b', name: '牆面', tenantCondition: 'total' }), 'normal'), 'minor'),
    ],
  }
  const extra = {
    today: '2026-08-23',
    landlordSignature: 'data:image/png;base64,AAA',
    tenantSignature: 'data:image/png;base64,BBB',
  }

  it('編號取文件 id 末八碼', () => {
    expect(buildPdfData(insp, extra).inspectionNo).toBe('EF123456')
  })

  it('標題依點交類型切換', () => {
    expect(buildPdfData(insp, extra).title).toBe('入住點交確認單')
    expect(buildPdfData({ ...insp, type: 'moveout' }, extra).title).toBe('退租點交確認單')
  })

  it('統計項目數與曾有歧異數', () => {
    const d = buildPdfData(insp, extra)
    expect(d.itemCount).toBe('2')
    expect(d.contestedCount).toBe('1')
  })

  it('簽名圖原樣帶入，不被跳脫破壞 data URL', () => {
    expect(buildPdfData(insp, extra).landlordSignature).toBe('data:image/png;base64,AAA')
  })

  it('沒有租約期間時以破折號填補，不留空白欄', () => {
    expect(buildPdfData(insp, extra).leaseStart).toBe('—')
  })
})

describe('pdfFileName', () => {
  it('帶入類型、姓名、日期與文件末四碼', () => {
    expect(pdfFileName({ id: 'abcdef1234', tenantName: '王小明', type: 'movein' }, '2026-08-23'))
      .toBe('入住點交確認單_王小明_2026-08-23_1234')
  })

  it('同日同租客的兩份不會撞名', () => {
    const a = pdfFileName({ id: 'aaaa1111', tenantName: '王', type: 'movein' }, '2026-08-23')
    const b = pdfFileName({ id: 'bbbb2222', tenantName: '王', type: 'movein' }, '2026-08-23')
    expect(a).not.toBe(b)
  })

  it('沒有姓名時仍產生可用檔名', () => {
    expect(pdfFileName({ id: 'aaaa1111', tenantName: '', type: 'movein' }, '2026-08-23'))
      .toContain('租客')
  })
})
