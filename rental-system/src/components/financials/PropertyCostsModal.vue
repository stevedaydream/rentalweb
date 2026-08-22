<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>

    <div
      role="dialog" aria-modal="true" aria-labelledby="costs-modal-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]"
    >
      <div class="p-6 border-b border-ink-100 dark:border-ink-700 flex justify-between items-center shrink-0">
        <div>
          <h2 id="costs-modal-title" class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ view === 'list' ? '稅費與保險' : (editing ? '編輯費用' : '新增費用') }}
          </h2>
          <p class="text-sm text-text-secondary-light">房屋稅、地價稅與火災險，依建物歸屬</p>
        </div>
        <button @click="close" aria-label="關閉" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <!-- ===== 列表 ===== -->
      <template v-if="view === 'list'">
        <div class="px-6 py-3 border-b border-ink-100 dark:border-ink-700 flex items-center gap-3 shrink-0">
          <select v-model="yearFilter" aria-label="篩選年度"
            class="px-3 py-1.5 bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 rounded-lg text-sm outline-none">
            <option value="all">所有年度</option>
            <option v-for="y in years" :key="y" :value="String(y)">{{ y }}</option>
          </select>
          <button @click="openForm(null)" :disabled="properties.length === 0"
            class="ml-auto px-3 py-2 bg-gold-500 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gold-600 disabled:opacity-50 transition-colors">
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>新增費用
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-3">
          <div v-if="properties.length === 0" class="p-6 text-center text-sm bg-amber-50 dark:bg-amber-900/10 rounded-xl text-amber-800 dark:text-amber-300">
            請先到「房源管理 → 建物」建立建物，費用才有歸屬對象。
          </div>

          <div v-else-if="loading" class="py-12 text-center text-text-secondary-light">載入中...</div>

          <div v-else-if="filteredCosts.length === 0" class="py-12 text-center text-text-secondary-light">
            <span class="material-symbols-outlined text-4xl block mb-2 text-ink-200" aria-hidden="true">receipt_long</span>
            尚無費用紀錄
          </div>

          <div v-for="c in filteredCosts" :key="c.id"
            class="border border-ink-100 dark:border-ink-700 rounded-xl p-4 space-y-2.5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-full" :class="typeBadge(c.type)">{{ c.type }}</span>
              <span class="text-sm font-bold">NT$ {{ c.amount.toLocaleString() }}</span>
              <span v-if="c.paidAt" class="text-xs font-bold text-green-600 inline-flex items-center gap-0.5">
                <span class="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>{{ c.paidAt }} 已繳
              </span>
              <span v-else class="text-xs font-bold" :class="dueClass(c.dueDate)">
                {{ c.dueDate ? `${c.dueDate} 截止${dueLabel(c.dueDate)}` : '未設期限' }}
              </span>
              <a v-if="c.attachmentUrl" :href="c.attachmentUrl" target="_blank" rel="noopener"
                class="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5">
                <span class="material-symbols-outlined text-[14px]" aria-hidden="true">attach_file</span>憑證
              </a>
            </div>

            <p class="text-xs text-text-secondary-light">
              期間 {{ c.periodStart }} ~ {{ c.periodEnd }}
              <span v-if="c.docNo"> · 單號 {{ c.docNo }}</span>
            </p>

            <div class="flex flex-wrap gap-1.5">
              <span v-for="a in c.allocations" :key="a.propertyId"
                class="text-xs bg-surface-light dark:bg-surface-dark rounded px-2 py-0.5">
                {{ propertyName(a.propertyId) }} {{ a.amount.toLocaleString() }}
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button v-if="!c.paidAt" @click="markPaid(c)" :disabled="busyId === c.id"
                class="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 hover:bg-green-100 hover:text-green-700 disabled:opacity-50 transition-colors">
                {{ busyId === c.id ? '處理中…' : '標記已繳' }}
              </button>
              <button v-else @click="unmarkPaid(c)" :disabled="busyId === c.id"
                class="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-light dark:bg-surface-dark text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700 disabled:opacity-50 transition-colors">
                取消已繳
              </button>
              <button @click="openForm(c)" class="px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-500 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">編輯</button>
              <template v-if="confirmDeleteId === c.id">
                <span class="text-xs text-red-600">連同已落帳的支出一併刪除？</span>
                <button @click="doDelete(c)" class="text-xs text-red-600 hover:underline">確定</button>
                <button @click="confirmDeleteId = null" class="text-xs text-gray-500 hover:underline">取消</button>
              </template>
              <button v-else @click="confirmDeleteId = c.id"
                class="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">刪除</button>
            </div>
          </div>
        </div>
      </template>

      <!-- ===== 表單 ===== -->
      <template v-else>
        <div class="p-6 overflow-y-auto space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label for="cost-type" class="block text-sm font-medium text-text-secondary-light mb-1">種類</label>
              <select id="cost-type" v-model="form.type" @change="applyDefaults" class="form-input">
                <option v-for="t in costTypes" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div>
              <label for="cost-year" class="block text-sm font-medium text-text-secondary-light mb-1">年度</label>
              <input id="cost-year" v-model.number="formYear" @change="applyDefaults" type="number" class="form-input">
            </div>
            <div>
              <label for="cost-due" class="block text-sm font-medium text-text-secondary-light mb-1">繳納期限</label>
              <input id="cost-due" v-model="form.dueDate" type="date" class="form-input">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="cost-start" class="block text-sm font-medium text-text-secondary-light mb-1">所屬期間 起</label>
              <input id="cost-start" v-model="form.periodStart" type="date" class="form-input">
            </div>
            <div>
              <label for="cost-end" class="block text-sm font-medium text-text-secondary-light mb-1">所屬期間 迄</label>
              <input id="cost-end" v-model="form.periodEnd" type="date" class="form-input">
            </div>
          </div>
          <p class="text-xs text-text-secondary-light -mt-3">{{ periodHint }}</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="cost-amount" class="block text-sm font-medium text-text-secondary-light mb-1">稅單／保單總額</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">NT$</span>
                <input id="cost-amount" v-model.number="form.amount" @input="onAmountInput" type="number" class="form-input pl-10 text-lg font-bold" placeholder="0">
              </div>
            </div>
            <div>
              <label for="cost-docno" class="block text-sm font-medium text-text-secondary-light mb-1">稅單號／保單號</label>
              <input id="cost-docno" v-model="form.docNo" type="text" class="form-input">
            </div>
          </div>

          <!-- 分攤 -->
          <section class="border-t border-ink-100 dark:border-ink-700 pt-4 space-y-3">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">分攤到建物</h3>
              <button v-if="properties.length > 1" @click="doEvenSplit" type="button"
                class="text-xs text-gold-600 hover:underline">平均分攤</button>
              <span class="ml-auto text-xs font-bold" :class="allocDiff === 0 ? 'text-green-600' : 'text-red-600'">
                加總 {{ allocSum.toLocaleString() }}
                <span v-if="allocDiff !== 0">／ 差 {{ allocDiff > 0 ? '+' : '' }}{{ allocDiff.toLocaleString() }}</span>
              </span>
            </div>
            <p v-if="properties.length > 1" class="text-xs text-text-secondary-light">
              地價稅是按縣市合併計算後開單，一張稅單可能涵蓋多棟的地。不分攤的建物填 0。
            </p>
            <div v-for="p in properties" :key="p.id" class="flex items-center gap-3">
              <span class="text-sm flex-1 min-w-0 truncate">{{ p.name }}</span>
              <input
                :value="allocOf(p.id)" @input="setAlloc(p.id, $event)"
                type="number" class="form-input w-32 text-right" :aria-label="`${p.name} 分攤金額`"
              >
            </div>
          </section>

          <!-- 憑證 -->
          <section class="border-t border-ink-100 dark:border-ink-700 pt-4">
            <label class="block text-sm font-medium text-text-secondary-light mb-2">憑證（稅單／保單掃描檔，選填）</label>
            <div class="flex items-center gap-3 flex-wrap">
              <input ref="fileInput" type="file" accept="image/*,application/pdf" class="hidden" @change="handleUpload">
              <button @click="fileInput?.click()" :disabled="uploading" type="button"
                class="px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-700 text-sm hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50 transition-colors">
                {{ uploading ? '上傳中…' : '選擇檔案' }}
              </button>
              <a v-if="form.attachmentUrl" :href="form.attachmentUrl" target="_blank" rel="noopener"
                class="text-sm text-blue-600 hover:underline">已上傳，點此檢視</a>
              <button v-if="form.attachmentUrl" @click="form.attachmentUrl = ''" type="button"
                class="text-sm text-red-500 hover:underline">移除</button>
            </div>
          </section>
        </div>

        <div class="p-6 border-t border-ink-100 dark:border-ink-700 flex justify-end gap-3 shrink-0">
          <button @click="view = 'list'" class="px-5 py-2 rounded-xl text-ink-500 hover:bg-surface-light font-medium transition-colors">返回</button>
          <button @click="save" :disabled="saving"
            class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold shadow-md hover:bg-gold-600 disabled:opacity-50 transition-colors">
            {{ saving ? '儲存中…' : '儲存' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useToastStore } from '../../stores/toast'
import { useAuthStore } from '../../stores/auth'
import { PropertyCostType, type Property, type PropertyCost } from '../../types/index'
import {
  getPropertyCosts, addPropertyCost, updatePropertyCost, deletePropertyCost,
  markCostPaid, unmarkCostPaid, type PropertyCostPayload,
} from '../../services/propertyCostService'
import {
  defaultPeriodFor, costYearOf, allocationTotal, evenSplit, validateCost,
} from '../../utils/financials/propertyCosts'

const props = defineProps<{
  show: boolean
  properties: Property[]
}>()

const emit = defineEmits<{ 'update:show': [value: boolean] }>()

const toast = useToastStore()
const authStore = useAuthStore()
const storage = getStorage()

const costs = ref<PropertyCost[]>([])
const loading = ref(true)
const view = ref<'list' | 'form'>('list')
const editing = ref<PropertyCost | null>(null)
const yearFilter = ref<string>('all')
const busyId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)
const saving = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const costTypes = [PropertyCostType.HouseTax, PropertyCostType.LandTax, PropertyCostType.FireInsurance]

