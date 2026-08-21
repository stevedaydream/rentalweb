<template>
  <div class="space-y-6">

    <!-- 首次進入／有房間未歸屬時的引導 -->
    <div
      v-if="showSeedBanner"
      class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-4"
    >
      <div class="flex items-start gap-3">
        <span class="material-symbols-outlined text-[20px] text-blue-500 shrink-0" aria-hidden="true">auto_awesome</span>
        <div class="flex-1 min-w-0 text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <p class="font-bold">從電表群組自動建立建物</p>
          <p class="text-xs opacity-90">
            系統會為每個台電總表建立一筆建物，並依「房間 → 電表子群組 → 總表」把房間自動歸位。
            已存在的建物與你手動指派過的房間都不會被覆寫，可重複執行。
          </p>
        </div>
        <button
          @click="runSeed" :disabled="seeding"
          class="shrink-0 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {{ seeding ? '建立中…' : '自動建立' }}
        </button>
      </div>
    </div>

    <div class="flex justify-between items-center">
      <p class="text-sm text-text-secondary-light">
        房屋稅、地價稅、火災險與公益出租人皆以建物為單位。
      </p>
      <button
        @click="openForm(null)"
        class="px-4 py-2 bg-gold-500 text-white rounded-lg shadow-sm hover:bg-gold-600 transition-colors text-sm font-medium flex items-center shrink-0"
      >
        <span class="material-symbols-outlined text-[18px] mr-1" aria-hidden="true">add</span>新增建物
      </button>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500">載入建物資料中...</div>

    <div v-else-if="properties.length === 0" class="p-12 text-center bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800">
      <span class="material-symbols-outlined text-4xl mb-2 text-gray-300" aria-hidden="true">apartment</span>
      <p class="text-text-secondary-light">尚未建立任何建物</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        v-for="p in properties" :key="p.id"
        class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col"
      >
        <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start gap-3">
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-lg text-text-primary-light dark:text-text-primary-dark truncate">{{ p.name }}</h3>
            <p v-if="p.address" class="text-xs text-text-secondary-light truncate">{{ p.address }}</p>
          </div>
          <button
            @click="openForm(p)" :aria-label="`編輯 ${p.name}`"
            class="shrink-0 p-2 rounded-lg text-ink-400 hover:text-gold-600 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
          >
            <span class="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span>
          </button>
          <template v-if="confirmDeleteId === p.id">
            <button @click="doDelete(p)" class="shrink-0 text-xs text-red-600 hover:underline self-center">確定刪除</button>
            <button @click="confirmDeleteId = null" class="shrink-0 text-xs text-gray-500 hover:underline self-center">取消</button>
          </template>
          <button
            v-else @click="confirmDeleteId = p.id" :aria-label="`刪除 ${p.name}`"
            class="shrink-0 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <span class="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span>
          </button>
        </div>

        <dl class="px-5 py-4 space-y-2.5 text-sm flex-1">
          <div class="flex gap-3">
            <dt class="w-20 shrink-0 text-text-secondary-light">房屋稅籍</dt>
            <dd class="min-w-0 font-mono">{{ p.houseTaxNo || '—' }}</dd>
          </div>
          <div class="flex gap-3">
            <dt class="w-20 shrink-0 text-text-secondary-light">地號</dt>
            <dd class="min-w-0">
              <span v-if="!p.landNos?.length">—</span>
              <span v-for="ln in p.landNos" :key="ln" class="inline-block bg-surface-light dark:bg-surface-dark rounded px-1.5 py-0.5 mr-1 mb-1 font-mono text-xs">{{ ln }}</span>
            </dd>
          </div>
          <div class="flex gap-3">
            <dt class="w-20 shrink-0 text-text-secondary-light">火災險</dt>
            <dd class="min-w-0">
              <template v-if="p.fireInsurance?.endDate">
                <span :class="fireExpiryClass(p.fireInsurance.endDate)">
                  {{ p.fireInsurance.endDate }} 到期
                  <span v-if="daysUntil(p.fireInsurance.endDate) !== null">
                    （{{ expiryLabel(p.fireInsurance.endDate) }}）
                  </span>
                </span>
                <span v-if="p.fireInsurance.insurer" class="text-xs text-text-secondary-light block">
                  {{ p.fireInsurance.insurer }}
                  <span v-if="p.fireInsurance.policyNo">· {{ p.fireInsurance.policyNo }}</span>
                </span>
              </template>
              <span v-else>—</span>
            </dd>
          </div>
          <div class="flex gap-3">
            <dt class="w-20 shrink-0 text-text-secondary-light">公益出租人</dt>
            <dd class="min-w-0">
              <span v-if="!p.publicWelfare?.length">—</span>
              <span
                v-for="w in sortedWelfare(p)" :key="w.year"
                class="inline-block rounded px-1.5 py-0.5 mr-1 mb-1 text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                :title="welfareTitle(w)"
              >
                {{ w.year }} {{ welfareBadge(w) }}
              </span>
            </dd>
          </div>
        </dl>

        <div class="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-surface-light/50 dark:bg-surface-dark/30">
          <p class="text-[11px] font-bold text-text-secondary-light uppercase tracking-wide mb-2">
            房間（{{ roomsOf(p.id).length }}）
          </p>
          <div v-if="roomsOf(p.id).length === 0" class="text-xs text-ink-300">尚未指派房間</div>
          <div v-else class="flex flex-wrap gap-1.5">
            <span
              v-for="r in roomsOf(p.id)" :key="r.id"
              class="inline-flex items-center gap-1 bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 rounded-lg pl-2 pr-1 py-0.5 text-xs"
            >
              {{ r.name }}
              <button
                @click="assign(r.id, null)" :aria-label="`將 ${r.name} 移出 ${p.name}`"
                class="text-ink-300 hover:text-red-500 transition-colors"
              >
                <span class="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 未指派房間 -->
    <div
      v-if="!loading && unassignedRooms.length > 0"
      class="bg-white dark:bg-card-dark rounded-2xl border border-amber-200 dark:border-amber-800 shadow-sm overflow-hidden"
    >
      <div class="px-5 py-3.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-amber-500" aria-hidden="true">help</span>
        <span class="font-bold text-amber-800 dark:text-amber-300 text-sm">
          未指派建物的房間（{{ unassignedRooms.length }}）
        </span>
        <span class="text-xs text-amber-600 dark:text-amber-400 ml-auto">未指派者不會計入任何一棟的損益</span>
      </div>
      <div class="divide-y divide-ink-50 dark:divide-ink-800">
        <div
          v-for="r in unassignedRooms" :key="r.id"
          class="flex flex-wrap items-center gap-3 px-5 py-3"
        >
          <span class="font-medium text-sm flex-1 min-w-0 truncate">{{ r.name }}</span>
          <select
            :value="''" @change="onAssignSelect(r.id, $event)"
            :aria-label="`指派 ${r.name} 到建物`"
            class="shrink-0 px-3 py-1.5 bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 rounded-lg text-sm outline-none"
          >
            <option value="">選擇建物…</option>
            <option v-for="p in properties" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <PropertyFormModal v-model:show="showForm" :property="editing" @save="handleSave" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToastStore } from '../../stores/toast'
