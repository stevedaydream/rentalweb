<template>
  <div v-if="request" class="fixed inset-0 z-[120] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>

    <div role="dialog" aria-modal="true" aria-labelledby="purge-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">

      <div class="p-6 border-b border-ink-100 dark:border-ink-700 flex items-start gap-3 shrink-0">
        <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-red-600" aria-hidden="true">delete_forever</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 id="purge-title" class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ title }}</h3>
          <p class="text-xs text-text-secondary-light">此操作無法復原</p>
        </div>
        <button @click="close" aria-label="關閉" class="text-gray-400 hover:text-gray-600 shrink-0">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="p-6 overflow-y-auto space-y-4">
        <div v-if="loading" class="py-8 text-center text-sm text-text-secondary-light">
          <span class="material-symbols-outlined animate-spin motion-reduce:animate-none text-2xl text-ink-300" aria-hidden="true">progress_activity</span>
          <p class="mt-2">掃描關聯資料中…</p>
        </div>

        <div v-else-if="error" class="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 text-sm text-red-700 dark:text-red-300">
          {{ error }}
        </div>

        <div v-else-if="preview && preview.total === 0" class="py-8 text-center text-sm text-text-secondary-light">
          <span class="material-symbols-outlined text-3xl block mb-2 text-ink-200" aria-hidden="true">inbox</span>
          沒有符合條件的資料
        </div>

        <template v-else-if="preview">
          <div class="rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
            <p class="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-xs font-bold text-red-800 dark:text-red-300">
              將永久刪除以下 {{ preview.total }} 筆資料
            </p>
            <ul class="divide-y divide-ink-50 dark:divide-ink-800">
              <li v-for="(count, coll) in preview.summary" :key="coll"
                class="flex items-center justify-between px-4 py-2 text-sm">
                <span class="text-text-secondary-light">{{ COLL_LABEL[coll] || coll }}</span>
                <span class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ count }} 筆</span>
              </li>
              <li v-if="preview.authAccounts > 0"
                class="flex items-center justify-between px-4 py-2 text-sm bg-red-50/50 dark:bg-red-900/10">
                <span class="text-text-secondary-light">登入帳號</span>
                <span class="font-bold text-red-600">{{ preview.authAccounts }} 個</span>
              </li>
            </ul>
          </div>

          <div>
            <label for="purge-confirm" class="block text-sm text-text-secondary-light mb-1.5">
              請輸入 <strong class="text-text-primary-light dark:text-text-primary-dark font-mono">{{ request.confirmWord }}</strong> 確認
            </label>
            <input id="purge-confirm" v-model="typed" type="text" class="form-input" autocomplete="off"
              :placeholder="request.confirmWord">
          </div>
        </template>
      </div>

      <div class="p-6 border-t border-ink-100 dark:border-ink-700 flex justify-end gap-3 shrink-0">
        <button @click="close"
          class="px-5 py-2 rounded-xl text-ink-500 hover:bg-surface-light font-medium transition-colors">取消</button>
        <button
          @click="execute"
          :disabled="!canExecute || executing"
          class="px-5 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-40 transition-colors"
        >{{ executing ? '刪除中…' : '確定刪除' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase/config'
import { useToastStore } from '../../stores/toast'

export interface PurgeRequest {
  scope: 'tenant' | 'test'
  tenantDocId?: string
  /** 必須輸入才能執行的字串；租客用姓名，測試資料用固定字 */
  confirmWord: string
  title: string
}

interface PurgePreview {
  items: { coll: string; id: string; why: string }[]
  summary: Record<string, number>
  authAccounts: number
  total: number
}

const props = defineProps<{ request: PurgeRequest | null }>()
const emit = defineEmits<{ close: []; done: [] }>()

const toast = useToastStore()

const loading = ref(false)
const executing = ref(false)
const error = ref('')
const preview = ref<PurgePreview | null>(null)
const typed = ref('')

const title = computed(() => props.request?.title || '刪除資料')

const COLL_LABEL: Record<string, string> = {
  tenants: '租客', rooms: '房間', properties: '建物',
  bills: '帳單', contracts: '合約', signed_contracts: '簽署合約',
  repair_requests: '報修', messages: '訊息', payment_proofs: '付款證明',
  reviews: '評價', meter_readings: '抄表紀錄', users: '帳號資料',
  tenant_activations: '啟用連結', line_bindings: 'LINE 綁定碼',
}

const canExecute = computed(() =>
  !!preview.value && preview.value.total > 0 &&
  typed.value.trim() === props.request?.confirmWord,
)

const load = async () => {
  if (!props.request) return
  loading.value = true
  error.value = ''
  preview.value = null
  typed.value = ''
  try {
    const fn = httpsCallable(functions, 'purgeData')
    const res: any = await fn({
      mode: 'preview',
      scope: props.request.scope,
      tenantDocId: props.request.tenantDocId,
    })
    preview.value = res.data
  } catch (e: any) {
    error.value = e?.message || '掃描失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

watch(() => props.request, (r) => { if (r) load() }, { immediate: true })

const execute = async () => {
  if (!props.request || !canExecute.value) return
  executing.value = true
  try {
    const fn = httpsCallable(functions, 'purgeData')
    const res: any = await fn({
      mode: 'execute',
      scope: props.request.scope,
      tenantDocId: props.request.tenantDocId,
    })
    const d = res.data
    toast.success(`已刪除 ${d.deleted} 筆資料${d.authDeleted ? `、${d.authDeleted} 個登入帳號` : ''}`)
    emit('done')
    emit('close')
  } catch (e: any) {
    toast.error(e?.message || '刪除失敗')
  } finally {
    executing.value = false
  }
}

const close = () => { if (!executing.value) emit('close') }
</script>
