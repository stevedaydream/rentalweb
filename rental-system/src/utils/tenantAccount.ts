/**
 * 租客登入帳號狀態（純函式）。
 *
 * 「是否登入過」只有 Firebase Auth 知道，前端拿不到，故由
 * `getTenantAccountStatus` callable 取回後在這裡判定顯示狀態。
 */

/** 由 getTenantAccountStatus 回傳的單筆狀態 */
export interface AccountStatus {
  exists: boolean
  /** 從未登入為 null */
  lastSignInAt: string | null
  createdAt: string | null
  disabled: boolean
  lineBound: boolean
}

export type AccountStateKey =
  | 'none'      // 尚未建立帳號
  | 'pending'   // 已建立但從未登入
  | 'active'    // 登入過
  | 'disabled'  // 已停用
  | 'orphan'    // tenants.uid 指向已刪除的 Auth 帳號
  | 'loading'   // 尚未查回

export interface AccountState {
  key: AccountStateKey
  label: string
  /** 最後登入日 YYYY-MM-DD，未登入為 null */
  lastSignInDate: string | null
  lineBound: boolean
}

const LABELS: Record<AccountStateKey, string> = {
  none: '未建立帳號',
  pending: '已建立未登入',
  active: '已啟用',
  disabled: '已停用',
  orphan: '帳號已不存在',
  loading: '查詢中',
}

const toDate = (iso: string | null): string | null => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/**
 * 判定顯示狀態。
 *
 * `statuses` 尚未查回（undefined）與「查回但查無此 uid」是兩回事：
 * 前者是 loading，後者代表 Auth 帳號已被刪除，得讓房東看得出差別。
 */
export const accountStateOf = (
  tenant: { uid?: string },
  statuses: Record<string, AccountStatus> | null,
): AccountState => {
  const blank = { lastSignInDate: null, lineBound: false }

  if (!tenant.uid) return { key: 'none', label: LABELS.none, ...blank }
  if (!statuses) return { key: 'loading', label: LABELS.loading, ...blank }

  const s = statuses[tenant.uid]
  if (!s || !s.exists) return { key: 'orphan', label: LABELS.orphan, ...blank }

  const lastSignInDate = toDate(s.lastSignInAt)
  // 停用優先顯示——房東最該先知道的是「這個人現在進不來」
  if (s.disabled) {
    return { key: 'disabled', label: LABELS.disabled, lastSignInDate, lineBound: s.lineBound }
  }
  if (!lastSignInDate) {
    return { key: 'pending', label: LABELS.pending, lastSignInDate: null, lineBound: s.lineBound }
  }
  return { key: 'active', label: LABELS.active, lastSignInDate, lineBound: s.lineBound }
}

/** 列表徽章樣式 */
export const ACCOUNT_BADGE: Record<AccountStateKey, string> = {
  none: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  disabled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  orphan: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  loading: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
}

/** 統計各狀態筆數，供列表上方彙總 */
export const summarizeAccounts = (
  tenants: { uid?: string }[],
  statuses: Record<string, AccountStatus> | null,
): Record<AccountStateKey, number> => {
  const out: Record<AccountStateKey, number> = {
    none: 0, pending: 0, active: 0, disabled: 0, orphan: 0, loading: 0,
  }
  tenants.forEach(t => { out[accountStateOf(t, statuses).key]++ })
  return out
}
