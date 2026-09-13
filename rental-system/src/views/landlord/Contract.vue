<template>
  <div class="max-w-5xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">電子合約</h1>
        <p class="text-text-secondary-light">填寫租賃資料、設定條款並進行線上簽署，自動生成 PDF 合約</p>
      </div>
    </div>

    <section v-if="route.query.contract" class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark p-5 space-y-3" aria-label="目前租約">
      <h2 class="font-bold text-lg">目前租約</h2>
      <p v-if="leaseLoading" class="text-sm text-text-secondary-light">載入租約中…</p>
      <template v-else-if="currentLease">
        <p class="font-semibold">{{ currentLease.roomNumber }}・{{ currentLease.tenantName }}</p>
        <p>{{ currentLease.startDate || '待確認' }} ～ {{ currentLease.endDate || '待確認' }}</p>
        <p class="text-sm">月租金 NT$ {{ (currentLease.rent ?? 0).toLocaleString() }}</p>
        <p v-if="currentLease.pendingRenewal" class="text-sm text-emerald-700 dark:text-emerald-300">已安排下一期：{{ currentLease.pendingRenewal.startDate }} ～ {{ currentLease.pendingRenewal.endDate }}</p>
        <p class="text-xs text-text-secondary-light">此處顯示租約管理資料；簽署文件請至下方「合約記錄」查閱。</p>
      </template>
      <p v-else role="alert" class="text-sm text-amber-700 dark:text-amber-300">無法取得這份目前租約，請回房源頁重新確認。</p>
    </section>

    <!-- Tabs -->
    <div class="flex gap-1 p-1 bg-surface-light dark:bg-surface-dark rounded-xl w-fit">
      <button
        v-for="tab in tabs" :key="tab.id"
        @click="switchTab(tab.id)"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === tab.id
          ? 'bg-white dark:bg-card-dark text-text-primary-light dark:text-text-primary-dark shadow-sm'
          : 'text-text-secondary-light hover:text-text-primary-light dark:hover:text-text-primary-dark'"
      >
        <span class="material-symbols-outlined text-[16px] align-middle mr-1">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- ===================== TAB: NEW CONTRACT（共用 ContractForm） ===================== -->
    <div v-if="activeTab === 'new'" class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 md:p-8">
      <div v-if="!newReady" class="flex justify-center py-16">
        <span class="material-symbols-outlined animate-spin text-4xl text-ink-200">progress_activity</span>
      </div>
      <ContractForm
        v-else
        :landlord-id="authStore.effectiveUid"
        :prefill="newPrefill"
        :show-selectors="true"
        @saved="onNewSaved"
      />
    </div>

    <!-- ===================== TAB: PAPER UPLOAD ===================== -->
    <div v-if="activeTab === 'paper'" class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 md:p-8 space-y-6">

      <div>
        <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">上傳紙本合約掃描</h3>
        <p class="text-sm text-text-secondary-light mt-0.5">將已簽署的紙本合約掃描上傳，系統將保存記錄並通知租客完成電子確認。</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 選擇租客 -->
        <div class="space-y-1">
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">選擇租客 <span class="text-red-500">*</span></label>
          <select v-model="paperForm.tenantDocId" @change="onPaperTenantSelect"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
            <option value="">-- 請選擇租客 --</option>
            <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}{{ t.roomNumber ? ` (${t.roomNumber})` : '' }}</option>
          </select>
        </div>

        <!-- 房號 -->
        <div class="space-y-1">
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">房號 <span class="text-red-500">*</span></label>
          <input v-model="paperForm.roomNo" class="form-input" placeholder="例如：A-201" />
        </div>

        <!-- 地址 -->
        <div class="space-y-1 md:col-span-2">
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">地址</label>
          <input v-model="paperForm.address" class="form-input" placeholder="完整地址" />
        </div>

        <!-- 月租金 -->
        <div class="space-y-1">
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">月租金</label>
          <input v-model.number="paperForm.rentfee" type="number" class="form-input" placeholder="金額" />
        </div>

        <!-- 押金 -->
        <div class="space-y-1">
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">押金</label>
          <input v-model.number="paperForm.deposit" type="number" class="form-input" placeholder="金額" />
        </div>

        <!-- 起租日 -->
        <div class="space-y-1">
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">起租日 <span class="text-red-500">*</span></label>
          <input v-model="paperForm.startDate" type="date" class="form-input" />
        </div>

        <!-- 退租日 -->
        <div class="space-y-1">
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">退租日 <span class="text-red-500">*</span></label>
          <input v-model="paperForm.endDate" type="date" class="form-input" />
        </div>

        <!-- 檔案上傳 -->
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300">合約掃描檔 <span class="text-red-500">*</span></label>
          <div
            class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
            :class="paperFile
              ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
              : 'border-gray-300 dark:border-gray-600 hover:border-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/10'"
            @click="paperFileInputRef?.click()"
            @dragover.prevent
            @drop.prevent="onPaperFileDrop">
            <input ref="paperFileInputRef" type="file" accept=".pdf,image/*" class="hidden" @change="onPaperFileSelect" />
            <div v-if="!paperFile" class="space-y-2">
              <span class="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">upload_file</span>
              <p class="text-sm text-text-secondary-light">點擊或拖曳上傳 PDF 或圖片（最大 10MB）</p>
            </div>
            <div v-else class="space-y-1">
              <span class="material-symbols-outlined text-3xl text-green-500">check_circle</span>
              <p class="text-sm font-medium text-green-700 dark:text-green-400">{{ paperFile.name }}</p>
              <p class="text-xs text-text-secondary-light">{{ (paperFile.size / 1024 / 1024).toFixed(2) }} MB</p>
              <button type="button" @click.stop="paperFile = null"
                class="text-xs text-red-500 hover:text-red-700 transition-colors">移除</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="paperOverlaps.length" role="alert"
        class="p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 space-y-2">
        <p class="text-sm font-bold text-amber-800 dark:text-amber-300">此承租人已有租期重疊的合約，上傳後以下合約將標記為「已被取代」：</p>
        <ul class="text-xs text-amber-800 dark:text-amber-300 list-disc pl-5 space-y-0.5">
          <li v-for="c in paperOverlaps" :key="c.id">
            {{ c.roomNo || '—' }}・{{ c.startDate }} ～ {{ c.endDate }}（{{ c.contractSource === 'paper' ? '紙本' : '電子' }}）
          </li>
        </ul>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" @click="paperOverlaps = []"
            class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-white/60 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
            取消
          </button>
          <button type="button" :disabled="uploadingPaper" @click="uploadPaperContract(true)"
            class="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors">
            確認取代並上傳
          </button>
        </div>
      </div>

      <div v-else class="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
        <button
          :disabled="uploadingPaper || !paperForm.tenantDocId || !paperForm.roomNo || !paperForm.startDate || !paperForm.endDate || !paperFile"
          @click="uploadPaperContract(false)"
          class="px-6 py-3 bg-gold-500 text-white rounded-xl shadow-lg shadow-gold-500/30 hover:bg-gold-600 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          <span v-if="uploadingPaper" class="material-symbols-outlined animate-spin text-[18px]">sync</span>
          <span v-else class="material-symbols-outlined text-[18px]">cloud_upload</span>
          {{ uploadingPaper ? '上傳中…' : '上傳並建立記錄' }}
        </button>
      </div>
    </div>

    <!-- ===================== TAB: HISTORY ===================== -->
    <div v-if="activeTab === 'history'">
      <div v-if="loadingHistory" class="flex justify-center py-16">
        <span class="material-symbols-outlined animate-spin text-4xl text-ink-200">progress_activity</span>
      </div>

      <div v-else-if="!signedContracts.length"
        class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
        <span class="material-symbols-outlined text-5xl text-ink-200">history_edu</span>
        <p class="mt-3 text-text-secondary-light">尚無合約簽署記錄</p>
        <button @click="activeTab = 'new'"
          class="mt-4 px-5 py-2 bg-gold-500 text-white rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors">
          建立第一份合約
        </button>
      </div>

      <div v-else class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">合約記錄</h2>
        </div>
        <div class="divide-y divide-gray-50 dark:divide-gray-800">
          <div v-for="c in signedContracts" :key="c.id"
            class="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ c.tenant || c.tenantName }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="stateBadgeClass(contractState(c))">
                  {{ SIGNED_CONTRACT_LABELS[contractState(c)] }}
                </span>
              </div>
              <p class="text-sm text-text-secondary-light mt-0.5">
                {{ c.roomNo }} ・ {{ c.address }}
              </p>
              <p class="text-xs text-text-secondary-light mt-0.5">
                租期：{{ c.startDate }} ～ {{ c.endDate }}
                ・月租 NT${{ Number(c.rentfee).toLocaleString() }}
              </p>

              <!-- 未連結租客帳號：租客端是以 tenantUid 查詢，沒連結就看不到這份合約 -->
              <div v-if="!c.tenantUid"
                class="mt-2 flex flex-wrap items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                <span class="material-symbols-outlined text-amber-500 text-[16px]" aria-hidden="true">link_off</span>
                <span class="text-xs text-amber-800 dark:text-amber-300">尚未連結租客帳號，租客端看不到這份合約</span>
                <template v-if="linkableTenants.length">
                  <select v-model="linkTarget[c.id]" :aria-label="`為 ${c.tenant || '此合約'} 選擇租客`"
                    class="text-xs px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
                    <option value="">選擇租客…</option>
                    <option v-for="t in linkableTenants" :key="t.id" :value="t.uid">
                      {{ t.name }}{{ t.roomNumber || t.room ? `（${t.roomNumber || t.room}）` : '' }}
                    </option>
                  </select>
                  <button @click="linkTenant(c)" :disabled="!linkTarget[c.id] || linking === c.id"
                    class="text-xs px-3 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors">
                    {{ linking === c.id ? '連結中…' : '連結' }}
                  </button>
                </template>
                <span v-else class="text-xs text-amber-700 dark:text-amber-400">名下租客都還沒有登入帳號，請先於租客列表建立</span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1.5 shrink-0">
              <div class="flex items-center gap-2">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="c.contractSource === 'paper'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'">
                  {{ c.contractSource === 'paper' ? '紙本' : '電子' }}
                </span>
                <span v-if="c.tenantAcknowledgedAt" class="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  租客已確認
                </span>
                <span v-else class="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  待租客確認
                </span>
              </div>
              <span class="text-xs text-text-secondary-light">建立：{{ formatDate(c.signedAt) }}</span>
              <div class="flex gap-2">
                <!-- Paper: open attachment -->
                <a v-if="c.contractSource === 'paper' && c.attachmentUrl"
                  :href="c.attachmentUrl" target="_blank" rel="noopener"
                  class="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
                  <span class="material-symbols-outlined text-sm">open_in_new</span>
                  查看掃描
                </a>
                <!-- Digital: preview -->
                <button v-else-if="c.contractSource !== 'paper'"
                  @click="previewContract = c"
                  class="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
                  <span class="material-symbols-outlined text-sm">visibility</span>
                  查閱
                </button>
                <button v-if="c.contractSource !== 'paper'"
                  @click="redownloadContract(c)"
                  :disabled="redownloading === c.id"
                  class="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-gold-50 text-gold-600 hover:bg-gold-100 dark:bg-gold-900/20 dark:text-gold-400 dark:hover:bg-gold-900/40 transition-colors disabled:opacity-50">
                  <span class="material-symbols-outlined text-sm">{{ redownloading === c.id ? 'hourglass_empty' : 'download' }}</span>
                  {{ redownloading === c.id ? '產生中...' : '重新下載' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- 合約查閱 Modal -->
  <Teleport to="body">
    <div v-if="previewContract"
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      @click.self="previewContract = null">
      <div class="w-full max-w-3xl bg-white dark:bg-card-dark rounded-2xl shadow-2xl my-8">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">
            合約查閱 — {{ previewContract.tenant }} · {{ previewContract.roomNo }}
          </h2>
          <div class="flex items-center gap-2">
            <button
              @click="redownloadContract(previewContract); previewContract = null"
              :disabled="redownloading !== null"
              class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors disabled:opacity-50">
              <span class="material-symbols-outlined text-sm">download</span>
              下載 PDF
            </button>
            <button @click="previewContract = null"
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span class="material-symbols-outlined text-gray-500">close</span>
            </button>
          </div>
        </div>
        <div class="p-6 overflow-y-auto max-h-[75vh]">
          <Preview :form="previewContract" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { db, auth, storage } from '../../firebase/config'
import {
  collection, query, where, getDocs, getDoc, doc, updateDoc, orderBy, serverTimestamp
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import Preview from '../../components/Preview.vue'
import ContractForm from '../../components/ContractForm.vue'
import { printHtmlPdf } from '../../utils/contractRender'
import { getLeaseContract } from '../../services/leaseService'
import { findOverlappingSignedContracts, createSignedContract } from '../../services/signedContractService'
import { signedContractState, SIGNED_CONTRACT_LABELS } from '../../utils/signedContract'
import { taipeiToday } from '../../utils/roomLease'

const authStore = useAuthStore()
const toast = useToastStore()
const route = useRoute()

const activeTab = ref(route.query.contract ? 'history' : 'new')
const currentLease = ref(null)
const leaseLoading = ref(!!route.query.contract)
const tabs = [
  { id: 'new', label: '新建合約', icon: 'add_circle' },
  { id: 'paper', label: '上傳紙本', icon: 'upload_file' },
  { id: 'history', label: '合約記錄', icon: 'history_edu' },
]

// ---- 新建合約（共用 ContractForm）----
const newReady = ref(false)
const newPrefill = ref({})
const onNewSaved = () => {
  toast.success('合約已建立')
  activeTab.value = 'history'
  loadHistory()
}

// ---- 房源 / 租客（紙本分頁用）----
const rooms = ref([])
const tenants = ref([])

// ---- 歷史 ----
const signedContracts = ref([])
const loadingHistory = ref(false)
const redownloading = ref(null)
const previewContract = ref(null)
const linkTarget = ref({})
const linking = ref(null)

// ---- 紙本 ----
const paperFile = ref(null)
const uploadingPaper = ref(false)
const paperFileInputRef = ref(null)
const paperForm = ref({
  tenantDocId: '', tenantUid: '', tenantName: '',
  roomNo: '', address: '', rentfee: '', deposit: '', startDate: '', endDate: '',
})

// ---- Helpers ----
const getTodayString = () => new Date().toISOString().split('T')[0]
const contractState = (c) => signedContractState(c, signedContracts.value, taipeiToday())
const stateBadgeClass = (state) => state === 'active'
  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  : state === 'upcoming'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
function formatDate(val) {
  if (!val) return '—'
  const d = val?.toDate ? val.toDate() : new Date(val)
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

const switchTab = (id) => {
  activeTab.value = id
  if (id === 'history' && !signedContracts.value.length) loadHistory()
}

// ---- 重新下載用 payload ----
const buildPdfPayload = (data) => {
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

// ---- 歷史 ----
const loadHistory = async (backfill = true) => {
  loadingHistory.value = true
  try {
    const uid = authStore.effectiveUid
    const snap = await getDocs(
      query(collection(db, 'signed_contracts'),
        where('landlordUid', '==', uid),
        orderBy('signedAt', 'desc'))
    )
    signedContracts.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (backfill) await backfillTenantUid()
  } catch (e) {
    console.error('載入合約記錄失敗:', e)
  } finally {
    loadingHistory.value = false
  }
}

// 有登入帳號的租客才連得起來（tenantUid 就是 Firebase UID）
const linkableTenants = computed(() => tenants.value.filter(t => t.uid))

// 自動比對不到時的手動指派：房東自己挑，最直接也最不會錯
const linkTenant = async (c) => {
  const uid = linkTarget.value[c.id]
  if (!uid) return
  linking.value = c.id
  try {
    await updateDoc(doc(db, 'signed_contracts', c.id), { tenantUid: uid })
    c.tenantUid = uid
    toast.success('已連結，租客端即可查閱此合約')
  } catch (e) {
    console.error('連結租客失敗:', e)
    toast.error('連結失敗，請稍後再試')
  } finally {
    linking.value = null
  }
}

// 舊合約未寫入 tenantUid，租客端「我的合約」以 tenantUid 查詢會查不到，
// 也無法完成電子確認（規則要求 tenantUid 相符）。此處依證件號碼比對租客檔案補寫。
const backfillTenantUid = async () => {
  if (!tenants.value.length) return
  const targets = signedContracts.value.filter(c => !c.tenantUid)
  if (!targets.length) return
  let fixed = 0
  for (const c of targets) {
    const t = tenants.value.find(x => {
      if (c.tenantId && x.idNumber) return x.idNumber === c.tenantId
      return false
    }) || tenants.value.find(x =>
      c.tenant && c.roomNo && x.name === c.tenant &&
      (x.roomNumber === c.roomNo || x.room === c.roomNo))
    if (!t?.uid) continue
    try {
      await updateDoc(doc(db, 'signed_contracts', c.id), { tenantUid: t.uid })
      c.tenantUid = t.uid
      fixed++
    } catch (e) {
      console.warn('補寫合約 tenantUid 失敗:', c.id, e)
    }
  }
  if (fixed) toast.success(`已補齊 ${fixed} 筆舊合約的租客連結，租客端即可查閱`)
}

const redownloadContract = async (c) => {
  redownloading.value = c.id
  try {
    const payload = buildPdfPayload(c)
    try {
      if (!c.templateHtml) throw new Error('此合約無凍結骨架，改用伺服端')
      await printHtmlPdf(c.templateHtml, payload, `租賃合約_${c.tenant}_${c.startDate}`)
      toast.success('已開啟列印視窗，請選「另存為 PDF」')
    } catch (e) {
      console.warn('本地 PDF 組裝失敗，改用伺服端 generatePdf:', e)
      const token = await auth.currentUser?.getIdToken()
      await serverGeneratePdfDownload(payload, token, `租賃合約_${c.tenant}_${c.startDate}.pdf`)
      toast.success('合約已重新下載')
    }
  } catch (e) {
    console.error('重新下載失敗:', e)
    toast.error('重新下載失敗，請稍後再試')
  } finally {
    redownloading.value = null
  }
}

// ---- 紙本 ----
const onPaperTenantSelect = () => {
  const t = tenants.value.find(t => t.id === paperForm.value.tenantDocId)
  if (!t) return
  paperForm.value.tenantUid = t.uid || ''
  paperForm.value.tenantName = t.name || ''
  paperForm.value.roomNo = paperForm.value.roomNo || t.roomNumber || ''
  paperForm.value.address = paperForm.value.address || (() => {
    const r = rooms.value.find(r => r.name === t.roomNumber)
    return r?.address || ''
  })()
}
const onPaperFileSelect = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) { toast.warning('檔案大小不可超過 10MB'); return }
  paperFile.value = file
}
const onPaperFileDrop = (e) => {
  const file = e.dataTransfer.files[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) { toast.warning('檔案大小不可超過 10MB'); return }
  paperFile.value = file
}
const paperOverlaps = ref([])
const uploadPaperContract = async (confirmedReplace = false) => {
  if (!paperFile.value || !paperForm.value.tenantDocId) return
  uploadingPaper.value = true
  try {
    const uid = authStore.effectiveUid
    const t = tenants.value.find(x => x.id === paperForm.value.tenantDocId)
    const found = await findOverlappingSignedContracts(uid, {
      tenantUid: paperForm.value.tenantUid || null, tenantId: t?.idNumber || '',
      tenant: paperForm.value.tenantName, roomNo: paperForm.value.roomNo,
      startDate: paperForm.value.startDate, endDate: paperForm.value.endDate,
    })
    const seen = new Set(paperOverlaps.value.map(c => c.id))
    if (found.length && (!confirmedReplace || found.some(c => !seen.has(c.id)))) {
      paperOverlaps.value = found
      return
    }
    const ext = paperFile.value.name.split('.').pop() || 'pdf'
    const fileName = `${paperForm.value.tenantUid || paperForm.value.tenantDocId}_${Date.now()}.${ext}`
    const fileRef = storageRef(storage, `paper_contracts/${uid}/${fileName}`)
    await uploadBytes(fileRef, paperFile.value)
    const attachmentUrl = await getDownloadURL(fileRef)

    await createSignedContract({
      landlordUid: uid,
      contractSource: 'paper',
      attachmentUrl,
      tenantUid: paperForm.value.tenantUid || null,
      tenant: paperForm.value.tenantName,
      roomNo: paperForm.value.roomNo,
      address: paperForm.value.address,
      rentfee: Number(paperForm.value.rentfee) || 0,
      deposit: Number(paperForm.value.deposit) || 0,
      startDate: paperForm.value.startDate,
      endDate: paperForm.value.endDate,
      signedAt: serverTimestamp(),
    }, found.map(c => c.id))
    paperOverlaps.value = []

    toast.success('紙本合約已上傳！租客登入後可查閱並確認。')
    paperForm.value = { tenantDocId: '', tenantUid: '', tenantName: '', roomNo: '', address: '', rentfee: '', deposit: '', startDate: '', endDate: '' }
    paperFile.value = null
    if (signedContracts.value.length) loadHistory()
  } catch (e) {
    console.error('上傳紙本合約失敗:', e)
    toast.error('上傳失敗，請稍後再試')
  } finally {
    uploadingPaper.value = false
  }
}

// ---- Init ----
const initData = async () => {
  const uid = authStore.effectiveUid
  try {
    const [roomsSnap, tenantsSnap] = await Promise.all([
      getDocs(query(collection(db, 'rooms'), where('landlordId', '==', uid))),
      getDocs(query(collection(db, 'tenants'), where('landlordId', '==', uid))),
    ])
    rooms.value = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    tenants.value = tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    await prefillFromRenewal()
    if (route.query.contract) {
      leaseLoading.value = true
      try {
        const lease = await getLeaseContract(uid, String(route.query.contract))
        currentLease.value = lease?.status === 'active' ? lease : null
        await loadHistory(false)
      } finally { leaseLoading.value = false }
    }
  } catch (e) {
    console.error('initData 失敗:', e)
  } finally {
    newReady.value = true
  }
}

// 由 TenantList「一鍵續約」導入：?renew=contractId 預填 ContractForm
const prefillFromRenewal = async () => {
  const renewId = route.query.renew
  if (!renewId) return
  try {
    const snap = await getDoc(doc(db, 'contracts', String(renewId)))
    if (!snap.exists()) return
    const c = snap.data()
    activeTab.value = 'new'
    const t = tenants.value.find(t => t.id === c.tenantDocId)
    const r = rooms.value.find(r => (r.name || r.roomName) === c.roomNumber)
    const term = c.pendingRenewal?.startDate ? c.pendingRenewal : c
    let duration = 1
    if (term.startDate && term.endDate) {
      duration = Math.max(1, Math.round(
        (new Date(term.endDate).getTime() - new Date(term.startDate).getTime()) / (365.25 * 86400000)
      ))
    }
    newPrefill.value = {
      tenantUid: t?.uid || '',
      tenant: t?.name || c.tenantName || '',
      tenantId: t?.idNumber || '',
      tenantPhone: t?.phone || '',
      roomNo: r?.name || r?.roomName || c.roomNumber || '',
      address: r?.address || '',
      rentfee: term.rent || c.rent || '',
      startDate: term.startDate || getTodayString(),
      duration,
      endDate: term.endDate || '',
    }
    toast.info('已帶入續約資料，請確認後完成簽署')
  } catch (e) {
    console.error('prefillFromRenewal 失敗:', e)
  }
}

onMounted(() => {
  if (authStore.userProfile) {
    initData()
  } else {
    const stop = watch(() => authStore.userProfile, (p) => {
      if (p) { stop(); initData() }
    })
  }
})
</script>
