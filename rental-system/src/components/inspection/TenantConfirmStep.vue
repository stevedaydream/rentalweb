<template>
  <div ref="rootEl" class="space-y-4">
    <div class="flex items-center gap-3">
      <div class="flex-1 h-1.5 rounded-full bg-ink-100 dark:bg-ink-700 overflow-hidden">
        <div class="h-full bg-gold-500 transition-all" :style="{ width: `${percent}%` }"></div>
      </div>
      <span class="text-xs text-text-secondary-light shrink-0 tabular-nums">
        {{ progress.done }} / {{ progress.total }}
      </span>
    </div>

    <p class="text-xs text-text-secondary-light">
      <template v-if="isMoveOut">
        每一項都會顯示入住當時的狀況與照片，請對照後判斷現在的狀況。
        入住時就有的瑕疵不會算在你頭上。
      </template>
      <template v-else>
        請逐項看過房間現況再點選。點「嚴重瑕疵」需要拍一張照片，這是為了保障你——
        退租時才有依據證明這不是你造成的。
      </template>
    </p>

    <div v-for="entry in pageItems" :key="entry.key"
      class="p-4 rounded-2xl border transition-colors"
      :class="entryReady(entry)
        ? 'border-ink-100 dark:border-ink-700'
        : 'border-gold-300 dark:border-gold-700 bg-gold-50/30 dark:bg-gold-900/10'">
      <div class="flex items-baseline gap-2 mb-3">
        <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ entry.name }}</h3>
        <span v-if="entry.kind === 'asset' && entry.quantity > 1" class="text-xs text-text-secondary-light">
          × {{ entry.quantity }}
        </span>
        <span class="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-ink-100 dark:bg-ink-700 text-text-secondary-light">
          {{ entry.kind === 'asset' ? '物品' : '屋況' }}
        </span>
      </div>

      <div v-if="entry.baseline" class="mb-3 p-3 rounded-xl bg-surface-light dark:bg-ink-800/60">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-[11px] text-text-secondary-light">入住當時</span>
          <span class="px-2 py-0.5 rounded-full text-[11px] font-bold" :class="baselineBadge(entry.baseline.condition)">
            {{ CONDITION_LABELS[entry.baseline.condition] }}
          </span>
          <span v-if="entry.baseline.note" class="text-[11px] text-text-secondary-light">「{{ entry.baseline.note }}」</span>
        </div>
        <div v-if="entry.baseline.photos.length" class="flex flex-wrap gap-1.5 mt-2">
          <img v-for="p in entry.baseline.photos" :key="p.id" :src="p.thumbUrl"
            :alt="`${entry.name} 入住當時照片`"
            class="w-12 h-12 rounded object-cover border border-ink-100 dark:border-ink-700">
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="opt in OPTIONS" :key="opt.value"
          @click="emit('set-condition', entry.key, opt.value)"
          class="py-3 rounded-xl text-sm font-bold border-2 transition-colors"
          :class="entry.tenantCondition === opt.value ? opt.active : opt.idle"
          :aria-pressed="entry.tenantCondition === opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <div v-if="entry.tenantCondition && entry.tenantCondition !== 'normal'" class="mt-3 space-y-2">
        <div>
          <p class="text-xs text-text-secondary-light mb-1.5">是什麼狀況？可複選</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="r in DEFECT_REASONS" :key="r"
              @click="toggleReason(entry, r)"
              class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              :class="hasReason(entry, r)
                ? 'border-gold-500 bg-gold-500 text-white'
                : 'border-ink-200 dark:border-ink-600 text-text-secondary-light'"
              :aria-pressed="hasReason(entry, r)"
            >{{ r }}</button>
            <button
              @click="toggleOther(entry)"
              class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              :class="otherOpen(entry)
                ? 'border-gold-500 bg-gold-500 text-white'
                : 'border-ink-200 dark:border-ink-600 text-text-secondary-light'"
              :aria-pressed="otherOpen(entry)"
            >{{ OTHER_REASON }}</button>
          </div>
        </div>
        <input
          v-if="otherOpen(entry)"
          :value="entry.note || ''"
          @input="emit('set-note', entry.key, ($event.target as HTMLInputElement).value)"
          type="text" class="form-input text-sm" :aria-label="`${entry.name} 的其他說明`"
          placeholder="請描述狀況（如：左下角有一道 5 公分刮痕）"
        >
        <PhotoCapture
          :photos="entry.photos"
          :entry-name="entry.name"
          :previews="previews"
          :missing="photoRequired(entry) && entry.photos.length === 0"
          :busy="busyKey === entry.key"
          @pick="emit('add-photo', entry.key, $event)"
          @remove="emit('remove-photo', entry.key, $event)"
        />
      </div>
    </div>

    <div class="flex items-center gap-3 pt-2">
      <button
        @click="page = Math.max(0, page - 1)" :disabled="page === 0"
        class="px-5 py-3 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-text-secondary-light disabled:opacity-30"
      >上一頁</button>

      <span class="text-xs text-text-secondary-light tabular-nums">{{ page + 1 }} / {{ pages.length || 1 }}</span>

      <button
        v-if="page < pages.length - 1"
        @click="nextPage" :disabled="!pageComplete"
        class="ml-auto px-6 py-3 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 disabled:opacity-40 transition-colors"
      >下一頁</button>

      <span v-else class="ml-auto text-xs text-text-secondary-light">最後一頁</span>
    </div>

    <p v-if="!pageComplete" class="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
      <span class="material-symbols-outlined text-[16px]" aria-hidden="true">info</span>
      本頁還有項目未完成
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PhotoCapture from './PhotoCapture.vue'
import {
  paginate, entryReady, photoRequired, tenantProgress,
  DEFECT_REASONS, OTHER_REASON, CONDITION_LABELS,
  type InspectionEntry,
} from '../../utils/inspection'
import type { Condition } from '../../utils/inventory'

