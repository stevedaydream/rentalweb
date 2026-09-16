import { describe, it, expect } from 'vitest'
import { buildContractPayload, escapeHtml } from './contractPayload'
import { fuxingPresetTerms, normalizeContractTerms } from './contractTerms'
import template from '../templates/contractTemplate.html?raw'

const base = { tenant: '王小明', landlord: '房東', rentfee: 8000, paymentDay: 5, paymentFrequency: 'monthly' }

describe('合約範本填值', () => {
  it('範本裡的每個欄位都有對應的值，不會留下空白佔位', () => {
    const payload = buildContractPayload(base)
    const keys = [...template.matchAll(/{{(.*?)}}/g)].map(m => m[1]!.trim())
    const missing = [...new Set(keys)].filter(k => payload[k] === undefined)
    // 以下為簽約資料本身的欄位，此測試資料沒有填
    expect(missing.sort()).toEqual(['address', 'deposit', 'endDate', 'landlordId', 'landlordPhone', 'roomNo', 'startDate', 'tenantId', 'tenantPhone', 'today'].sort())
  })

  it('費用負擔轉成條文文字，電費附帶備註', () => {
    const p = buildContractPayload({ ...base, feeWater: 'landlord', feeElectricity: 'tenant', feeElectricityNote: '每度5元', feeGas: 'none' })
    expect(p.feeWaterDisplay).toBe('由出租人負擔')
    expect(p.feeElectricityDisplay).toBe('由承租人負擔（備註：每度5元）')
    expect(p.feeGasDisplay).toBe('無')
  })

  it('繳費週期決定每期月數、合計金額與繳款日寫法', () => {
    const monthly = buildContractPayload(base)
    expect(monthly.paymentMonths).toBe(1)
    expect(monthly.paymentDueDisplay).toContain('■每月 5 日')
    const quarterly = buildContractPayload({ ...base, paymentFrequency: 'quarterly' })
    expect(quarterly.paymentMonths).toBe(3)
    expect(quarterly.billingAmount).toBe('24,000')
    expect(quarterly.paymentDueDisplay).toContain('■每期（每季）第 5 日')
  })

  it('有收款帳戶勾轉帳，沒有則勾現金', () => {
    expect(buildContractPayload({ ...base, bankCode: '013', bankAccount: '123', bankAccountName: '房東' }).paymentMethodDisplay)
      .toContain('■轉帳繳付：金融機構代碼 013，戶名 房東，帳號 123')
    expect(buildContractPayload(base).paymentMethodDisplay).toContain('■現金繳付')
  })

  it('沒有建物設定時現況全部為無，復興路版本勾選頂樓增建與格局', () => {
    const plain = buildContractPayload(base).statusTableHtml as string
    expect(plain).toContain('□有　■無 包括未登記之改建')
    const fx = buildContractPayload({ ...base, contractTerms: fuxingPresetTerms() }).statusTableHtml as string
    expect(fx).toContain('■有　□無 包括未登記之改建、增建、加建、違建部分：頂樓')
    expect(fx).toContain('建物現況格局：1室1衛，□有　■無 隔間')
    expect(buildContractPayload({ ...base, contractTerms: { leaseScope: 'whole' } }).leaseScopeDisplay).toBe('■全部　□部分')
  })

  it('修繕明細與賠償價目表逐列輸出，略過空白列並跳脫文字', () => {
    const terms = normalizeContractTerms({
      repairItems: [{ area: '衛浴', item: '<馬桶>', quantity: '1', note: '' }, { area: '', item: ' ', quantity: '', note: '' }],
      compensationItems: [],
    })
    const p = buildContractPayload({ ...base, contractTerms: terms })
    expect(p.repairTableHtml).toContain('&lt;馬桶&gt;')
    expect((p.repairTableHtml as string).match(/<tr>/g)).toHaveLength(2)
    expect(p.compensationTableHtml).toContain('>無<')
  })

  it('沒簽名時給透明圖，不會印出破圖', () => {
    const p = buildContractPayload(base)
    expect(String(p.signature)).toMatch(/^data:image\/gif/)
    expect(buildContractPayload({ ...base, signature: 'data:image/png;base64,x' }).signature).toBe('data:image/png;base64,x')
  })

  it('跳脫 HTML 特殊字元', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })
})
