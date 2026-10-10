<template>
  <div class="service-page max-w-5xl mx-auto space-y-6">
    <div class="service-page__header flex flex-wrap justify-between gap-4">
      <div>
        <RouterLink :to="{ name: 'LandlordDataImport' }" class="text-sm text-gold-600 hover:underline">← 資料匯入中心</RouterLink>
        <ServicePageHeading role="landlord" title="歷史資料遷移" description="整理已退租租客、過去的帳單與收款紀錄；不會發送催繳或通知。" />
      </div>
      <button type="button" @click="downloadHistoricalTemplate"
        class="self-start px-4 py-2 rounded-xl bg-gold-500 text-white font-medium flex gap-2 items-center hover:bg-gold-600 transition-colors">
        <span class="material-symbols-outlined" aria-hidden="true">download</span>下載歷史範本
      </button>
    </div>

    <section class="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-5 text-sm text-blue-900 dark:text-blue-200 space-y-1">
      <p>已繳清的帳單記為已結清；沒繳清的記為「歷史未結」，只供查詢，不會出現在前期欠款、逾期或 LINE 欠費查詢。</p>
      <p>每位租客、每張帳單、每筆付款都需要編號，用來對應資料、避免重複匯入。沒有舊編號也可以自行編號，填法與例子請看範本的「填寫說明」。</p>
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
import ServicePageHeading from '../../components/ServicePageHeading.vue';
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { buildHistoricalImportPlan, type HistoricalImportPlan } from '../../utils/historicalImport'
import { IMPORT_BILL_CATEGORIES } from '../../utils/landlordImport'
import { cellDate, cellPhone, cellText } from '../../utils/importCells'
import { readSheetRows, readWorkbook, downloadTemplate } from '../../utils/importWorkbook'
import { executeHistoricalImport, getHistoricalImportContext } from '../../services/landlordImportService'
import ImportRunList from '../../components/import/ImportRunList.vue'

