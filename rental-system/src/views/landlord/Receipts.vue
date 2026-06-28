<template>
  <div class="max-w-4xl mx-auto space-y-6">

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          收據產生器
        </h1>
        <p class="text-text-secondary-light">產生訂金 / 押金收據 PDF（象牙金箔證券版）</p>
      </div>
    </div>

    <!-- 模式切換 -->
    <div class="flex gap-1 p-1 bg-surface-light dark:bg-surface-dark rounded-xl w-fit">
      <button
        v-for="m in modes" :key="m.id"
        type="button"
        @click="mode = m.id"
        class="px-5 py-2 rounded-lg text-sm font-bold transition-all"
        :class="mode === m.id
          ? 'bg-white dark:bg-card-dark text-gold-600 shadow-sm'
          : 'text-text-secondary-light hover:text-text-primary-light dark:hover:text-text-primary-dark'"
      >
        {{ m.label }}
      </button>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 md:p-8">
      <form @submit.prevent="generatePDF" class="space-y-5">

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label for="receipt-room-no" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">房號</label>
            <select
              id="receipt-room-no"
              v-model="form.roomNo"
              @change="onRoomSelect(form.roomNo)"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors"
              required
              autocomplete="off"
            >
              <option value="" disabled>選擇房號</option>
              <option v-for="r in rooms" :key="r.id" :value="r.name">{{ r.name }}</option>
            </select>
          </div>
          <div>
            <label for="receipt-address" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">地址</label>
            <input
              id="receipt-address"
              v-model="form.address"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors"
              placeholder="地址（選擇房號後自動帶入）"
              required
              autocomplete="street-address"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label for="receipt-tenant" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">承租人姓名</label>
            <input
              id="receipt-tenant"
              v-model="form.tenant"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors"
              placeholder="姓名"
              required
              autocomplete="name"
            />
          </div>
          <div>
            <label for="receipt-landlord" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">出租人姓名</label>
            <input
              id="receipt-landlord"
              v-model="form.landlord"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors"
              placeholder="房東或代理人"
              required
              autocomplete="name"
            />
          </div>
        </div>

        <!-- 押金模式：月租金 -->
        <div v-if="mode === 'guarantee'">
          <label for="receipt-rentfee" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">月租金</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">NT$</span>
            <input
              id="receipt-rentfee"
              v-model.number="form.rentfee"
              type="number"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors pl-12 font-bold"
              placeholder="0"
              autocomplete="off"
            />
          </div>
        </div>

        <div>
          <label for="receipt-deposit" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{{ mode === 'guarantee' ? '押金金額' : '定金金額' }}</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">NT$</span>
            <input
              id="receipt-deposit"
              v-model.number="form.deposit"
              type="number"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors pl-12 text-lg font-bold"
              placeholder="0"
              required
              autocomplete="off"
            />
          </div>
          <p v-if="amountWords" class="mt-1.5 text-sm text-gold-600 font-medium tracking-wide">{{ amountWords }}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div :class="mode === 'guarantee' ? '' : 'md:col-span-1'">
            <label for="receipt-start-date" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{{ mode === 'guarantee' ? '起租日' : '保留起算日' }}</label>
            <input
              id="receipt-start-date"
              v-model="form.startDate"
              type="date"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors"
              required
              autocomplete="off"
            />
          </div>
          <div v-if="mode === 'guarantee'">
            <label for="receipt-duration" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">租期 (年)</label>
            <input
              id="receipt-duration"
              v-model.number="form.duration"
              type="number" step="0.5" min="0.5"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors"
              autocomplete="off"
            />
          </div>
          <div>
            <label for="receipt-end-date" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{{ mode === 'guarantee' ? '租賃到期日（自動）' : '保留截止日（自動+7天）' }}</label>
            <input
              id="receipt-end-date"
              :value="computedEndDate"
              type="date"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 text-gray-500 transition-colors"
              readonly
              autocomplete="off"
            />
          </div>
        </div>

        <!-- 雙方簽名 -->
        <div class="grid grid-cols-2 gap-3 pt-2">
          <div class="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
            <p class="text-[11px] text-text-secondary-light mb-1">出租人（房東）</p>
            <div class="h-14 flex items-end">
              <img v-if="landlordSignature" :src="landlordSignature" alt="房東簽名" class="max-h-14 max-w-full object-contain" />
              <span v-else class="text-[11px] text-text-secondary-light">未設定，將留白（可至設定 → 我的簽名）</span>
            </div>
          </div>
          <div class="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
            <p class="text-[11px] text-text-secondary-light mb-1">承租人（租客）</p>
            <div class="h-14 flex items-end justify-between gap-2">
              <img v-if="tenantSignature" :src="tenantSignature" alt="租客簽名" class="max-h-14 max-w-[60%] object-contain" />
              <span v-else class="text-[11px] text-text-secondary-light">尚未簽名</span>
              <button type="button" @click="showSignPad = true"
                class="shrink-0 px-2.5 py-1.5 rounded-lg bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition-colors">
                {{ tenantSignature ? '重簽' : '請租客簽名' }}
              </button>
            </div>
          </div>
        </div>

        <div class="pt-4 flex justify-end">
          <button
            type="submit"
            :disabled="downloading"
            class="px-6 py-3 bg-gold-500 text-white rounded-xl font-bold shadow-lg shadow-gold-500/30 hover:bg-gold-600 transition-all flex items-center"
          >
            <span v-if="downloading" class="material-symbols-outlined animate-spin mr-2">sync</span>
            {{ downloading ? 'PDF 產生中…' : `產生${mode === 'guarantee' ? '押金' : '訂金'}收據` }}
          </button>
        </div>

      </form>
    </div>

    <Signature v-model:visible="showSignPad" @confirm="onTenantSignConfirm" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../../firebase/config'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { downloadPdfFromBlob } from '../pdfHelper.js'
