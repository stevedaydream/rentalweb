<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-bills-modal-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]"
    >
      <div class="p-6 border-b border-ink-100 dark:border-ink-700 flex justify-between items-center">
        <div>
          <h2 id="print-bills-modal-title" class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">列印繳費通知單</h2>
          <p class="text-xs text-text-secondary-light mt-0.5">每房一頁 A4，含本期項目、前期未繳與電費計算標準</p>
        </div>
        <button @click="close" aria-label="關閉" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="p-6 space-y-4 overflow-y-auto">
        <div>
          <label for="print-bills-month" class="block text-sm font-medium text-text-secondary-light mb-1">帳單月份</label>
          <input id="print-bills-month" v-model="localMonth" type="month" class="form-input">
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-medium text-text-secondary-light">選擇房間</p>
            <button @click="toggleAll" class="text-xs font-bold text-blue-600 hover:text-blue-700">
              {{ allChecked ? '取消全選' : '全選' }}
            </button>
          </div>

          <div v-if="loading" class="py-8 text-center text-sm text-gray-400 animate-pulse">資料載入中…</div>

          <div v-else class="space-y-1.5">
            <label v-for="row in roomRows" :key="row.roomId"
              class="flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors"
              :class="row.disabled
                ? 'border-gray-100 dark:border-gray-800 opacity-45 cursor-not-allowed'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer'">
              <input type="checkbox" v-model="row.checked" :disabled="row.disabled"
                class="rounded text-blue-600 focus:ring-blue-500 shrink-0">
              <span class="font-bold text-sm w-14 shrink-0">{{ row.roomName }}</span>
              <span class="text-xs text-text-secondary-light truncate">{{ row.tenantName || '無租客' }}</span>
              <span class="ml-auto text-xs text-gray-500 whitespace-nowrap">
                本期 {{ row.billCount }} 筆 NT$ {{ row.monthAmount.toLocaleString() }}
              </span>
              <span v-if="row.prevUnpaid > 0" class="text-xs font-bold text-red-500 whitespace-nowrap">
                前欠 NT$ {{ row.prevUnpaid.toLocaleString() }}
              </span>
            </label>
            <p v-if="roomRows.length === 0" class="py-6 text-center text-sm text-gray-400">沒有房間資料</p>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-ink-100 dark:border-ink-700 flex justify-end gap-3">
        <button @click="close" class="px-5 py-2 rounded-xl text-ink-500 hover:bg-surface-light font-medium transition-colors">取消</button>
        <button @click="handlePrint" :disabled="printing || checkedRows.length === 0"
          class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold shadow-md hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          <span v-if="printing" class="material-symbols-outlined text-[18px] animate-spin" aria-hidden="true">progress_activity</span>
          <span v-else class="material-symbols-outlined text-[18px]" aria-hidden="true">print</span>
          {{ printing ? '產生中…' : `列印（${checkedRows.length} 房）` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { db, auth } from '../../firebase/config'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { printHtmlPdf } from '../../utils/contractRender'
// @ts-expect-error pdfHelper.js 為既有 JS 模組，無型別宣告
import { downloadPdfFromBlob } from '../../views/pdfHelper.js'
import billStatementTemplate from '../../templates/billStatement.html?raw'

const props = defineProps<{
  show: boolean
  month: string // YYYY-MM
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const authStore = useAuthStore()
const toast = useToastStore()
const apiBase = import.meta.env.VITE_API_BASE

const localMonth = ref(props.month)
const loading = ref(false)
const printing = ref(false)

interface BillLite {
  id: string
  date: string
  type: string
  category: string
  target: string
  description: string
  amount: number
  status: string
  dueDate?: string
  relatedTenantDocId?: string
  relatedUsageId?: string
}

interface RoomRow {
  roomId: string
  roomName: string
  tenantName: string
  tenantDocId: string
  checked: boolean
  disabled: boolean
  billCount: number
  monthAmount: number
  prevUnpaid: number
  monthBills: BillLite[]
  prevBills: BillLite[]
}

const roomRows = ref<RoomRow[]>([])
const readingsMap = ref<Map<string, any>>(new Map())

const checkedRows = computed(() => roomRows.value.filter(r => r.checked))
const allChecked = computed(() => {
  const enabled = roomRows.value.filter(r => !r.disabled)
  return enabled.length > 0 && enabled.every(r => r.checked)
})
const toggleAll = () => {
  const target = !allChecked.value
  roomRows.value.forEach(r => { if (!r.disabled) r.checked = target })
}

const isCollected = (b: BillLite) => b.status === 'completed' || b.status === 'paid'

// target 字串在系統內有兩種寫法：自動生成為「姓名 房號」，手動新增的下拉選單為「房號 姓名」，
// 兩種都要認，否則舊的手動帳單會漏印。新資料一律有 relatedTenantDocId，優先用它比對。
const belongsToRoom = (bill: BillLite, roomName: string, tenantDocId: string, tenantName: string) =>
  (!!bill.relatedTenantDocId && bill.relatedTenantDocId === tenantDocId) ||
  (!!tenantName && (
    bill.target === `${tenantName} ${roomName}` ||
    bill.target === `${roomName} ${tenantName}`
  ))

const loadData = async () => {
  if (!props.show || !localMonth.value) return
  loading.value = true
  try {
    const uid = authStore.effectiveUid
    const month = localMonth.value
    const [roomsSnap, tenantsSnap, monthBillsSnap, prevBillsSnap, readingsSnap] = await Promise.all([
      getDocs(query(collection(db, 'rooms'), where('landlordId', '==', uid), orderBy('name', 'asc'))),
      getDocs(query(collection(db, 'tenants'), where('landlordId', '==', uid))),
      getDocs(query(collection(db, 'bills'),
        where('landlordId', '==', uid),
        where('date', '>=', `${month}-01`),
        where('date', '<=', `${month}-31`))),
      getDocs(query(collection(db, 'bills'),
        where('landlordId', '==', uid),
        where('date', '<', `${month}-01`),
        orderBy('date', 'desc'),
        limit(500))),
      getDocs(query(collection(db, 'meter_readings'),
        where('landlordId', '==', uid),
        where('periodEnd', '>=', `${month}-01`),
        where('periodEnd', '<=', `${month}-31`))),
    ])

    const tenants = tenantsSnap.docs
      .map(d => ({ id: d.id, ...d.data() as any }))
      .filter(t => !t.isHistorical)
    const monthBills = monthBillsSnap.docs.map(d => ({ id: d.id, ...d.data() } as BillLite))
      .filter(b => b.type === 'income')
    const prevUnpaidBills = prevBillsSnap.docs.map(d => ({ id: d.id, ...d.data() } as BillLite))
      .filter(b => b.type === 'income' && !isCollected(b))

    readingsMap.value = new Map(readingsSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]))

    roomRows.value = roomsSnap.docs
      .map(d => {
        const data = d.data()
        const roomName = data.name || ''
        const curTenant = tenants.find(t => t.room === roomName || t.roomName === roomName)
        const tenantDocId = curTenant?.id || ''
        const tenantName = curTenant?.name || data.tenantName || ''
        const mine = monthBills.filter(b => belongsToRoom(b, roomName, tenantDocId, tenantName))
        const prev = prevUnpaidBills.filter(b => belongsToRoom(b, roomName, tenantDocId, tenantName))
        const disabled = !tenantName || (mine.length === 0 && prev.length === 0)
        return {
          roomId: d.id,
          roomName,
          tenantName,
          tenantDocId,
          checked: !disabled,
          disabled,
          billCount: mine.length,
          monthAmount: mine.reduce((s, b) => s + (Number(b.amount) || 0), 0),
          prevUnpaid: prev.reduce((s, b) => s + (Number(b.amount) || 0), 0),
          monthBills: mine,
          prevBills: prev,
        }
      })
  } catch (e) {
    console.error('PrintBillsModal loadData error:', e)
    toast.error('帳單資料載入失敗')
  } finally {
    loading.value = false
  }
}

watch(() => props.show, (val) => {
  if (val) {
    localMonth.value = props.month
    loadData()
  }
})
watch(localMonth, () => { if (props.show) loadData() })

// --- 頁面組裝 ---
const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-US')

const fill = (fragment: string, data: Record<string, string>) =>
  fragment.replace(/{{(.*?)}}/g, (_, key: string) => data[key.trim()] ?? '')

const MODE_LABELS: Record<string, string> = {
  fixed: '固定費率',
  tiered: '獨立累進費率',
  tiered_avg: '平均費率（累進）',
  bill_share: '帳單分攤制',
  imported: 'Excel 匯入',
}

const CATEGORY_ORDER: Record<string, number> = { '租金收入': 0, '電費': 1, '公共電費': 2 }

const buildPage = (fragment: string, row: RoomRow): string => {
  const month = localMonth.value
  const [y, m] = month.split('-')
  const sorted = [...row.monthBills].sort((a, b) =>
    (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9))

  const itemRows = sorted.map(b => `
    <tr>
      <td>${esc(b.category)}</td>
      <td class="desc">${esc(b.description)}</td>
      <td class="amt">NT$ ${fmt(b.amount)}</td>
      <td class="st">${isCollected(b) ? '<span class="paid">已繳 ✓</span>' : '<span class="unpaid">未繳</span>'}</td>
    </tr>`).join('')
    || '<tr><td colspan="4" class="desc">本期無帳單項目</td></tr>'

  const overdueBlock = row.prevBills.length > 0 ? `
    <div class="sec-label">前期未繳 Overdue Items</div>
    <table class="items">
      <tbody>
        ${row.prevBills.map(b => `
        <tr class="overdue">
          <td style="width:22mm">${esc(b.date)}</td>
          <td class="desc">${esc(b.category)}｜${esc(b.description)}</td>
          <td class="amt" style="width:26mm">NT$ ${fmt(b.amount)}</td>
          <td class="st"><span class="unpaid">未繳</span></td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''

  const monthTotal = row.monthAmount
  const paidTotal = row.monthBills.filter(isCollected).reduce((s, b) => s + (Number(b.amount) || 0), 0)
  const prevTotal = row.prevUnpaid
  const dueTotal = monthTotal - paidTotal + prevTotal

  const prevTotalRow = prevTotal > 0
    ? `<tr><td class="k neg">前期未繳 Overdue</td><td class="v neg">＋ NT$ ${fmt(prevTotal)}</td></tr>`
    : ''

  // 電費計算標準：由本期電費帳單反查抄表紀錄
  let elecBlock = ''
  const elecBill = row.monthBills.find(b => b.category === '電費' && b.relatedUsageId)
  const reading: any = elecBill ? readingsMap.value.get(elecBill.relatedUsageId!) : undefined
  if (reading && Number(reading.usage) > 0) {
    const avg = (Number(reading.cost) / Number(reading.usage)).toFixed(2)
    const calcLog = reading.calcLog
      ? `<div class="calc-log">${esc(reading.calcLog).replace(/\n/g, '<br>')}</div>`
      : ''
    elecBlock = `
    <div class="sec-label">電費計算標準 Electricity Calculation</div>
    <div class="calc">
      <div class="calc-meta">
        <span>計費方案 <b>${esc(MODE_LABELS[reading.mode] || reading.mode || '—')}</b></span>
        <span>本期用電 <b>${fmt(reading.usage)} 度</b></span>
        <span>電費金額 <b>NT$ ${fmt(reading.cost)}</b></span>
        <span>平均每度 <b>${avg} 元</b></span>
      </div>
      ${calcLog}
    </div>`
  }

  const bank = (authStore.userProfile as any)?.bankInfo
  const paymentInfo = bank?.account
    ? `<table class="info">
        <tr><th>銀行代碼</th><td>${esc(bank.code || '—')}</td></tr>
        <tr><th>銀行帳號</th><td>${esc(bank.account)}</td></tr>
        <tr><th>戶名</th><td>${esc(bank.name || '')}</td></tr>
      </table>`
    : '<div class="hint">繳費方式請洽房東。</div>'

  const rentBill = sorted.find(b => b.category === '租金收入')

  return fill(fragment, {
    monthLabel: `${y} 年 ${m} 月`,
    roomName: esc(row.roomName),
    tenantName: esc(row.tenantName),
    dueDate: esc(rentBill?.dueDate || sorted[0]?.dueDate || '—'),
    itemRowsHtml: itemRows,
    overdueBlockHtml: overdueBlock,
    monthTotal: fmt(monthTotal),
    paidTotal: fmt(paidTotal),
    prevTotalRowHtml: prevTotalRow,
    dueTotal: fmt(dueTotal),
    dueTotalClass: dueTotal > 0 ? ' neg' : '',
    elecBlockHtml: elecBlock,
    paymentInfoHtml: paymentInfo,
    landlordName: esc((authStore.userProfile as any)?.name || ''),
    landlordPhone: esc((authStore.userProfile as any)?.phone || ''),
    today: new Date().toISOString().split('T')[0] || '',
  })
}

const handlePrint = async () => {
  const rows = checkedRows.value
  if (rows.length === 0) return
  printing.value = true
  try {
    const match = billStatementTemplate.match(/<!--PAGE_START([\s\S]*?)PAGE_END-->/)
    if (!match || !match[1]) throw new Error('範本缺少頁面片段標記')
    const fragment = match[1]
    const pagesHtml = rows.map(r => buildPage(fragment, r)).join('\n')

    const month = localMonth.value
    const filename = rows.length === 1
      ? `繳費通知單-${rows[0]!.roomName}-${month}`
      : `繳費通知單-${month}`

    try {
      await printHtmlPdf(billStatementTemplate, { pagesHtml }, filename)
      toast.success('已開啟列印視窗，請選「另存為 PDF」或直接列印')
    } catch (e) {
      console.warn('本地帳單組裝失敗，改用伺服端 generatePdf:', e)
      const token = await auth.currentUser?.getIdToken()
      const res = await axios.post(
        `${apiBase}/generatePdf`,
        { templateType: 'BillStatement', pagesHtml },
        { responseType: 'blob', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } },
      )
      downloadPdfFromBlob(res.data, `${filename}.pdf`)
    }
  } catch (e: any) {
    console.error('PrintBillsModal print error:', e)
    toast.error(e?.message || '列印失敗，請稍後再試')
  } finally {
    printing.value = false
  }
}

const close = () => emit('update:show', false)
</script>
