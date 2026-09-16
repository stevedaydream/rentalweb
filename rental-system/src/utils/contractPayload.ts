// 合約範本的填值：把合約資料（簽約表單或 signed_contracts）轉成
// contractTemplate.html 的 {{欄位}}。預覽、本地列印、伺服端 generatePdf 共用，
// 避免各頁各自組一份而走鐘。範本只做字串替換，勾選與表格在這裡先組成 HTML。
import { normalizeContractTerms, type ContractTerms, type PriorDeath } from './contractTerms'

type ContractData = Record<string, any>

const ON = '■'
const OFF = '□'
const box = (on: boolean) => (on ? ON : OFF)
const BLANK = '＿＿＿'

// 範本以 {{}} 原樣插入，建物設定這類自由文字要先跳脫
export const escapeHtml = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const orBlank = (v: unknown) => (String(v ?? '').trim() ? escapeHtml(v) : BLANK)

// 沒簽名時給透明圖，避免 <img src=""> 印出破圖
const EMPTY_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const payerText = (v?: string) => {
  if (!v || v === 'none') return '無'
  if (v === 'landlord') return '由出租人負擔'
  if (v === 'tenant') return '由承租人負擔'
  return v
}

const FREQUENCY: Record<string, { months: number; label: string }> = {
  monthly: { months: 1, label: '月' },
  quarterly: { months: 3, label: '季' },
  semiannual: { months: 6, label: '半年' },
  yearly: { months: 12, label: '年' },
}

const PRIOR_DEATH: Record<PriorDeath, string> = { none: '無上列情事', known: '知道曾發生上列情事', unknown: '不知道曾否發生上列情事' }

const choice = (options: [boolean, string][]) => options.map(([on, label]) => `${box(on)}${label}`).join('　')

const statusTableHtml = (t: ContractTerms): string => {
  const rows: [string, string][] = [
    [
      `${choice([[!!t.unregisteredAddition, '有'], [!t.unregisteredAddition, '無']])} 包括未登記之改建、增建、加建、違建部分`
        + (t.unregisteredAddition ? `：${escapeHtml(t.unregisteredAddition)}` : '。'),
      '若為違建（未依法申請增、加建之建物），出租人應確實加以說明，使承租人得以充分認知此範圍之建物隨時有被拆除之虞或其他危險。',
    ],
    [`建物現況格局：${orBlank(t.layout)}，${choice([[t.hasPartition, '有'], [!t.hasPartition, '無']])} 隔間。`, ''],
    [
      `${choice([[!!t.leak, '有'], [!t.leak, '無']])} 滲漏水之情形`
        + (t.leak ? `，滲漏水處：${escapeHtml(t.leak)}。` : '。'),
      '',
    ],
    [
      `${choice([[t.radiationTested, '有'], [!t.radiationTested, '無']])} 曾經做過輻射屋檢測；若有，請檢附檢測證明文件。`,
      '七十一年至七十三年領得使用執照之建築物，應特別留意檢測。行政院原子能委員會網站已提供「現年劑量達1毫西弗以上輻射屋查詢系統」供民眾查詢輻射屋資訊，如欲進行改善，應向行政院原子能委員會洽詢技術協助。',
    ],
    [`${choice([[t.chlorideTested, '有'], [!t.chlorideTested, '無']])} 曾經做過鋼筋混凝土中水溶性氯離子含量檢測（例如海砂屋檢測事項）。`, ''],
    [
      '本租賃住宅（專有部分）是否曾發生兇殺、自殺、一氧化碳中毒或其他非自然死亡之情事：<br>'
        + `（1）於產權持有期間 ${choice([[t.deathDuringOwnership, '有'], [!t.deathDuringOwnership, '無']])} 曾發生上列情事。<br>`
        + `（2）於產權持有前：${(Object.keys(PRIOR_DEATH) as PriorDeath[]).map(k => `${box(t.deathBeforeOwnership === k)}${PRIOR_DEATH[k]}`).join('　')}`,
      '',
    ],
    [`供水及排水 ${choice([[t.waterNormal, '是'], [!t.waterNormal, '否']])} 正常。`, ''],
    [`${choice([[t.hasCommunityRules, '有'], [!t.hasCommunityRules, '無']])} 公寓大廈規約或其他住戶應遵行事項。`, ''],
    [`${choice([[t.hasManagementCommittee, '有'], [!t.hasManagementCommittee, '無']])} 管理委員會統一管理。`, '停車位管理費以清潔費名義收取者亦同。'],
    [
      `附屬設備項目：${orBlank(t.equipment)}`,
      `<strong>屋內物品如有損壞，應照價賠償。</strong>${t.keys ? `<br>${escapeHtml(t.keys)}` : ''}`,
    ],
  ]
  const body = rows.map(([content, note], i) =>
    `<tr><td class="center">${i + 1}</td><td>${content}</td><td>${note}</td></tr>`).join('')
  return `<table><thead><tr><th style="width:8%">項次</th><th style="width:52%">內容</th><th>備註說明</th></tr></thead><tbody>${body}</tbody></table>`
}

