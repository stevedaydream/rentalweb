<template>
  <div class="lg:col-span-12 bg-white dark:bg-card-dark rounded-2xl p-4 md:p-5 shadow-sm border border-ink-100 dark:border-ink-800">
    <div class="flex items-center justify-between mb-3 md:mb-4">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-gold-500" aria-hidden="true">task_alt</span>
        <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">本月工作清單</h3>
        <span class="hidden sm:inline text-xs text-text-secondary-light bg-surface-light dark:bg-surface-dark px-2 py-0.5 rounded-full">{{ monthLabel }}</span>
      </div>
      <span class="text-xs text-text-secondary-light">{{ doneCount }}/4 完成</span>
    </div>

    <div class="md:hidden">
      <RouterLink
        v-if="nextTask"
        :to="{ name: nextTask.route }"
        class="flex items-center gap-3 p-3 rounded-xl bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
      >
        <span class="w-9 h-9 rounded-xl bg-gold-500 text-white flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[20px]" aria-hidden="true">{{ nextTask.icon }}</span>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-[11px] text-gold-700 dark:text-gold-300 font-bold">下一步</p>
          <p class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">{{ nextTask.title }}</p>
          <p class="text-xs text-text-secondary-light truncate">{{ nextTask.detail }}</p>
        </div>
        <span class="material-symbols-outlined text-gold-600" aria-hidden="true">arrow_forward</span>
      </RouterLink>

      <div v-else class="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
        <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
        <p class="text-sm font-bold">本月工作已全部完成</p>
      </div>

      <details class="mt-2 group">
        <summary class="list-none cursor-pointer py-1.5 text-xs text-text-secondary-light flex items-center justify-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
          查看完整清單
          <span class="material-symbols-outlined text-[16px] transition-transform group-open:rotate-180" aria-hidden="true">expand_more</span>
        </summary>
        <div class="mt-2 divide-y divide-ink-100 dark:divide-ink-800 border-t border-ink-100 dark:border-ink-800">
          <div v-for="task in mobileTasks" :key="task.title" class="flex items-center gap-3 py-2.5">
            <span class="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              :class="task.done ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-ink-100 text-ink-400 dark:bg-ink-800'">
              <span class="material-symbols-outlined text-[15px]" aria-hidden="true">{{ task.done ? 'check' : task.icon }}</span>
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">{{ task.title }}</p>
              <p class="text-[11px] text-text-secondary-light truncate">{{ task.detail }}</p>
            </div>
            <RouterLink v-if="!task.done" :to="{ name: task.route }" class="text-xs font-medium text-gold-600">處理</RouterLink>
          </div>
        </div>
      </details>
    </div>

    <div class="hidden md:grid grid-cols-4 gap-3">

      <!-- Step 1: 抄電表 -->
      <div class="flex flex-col gap-2 p-4 rounded-xl border transition-all"
        :class="steps.meter ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : 'border-ink-100 dark:border-ink-800 bg-surface-light dark:bg-surface-dark'">
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0"
            :class="steps.meter ? 'bg-green-500 text-white' : 'bg-ink-200 dark:bg-ink-700 text-ink-500 dark:text-ink-300'">
            <span v-if="steps.meter" class="material-symbols-outlined text-[16px]" aria-hidden="true">check</span>
            <span v-else>1</span>
          </span>
          <span class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">抄電表</span>
        </div>
        <p class="text-xs text-text-secondary-light">{{ steps.meter ? `已完成 (${meterCount} 筆)` : '尚未輸入本月電表度數' }}</p>
        <router-link v-if="!steps.meter" :to="{ name: 'MeterReading' }"
          class="mt-auto text-xs font-medium text-gold-600 hover:text-gold-700 flex items-center gap-1">
          前往抄表 <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
        </router-link>
      </div>

      <!-- Step 2: 生成帳單 -->
      <div class="flex flex-col gap-2 p-4 rounded-xl border transition-all"
        :class="steps.bills ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : 'border-ink-100 dark:border-ink-800 bg-surface-light dark:bg-surface-dark'">
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0"
            :class="steps.bills ? 'bg-green-500 text-white' : 'bg-ink-200 dark:bg-ink-700 text-ink-500 dark:text-ink-300'">
            <span v-if="steps.bills" class="material-symbols-outlined text-[16px]" aria-hidden="true">check</span>
            <span v-else>2</span>
          </span>
          <span class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">生成帳單</span>
        </div>
        <p class="text-xs text-text-secondary-light">{{ steps.bills ? `已生成 (${billCount} 筆)` : '尚未生成本月帳單' }}</p>
        <router-link v-if="!steps.bills" :to="{ name: 'Financials' }"
          class="mt-auto text-xs font-medium text-gold-600 hover:text-gold-700 flex items-center gap-1">
          前往帳務 <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
        </router-link>
      </div>

      <!-- Step 3: 通知租客 -->
      <div class="flex flex-col gap-2 p-4 rounded-xl border transition-all"
        :class="steps.notify ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : sendDayCountdown !== null && sendDayCountdown <= 0 ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10' : 'border-ink-100 dark:border-ink-800 bg-surface-light dark:bg-surface-dark'">
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0"
            :class="steps.notify ? 'bg-green-500 text-white' : sendDayCountdown !== null && sendDayCountdown <= 0 ? 'bg-orange-400 text-white' : 'bg-ink-200 dark:bg-ink-700 text-ink-500 dark:text-ink-300'">
            <span v-if="steps.notify" class="material-symbols-outlined text-[16px]" aria-hidden="true">check</span>
            <span v-else>3</span>
          </span>
          <span class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">通知租客</span>
        </div>
        <p class="text-xs" :class="sendDayCountdown !== null && sendDayCountdown <= 0 && !steps.notify ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-text-secondary-light'">
          <template v-if="steps.notify">已發送通知</template>
          <template v-else-if="sendDayCountdown === null">生成帳單後發送</template>
          <template v-else-if="sendDayCountdown > 0">{{ sendDayCountdown }} 天後發送（{{ billSendDay }} 號）</template>
          <template v-else>今日應發送帳單通知</template>
        </p>
        <router-link :to="{ name: 'Financials' }"
          class="mt-auto text-xs font-medium text-gold-600 hover:text-gold-700 flex items-center gap-1">
          前往發送 <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
        </router-link>
      </div>

      <!-- Step 4: 確認收款 -->
      <div class="flex flex-col gap-2 p-4 rounded-xl border transition-all"
        :class="steps.collected ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : pendingCount > 0 ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10' : 'border-ink-100 dark:border-ink-800 bg-surface-light dark:bg-surface-dark'">
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0"
            :class="steps.collected ? 'bg-green-500 text-white' : pendingCount > 0 ? 'bg-orange-400 text-white' : 'bg-ink-200 dark:bg-ink-700 text-ink-500 dark:text-ink-300'">
            <span v-if="steps.collected" class="material-symbols-outlined text-[16px]" aria-hidden="true">check</span>
            <span v-else>4</span>
          </span>
          <span class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">確認收款</span>
        </div>
        <p class="text-xs" :class="steps.collected ? 'text-text-secondary-light' : pendingCount > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-text-secondary-light'">
          {{ steps.collected ? '全部已收款' : pendingCount > 0 ? `還有 ${pendingCount} 人未繳` : '等待帳單生成' }}
        </p>
        <router-link v-if="!steps.collected && pendingCount > 0" :to="{ name: 'Financials' }"
          class="mt-auto text-xs font-medium text-gold-600 hover:text-gold-700 flex items-center gap-1">
          查看帳務 <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
        </router-link>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { db } from '../../firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'

