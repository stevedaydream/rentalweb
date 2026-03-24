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

        <!-- Room selector -->
        <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 p-5 space-y-4">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-gold-500">bedroom_parent</span>
            選擇房源
          </h2>
          <div v-if="loadingRooms" class="text-sm text-text-secondary-light">載入中...</div>
          <select v-else v-model="selectedRoomId" class="form-input text-sm">
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
        </div>

        <!-- Parameters -->
        <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 p-5 space-y-4">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-gold-500">tune</span>
            試算參數
          </h2>

          <div>
            <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">購入成本 (NT$)</label>
            <input v-model.number="params.purchaseCost" type="number" class="form-input text-sm" placeholder="例如 3000000" />
            <p class="text-xs text-text-secondary-light mt-1">含房價、裝潢、代書費等總投入</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">月租金 (NT$)</label>
            <input v-model.number="params.monthlyRent" type="number" class="form-input text-sm" placeholder="例如 12000" />
          </div>

          <div>
            <label class="flex items-center justify-between text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">
              <span>租金年增率 (%)</span>
              <button @click="params.rentIncreaseRate = 2.5" class="text-xs text-gold-500 hover:underline">套用內政部參考值 2.5%</button>
            </label>
            <input v-model.number="params.rentIncreaseRate" type="number" step="0.1" class="form-input text-sm" placeholder="2.5" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">年度維護費用 (NT$)</label>
            <input v-model.number="params.annualMaintenance" type="number" class="form-input text-sm" placeholder="例如 10000" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">空置率 (%)</label>
            <input v-model.number="params.vacancyRate" type="number" step="0.5" min="0" max="100" class="form-input text-sm" placeholder="8.3 (約1個月)" />
            <p class="text-xs text-text-secondary-light mt-1">每年平均空租比例，1個月≈8.3%</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">個人其他年所得 (NT$)</label>
            <input v-model.number="params.otherAnnualIncome" type="number" class="form-input text-sm" placeholder="例如 600000" />
            <p class="text-xs text-text-secondary-light mt-1">薪資等，用於計算稅率級距</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-1.5">試算年數</label>
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
            <table class="w-full text-sm">
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

interface Room {
  id: string
  name: string
  price: number
  size: number
  layout: string
  status: string
  purchaseCost?: number
}

const authStore = useAuthStore()
const rooms = ref<Room[]>([])
const loadingRooms = ref(true)
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

// Taiwan progressive tax brackets (綜合所得稅率)
const TAX_BRACKETS = [
  { limit: 560000,  rate: 0.05 },
  { limit: 1260000, rate: 0.12 },
  { limit: 2520000, rate: 0.20 },
  { limit: 4720000, rate: 0.30 },
  { limit: Infinity, rate: 0.40 },
]

const selectedRoom = computed(() => rooms.value.find(r => r.id === selectedRoomId.value) ?? null)

// Sync room data to params when room is selected
watch(selectedRoom, (room) => {
  if (!room) return
  params.value.monthlyRent = room.price
  if (room.purchaseCost) params.value.purchaseCost = room.purchaseCost
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
  const DEDUCTION_RATE = 0.43
  const rentalNetIncome = Math.round(rentalIncome * (1 - DEDUCTION_RATE))
  const totalIncome = otherIncome + rentalNetIncome
  if (totalIncome <= 0) return 0

  // Calculate total tax on combined income, then subtract tax on other income alone
  const taxOnTotal = progressiveTax(totalIncome)
  const taxOnOther = progressiveTax(otherIncome)
  return Math.max(0, Math.round(taxOnTotal - taxOnOther))
}

function progressiveTax(income: number): number {
  let tax = 0
  let prev = 0
  for (const bracket of TAX_BRACKETS) {
    if (income <= prev) break
    const taxable = Math.min(income, bracket.limit) - prev
    tax += taxable * bracket.rate
    prev = bracket.limit
    if (income <= bracket.limit) break
  }
  return Math.round(tax)
}

function getMarginalRate(income: number): number {
  let prev = 0
  for (const bracket of TAX_BRACKETS) {
    if (income <= bracket.limit) return bracket.rate
    prev = bracket.limit
  }
  return 0.40
}

// Year 1 tax detail
const tax = computed(() => {
  const rentalIncome = effectiveAnnualRent.value
  const DEDUCTION_RATE = 0.43
  const deduction = Math.round(rentalIncome * DEDUCTION_RATE)
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

// ---- Load rooms ----
const loadRooms = async () => {
  if (!authStore.user) return
  loadingRooms.value = true
  try {
    const snap = await getDocs(
      query(collection(db, 'rooms'), where('landlordId', '==', authStore.effectiveUid))
    )
    rooms.value = snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        name: data.name || data.roomName || '未命名',
        price: Number(data.price) || 0,
        size: Number(data.size) || 0,
        layout: data.layout || '',
        status: data.status || 'vacant',
        purchaseCost: data.purchaseCost ? Number(data.purchaseCost) : undefined
      }
    })
  } finally {
    loadingRooms.value = false
  }
}

onMounted(() => {
  if (authStore.userProfile) {
    loadRooms()
  } else {
    const stop = watch(() => authStore.userProfile, (p) => { if (p) { stop(); loadRooms() } })
  }
})
</script>

