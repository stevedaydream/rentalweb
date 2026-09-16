<template>
  <div class="space-y-6">
    <!-- 本月數字。收款頁只講「還要收多少」，金額結構放這裡 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
        <p class="text-xs text-text-secondary-light mb-1 flex items-center gap-1">
          <span class="material-symbols-outlined text-[16px] text-green-500" aria-hidden="true">payments</span>本月已收
        </p>
        <p class="text-2xl font-bold text-green-600">NT$ {{ stats.income.toLocaleString() }}</p>
        <p class="text-xs text-text-secondary-light mt-1">{{ stats.incomeCount }} 筆</p>
      </div>
      <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
        <p class="text-xs text-text-secondary-light mb-1 flex items-center gap-1">
          <span class="material-symbols-outlined text-[16px] text-orange-500" aria-hidden="true">pending_actions</span>本月待收
        </p>
        <p class="text-2xl font-bold text-orange-500">NT$ {{ stats.pending.toLocaleString() }}</p>
        <p class="text-xs text-text-secondary-light mt-1">{{ stats.pendingCount }} 筆・不含前期欠款</p>
      </div>
      <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
        <p class="text-xs text-text-secondary-light mb-1 flex items-center gap-1">
          <span class="material-symbols-outlined text-[16px] text-red-400" aria-hidden="true">arrow_upward</span>本月支出
        </p>
        <p class="text-2xl font-bold text-red-500">NT$ {{ stats.expense.toLocaleString() }}</p>
        <p class="text-xs text-text-secondary-light mt-1">{{ stats.expenseCount }} 筆</p>
      </div>
      <div class="p-5 rounded-xl border shadow-sm"
        :class="stats.net >= 0
          ? 'bg-gold-50 dark:bg-gold-900/10 border-gold-100 dark:border-gold-900/30'
          : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'">
        <p class="text-xs mb-1 flex items-center gap-1"
          :class="stats.net >= 0 ? 'text-gold-700 dark:text-gold-300' : 'text-red-600'">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">account_balance</span>本月淨利
        </p>
        <p class="text-2xl font-bold" :class="stats.net >= 0 ? 'text-gold-600' : 'text-red-500'">
          NT$ {{ stats.net.toLocaleString() }}
        </p>
        <p class="text-xs mt-1" :class="stats.net >= 0 ? 'text-gold-500' : 'text-red-400'">已收 − 支出</p>
      </div>
    </div>

    <!-- 類別明細。點一列回到收款頁並套用該類別，不再用一排大卡片佔版面 -->
    <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm overflow-hidden">
      <div class="px-5 py-3 border-b border-ink-100 dark:border-ink-800">
        <h2 class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">類別明細</h2>
        <p class="text-xs text-text-secondary-light mt-0.5">金額為本月開出的帳單總額（非實收）</p>
      </div>
      <ul class="divide-y divide-ink-50 dark:divide-ink-800">
        <li v-for="cat in categories" :key="cat.key">
          <button
            @click="emit('select-category', cat.key)"
            :disabled="cat.count === 0"
            class="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors enabled:hover:bg-surface-light dark:enabled:hover:bg-surface-dark disabled:opacity-40 disabled:cursor-default"
          >
            <span class="material-symbols-outlined text-[20px] shrink-0" :class="cat.iconColor" aria-hidden="true">{{ cat.icon }}</span>
            <span class="text-sm font-medium text-text-primary-light dark:text-text-primary-dark flex-1 min-w-0 truncate">{{ cat.label }}</span>
            <span class="text-xs font-medium px-2 py-0.5 rounded-full shrink-0" :class="cat.badgeClass">{{ cat.count }} 筆</span>
            <span class="text-base font-bold shrink-0 w-28 text-right" :class="cat.amountColor">NT$ {{ cat.amount.toLocaleString() }}</span>
            <span class="material-symbols-outlined text-[18px] text-ink-300 shrink-0" aria-hidden="true">chevron_right</span>
          </button>
        </li>
      </ul>
    </div>

    <!-- 水費盈虧：本月帳務日期內的台水支出與向租客收的水費，逐棟比較 -->
    <div class="space-y-3">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">水費盈虧</h2>
          <p class="text-xs text-text-secondary-light mt-0.5">依本月登錄日期；均攤與獨立水號的差額應只有尾差或空房部分</p>
        </div>
        <button type="button" @click="emit('open-water')"
          class="shrink-0 px-3 py-1.5 rounded-lg border border-sky-300 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors">
          登錄台水帳單
        </button>
      </div>
      <p v-if="!water.length" class="text-xs text-text-secondary-light bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 px-5 py-4">
        本月沒有台水帳單或水費帳單。
      </p>
      <div v-else class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 overflow-x-auto">
        <table class="w-full text-sm min-w-[420px]">
          <thead class="text-xs text-text-secondary-light">
            <tr>
              <th class="text-left px-4 py-2 font-medium">建物</th>
              <th class="text-right px-4 py-2 font-medium">台水支出</th>
              <th class="text-right px-4 py-2 font-medium">水費開出（已收）</th>
              <th class="text-right px-4 py-2 font-medium">差額</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in water" :key="w.propertyId" class="border-t border-gray-100 dark:border-gray-800">
              <td class="px-4 py-2 font-medium">{{ w.name }}</td>
              <td class="px-4 py-2 text-right">NT$ {{ w.expense.toLocaleString() }}</td>
              <td class="px-4 py-2 text-right">NT$ {{ w.billed.toLocaleString() }}
                <span class="text-xs text-text-secondary-light">（{{ w.collected.toLocaleString() }}）</span>
              </td>
              <td class="px-4 py-2 text-right font-bold" :class="w.diff < 0 ? 'text-red-600' : w.diff > 0 ? 'text-green-600' : ''">
                {{ w.diff > 0 ? '+' : '' }}{{ w.diff.toLocaleString() }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 電費盈虧：期間錨定台電帳單迄月（跨兩個月），與上方「本月」不是同一個尺度 -->
    <div v-if="electricity.length > 0" class="space-y-4">
      <div>
        <h2 class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">電費盈虧</h2>
        <p class="text-xs text-text-secondary-light mt-0.5">逐台電總表（棟）各一張，期間為台電帳期，與本月收支不同尺度</p>
      </div>
      <ElectricityStatsCard
        v-for="es in electricity" :key="es.groupId"
        :stats="es" @open-taipower="(id: string) => emit('open-taipower', id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ElectricityStatsCard from './ElectricityStatsCard.vue'
import type { ElectricityStats } from './types'
import type { WaterSummaryRow } from '../../utils/financials/waterBilling'

export interface MonthlyStats {
  income: number
  incomeCount: number
  pending: number
  pendingCount: number
  expense: number
  expenseCount: number
  net: number
}

export interface CategoryStat {
  key: string
  label: string
  icon: string
  count: number
  amount: number
  iconColor: string
  amountColor: string
  badgeClass: string
}

defineProps<{
  stats: MonthlyStats
  categories: CategoryStat[]
  electricity: ElectricityStats[]
  water: WaterSummaryRow[]
}>()

const emit = defineEmits<{
  'select-category': [key: string]
  'open-taipower': [groupId: string]
  'open-water': []
}>()
</script>