const blankForm = (): PropertyCostPayload => ({
  type: PropertyCostType.HouseTax,
  periodStart: '', periodEnd: '', dueDate: '',
  amount: 0, allocations: [], docNo: '', attachmentUrl: '',
})

const form = ref<PropertyCostPayload>(blankForm())
const formYear = ref(new Date().getFullYear())

const load = async () => {
  loading.value = true
  try {
    costs.value = await getPropertyCosts(authStore.effectiveUid)
  } catch (e) {
    console.error('load property costs error:', e)
    toast.error('載入費用失敗')
  } finally {
    loading.value = false
  }
}

watch(() => props.show, (val) => {
  if (!val) return
  view.value = 'list'
  confirmDeleteId.value = null
  load()
})

const propertyName = (id: string) => props.properties.find(p => p.id === id)?.name || '未指定建物'

const years = computed(() => {
  const set = new Set<number>()
  costs.value.forEach(c => { const y = costYearOf(c); if (y) set.add(y) })
  return Array.from(set).sort((a, b) => b - a)
})

const filteredCosts = computed(() =>
  yearFilter.value === 'all'
    ? costs.value
    : costs.value.filter(c => String(costYearOf(c)) === yearFilter.value),
)

// --- 表單 ---
const openForm = (c: PropertyCost | null) => {
  editing.value = c
  if (c) {
    form.value = {
      type: c.type, periodStart: c.periodStart, periodEnd: c.periodEnd, dueDate: c.dueDate,
      amount: c.amount, allocations: c.allocations.map(a => ({ ...a })),
      docNo: c.docNo ?? '', attachmentUrl: c.attachmentUrl ?? '',
    }
    formYear.value = costYearOf(c) ?? new Date().getFullYear()
  } else {
    form.value = blankForm()
    formYear.value = new Date().getFullYear()
    applyDefaults()
    // 只有一棟時直接全額掛上去，省得每次都要填分攤
    if (props.properties.length === 1) {
      form.value.allocations = [{ propertyId: props.properties[0]!.id, amount: 0 }]
    }
  }
  view.value = 'form'
}

