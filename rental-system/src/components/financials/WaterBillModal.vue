<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>

    <div role="dialog" aria-modal="true" aria-labelledby="water-bill-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92dvh]">
      <div class="px-6 py-4 border-b border-ink-100 dark:border-ink-700 flex justify-between items-center shrink-0">
        <h2 id="water-bill-title" class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
          <span class="material-symbols-outlined text-sky-500" aria-hidden="true">water_drop</span>登錄台水帳單
        </h2>
        <button @click="close" aria-label="關閉" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="p-6 space-y-5 overflow-y-auto">
        <div class="flex gap-2">
          <button type="button" @click="scopeKind = 'property'" :aria-pressed="scopeKind === 'property'"
            class="flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all"
            :class="scopeKind === 'property' ? 'bg-sky-50 text-sky-700 border-sky-400 dark:bg-sky-900/20 dark:text-sky-300' : 'border-ink-100 dark:border-ink-700 text-ink-400'">
            整棟帳單
          </button>
          <button type="button" @click="scopeKind = 'room'" :aria-pressed="scopeKind === 'room'" :disabled="!independentRooms.length"
            class="flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all disabled:opacity-40"
            :class="scopeKind === 'room' ? 'bg-sky-50 text-sky-700 border-sky-400 dark:bg-sky-900/20 dark:text-sky-300' : 'border-ink-100 dark:border-ink-700 text-ink-400'">
            獨立水號房間
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label for="water-target" class="block text-xs font-semibold text-text-secondary-light mb-1">
              {{ scopeKind === 'property' ? '所屬建物' : '房間' }}
            </label>
            <select v-if="scopeKind === 'property'" id="water-target" v-model="propertyId" class="form-input text-sm">
              <option value="" disabled>請選擇建物</option>
              <option v-for="p in properties" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <select v-else id="water-target" v-model="roomId" class="form-input text-sm">
              <option value="" disabled>請選擇房間</option>
              <option v-for="r in independentRooms" :key="r.id" :value="r.id">
                {{ r.name }}{{ r.waterNo ? `（水號 ${r.waterNo}）` : '' }}
              </option>
            </select>
          </div>
          <div>
            <label for="water-start" class="block text-xs font-semibold text-text-secondary-light mb-1">計費期間起</label>
            <input id="water-start" v-model="periodStart" type="date" class="form-input text-sm">
          </div>
          <div>
            <label for="water-end" class="block text-xs font-semibold text-text-secondary-light mb-1">計費期間迄</label>
            <input id="water-end" v-model="periodEnd" type="date" class="form-input text-sm">
          </div>
          <div>
            <label for="water-amount" class="block text-xs font-semibold text-text-secondary-light mb-1">帳單金額</label>
            <input id="water-amount" v-model.number="total" type="number" min="0" inputmode="numeric" class="form-input text-sm">
          </div>
          <div>
            <label for="water-date" class="block text-xs font-semibold text-text-secondary-light mb-1">繳費日</label>
            <input id="water-date" v-model="date" type="date" class="form-input text-sm">
          </div>
        </div>

        <p v-if="duplicateWarning" role="alert" class="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
          已登錄過這個對象、期間重疊的台水帳單，請確認不是重複登錄。
        </p>

        <!-- 分攤預覽 -->
        <section v-if="plan" class="space-y-2">
          <p v-if="plan.note" class="text-xs text-text-secondary-light">{{ plan.note }}</p>
          <p v-if="plan.invalid.length" class="text-xs text-red-600">
            以下租客的租期日期有誤，未列入分攤，請先修正或手動記一筆：{{ plan.invalid.join('、') }}
          </p>
          <div v-if="rows.length" class="rounded-xl border border-ink-100 dark:border-ink-800 overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-surface-light dark:bg-surface-dark text-xs text-text-secondary-light">
                <tr>
                  <th class="text-left px-3 py-2 font-medium">租客</th>
                  <th class="text-right px-3 py-2 font-medium">居住天數</th>
                  <th v-if="plan.basis === 'person' && plan.mode === 'split'" class="text-right px-3 py-2 font-medium">人數</th>
                  <th class="text-right px-3 py-2 font-medium w-32">應付</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.tenantDocId" class="border-t border-ink-100 dark:border-ink-800">
                  <td class="px-3 py-1.5">{{ r.label }}</td>
                  <td class="px-3 py-1.5 text-right">{{ r.days }}</td>
                  <td v-if="plan.basis === 'person' && plan.mode === 'split'" class="px-3 py-1.5 text-right">{{ r.people }}</td>
                  <td class="px-3 py-1.5 text-right">
                    <input v-model.number="r.amount" type="number" min="0" class="w-24 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-right"
                      :aria-label="`${r.label} 應付水費`">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="rows.length" class="text-xs" :class="remainder < 0 ? 'text-red-600' : 'text-text-secondary-light'">
            向租客收 NT$ {{ collected.toLocaleString() }}，房東負擔 NT$ {{ remainder.toLocaleString() }}
            {{ remainder < 0 ? '（收取金額超過帳單，請確認）' : '' }}。金額改成 0 的租客不開單。
          </p>
        </section>
      </div>

      <div class="px-6 py-4 border-t border-ink-100 dark:border-ink-700 flex justify-end gap-3 shrink-0">
        <button @click="close" class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">取消</button>
        <button @click="save" :disabled="!canSave || saving"
          class="px-5 py-2 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 disabled:opacity-50 transition-colors">
          {{ saving ? '登錄中…' : collectedCount ? `登錄並開 ${collectedCount} 張水費帳單` : '登錄支出' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import {
  planWaterBill, overlapsWaterBill, type WaterPlanRow, type WaterBillScope,
  type WaterRoomInput, type WaterTenantInput, type WaterPropertyInput,
} from '../../utils/financials/waterBilling'
import { getWaterBills, saveWaterBill, type WaterBillDoc } from '../../services/waterBillService'
import { validDate } from '../../utils/meter/billing'

const props = defineProps<{
  show: boolean
  properties: WaterPropertyInput[]
  rooms: WaterRoomInput[]
  templateFeeWater?: string
}>()
const emit = defineEmits<{ 'update:show': [value: boolean]; saved: [] }>()

const authStore = useAuthStore()
const toast = useToastStore()

const today = () => new Date().toISOString().slice(0, 10)
const scopeKind = ref<'property' | 'room'>('property')
const propertyId = ref('')
const roomId = ref('')
const periodStart = ref('')
const periodEnd = ref('')
const total = ref<number | undefined>()
const date = ref(today())
const saving = ref(false)
const tenants = ref<WaterTenantInput[]>([])
const existing = ref<WaterBillDoc[]>([])
const rows = ref<WaterPlanRow[]>([])

const independentRooms = computed(() => props.rooms.filter(r => r.waterMode === 'independent'))

watch(() => props.show, async (v) => {
  if (!v) return
  scopeKind.value = 'property'
  propertyId.value = props.properties.length === 1 ? props.properties[0]!.id : ''
  roomId.value = ''
  periodStart.value = ''
  periodEnd.value = ''
  total.value = undefined
  date.value = today()
  try {
    const uid = authStore.effectiveUid
    const [snap, bills] = await Promise.all([
      getDocs(query(collection(db, 'tenants'), where('landlordId', '==', uid))),
      getWaterBills(uid),
    ])
    tenants.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as WaterTenantInput))
    existing.value = bills
  } catch (e) {
    console.error('load water bill data error:', e)
    toast.error('讀取租客資料失敗')
  }
})

