<template>
  <div v-if="show" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('skip')"></div>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rebill-rent-title"
      class="relative bg-white dark:bg-ink-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90dvh]"
    >
      <div class="px-6 pt-6 pb-4 space-y-2 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-amber-600" aria-hidden="true">sync_alt</span>
          </div>
          <div>
            <h3 id="rebill-rent-title" class="font-bold text-text-primary-light dark:text-text-primary-dark">繳費方式已變更</h3>
            <p class="text-xs text-text-secondary-light">{{ tenantName }}</p>
          </div>
        </div>
        <p class="text-sm text-text-secondary-light">
          以下租金單還沒繳清，要一併改成新的繳費方式嗎？已繳清的帳單維持不變，涵蓋期滿後自動改用新的繳費方式。
        </p>
      </div>

      <ul class="overflow-y-auto px-6 space-y-2">
        <li v-for="it in items" :key="it.id">
          <label class="flex items-start gap-3 p-3 rounded-xl border border-ink-100 dark:border-ink-700 cursor-pointer hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
            <input v-model="selected" type="checkbox" :value="it.id" class="mt-1 accent-gold-500" />
            <div class="flex-1 min-w-0 text-sm space-y-1">
              <p class="text-text-secondary-light line-through truncate">{{ it.oldDescription }}　NT$ {{ it.oldAmount.toLocaleString() }}</p>
              <p class="font-bold text-text-primary-light dark:text-text-primary-dark truncate">{{ it.description }}　NT$ {{ it.amount.toLocaleString() }}</p>
              <p v-if="it.collected > 0" class="text-xs text-text-secondary-light">
                已收 NT$ {{ it.collected.toLocaleString() }}
                <span v-if="it.settles" class="text-green-600 font-medium">・改完即繳清</span>
                <span v-if="it.excess > 0" class="text-blue-600 font-medium">・多收的 NT$ {{ it.excess.toLocaleString() }} 轉為預收餘額</span>
              </p>
            </div>
          </label>
        </li>
      </ul>

      <p class="px-6 pt-3 text-xs text-text-secondary-light shrink-0">
        改完後，這個月若還沒有租金單，到帳務管理再按一次「一鍵生成帳單」就會補出。
      </p>

      <div class="flex gap-3 p-6 pt-4 shrink-0">
        <button @click="emit('skip')" :disabled="busy"
          class="flex-1 py-2.5 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-ink-600 dark:text-ink-300 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors disabled:opacity-50">
          維持原帳單
        </button>
        <button @click="emit('confirm', selected)" :disabled="busy || selected.length === 0"
          class="flex-1 py-2.5 rounded-xl bg-ink-700 text-white text-sm font-bold hover:bg-ink-800 transition-colors disabled:opacity-50">
          {{ busy ? '處理中…' : '改成新繳費方式' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

export interface RebillRow {
  id: string
  oldDescription: string
  oldAmount: number
  description: string
  amount: number
  collected: number
  settles: boolean
  excess: number
}

const props = defineProps<{
  show: boolean
  tenantName: string
  items: RebillRow[]
  busy?: boolean
}>()

const emit = defineEmits<{
  'confirm': [ids: string[]]
  'skip': []
}>()

const selected = ref<string[]>([])

watch(() => props.show, (v) => {
  if (v) selected.value = props.items.map(i => i.id)
})
</script>
