<template>
  <div class="lg:col-span-7 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-ink-100 dark:border-ink-800">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-bold text-lg flex items-center">
        <span class="material-symbols-outlined mr-2 text-gold-500" aria-hidden="true">electric_bolt</span>
        用電概況
      </h3>
      <span class="text-xs text-text-secondary-light font-mono">{{ usage.month }}</span>
    </div>

    <!-- 抄表進度 -->
    <div class="mb-5">
      <div class="flex items-baseline justify-between mb-1.5">
        <span class="text-xs font-bold text-text-secondary-light uppercase">本月抄表進度</span>
        <span class="text-xs font-bold" :class="allRead ? 'text-green-600' : 'text-gold-600'">
          {{ usage.metersRead }} / {{ usage.metersTotal }} 表
        </span>
      </div>
      <div class="h-2 rounded-full bg-surface-light dark:bg-surface-dark overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500"
          :class="allRead ? 'bg-green-500' : 'bg-gold-500'"
          :style="{ width: `${readPercent}%` }"></div>
      </div>
      <p v-if="usage.unreadNames.length > 0" class="text-[11px] text-text-secondary-light mt-1.5">
        尚未抄表：{{ usage.unreadNames.join('、') }}
      </p>
    </div>

    <!-- 三欄摘要 -->
    <div class="grid grid-cols-3 gap-3 mb-5">
      <div class="p-3 rounded-xl bg-surface-light dark:bg-surface-dark">
        <p class="text-[10px] font-bold text-text-secondary-light uppercase">本月用電</p>
        <p class="text-base font-bold mt-0.5 font-mono">{{ usage.totalUsage.toLocaleString() }} <span class="text-xs font-normal">度</span></p>
      </div>
      <div class="p-3 rounded-xl bg-surface-light dark:bg-surface-dark">
        <p class="text-[10px] font-bold text-text-secondary-light uppercase">本月電費</p>
        <p class="text-base font-bold mt-0.5 font-mono">NT$ {{ usage.totalCost.toLocaleString() }}</p>
      </div>
      <div class="p-3 rounded-xl bg-surface-light dark:bg-surface-dark">
        <p class="text-[10px] font-bold text-text-secondary-light uppercase">較上月</p>
        <p v-if="usage.deltaPct === null" class="text-base font-bold mt-0.5 text-ink-300">—</p>
        <p v-else class="text-base font-bold mt-0.5 font-mono flex items-center gap-0.5"
          :class="usage.deltaPct >= 0 ? 'text-red-500' : 'text-green-600'">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">
            {{ usage.deltaPct >= 0 ? 'arrow_upward' : 'arrow_downward' }}
          </span>
          {{ Math.abs(usage.deltaPct).toFixed(0) }}%
        </p>
      </div>
    </div>

    <!-- 用電排行 -->
    <div v-if="usage.rows.length > 0">
      <p class="text-xs font-bold text-text-secondary-light uppercase mb-2">用電排行</p>
      <div class="space-y-1.5">
        <div v-for="row in topRows" :key="row.name" class="flex items-center gap-2 text-sm">
          <span class="w-14 shrink-0 font-bold truncate" :class="row.isPublic ? 'text-purple-500' : ''">{{ row.name }}</span>
          <span class="w-16 shrink-0 text-right font-mono text-xs text-text-secondary-light">{{ row.usage.toLocaleString() }} 度</span>
          <div class="flex-1 h-1.5 rounded-full bg-surface-light dark:bg-surface-dark overflow-hidden min-w-0">
            <div class="h-full rounded-full" :class="row.isPublic ? 'bg-purple-400' : 'bg-gold-400'"
              :style="{ width: `${maxUsage > 0 ? (row.usage / maxUsage) * 100 : 0}%` }"></div>
          </div>
          <span class="w-20 shrink-0 text-right font-mono text-xs">NT$ {{ row.cost.toLocaleString() }}</span>
        </div>
      </div>
      <p v-if="usage.rows.length > TOP_N" class="text-[11px] text-text-secondary-light mt-2">
        其他 {{ usage.rows.length - TOP_N }} 個電表未列出
      </p>
    </div>
    <p v-else class="py-4 text-center text-sm text-ink-300">本月尚無抄表紀錄</p>

    <div class="mt-4 text-center">
      <RouterLink
        :to="{ name: 'MeterReading' }"
        class="text-sm text-gold-600 hover:underline flex items-center justify-center w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded"
      >
        前往抄表與進階設定
        <span class="material-symbols-outlined text-sm ml-1" aria-hidden="true">arrow_forward</span>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface MeterUsageRow {
  name: string;
  usage: number;
  cost: number;
  isPublic: boolean;
}

export interface MeterUsageSummary {
  month: string;
  metersTotal: number;   // 應抄表數（在租房間＋公共電表）
  metersRead: number;    // 本月已有抄表紀錄的表數
  unreadNames: string[];
  totalUsage: number;
  totalCost: number;
  deltaPct: number | null; // 相對上月用電增減，上月無資料時為 null
  rows: MeterUsageRow[];   // 已依用電量由大到小排序
}

const TOP_N = 5;

const props = defineProps<{
  usage: MeterUsageSummary;
}>();

const readPercent = computed(() =>
  props.usage.metersTotal > 0
    ? Math.min(100, (props.usage.metersRead / props.usage.metersTotal) * 100)
    : 0
);
const allRead = computed(() =>
  props.usage.metersTotal > 0 && props.usage.metersRead >= props.usage.metersTotal
);
const topRows = computed(() => props.usage.rows.slice(0, TOP_N));
const maxUsage = computed(() => props.usage.rows[0]?.usage ?? 0);
</script>
