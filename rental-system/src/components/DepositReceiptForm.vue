<template>
  <div class="space-y-5">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">房號</label>
        <input v-model="form.roomNo" class="form-input" placeholder="例如：A-201" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">承租人</label>
        <input v-model="form.tenant" class="form-input" placeholder="承租人姓名" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">月租金</label>
        <input v-model.number="form.rentfee" type="number" min="0" class="form-input" placeholder="0" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">押金金額</label>
        <input v-model.number="form.deposit" type="number" min="0" class="form-input" placeholder="0" />
        <p v-if="amountWords" class="mt-1 text-sm text-gold-600 font-medium tracking-wide">{{ amountWords }}</p>
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">起租日</label>
        <input v-model="form.startDate" type="date" class="form-input" />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">租期（年）</label>
        <input v-model.number="form.duration" type="number" step="0.5" min="0.5" class="form-input" />
      </div>
    </div>

    <!-- 雙方簽名 -->
    <div class="grid grid-cols-2 gap-3">
      <div class="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
        <p class="text-[11px] text-text-secondary-light mb-1">出租人（房東）</p>
        <div class="h-14 flex items-end">
          <img v-if="landlordSignature" :src="landlordSignature" alt="房東簽名" class="max-h-14 max-w-full object-contain" />
          <span v-else class="text-[11px] text-text-secondary-light">未設定，將留白（設定 → 我的簽名）</span>
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

    <button :disabled="downloading" @click="generate"
      class="w-full py-3 bg-gold-500 text-white rounded-xl font-bold shadow-lg shadow-gold-500/30 hover:bg-gold-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
      <span v-if="downloading" class="material-symbols-outlined animate-spin">sync</span>
      {{ downloading ? '產生中…' : '產生押金收據' }}
    </button>

    <Signature v-model:visible="showSignPad" @confirm="(img) => tenantSignature = img" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../firebase/config'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { printHtmlPdf } from '../utils/contractRender'
import { amountToChineseCapital } from '../utils/chineseAmount'
import { loadLandlordSignature, BLANK_PIXEL } from '../utils/signature'
import receiptTemplate from '../templates/receipt.html?raw'
import Signature from './Signature.vue'

const props = defineProps({
  prefill: { type: Object, default: () => ({}) },
  landlordId: { type: String, required: true },
})
const emit = defineEmits(['saved'])

const authStore = useAuthStore()
const toast = useToastStore()
const downloading = ref(false)
const landlordSignature = ref('')
const tenantSignature = ref('')
const showSignPad = ref(false)

const form = ref({
  roomNo: '', tenant: '', landlord: '', address: '',
  rentfee: 0, deposit: 0, duration: 1,
  startDate: new Date().toISOString().split('T')[0],
})

const amountWords = computed(() => amountToChineseCapital(Number(form.value.deposit) || 0))

const computedEndDate = computed(() => {
  if (!form.value.startDate) return ''
  const d = new Date(form.value.startDate)
  const years = Number(form.value.duration) || 1
  const whole = Math.floor(years)
  const months = Math.round((years - whole) * 12)
  d.setFullYear(d.getFullYear() + whole)
  d.setMonth(d.getMonth() + months)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
})

const fmt = n => (Number(n) || 0).toLocaleString('en-US')
const formatROCDate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear() - 1911}年${d.getMonth() + 1}月${d.getDate()}日`
}
const buildReceiptNo = () => {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

const generate = async () => {
  downloading.value = true
  try {
    const today = formatROCDate(new Date())
    const endDate = computedEndDate.value
    const receiptNo = buildReceiptNo()
    const localData = {
      ...form.value,
      docTitle: '押金收據',
      docTitleEn: 'Security Deposit Receipt',
      receiptNo, today,
      amount: fmt(form.value.deposit),
      amountWords: amountWords.value,
      amountLabel: '押金金額 Security Deposit',
      periodLabel: '租賃期間 TERM',
      period: `${form.value.startDate} ～ ${endDate}（${form.value.duration} 年）`,
      rentRow: `<tr><th>月租金 RENT</th><td>NT$ ${fmt(form.value.rentfee)}</td></tr>`,
      clause: '茲確認收訖上列承租人所繳納之押金，作為本租賃契約履約保證。租賃期滿且無欠費、無損壞或其他依約應扣抵之情事者，本押金將於點交後無息全額退還。',
      signature: tenantSignature.value || BLANK_PIXEL,
      landlordSignature: landlordSignature.value || BLANK_PIXEL,
    }
    try {
      await printHtmlPdf(receiptTemplate, localData, `押金收據_${form.value.tenant}`)
      toast.success('已開啟列印視窗，請選「另存為 PDF」')
    } catch (e) {
      console.warn('本地收據組裝失敗:', e)
      toast.error('收據產生失敗，請稍後再試')
      return
    }
    // 存檔
    try {
      await addDoc(collection(db, 'receipts'), {
        landlordId: props.landlordId, mode: 'guarantee', docLabel: '押金收據',
        roomNo: form.value.roomNo || '', tenant: form.value.tenant || '', landlord: form.value.landlord || '',
        address: form.value.address || '', deposit: Number(form.value.deposit) || 0, rentfee: Number(form.value.rentfee) || 0,
        startDate: form.value.startDate || '', endDate, receiptNo, today,
        signatures: { landlord: landlordSignature.value || '', tenant: tenantSignature.value || '' },
        createdAt: serverTimestamp(),
      })
    } catch (e) {
      console.warn('收據存檔失敗（不影響已產生的 PDF）:', e)
    }
    emit('saved')
  } finally {
    downloading.value = false
  }
}

onMounted(async () => {
  const p = props.prefill || {}
  form.value.roomNo = p.roomNo || ''
  form.value.tenant = p.tenant || ''
  form.value.address = p.address || ''
  form.value.rentfee = Number(p.rentfee) || 0
  form.value.deposit = Number(p.deposit) || 0
  form.value.duration = Number(p.duration) || 1
  if (p.startDate) form.value.startDate = p.startDate
  form.value.landlord = authStore.userProfile?.name || ''
  landlordSignature.value = await loadLandlordSignature(props.landlordId)
})
</script>
