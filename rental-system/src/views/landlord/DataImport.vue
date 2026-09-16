<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex flex-wrap justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">資料匯入中心</h1>
        <p class="text-text-secondary-light">接管舊資料：先完整驗證，再一次建立現況資料。</p>
      </div>
      <button type="button" @click="downloadCurrentTemplate"
        class="px-4 py-2 rounded-xl bg-gold-500 text-white font-medium flex gap-2 items-center hover:bg-gold-600 transition-colors">
        <span class="material-symbols-outlined" aria-hidden="true">download</span>下載範本
      </button>
    </div>

    <section class="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-5 text-sm text-amber-900 dark:text-amber-200 space-y-1">
      <p class="font-bold">現況接管</p>
      <p>
        建立建物、房間、水費設定、現役租客與租約、未結清帳款、預收餘額，以及每房最近一次電表讀數（之後抄表的起點）。
        不建立登入帳號、不保存原始 Excel。填寫「租金已繳至」的租客，出帳時不會重收已繳月份。
      </p>
    </section>

    <RouterLink :to="{ name: 'LandlordHistoricalImport' }"
      class="block rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-5 text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors">
      <b>歷史資料遷移</b>
      <p class="text-sm mt-1">匯入已退租租客、歷史帳單與逐筆付款；未繳清的歷史帳單標為「歷史未結」，不會被催繳。</p>
    </RouterLink>

    <section class="rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 p-6">
      <label class="block cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-gold-500 rounded-xl p-10 text-center transition-colors">
        <span class="material-symbols-outlined text-4xl text-gold-500" aria-hidden="true">upload_file</span>
        <p class="mt-2 font-medium text-text-primary-light dark:text-text-primary-dark">{{ parsing ? '解析中…' : '選擇已填好的 Excel 範本' }}</p>
        <p class="text-xs text-text-secondary-light mt-1">.xlsx / .xls / .xlsm；日期可用 Excel 日期或 2026/9/1、民國 115/9/1</p>
        <input class="sr-only" type="file" accept=".xlsx,.xls,.xlsm" :disabled="parsing || importing" @change="readFile">
      </label>
    </section>

    <section v-if="fileName" class="rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 p-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">預覽：{{ fileName }}</h2>
          <p class="text-sm" :class="errors.length ? 'text-red-600' : 'text-text-secondary-light'">
            {{ errors.length ? `發現 ${errors.length} 項錯誤，修正後重新選擇檔案` : '驗證通過，可以執行匯入' }}
          </p>
        </div>
        <button v-if="plan && !done" type="button" :disabled="importing" @click="execute"
          class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 disabled:opacity-50 transition-colors">
          {{ importing ? '匯入中…' : '確認匯入' }}
        </button>
      </div>

      <div v-if="plan" class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
        <div v-for="(value, key) in plan.summary" :key="key" class="rounded-lg bg-surface-light dark:bg-surface-dark p-3">
          <b class="block text-lg text-text-primary-light dark:text-text-primary-dark">{{ value }}</b>
          <span class="text-text-secondary-light">{{ summaryLabels[key] }}</span>
        </div>
      </div>

      <ul v-if="errors.length" role="alert"
        class="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 space-y-1 max-h-80 overflow-y-auto">
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>

      <p v-if="done" role="status"
        class="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 text-green-700 dark:text-green-300">
        已完成匯入（任務編號 {{ done }}）。接下來請到「房源管理 → 建物」確認水費與合約附件設定。
      </p>
    </section>

    <ImportRunList ref="runList" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import {
  buildLandlordImportPlan, IMPORT_BILL_CATEGORIES,
  type LandlordImportWorkbook, type LandlordImportPlan,
} from '../../utils/landlordImport'
import { cellDate, cellMonth, cellPhone, cellText } from '../../utils/importCells'
import { readSheetRows, readWorkbook, downloadTemplate } from '../../utils/importWorkbook'
import { executeLandlordImport, getCurrentImportContext } from '../../services/landlordImportService'
import ImportRunList from '../../components/import/ImportRunList.vue'

const TEMPLATE_VERSION = 2

const authStore = useAuthStore()
const toast = useToastStore()
const parsing = ref(false)
const importing = ref(false)
const fileName = ref('')
const errors = ref<string[]>([])
const plan = ref<LandlordImportPlan>()
const done = ref('')
const runList = ref<InstanceType<typeof ImportRunList>>()

const summaryLabels: Record<keyof LandlordImportPlan['summary'], string> = {
  properties: '建物', rooms: '房間', tenants: '租客', leases: '租約',
  bills: '未結清帳款', credits: '預收餘額', meterBaselines: '電表起點',
}

