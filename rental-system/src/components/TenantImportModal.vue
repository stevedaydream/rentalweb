<template>
  <button
    @click="openModal"
    class="px-4 py-2 border border-gold-400 text-gold-600 dark:text-gold-400 dark:border-gold-600 rounded-lg text-sm font-medium hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors flex items-center gap-2"
  >
    <span class="material-symbols-outlined text-[18px]">upload_file</span>
    批量匯入
  </button>

  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeIfSafe" />
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">

        <!-- Header -->
        <div class="p-5 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between flex-shrink-0">
          <div>
            <h2 class="text-lg font-bold text-text-primary-light dark:text-gray-100 flex items-center gap-2">
              <span class="material-symbols-outlined text-gold-500">group_add</span>
              批量匯入租客
            </h2>
            <p class="text-sm text-text-secondary-light mt-0.5">{{ stepDesc }}</p>
          </div>
          <button @click="closeIfSafe" class="text-gray-400 hover:text-gray-600 dark:text-gray-400 ml-4 flex-shrink-0">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-5">

          <!-- Step: upload -->
          <div v-if="step === 'upload'" class="space-y-5">
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 flex gap-3">
              <span class="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">info</span>
              <div class="space-y-1">
                <p>1. 先下載範本，填寫租客資料後上傳。</p>
                <p>2. 填寫<strong>身分證號 + 電話</strong>後，系統會自動建立登入帳號並綁定到你的房東帳號。</p>
                <p>3. 房號需與系統房間名稱<strong>完全相符</strong>，可參考範本第二頁「房號參考」。</p>
              </div>
            </div>

            <button
              @click="downloadTemplate"
              :disabled="downloadingTemplate"
              class="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gold-400 dark:border-gold-600 rounded-xl text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors font-medium disabled:opacity-60"
            >
              <span v-if="downloadingTemplate" class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
              <span v-else class="material-symbols-outlined text-[20px]">download</span>
              {{ downloadingTemplate ? '產生中...' : '下載 Excel 範本' }}
            </button>

            <label class="block cursor-pointer">
              <div
                class="flex flex-col items-center justify-center gap-2 p-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-gold-400 dark:hover:border-gold-600 hover:bg-gold-50/30 dark:hover:bg-gold-900/10 transition-colors"
                :class="{ 'opacity-60 cursor-wait': parsing }"
              >
                <span class="material-symbols-outlined text-[40px] text-gray-300 dark:text-gray-600">upload_file</span>
                <p class="font-medium text-text-primary-light dark:text-gray-200">
                  {{ parsing ? '解析中...' : '點擊選擇 Excel 檔案' }}
                </p>
                <p class="text-xs text-text-secondary-light">.xlsx / .xls / .xlsm</p>
              </div>
              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.xls,.xlsm"
                class="hidden"
                :disabled="parsing"
                @change="handleFile"
              />
            </label>
          </div>

          <!-- Step: preview -->
          <div v-if="step === 'preview'" class="space-y-4">
            <div class="flex gap-2 flex-wrap text-sm">
              <span class="px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
                ✓ 可匯入 {{ validRows.length }} 筆
              </span>
              <span v-if="errorRows.length" class="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium">
                ✗ 有誤 {{ errorRows.length }} 筆（不匯入）
              </span>
              <span v-if="willCreateAccountCount" class="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                🔑 將建立帳號 {{ willCreateAccountCount }} 筆
              </span>
            </div>

            <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <tr>
                    <th class="px-3 py-2.5 text-left">#</th>
                    <th class="px-3 py-2.5 text-left"></th>
                    <th class="px-3 py-2.5 text-left">姓名</th>
                    <th class="px-3 py-2.5 text-left">房號</th>
                    <th class="px-3 py-2.5 text-left">電話</th>
                    <th class="px-3 py-2.5 text-left">身分證號</th>
                    <th class="px-3 py-2.5 text-left">入住日期</th>
                    <th class="px-3 py-2.5 text-left">租期(年)</th>
                    <th class="px-3 py-2.5 text-left">月租金</th>
                    <th class="px-3 py-2.5 text-left">押金月數</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                  <tr
                    v-for="row in parsedRows"
                    :key="row._line"
                    :class="row._errors.length ? 'bg-red-50/60 dark:bg-red-900/10' : ''"
                  >
                    <td class="px-3 py-2 text-xs text-gray-400">{{ row._line }}</td>
                    <td class="px-3 py-2">
                      <span v-if="!row._errors.length" class="material-symbols-outlined text-[18px] text-green-500">check_circle</span>
                      <span v-else class="material-symbols-outlined text-[18px] text-red-500" :title="row._errors.join('；')">error</span>
                    </td>
                    <td class="px-3 py-2 font-medium dark:text-gray-200">{{ row.name || '-' }}</td>
                    <td class="px-3 py-2 dark:text-gray-300">{{ row.room || '-' }}</td>
                    <td class="px-3 py-2 dark:text-gray-300">{{ row.phone || '-' }}</td>
                    <td class="px-3 py-2">
                      <span v-if="row.idNumber" class="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <span class="material-symbols-outlined text-[13px]">key</span>{{ row.idNumber }}
                      </span>
                      <span v-else class="text-xs text-gray-400">-</span>
                    </td>
                    <td class="px-3 py-2 text-xs dark:text-gray-300">{{ row.leaseStart }}</td>
                    <td class="px-3 py-2 text-xs dark:text-gray-300">{{ row.leaseDuration }}</td>
                    <td class="px-3 py-2 dark:text-gray-300">{{ row.rent ? row.rent.toLocaleString() : '-' }}</td>
                    <td class="px-3 py-2 dark:text-gray-300">{{ row.depositMonths }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="errorRows.length" class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p class="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">以下列資料有誤，不會匯入：</p>
              <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                <li v-for="row in errorRows" :key="row._line">
                  第 {{ row._line }} 列（{{ row.name || '無姓名' }}）：{{ row._errors.join('；') }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Step: importing -->
          <div v-if="step === 'importing'" class="flex flex-col items-center justify-center py-14 space-y-6">
            <div class="w-16 h-16 rounded-full bg-gold-100 dark:bg-gold-900/20 flex items-center justify-center">
              <span class="material-symbols-outlined text-[32px] text-gold-500 animate-spin">progress_activity</span>
            </div>
            <div class="text-center">
              <p class="text-lg font-semibold text-text-primary-light dark:text-gray-100">匯入中，請勿關閉視窗...</p>
              <p class="text-sm text-text-secondary-light mt-1">正在處理：{{ currentRowName }}</p>
            </div>
            <div class="w-full max-w-sm space-y-1">
              <div class="flex justify-between text-xs text-text-secondary-light">
                <span>{{ progress }} / {{ validRows.length }}</span>
                <span>{{ validRows.length ? Math.round((progress / validRows.length) * 100) : 0 }}%</span>
              </div>
              <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gold-500 transition-all duration-300 rounded-full"
                  :style="{ width: validRows.length ? `${(progress / validRows.length) * 100}%` : '0%' }"
                />
              </div>
            </div>
          </div>

          <!-- Step: done -->
          <div v-if="step === 'done'" class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div class="p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
                <p class="text-3xl font-bold text-green-600">{{ importResult.success.length }}</p>
                <p class="text-sm text-green-700 dark:text-green-300 mt-1">成功新增</p>
              </div>
              <div
                class="p-5 rounded-xl text-center border"
                :class="importResult.failed.length
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'"
              >
                <p class="text-3xl font-bold" :class="importResult.failed.length ? 'text-red-600' : 'text-gray-400'">
                  {{ importResult.failed.length }}
                </p>
                <p class="text-sm mt-1" :class="importResult.failed.length ? 'text-red-700 dark:text-red-300' : 'text-gray-400'">失敗</p>
              </div>
            </div>

            <div v-if="createdCredentials.length" class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-gold-500">key</span>
                <p class="text-sm font-semibold text-text-primary-light dark:text-gray-100">已建立登入帳號（請記錄後交給租客）</p>
              </div>
              <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500">
                    <tr>
                      <th class="px-4 py-2.5 text-left">姓名</th>
                      <th class="px-4 py-2.5 text-left">房號</th>
                      <th class="px-4 py-2.5 text-left">登入帳號（電話）</th>
                      <th class="px-4 py-2.5 text-left">密碼（身分證號）</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                    <tr v-for="c in createdCredentials" :key="c.name + c.room">
                      <td class="px-4 py-2.5 font-medium dark:text-gray-200">{{ c.name }}</td>
                      <td class="px-4 py-2.5 dark:text-gray-300">{{ c.room }}</td>
                      <td class="px-4 py-2.5 font-mono text-blue-600 dark:text-blue-400">{{ c.phone }}</td>
                      <td class="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400">{{ c.idNumber }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="text-xs text-text-secondary-light">登入方式：選擇「身分證 + 手機」登入，電話為帳號，身分證號為密碼</p>
            </div>

            <div v-if="importResult.failed.length" class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p class="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">失敗項目：</p>
              <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                <li v-for="f in importResult.failed" :key="f.line">
                  第 {{ f.line }} 列（{{ f.name }}）：{{ f.reason }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-5 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
          <template v-if="step === 'upload'">
            <button
              @click="closeIfSafe"
              class="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >取消</button>
          </template>

          <template v-if="step === 'preview'">
            <button
              @click="resetToUpload"
              class="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >重新選擇</button>
            <button
              @click="startImport"
              :disabled="validRows.length === 0"
              class="px-5 py-2 bg-gold-500 text-white rounded-lg text-sm font-semibold hover:bg-gold-600 disabled:opacity-50 transition-colors"
            >匯入 {{ validRows.length }} 筆租客</button>
          </template>

          <template v-if="step === 'done'">
            <button
              @click="closeIfSafe"
              class="px-5 py-2 bg-gold-500 text-white rounded-lg text-sm font-semibold hover:bg-gold-600 transition-colors"
            >完成</button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { db, functions } from '../firebase/config'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

interface Room {
  id: string
  name: string
  status: string
  price: number
}

interface ParsedRow {
  _line: number
  name: string
  room: string
  phone: string
  email: string
  idNumber: string
  leaseStart: string
  leaseDuration: number
  rent: number
  depositMonths: number
  emergencyContact: string
  note: string
  _errors: string[]
}

interface ImportResult {
  success: Array<{ name: string; room: string; credential?: { phone: string; idNumber: string } }>
  failed: Array<{ line: number; name: string; reason: string }>
}

const props = defineProps<{
  landlordId: string
  availableRooms: Room[]
  paymentDay?: number
}>()

const emit = defineEmits<{ imported: [] }>()

const show = ref(false)
const step = ref<'upload' | 'preview' | 'importing' | 'done'>('upload')
const parsedRows = ref<ParsedRow[]>([])
const importResult = ref<ImportResult>({ success: [], failed: [] })
const progress = ref(0)
const currentRowName = ref('')
const parsing = ref(false)
const downloadingTemplate = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const validRows = computed(() => parsedRows.value.filter(r => r._errors.length === 0))
const errorRows = computed(() => parsedRows.value.filter(r => r._errors.length > 0))
const willCreateAccountCount = computed(() => validRows.value.filter(r => r.phone && r.idNumber).length)
const createdCredentials = computed(() =>
  importResult.value.success
    .filter(s => s.credential)
    .map(s => ({ name: s.name, room: s.room, ...s.credential! }))
)

const stepDesc = computed(() => {
  if (step.value === 'upload') return '請下載範本，填寫完成後上傳'
  if (step.value === 'preview') return `已解析 ${parsedRows.value.length} 筆，${validRows.value.length} 筆可匯入`
  if (step.value === 'importing') return `匯入中... ${progress.value} / ${validRows.value.length}`
  return `完成：${importResult.value.success.length} 筆成功，${importResult.value.failed.length} 筆失敗`
})

const openModal = () => {
  step.value = 'upload'
  parsedRows.value = []
  importResult.value = { success: [], failed: [] }
  progress.value = 0
  currentRowName.value = ''
  show.value = true
}

const closeIfSafe = () => {
  if (step.value === 'importing') return
  show.value = false
}

const resetToUpload = () => {
  parsedRows.value = []
  step.value = 'upload'
}

// --- Template download ---
const downloadTemplate = async () => {
  downloadingTemplate.value = true
  try {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const headers = [
      '姓名(必填)', '房號(必填)', '電話', '電子信箱', '身分證號(建立帳號用)',
      '入住日期(YYYY-MM-DD)', '租期(年)', '月租金(留空自動帶入房間設定)', '押金月數', '緊急聯絡人', '備注'
    ]
    const today = new Date().toISOString().split('T')[0]
    const example = [
      '王小明', props.availableRooms.find(r => r.status === 'vacant')?.name ?? '101室',
      '0912345678', 'wang@example.com', 'A123456789',
      today, 1, 10000, 2, '王大明 0911111111', ''
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    ws['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 18 },
      { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 20 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, '租客資料')

    const roomHeaders = ['房號（請複製貼上到租客資料）', '狀態']
    const roomRows = props.availableRooms.map(r => [
      r.name,
      r.status === 'vacant' ? '空置（可入住）' : '已有租客'
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([roomHeaders, ...roomRows])
    ws2['!cols'] = [{ wch: 26 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws2, '房號參考')

    XLSX.writeFile(wb, '租客批量匯入範本.xlsx')
  } finally {
    downloadingTemplate.value = false
  }
}

// --- Parse Excel ---
const parseDate = (raw: unknown): string => {
  const today = new Date().toISOString().split('T')[0]!
  if (!raw) return today
  if (raw instanceof Date) return raw.toISOString().split('T')[0]!
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // Excel serial date (numeric)
  const n = Number(s)
  if (!isNaN(n) && n > 40000) {
    const d = new Date((n - 25569) * 86400 * 1000)
    return d.toISOString().split('T')[0]!
  }
  return today
}

const handleFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  parsing.value = true
  try {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]!]
    if (!ws) return

    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const dataRows = rows.slice(1).filter(r => (r as unknown[]).some(c => String(c).trim() !== ''))

    parsedRows.value = dataRows.map((r, i) => {
      const row = r as unknown[]
      const name = String(row[0] ?? '').trim()
      const room = String(row[1] ?? '').trim()
      const phone = String(row[2] ?? '').trim().replace(/\s/g, '')
      const email = String(row[3] ?? '').trim()
      const idNumber = String(row[4] ?? '').trim().toUpperCase()
      const leaseStart = parseDate(row[5])
      const leaseDuration = Math.max(0.5, Number(row[6]) || 1)
      const matchRoomForPrice = props.availableRooms.find(av => av.name === room)
      const rent = Number(row[7]) || matchRoomForPrice?.price || 0
      const depositMonths = Math.max(1, Number(row[8]) || 2)
      const emergencyContact = String(row[9] ?? '').trim()
      const note = String(row[10] ?? '').trim()

      const errors: string[] = []
      if (!name) errors.push('姓名為必填')
      if (!room) {
        errors.push('房號為必填')
      } else {
        const match = props.availableRooms.find(av => av.name === room)
        if (!match) errors.push(`房號「${room}」不存在於系統`)
        else if (match.status !== 'vacant') errors.push(`房號「${room}」已有租客`)
      }

      return {
        _line: i + 2, name, room, phone, email, idNumber, leaseStart,
        leaseDuration, rent, depositMonths, emergencyContact, note, _errors: errors
      } as ParsedRow
    })

    if (parsedRows.value.length > 0) step.value = 'preview'
  } catch (err) {
    console.error('Excel 解析失敗:', err)
  } finally {
    parsing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

// --- Import ---
const calcLeaseEnd = (start: string, years: number): string => {
  const d = new Date(start)
  d.setDate(d.getDate() + Math.round(years * 365) - 1)
  return d.toISOString().split('T')[0]!
}

const buildDeposits = (rent: number, months: number) => {
  const items: { label: string; amount: number; status: string }[] = []
  for (let n = 1; n <= months; n++) {
    items.push({ label: `押金（第 ${n} 個月）`, amount: rent, status: 'unpaid' })
  }
  items.push({ label: '首月租金', amount: rent, status: 'unpaid' })
  return items
}

const startImport = async () => {
  step.value = 'importing'
  progress.value = 0
  const results: ImportResult = { success: [], failed: [] }
  const createAccountFn = httpsCallable(functions, 'createTenantAccount')

  for (const row of validRows.value) {
    currentRowName.value = row.name
    try {
      const leaseEnd = calcLeaseEnd(row.leaseStart, row.leaseDuration)

      // 1. 建立租客文件
      const tenantRef = await addDoc(collection(db, 'tenants'), {
        name: row.name, room: row.room, phone: row.phone, email: row.email,
        idNumber: row.idNumber, leaseStart: row.leaseStart, leaseEnd,
        leaseDuration: row.leaseDuration, rent: row.rent, depositMonths: row.depositMonths,
        emergencyContact: row.emergencyContact, note: row.note,
        landlordId: props.landlordId, paymentStatus: 'normal',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      })
      const tenantDocId = tenantRef.id

      // 2. 更新房間狀態
      const matchRoom = props.availableRooms.find(r => r.name === row.room)
      if (matchRoom) {
        await updateDoc(doc(db, 'rooms', matchRoom.id), {
          status: 'occupied', tenantName: row.name, leaseEnd
        })
      }

      // 3. 建立合約（含押金明細）
      const contractRef = await addDoc(collection(db, 'contracts'), {
        landlordId: props.landlordId, tenantDocId,
        tenantName: row.name, roomNumber: row.room,
        rent: row.rent, depositMonths: row.depositMonths,
        startDate: row.leaseStart, endDate: leaseEnd,
        paymentDay: props.paymentDay ?? 5, status: 'active',
        deposits: buildDeposits(row.rent, row.depositMonths),
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      })
      await updateDoc(doc(db, 'tenants', tenantDocId), { contractId: contractRef.id })

      // 4. 建立登入帳號 + 自動綁定房東
      let credential: { phone: string; idNumber: string } | undefined
      if (row.phone && row.idNumber) {
        const result: any = await createAccountFn({
          phone: row.phone,
          idNumber: row.idNumber,
          tenantDocId,
          name: row.name
        })
        const uid = result.data?.uid
        if (uid) {
          // 將 landlordId 寫入 users 文件，租客登入後直接看到房東資料，無需手動綁定
          await updateDoc(doc(db, 'users', uid), { landlordId: props.landlordId })
        }
        credential = { phone: row.phone, idNumber: row.idNumber }
      }

      results.success.push({ name: row.name, room: row.room, credential })
    } catch (e: any) {
      results.failed.push({ line: row._line, name: row.name, reason: e.message || '未知錯誤' })
    }
    progress.value++
  }

  importResult.value = results
  step.value = 'done'
  if (results.success.length > 0) emit('imported')
}
</script>
