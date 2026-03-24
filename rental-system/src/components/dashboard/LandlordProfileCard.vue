<template>
  <div class="lg:col-span-4 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-ink-100 dark:border-ink-800 flex flex-col justify-between">
    <div>
      <div class="flex items-start justify-between mb-6">
        <div class="flex items-center">
          <div class="w-12 h-12 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center text-gold-700 font-bold text-xl">
            {{ (name?.[0] || 'Me').toUpperCase() }}
          </div>
          <div class="ml-3">
            <h3 class="font-bold text-lg">{{ name }}</h3>
            <button
              @click="handleCopyCode"
              class="group flex items-center gap-1 text-xs text-text-secondary-light bg-surface-light dark:bg-surface-dark px-2 py-0.5 rounded-full mt-1 hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors cursor-pointer"
              title="點擊複製房東 ID"
            >
              <span>ID: {{ landlordCode || 'Loading...' }}</span>
              <span class="material-symbols-outlined text-[10px] text-gray-400 group-hover:text-gray-600 transition-colors">content_copy</span>
            </button>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-if="stats.pendingTenants > 0"
          @click="router.push({ name: 'TenantList' })"
          class="cursor-pointer p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/50 flex items-center justify-between hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        >
          <div class="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <span class="material-symbols-outlined animate-pulse">person_add</span>
            <div class="flex flex-col">
              <span class="text-sm font-bold">新租客綁定通知</span>
              <span class="text-[10px] opacity-80">有人綁定了您的 ID</span>
            </div>
          </div>
          <span class="bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-100 text-xs font-bold px-2 py-1 rounded-full">
            {{ stats.pendingTenants }} 人
          </span>
        </div>

        <div
          @click="router.push({ name: 'RoomManagement' })"
          class="group cursor-pointer p-4 bg-surface-light dark:bg-surface-dark rounded-xl hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors"
        >
          <div class="flex justify-between items-center">
            <span class="text-text-secondary-light">名下房源總數</span>
            <span class="material-symbols-outlined text-ink-200 group-hover:text-gold-600">arrow_forward</span>
          </div>
          <p class="text-3xl font-extrabold text-text-primary-light mt-1 group-hover:text-gold-600 transition-colors">
            {{ stats.totalRooms }} <span class="text-sm font-normal text-text-secondary-light">間</span>
          </p>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center text-sm">
          <div class="p-2 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
            <div class="font-bold">{{ stats.occupied }}</div>
            <div class="text-xs opacity-80">出租中</div>
          </div>
          <div class="p-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            <div class="font-bold">{{ stats.vacant }}</div>
            <div class="text-xs opacity-80">可出租</div>
          </div>
          <div class="p-2 rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
            <div class="font-bold">{{ stats.maintenance }}</div>
            <div class="text-xs opacity-80">維修中</div>
          </div>
        </div>

        <div
          @click="router.push({ name: 'TenantList' })"
          class="group cursor-pointer p-3 bg-surface-light dark:bg-surface-dark rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between"
        >
          <div class="flex items-center gap-2 text-text-secondary-light group-hover:text-blue-600">
            <span class="material-symbols-outlined text-[20px]">group</span>
            <span class="text-sm">在租人數</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-xl font-extrabold text-text-primary-light group-hover:text-blue-600">{{ stats.activeTenants }}</span>
            <span class="text-xs text-text-secondary-light">人</span>
            <span class="material-symbols-outlined text-[16px] text-ink-200 group-hover:text-blue-600 ml-1">arrow_forward</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useToastStore } from '../../stores/toast';

interface RoomStats {
  totalRooms: number;
  occupied: number;
  vacant: number;
  maintenance: number;
  activeTenants: number;
  pendingTenants: number;
}

const props = defineProps<{
  name: string;
  landlordCode: string;
  stats: RoomStats;
}>();

const emit = defineEmits<{
  'copy-code': [];
}>();

const router = useRouter();
const toast = useToastStore();

const handleCopyCode = async () => {
  if (!props.landlordCode) {
    toast.warning('房東 ID 載入中，請稍後再試');
    return;
  }
  try {
    await navigator.clipboard.writeText(props.landlordCode);
    toast.success(`已複製房東 ID：${props.landlordCode}`);
    emit('copy-code');
  } catch {
    toast.error('複製失敗，請手動選取複製');
  }
};
</script>
