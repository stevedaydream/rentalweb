<template>
  <div class="bg-gradient-to-br from-gold-50 to-ink-50 dark:from-gold-900/10 dark:to-ink-900/20 rounded-2xl p-6 border border-gold-100 dark:border-gold-800/20">
    <div class="flex justify-between items-start mb-4">
      <div>
        <h3 class="font-bold text-lg text-ink-800 dark:text-ink-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-gold-600">analytics</span>
          電費盈虧分析 ({{ stats.periodStr }})
        </h3>
        <p class="text-sm text-ink-500 dark:text-ink-300 opacity-80">雙月結算：比對台電帳單與租客實收金額</p>
      </div>
      <span class="px-3 py-1 bg-white dark:bg-ink-800 text-gold-700 dark:text-gold-300 rounded-full text-xs font-bold shadow-sm border border-gold-100 dark:border-gold-800/30">
        {{ stats.statusLabel }}
      </span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white dark:bg-ink-800 p-4 rounded-xl shadow-sm border border-ink-100 dark:border-ink-700">
        <p class="text-xs text-ink-400 font-bold uppercase mb-1">房東應收電費 (帳單總額)</p>
        <p class="text-2xl font-bold text-ink-800 dark:text-ink-100">NT$ {{ stats.estimated.toLocaleString() }}</p>
        <p class="text-xs text-ink-300 mt-1">來自 {{ stats.billCount }} 筆租客帳單</p>
      </div>

      <div class="bg-white dark:bg-ink-800 p-4 rounded-xl shadow-sm border-l-4 border-green-500">
        <p class="text-xs text-ink-400 font-bold uppercase mb-1">實際已收電費</p>
        <p class="text-2xl font-bold text-green-600">NT$ {{ stats.collected.toLocaleString() }}</p>
        <p class="text-xs text-ink-300 mt-1">回收率 {{ stats.collectionRate }}%</p>
      </div>

      <div class="bg-white dark:bg-ink-800 p-4 rounded-xl shadow-sm border-l-4 border-gold-500 relative group">
        <p class="text-xs text-ink-400 font-bold uppercase mb-1">台電帳單金額</p>
        <div v-if="stats.taipowerBill">
          <p class="text-2xl font-bold text-gold-600">NT$ {{ stats.taipowerBill.amount.toLocaleString() }}</p>
          <p class="text-xs text-ink-300 mt-1">用電 {{ stats.taipowerBill.usage }} 度</p>
        </div>
        <div v-else class="flex flex-col h-full justify-center">
          <p class="text-sm text-ink-300 italic">尚未登錄帳單</p>
          <button @click="$emit('open-taipower')" class="text-xs text-gold-600 hover:underline mt-1">立即登錄</button>
        </div>
      </div>

      <div
        class="bg-white dark:bg-ink-800 p-4 rounded-xl shadow-sm border-l-4"
        :class="stats.profit >= 0 ? 'border-gold-500' : 'border-red-500'"
      >
        <p class="text-xs text-ink-400 font-bold uppercase mb-1">本期電費盈虧</p>
        <p class="text-2xl font-bold" :class="stats.profit >= 0 ? 'text-gold-600' : 'text-red-500'">
          {{ stats.profit >= 0 ? '+' : '' }}NT$ {{ stats.profit.toLocaleString() }}
        </p>
        <p class="text-xs text-ink-300 mt-1">實收 - 台電支出</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ElectricityStats } from './types'

defineProps<{ stats: ElectricityStats }>()
defineEmits<{ 'open-taipower': [] }>()
</script>