const TEMPLATE_VERSION = 4

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
  tenants: { name: '歷史租客', headers: ['舊租客編號', '姓名', '舊房號', '退租日', '電話'] },
  bills: { name: '歷史帳單', headers: ['舊帳單編號', '舊租客編號', '帳單日', '到期日', '類別', '金額', '說明'] },
  payments: { name: '歷史付款', headers: ['舊付款編號', '舊帳單編號', '付款日', '金額', '方式', '備註'] },
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
    ['這份範本用來做什麼？', '把已退租租客、過去的帳單及已收到的款項搬進系統，方便日後查詢。'],
    ['先看這裡', '下方的「歷史租客」「歷史帳單」「歷史付款」是三張表，請依序填寫。'],
    ['怎麼開始填？', '保留各表第 1 列的欄位名稱與順序，從第 2 列開始，一筆資料填一列。'],
    ['沒資料的表', '保留欄位名稱，下面留白即可。不要填「無」、小計或合計列。'],
    ['什麼是編號？', '就是每筆資料的識別編號（ID），像收據號碼，用來分清楚是哪位租客、哪張帳單、哪次收款。'],
    ['沒有舊編號怎麼辦？', '可以自己編：租客用 T001、T002；帳單用 B001、B002；付款用 P001、P002。'],
    ['編號不能重複的地方', '在「歷史租客」中，每列租客編號不同；帳單與付款也各自一筆一號。'],
    ['編號要重複的地方', '同一租客的多張帳單，要填相同的租客編號；同一帳單分次收款，要填相同的帳單編號。'],
    ['怎樣算同一個編號？', '英文大小寫與空白不會區分，例如 T001、t001、T 001 都算同一個。建議統一大寫且不加空白。'],
    ['已經匯入過的資料', '同類資料的編號不能再次匯入。請保留填好的檔案與編號，不要換號重送同一筆資料。'],
    ['下次有新資料', '請用尚未使用過的新編號，例如上次帳單用到 B010，下次從 B011 開始。'],
    ['', ''],
    ['第一步：歷史租客', '每位已退租租客填一列；同名的人請使用不同編號，不要用姓名或房號代替編號。'],
    ['舊租客編號【必填】', '填舊資料原有的租客編號；沒有就自行編號，例如 T001。'],
    ['姓名【必填】', '填租客姓名，例如陳小明。'],
    ['舊房號【可留白】', '填當時的房號，例如 301；與系統現有房號相符時，該租客的帳單會計入該房及建物的年度損益。'],
    ['退租日【可留白】', '填實際退租日期；不確定可留白，不要猜日期。'],
    ['電話【可留白】', '例如 0912345678；建議先把整欄設為「文字」，避免 Excel 刪掉開頭的 0。'],
    ['', ''],
    ['第二步：歷史帳單', '每張帳單填一列，這裡填「原本應收多少」，不是已收到多少。'],
    ['舊帳單編號【必填】', '每張帳單用不同編號，例如 B001、B002。'],
    ['舊租客編號【可留白】', '照抄本檔「歷史租客」表的編號，例如 T001；留白表示這張帳單不指定租客。'],
    ['帳單日【必填】', '這張帳單的開立日期，例如 2025/11/1。'],
    ['到期日【必填】', '原本約定最晚繳款的日期，例如 2025/11/5；不是實際收到錢的日期。'],
    ['類別【必填】', `請完整照填其中一項：${IMPORT_BILL_CATEGORIES.join('、')}。`],
    ['類別舉例', '房租請填「租金收入」，不要只填「租金」。'],
    ['金額【必填】', '填整張帳單的應收金額，例如 12000；已收款項另填在「歷史付款」。'],
    ['說明【可留白】', '例如「301 房 2025 年 11 月房租」。'],
    ['', ''],
    ['第三步：歷史付款', '每次實際收到的款項填一列；完全沒收到錢的帳單，不用填付款資料。'],
    ['舊付款編號【必填】', '每次收款用不同編號，例如 P001、P002；同一帳單分兩次收到錢，也要用兩個付款編號。'],
    ['舊帳單編號【必填】', '照抄本檔「歷史帳單」表的編號，讓系統知道這筆款項付的是哪張帳單。'],
    ['付款日【必填】', '實際收到錢的日期，例如 2025/11/3。'],
    ['金額【必填】', '只填這一次收到多少；同一帳單的所有付款加起來，不能超過該帳單金額。'],
    ['方式【可留白】', '例如「轉帳」或「現金」。'],
    ['備註【可留白】', '例如「第一次付款」或「補繳尾款」。'],
    ['', ''],
    ['完整例子：分兩次付款', '陳小明住過 301 房，11 月房租 12000 元，先付 7000 元，再付 5000 元。'],
    ['例子：歷史租客第 2 列', 'T001｜陳小明｜301｜2025/12/31｜0912345678'],
    ['例子：歷史帳單第 2 列', 'B001｜T001｜2025/11/1｜2025/11/5｜租金收入｜12000｜11 月房租'],
    ['例子：歷史付款第 2 列', 'P001｜B001｜2025/11/3｜7000｜轉帳｜第一次付款'],
    ['例子：歷史付款第 3 列', 'P002｜B001｜2025/11/10｜5000｜轉帳｜補繳尾款'],
    ['例子怎麼讀？', '「｜」代表換到下一欄；請分欄填寫，不要把整句貼進同一格，也不要把「｜」填進表內。'],
    ['為什麼 B001 出現兩次？', '兩筆付款都是付同一張帳單，所以都填 B001；兩次付款本身則分別用 P001、P002。'],
    ['只有付 7000 元呢？', '只填第一筆付款，不要填沒收到的 5000 元；帳單金額仍是 12000，系統會顯示尚未結清。'],
    ['', ''],
    ['日期的填法', '可填 2025/11/1、2025-11-01，或用 Excel 日期格式；民國年請填 114/11/1，不用加「民國」二字。'],
    ['金額的填法', '只填大於 0 的整數，例如 12000 或 12,000；不要加「元」、貨幣符號、負號或小數。'],
    ['填完之後', '儲存檔案，再回網頁選擇這個 Excel。先看筆數與錯誤提示，確認無誤才按「確認匯入」。'],
    ['匯入後會怎樣？', '付清的帳單顯示已結清；沒付清的顯示「歷史未結」，只供查詢，不會自動催繳或發送通知。'],
    ['以前下載過舊版？', '舊版的「鍵」就是這裡說的「編號」。原範本仍可使用，請保留原本欄位順序。'],
  ], Object.values(SHEETS).map(sheet => ({ ...sheet, widths: sheet.headers.map(() => 18) })), [32, 140])
}
</script>
