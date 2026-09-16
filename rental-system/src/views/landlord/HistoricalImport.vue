<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex flex-wrap justify-between gap-4">
      <div>
        <RouterLink :to="{ name: 'LandlordDataImport' }" class="text-sm text-gold-600 hover:underline">← 資料匯入中心</RouterLink>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mt-1">歷史資料遷移</h1>
        <p class="text-text-secondary-light">以舊系統鍵搬入已退租租客、歷史帳單與付款；不會觸發催繳或通知。</p>
      </div>
      <button type="button" @click="downloadHistoricalTemplate"
        class="self-start px-4 py-2 rounded-xl bg-gold-500 text-white font-medium flex gap-2 items-center hover:bg-gold-600 transition-colors">
        <span class="material-symbols-outlined" aria-hidden="true">download</span>下載歷史範本
      </button>
    </div>

    <section class="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-5 text-sm text-blue-900 dark:text-blue-200 space-y-1">
      <p>已繳清的帳單記為已結清；沒繳清的記為「歷史未結」，只供查詢，不會出現在前期欠款、逾期或 LINE 欠費查詢。</p>
      <p>同一個舊系統鍵只能匯入一次，重複匯入會被擋下。</p>
    </section>

    <section class="rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 p-6">
      <label class="block cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-gold-500 rounded-xl p-10 text-center transition-colors">
        <span class="material-symbols-outlined text-4xl text-gold-500" aria-hidden="true">upload_file</span>
        <p class="mt-2 font-medium text-text-primary-light dark:text-text-primary-dark">{{ parsing ? '解析中…' : '選擇歷史資料 Excel' }}</p>
        <input class="sr-only" type="file" accept=".xlsx,.xls,.xlsm" :disabled="parsing || importing" @change="readFile">
      </label>
    </section>

    <section v-if="fileName" class="rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 p-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">預覽：{{ fileName }}</h2>
          <p class="text-sm" :class="errors.length ? 'text-red-600' : 'text-text-secondary-light'">
            <template v-if="errors.length">發現 {{ errors.length }} 項錯誤，修正後重新選擇檔案</template>
            <template v-else-if="plan">
              租客 {{ plan.summary.tenants }}、帳單 {{ plan.summary.bills }}（其中 {{ plan.summary.unsettled }} 筆歷史未結）、付款 {{ plan.summary.payments }}
            </template>
          </p>
        </div>
        <button v-if="plan && !done" type="button" :disabled="importing" @click="execute"
          class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 disabled:opacity-50 transition-colors">
          {{ importing ? '匯入中…' : '確認匯入' }}
        </button>
      </div>

      <ul v-if="errors.length" role="alert"
        class="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 space-y-1 max-h-80 overflow-y-auto">
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>

      <p v-if="done" role="status"
        class="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 text-green-700 dark:text-green-300">
        已完成匯入（任務編號 {{ done }}）。歷史租客可在「租客列表」的已退租清單查閱。
      </p>
    </section>

    <ImportRunList ref="runList" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { buildHistoricalImportPlan, type HistoricalImportPlan } from '../../utils/historicalImport'
import { IMPORT_BILL_CATEGORIES } from '../../utils/landlordImport'
import { cellDate, cellPhone, cellText } from '../../utils/importCells'
import { readSheetRows, readWorkbook, downloadTemplate } from '../../utils/importWorkbook'
import { executeHistoricalImport, getHistoricalImportContext } from '../../services/landlordImportService'
import ImportRunList from '../../components/import/ImportRunList.vue'

const TEMPLATE_VERSION = 3

const authStore = useAuthStore()
const toast = useToastStore()
const parsing = ref(false)
const importing = ref(false)
const fileName = ref('')
const errors = ref<string[]>([])
const plan = ref<HistoricalImportPlan>()
const done = ref('')
const runList = ref<InstanceType<typeof ImportRunList>>()

