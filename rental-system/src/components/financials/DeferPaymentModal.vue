<template>
  <Transition name="modal">
    <div v-if="bill" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="defer-payment-title"
        class="relative bg-white dark:bg-card-dark w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]"
      >
        <div class="px-6 pt-5 pb-4 flex items-center justify-between border-b border-ink-100 dark:border-ink-800 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px] text-blue-600" aria-hidden="true">event_upcoming</span>
            </div>
            <div class="min-w-0">
              <h2 id="defer-payment-title" class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">延後收款</h2>
              <p class="text-xs text-text-secondary-light truncate">{{ bill.target }}・{{ bill.description || bill.category }}</p>
            </div>
          </div>
          <button @click="$emit('close')" aria-label="關閉" class="p-1.5 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-ink-300 hover:text-ink-600">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div class="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div class="rounded-xl bg-surface-light dark:bg-surface-dark px-4 py-3 text-sm space-y-1.5">
            <div class="flex justify-between">
              <span class="text-text-secondary-light">尚欠</span>
              <span class="font-bold text-orange-600">NT$ {{ outstandingOf(bill).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-secondary-light">目前截止日</span>
              <span class="font-medium">{{ bill.dueDate || '未設定' }}</span>
            </div>
            <div v-if="bill.originalDueDate && bill.originalDueDate !== bill.dueDate" class="flex justify-between">
              <span class="text-text-secondary-light">原截止日</span>
              <span class="font-medium">{{ bill.originalDueDate }}</span>
            </div>
          </div>

          <div>
            <label for="defer-until" class="block text-xs font-semibold text-text-secondary-light mb-1.5">新的收款日</label>
            <input id="defer-until" v-model="until" type="date" :min="today" class="form-input" />
          </div>
          <div>
            <label for="defer-reason" class="block text-xs font-semibold text-text-secondary-light mb-1.5">原因（選填）</label>
            <input id="defer-reason" v-model="reason" type="text" maxlength="60" class="form-input" placeholder="例如：租客 10/20 發薪" />
          </div>
          <p class="text-xs text-text-secondary-light">
            新收款日以前不算逾期，也不列入前期欠款；過了新收款日仍未繳，會恢復為逾期。延後紀錄可在「修改紀錄」查看。
          </p>

          <div v-if="pastDeferrals.length" class="space-y-1">
            <p class="text-xs font-semibold text-text-secondary-light">先前延後</p>
            <p v-for="(h, i) in pastDeferrals" :key="i" class="text-xs text-text-secondary-light">
              {{ new Date(h.modifiedAt).toLocaleDateString('zh-TW') }}・{{ h.note }}
            </p>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-ink-100 dark:border-ink-800 flex justify-end gap-2 shrink-0">
          <button @click="$emit('close')" class="px-4 py-2 rounded-xl text-sm font-medium text-ink-500 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">取消</button>
          <button
            @click="confirm"
            :disabled="!valid || busy"
            class="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {{ busy ? '儲存中…' : '確認延後' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { outstandingOf } from '../../utils/financials/payments'
import type { DeferrableBill } from '../../utils/financials/deferral'

const props = defineProps<{
  bill: (DeferrableBill & { target?: string; description?: string }) | null
  busy?: boolean
}>()
const emit = defineEmits<{ close: []; confirm: [until: string, reason: string] }>()

const today = new Date().toISOString().slice(0, 10)
const until = ref('')
const reason = ref('')

watch(() => props.bill, () => {
  until.value = ''
  reason.value = ''
})

const valid = computed(() => !!until.value && until.value >= today && until.value !== props.bill?.dueDate)
const pastDeferrals = computed(() => (props.bill?.history || []).filter(h => h.note))

const confirm = () => { if (valid.value) emit('confirm', until.value, reason.value.trim()) }
</script>
