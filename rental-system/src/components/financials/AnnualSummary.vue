<template>
  <div class="space-y-6">

    <!-- 年度與棟別 -->
    <div class="flex flex-wrap items-center gap-3">
      <select v-model.number="year" aria-label="選擇年度"
        class="px-4 py-2 bg-white dark:bg-card-dark border border-ink-200 dark:border-ink-700 rounded-lg text-sm outline-none">
        <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年度</option>
      </select>
      <select v-model="scope" aria-label="選擇建物"
        class="px-4 py-2 bg-white dark:bg-card-dark border border-ink-200 dark:border-ink-700 rounded-lg text-sm outline-none">
        <option value="all">全部建物</option>
        <option v-for="s in summaries" :key="s.propertyId" :value="s.propertyId">{{ s.propertyName }}</option>
      </select>
      <span v-if="loading" class="text-sm text-text-secondary-light">載入中…</span>
    </div>

    <template v-if="!loading">
      <!-- 總覽 -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
          <p class="text-xs text-text-secondary-light mb-1">全年已收</p>
          <p class="text-2xl font-bold text-green-600">NT$ {{ view.collected.toLocaleString() }}</p>
          <p v-if="view.pending > 0" class="text-xs text-orange-500 mt-1">另有待收 {{ view.pending.toLocaleString() }}</p>
        </div>
        <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
          <p class="text-xs text-text-secondary-light mb-1">全年支出</p>
          <p class="text-2xl font-bold text-red-500">NT$ {{ view.totalExpense.toLocaleString() }}</p>
        </div>
        <div class="p-5 rounded-xl border shadow-sm"
          :class="view.net >= 0 ? 'bg-gold-50 dark:bg-gold-900/10 border-gold-100 dark:border-gold-900/30' : 'bg-red-50 dark:bg-red-900/10 border-red-100'">
          <p class="text-xs mb-1" :class="view.net >= 0 ? 'text-gold-700 dark:text-gold-300' : 'text-red-600'">全年淨利</p>
          <p class="text-2xl font-bold" :class="view.net >= 0 ? 'text-gold-600' : 'text-red-500'">
            NT$ {{ view.net.toLocaleString() }}
          </p>
          <p class="text-xs mt-1 text-text-secondary-light">已收 − 支出</p>
        </div>
        <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
          <p class="text-xs text-text-secondary-light mb-1">租金收入</p>
          <p class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
            NT$ {{ view.rentCollected.toLocaleString() }}
          </p>
          <p class="text-xs text-text-secondary-light mt-1">綜所稅試算基礎</p>
        </div>
      </div>

      <!-- 收支明細 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm overflow-hidden">
          <h3 class="px-5 py-3 border-b border-ink-100 dark:border-ink-800 font-bold text-sm">收入明細</h3>
          <div v-if="view.income.length === 0" class="px-5 py-8 text-center text-sm text-ink-300">無收入紀錄</div>
          <div v-for="c in view.income" :key="c.category"
            class="flex items-center gap-3 px-5 py-2.5 border-b border-ink-50 dark:border-ink-800/60 last:border-0">
            <span class="text-sm flex-1 min-w-0 truncate">{{ c.category }}</span>
            <span class="text-xs text-text-secondary-light shrink-0">{{ c.count }} 筆</span>
            <span class="text-sm font-bold text-green-600 shrink-0">+{{ c.amount.toLocaleString() }}</span>
          </div>
        </div>

        <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm overflow-hidden">
          <h3 class="px-5 py-3 border-b border-ink-100 dark:border-ink-800 font-bold text-sm">支出明細</h3>
          <div v-if="view.expense.length === 0" class="px-5 py-8 text-center text-sm text-ink-300">無支出紀錄</div>
          <div v-for="c in view.expense" :key="c.category"
            class="flex items-center gap-3 px-5 py-2.5 border-b border-ink-50 dark:border-ink-800/60 last:border-0">
            <span class="text-sm flex-1 min-w-0 truncate">{{ c.category }}</span>
            <span class="text-xs text-text-secondary-light shrink-0">{{ c.count }} 筆</span>
            <span class="text-sm font-bold text-red-500 shrink-0">−{{ c.amount.toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <!-- 分棟比較（僅全部建物時） -->
      <div v-if="scope === 'all' && summaries.length > 1"
        class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm overflow-hidden">
        <h3 class="px-5 py-3 border-b border-ink-100 dark:border-ink-800 font-bold text-sm">各棟損益</h3>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[520px] text-sm text-left whitespace-nowrap">
            <thead class="text-xs text-text-secondary-light uppercase bg-surface-light dark:bg-surface-dark">
              <tr>
                <th class="px-5 py-2.5">建物</th>
                <th class="px-5 py-2.5 text-right">已收</th>
                <th class="px-5 py-2.5 text-right">支出</th>
                <th class="px-5 py-2.5 text-right">淨利</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-50 dark:divide-ink-800">
              <tr v-for="s in summaries" :key="s.propertyId">
                <td class="px-5 py-2.5 font-medium">{{ s.propertyName }}</td>
                <td class="px-5 py-2.5 text-right text-green-600">{{ s.collected.toLocaleString() }}</td>
                <td class="px-5 py-2.5 text-right text-red-500">{{ s.totalExpense.toLocaleString() }}</td>
                <td class="px-5 py-2.5 text-right font-bold" :class="s.net >= 0 ? 'text-gold-600' : 'text-red-500'">
                  {{ s.net.toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 公益出租人與綜所稅 -->
      <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm overflow-hidden">
        <div class="px-5 py-3.5 border-b border-ink-100 dark:border-ink-800 flex items-center gap-2 flex-wrap">
          <span class="material-symbols-outlined text-[20px] text-green-600" aria-hidden="true">calculate</span>
          <h3 class="font-bold text-sm">{{ year }} 年度綜所稅試算</h3>
          <span v-if="qualifiedNames.length" class="text-xs font-bold text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 rounded-full px-2 py-0.5">
            公益出租人：{{ qualifiedNames.join('、') }}
          </span>
          <span v-else class="text-xs text-ink-400">未登錄公益出租人核定年度</span>
        </div>

        <div class="p-5 space-y-4">
          <div class="flex flex-wrap items-center gap-4">
            <div>
              <label for="annual-other-income" class="block text-xs font-medium text-text-secondary-light mb-1">
                租賃以外年所得（薪資等）
              </label>
              <input id="annual-other-income" v-model.number="otherIncome" type="number"
                class="form-input w-48" placeholder="0">
            </div>
            <label class="flex items-center gap-2 text-sm mt-4">
              <input v-model="countUtilitiesAsRent" type="checkbox" class="rounded">
              電費收入計入租賃收入
            </label>
          </div>
          <p class="text-xs text-text-secondary-light -mt-2">
            向房客收取的電費若屬實報實銷代收代付，一般不計入租賃收入；若為定額收取則應計入。預設不計入，請依你的實際情形調整。
          </p>

          <dl class="space-y-2 text-sm border-t border-ink-100 dark:border-ink-800 pt-4">
            <div class="flex justify-between">
              <dt class="text-text-secondary-light">租金收入{{ countUtilitiesAsRent ? '（含電費）' : '' }}</dt>
              <dd class="font-medium">NT$ {{ tax.grossRent.toLocaleString() }}</dd>
            </div>
            <div v-if="tax.exemption > 0" class="flex justify-between">
              <dt class="text-text-secondary-light">公益出租人免稅額</dt>
              <dd class="font-medium text-green-600">−NT$ {{ tax.exemption.toLocaleString() }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-text-secondary-light">應稅租金收入</dt>
              <dd class="font-medium">NT$ {{ tax.taxableRent.toLocaleString() }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-text-secondary-light">必要費用（43% 標準扣除）</dt>
              <dd class="font-medium text-green-600">−NT$ {{ tax.deduction.toLocaleString() }}</dd>
            </div>
            <div class="flex justify-between border-t border-ink-100 dark:border-ink-800 pt-2">
              <dt class="font-medium">租賃所得</dt>
              <dd class="font-bold">NT$ {{ tax.rentalNetIncome.toLocaleString() }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-text-secondary-light">適用邊際稅率</dt>
              <dd class="font-bold text-orange-500">{{ (tax.marginalRate * 100).toFixed(0) }}%</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-text-secondary-light">估計應納稅額（租賃部分）</dt>
              <dd class="font-medium text-red-500">NT$ {{ tax.taxAmount.toLocaleString() }}</dd>
            </div>
          </dl>

          <div v-if="tax.exemption > 0"
            class="bg-green-50 dark:bg-green-900/10 rounded-xl px-4 py-3 flex items-center gap-2 flex-wrap">
            <span class="material-symbols-outlined text-[20px] text-green-600" aria-hidden="true">savings</span>
            <span class="text-sm text-green-800 dark:text-green-200">公益出租人估計省下</span>
            <span class="text-lg font-black text-green-700 dark:text-green-300">NT$ {{ tax.saving.toLocaleString() }}</span>
            <span class="text-xs text-green-700/70 dark:text-green-300/70">
              （不具資格時應納 {{ tax.taxWithoutExemption.toLocaleString() }}）
            </span>
          </div>

          <p class="text-xs text-text-secondary-light border-t border-ink-100 dark:border-ink-800 pt-3">
            僅供估算，實際以申報為準。未計個人免稅額、標準／列舉扣除額與扶養親屬；房屋稅、地價稅、火災險、折舊與房貸利息
            屬可列舉的必要費用，若列舉實額高於 43% 標準扣除，改採列舉會更有利，本試算未做此比較。
            公益出租人免稅額一律以 12 個月計，年度中途取得或失去資格時會偏高。
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { db } from '../../firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import type { Property, Room } from '../../types/index'
import {
  buildAnnualSummary, totalOf, UNASSIGNED_PROPERTY_ID,
  type AnnualBill, type PropertySummary,
} from '../../utils/financials/annualSummary'
import { calcRentalTax, publicWelfareExemption } from '../../utils/financials/incomeTax'

const props = defineProps<{
  properties: Property[]
  rooms: Room[]
  /** tenants 文件 id → 房號 */
  tenants: { id: string; room: string }[]
}>()

const authStore = useAuthStore()
const toast = useToastStore()

const bills = ref<AnnualBill[]>([])
const loading = ref(true)
const year = ref(new Date().getFullYear())
const scope = ref<string>('all')
const otherIncome = ref(0)
const countUtilitiesAsRent = ref(false)

const yearOptions = computed(() => {
  const now = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => now - i)
})

/**
 * 年度帳單另外查，不沿用帳務頁的即時監聽——那份有 limit(200)，
 * 一年的帳單量會被截掉。等值查詢 landlordId + date 範圍沿用既有索引。
 */
const load = async () => {
  loading.value = true
  try {
    const snap = await getDocs(query(
      collection(db, 'bills'),
      where('landlordId', '==', authStore.effectiveUid),
      where('date', '>=', `${year.value}-01-01`),
      where('date', '<=', `${year.value}-12-31`),
    ))
    bills.value = snap.docs.map(d => d.data() as AnnualBill)
  } catch (e) {
    console.error('load annual bills error:', e)
    toast.error('載入年度帳務失敗')
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(year, load)

const tenantRoom = computed(() => new Map(props.tenants.map(t => [t.id, t.room])))
const roomProperty = computed(() =>
  new Map(props.rooms.map(r => [r.name, r.propertyId ?? ''])),
)

const summaries = computed<PropertySummary[]>(() =>
  buildAnnualSummary({
    bills: bills.value,
    properties: props.properties.map(p => ({ id: p.id, name: p.name })),
    tenantRoom: tenantRoom.value,
    roomProperty: roomProperty.value,
  }),
)

/** 目前檢視範圍的彙總：全部建物時併總，單棟時取該棟 */
const view = computed(() => {
  if (scope.value === 'all') return totalOf(summaries.value)
  const found = summaries.value.find(s => s.propertyId === scope.value)
  return found ?? totalOf([])
})

/** 該年度綜所稅已核定的建物 */
const qualifiedIds = computed(() => {
  const ids = new Set<string>()
  props.properties.forEach(p => {
    if (p.publicWelfare?.some(w => w.year === year.value && w.incomeTax)) ids.add(p.id)
  })
  return ids
})

const qualifiedNames = computed(() =>
  props.properties.filter(p => qualifiedIds.value.has(p.id)).map(p => p.name),
)

const UTILITY_CATEGORIES = ['電費', '公共電費']

/** 該棟計入租賃收入的電費，取決於代收代付與否 */
const utilitiesOf = (s: PropertySummary) =>
  countUtilitiesAsRent.value
    ? s.income.filter(c => UTILITY_CATEGORIES.includes(c.category)).reduce((sum, c) => sum + c.amount, 0)
    : 0

/** 各棟的租賃收入。免稅額以「屋」為單位計算，故必須逐棟算而非用總數 */
const rentByProperty = computed(() => {
  const map = new Map<string, number>()
  summaries.value.forEach(s => {
    if (s.propertyId === UNASSIGNED_PROPERTY_ID) return
    map.set(s.propertyId, s.rentCollected + utilitiesOf(s))
  })
  return map
})

/** 未歸屬建物的租金仍是租賃收入，要計入試算，但不享免稅額（免稅額以屋為單位） */
const unassignedRent = computed(() => {
  const s = summaries.value.find(x => x.propertyId === UNASSIGNED_PROPERTY_ID)
  return s ? s.rentCollected + utilitiesOf(s) : 0
})

const tax = computed(() => {
  // 單棟檢視時只算該棟，全部檢視時算全部具資格的棟
  const inScope = scope.value === 'all'
    ? qualifiedIds.value
    : new Set([...qualifiedIds.value].filter(id => id === scope.value))

  const grossRent = scope.value === 'all'
    ? Array.from(rentByProperty.value.values()).reduce((sum, v) => sum + v, 0) + unassignedRent.value
    : rentByProperty.value.get(scope.value) ?? 0

  return calcRentalTax({
    grossRent,
    exemption: publicWelfareExemption(rentByProperty.value, inScope),
    otherIncome: otherIncome.value,
  })
})
</script>
