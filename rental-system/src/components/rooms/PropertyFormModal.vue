<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-modal-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
    >
      <div class="p-6 border-b border-ink-100 dark:border-ink-700 flex justify-between items-center shrink-0">
        <h2 id="property-modal-title" class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
          {{ isEditing ? '編輯建物' : '新增建物' }}
        </h2>
        <button @click="close" aria-label="關閉" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="p-6 space-y-6 overflow-y-auto">
        <!-- 基本資料 -->
        <section class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="prop-name" class="block text-sm font-medium text-text-secondary-light mb-1">建物名稱 *</label>
              <input id="prop-name" v-model="local.name" type="text" class="form-input" placeholder="例如 基隆復興路">
            </div>
            <div>
              <label for="prop-address" class="block text-sm font-medium text-text-secondary-light mb-1">門牌地址</label>
              <input id="prop-address" v-model="local.address" type="text" class="form-input" placeholder="完整門牌">
            </div>
          </div>

          <div>
            <label for="prop-housetax" class="block text-sm font-medium text-text-secondary-light mb-1">房屋稅籍編號</label>
            <input id="prop-housetax" v-model="local.houseTaxNo" type="text" class="form-input" placeholder="房屋稅單上的稅籍編號">
            <p class="text-xs text-text-secondary-light mt-1">房屋稅按稅籍課徵，一棟一個。</p>
          </div>

          <!-- 地號（多筆） -->
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">地號</label>
            <p class="text-xs text-text-secondary-light mb-2">
              一棟可坐落多筆土地。地價稅是按縣市合併計算後開單，一張稅單可能涵蓋多棟的地，屆時可在費用登錄時分攤。
            </p>
            <div v-for="(_, idx) in landNoList" :key="idx" class="flex gap-2 mb-2">
              <input
                v-model="landNoList[idx]" type="text" class="form-input flex-1"
                :aria-label="`地號 ${idx + 1}`" placeholder="例如 ○○段 45-6"
              >
              <button
                @click="landNoList.splice(idx, 1)" type="button"
                class="shrink-0 px-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                :aria-label="`移除地號 ${idx + 1}`"
              >
                <span class="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span>
              </button>
            </div>
            <button
              @click="landNoList.push('')" type="button"
              class="text-sm text-gold-600 hover:underline flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>新增地號
            </button>
          </div>
        </section>

        <!-- 火災保險 -->
        <section class="border-t border-ink-100 dark:border-ink-700 pt-5 space-y-4">
          <h3 class="font-bold text-sm text-text-primary-light dark:text-text-primary-dark flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[18px] text-orange-500" aria-hidden="true">local_fire_department</span>
            火災保險
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="prop-insurer" class="block text-sm font-medium text-text-secondary-light mb-1">保險公司</label>
              <input id="prop-insurer" v-model="fire.insurer" type="text" class="form-input">
            </div>
            <div>
              <label for="prop-policy" class="block text-sm font-medium text-text-secondary-light mb-1">保單號碼</label>
              <input id="prop-policy" v-model="fire.policyNo" type="text" class="form-input">
            </div>
            <div>
              <label for="prop-fire-start" class="block text-sm font-medium text-text-secondary-light mb-1">保單起日</label>
              <input id="prop-fire-start" v-model="fire.startDate" type="date" class="form-input">
            </div>
            <div>
              <label for="prop-fire-end" class="block text-sm font-medium text-text-secondary-light mb-1">保單迄日</label>
              <input id="prop-fire-end" v-model="fire.endDate" type="date" class="form-input">
              <p class="text-xs text-text-secondary-light mt-1">續保提醒以此日期為準。</p>
            </div>
          </div>
        </section>

        <!-- 公益出租人 -->
        <section class="border-t border-ink-100 dark:border-ink-700 pt-5 space-y-3">
          <h3 class="font-bold text-sm text-text-primary-light dark:text-text-primary-dark flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[18px] text-green-600" aria-hidden="true">volunteer_activism</span>
            公益出租人
          </h3>
          <div class="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg text-xs text-green-800 dark:text-green-200">
            資格跟<strong>門牌</strong>走：該門牌下只要有任一租客領有政府租金補貼即自動取得。
            但<strong>整個門牌每月共用一個 15,000 元免稅額</strong>，不會因分租多間而變成多份。
            取得資格與稅捐處實際核定是兩回事，故逐年度分稅目登錄。
          </div>

          <div
            v-for="(pw, idx) in welfareList" :key="idx"
            class="border border-ink-100 dark:border-ink-700 rounded-xl p-3 space-y-2"
          >
            <div class="flex items-center gap-3 flex-wrap">
              <div class="flex items-center gap-1.5">
                <label :for="`pw-year-${idx}`" class="text-sm font-medium text-text-secondary-light">年度</label>
                <input :id="`pw-year-${idx}`" v-model.number="pw.year" type="number" class="form-input w-24" placeholder="2026">
              </div>
              <label class="flex items-center gap-1 text-sm">
                <input v-model="pw.houseTax" type="checkbox" class="rounded"> 房屋稅
              </label>
              <label class="flex items-center gap-1 text-sm">
                <input v-model="pw.landTax" type="checkbox" class="rounded"> 地價稅
              </label>
              <label class="flex items-center gap-1 text-sm">
                <input v-model="pw.incomeTax" type="checkbox" class="rounded"> 綜所稅
              </label>
              <button
                @click="welfareList.splice(idx, 1)" type="button"
                class="ml-auto px-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                :aria-label="`移除 ${pw.year} 年度`"
              >
                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
              </button>
            </div>
            <div>
              <label :for="`pw-doc-${idx}`" class="sr-only">認定函字號</label>
              <input :id="`pw-doc-${idx}`" v-model="pw.docNo" type="text" class="form-input text-sm" placeholder="認定函字號（選填）">
            </div>
          </div>

          <button @click="addWelfareYear" type="button" class="text-sm text-gold-600 hover:underline flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>新增核定年度
          </button>
        </section>

        <section class="border-t border-ink-100 dark:border-ink-700 pt-5">
          <label class="flex items-center gap-2 text-sm text-text-secondary-light">
            <input id="prop-is-test" v-model="local.isTest" type="checkbox" class="rounded">
            這是測試資料（可由租客列表的「清除測試資料」一次移除）
          </label>
        </section>
      </div>

      <div class="p-6 border-t border-ink-100 dark:border-ink-700 flex justify-end gap-3 shrink-0">
        <button @click="close" class="px-5 py-2 rounded-xl text-ink-500 hover:bg-surface-light font-medium transition-colors">取消</button>
        <button @click="handleSave" class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold shadow-md hover:bg-gold-600 transition-colors">儲存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Property, FireInsurance, PublicWelfareYear } from '../../types/index'