const SHEETS = {
  tenants: { name: '歷史租客', headers: ['舊租客鍵', '姓名', '舊房號', '退租日', '電話'] },
  bills: { name: '歷史帳單', headers: ['舊帳單鍵', '舊租客鍵', '帳單日', '到期日', '類別', '金額', '說明'] },
  payments: { name: '歷史付款', headers: ['舊付款鍵', '舊帳單鍵', '付款日', '金額', '方式', '備註'] },
} as const

const readFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  parsing.value = true
  done.value = ''
  plan.value = undefined
  try {
    const [X, existing] = await Promise.all([import('xlsx'), getHistoricalImportContext(authStore.effectiveUid)])
    const wb = await readWorkbook(X, file)
    const rows = (key: keyof typeof SHEETS) => readSheetRows(X, wb, SHEETS[key].name)
    const date = (v: unknown) => cellDate(v, X.SSF.parse_date_code)
    const result = buildHistoricalImportPlan({
      tenants: rows('tenants').map(r => ({
        legacyTenantKey: cellText(r[0]), name: cellText(r[1]), legacyRoomKey: cellText(r[2]),
        moveOutDate: cellText(r[3]) ? date(r[3]) : '', phone: cellPhone(r[4]),
      })),
      bills: rows('bills').map(r => ({
        legacyBillKey: cellText(r[0]), legacyTenantKey: cellText(r[1]), date: date(r[2]), dueDate: date(r[3]),
        category: cellText(r[4]), amount: r[5], description: cellText(r[6]),
      })),
      payments: rows('payments').map(r => ({
        legacyPaymentKey: cellText(r[0]), legacyBillKey: cellText(r[1]), date: date(r[2]), amount: r[3],
        method: cellText(r[4]), note: cellText(r[5]),
      })),
    }, existing)
    fileName.value = file.name
    errors.value = result.errors
    plan.value = result.plan
  } catch (e) {
    console.error('parse historical file error:', e)
    toast.error('Excel 解析失敗，請確認使用下載的範本')
  } finally {
    parsing.value = false
  }
}

const execute = async () => {
  if (!plan.value || !authStore.effectiveUid) return
  importing.value = true
  try {
    // 預覽後可能有人剛匯入過同一批，寫入前重新比對舊系統鍵
    const existing = await getHistoricalImportContext(authStore.effectiveUid)
    const recheck = buildHistoricalImportPlan({
      tenants: plan.value.tenants,
      bills: plan.value.bills,
      payments: plan.value.bills.flatMap(b => b.payments.map(p => ({ ...p, legacyBillKey: b.legacyBillKey }))),
    }, existing)
    if (recheck.errors.length) {
      errors.value = recheck.errors
      plan.value = undefined
      toast.warning('資料已變更，請修正後重新選擇檔案')
      return
    }
    const result = await executeHistoricalImport(authStore.effectiveUid, recheck.plan!, fileName.value)
    done.value = result.runId
    toast.success('歷史資料已匯入')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '匯入失敗')
  } finally {
    importing.value = false
    runList.value?.reload()
  }
}

const downloadHistoricalTemplate = async () => {
  const X = await import('xlsx')
  downloadTemplate(X, `歷史資料遷移範本_v${TEMPLATE_VERSION}.xlsx`, [
    [`歷史資料遷移範本 v${TEMPLATE_VERSION}`, ''],
    ['舊系統鍵', '舊系統的租客編號、帳單編號、付款編號，用來串連三張表與防止重複匯入；每個鍵只能出現一次'],
    ['日期', 'Excel 日期格式，或 2026-09-01、2026/9/1、民國 115/9/1'],
    ['金額', '正整數，可含千分位'],
    ['類別', IMPORT_BILL_CATEGORIES.join('、')],
    ['舊房號', '與目前系統的房號相同時，帳單會歸到該房與建物（年度損益用）'],
    ['付款', '同一張帳單可有多筆付款，合計不可超過帳單金額；付清者記為已結清，否則為歷史未結'],
  ], Object.values(SHEETS))
}
</script>