const props = defineProps<{
  items: InspectionEntry[]
  previews: Record<string, string>
  /** 正在壓縮照片的項目 key */
  busyKey?: string
}>()
const emit = defineEmits<{
  'set-condition': [string, Condition]
  'set-reasons': [string, string[]]
  'set-note': [string, string]
  'add-photo': [string, File]
  'remove-photo': [string, string]
}>()


const baselineBadge = (c: Condition) => {
  if (c === 'total') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  if (c === 'minor') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
  return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
}

const hasReason = (e: InspectionEntry, r: string) => (e.reasons || []).includes(r)

const toggleReason = (e: InspectionEntry, r: string) => {
  const cur = e.reasons || []
  emit('set-reasons', e.key, hasReason(e, r) ? cur.filter(x => x !== r) : [...cur, r])
}

/** 「其他」以 reasons 內的標記表示，收起時一併清掉已輸入的自由文字 */
const otherOpen = (e: InspectionEntry) => hasReason(e, OTHER_REASON)

const toggleOther = (e: InspectionEntry) => {
  const cur = e.reasons || []
  if (otherOpen(e)) {
    emit('set-reasons', e.key, cur.filter(x => x !== OTHER_REASON))
    emit('set-note', e.key, '')
  } else {
    emit('set-reasons', e.key, [...cur, OTHER_REASON])
  }
}

const OPTIONS = [
  {
    value: 'normal' as Condition, label: '正常',
    active: 'border-green-500 bg-green-500 text-white',
    idle: 'border-ink-200 dark:border-ink-600 text-text-secondary-light hover:border-green-400',
  },
  {
    value: 'minor' as Condition, label: '輕微瑕疵',
    active: 'border-amber-500 bg-amber-500 text-white',
    idle: 'border-ink-200 dark:border-ink-600 text-text-secondary-light hover:border-amber-400',
  },
  {
    value: 'total' as Condition, label: '嚴重瑕疵',
    active: 'border-red-500 bg-red-500 text-white',
    idle: 'border-ink-200 dark:border-ink-600 text-text-secondary-light hover:border-red-400',
  },
]

const page = ref(0)
const rootEl = ref<HTMLElement | null>(null)

const isMoveOut = computed(() => props.items.some(e => !!e.baseline))
const pages = computed(() => paginate(props.items))
const pageItems = computed(() => pages.value[page.value] || [])
const pageComplete = computed(() => pageItems.value.every(entryReady))
const progress = computed(() => tenantProgress(props.items))
const percent = computed(() =>
  progress.value.total ? Math.round((progress.value.done / progress.value.total) * 100) : 0,
)

// 品項在租客這一輪不會增減，但頁數仍可能因資料重載而變動
watch(pages, list => { if (page.value > list.length - 1) page.value = Math.max(0, list.length - 1) })

const nextPage = () => {
  if (!pageComplete.value) return
  page.value = Math.min(pages.value.length - 1, page.value + 1)
  // 捲動容器是 InspectionSession 的 <main>，不是 window
  rootEl.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}
</script>
