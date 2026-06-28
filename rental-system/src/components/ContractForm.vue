<template>
  <div class="space-y-6">
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
    </div>

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
      <div class="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
        <p class="text-[11px] text-text-secondary-light mb-1">出租人（房東）</p>
        <div class="h-14 flex items-end">
          <img v-if="form.landlordSignature" :src="form.landlordSignature" alt="房東簽名" class="max-h-14 max-w-full object-contain" />
          <span v-else class="text-[11px] text-text-secondary-light">未設定，將留白（設定 → 我的簽名）</span>
        </div>
      </div>
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

    <button :disabled="!isChecked || loading" @click="submitContract"
      class="w-full py-3 bg-green-600 text-white rounded-xl shadow-lg shadow-green-500/30 hover:bg-green-700 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
      <span v-if="loading" class="material-symbols-outlined animate-spin">sync</span>
      {{ loading ? '正在生成合約…' : '確認簽署並產生合約' }}
    </button>

    <Signature v-model:visible="showSignModal" @confirm="setSignature" />
    <ContractTemplateModal v-model:show="showTemplateModal" @saved="onTemplateSaved" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import { db, auth } from '../firebase/config'
import { collection, addDoc, getDoc, doc, serverTimestamp } from 'firebase/firestore'
import Preview from './Preview.vue'
import Signature from './Signature.vue'
import ContractTemplateModal from './ContractTemplateModal.vue'
import { printHtmlPdf } from '../utils/contractRender'
import { loadLandlordSignature } from '../utils/signature'
import contractTemplate from '../templates/contractTemplate.html?raw'

// 與 functions/index.js TEMPLATE_VERSIONS.Contract 對齊
const CONTRACT_TEMPLATE_VERSION = 1

const props = defineProps({
  prefill: { type: Object, default: () => ({}) },
  landlordId: { type: String, required: true },
})
const emit = defineEmits(['saved'])

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
})

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

const buildPdfPayload = (data = form.value) => {
  const pText = (v) => (!v || v === 'none') ? '無' : v === 'landlord' ? '由出租人負擔' : v === 'tenant' ? '由承租人負擔' : v
  const elec = pText(data.feeElectricity)
  return {
    ...data,
    feeWaterDisplay: pText(data.feeWater),
    feeElectricityDisplay: data.feeElectricityNote ? `${elec}（備註：${data.feeElectricityNote}）` : elec,
    feeGasDisplay: pText(data.feeGas),
    feeInternetDisplay: pText(data.feeInternet),
    feeManagementDisplay: pText(data.feeManagement),
    customArticle21Display: data.customArticle21 || '',
    templateType: 'Contract',
  }
}

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

const submitContract = async () => {
  if (!form.value.signature && !form.value.landlordSignature) {
    toast.warning('請至少完成一方簽名')
    return
  }
  loading.value = true
  try {
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

    const docRef = await addDoc(collection(db, 'signed_contracts'), {
      landlordUid: props.landlordId,
      contractSource: 'digital',
      tenantUid: props.prefill?.tenantUid || null,
      ...form.value,
      rentfee: Number(form.value.rentfee) || 0,
      deposit: Number(form.value.deposit) || 0,
      templateHtml: contractTemplate,
      templateVersion: CONTRACT_TEMPLATE_VERSION,
      signedAt: serverTimestamp(),
    })

    toast.success(usedPrint ? '合約已生成，請在列印視窗選「另存為 PDF」' : '合約已生成並下載！')
    emit('saved', docRef.id)
  } catch (e) {
    console.error('合約產生失敗:', e)
    toast.error('合約產生失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const profile = authStore.userProfile
  form.value.landlord = profile?.name || ''
  form.value.landlordId = profile?.idNumber || ''
  form.value.landlordPhone = profile?.phone || ''

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

  form.value.landlordSignature = await loadLandlordSignature(props.landlordId)
})
</script>
