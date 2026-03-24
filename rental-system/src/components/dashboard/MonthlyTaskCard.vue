<template>
  <div class="lg:col-span-12 bg-white dark:bg-card-dark rounded-2xl p-5 shadow-sm border border-ink-100 dark:border-ink-800">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-gold-500">task_alt</span>
        <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">本月工作清單</h3>
        <span class="text-xs text-text-secondary-light bg-surface-light dark:bg-surface-dark px-2 py-0.5 rounded-full">{{ monthLabel }}</span>
      </div>
      <span class="text-xs text-text-secondary-light">{{ doneCount }}/4 完成</span>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">

      <!-- Step 1: 抄電表 -->
      <div class="flex flex-col gap-2 p-4 rounded-xl border transition-all"
        :class="steps.meter ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : 'border-ink-100 dark:border-ink-800 bg-surface-light dark:bg-surface-dark'">
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0"
            :class="steps.meter ? 'bg-green-500 text-white' : 'bg-ink-200 dark:bg-ink-700 text-ink-500 dark:text-ink-300'">
            <span v-if="steps.meter" class="material-symbols-outlined text-[16px]">check</span>
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
            <span v-if="steps.bills" class="material-symbols-outlined text-[16px]">check</span>
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
            <span v-if="steps.notify" class="material-symbols-outlined text-[16px]">check</span>
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
            <span v-if="steps.collected" class="material-symbols-outlined text-[16px]">check</span>
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
