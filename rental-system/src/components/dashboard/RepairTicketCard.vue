<template>
  <div class="lg:col-span-5 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-ink-100 dark:border-ink-800">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-bold text-lg flex items-center">
        <span class="material-symbols-outlined mr-2 text-orange-500">build_circle</span>
        最新報修
      </h3>
      <span class="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
        {{ tickets.length }} 未處理
      </span>
    </div>

    <div class="space-y-3">
      <div
        v-for="ticket in tickets"
        :key="ticket.id"
        class="p-3 rounded-xl border border-ink-100 dark:border-ink-700 hover:border-gold-500 transition-colors cursor-pointer group"
        @click="router.push({ name: 'RepairRequests' })"
      >
        <div class="flex justify-between items-start">
          <div>
            <span class="text-xs font-bold bg-surface-light dark:bg-surface-dark text-ink-500 px-2 py-0.5 rounded mr-2">{{ ticket.room }}</span>
            <span class="text-sm font-medium">{{ ticket.tenant }}</span>
          </div>
          <span class="text-xs text-text-secondary-light">{{ ticket.date }}</span>
        </div>
        <p class="mt-2 text-sm text-text-secondary-light line-clamp-1 group-hover:text-text-primary-light">
          <span class="font-bold mr-1" :class="priorityColor(ticket.priority)">{{ ticket.type }}:</span>
          {{ ticket.desc }}
        </p>
      </div>

      <div v-if="tickets.length === 0" class="text-center py-6 text-gray-400 text-sm">
        目前沒有待處理的報修
      </div>
    </div>

    <button
      @click="router.push({ name: 'RepairRequests' })"
      class="mt-4 w-full py-2 border border-dashed border-ink-200 dark:border-ink-700 rounded-lg text-sm text-text-secondary-light hover:text-gold-600 hover:border-gold-500 transition-colors"
    >
      查看所有報修紀錄
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

export interface RepairTicket {
  id: string;
  room: string;
  tenant: string;
  type: string;
  desc: string;
  date: string;
  priority: string;
}

defineProps<{
  tickets: RepairTicket[];
}>();

const router = useRouter();

const priorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-orange-500';
    case 'low': return 'text-blue-500';
    default: return 'text-gray-500';
  }
};
</script>
