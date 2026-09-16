<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex flex-wrap justify-between gap-4">
      <div><h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">資料匯入中心</h1><p class="text-text-secondary-light">接管舊資料：先完整驗證，再一次建立現況資料。</p></div>
      <button class="px-4 py-2 rounded-xl bg-gold-500 text-white font-medium flex gap-2 items-center" @click="downloadTemplate"><span class="material-symbols-outlined">download</span>下載範本</button>
    </div>
    <section class="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-5 text-sm text-amber-900 dark:text-amber-200 space-y-1">
      <p class="font-bold">第一版只做現況接管</p><p>建立建物、房間、水費設定、現役租客與租約、未結清帳款、預收餘額及每房最近兩期電表讀數；不建立登入帳號、不補開帳單，也不保存原始 Excel。</p>
    </section>
    <section class="rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 p-6">
      <label class="block cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-gold-500 rounded-xl p-10 text-center">
        <span class="material-symbols-outlined text-4xl text-gold-500">upload_file</span><p class="mt-2 font-medium">{{ parsing ? '解析中…' : '選擇已填好的 Excel 範本' }}</p><p class="text-xs text-text-secondary-light mt-1">.xlsx / .xls / .xlsm；日期必須是 YYYY-MM-DD</p>
        <input class="hidden" type="file" accept=".xlsx,.xls,.xlsm" :disabled="parsing || importing" @change="readFile">
      </label>
    </section>
    <section v-if="fileName" class="rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 p-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="font-bold">預覽：{{ fileName }}</h2><p class="text-sm text-text-secondary-light">{{ errors.length ? `發現 ${errors.length} 項阻擋錯誤` : '驗證通過，可以執行匯入' }}</p></div><button v-if="plan" :disabled="importing" @click="execute" class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold disabled:opacity-50">{{ importing ? '匯入中…' : '確認匯入' }}</button></div>
      <div v-if="plan" class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-sm"><div v-for="(value, key) in plan.summary" :key="key" class="rounded-lg bg-gray-50 dark:bg-gray-800 p-3"><b class="block text-lg">{{ value }}</b>{{ labels[key] }}</div></div>
      <ul v-if="errors.length" class="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 space-y-1"><li v-for="error in errors" :key="error">{{ error }}</li></ul>
      <p v-if="done" class="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 text-green-700 dark:text-green-300">已完成匯入。任務編號：{{ done }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { buildLandlordImportPlan, type LandlordImportWorkbook, type LandlordImportPlan } from '../../utils/landlordImport'
import { executeLandlordImport } from '../../services/landlordImportService'

const authStore = useAuthStore(); const toast = useToastStore()
const parsing = ref(false); const importing = ref(false); const fileName = ref(''); const errors = ref<string[]>([]); const plan = ref<LandlordImportPlan>(); const done = ref('')
const labels: Record<keyof LandlordImportPlan['summary'], string> = { properties: '建物', rooms: '房間', tenants: '租客', leases: '租約', bills: '待收帳款', meterReadings: '電表讀數' }
const headers = {
  properties: ['建物名稱', '地址', '水費方式', '均攤基準', '固定月費'], rooms: ['建物名稱', '樓層', '房號', '月租金', '坪數', '格局', '水費覆寫', '水號'],
  tenants: ['房號', '姓名', '電話', 'Email', '身分證號', '居住人數', '緊急聯絡人'], leases: ['房號', '起租日', '到期日', '月租金', '押金月數', '繳費週期'],
  outstanding: ['房號', '類別', '金額', '原到期日', '說明', '涵蓋起月', '涵蓋迄月'], credits: ['房號', '預收餘額', '備註'], meterReadings: ['房號', '讀表日期', '讀數'],
} as const
const sheetNames: Record<keyof typeof headers, string> = { properties: '建物', rooms: '房間', tenants: '租客', leases: '目前租約', outstanding: '未結清帳款', credits: '預收餘額', meterReadings: '電表讀數' }
const dateValue = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').trim()
const rows = (XLSX: any, wb: any, key: keyof typeof headers) => {
  const ws = wb.Sheets[sheetNames[key]]; if (!ws) return []
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as unknown[][]
  return raw.slice(1).filter(r => r.some(c => String(c).trim())).map(r => r.map(dateValue))
}
const parse = (XLSX: any, wb: any): LandlordImportWorkbook => {
  const r = (key: keyof typeof headers) => rows(XLSX, wb, key)
  return { properties: r('properties').map(x => ({ name: x[0] as string, address: x[1] as string, waterMode: x[2] as string, waterBasis: x[3] as string, fixedWaterAmount: x[4] })), rooms: r('rooms').map(x => ({ propertyName: x[0] as string, floor: x[1] as string, name: x[2] as string, rent: x[3], size: x[4], layout: x[5] as string, waterMode: x[6] as string, waterNo: x[7] as string })), tenants: r('tenants').map(x => ({ roomName: x[0] as string, name: x[1] as string, phone: x[2] as string, email: x[3] as string, idNumber: x[4] as string, occupants: x[5], emergencyContact: x[6] as string })), leases: r('leases').map(x => ({ roomName: x[0] as string, startDate: x[1] as string, endDate: x[2] as string, rent: x[3], depositMonths: x[4], paymentFrequency: x[5] as string })), outstanding: r('outstanding').map(x => ({ roomName: x[0] as string, category: x[1] as string, amount: x[2], dueDate: x[3] as string, description: x[4] as string, coverFrom: x[5] as string, coverTo: x[6] as string })), credits: r('credits').map(x => ({ roomName: x[0] as string, amount: x[1], note: x[2] as string })), meterReadings: r('meterReadings').map(x => ({ roomName: x[0] as string, date: x[1] as string, reading: x[2] })) }
}
const readFile = async (event: Event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; parsing.value = true; done.value = ''; try { const XLSX = await import('xlsx'); const result = buildLandlordImportPlan(parse(XLSX, XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }))); fileName.value = file.name; errors.value = result.errors; plan.value = result.plan } catch { toast.error('Excel 解析失敗，請確認使用下載的範本') } finally { parsing.value = false } }
const execute = async () => { if (!plan.value || !authStore.effectiveUid) return; importing.value = true; try { const result = await executeLandlordImport(authStore.effectiveUid, plan.value, fileName.value, 1); done.value = result.runId; toast.success('現況資料已匯入') } catch (e: any) { toast.error(e?.message || '匯入失敗') } finally { importing.value = false } }
const downloadTemplate = async () => { const XLSX = await import('xlsx'); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['新房東資料匯入範本 v1'], ['日期：YYYY-MM-DD；金額：正整數；水費方式：landlord / fixed / split / tenant_direct / unset'], ['不需填寫的工作表可留空；每個房間須填最近兩期電表讀數。']]), '填寫說明'); Object.entries(headers).forEach(([key, header]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[...header]]), sheetNames[key as keyof typeof headers])); XLSX.writeFile(wb, '新房東資料匯入範本_v1.xlsx') }
</script>