/**
 * 依種類與年度帶入預設期間。
 *
 * 火災險沒有法定期間，改帶建物資料裡的保單起訖——但只在「恰好一棟有登錄
 * 保單」時才帶：多棟各有各的保單，隨便挑一棟的日期填進去會安靜地產生
 * 錯誤期間，寧可留白讓使用者自己填。
 */
const applyDefaults = () => {
  if (form.value.type === PropertyCostType.FireInsurance) {
    const withPolicy = props.properties.filter(p => p.fireInsurance?.startDate)
    const fi = withPolicy.length === 1 ? withPolicy[0]!.fireInsurance : undefined
    form.value.periodStart = fi?.startDate ?? ''
    form.value.periodEnd = fi?.endDate ?? ''
    form.value.dueDate = fi?.startDate ?? ''
    return
  }
  const d = defaultPeriodFor(form.value.type, formYear.value)
  form.value.periodStart = d.periodStart
  form.value.periodEnd = d.periodEnd
  form.value.dueDate = d.dueDate
}

const periodHint = computed(() => {
  switch (form.value.type) {
    case PropertyCostType.HouseTax:
      return '房屋稅課稅期間為前一年 7/1 ～ 當年 6/30，5 月開徵、5/31 截止。'
    case PropertyCostType.LandTax:
      return '地價稅為曆年制，11 月開徵、11/30 截止。'
    default:
      return '火災險依保單起訖。僅有一棟登錄過保單時會自動帶入，多棟時請自行填寫該棟的保單期間。'
  }
})

