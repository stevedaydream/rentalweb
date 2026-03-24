<template>
  <div class="lg:col-span-8 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-ink-100 dark:border-ink-800">
    <div class="flex justify-between items-center mb-6">
      <h3 class="font-bold text-lg flex items-center">
        <span class="material-symbols-outlined mr-2 text-gold-500">payments</span>
        帳務概況 (全覽)
      </h3>
      <button class="text-sm text-gold-600 hover:underline" @click="router.push({ name: 'Financials' })">查看詳細報表</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 rounded-xl border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10">
        <p class="text-sm text-text-secondary-light">未繳費</p>
        <div class="flex items-end justify-between mt-2">
          <span class="text-2xl font-bold text-text-primary-light">{{ financial.unpaidCount }} 筆</span>
          <span class="text-sm font-medium text-yellow-600">NT$ {{ financial.unpaidAmount.toLocaleString() }}</span>
        </div>
      </div>

      <div class="p-4 rounded-xl border-l-4 border-green-500 bg-green-50 dark:bg-green-900/10">
        <p class="text-sm text-text-secondary-light">已繳費</p>
        <div class="flex items-end justify-between mt-2">
          <span class="text-2xl font-bold text-text-primary-light">{{ financial.paidCount }} 筆</span>
          <span class="text-sm font-medium text-green-600">NT$ {{ financial.paidAmount.toLocaleString() }}</span>
        </div>
      </div>

      <div class="p-4 rounded-xl border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10">
        <p class="text-sm text-text-secondary-light">逾期欠費</p>
        <div class="flex items-end justify-between mt-2">
          <span class="text-2xl font-bold text-red-600">{{ financial.overdueCount }} 筆</span>
          <span class="text-sm font-medium text-red-600">NT$ {{ financial.overdueAmount.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap gap-2">
      <span class="text-sm text-text-secondary-light self-center mr-2">快捷篩選:</span>
      <button class="px-3 py-1 text-xs rounded-full bg-surface-light hover:bg-ink-100 text-ink-500">全部房源</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

interface FinancialStats {
  unpaidCount: number;
  unpaidAmount: number;
  paidCount: number;
  paidAmount: number;
  overdueCount: number;
  overdueAmount: number;
}

defineProps<{
  financial: FinancialStats;
}>();

const router = useRouter();
</script>
