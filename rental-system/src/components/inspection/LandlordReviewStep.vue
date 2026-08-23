<template>
  <div class="space-y-4">
    <div class="p-3 rounded-xl flex items-start gap-2"
      :class="unresolved
        ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800'
        : 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'">
      <span class="material-symbols-outlined text-[18px] shrink-0"
        :class="unresolved ? 'text-amber-600' : 'text-green-600'" aria-hidden="true">
        {{ unresolved ? 'pending' : 'task_alt' }}
      </span>
      <p class="text-xs" :class="unresolved ? 'text-amber-800 dark:text-amber-300' : 'text-green-800 dark:text-green-300'">
        <template v-if="unresolved">
          還有 {{ unresolved }} 項歧異未達成共識，全部處理完才能進入簽名。
        </template>
        <template v-else>
          沒有未解決的歧異，可以進入簽名。
        </template>
      </p>
    </div>

    <div v-for="entry in items" :key="entry.key"
      class="rounded-2xl border overflow-hidden"
      :class="entry.dispute === 'disputed'
        ? 'border-amber-300 dark:border-amber-700'
        : 'border-ink-100 dark:border-ink-700'">

      <div class="p-4">
        <div class="flex items-baseline gap-2 mb-2">
          <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ entry.name }}</h3>
          <span v-if="entry.kind === 'asset' && entry.quantity > 1" class="text-xs text-text-secondary-light">
            × {{ entry.quantity }}
          </span>
          <span class="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-ink-100 dark:bg-ink-700 text-text-secondary-light">
            {{ entry.kind === 'asset' ? '物品' : '屋況' }}
          </span>
        </div>

        <div class="flex items-center gap-2 text-sm">
          <span class="text-text-secondary-light text-xs">租客判定</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-bold" :class="badge(entry.tenantCondition)">
            {{ label(entry.tenantCondition) }}
          </span>
          <span v-if="composeNote(entry)" class="text-xs text-text-secondary-light truncate">「{{ composeNote(entry) }}」</span>
        </div>

        <div v-if="entry.photos.length" class="flex flex-wrap gap-2 mt-2">
          <button v-for="p in entry.photos" :key="p.id" @click="lightbox = { src: bigOf(p), alt: entry.name, pending: !!p.pending }"
            class="relative w-16 h-16 rounded-lg overflow-hidden border border-ink-100 dark:border-ink-700">
            <img :src="smallOf(p)" :alt="`${entry.name} 照片`" class="w-full h-full object-cover">
            <span v-if="p.pending" class="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] text-center py-0.5">
              待上傳
            </span>
          </button>
        </div>
      </div>

      <!-- 接受 -->
      <div v-if="entry.dispute === 'agreed'"
        class="px-4 py-3 bg-surface-light dark:bg-ink-800/50 flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px] text-green-600" aria-hidden="true">check</span>
        <span class="text-xs text-text-secondary-light">接受租客判定</span>
        <button @click="startDispute(entry)"
          class="ml-auto text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline">
          我不同意
        </button>
      </div>

      <!-- 歧異中 -->
      <div v-else-if="entry.dispute === 'disputed'"
        class="px-4 py-3 bg-amber-50/60 dark:bg-amber-900/10 space-y-3">
        <div>
          <p class="text-xs text-text-secondary-light mb-1.5">我認為是</p>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="opt in OPTIONS" :key="opt.value"
              @click="emit('mark-dispute', entry.key, opt.value, noteOf(entry))"
              class="py-2 rounded-lg text-xs font-bold border-2 transition-colors"
              :class="entry.landlordCondition === opt.value ? opt.active : opt.idle"
              :aria-pressed="entry.landlordCondition === opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>

        <input
          :value="entry.landlordNote || ''"
          @input="emit('mark-dispute', entry.key, entry.landlordCondition || 'normal', ($event.target as HTMLInputElement).value)"
          type="text" class="form-input text-sm" :aria-label="`${entry.name} 的房東說明`"
          placeholder="說明（如：舊漆剝落，交屋前就是這樣）"
        >

        <div class="pt-2 border-t border-amber-200 dark:border-amber-800/60">
          <p class="text-xs text-text-secondary-light mb-1.5">協調後共識</p>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="opt in OPTIONS" :key="opt.value"
              @click="finalDraft[entry.key] = opt.value"
              class="py-2 rounded-lg text-xs font-bold border-2 transition-colors"
              :class="finalDraft[entry.key] === opt.value ? opt.active : opt.idle"
              :aria-pressed="finalDraft[entry.key] === opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>

        <div class="flex gap-2">
          <button @click="emit('clear', entry.key)"
            class="px-3 py-2 rounded-lg text-xs font-medium text-text-secondary-light border border-ink-200 dark:border-ink-600">
            收回歧異
          </button>
          <button
            @click="emit('resolve', entry.key, finalDraft[entry.key]!, entry.landlordNote || '')"
            :disabled="!finalDraft[entry.key]"
            class="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[15px]" aria-hidden="true">handshake</span>
            註記已達成共識
          </button>
        </div>
      </div>

      <!-- 已達成共識 -->
      <div v-else class="px-4 py-3 bg-green-50/60 dark:bg-green-900/10">
        <div class="flex items-center gap-2 flex-wrap text-xs">
          <span class="material-symbols-outlined text-[16px] text-green-600" aria-hidden="true">handshake</span>
          <span class="text-text-secondary-light">共識</span>
          <span class="px-2 py-0.5 rounded-full font-bold" :class="badge(entry.finalCondition)">
            {{ label(entry.finalCondition) }}
          </span>
          <span class="text-text-secondary-light">
            （租客 {{ label(entry.tenantCondition) }} · 房東 {{ label(entry.landlordCondition) }}）
          </span>
          <button @click="reopen(entry)" class="ml-auto font-medium text-text-secondary-light hover:underline">
            重新協調
          </button>
        </div>
        <p v-if="entry.landlordNote" class="mt-1 text-xs text-text-secondary-light">「{{ entry.landlordNote }}」</p>
      </div>
    </div>

    <PhotoLightbox
      v-if="lightbox"
      :src="lightbox.src" :alt="lightbox.alt"
      :hint="lightbox.pending ? '這張照片尚未上傳完成，顯示的是裝置上的暫存檔' : '顯示高解析備查檔'"
      @close="lightbox = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import PhotoLightbox from './PhotoLightbox.vue'