import type { PropertyPayload } from '../../services/propertyService'

const props = defineProps<{
  show: boolean
  /** 有值代表編輯既有建物，否則為新增 */
  property: Property | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'save': [payload: PropertyPayload]
}>()

const blank = (): PropertyPayload => ({ name: '' })

const local = ref<PropertyPayload>(blank())
const landNoList = ref<string[]>([])
const fire = ref<FireInsurance>({})
const welfareList = ref<PublicWelfareYear[]>([])
const isEditing = ref(false)

watch(() => props.show, (val) => {
  if (!val) return
  const p = props.property
  isEditing.value = !!p
  local.value = p
    ? { name: p.name, address: p.address, houseTaxNo: p.houseTaxNo, seededFromGroupId: p.seededFromGroupId, isTest: p.isTest }
    : blank()
  landNoList.value = [...(p?.landNos ?? [])]
  fire.value = { ...(p?.fireInsurance ?? {}) }
  welfareList.value = (p?.publicWelfare ?? []).map(w => ({ ...w }))
})

const addWelfareYear = () => {
  const used = new Set(welfareList.value.map(w => w.year))
  let year = new Date().getFullYear()
  while (used.has(year)) year--
  welfareList.value.push({ year, houseTax: false, landTax: false, incomeTax: false })
}

const close = () => emit('update:show', false)

/**
 * Firestore 不接受 undefined，但空字串必須保留——updateDoc 收不到欄位就不會
 * 覆寫，若把 '' 一併剔除，使用者清空地址之類的欄位會存不回去。
 */
const dropUndefined = <T extends Record<string, any>>(obj: T): T => {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    out[k] = v
  }
  return out as T
}

const handleSave = () => {
  emit('save', {
    ...dropUndefined(local.value),
    // 集合一律整包覆寫（含空陣列），才能清掉先前的內容
    landNos: landNoList.value.map(n => n.trim()).filter(Boolean),
    fireInsurance: dropUndefined(fire.value),
    publicWelfare: welfareList.value.filter(w => Number.isFinite(w.year)),
  })
}
</script>