import { useAuthStore } from '../../stores/auth'
import PropertyFormModal from './PropertyFormModal.vue'
import {
  getProperties, addProperty, updateProperty, deleteProperty,
  assignRoomProperty, seedPropertiesFromMeterGroups,
  type PropertyPayload,
} from '../../services/propertyService'
import type { Property, PublicWelfareYear } from '../../types/index'

const props = defineProps<{
  /** 由 RoomManagement 的即時監聽傳入，指派後會自動反映 */
  rooms: { id: string; name: string; propertyId?: string }[]
}>()

const toast = useToastStore()
const authStore = useAuthStore()

const properties = ref<Property[]>([])
const loading = ref(true)
const seeding = ref(false)
const showForm = ref(false)
const editing = ref<Property | null>(null)
const confirmDeleteId = ref<string | null>(null)

const load = async () => {
  try {
    properties.value = await getProperties(authStore.effectiveUid)
  } catch (e) {
    console.error('load properties error:', e)
    toast.error('載入建物失敗')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const roomsOf = (propertyId: string) => props.rooms.filter(r => r.propertyId === propertyId)
const unassignedRooms = computed(() => props.rooms.filter(r => !r.propertyId))

// 沒有任何建物，或還有房間沒歸位時，才提示可以自動建立
const showSeedBanner = computed(() =>
  !loading.value && (properties.value.length === 0 || unassignedRooms.value.length > 0)
)

const runSeed = async () => {
  seeding.value = true
  try {
    const r = await seedPropertiesFromMeterGroups(authStore.effectiveUid)
    await load()
    if (r.createdProperties === 0 && r.assignedRooms === 0) {
      toast.info(
        r.unassignedRooms.length > 0
          ? `沒有可自動歸位的房間。${r.unassignedRooms.length} 間房沒有綁定電表子群組，請手動指派`
          : '沒有需要建立的建物',
      )
    } else {
      const parts = []
      if (r.createdProperties) parts.push(`建立 ${r.createdProperties} 筆建物`)
      if (r.assignedRooms) parts.push(`歸位 ${r.assignedRooms} 間房`)
      if (r.unassignedRooms.length) parts.push(`${r.unassignedRooms.length} 間房待手動指派`)
      toast.success(parts.join('、'))
    }
  } catch (e) {
    console.error('seed properties error:', e)
    toast.error('自動建立失敗')
  } finally {
    seeding.value = false
  }
}

const openForm = (p: Property | null) => {
  editing.value = p
  showForm.value = true
}

const handleSave = async (payload: PropertyPayload) => {
  if (!payload.name?.trim()) { toast.warning('請填寫建物名稱'); return }
  try {
    if (editing.value) {
      await updateProperty(editing.value.id, payload)
      toast.success('建物已更新')
    } else {
      await addProperty(authStore.effectiveUid, payload)
      toast.success('建物已新增')
    }
    showForm.value = false
    await load()
  } catch (e) {
    console.error('save property error:', e)
    toast.error('儲存失敗')
  }
}

const doDelete = async (p: Property) => {
  const attached = roomsOf(p.id)
  try {
    // 先解除房間指派，避免留下指向已刪建物的孤兒 propertyId
    await Promise.all(attached.map(r => assignRoomProperty(r.id, null)))
    await deleteProperty(p.id)
    confirmDeleteId.value = null
    toast.success(attached.length ? `已刪除，${attached.length} 間房改為未指派` : '建物已刪除')
    await load()
  } catch (e) {
    console.error('delete property error:', e)
    toast.error('刪除失敗')
  }
}

const assign = async (roomId: string, propertyId: string | null) => {
  try {
    await assignRoomProperty(roomId, propertyId)
  } catch (e) {
    console.error('assign room error:', e)
    toast.error('指派失敗')
  }
}

const onAssignSelect = (roomId: string, e: Event) => {
  const value = (e.target as HTMLSelectElement).value
  if (value) assign(roomId, value)
}

// --- 顯示輔助 ---
const sortedWelfare = (p: Property): PublicWelfareYear[] =>
  [...(p.publicWelfare ?? [])].sort((a, b) => b.year - a.year)

const welfareBadge = (w: PublicWelfareYear) => {
  const marks = [w.houseTax && '房', w.landTax && '地', w.incomeTax && '綜'].filter(Boolean)
  return marks.length ? marks.join('') : '未核定'
}

const welfareTitle = (w: PublicWelfareYear) => {
  const parts = [
    `房屋稅自住稅率：${w.houseTax ? '已核定' : '未核定'}`,
    `地價稅自用住宅：${w.landTax ? '已核定' : '未核定'}`,
    `綜所稅免稅額：${w.incomeTax ? '適用' : '未適用'}`,
  ]
  if (w.docNo) parts.push(`認定函 ${w.docNo}`)
  return parts.join('\n')
}

const daysUntil = (dateStr?: string): number | null => {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

const expiryLabel = (dateStr?: string) => {
  const d = daysUntil(dateStr)
  if (d === null) return ''
  if (d < 0) return `已過期 ${-d} 天`
  if (d === 0) return '今天到期'
  return `剩 ${d} 天`
}

const fireExpiryClass = (dateStr?: string) => {
  const d = daysUntil(dateStr)
  if (d === null) return ''
  if (d < 0) return 'text-red-600 font-bold'
  if (d <= 30) return 'text-orange-500 font-bold'
  return ''
}
</script>