import { printHtmlPdf } from '../../utils/contractRender'
import { amountToChineseCapital } from '../../utils/chineseAmount'
import receiptTemplate from '../../templates/receipt.html?raw'
import Signature from '../../components/Signature.vue'
import { loadLandlordSignature } from '../../utils/signature'

const toast = useToastStore()
const authStore = useAuthStore()
const downloading = ref(false)

// 雙方簽名（房東自設定帶入、租客當場簽）
const landlordSignature = ref('')
const tenantSignature = ref('')
const showSignPad = ref(false)
const onTenantSignConfirm = (img) => { tenantSignature.value = img }

const modes = [
  { id: 'deposit', label: '訂金收據' },
  { id: 'guarantee', label: '押金收據' },
]
const mode = ref('deposit')

// rooms loaded from Firestore: { id, name, address, tenantName }
const rooms = ref([])

async function loadRooms(uid) {
  if (!uid) return
  try {
    const q = query(collection(db, 'rooms'), where('landlordId', '==', uid))
    const snap = await getDocs(q)
    rooms.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('載入房間失敗', e)
  }
}

const form = ref({
  roomNo: '',
  tenant: '',
  landlord: '',
  deposit: 1000,
  rentfee: 0,
  duration: 1,
  address: '',
  startDate: new Date().toISOString().split('T')[0],
})

watch(() => authStore.effectiveUid, uid => {
  if (uid) {
    loadRooms(uid)
    loadLandlordSignature(uid).then(img => { landlordSignature.value = img })
  }
}, { immediate: true })

watch(() => authStore.userProfile, profile => {
  if (profile?.name) form.value.landlord = profile.name
}, { immediate: true })

function onRoomSelect(roomName) {
  const r = rooms.value.find(x => x.name === roomName)
  if (!r) return
  form.value.address = r.address || ''
  form.value.tenant = r.tenantName || ''
  if (r.rent) form.value.rentfee = Number(r.rent) || 0
}

// 訂金：起算日 +7 天；押金：起租日 + 年限（到期日 = 起 + N 年 − 1 天）
const computedEndDate = computed(() => {
  if (!form.value.startDate) return ''
  const d = new Date(form.value.startDate)
  if (mode.value === 'guarantee') {
    const years = Number(form.value.duration) || 1
    const whole = Math.floor(years)
    const months = Math.round((years - whole) * 12)
    d.setFullYear(d.getFullYear() + whole)
    d.setMonth(d.getMonth() + months)
    d.setDate(d.getDate() - 1)
  } else {
    d.setDate(d.getDate() + 7)
  }
  return d.toISOString().split('T')[0]
})

