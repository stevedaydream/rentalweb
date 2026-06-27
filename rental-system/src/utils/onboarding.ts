// 租客上線流程共用：步驟定義、進度狀態(可退出/暫存)、生命週期燈號。
// 由 OnboardingMode（全螢幕模式）、Dashboard 入口、TenantList 燈號共用。

export type OnboardingStepKey = 'profile' | 'contract' | 'receipt' | 'inspection'

export interface OnboardingStepDef {
  key: OnboardingStepKey
  label: string
  required: boolean
  icon: string
}

// ①建檔(必) → ②簽約 → ③收押金 → ④入住點交（後三步可略過）
export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  { key: 'profile', label: '建檔', required: true, icon: 'badge' },
  { key: 'contract', label: '簽約', required: false, icon: 'draw' },
  { key: 'receipt', label: '收押金', required: false, icon: 'receipt_long' },
  { key: 'inspection', label: '入住點交', required: false, icon: 'checklist' },
]

// 存於 tenants/{id}.onboarding：完成的步驟本身已落地為真資料，
// 這裡只記目前進度 + 略過清單 + 進行中草稿，供「儲存退出 / 繼續上線」。
export interface OnboardingState {
  status: 'in_progress' | 'completed'
  step: number // 1-based 目前步驟
  skipped: OnboardingStepKey[]
  draft: Record<string, any>
  updatedAt?: any
}

// ── 生命週期燈號 ──
export type LifecycleKey =
  | 'onboarding' | 'await_contract' | 'await_inspection' | 'active' | 'moved_out'

export interface Lifecycle { key: LifecycleKey; label: string }

// 從租客現有欄位衍生狀態（不需額外維護）
export function tenantLifecycle(t: any): Lifecycle {
  if (t?.isHistorical) return { key: 'moved_out', label: '已退租' }
  const ob = t?.onboarding
  if (ob?.status === 'in_progress') {
    const label = ONBOARDING_STEPS[(ob.step || 1) - 1]?.label || ''
    return { key: 'onboarding', label: `上線中・${label}` }
  }
  if (!t?.contractId) return { key: 'await_contract', label: '待簽約' }
  if (!t?.moveInInspection) return { key: 'await_inspection', label: '待點交' }
  return { key: 'active', label: '入住中' }
}

// 燈號樣式（完整 class 字串，避免 Tailwind JIT 漏掃）
export const LIFECYCLE_BADGE: Record<LifecycleKey, string> = {
  onboarding: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  await_contract: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  await_inspection: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  moved_out: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}