const allocOf = (propertyId: string) =>
  form.value.allocations.find(a => a.propertyId === propertyId)?.amount ?? 0

const setAlloc = (propertyId: string, e: Event) => {
  const amount = Number((e.target as HTMLInputElement).value) || 0
  const list = form.value.allocations.filter(a => a.propertyId !== propertyId)
  list.push({ propertyId, amount })
  form.value.allocations = list
}

const allocSum = computed(() => allocationTotal(form.value.allocations))
const allocDiff = computed(() => allocSum.value - (Number(form.value.amount) || 0))

const doEvenSplit = () => {
  form.value.allocations = evenSplit(Number(form.value.amount) || 0, props.properties.map(p => p.id))
}

// 只有一棟時金額即分攤額，不必手動同步
const onAmountInput = () => {
  if (props.properties.length !== 1) return
  const id = props.properties[0]!.id
  form.value.allocations = [{ propertyId: id, amount: Number(form.value.amount) || 0 }]
}

const handleUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { toast.warning('檔案不能超過 5MB'); return }
  uploading.value = true
  try {
    const path = `property_costs/${authStore.effectiveUid}/${Date.now()}_${file.name}`
    const snap = await uploadBytes(storageRef(storage, path), file)
    form.value.attachmentUrl = await getDownloadURL(snap.ref)
    toast.success('憑證已上傳')
  } catch (err) {
    console.error('upload attachment error:', err)
    toast.error('上傳失敗')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const save = async () => {
  const nonZero = form.value.allocations.filter(a => a.amount !== 0)
  const error = validateCost({ ...form.value, allocations: nonZero })
  if (error) { toast.warning(error); return }

  saving.value = true
  try {
    const payload: PropertyCostPayload = { ...form.value, allocations: nonZero }
    if (editing.value) {
      await updatePropertyCost(editing.value.id, payload)
      // 已落帳者金額或分攤可能改了，重新落一次帳讓 bills 跟上
      if (editing.value.paidAt) {
        await markCostPaid(
          { ...editing.value, ...payload } as PropertyCost,
          editing.value.paidAt,
          new Map(props.properties.map(p => [p.id, p.name])),
        )
      }
      toast.success('費用已更新')
    } else {
      await addPropertyCost(authStore.effectiveUid, payload)
      toast.success('費用已新增')
    }
    view.value = 'list'
    await load()
  } catch (e) {
    console.error('save property cost error:', e)
    toast.error('儲存失敗')
  } finally {
    saving.value = false
  }
}

// --- 繳納狀態 ---
const markPaid = async (c: PropertyCost) => {
  busyId.value = c.id
  try {
    const today = new Date().toISOString().slice(0, 10)
    await markCostPaid(c, today, new Map(props.properties.map(p => [p.id, p.name])))
    toast.success(`已標記繳納，並落帳 ${c.allocations.length} 筆支出`)
    await load()
  } catch (e) {
    console.error('mark cost paid error:', e)
    toast.error('標記失敗')
  } finally {
    busyId.value = null
  }
}

const unmarkPaid = async (c: PropertyCost) => {
  busyId.value = c.id
  try {
    await unmarkCostPaid(c)
    toast.success('已取消繳納紀錄，對應支出一併移除')
    await load()
  } catch (e) {
    console.error('unmark cost paid error:', e)
    toast.error('取消失敗')
  } finally {
    busyId.value = null
  }
}

const doDelete = async (c: PropertyCost) => {
  try {
    await deletePropertyCost(c)
    confirmDeleteId.value = null
    toast.success('費用已刪除')
    await load()
  } catch (e) {
    console.error('delete property cost error:', e)
    toast.error('刪除失敗')
  }
}

// --- 顯示輔助 ---
const typeBadge = (t: string) => ({
  [PropertyCostType.HouseTax]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  [PropertyCostType.LandTax]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  [PropertyCostType.FireInsurance]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}[t] || 'bg-surface-light text-ink-500')

const daysUntil = (dateStr?: string): number | null => {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

const dueLabel = (dateStr?: string) => {
  const d = daysUntil(dateStr)
  if (d === null) return ''
  if (d < 0) return `（逾期 ${-d} 天）`
  if (d === 0) return '（今天）'
  return `（剩 ${d} 天）`
}

const dueClass = (dateStr?: string) => {
  const d = daysUntil(dateStr)
  if (d === null) return 'text-ink-400'
  if (d < 0) return 'text-red-600'
  if (d <= 14) return 'text-orange-500'
  return 'text-text-secondary-light'
}

const close = () => emit('update:show', false)
</script>
