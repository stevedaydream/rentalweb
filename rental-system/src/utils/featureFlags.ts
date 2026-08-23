/**
 * 功能維護開關的清單定義。
 *
 * 某個功能出包時，管理員把對應身分的開關關掉，該身分的側邊選單就不再出現這一項，
 * 直接輸入網址也會被路由守衛擋到「功能維修中」頁，不必等改版重新部署。
 *
 * 儀表板與系統設定刻意不列入：那是進站後的落點，關掉會讓人一進來就卡在維修頁。
 */

export type FeatureRole = 'landlord' | 'tenant'

export interface FeatureDef {
  id: string
  label: string
  /** 這個功能涵蓋的路由名稱（含全螢幕模式等附屬頁） */
  routes: string[]
}

export const LANDLORD_FEATURES: FeatureDef[] = [
  { id: 'rooms',         label: '房源管理', routes: ['RoomManagement'] },
  { id: 'tenants',       label: '租客列表', routes: ['TenantList', 'OnboardingMode'] },
  { id: 'financials',    label: '帳務管理', routes: ['Financials'] },
  { id: 'meter',         label: '電表登錄', routes: ['MeterReading'] },
  { id: 'meter-history', label: '電表歷史', routes: ['MeterReadingHistory'] },
  { id: 'repairs',       label: '報修管理', routes: ['RepairRequests'] },
  { id: 'messages',      label: '訊息中心', routes: ['LandlordMessages'] },
  { id: 'announcements', label: '社區公告', routes: ['LandlordAnnouncements'] },
  { id: 'contract',      label: '電子合約', routes: ['Contract'] },
  { id: 'receipts',      label: '收據產生', routes: ['Receipts'] },
  { id: 'investment',    label: '投資試算', routes: ['InvestmentCalculator'] },
  { id: 'building',      label: '大樓資訊', routes: ['LandlordBuildingInfo'] },
  { id: 'reviews',       label: '評價管理', routes: ['LandlordReviews'] },
  { id: 'inspection',    label: '雙方點交', routes: ['InspectionSession'] },
]

export const TENANT_FEATURES: FeatureDef[] = [
  { id: 'bills',         label: '我的帳單', routes: ['TenantBills'] },
  { id: 'announcements', label: '社區公告', routes: ['TenantAnnouncements'] },
  { id: 'repairs',       label: '報修申請', routes: ['TenantRepairs'] },
  { id: 'contact',       label: '聯繫房東', routes: ['ContactLandlord'] },
  { id: 'building',      label: '大樓資訊', routes: ['TenantBuildingInfo'] },
  { id: 'contract',      label: '我的合約', routes: ['TenantMyContract'] },
  { id: 'inspection',    label: '入住點交', routes: ['TenantInspection'] },
]

export const FEATURES_BY_ROLE: Record<FeatureRole, FeatureDef[]> = {
  landlord: LANDLORD_FEATURES,
  tenant: TENANT_FEATURES,
}

export const ROLE_LABELS: Record<FeatureRole, string> = {
  landlord: '房東端',
  tenant: '租客端',
}

/** 儲存於 system_config/features.disabled 的鍵 */
export const flagKey = (role: FeatureRole, featureId: string) => `${role}.${featureId}`

const ROUTE_INDEX: Record<string, { role: FeatureRole; feature: FeatureDef }> = {}
;(Object.keys(FEATURES_BY_ROLE) as FeatureRole[]).forEach((role) => {
  FEATURES_BY_ROLE[role].forEach((feature) => {
    feature.routes.forEach((routeName) => { ROUTE_INDEX[routeName] = { role, feature } })
  })
})

/** 這個路由屬於哪個身分的哪個功能；不在清單內回 null（代表不受開關管轄） */
export const featureForRoute = (routeName: unknown) =>
  (typeof routeName === 'string' ? ROUTE_INDEX[routeName] : undefined) ?? null