const repairTableHtml = (t: ContractTerms): string => {
  const items = t.repairItems.filter(r => r.item.trim())
  const body = items.length
    ? items.map(r => `<tr><td>${escapeHtml(r.area)}</td><td>${escapeHtml(r.item)}</td><td class="center">${escapeHtml(r.quantity)}</td><td>${escapeHtml(r.note)}</td></tr>`).join('')
    : '<tr><td colspan="4" class="center">無</td></tr>'
  return `<table><thead><tr><th>租賃住宅範圍</th><th>設備或設施項目</th><th>數量</th><th>備註</th></tr></thead><tbody>${body}</tbody></table>`
}

const compensationTableHtml = (t: ContractTerms): string => {
  const items = t.compensationItems.filter(c => c.item.trim())
  const body = items.length
    ? items.map(c => `<tr><td style="width:22%">${escapeHtml(c.item)}</td><td>${escapeHtml(c.standard)}</td></tr>`).join('')
    : '<tr><td colspan="2" class="center">無</td></tr>'
  return `<table><thead><tr><th>項目</th><th>賠償標準</th></tr></thead><tbody>${body}</tbody></table>`
}

export const buildContractPayload = (data: ContractData): Record<string, unknown> => {
  const terms = normalizeContractTerms(data.contractTerms)
  const freq = FREQUENCY[data.paymentFrequency] ?? FREQUENCY.monthly!
  const rent = Number(data.rentfee) || 0
  const day = data.paymentDay || 5
  const elec = payerText(data.feeElectricity)
  const hasBank = !!String(data.bankAccount ?? '').trim()

  return {
    ...data,
    // 簽約時依建物水費設定產生的文字優先；舊合約與未設定者沿用範本的負擔方式
    feeWaterDisplay: data.waterFeeText || payerText(data.feeWater),
    feeElectricityDisplay: data.feeElectricityNote ? `${elec}（備註：${data.feeElectricityNote}）` : elec,
    feeGasDisplay: payerText(data.feeGas),
    feeInternetDisplay: payerText(data.feeInternet),
    feeManagementDisplay: payerText(data.feeManagement),
    customArticle21Display: data.customArticle21 || '',

    leaseScopeDisplay: choice([[terms.leaseScope === 'whole', '全部'], [terms.leaseScope === 'partial', '部分']]),
    hasEquipmentDisplay: choice([[true, '有'], [false, '無']]),
    paymentMonths: freq.months,
    billingAmount: (rent * freq.months).toLocaleString('zh-TW'),
    paymentDueDisplay: freq.months === 1
      ? `${ON}每月 ${day} 日　${OFF}每期${BLANK}`
      : `${OFF}每月${BLANK}日　${ON}每期（每${freq.label}）第 ${day} 日`,
    paymentMethodDisplay: hasBank
      ? `${OFF}現金繳付　${ON}轉帳繳付：金融機構代碼 ${escapeHtml(data.bankCode)}，戶名 ${escapeHtml(data.bankAccountName)}，帳號 ${escapeHtml(data.bankAccount)}。　${OFF}其他`
      : `${ON}現金繳付　${OFF}轉帳繳付　${OFF}其他`,

    landlordAddress: data.landlordAddress || '',
    tenantAddress: data.tenantAddress || '',
    tenantMailAddress: data.tenantMailAddress || data.tenantAddress || '',
    guarantor: data.guarantor || '',
    guarantorId: data.guarantorId || '',
    guarantorAddress: data.guarantorAddress || '',
    guarantorMailAddress: data.guarantorMailAddress || data.guarantorAddress || '',
    guarantorPhone: data.guarantorPhone || '',
    guarantorCopyDisplay: box(!!String(data.guarantor ?? '').trim()),

    statusTableHtml: statusTableHtml(terms),
    repairTableHtml: repairTableHtml(terms),
    compensationTableHtml: compensationTableHtml(terms),

    signature: data.signature || EMPTY_IMG,
    landlordSignature: data.landlordSignature || EMPTY_IMG,
    templateType: 'Contract',
  }
}