const props = defineProps<{
  landlordId: string
  pendingCount: number
  billSendDay?: number
  paymentDay?: number
}>()

const currentMonth = new Date().toISOString().slice(0, 7)
const monthLabel = computed(() => {
  const [y, m] = currentMonth.split('-')
  return `${y} 年 ${Number(m)} 月`
})

const meterCount = ref(0)
const billCount = ref(0)

// 距離發帳單日還有幾天（null = 尚未到本月發送日的計算範圍）
const sendDayCountdown = computed(() => {
  if (!props.billSendDay || !billCount.value) return null
  const today = new Date()
  const sendDate = new Date(today.getFullYear(), today.getMonth(), props.billSendDay)
  const diff = Math.ceil((sendDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
})

const steps = computed(() => ({
  meter: meterCount.value > 0,
  bills: billCount.value > 0,
  notify: billCount.value > 0 && sendDayCountdown.value !== null && sendDayCountdown.value < 0,
  collected: billCount.value > 0 && props.pendingCount === 0,
}))

const mobileTasks = computed(() => [
  {
    title: '抄電表',
    detail: steps.value.meter ? `已完成 (${meterCount.value} 筆)` : '尚未輸入本月電表度數',
    done: steps.value.meter,
    route: 'MeterReading',
    icon: 'electric_meter',
  },
  {
    title: '生成帳單',
    detail: steps.value.bills ? `已生成 (${billCount.value} 筆)` : '尚未生成本月帳單',
    done: steps.value.bills,
    route: 'Financials',
    icon: 'receipt_long',
  },
  {
    title: '通知租客',
    detail: steps.value.notify ? '已發送通知' : sendDayCountdown.value === null ? '生成帳單後發送' : sendDayCountdown.value > 0 ? `${sendDayCountdown.value} 天後發送` : '今日應發送帳單通知',
    done: steps.value.notify,
    route: 'Financials',
    icon: 'notifications',
  },
  {
    title: '確認收款',
    detail: steps.value.collected ? '全部已收款' : props.pendingCount > 0 ? `還有 ${props.pendingCount} 人未繳` : '等待帳單生成',
    done: steps.value.collected,
    route: 'Financials',
    icon: 'payments',
  },
])

const nextTask = computed(() => mobileTasks.value.find(task => !task.done) ?? null)

const doneCount = computed(() =>
  [steps.value.meter, steps.value.bills, steps.value.notify, steps.value.collected].filter(Boolean).length
)

onMounted(async () => {
  if (!props.landlordId) return
  try {
    const [mSnap, bSnap] = await Promise.all([
      getDocs(query(collection(db, 'meter_readings'),
        where('landlordId', '==', props.landlordId),
        where('periodEnd', '>=', `${currentMonth}-01`),
        where('periodEnd', '<=', `${currentMonth}-31`)
      )),
      getDocs(query(collection(db, 'bills'),
        where('landlordId', '==', props.landlordId),
        where('date', '>=', `${currentMonth}-01`),
        where('date', '<=', `${currentMonth}-31`),
        where('type', '==', 'income')
      )),
    ])
    meterCount.value = mSnap.size
    billCount.value = bSnap.size
  } catch (e) {
    console.error('MonthlyTaskCard load error:', e)
  }
})

watch(() => props.landlordId, async (id) => {
  if (!id) return
  const [mSnap, bSnap] = await Promise.all([
    getDocs(query(collection(db, 'meter_readings'),
      where('landlordId', '==', id),
      where('periodEnd', '>=', `${currentMonth}-01`),
      where('periodEnd', '<=', `${currentMonth}-31`)
    )),
    getDocs(query(collection(db, 'bills'),
      where('landlordId', '==', id),
      where('date', '>=', `${currentMonth}-01`),
      where('date', '<=', `${currentMonth}-31`),
      where('type', '==', 'income')
    )),
  ]).catch(() => [null, null])
  if (mSnap) meterCount.value = mSnap.size
  if (bSnap) billCount.value = bSnap.size
})
</script>