const amountWords = computed(() => amountToChineseCapital(Number(form.value.deposit) || 0))

function formatROCDate(date) {
  const d = new Date(date)
  return `${d.getFullYear() - 1911}年${d.getMonth() + 1}月${d.getDate()}日`
}

function buildReceiptNo() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

const fmt = n => (Number(n) || 0).toLocaleString('en-US')

// 1x1 透明 GIF：收據為列印後手寫簽名，避免空 src 顯示破圖
const BLANK_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

const apiBase = import.meta.env.VITE_API_BASE

const generatePDF = async () => {
  downloading.value = true
  try {
    const isGuarantee = mode.value === 'guarantee'
    const today = formatROCDate(new Date())
    const endDate = computedEndDate.value
    const docLabel = isGuarantee ? '押金收據' : '訂金收據'
    const receiptNo = buildReceiptNo()

    // 本地組裝用：完整呈現資料
    const localData = {
      ...form.value,
      docTitle: docLabel,
      docTitleEn: isGuarantee ? 'Security Deposit Receipt' : 'Deposit Receipt',
      receiptNo,
      today,
      amount: fmt(form.value.deposit),
      amountWords: amountWords.value,
      amountLabel: isGuarantee ? '押金金額 Security Deposit' : '定金金額 Deposit',
      periodLabel: isGuarantee ? '租賃期間 TERM' : '保留期間 HOLD',
      period: isGuarantee
        ? `${form.value.startDate} ～ ${endDate}（${form.value.duration} 年）`
        : `${form.value.startDate} ～ ${endDate}`,
      rentRow: isGuarantee
        ? `<tr><th>月租金 RENT</th><td>NT$ ${fmt(form.value.rentfee)}</td></tr>`
        : '',
      clause: isGuarantee
        ? '茲確認收訖上列承租人所繳納之押金，作為本租賃契約履約保證。租賃期滿且無欠費、無損壞或其他依約應扣抵之情事者，本押金將於點交後無息全額退還。'
        : '茲確認收訖上列承租人所繳納之定金，於保留期間內為其保留上述房間。逾期未完成簽約者，本定金之處理依雙方約定辦理。',
      signature: tenantSignature.value || BLANK_PIXEL,
      landlordSignature: landlordSignature.value || BLANK_PIXEL,
    }

    // 本地組裝（列印另存 PDF）優先；失敗則退回伺服端 generatePdf
    try {
      await printHtmlPdf(receiptTemplate, localData, `${docLabel}_${form.value.tenant}`)
      toast.success('已開啟列印視窗，請選「另存為 PDF」')
    } catch (e) {
      console.warn('本地收據組裝失敗，改用伺服端 generatePdf:', e)
      const token = await auth.currentUser?.getIdToken()
      const res = await axios.post(
        `${apiBase}/generatePdf`,
        { ...form.value, endDate, today, templateType: isGuarantee ? 'Guarantee' : 'Deposit' },
        { responseType: 'blob', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } },
      )
      if (res.data.type === 'text/html') {
        throw new Error('伺服器設定錯誤：無法取得 PDF 檔案（接收到 HTML）。')
      }
      downloadPdfFromBlob(res.data, `${docLabel}_${form.value.tenant}.pdf`)
    }

    // 存檔：建立收據紀錄（含雙方簽名）以利稽核 / 日後重印；失敗不影響已產生的 PDF
    try {
      await addDoc(collection(db, 'receipts'), {
        landlordId: authStore.effectiveUid,
        mode: mode.value,
        docLabel,
        roomNo: form.value.roomNo || '',
        tenant: form.value.tenant || '',
        landlord: form.value.landlord || '',
        address: form.value.address || '',
        deposit: Number(form.value.deposit) || 0,
        rentfee: Number(form.value.rentfee) || 0,
        startDate: form.value.startDate || '',
        endDate,
        receiptNo,
        today,
        signatures: { landlord: landlordSignature.value || '', tenant: tenantSignature.value || '' },
        createdAt: serverTimestamp(),
      })
    } catch (e) {
      console.warn('收據存檔失敗（不影響已產生的 PDF）：', e)
    }
  } catch (err) {
    toast.error(err.message || 'PDF 產生失敗，請稍後再試')
    console.error('[Receipts] PDF error', err)
  } finally {
    downloading.value = false
  }
}
</script>
