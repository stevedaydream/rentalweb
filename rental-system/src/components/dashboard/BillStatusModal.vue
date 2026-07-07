<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bill-status-modal-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]"
    >
      <div class="p-6 border-b border-ink-100 dark:border-ink-700 flex justify-between items-center">
        <div>
          <h2 id="bill-status-modal-title" class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" :class="categoryMeta.dot" aria-hidden="true"></span>
            {{ categoryMeta.label }}租客
          </h2>
          <p class="text-xs text-text-secondary-light mt-1">
            共 {{ groups.length }} 位租客・{{ bills.length }} 筆帳單・NT$ {{ totalAmount.toLocaleString() }}
          </p>
        </div>
        <button @click="$emit('close')" aria-label="關閉" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="p-6 overflow-y-auto space-y-3">
        <div v-if="groups.length === 0" class="text-center text-text-secondary-light py-8">
          <span class="material-symbols-outlined text-4xl mb-2 text-ink-200" aria-hidden="true">inbox</span>
          <p>目前沒有{{ categoryMeta.label }}的帳單</p>
        </div>

        <div
          v-for="group in groups"
          :key="group.key"
          class="rounded-xl border border-ink-100 dark:border-ink-700 overflow-hidden"
        >
          <div class="flex items-center justify-between px-4 py-3 bg-surface-light dark:bg-surface-dark">
            <div class="flex items-center gap-2 min-w-0">
              <span class="material-symbols-outlined text-[20px] text-ink-300" aria-hidden="true">person</span>
              <span class="font-bold text-sm text-text-primary-light dark:text-text-primary-dark truncate">{{ group.tenantName }}</span>
              <span v-if="group.roomName" class="text-xs text-text-secondary-light bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 px-2 py-0.5 rounded-full whitespace-nowrap">{{ group.roomName }}</span>
            </div>
            <span class="text-sm font-bold whitespace-nowrap" :class="categoryMeta.amountText">
              NT$ {{ group.subtotal.toLocaleString() }}
            </span>
          </div>
          <ul class="divide-y divide-ink-100 dark:divide-ink-700">
            <li
              v-for="bill in group.bills"
              :key="bill.id"
              class="flex items-center justify-between px-4 py-2 text-sm"
            >
              <div class="flex items-center gap-2 text-text-secondary-light">
                <span>{{ bill.month || '—' }}</span>
                <span v-if="bill.dueDate" class="text-xs">截止 {{ bill.dueDate }}</span>
              </div>
              <span class="text-text-primary-light dark:text-text-primary-dark">NT$ {{ bill.amount.toLocaleString() }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="p-4 border-t border-ink-100 dark:border-ink-700 flex justify-end">
        <RouterLink
          :to="{ name: 'Financials' }"
          class="px-4 py-2 bg-gold-500 text-white rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          前往帳務管理
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type BillCategory = 'unpaid' | 'paid' | 'overdue';

export interface BillLite {
  id: string;
  tenantId: string;
  tenantName: string;
  roomName: string;
  amount: number;
  month: string;
  dueDate: string;
}

const props = defineProps<{
  category: BillCategory;
  bills: BillLite[];
}>();

defineEmits<{ close: [] }>();

const categoryMeta = computed(() => ({
  unpaid: { label: '未繳費', dot: 'bg-yellow-400', amountText: 'text-yellow-600' },
  paid: { label: '已繳費', dot: 'bg-green-500', amountText: 'text-green-600' },
  overdue: { label: '逾期欠費', dot: 'bg-red-500', amountText: 'text-red-600' }
})[props.category]);

const totalAmount = computed(() => props.bills.reduce((sum, b) => sum + b.amount, 0));

const groups = computed(() => {
  const map = new Map<string, { key: string; tenantName: string; roomName: string; subtotal: number; bills: BillLite[] }>();
  for (const bill of props.bills) {
    const key = bill.tenantId || bill.tenantName || bill.id;
    let group = map.get(key);
    if (!group) {
      group = { key, tenantName: bill.tenantName || '未知租客', roomName: bill.roomName, subtotal: 0, bills: [] };
      map.set(key, group);
    }
    group.subtotal += bill.amount;
    group.bills.push(bill);
  }
  return [...map.values()].sort((a, b) => b.subtotal - a.subtotal);
});
</script>
