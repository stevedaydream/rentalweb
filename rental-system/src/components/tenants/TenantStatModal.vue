<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tenant-stat-modal-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]"
    >
      <div class="p-6 border-b border-ink-100 dark:border-ink-700 flex justify-between items-center">
        <div>
          <h2 id="tenant-stat-modal-title" class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <span class="material-symbols-outlined" :class="categoryMeta.iconColor" aria-hidden="true">{{ categoryMeta.icon }}</span>
            {{ categoryMeta.label }}
          </h2>
          <p class="text-xs text-text-secondary-light mt-1">共 {{ tenants.length }} 位租客・點擊可查看詳情</p>
        </div>
        <button @click="$emit('close')" aria-label="關閉" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="p-4 overflow-y-auto space-y-2">
        <div v-if="tenants.length === 0" class="text-center text-text-secondary-light py-8">
          <span class="material-symbols-outlined text-4xl mb-2 text-ink-200" aria-hidden="true">inbox</span>
          <p>目前沒有符合條件的租客</p>
        </div>

        <button
          v-for="tenant in tenants"
          :key="tenant.id"
          type="button"
          @click="$emit('select', tenant.id)"
          class="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-ink-100 dark:border-ink-700 text-left hover:bg-surface-light dark:hover:bg-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200 flex-shrink-0 flex items-center justify-center font-bold">
              {{ tenant.name[0] }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-text-primary-light dark:text-text-primary-dark truncate">{{ tenant.name }}</span>
                <span v-if="tenant.room" class="text-xs text-text-secondary-light bg-surface-light dark:bg-ink-800 border border-ink-100 dark:border-ink-700 px-2 py-0.5 rounded-full whitespace-nowrap">{{ tenant.room }}</span>
              </div>
              <p class="text-xs text-text-secondary-light mt-0.5 truncate">{{ tenant.phone || '—' }}</p>
            </div>
          </div>

          <div class="text-right flex-shrink-0">
            <template v-if="category === 'expiring'">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                :class="tenant.pendingRenewal ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'"
              >剩餘{{ remainingDays(tenant.leaseEnd) }}日{{ tenant.pendingRenewal ? '（已續約）' : '' }}</span>
              <p v-if="tenant.pendingRenewal" class="text-[11px] text-green-600 dark:text-green-400 mt-1">
                續: {{ tenant.pendingRenewal.startDate }} ~ {{ tenant.pendingRenewal.endDate }}
              </p>
              <p v-else class="text-[11px] text-text-secondary-light mt-1">迄 {{ tenant.leaseEnd || '—' }}</p>
            </template>
            <template v-else>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                :class="paymentStatusStyles[tenant.paymentStatus]"
              >{{ paymentStatusLabels[tenant.paymentStatus] }}</span>
            </template>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type TenantStatCategory = 'total' | 'expiring' | 'overdue';

export interface TenantLite {
  id: string;
  name: string;
  room: string;
  phone: string;
  leaseEnd: string;
  paymentStatus: 'normal' | 'overdue' | 'unpaid' | 'pending';
  pendingRenewal?: { startDate: string; endDate: string; rent: number } | null;
}

const props = defineProps<{
  category: TenantStatCategory;
  tenants: TenantLite[];
}>();

defineEmits<{ close: []; select: [id: string] }>();

const categoryMeta = computed(() => ({
  total: { label: '在租人數', icon: 'group', iconColor: 'text-blue-600' },
  expiring: { label: '即將到期（60天內）', icon: 'alarm', iconColor: 'text-orange-600' },
  overdue: { label: '逾期欠費', icon: 'gpp_bad', iconColor: 'text-red-600' }
})[props.category]);

const paymentStatusLabels: Record<string, string> = {
  normal: '繳費正常',
  unpaid: '本期未繳',
  overdue: '逾期欠費',
  pending: '未設定租約'
};

const paymentStatusStyles: Record<string, string> = {
  normal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  unpaid: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  pending: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
};

const remainingDays = (dateStr: string) => {
  if (!dateStr) return 0;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};
</script>