import {
  unresolvedCount, CONDITION_LABELS, composeNote,
  type InspectionEntry, type InspectionPhoto,
} from '../../utils/inspection'
import type { Condition } from '../../utils/inventory'

const props = defineProps<{
  items: InspectionEntry[]
  previews: Record<string, string>
}>()
const emit = defineEmits<{
  'mark-dispute': [string, Condition, string]
  resolve: [string, Condition, string]
  clear: [string]
}>()

const OPTIONS = [
  {
    value: 'normal' as Condition, label: '正常',
    active: 'border-green-500 bg-green-500 text-white',
    idle: 'border-ink-200 dark:border-ink-600 text-text-secondary-light',
  },
  {
    value: 'minor' as Condition, label: '輕微瑕疵',
    active: 'border-amber-500 bg-amber-500 text-white',
    idle: 'border-ink-200 dark:border-ink-600 text-text-secondary-light',
  },
  {
    value: 'total' as Condition, label: '嚴重瑕疵',
    active: 'border-red-500 bg-red-500 text-white',
    idle: 'border-ink-200 dark:border-ink-600 text-text-secondary-light',
  },
]

/** 共識選擇在按下「註記已達成共識」前只是暫存，不動到已存的資料 */
const finalDraft = reactive<Record<string, Condition | undefined>>({})
const lightbox = ref<{ src: string; alt: string; pending: boolean } | null>(null)

const unresolved = computed(() => unresolvedCount(props.items))

const label = (c?: Condition) => (c ? CONDITION_LABELS[c] : '—')

const badge = (c?: Condition) => {
  if (c === 'total') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  if (c === 'minor') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
  if (c === 'normal') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
  return 'bg-ink-100 dark:bg-ink-700 text-text-secondary-light'
}

const smallOf = (p: InspectionPhoto) => p.thumbUrl || props.previews[p.id] || ''
/** 有原檔就看原檔，否則退回縮圖或本地暫存 */
const bigOf = (p: InspectionPhoto) => p.origUrl || p.thumbUrl || props.previews[p.id] || ''

const noteOf = (e: InspectionEntry) => e.landlordNote || ''

/** 預設帶入與租客不同的一個選項，房東還是可以改 */
const startDispute = (e: InspectionEntry) => {
  const fallback: Condition = e.tenantCondition === 'normal' ? 'minor' : 'normal'
  emit('mark-dispute', e.key, fallback, '')
}

const reopen = (e: InspectionEntry) => {
  finalDraft[e.key] = e.finalCondition
  emit('mark-dispute', e.key, e.landlordCondition || 'normal', e.landlordNote || '')
}
</script>
