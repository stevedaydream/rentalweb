<template>
  <section v-if="runs.length" class="rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 p-6 space-y-3">
    <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">匯入紀錄</h2>
    <ul class="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
      <li v-for="run in runs" :key="run.id" class="py-3 flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-0">
          <p class="font-medium text-text-primary-light dark:text-text-primary-dark truncate">
            {{ run.source === 'historical' ? '歷史遷移' : '現況接管' }}・{{ run.fileName }}
          </p>
          <p class="text-xs text-text-secondary-light">
            {{ formatTime(run.createdAt) }}・{{ summaryText(run) }}
            <span v-if="run.error" class="text-red-600">・{{ run.error }}</span>
          </p>
        </div>
        <span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="STATUS[run.status]?.cls">{{ STATUS[run.status]?.label ?? run.status }}</span>
        <template v-if="canRollback(run)">
          <template v-if="confirmId === run.id">
            <button type="button" :disabled="busyId === run.id" @click="rollback(run)"
              class="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50">
              {{ busyId === run.id ? '清除中…' : '確定清除' }}
            </button>
            <button type="button" @click="confirmId = ''" class="px-3 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">取消</button>
          </template>
          <button v-else type="button" @click="confirmId = run.id"
            class="px-3 py-1 rounded-lg border border-red-300 text-red-600 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20">
            清除這次匯入
          </button>
        </template>
      </li>
    </ul>
    <p class="text-xs text-text-secondary-light">
      只有未完成的匯入可以清除；清除會刪除這次匯入建立的所有資料，之後可修正檔案重新匯入。
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { getImportRuns, rollbackImportRun, type ImportRun } from '../../services/landlordImportService'

const authStore = useAuthStore()
const toast = useToastStore()
const runs = ref<ImportRun[]>([])
const confirmId = ref('')
const busyId = ref('')

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: '已完成', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  running: { label: '未完成', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  failed: { label: '失敗，需清除', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  rolled_back: { label: '已清除', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
}

// 匯入中斷（例如關掉分頁）會停在 running；超過 10 分鐘仍未完成才允許清除，避免清掉正在進行的匯入
const canRollback = (run: ImportRun) => run.status === 'failed'
  || (run.status === 'running' && Date.now() / 1000 - (run.createdAt?.seconds ?? 0) > 600)

const formatTime = (t?: { seconds: number }) => t
  ? new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(t.seconds * 1000))
  : '—'

const summaryText = (run: ImportRun) => {
  const s = run.summary ?? {}
  return run.source === 'historical'
    ? `租客 ${s.tenants ?? 0}、帳單 ${s.bills ?? 0}`
    : `建物 ${s.properties ?? 0}、房間 ${s.rooms ?? 0}、租客 ${s.tenants ?? 0}`
}

const reload = async () => {
  try {
    runs.value = await getImportRuns(authStore.effectiveUid)
  } catch (e) {
    console.error('load import runs error:', e)
  }
}

const rollback = async (run: ImportRun) => {
  busyId.value = run.id
  try {
    const count = await rollbackImportRun(authStore.effectiveUid, run)
    toast.success(`已清除這次匯入的 ${count} 筆資料`)
    confirmId.value = ''
    await reload()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '清除失敗')
  } finally {
    busyId.value = ''
  }
}

onMounted(reload)
defineExpose({ reload })
</script>