const SHEETS = {
  properties: { name: '建物', headers: ['建物名稱', '地址', '水費方式', '計算單位', '固定月費'] },
  rooms: { name: '房間', headers: ['建物名稱', '樓層', '房號', '月租金', '坪數', '格局', '水費覆寫', '台水水號'] },
  tenants: { name: '租客', headers: ['房號', '姓名', '電話', 'Email', '證件號碼', '居住人數', '緊急聯絡人'] },
  leases: { name: '目前租約', headers: ['房號', '起租日', '到期日', '月租金', '押金月數', '繳費週期', '租金已繳至'] },
  outstanding: { name: '未結清帳款', headers: ['房號', '類別', '金額', '原到期日', '說明', '涵蓋起月', '涵蓋迄月'] },
  credits: { name: '預收餘額', headers: ['房號', '預收餘額', '備註'] },
  meterReadings: { name: '電表讀數', headers: ['房號', '讀表日期', '讀數'] },
} as const

const parse = (X: typeof import('xlsx'), wb: import('xlsx').WorkBook): LandlordImportWorkbook => {
  const rows = (key: keyof typeof SHEETS) => readSheetRows(X, wb, SHEETS[key].name)
  const date = (v: unknown) => cellDate(v, X.SSF.parse_date_code)
  const month = (v: unknown) => cellMonth(v, X.SSF.parse_date_code)
  return {
    properties: rows('properties').map(r => ({
      name: cellText(r[0]), address: cellText(r[1]), waterMode: cellText(r[2]), waterBasis: cellText(r[3]), fixedWaterAmount: r[4],
    })),
    rooms: rows('rooms').map(r => ({
      propertyName: cellText(r[0]), floor: cellText(r[1]), name: cellText(r[2]), rent: r[3], size: r[4],
      layout: cellText(r[5]), waterMode: cellText(r[6]), waterNo: cellText(r[7]),
    })),
    tenants: rows('tenants').map(r => ({
      roomName: cellText(r[0]), name: cellText(r[1]), phone: cellPhone(r[2]), email: cellText(r[3]),
      idNumber: cellText(r[4]), occupants: r[5], emergencyContact: cellText(r[6]),
    })),
    leases: rows('leases').map(r => ({
      roomName: cellText(r[0]), startDate: date(r[1]), endDate: date(r[2]), rent: r[3], depositMonths: r[4],
      paymentFrequency: cellText(r[5]), rentPaidThrough: cellText(r[6]) ? month(r[6]) : '',
    })),
    outstanding: rows('outstanding').map(r => ({
      roomName: cellText(r[0]), category: cellText(r[1]), amount: r[2], dueDate: date(r[3]), description: cellText(r[4]),
      coverFrom: cellText(r[5]) ? month(r[5]) : '', coverTo: cellText(r[6]) ? month(r[6]) : '',
    })),
    credits: rows('credits').map(r => ({ roomName: cellText(r[0]), amount: r[1], note: cellText(r[2]) })),
    meterReadings: rows('meterReadings').map(r => ({ roomName: cellText(r[0]), date: date(r[1]), reading: r[2] })),
  }
}

const readFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  parsing.value = true
  done.value = ''
  plan.value = undefined
  try {
    const [X, context] = await Promise.all([import('xlsx'), getCurrentImportContext(authStore.effectiveUid)])
    const result = buildLandlordImportPlan(parse(X, await readWorkbook(X, file)), context)
    fileName.value = file.name
    errors.value = result.errors
    plan.value = result.plan
  } catch (e) {
    console.error('parse import file error:', e)
    toast.error('Excel 解析失敗，請確認使用下載的範本')
  } finally {
    parsing.value = false
  }
}

const execute = async () => {
  if (!plan.value || !authStore.effectiveUid) return
  importing.value = true
  try {
    const result = await executeLandlordImport(authStore.effectiveUid, plan.value, fileName.value, TEMPLATE_VERSION)
    done.value = result.runId
    toast.success('現況資料已匯入')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '匯入失敗')
  } finally {
    importing.value = false
    runList.value?.reload()
  }
}

const downloadCurrentTemplate = async () => {
  const X = await import('xlsx')
  downloadTemplate(X, `新房東資料匯入範本_v${TEMPLATE_VERSION}.xlsx`, [
    [`新房東資料匯入範本 v${TEMPLATE_VERSION}`, ''],
    ['日期', 'Excel 日期格式，或 2026-09-01、2026/9/1、民國 115/9/1'],
    ['月份', '2026-09、2026/9'],
    ['金額', '整數，可含千分位'],
    ['建物．水費方式', '房東負擔、固定月費、台水帳單均攤、租客自繳、尚未設定；留空則依合約範本推定'],
    ['建物．計算單位', '每房或每人（固定月費與均攤用），留空為每房'],
    ['房間．水費覆寫', '獨立水號、租客自繳，或留空（依建物）'],
    ['目前租約．繳費週期', '月繳、季繳、半年繳、年繳，留空為月繳'],
    ['目前租約．租金已繳至', '舊系統已收租金涵蓋到的月份（如 2026-09），之後出帳從下個月開始；留空則依一般出帳規則'],
    ['未結清帳款．類別', IMPORT_BILL_CATEGORIES.join('、') + '；租金須填涵蓋起訖月'],
    ['電表讀數', '選填；每房填最近一次讀數即可，會作為下次抄表的起點'],
    ['其他', '不需要的工作表可留空；每個房號在所有建物中必須唯一；有現役租客的房號一定要有目前租約'],
  ], Object.values(SHEETS))
}
</script>