const scope = computed<WaterBillScope | null>(() => {
  if (scopeKind.value === 'property') return propertyId.value ? { kind: 'property', propertyId: propertyId.value } : null
  return roomId.value ? { kind: 'room', roomId: roomId.value } : null
})

const validInput = computed(() => !!scope.value && validDate(periodStart.value) && validDate(periodEnd.value)
  && periodStart.value <= periodEnd.value && Number(total.value) > 0 && validDate(date.value))

const plan = computed(() => {
  if (!validInput.value) return null
  return planWaterBill({
    scope: scope.value!, properties: props.properties, rooms: props.rooms, tenants: tenants.value,
    templateFeeWater: props.templateFeeWater,
    periodStart: periodStart.value, periodEnd: periodEnd.value, total: Math.round(Number(total.value)),
  })
})

// 預覽重算時覆蓋手動修改（期間或金額變了，舊的調整已不適用）
watch(plan, (p) => { rows.value = (p?.rows ?? []).map(r => ({ ...r })) })

const collected = computed(() => rows.value.reduce((s, r) => s + Math.max(0, Math.round(Number(r.amount) || 0)), 0))
const collectedCount = computed(() => rows.value.filter(r => Number(r.amount) > 0).length)
const remainder = computed(() => Math.round(Number(total.value) || 0) - collected.value)
const duplicateWarning = computed(() => !!scope.value && validDate(periodStart.value) && validDate(periodEnd.value)
  && overlapsWaterBill(existing.value, scope.value, periodStart.value, periodEnd.value))
const canSave = computed(() => validInput.value && !!plan.value && remainder.value >= 0)

const close = () => { if (!saving.value) emit('update:show', false) }

const save = async () => {
  if (!canSave.value || !plan.value || !scope.value) return
  saving.value = true
  try {
    const res = await saveWaterBill(authStore.effectiveUid, {
      scope: scope.value, plan: plan.value,
      rows: rows.value.map(r => ({ ...r, amount: Math.max(0, Math.round(Number(r.amount) || 0)) })),
      periodStart: periodStart.value, periodEnd: periodEnd.value,
      total: Math.round(Number(total.value)), date: date.value,
    })
    toast.success(res.incomeCount ? `台水帳單已登錄，開出 ${res.incomeCount} 張水費帳單` : '台水帳單已登錄')
    emit('saved')
    emit('update:show', false)
  } catch (e) {
    console.error('save water bill error:', e)
    toast.error('登錄失敗，請稍後再試')
  } finally {
    saving.value = false
  }
}
</script>
