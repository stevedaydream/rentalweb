<template>
  <div class="max-w-5xl mx-auto space-y-6">

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">投資試算</h1>
      <p class="text-text-secondary-light">預期收益、投資報酬率與稅務試算</p>
    </div>

    <!-- Room Selector + Inputs -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Left: Inputs -->
      <div class="lg:col-span-1 space-y-4">

        <!-- Investment target selector -->
        <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 p-5 space-y-4">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-gold-500">apartment</span>
            選擇試算單位
          </h2>
          <div class="grid grid-cols-2 rounded-xl bg-surface-light dark:bg-surface-dark p-1">
            <button
              @click="selectionMode = 'property'"
              class="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="selectionMode === 'property' ? 'bg-white dark:bg-card-dark text-gold-600 shadow-sm' : 'text-text-secondary-light'"
            >建物</button>
            <button
              @click="selectionMode = 'room'"
              class="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="selectionMode === 'room' ? 'bg-white dark:bg-card-dark text-gold-600 shadow-sm' : 'text-text-secondary-light'"
            >單一房源</button>
          </div>
          <div v-if="loadingTargets" class="text-sm text-text-secondary-light">載入中...</div>
          <template v-else-if="selectionMode === 'property'">
            <select v-model="selectedPropertyId" class="form-input text-sm" aria-label="選擇建物" autocomplete="off">
              <option value="">-- 選擇建物 --</option>
              <option v-for="property in properties" :key="property.id" :value="property.id">
                {{ property.name }}（{{ roomCountByProperty(property.id) }} 間）
              </option>
            </select>
            <div v-if="selectedPropertySummary" class="p-3 bg-surface-light dark:bg-surface-dark rounded-xl space-y-2 text-sm">
              <p class="text-text-secondary-light">合計月租：<span class="font-bold text-text-primary-light dark:text-text-primary-dark">NT${{ selectedPropertySummary.monthlyRent.toLocaleString() }}</span></p>
              <p class="text-text-secondary-light">合計坪數：<span class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ selectedPropertySummary.totalSize }} 坪</span></p>
              <p class="text-text-secondary-light">納入房間：<span class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ selectedPropertySummary.roomCount }} 間</span></p>
              <p v-if="selectedPropertySummary.roomCount === 0" class="text-xs text-orange-500">此建物尚未指派房間，請先在房源管理中設定所屬建物。</p>
              <div v-else class="border-t border-ink-100 dark:border-ink-700 pt-2 space-y-1 text-xs text-text-secondary-light">
                <p v-for="room in selectedPropertySummary.rooms" :key="room.id" class="flex justify-between gap-3">
                  <span>{{ room.name }}</span><span>NT${{ room.price.toLocaleString() }}/月</span>
                </p>
              </div>
            </div>
          </template>
          <template v-else>
            <select v-model="selectedRoomId" class="form-input text-sm" aria-label="選擇房源" autocomplete="off">
              <option value="">-- 選擇房源 --</option>
              <option v-for="r in rooms" :key="r.id" :value="r.id">
                {{ r.name }} (NT${{ r.price.toLocaleString() }}/月)
              </option>
            </select>

            <div v-if="selectedRoom" class="p-3 bg-surface-light dark:bg-surface-dark rounded-xl space-y-1 text-sm">
              <p class="text-text-secondary-light">目前月租：<span class="font-bold text-text-primary-light dark:text-text-primary-dark">NT${{ selectedRoom.price.toLocaleString() }}</span></p>
              <p class="text-text-secondary-light">坪數：<span class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ selectedRoom.size }} 坪</span></p>
              <p class="text-text-secondary-light">格局：<span class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ selectedRoom.layout }}</span></p>
            </div>
          </template>
        </div>

        <!-- Parameters -->
        <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 p-5 space-y-4">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-gold-500">tune</span>
            試算參數
          </h2>

          <div>
            <label for="ic-purchase-cost" class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">購入成本 (NT$)</label>
            <input id="ic-purchase-cost" v-model.number="params.purchaseCost" type="number" class="form-input text-sm" placeholder="例如 3000000" autocomplete="off" />
            <p class="text-xs text-text-secondary-light mt-1">含房價、裝潢、代書費等總投入</p>
          </div>

          <div>
            <label for="ic-monthly-rent" class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">月租金 (NT$)</label>
            <input id="ic-monthly-rent" v-model.number="params.monthlyRent" type="number" class="form-input text-sm" placeholder="例如 12000" autocomplete="off" />
          </div>

          <div>
            <label for="ic-rent-increase-rate" class="flex items-center justify-between text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">
              <span>租金年增率 (%)</span>
              <button @click="params.rentIncreaseRate = 2.5" class="text-xs text-gold-500 hover:underline">套用內政部參考值 2.5%</button>
            </label>
            <input id="ic-rent-increase-rate" v-model.number="params.rentIncreaseRate" type="number" step="0.1" class="form-input text-sm" placeholder="2.5" autocomplete="off" />
          </div>

          <div>
            <label for="ic-annual-maintenance" class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">年度維護費用 (NT$)</label>
            <input id="ic-annual-maintenance" v-model.number="params.annualMaintenance" type="number" class="form-input text-sm" placeholder="例如 10000" autocomplete="off" />
          </div>

          <div>
            <label for="ic-vacancy-rate" class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">空置率 (%)</label>
            <input id="ic-vacancy-rate" v-model.number="params.vacancyRate" type="number" step="0.5" min="0" max="100" class="form-input text-sm" placeholder="8.3 (約1個月)" autocomplete="off" />
            <p class="text-xs text-text-secondary-light mt-1">每年平均空租比例，1個月≈8.3%</p>
          </div>

          <div>
            <label for="ic-other-income" class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">個人其他年所得 (NT$)</label>
            <input id="ic-other-income" v-model.number="params.otherAnnualIncome" type="number" class="form-input text-sm" placeholder="例如 600000" autocomplete="off" />
            <p class="text-xs text-text-secondary-light mt-1">薪資等，用於計算稅率級距</p>
          </div>

          <div>
            <div role="group" aria-label="試算年數" class="text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">試算年數</div>
            <div class="flex gap-2">
              <button v-for="y in [3,5,10]" :key="y" @click="params.years = y"
                class="flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all"
                :class="params.years === y ? 'bg-gold-500 text-white border-gold-500' : 'border-ink-200 dark:border-ink-700 text-text-secondary-light hover:border-gold-400'"
              >{{ y }}年</button>
            </div>
          </div>
        </div>

      </div>

      <!-- Right: Results -->
      <div class="lg:col-span-2 space-y-4">

        <!-- ROI Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 p-4 text-center">
            <p class="text-xs text-text-secondary-light mb-1">毛租金報酬率</p>
            <p class="text-2xl font-black" :class="grossYield >= 5 ? 'text-green-600' : 'text-orange-500'">{{ grossYield.toFixed(2) }}%</p>
            <p class="text-xs text-text-secondary-light mt-1">年租 / 購入成本</p>
          </div>
          <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 p-4 text-center">
            <p class="text-xs text-text-secondary-light mb-1">淨租金報酬率</p>
            <p class="text-2xl font-black" :class="netYield >= 4 ? 'text-green-600' : 'text-orange-500'">{{ netYield.toFixed(2) }}%</p>
            <p class="text-xs text-text-secondary-light mt-1">扣空置 & 維護</p>
          </div>
          <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 p-4 text-center">
            <p class="text-xs text-text-secondary-light mb-1">稅後報酬率</p>
            <p class="text-2xl font-black" :class="afterTaxYield >= 3 ? 'text-green-600' : 'text-orange-500'">{{ afterTaxYield.toFixed(2) }}%</p>
            <p class="text-xs text-text-secondary-light mt-1">扣所得稅</p>
          </div>
          <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 p-4 text-center">
            <p class="text-xs text-text-secondary-light mb-1">回本年限</p>
            <p class="text-2xl font-black text-blue-600">{{ paybackYears }}</p>
            <p class="text-xs text-text-secondary-light mt-1">稅後淨收入</p>
          </div>
        </div>

        <!-- Tax Breakdown -->
        <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 p-5">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-gold-500">account_balance</span>
            台灣租金所得稅試算（第一年）
          </h2>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between py-1.5 border-b border-ink-50 dark:border-ink-800">
              <span class="text-text-secondary-light">租金收入（扣空置）</span>
              <span class="font-medium">NT${{ tax.rentalIncome.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-ink-50 dark:border-ink-800">
              <span class="text-text-secondary-light">必要費用扣除 43%</span>
              <span class="font-medium text-green-600">-NT${{ tax.deduction.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-ink-50 dark:border-ink-800">
              <span class="text-text-secondary-light">租賃所得淨額</span>
              <span class="font-medium">NT${{ tax.rentalNetIncome.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-ink-50 dark:border-ink-800">
              <span class="text-text-secondary-light">合計綜合所得（含其他所得）</span>
              <span class="font-medium">NT${{ tax.totalIncome.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-ink-50 dark:border-ink-800">
              <span class="text-text-secondary-light">適用稅率</span>
              <span class="font-bold text-orange-500">{{ (tax.marginalRate * 100).toFixed(0) }}%</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-ink-50 dark:border-ink-800">
              <span class="text-text-secondary-light">估計應繳稅額（租賃部分）</span>
              <span class="font-medium text-red-500">NT${{ tax.taxAmount.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between py-2 bg-surface-light dark:bg-surface-dark rounded-xl px-3 mt-2">
              <span class="font-bold text-text-primary-light dark:text-text-primary-dark">稅後租金淨收入</span>
              <span class="font-black text-green-600">NT${{ tax.afterTaxNet.toLocaleString() }}</span>
            </div>
          </div>
          <p class="mt-3 text-xs text-text-secondary-light">
            * 依財政部租賃所得43%必要費用扣除標準；採累進稅率計算（5/12/20/30/40%）；<br>
              未含免稅額、扣除額等，僅供試算參考，實際以申報為準。
          </p>
        </div>

        <!-- Projection Table -->
        <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 p-5">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-gold-500">trending_up</span>
            {{ params.years }}年收益預測
            <span class="text-xs font-normal text-text-secondary-light ml-1">（含年增率 {{ params.rentIncreaseRate }}%）</span>
          </h2>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[640px] text-sm whitespace-nowrap">
              <thead>
                <tr class="text-xs text-text-secondary-light uppercase border-b border-ink-100 dark:border-ink-800">
                  <th class="pb-2 text-left">年份</th>
                  <th class="pb-2 text-right">月租金</th>
                  <th class="pb-2 text-right">年收入</th>
                  <th class="pb-2 text-right">空置扣除</th>
                  <th class="pb-2 text-right">維護費</th>
                  <th class="pb-2 text-right">稅額</th>
                  <th class="pb-2 text-right font-bold text-text-primary-light dark:text-text-primary-dark">稅後淨利</th>
                  <th class="pb-2 text-right">累計淨利</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in projectionRows" :key="row.year"
                  class="border-b border-ink-50 dark:border-ink-800/50 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                >
                  <td class="py-2.5 font-medium">第 {{ row.year }} 年</td>
                  <td class="py-2.5 text-right">{{ row.monthlyRent.toLocaleString() }}</td>
                  <td class="py-2.5 text-right">{{ row.grossIncome.toLocaleString() }}</td>
                  <td class="py-2.5 text-right text-red-400">-{{ row.vacancyLoss.toLocaleString() }}</td>
                  <td class="py-2.5 text-right text-red-400">-{{ row.maintenance.toLocaleString() }}</td>
                  <td class="py-2.5 text-right text-orange-500">-{{ row.taxAmount.toLocaleString() }}</td>
                  <td class="py-2.5 text-right font-bold text-green-600">{{ row.netProfit.toLocaleString() }}</td>
                  <td class="py-2.5 text-right text-blue-600">{{ row.cumulative.toLocaleString() }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-surface-light dark:bg-surface-dark">
                  <td class="py-2.5 px-2 font-bold rounded-l-lg" :colspan="6">{{ params.years }}年累計稅後淨收入</td>
                  <td class="py-2.5 text-right font-black text-green-600" colspan="2">
                    NT${{ totalNetProfit.toLocaleString() }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { db } from '../../firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { progressiveTax, getMarginalRate, RENTAL_EXPENSE_RATE } from '../../utils/financials/incomeTax'
import { getProperties } from '../../services/propertyService'
import { summarizePropertyInvestment } from '../../utils/investmentSelection'

interface Room {
  id: string
  name: string
  propertyId?: string
  price: number
  size: number
  layout: string
  status: string
  purchaseCost?: number
}

interface Property {
  id: string
  name: string
}

const authStore = useAuthStore()
const rooms = ref<Room[]>([])
const properties = ref<Property[]>([])
const loadingTargets = ref(true)
const selectionMode = ref<'property' | 'room'>('property')
const selectedPropertyId = ref('')
const selectedRoomId = ref('')

const params = ref({
  purchaseCost: 0,
  monthlyRent: 0,
  rentIncreaseRate: 2.5,
  annualMaintenance: 10000,
  vacancyRate: 8.3,
  otherAnnualIncome: 0,
  years: 5
})

const selectedRoom = computed(() => rooms.value.find(r => r.id === selectedRoomId.value) ?? null)
const selectedPropertySummary = computed(() => selectedPropertyId.value
  ? summarizePropertyInvestment(rooms.value, selectedPropertyId.value)
  : null
)

const roomCountByProperty = (propertyId: string) =>
  rooms.value.filter(room => room.propertyId === propertyId).length

watch(selectedRoom, (room) => {
  if (!room || selectionMode.value !== 'room') return
  params.value.monthlyRent = room.price
  if (room.purchaseCost) params.value.purchaseCost = room.purchaseCost
})

watch(selectedPropertySummary, (summary) => {
  if (!summary || selectionMode.value !== 'property') return
  params.value.monthlyRent = summary.monthlyRent
  if (summary.purchaseCost) params.value.purchaseCost = summary.purchaseCost
})

watch(selectionMode, (mode) => {
  if (mode === 'property') selectedRoomId.value = ''
  else selectedPropertyId.value = ''
})

// ---- Core calculations ----

const annualGrossRent = computed(() => params.value.monthlyRent * 12)

const vacancyLoss = computed(() =>
  Math.round(annualGrossRent.value * (params.value.vacancyRate / 100))
)

const effectiveAnnualRent = computed(() => annualGrossRent.value - vacancyLoss.value)

// Gross yield = 年總租收 / 購入成本
const grossYield = computed(() => {
  if (!params.value.purchaseCost) return 0
  return (annualGrossRent.value / params.value.purchaseCost) * 100
})

// Net yield = (年收入 - 空置 - 維護) / 購入成本
const netAnnualIncome = computed(() =>
  effectiveAnnualRent.value - params.value.annualMaintenance
)

const netYield = computed(() => {
  if (!params.value.purchaseCost) return 0
  return (netAnnualIncome.value / params.value.purchaseCost) * 100
})

// Taiwan tax calculation for a given rental income
function calcTax(rentalIncome: number, otherIncome: number): number {
  const rentalNetIncome = Math.round(rentalIncome * (1 - RENTAL_EXPENSE_RATE))
  const totalIncome = otherIncome + rentalNetIncome
  if (totalIncome <= 0) return 0

  // Calculate total tax on combined income, then subtract tax on other income alone
  const taxOnTotal = progressiveTax(totalIncome)
  const taxOnOther = progressiveTax(otherIncome)
  return Math.max(0, Math.round(taxOnTotal - taxOnOther))
}

// Year 1 tax detail
const tax = computed(() => {
  const rentalIncome = effectiveAnnualRent.value
  const deduction = Math.round(rentalIncome * RENTAL_EXPENSE_RATE)
  const rentalNetIncome = rentalIncome - deduction
  const totalIncome = params.value.otherAnnualIncome + rentalNetIncome
  const taxAmount = calcTax(rentalIncome, params.value.otherAnnualIncome)
  const marginalRate = getMarginalRate(totalIncome)
  const afterTaxNet = netAnnualIncome.value - taxAmount
  return { rentalIncome, deduction, rentalNetIncome, totalIncome, taxAmount, marginalRate, afterTaxNet }
})

const afterTaxYield = computed(() => {
  if (!params.value.purchaseCost) return 0
  return (tax.value.afterTaxNet / params.value.purchaseCost) * 100
})

const paybackYears = computed(() => {
  if (tax.value.afterTaxNet <= 0 || !params.value.purchaseCost) return '—'
  return (params.value.purchaseCost / tax.value.afterTaxNet).toFixed(1) + ' 年'
})

// ---- Projection table ----
const projectionRows = computed(() => {
  const rows = []
  let cumulative = 0
  let rent = params.value.monthlyRent
  const maintenanceBase = params.value.annualMaintenance

  for (let y = 1; y <= params.value.years; y++) {
    const grossIncome = Math.round(rent * 12)
    const vacancyLossY = Math.round(grossIncome * (params.value.vacancyRate / 100))
    const effectiveRent = grossIncome - vacancyLossY
    const maintenance = maintenanceBase
    const taxAmount = calcTax(effectiveRent, params.value.otherAnnualIncome)
    const netProfit = effectiveRent - maintenance - taxAmount
    cumulative += netProfit
    rows.push({
      year: y,
      monthlyRent: Math.round(rent),
      grossIncome,
      vacancyLoss: vacancyLossY,
      maintenance,
      taxAmount,
      netProfit,
      cumulative
    })
    rent = rent * (1 + params.value.rentIncreaseRate / 100)
  }
  return rows
})

const totalNetProfit = computed(() =>
  projectionRows.value.reduce((sum, r) => sum + r.netProfit, 0)
)

// ---- Load investment targets ----
const loadTargets = async () => {
  if (!authStore.user) return
  loadingTargets.value = true
  try {
    const [snap, propertyList] = await Promise.all([
      getDocs(query(collection(db, 'rooms'), where('landlordId', '==', authStore.effectiveUid))),
      getProperties(authStore.effectiveUid),
    ])
    rooms.value = snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        name: data.name || data.roomName || '未命名',
        propertyId: data.propertyId || undefined,
        price: Number(data.price) || 0,
        size: Number(data.size) || 0,
        layout: data.layout || '',
        status: data.status || 'vacant',
        purchaseCost: data.purchaseCost ? Number(data.purchaseCost) : undefined
      }
    })
    properties.value = propertyList.map(property => ({ id: property.id, name: property.name || '未命名建物' }))
  } finally {
    loadingTargets.value = false
  }
}

onMounted(() => {
  if (authStore.userProfile) {
    loadTargets()
  } else {
    const stop = watch(() => authStore.userProfile, (p) => { if (p) { stop(); loadTargets() } })
  }
})
</script>

