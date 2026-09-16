<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>

    <div role="dialog" aria-modal="true" aria-labelledby="batch-wizard-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92dvh]">
      <div class="px-6 py-4 border-b border-ink-100 dark:border-ink-700 flex justify-between items-start gap-3 shrink-0">
        <div>
          <h2 id="batch-wizard-title" class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ step === 'property' ? (newOnly ? '新增建物' : '批量新增房間') : `批量新增房間 — ${target?.name ?? ''}` }}
          </h2>
          <p class="text-xs text-text-secondary-light mt-0.5">
            {{ step === 'property' ? '步驟 1／2：建物' : '步驟 2／2：房間' }}
          </p>
        </div>
        <button @click="close" aria-label="關閉" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <!-- 步驟 1：選擇或新增建物 -->
      <div v-if="step === 'property'" class="p-6 space-y-5 overflow-y-auto">
        <div v-if="!newOnly && properties.length" class="space-y-2">
          <label for="wizard-property" class="block text-sm font-medium text-text-secondary-light">加到哪一棟</label>
          <select id="wizard-property" v-model="pickedId" class="form-input">
            <option v-for="p in properties" :key="p.id" :value="p.id">{{ p.name }}</option>
            <option value="__new__">＋ 新增建物…</option>
          </select>
        </div>

        <div v-if="newOnly || pickedId === '__new__' || !properties.length" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="wizard-name" class="block text-sm font-medium text-text-secondary-light mb-1">建物名稱 *</label>
            <input id="wizard-name" v-model="newName" class="form-input" placeholder="例如：桃園中正路">
          </div>
          <div>
            <label for="wizard-address" class="block text-sm font-medium text-text-secondary-light mb-1">門牌地址</label>
            <input id="wizard-address" v-model="newAddress" class="form-input" placeholder="房間會帶入這個地址">
          </div>
          <p class="sm:col-span-2 text-xs text-text-secondary-light">
            會同時建立同名的電表總表。房屋稅籍、地號、火險等資料可之後在「編輯建物」補上。
          </p>
        </div>
      </div>

      <!-- 步驟 2：批量房間 -->
      <div v-else class="p-6 space-y-6 overflow-y-auto">
        <section class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label for="wizard-from" class="block text-xs font-medium text-text-secondary-light mb-1">起始樓層</label>
            <input id="wizard-from" v-model.number="floorFrom" type="number" class="form-input">
          </div>
          <div>
            <label for="wizard-to" class="block text-xs font-medium text-text-secondary-light mb-1">結束樓層</label>
            <input id="wizard-to" v-model.number="floorTo" type="number" class="form-input">
          </div>
          <div>
            <label for="wizard-count" class="block text-xs font-medium text-text-secondary-light mb-1">每層間數</label>
            <input id="wizard-count" v-model.number="defaultCount" type="number" min="0" class="form-input">
          </div>
          <div>
            <label for="wizard-scheme" class="block text-xs font-medium text-text-secondary-light mb-1">房號規則</label>
            <select id="wizard-scheme" v-model="scheme" class="form-input">
              <option value="number">樓層＋序號（401）</option>
              <option value="letter">樓層＋字母（4A）</option>
            </select>
          </div>
          <div>
            <label for="wizard-prefix" class="block text-xs font-medium text-text-secondary-light mb-1">房號前綴</label>
            <input id="wizard-prefix" v-model="prefix" class="form-input" placeholder="例如：桃園-">
          </div>
          <div>
            <label for="wizard-suffix" class="block text-xs font-medium text-text-secondary-light mb-1">房號後綴</label>
            <input id="wizard-suffix" v-model="suffix" class="form-input" placeholder="選填">
          </div>
        </section>

        <section v-if="floors.length" class="space-y-2">
          <p class="text-xs font-medium text-text-secondary-light">各層間數（可個別調整）</p>
          <div class="flex flex-wrap gap-2">
            <label v-for="f in floors" :key="f" class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-light dark:bg-surface-dark text-sm">
              <span class="font-bold w-10 text-right">{{ floorName(f) }}</span>
              <input v-model.number="floorCounts[f]" type="number" min="0" class="w-16 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                :aria-label="`${floorName(f)} 間數`">
            </label>
          </div>
        </section>

        <section class="grid grid-cols-3 gap-4">
          <div>
            <label for="wizard-price" class="block text-xs font-medium text-text-secondary-light mb-1">預設月租</label>
            <input id="wizard-price" v-model.number="defaultPrice" type="number" min="0" class="form-input">
          </div>
          <div>
            <label for="wizard-size" class="block text-xs font-medium text-text-secondary-light mb-1">預設坪數</label>
            <input id="wizard-size" v-model.number="defaultSize" type="number" min="0" class="form-input">
          </div>
          <div>
            <label for="wizard-layout" class="block text-xs font-medium text-text-secondary-light mb-1">預設格局</label>
            <select id="wizard-layout" v-model="defaultLayout" class="form-input">
              <option v-for="l in LAYOUTS" :key="l">{{ l }}</option>
            </select>
          </div>
        </section>

        <div class="flex flex-wrap items-center gap-3">
          <button type="button" @click="generate"
            class="px-4 py-2 rounded-xl border border-gold-400 text-gold-700 dark:text-gold-300 text-sm font-bold hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors">
            {{ rows.length ? '重新產生房號' : '產生房號' }}
          </button>
          <span v-if="rows.length" class="text-xs text-text-secondary-light">重新產生會覆蓋下表的修改</span>
        </div>

        <section v-if="rows.length" class="space-y-2">
          <div class="overflow-x-auto">
            <table class="w-full text-sm min-w-[560px]">
              <thead>
                <tr class="text-left text-xs text-text-secondary-light">
                  <th class="pb-1 font-medium w-14">樓層</th>
                  <th class="pb-1 font-medium">房號</th>
                  <th class="pb-1 font-medium w-28">月租</th>
                  <th class="pb-1 font-medium w-20">坪數</th>
                  <th class="pb-1 font-medium w-32">格局</th>
                  <th class="w-8"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in rows" :key="r.key" :class="dupes[i] ? 'opacity-60' : ''">
                  <td class="py-1 pr-2 font-bold">{{ floorName(r.floor) }}</td>
                  <td class="py-1 pr-2">
                    <input v-model="r.name" class="form-input text-sm" :aria-label="`第 ${i + 1} 列房號`"
                      :class="dupes[i] || !r.name.trim() ? 'border-red-400' : ''">
                    <p v-if="dupes[i]" class="text-[11px] text-red-600 mt-0.5">
                      {{ dupes[i] === 'existing' ? '已有同名房間，將略過' : '與上方房號重複，將略過' }}
                    </p>
                  </td>
                  <td class="py-1 pr-2"><input v-model.number="r.price" type="number" min="0" class="form-input text-sm" aria-label="月租"></td>
                  <td class="py-1 pr-2"><input v-model.number="r.size" type="number" min="0" class="form-input text-sm" aria-label="坪數"></td>
                  <td class="py-1 pr-2">
                    <select v-model="r.layout" class="form-input text-sm" aria-label="格局">
                      <option v-for="l in LAYOUTS" :key="l">{{ l }}</option>
                    </select>
                  </td>
                  <td class="py-1">
                    <button type="button" @click="rows.splice(i, 1)" aria-label="刪除此列"
                      class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-text-secondary-light">
            房間建立後為「待租、不公開」，沒有照片也可以；要公開到找房頁時再補照片。同一位房東的房號不可重複，多棟時建議加前綴。
          </p>
        </section>
      </div>

      <div class="px-6 py-4 border-t border-ink-100 dark:border-ink-700 flex flex-wrap justify-end gap-3 shrink-0">
        <button @click="close" class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
          {{ step === 'rooms' && createdProperty ? '稍後再建房間' : '取消' }}
        </button>
        <template v-if="step === 'property'">
          <button v-if="newOnly" @click="confirmProperty(false)" :disabled="busy"
            class="px-5 py-2 rounded-xl border border-gold-400 text-gold-700 dark:text-gold-300 font-bold hover:bg-gold-50 dark:hover:bg-gold-900/20 disabled:opacity-50 transition-colors">
            只建立建物
          </button>
          <button @click="confirmProperty(true)" :disabled="busy"
            class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 disabled:opacity-50 transition-colors">
            {{ busy ? '處理中…' : '下一步：批量建立房間' }}
          </button>
        </template>
        <button v-else @click="submit" :disabled="busy || !creatableCount || hasEmptyName"
          class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 disabled:opacity-50 transition-colors">
          {{ busy ? '建立中…' : `建立 ${creatableCount} 間房` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Property } from '../../types/index'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { floorLabel, floorRange, generateRoomNames, findDuplicates, type RoomNamingScheme } from '../../utils/roomBatch'
import { createPropertyWithMeterGroup, batchCreateRooms } from '../../services/buildingService'

const LAYOUTS = ['獨立套房', '分租套房', '雅房', '整層住家']

const props = defineProps<{
  show: boolean
  properties: Property[]
  /** 房東既有房間，用於重複檢查 */
  rooms: { id: string; name: string }[]
  /** 直接從某棟開始（建物卡片的「批量新增房間」） */
  propertyId?: string
  /** 「新增建物」入口：只能新增，且可選擇只建建物 */
  newOnly?: boolean
}>()
const emit = defineEmits<{ 'update:show': [value: boolean]; done: [] }>()

const authStore = useAuthStore()
const toast = useToastStore()

const step = ref<'property' | 'rooms'>('property')
const pickedId = ref('')
const newName = ref('')
const newAddress = ref('')
const target = ref<Property | null>(null)
const createdProperty = ref(false)
const busy = ref(false)

const floorFrom = ref(2)
const floorTo = ref(5)
const defaultCount = ref(4)
const floorCounts = ref<Record<number, number>>({})
const scheme = ref<RoomNamingScheme>('number')
const prefix = ref('')
const suffix = ref('')
const defaultPrice = ref(0)
const defaultSize = ref(0)
const defaultLayout = ref(LAYOUTS[0]!)

interface Row { key: number; floor: number; name: string; price: number; size: number; layout: string }
const rows = ref<Row[]>([])
let rowKey = 0

watch(() => props.show, (v) => {
  if (!v) return
  const preset = props.propertyId ? props.properties.find(p => p.id === props.propertyId) : null
  target.value = preset ? { ...preset } : null
  step.value = preset ? 'rooms' : 'property'
  pickedId.value = props.newOnly || !props.properties.length ? '__new__' : props.properties[0]!.id
  newName.value = ''
  newAddress.value = ''
  createdProperty.value = false
  rows.value = []
  floorCounts.value = {}
  prefix.value = ''
  suffix.value = ''
})

const floors = computed(() => {
  const from = Number(floorFrom.value), to = Number(floorTo.value)
  if (!Number.isFinite(from) || !Number.isFinite(to) || Math.abs(to - from) > 60) return []
  return floorRange(Math.trunc(from), Math.trunc(to))
})

// 範圍或預設間數改變時，未個別調整過的樓層跟著預設值
watch([floors, defaultCount], ([fs, count], old) => {
  const oldCount = old?.[1]
  const next: Record<number, number> = {}
  for (const f of fs) {
    const cur = floorCounts.value[f]
    next[f] = cur === undefined || cur === oldCount ? Number(count) || 0 : cur
  }
  floorCounts.value = next
}, { immediate: true })

const floorName = (f: number) => floorLabel(f)

const generate = () => {
  const generated = generateRoomNames(
    floors.value.map(f => ({ floor: f, count: floorCounts.value[f] ?? 0 })),
    { scheme: scheme.value, prefix: prefix.value, suffix: suffix.value },
  )
  rows.value = generated.map(g => ({
    key: ++rowKey, floor: g.floor, name: g.name,
    price: Number(defaultPrice.value) || 0, size: Number(defaultSize.value) || 0, layout: defaultLayout.value,
  }))
  if (!rows.value.length) toast.warning('沒有產生任何房號，請確認樓層與間數')
}

const dupes = computed(() => findDuplicates(rows.value.map(r => r.name), props.rooms.map(r => r.name)))
const hasEmptyName = computed(() => rows.value.some(r => !r.name.trim()))
const creatableCount = computed(() => dupes.value.filter(d => !d).length)

const close = () => {
  if (busy.value) return
  if (createdProperty.value) emit('done')
  emit('update:show', false)
}

const confirmProperty = async (continueToRooms: boolean) => {
  const creating = props.newOnly || pickedId.value === '__new__' || !props.properties.length
  if (!creating) {
    const p = props.properties.find(x => x.id === pickedId.value)
    if (!p) return
    target.value = { ...p }
    step.value = 'rooms'
    return
  }
  if (!newName.value.trim()) { toast.warning('請填寫建物名稱'); return }
  if (props.properties.some(p => p.name.trim() === newName.value.trim())) {
    toast.warning('已有同名建物'); return
  }
  busy.value = true
  try {
    target.value = await createPropertyWithMeterGroup(authStore.effectiveUid, { name: newName.value, address: newAddress.value })
    createdProperty.value = true
    toast.success('建物已建立')
    if (continueToRooms) step.value = 'rooms'
    else { emit('done'); emit('update:show', false) }
  } catch (e) {
    console.error('create property error:', e)
    toast.error('建立建物失敗')
  } finally {
    busy.value = false
  }
}

const submit = async () => {
  if (!target.value || !creatableCount.value || hasEmptyName.value) return
  busy.value = true
  try {
    const rowsToCreate = rows.value.filter((_, i) => !dupes.value[i])
    const profile = authStore.userProfile
    const res = await batchCreateRooms(authStore.effectiveUid, target.value, rowsToCreate,
      { name: profile?.name, phone: profile?.phone })
    toast.success(res.skipped.length
      ? `已建立 ${res.created} 間，${res.skipped.length} 間因房號重複略過：${res.skipped.join('、')}`
      : `已建立 ${res.created} 間房`)
    emit('done')
    emit('update:show', false)
  } catch (e) {
    console.error('batch create rooms error:', e)
    toast.error('批量建立失敗，請稍後再試')
  } finally {
    busy.value = false
  }
}
</script>
