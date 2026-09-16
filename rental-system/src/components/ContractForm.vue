<template>
  <div class="space-y-6">
    <!-- 房源 / 租客選擇（獨立合約頁） -->
    <div v-if="showSelectors" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">選擇房源（自動帶入）</label>
        <select v-model="selectedRoomId" @change="onRoomSelect" class="form-input">
          <option value="">-- 選擇房源 --</option>
          <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}{{ r.address ? ` — ${r.address}` : '' }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">選擇租客（自動帶入）</label>
        <select v-model="selectedTenantId" @change="onTenantSelect" class="form-input">
          <option value="">-- 選擇現有租客 --</option>
          <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
    </div>

    <!-- 合約資料（自租客帶入，可調整） -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">承租人</label>
        <input v-model="form.tenant" class="form-input" placeholder="承租人姓名" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">證件號碼</label>
        <input v-model="form.tenantId" class="form-input" placeholder="身分證 / 居留證 / 護照" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">房號</label>
        <input v-model="form.roomNo" class="form-input" placeholder="例如：A-201" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">地址</label>
        <input v-model="form.address" class="form-input" placeholder="完整地址" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">月租金</label>
        <input v-model.number="form.rentfee" type="number" min="0" class="form-input" placeholder="0" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">押金（自動 = 月租 × 2）</label>
        <input :value="form.deposit" type="text" readonly
          class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 text-sm" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">租期（年）</label>
        <input v-model.number="form.duration" type="number" step="0.5" min="0.5" class="form-input" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">起租日</label>
        <input v-model="form.startDate" type="date" class="form-input" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">退租日（自動）</label>
        <input :value="form.endDate" type="date" readonly
          class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 text-sm" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">繳費方式</label>
        <select v-model="form.paymentFrequency" class="form-input">
          <option value="monthly">月繳</option>
          <option value="quarterly">季繳</option>
          <option value="semiannual">半年繳</option>
          <option value="yearly">年繳</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">承租人戶籍地址</label>
        <input v-model="form.tenantAddress" class="form-input" placeholder="選填" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">承租人通訊地址</label>
        <input v-model="form.tenantMailAddress" class="form-input" placeholder="同戶籍地址可留空" />
      </div>
      <div class="md:col-span-2">
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">出租人地址</label>
        <input v-model="form.landlordAddress" class="form-input" placeholder="可在「系統設定 → 帳戶」設定預設值" />
      </div>
    </div>

    <details class="rounded-xl border border-gray-100 dark:border-gray-800" :open="!!form.guarantor">
      <summary class="px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">保證人（選填）</summary>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-4">
        <div>
          <label class="block text-xs font-medium text-text-secondary-light mb-1">姓名</label>
          <input v-model="form.guarantor" class="form-input" />
        </div>
        <div>
          <label class="block text-xs font-medium text-text-secondary-light mb-1">證件號碼</label>
          <input v-model="form.guarantorId" class="form-input" />
        </div>
        <div>
          <label class="block text-xs font-medium text-text-secondary-light mb-1">戶籍地址</label>
          <input v-model="form.guarantorAddress" class="form-input" />
        </div>
        <div>
          <label class="block text-xs font-medium text-text-secondary-light mb-1">通訊地址</label>
          <input v-model="form.guarantorMailAddress" class="form-input" placeholder="同戶籍地址可留空" />
        </div>
        <div>
          <label class="block text-xs font-medium text-text-secondary-light mb-1">聯絡電話</label>
          <input v-model="form.guarantorPhone" class="form-input" />
        </div>
      </div>
    </details>

    <!-- 附件（現況確認書、修繕明細、賠償價目表）依房間所屬建物帶入 -->
    <p class="text-xs" :class="termsProperty ? 'text-text-secondary-light' : 'text-amber-700 dark:text-amber-300'">
      <span class="material-symbols-outlined text-[14px] align-middle" aria-hidden="true">attach_file</span>
      <template v-if="termsProperty">
        合約附件依「{{ termsProperty.name }}」的建物設定帶入{{ termsProperty.contractTerms ? '' : '（尚未設定，使用預設內容）' }}，可在「房源管理 → 建物」修改。
      </template>
      <template v-else>
        找不到此房號所屬的建物，合約附件使用預設內容。可在「房源管理 → 建物」指派房間並設定附件。
      </template>
    </p>

    <!-- 費用約定 -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-1">
          <span class="material-symbols-outlined text-[16px] text-gold-500">receipt_long</span>第五條 費用約定
        </h4>
        <button type="button" @click="showTemplateModal = true"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold-400 text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/20 text-xs font-medium transition-colors">
          <span class="material-symbols-outlined text-[16px]">edit_document</span>修改範本
        </button>
      </div>
      <div class="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden text-sm">
        <div v-for="(row, i) in feeRows" :key="row.label" class="flex justify-between px-4 py-2.5"
          :class="i % 2 === 0 ? 'bg-surface-light dark:bg-surface-dark' : 'bg-white dark:bg-card-dark'">
          <span class="text-text-secondary-light">{{ row.label }}</span>
          <span class="font-medium" :class="row.byTenant ? 'text-orange-500' : 'text-green-600'">{{ row.display }}</span>
        </div>
      </div>
    </div>

    <!-- 合約預覽 -->
    <div>
      <h4 class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-2">合約預覽</h4>
      <div class="max-h-80 overflow-y-auto bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-inner">
        <Preview :form="form" />
      </div>
    </div>

    <!-- 雙方簽名 -->
    <div class="grid grid-cols-2 gap-3">
      <LandlordSignatureField v-model="form.landlordSignature" :landlord-id="landlordId" />
      <div class="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
        <p class="text-[11px] text-text-secondary-light mb-1">承租人（租客）</p>
        <div class="h-14 flex items-end justify-between gap-2">
          <img v-if="form.signature" :src="form.signature" alt="租客簽名" class="max-h-14 max-w-[60%] object-contain" />
          <span v-else class="text-[11px] text-text-secondary-light">尚未簽名</span>
          <button type="button" @click="showSignModal = true"
            class="shrink-0 px-2.5 py-1.5 rounded-lg bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition-colors">
            {{ form.signature ? '重簽' : '請租客簽名' }}
          </button>
        </div>
      </div>
    </div>

    <label class="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer">
      <input type="checkbox" v-model="isChecked" class="w-5 h-5 text-gold-500 rounded" />
      <span class="text-sm font-medium text-gray-700 dark:text-gray-200">我已詳閱合約條款，雙方完成簽署，確認資料無誤。</span>
    </label>

    <div v-if="overlaps.length" role="alert"
      class="p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 space-y-2">
      <p class="text-sm font-bold text-amber-800 dark:text-amber-300">此承租人已有租期重疊的合約，簽署後以下合約將標記為「已被取代」：</p>
      <ul class="text-xs text-amber-800 dark:text-amber-300 list-disc pl-5 space-y-0.5">
        <li v-for="c in overlaps" :key="c.id">
          {{ c.roomNo || '—' }}・{{ c.startDate }} ～ {{ c.endDate }}（{{ c.contractSource === 'paper' ? '紙本' : '電子' }}）
        </li>
      </ul>
      <div class="flex justify-end gap-2 pt-1">
        <button type="button" @click="overlaps = []"
          class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-white/60 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
          取消
        </button>
        <button type="button" :disabled="loading" @click="submitContract(true)"
          class="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors">
          確認取代並簽署
        </button>
      </div>
    </div>

    <button v-else :disabled="!isChecked || loading" @click="submitContract(false)"
      class="w-full py-3 bg-green-600 text-white rounded-xl shadow-lg shadow-green-500/30 hover:bg-green-700 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
      <span v-if="loading" class="material-symbols-outlined animate-spin">sync</span>
      {{ loading ? '正在生成合約…' : '確認簽署並產生合約' }}
    </button>

    <!-- 遠端簽約：租客不在現場時，傳一次性連結讓租客自己簽，房東核對後再簽名生效 -->
    <div v-if="allowRemote && !overlaps.length"
      class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-dashed border-gold-300 dark:border-gold-700">
      <div class="flex-1 text-sm">
        <p class="font-bold text-text-primary-light dark:text-text-primary-dark">租客不在現場？</p>
        <p class="text-xs text-text-secondary-light mt-0.5">傳送簽署連結給租客，租客簽名後您會收到通知，核對並簽名後合約才生效。</p>
      </div>
      <button type="button" :disabled="loading || sendingLink" @click="sendSignLink"
        class="shrink-0 px-4 py-2.5 rounded-xl border border-gold-400 text-gold-700 dark:text-gold-300 text-sm font-bold hover:bg-gold-50 dark:hover:bg-gold-900/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ sendingLink ? 'sync' : 'send' }}</span>
        {{ sendingLink ? '建立中…' : '傳送簽署連結' }}
      </button>
    </div>

    <ContractSignLinkModal :show="!!linkModal" :link="linkModal?.url" :expire-days="linkModal?.expireDays"
      :tenant-name="form.tenant" :error="linkModal?.error" :generating="!!linkModal && !linkModal.url && !linkModal.error"
      @close="closeLinkModal" />

    <Signature v-model:visible="showSignModal" @confirm="setSignature" />
    <ContractTemplateModal v-model:show="showTemplateModal" @saved="onTemplateSaved" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import { db, auth } from '../firebase/config'
import { collection, getDoc, getDocs, query, where, doc, serverTimestamp } from 'firebase/firestore'
import { findOverlappingSignedContracts, createSignedContract, requestContractSignLink } from '../services/signedContractService'
import Preview from './Preview.vue'
import Signature from './Signature.vue'
import LandlordSignatureField from './LandlordSignatureField.vue'
import ContractTemplateModal from './ContractTemplateModal.vue'
import ContractSignLinkModal from './ContractSignLinkModal.vue'
import { printHtmlPdf } from '../utils/contractRender'
import contractTemplate from '../templates/contractTemplate.html?raw'
import { buildContractPayload } from '../utils/contractPayload'
import { normalizeContractTerms } from '../utils/contractTerms'

// 與 functions/index.js TEMPLATE_VERSIONS.Contract 對齊
const CONTRACT_TEMPLATE_VERSION = 2

const props = defineProps({
  prefill: { type: Object, default: () => ({}) },
  landlordId: { type: String, required: true },
  showSelectors: { type: Boolean, default: false }, // 獨立合約頁：顯示房源/租客下拉
  allowRemote: { type: Boolean, default: false }, // 允許傳送簽署連結（上線精靈為現場流程，不開放）
})
const emit = defineEmits(['saved'])

// 獨立頁用：房源 / 租客下拉（精靈模式不顯示，資料由 prefill 帶入）
const rooms = ref([])
const tenants = ref([])
const selectedRoomId = ref('')
const selectedTenantId = ref('')
const selectedTenantUid = ref('')
const onRoomSelect = () => {
  const r = rooms.value.find(x => x.id === selectedRoomId.value)
  if (!r) return
  form.value.roomNo = r.name || r.roomName || ''
  form.value.address = r.address || ''
  form.value.rentfee = r.price || r.rent || ''
}
const onTenantSelect = () => {
  const t = tenants.value.find(x => x.id === selectedTenantId.value)
  if (!t) return
  form.value.tenant = t.name || ''
  form.value.tenantId = t.idNumber || ''
  form.value.tenantPhone = t.phone || ''
  selectedTenantUid.value = t.uid || ''
}

const authStore = useAuthStore()
const toast = useToastStore()

const loading = ref(false)
const isChecked = ref(false)
const showSignModal = ref(false)
const showTemplateModal = ref(false)

const getTodayString = () => new Date().toISOString().split('T')[0]
const getTodayRoc = () => {
  const d = new Date()
  return `${d.getFullYear() - 1911} 年 ${String(d.getMonth() + 1).padStart(2, '0')} 月 ${String(d.getDate()).padStart(2, '0')} 日`
}

const form = ref({
  roomNo: '', address: '',
  tenant: '', tenantId: '', tenantPhone: '',
  landlord: '', landlordId: '', landlordPhone: '',
  rentfee: '', deposit: '', duration: 1,
  startDate: getTodayString(), endDate: '',
  signature: '', landlordSignature: '',
  today: getTodayRoc(),
  paymentFrequency: 'monthly', paymentDay: 5,
  feeWater: 'landlord', feeElectricity: 'tenant', feeElectricityNote: '公共區域電費由房東負擔',
  feeGas: 'none', feeInternet: 'landlord', feeManagement: 'none', customArticle21: '',
  landlordAddress: '', tenantAddress: '', tenantMailAddress: '',
  guarantor: '', guarantorId: '', guarantorAddress: '', guarantorMailAddress: '', guarantorPhone: '',
  bankCode: '', bankAccount: '', bankAccountName: '',
  // 建物附件設定；簽署時隨合約凍結，之後改建物設定不影響已簽合約
  contractTerms: normalizeContractTerms(),
})

// 房號 → 房間 → 建物，帶入該棟的附件設定
const properties = ref([])
const termsProperty = computed(() => {
  const roomNo = String(form.value.roomNo || '').trim()
  const room = rooms.value.find(r => (r.name || r.roomName) === roomNo)
  return room?.propertyId ? properties.value.find(p => p.id === room.propertyId) || null : null
})
watch(termsProperty, (p) => {
  form.value.contractTerms = normalizeContractTerms(p?.contractTerms)
}, { immediate: true })

watch(() => form.value.rentfee, (fee) => {
  const n = Number(fee)
  form.value.deposit = (!n || isNaN(n)) ? '' : n * 2
})
watch([() => form.value.startDate, () => form.value.duration], ([start, duration]) => {
  if (!start || !duration) { form.value.endDate = ''; return }
  const date = new Date(start)
  const years = Math.floor(Number(duration))
  const months = Math.round((Number(duration) - years) * 12)
  date.setFullYear(date.getFullYear() + years)
  date.setMonth(date.getMonth() + months)
  date.setDate(date.getDate() - 1)
  form.value.endDate = date.toISOString().split('T')[0]
}, { immediate: true })

function payerText(val) {
  if (!val || val === 'none') return { text: '無', byTenant: false }
  if (val === 'landlord') return { text: '由出租人負擔', byTenant: false }
  if (val === 'tenant') return { text: '由承租人負擔', byTenant: true }
  return { text: val, byTenant: false }
}
const feeRows = computed(() => [
  { label: '管理費', ...payerText(form.value.feeManagement) },
  { label: '水費', ...payerText(form.value.feeWater) },
  {
    label: '電費',
    text: payerText(form.value.feeElectricity).text + (form.value.feeElectricityNote ? `（${form.value.feeElectricityNote}）` : ''),
    byTenant: form.value.feeElectricity === 'tenant',
  },
  { label: '瓦斯費', ...payerText(form.value.feeGas) },
  { label: '網路費', ...payerText(form.value.feeInternet) },
].map(r => ({ ...r, display: r.display ?? r.text })))

const setSignature = (img) => { form.value.signature = img }
const onTemplateSaved = (tmpl) => {
  form.value.paymentDay = tmpl.paymentDay
  form.value.feeWater = tmpl.feeWater
  form.value.feeElectricity = tmpl.feeElectricity
  form.value.feeElectricityNote = tmpl.feeElectricityNote
  form.value.feeGas = tmpl.feeGas
  form.value.feeInternet = tmpl.feeInternet
  form.value.feeManagement = tmpl.feeManagement
  form.value.customArticle21 = tmpl.customArticle21
}

const buildPdfPayload = (data = form.value) => buildContractPayload(data)

const apiBase = import.meta.env.VITE_API_BASE
const serverGeneratePdfDownload = async (payload, token, filename) => {
  const res = await axios.post(`${apiBase}/generatePdf`, payload, {
    responseType: 'arraybuffer',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  })
  let data = res.data
  if (data && typeof data === 'object' && !(data instanceof ArrayBuffer)) {
    const keys = Object.keys(data)
    const uint8 = new Uint8Array(keys.length)
    for (let i = 0; i < keys.length; i++) uint8[i] = data[i]
    data = uint8.buffer
  }
  const blob = new Blob([data], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = window.URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(link.href)
}

const overlaps = ref([])

const submitContract = async (confirmedReplace = false) => {
  if (!form.value.signature && !form.value.landlordSignature) {
    toast.warning('請至少完成一方簽名')
    return
  }
  loading.value = true
  try {
    const tenantUid = props.prefill?.tenantUid || selectedTenantUid.value || null
    const found = await findOverlappingSignedContracts(props.landlordId, {
      tenantUid, tenantId: form.value.tenantId, tenant: form.value.tenant, roomNo: form.value.roomNo,
      startDate: form.value.startDate, endDate: form.value.endDate,
    })
    // 確認後若又冒出未提示過的重疊合約，重新提示
    const seen = new Set(overlaps.value.map(c => c.id))
    if (found.length && (!confirmedReplace || found.some(c => !seen.has(c.id)))) {
      overlaps.value = found
      return
    }

    // 合約範本已打包於前端，直接本地組裝列印（不呼叫 Function）
    const payload = buildPdfPayload()
    payload.templateHtml = contractTemplate

    let usedPrint = false
    try {
      await printHtmlPdf(contractTemplate, payload, `租賃合約_${form.value.tenant}_${getTodayString()}`)
      usedPrint = true
    } catch (e) {
      console.warn('本地 PDF 組裝失敗，改用伺服端 generatePdf:', e)
      const token = await auth.currentUser?.getIdToken()
      await serverGeneratePdfDownload(payload, token, `租賃合約_${form.value.tenant}_${Date.now()}.pdf`)
    }

    const docRef = await createSignedContract({
      landlordUid: props.landlordId,
      contractSource: 'digital',
      tenantUid,
      ...form.value,
      rentfee: Number(form.value.rentfee) || 0,
      deposit: Number(form.value.deposit) || 0,
      templateHtml: contractTemplate,
      templateVersion: CONTRACT_TEMPLATE_VERSION,
      signedAt: serverTimestamp(),
    }, found.map(c => c.id))
    overlaps.value = []

    toast.success(usedPrint ? '合約已生成，請在列印視窗選「另存為 PDF」' : '合約已生成並下載！')
    emit('saved', docRef.id)
  } catch (e) {
    console.error('合約產生失敗:', e)
    toast.error('合約產生失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

// ---- 遠端簽約 ----
const sendingLink = ref(false)
const linkModal = ref(null) // { contractId, url?, expireDays?, error? }

const sendSignLink = async () => {
  const f = form.value
  if (!f.tenant?.trim() || !f.tenantId?.trim()) {
    toast.warning('請填寫承租人姓名與證件號碼，租客開啟連結時需以證件號碼驗證身分')
    return
  }
  if (!f.startDate || !f.endDate || !Number(f.rentfee)) {
    toast.warning('請填寫租金與租期')
    return
  }
  sendingLink.value = true
  try {
    const docRef = await createSignedContract({
      landlordUid: props.landlordId,
      contractSource: 'digital',
      tenantUid: props.prefill?.tenantUid || selectedTenantUid.value || null,
      ...f,
      tenantId: f.tenantId.trim().toUpperCase(),
      // 雙方簽名都在之後各自補上：租客經連結簽，房東核對後簽
      signature: '',
      landlordSignature: '',
      rentfee: Number(f.rentfee) || 0,
      deposit: Number(f.deposit) || 0,
      templateHtml: contractTemplate,
      templateVersion: CONTRACT_TEMPLATE_VERSION,
      status: 'awaiting_tenant',
      signedAt: serverTimestamp(),
    })
    linkModal.value = { contractId: docRef.id }
    try {
      const res = await requestContractSignLink(docRef.id)
      linkModal.value = { contractId: docRef.id, url: res.url, expireDays: res.expireDays }
    } catch (e) {
      console.error('產生簽署連結失敗:', e)
      linkModal.value = { contractId: docRef.id, error: '合約已建立，但連結產生失敗。請至「合約記錄」重發連結。' }
    }
  } catch (e) {
    console.error('建立待簽合約失敗:', e)
    toast.error('建立合約失敗，請稍後再試')
  } finally {
    sendingLink.value = false
  }
}

const closeLinkModal = () => {
  const id = linkModal.value?.contractId
  linkModal.value = null
  if (id) emit('saved', id)
}

onMounted(async () => {
  const profile = authStore.userProfile
  form.value.landlord = profile?.name || ''
  form.value.landlordId = profile?.idNumber || ''
  form.value.landlordPhone = profile?.phone || ''
  form.value.landlordAddress = profile?.address || ''
  form.value.bankCode = profile?.bankInfo?.code || ''
  form.value.bankAccount = profile?.bankInfo?.account || ''
  form.value.bankAccountName = profile?.bankInfo?.name || profile?.name || ''

  // 套用租客帶入
  const p = props.prefill || {}
  if (p.tenant) form.value.tenant = p.tenant
  if (p.tenantId) form.value.tenantId = p.tenantId
  if (p.tenantPhone) form.value.tenantPhone = p.tenantPhone
  if (p.roomNo) form.value.roomNo = p.roomNo
  if (p.address) form.value.address = p.address
  if (p.rentfee) form.value.rentfee = p.rentfee
  if (p.startDate) form.value.startDate = p.startDate
  if (p.duration) form.value.duration = p.duration
  // 續約自訂到期日：待 start/duration 的 watcher 算完後覆寫
  if (p.endDate) { await nextTick(); form.value.endDate = p.endDate }

  // 房源與建物：附件依房間所屬建物帶入；獨立頁另載入租客供下拉
  try {
    const [roomsSnap, propertiesSnap, tenantsSnap] = await Promise.all([
      getDocs(query(collection(db, 'rooms'), where('landlordId', '==', props.landlordId))),
      getDocs(query(collection(db, 'properties'), where('landlordId', '==', props.landlordId))),
      props.showSelectors
        ? getDocs(query(collection(db, 'tenants'), where('landlordId', '==', props.landlordId)))
        : Promise.resolve(null),
    ])
    rooms.value = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    properties.value = propertiesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (tenantsSnap) tenants.value = tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.warn('載入房源/建物/租客失敗:', e)
  }

  try {
    const tplSnap = await getDoc(doc(db, 'contract_templates', props.landlordId))
    if (tplSnap.exists()) {
      const t = tplSnap.data()
      form.value.paymentDay = t.paymentDay ?? 5
      form.value.feeWater = t.feeWater ?? 'landlord'
      form.value.feeElectricity = t.feeElectricity ?? 'tenant'
      form.value.feeElectricityNote = t.feeElectricityNote ?? '公共區域電費由房東負擔'
      form.value.feeGas = t.feeGas ?? 'none'
      form.value.feeInternet = t.feeInternet ?? 'landlord'
      form.value.feeManagement = t.feeManagement ?? 'none'
      form.value.customArticle21 = t.customArticle21 ?? ''
    }
  } catch (e) {
    console.warn('載入合約範本設定失敗:', e)
  }

})
</script>
