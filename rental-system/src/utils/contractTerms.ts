// 合約附件的建物設定（properties.contractTerms）。
// 條文全系統共用；現況確認書的勾選、修繕明細、賠償價目表則每棟不同，
// 簽約時依房間所屬建物帶入，並凍結進 signed_contracts.contractTerms。

export interface RepairItem {
  /** 租賃住宅範圍，如「衛浴設備」 */
  area: string
  item: string
  quantity: string
  note: string
}

export interface CompensationItem {
  item: string
  standard: string
}

export type PriorDeath = 'none' | 'known' | 'unknown'

export interface ContractTerms {
  /** 第一條：租賃住宅全部或部分出租 */
  leaseScope: 'whole' | 'partial'
  /** 附件一 1：未登記改建、增建位置；空字串＝無 */
  unregisteredAddition: string
  /** 附件一 2：現況格局，如「1室1衛」 */
  layout: string
  hasPartition: boolean
  /** 附件一 3：滲漏水；空字串＝無，有值為滲漏水處 */
  leak: string
  radiationTested: boolean
  chlorideTested: boolean
  /** 附件一 6：產權持有期間是否曾發生非自然死亡 */
  deathDuringOwnership: boolean
  deathBeforeOwnership: PriorDeath
  waterNormal: boolean
  hasCommunityRules: boolean
  hasManagementCommittee: boolean
  /** 附件一 10：附屬設備，自由填寫 */
  equipment: string
  /** 附件一 10 備註：鑰匙、門卡 */
  keys: string
  repairItems: RepairItem[]
  compensationItems: CompensationItem[]
}

const REPAIR_ITEMS: RepairItem[] = [
  { area: '室外', item: '洗衣機', quantity: '1', note: '定期清潔保養' },
  { area: '室外', item: '冰箱', quantity: '1', note: '定期清潔保養' },
  { area: '室外', item: '飲水機', quantity: '1', note: '定期更換濾心及保養' },
  { area: '室外', item: '燈具', quantity: '全部', note: '' },
  { area: '室外', item: '香氛機', quantity: '1', note: '定期更換' },
  { area: '客餐廳及臥室', item: '燈具', quantity: '全部', note: '' },
  { area: '客餐廳及臥室', item: '電視', quantity: '1', note: '' },
  { area: '客餐廳及臥室', item: '機上盒', quantity: '1', note: '' },
  { area: '客餐廳及臥室', item: '冷氣', quantity: '1', note: '' },
  { area: '衛浴設備', item: '蓮蓬頭', quantity: '1', note: '' },
  { area: '衛浴設備', item: '水管', quantity: '1', note: '' },
  { area: '衛浴設備', item: '馬桶', quantity: '1', note: '' },
  { area: '衛浴設備', item: '洗手台', quantity: '1', note: '' },
  { area: '衛浴設備', item: '電熱水器', quantity: '1', note: '' },
  { area: '其他', item: '電子鎖', quantity: '1', note: '半年更換電池' },
  { area: '其他', item: '門鎖', quantity: '1', note: '' },
]

const COMPENSATION_ITEMS: CompensationItem[] = [
  { item: '牆面油漆', standard: '每面：1 公升底漆 475 元 ＋ 面漆 515 元（立邦 1 公升裝）' },
  { item: '桌子', standard: '桌面刮損 200 元；致不能使用 1,000 元' },
  { item: '椅子', standard: '汙損、椅墊破損 500 元' },
  { item: '電視', standard: '惡意破壞致功能受損者，全額賠償 4,280 元，或自行購買同品牌更換（Philips 飛利浦 32 型 HD 薄邊框液晶顯示器 32PHH5678）' },
  { item: '衣櫃', standard: '汙損致不能使用，全額賠償 4,500 元及清運費用 500 元' },
  { item: '電熱水器', standard: '惡意破壞致功能受損者，全額賠償 14,200 元及清運費用 500 元（HCG 和成 橫掛式儲熱電能熱水器 20 加侖 EH20BAW4，含基本安裝）' },
  { item: '冷氣', standard: '請定期清潔濾網灰塵；退租時若未清潔，限期改善或按市價酌收冷氣清洗費用 2,000 元' },
  { item: '環境整潔', standard: '包含全戶打掃、廁所清潔等，若未清潔，按清潔市價收費 2,500 元（6–7 坪）至 5,000 元（8–10 坪）' },
]

/** 尚未設定的建物：現況全部填「無／正常」，修繕與賠償沿用範例清單 */
export const defaultContractTerms = (): ContractTerms => ({
  leaseScope: 'partial',
  unregisteredAddition: '',
  layout: '',
  hasPartition: false,
  leak: '',
  radiationTested: false,
  chlorideTested: false,
  deathDuringOwnership: false,
  deathBeforeOwnership: 'none',
  waterNormal: true,
  hasCommunityRules: false,
  hasManagementCommittee: false,
  equipment: '',
  keys: '鑰匙 1 副、門卡 1 張',
  repairItems: REPAIR_ITEMS.map(r => ({ ...r })),
  compensationItems: COMPENSATION_ITEMS.map(c => ({ ...c })),
})

/** 復興路版本（docs/contract_template.md）的完整內容，供建物設定一鍵套用 */
export const fuxingPresetTerms = (): ContractTerms => ({
  ...defaultContractTerms(),
  unregisteredAddition: '頂樓',
  layout: '1室1衛',
})

const BLANK_REPAIR: RepairItem = { area: '', item: '', quantity: '', note: '' }
const BLANK_COMPENSATION: CompensationItem = { item: '', standard: '' }

/** 補齊缺欄位；舊資料或部分儲存的設定都能安全使用 */
export const normalizeContractTerms = (t?: Partial<ContractTerms> | null): ContractTerms => {
  const base = defaultContractTerms()
  if (!t) return base
  return {
    ...base,
    ...t,
    repairItems: Array.isArray(t.repairItems) ? t.repairItems.map(r => ({ ...BLANK_REPAIR, ...r })) : base.repairItems,
    compensationItems: Array.isArray(t.compensationItems)
      ? t.compensationItems.map(c => ({ ...BLANK_COMPENSATION, ...c }))
      : base.compensationItems,
  }
}
