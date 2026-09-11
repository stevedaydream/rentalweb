<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="receive-payment-title"
        class="relative bg-white dark:bg-card-dark w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]"
      >
        <div class="px-6 pt-5 pb-4 flex items-center justify-between border-b border-ink-100 dark:border-ink-800 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px] text-green-600" aria-hidden="true">payments</span>
            </div>
            <div class="min-w-0">
              <h2 id="receive-payment-title" class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">收款</h2>
              <p class="text-xs text-text-secondary-light truncate">{{ label }}</p>
            </div>
          </div>
          <button @click="close" aria-label="關閉" class="p-1.5 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-ink-300 hover:text-ink-600">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div class="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div class="flex items-center justify-between rounded-xl bg-surface-light dark:bg-surface-dark px-4 py-3 text-sm">
            <span class="text-text-secondary-light">尚欠合計（{{ ordered.length }} 筆）</span>
            <span class="font-bold text-orange-600">NT$ {{ totalOwed.toLocaleString() }}</span>
          </div>
          <p v-if="(credit ?? 0) > 0" class="text-xs text-blue-600 dark:text-blue-300 -mt-3">
            目前預收餘額 NT$ {{ (credit ?? 0).toLocaleString() }}
          </p>

          <div>
            <label for="receive-amount" class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-2">這次收到</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 font-medium text-sm">NT$</span>
              <input
                id="receive-amount"
                v-model.number="amount"
                type="number"
                inputmode="numeric"
                min="0"
                class="w-full pl-12 pr-4 py-3.5 bg-surface-light dark:bg-surface-dark border-2 border-transparent focus:border-green-400 rounded-xl text-2xl font-bold text-green-700 dark:text-green-300 outline-none transition-colors"
                placeholder="0"
              >
            </div>
            <button v-if="totalOwed > 0 && amount !== totalOwed" type="button" @click="amount = totalOwed"
              class="mt-2 px-3 py-1 rounded-full text-xs font-medium border border-ink-200 dark:border-ink-700 text-ink-500 hover:border-green-400 hover:text-green-700 transition-colors">
              全額 NT$ {{ totalOwed.toLocaleString() }}
            </button>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="receive-date" class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-2">收款日</label>
              <input id="receive-date" v-model="date" type="date" class="form-input text-sm" />
            </div>
            <div>
              <label for="receive-note" class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-2">備註</label>
              <input id="receive-note" v-model="note" type="text" class="form-input text-sm" placeholder="現金、轉帳末五碼…" autocomplete="off" />
            </div>
          </div>

          <div v-if="ordered.length > 0">
            <p class="text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-2">
              扣款順序{{ preferCategory ? `（先扣${preferCategory}，其餘由最舊的開始）` : '（由最舊的開始）' }}
            </p>
            <ul class="rounded-xl border border-ink-100 dark:border-ink-800 divide-y divide-ink-100 dark:divide-ink-800">
              <li v-for="row in preview" :key="row.bill.id" class="flex items-center gap-3 px-3 py-2.5 text-sm">
                <span class="text-xs font-mono text-text-secondary-light shrink-0">{{ row.bill.date }}</span>
                <span class="flex-1 min-w-0 truncate">
                  {{ row.bill.category }}
                  <span v-if="row.bill.description" class="text-xs text-text-secondary-light">｜{{ row.bill.description }}</span>
                </span>
                <span class="shrink-0 text-right whitespace-nowrap">
                  <span class="block text-xs text-text-secondary-light">欠 {{ row.owed.toLocaleString() }}</span>
                  <span v-if="row.settles" class="block text-xs font-bold text-green-600">繳清</span>
                  <span v-else-if="row.apply > 0" class="block text-xs font-bold text-orange-600">
                    扣 {{ row.apply.toLocaleString() }}・剩 {{ (row.owed - row.apply).toLocaleString() }}
                  </span>
                  <span v-else class="block text-xs text-ink-300">未扣</span>
                </span>
              </li>
            </ul>
          </div>

          <div v-if="result.leftover > 0" class="rounded-xl px-4 py-3 text-sm"
            :class="canHoldCredit
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
              : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300'">
            <template v-if="canHoldCredit">
              多收 NT$ {{ result.leftover.toLocaleString() }} 將存為預收餘額，下次生成帳單時自動沖抵。
            </template>
            <template v-else>
              多收 NT$ {{ result.leftover.toLocaleString() }}，但這筆沒有綁定租客，無法存成預收餘額，請調整金額。
            </template>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-ink-100 dark:border-ink-800 flex gap-3 shrink-0">
          <button @click="close"
            class="flex-1 py-3 rounded-xl text-sm font-bold border border-ink-200 dark:border-ink-700 text-ink-500 hover:bg-surface-light transition-colors">
            取消
          </button>
          <button @click="submit" :disabled="!canSubmit || busy"
            class="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {{ busy ? '處理中…' : '確認收款' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { allocatePayment, outstandingOf, byAge, type PayableBill } from '../../utils/financials/payments'

export interface ReceivableBill extends PayableBill {
  description?: string
}

const props = defineProps<{
  show: boolean
  label: string
  /** 可沖銷的帳單（前期＋本期），已結清者自動略過 */
  bills: ReceivableBill[]
  defaultAmount?: number
  defaultDate?: string
  preferCategory?: string
  credit?: number
  /** 有綁定租客才能把溢繳存成預收餘額 */
  canHoldCredit: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'confirm': [payload: { amount: number; date: string; note: string }]
}>()

const todayStr = () => new Date().toISOString().split('T')[0]!

const amount = ref<number | undefined>(undefined)
const date = ref(todayStr())
const note = ref('')

// 與 allocatePayment 相同的順序，預覽才會與實際扣款一致
const ordered = computed(() => {
  const open = props.bills.filter(b => outstandingOf(b) > 0).sort(byAge)
  const pref = props.preferCategory
  return pref ? [...open.filter(b => b.category === pref), ...open.filter(b => b.category !== pref)] : open
})
const totalOwed = computed(() => ordered.value.reduce((s, b) => s + outstandingOf(b), 0))

watch(() => props.show, (v) => {
  if (!v) return
  amount.value = props.defaultAmount ?? totalOwed.value
  date.value = props.defaultDate || todayStr()
  note.value = ''
})

const result = computed(() =>
  allocatePayment(ordered.value, amount.value ?? 0, { preferCategory: props.preferCategory }))

const preview = computed(() => {
  const byId = new Map(result.value.allocations.map(a => [a.billId, a]))
  return ordered.value.map(b => ({
    bill: b,
    owed: outstandingOf(b),
    apply: byId.get(b.id)?.apply ?? 0,
    settles: byId.get(b.id)?.settles ?? false,
  }))
})

const canSubmit = computed(() =>
  (amount.value ?? 0) > 0 && !!date.value && (props.canHoldCredit || result.value.leftover === 0))

const submit = () => {
  if (!canSubmit.value) return
  emit('confirm', { amount: Math.round(amount.value!), date: date.value, note: note.value })
}

const close = () => emit('update:show', false)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-active .relative, .modal-leave-active .relative { transition: transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .relative { transform: translateY(20px); }
</style>
