<template>
  <div class="max-w-5xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">電子合約</h1>
        <p class="text-text-secondary-light">填寫租賃資料、設定條款並進行線上簽署，自動生成 PDF 合約</p>
      </div>
    </div>

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

    <!-- ===================== TAB: NEW CONTRACT ===================== -->
    <div v-if="activeTab === 'new'" class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

      <!-- Step indicator -->
      <div class="flex items-center px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 gap-0">
        <template v-for="(s, i) in steps" :key="s.id">
          <div class="flex items-center gap-2 shrink-0">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
              :class="step > s.id
                ? 'bg-green-500 text-white'
                : step === s.id
                  ? 'bg-gold-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'">
              <span v-if="step > s.id" class="material-symbols-outlined text-[16px]">check</span>
              <span v-else>{{ s.id }}</span>
            </div>
            <span class="text-xs font-medium hidden sm:block"
              :class="step === s.id ? 'text-gold-600' : 'text-text-secondary-light'">{{ s.label }}</span>
          </div>
          <div v-if="i < steps.length - 1" class="flex-1 h-0.5 mx-3"
            :class="step > s.id ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'"></div>
        </template>
      </div>

      <!-- ===== STEP 1: 基本資料 ===== -->
      <div v-if="step === 1" class="p-6 md:p-8 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <!-- 房源 -->
          <div class="space-y-4">
            <h3 class="text-base font-bold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">房源資訊</h3>

            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">選擇房源</label>
              <select v-model="selectedRoomId" @change="onRoomSelect"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary">
                <option value="">-- 選擇房源（自動帶入資料）--</option>
                <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }} — {{ r.address }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">房號</label>
              <input v-model="form.roomNo" class="form-input" placeholder="例如: A-201" />
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">地址</label>
              <input v-model="form.address" class="form-input" placeholder="完整地址" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">月租金</label>
                <input v-model="form.rentfee" type="number" class="form-input" placeholder="金額" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">押金（自動）</label>
                <input :value="form.deposit" type="text" readonly
                  class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 text-sm cursor-not-allowed" />
              </div>
            </div>
          </div>

          <!-- 承租人 -->
          <div class="space-y-4">
            <h3 class="text-base font-bold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">承租人資訊</h3>

            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">選擇租客（選填）</label>
              <select v-model="selectedTenantId" @change="onTenantSelect"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary">
                <option value="">-- 選擇現有租客（自動帶入）--</option>
                <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}{{ t.roomNumber ? ` (${t.roomNumber})` : '' }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">真實姓名</label>
              <input v-model="form.tenant" class="form-input" placeholder="承租人姓名" />
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">身分證/居留證號</label>
              <input v-model="form.tenantId" @blur="checkTenantId" class="form-input"
                :class="{ 'border-red-500': tenantIdError }" placeholder="證件號碼" />
              <p v-if="tenantIdError" class="text-xs text-red-500 mt-1">{{ tenantIdError }}</p>
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">聯絡電話</label>
              <input v-model="form.tenantPhone" @blur="checkTenantPhone" class="form-input"
                :class="{ 'border-red-500': tenantPhoneError }" placeholder="09xxxxxxxx" />
              <p v-if="tenantPhoneError" class="text-xs text-red-500 mt-1">{{ tenantPhoneError }}</p>
            </div>
          </div>

          <!-- 租期 -->
          <div class="space-y-4 md:col-span-2">
            <h3 class="text-base font-bold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">租約期限</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">租期 (年)</label>
                <input v-model.number="form.duration" type="number" step="0.5" min="0.5" class="form-input" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">起租日</label>
                <input v-model="form.startDate" type="date" class="form-input" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">退租日（自動）</label>
                <input :value="form.endDate" type="date" readonly
                  class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 text-sm cursor-not-allowed" />
              </div>
            </div>
          </div>

        </div>

        <div class="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button @click="goToStep2"
            class="px-6 py-3 bg-gold-500 text-white rounded-xl shadow-lg shadow-gold-500/30 hover:bg-gold-600 font-bold transition-all flex items-center gap-2">
            下一步：合約條款
            <span class="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>

      <!-- ===== STEP 2: 合約條款確認 ===== -->
      <div v-else-if="step === 2" class="p-6 md:p-8 space-y-5">

        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">合約條款設定</h3>
            <p class="text-sm text-text-secondary-light mt-0.5">確認費用分擔與其他約定，可點擊「修改範本」調整</p>
          </div>
          <button @click="showTemplateModal = true"
            class="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gold-400 text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/20 text-sm font-medium transition-colors">
            <span class="material-symbols-outlined text-[18px]">edit_document</span>
            修改範本
          </button>
        </div>

        <!-- Contract summary -->
        <div class="bg-surface-light dark:bg-surface-dark rounded-xl p-4 text-sm space-y-2">
          <div class="flex justify-between">
            <span class="text-text-secondary-light">合約對象</span>
            <span class="font-medium">{{ form.tenant || '—' }} / {{ form.roomNo || '—' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary-light">租期</span>
            <span class="font-medium">{{ form.startDate }} ～ {{ form.endDate }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary-light">月租金 / 押金</span>
            <span class="font-medium">NT${{ Number(form.rentfee).toLocaleString() }} / NT${{ Number(form.deposit).toLocaleString() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary-light">付款日</span>
            <span class="font-medium">每月 {{ form.paymentDay }} 日前</span>
          </div>
        </div>

        <!-- Fee table -->
        <div>
          <h4 class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-2 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px] text-gold-500">receipt_long</span>
            第五條　費用約定
          </h4>
          <div class="rounded-xl border border-ink-100 dark:border-ink-800 overflow-hidden text-sm">
            <div v-for="(row, i) in feeRows" :key="row.label"
              class="flex justify-between px-4 py-2.5"
              :class="i % 2 === 0 ? 'bg-surface-light dark:bg-surface-dark' : 'bg-white dark:bg-card-dark'">
              <span class="text-text-secondary-light">{{ row.label }}</span>
              <span class="font-medium" :class="row.byTenant ? 'text-orange-500' : 'text-green-600'">{{ row.display }}</span>
            </div>
          </div>
        </div>

        <!-- Custom article 21 -->
        <div v-if="form.customArticle21">
          <h4 class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-2 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px] text-gold-500">gavel</span>
            第二十一條　其他約定
          </h4>
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-900 dark:text-amber-200 whitespace-pre-line">
            {{ form.customArticle21 }}
          </div>
        </div>
        <div v-else class="text-sm text-text-secondary-light italic">
          無額外約定，點擊「修改範本」可新增第二十一條自訂內容。
        </div>

        <div class="pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button @click="step = 1"
            class="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            返回修改
          </button>
          <button @click="step = 3"
            class="flex-1 py-3 bg-gold-500 text-white rounded-xl shadow-lg shadow-gold-500/30 hover:bg-gold-600 font-bold transition-all flex items-center justify-center gap-2">
            下一步：預覽與簽署
            <span class="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>

      <!-- ===== STEP 3: 預覽與簽署 ===== -->
      <div v-else-if="step === 3" class="p-6 md:p-8 flex flex-col" style="min-height: 600px;">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold">合約預覽 &amp; 雙方簽署</h3>
          <span class="text-sm text-text-secondary-light">請確認內容後，點擊簽名欄位完成簽署</span>
        </div>

        <div class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 shadow-inner">
          <Preview :form="form" />
        </div>

        <div class="space-y-4">
          <div class="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <input type="checkbox" id="check" v-model="isChecked"
              class="w-5 h-5 text-gold-500 rounded focus:ring-gold-500 cursor-pointer" />
            <label for="check" class="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer select-none">
              我已詳細閱讀以上合約條款，雙方均已完成簽署，確認上述資料無誤。
            </label>
          </div>

          <div class="flex gap-4">
            <button @click="step = 2"
              class="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              返回
            </button>
            <button :disabled="!isChecked || loading" @click="submitContract"
              class="flex-1 py-3 bg-green-600 text-white rounded-xl shadow-lg shadow-green-500/30 hover:bg-green-700 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
              <span v-if="loading" class="material-symbols-outlined animate-spin">sync</span>
              {{ loading ? '正在生成 PDF...' : '確認簽署並下載合約' }}
            </button>
          </div>
        </div>
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
                <span class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ c.tenantName }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="contractStatus(c.endDate) === '生效中'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'">
                  {{ contractStatus(c.endDate) }}
                </span>
              </div>
              <p class="text-sm text-text-secondary-light mt-0.5">
                {{ c.roomNo }} ・ {{ c.address }}
              </p>
              <p class="text-xs text-text-secondary-light mt-0.5">
                租期：{{ c.startDate }} ～ {{ c.endDate }}
                ・月租 NT${{ Number(c.rentfee).toLocaleString() }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-1.5 shrink-0">
              <span class="text-xs text-text-secondary-light">簽署：{{ formatDate(c.signedAt) }}</span>
              <div class="flex gap-2">
                <button
                  @click="previewContract = c"
                  class="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
                  <span class="material-symbols-outlined text-sm">visibility</span>
                  查閱
                </button>
                <button
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

  <!-- Modals -->
  <Signature v-model:visible="showSignModal" @confirm="setSignature" />
  <ContractTemplateModal v-model:show="showTemplateModal" @saved="onTemplateSaved" />

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
import axios from 'axios'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { db, auth } from '../../firebase/config'
import {
  collection, query, where, getDocs, addDoc, getDoc, doc, orderBy, serverTimestamp
} from 'firebase/firestore'

import Signature from '../../components/Signature.vue'
import Preview from '../../components/Preview.vue'
import ContractTemplateModal from '../../components/ContractTemplateModal.vue'

const authStore = useAuthStore()
const toast = useToastStore()

// ---- UI state ----
const activeTab = ref('new')
const step = ref(1)
const isChecked = ref(false)
const loading = ref(false)
const showSignModal = ref(false)
const showTemplateModal = ref(false)
const tenantIdError = ref('')
const tenantPhoneError = ref('')

const tabs = [
  { id: 'new', label: '新建合約', icon: 'add_circle' },
  { id: 'history', label: '合約記錄', icon: 'history_edu' },
]
const steps = [
  { id: 1, label: '基本資料' },
  { id: 2, label: '合約條款' },
  { id: 3, label: '預覽簽署' },
]

// ---- Data from Firestore ----
const rooms = ref([])
const tenants = ref([])
const selectedRoomId = ref('')
const selectedTenantId = ref('')

// ---- History ----
const signedContracts = ref([])
const loadingHistory = ref(false)
const redownloading = ref(null)
const previewContract = ref(null)

// ---- Form ----
const form = ref({
  roomNo: '', address: '',
  tenant: '', tenantId: '', tenantPhone: '',
  landlord: '', landlordId: '', landlordPhone: '',
  rentfee: '', deposit: '', duration: 1,
  startDate: getTodayString(), endDate: '',
  signature: '', landlordSignature: '',
  today: getTodayRoc(),
  // Template fields
  paymentDay: 5,
  feeWater: 'landlord',
  feeElectricity: 'tenant',
  feeElectricityNote: '公共區域電費由房東負擔',
  feeGas: 'none',
  feeInternet: 'landlord',
  feeManagement: 'none',
  customArticle21: ''
})

// ---- Watchers ----
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

// ---- Fee display (for step 2 summary) ----
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
    text: (() => {
      const p = payerText(form.value.feeElectricity)
      return form.value.feeElectricityNote
        ? `${p.text}（${form.value.feeElectricityNote}）`
        : p.text
    })(),
    byTenant: form.value.feeElectricity === 'tenant',
    display: (() => {
      const p = payerText(form.value.feeElectricity)
      return form.value.feeElectricityNote
        ? `${p.text}（${form.value.feeElectricityNote}）`
        : p.text
    })()
  },
  { label: '瓦斯費', ...payerText(form.value.feeGas) },
  { label: '網路費', ...payerText(form.value.feeInternet) },
].map(r => ({ ...r, display: r.display ?? r.text })))

// ---- Helpers ----
function getTodayRoc() {
  const d = new Date()
  return `${d.getFullYear() - 1911} 年 ${String(d.getMonth() + 1).padStart(2, '0')} 月 ${String(d.getDate()).padStart(2, '0')} 日`
}
function getTodayString() { return new Date().toISOString().split('T')[0] }

function validateId(id) {
  return /^[A-Z][12]\d{8}$/i.test(id) || /^[A-Z]{1,2}\d{8,9}$/i.test(id)
}
function checkTenantId() {
  tenantIdError.value = (form.value.tenantId && !validateId(form.value.tenantId))
    ? '格式錯誤，請輸入正確身分證或居留證號' : ''
}
function validatePhone(p) {
  return /^09\d{8}$/.test(p) || /^0\d{1,2}-\d{6,8}$/.test(p)
}
function checkTenantPhone() {
  tenantPhoneError.value = (form.value.tenantPhone && !validatePhone(form.value.tenantPhone))
    ? '請輸入正確手機或市話號碼' : ''
}

function contractStatus(endDate) {
  if (!endDate) return '未知'
  return new Date(endDate) >= new Date() ? '生效中' : '已到期'
}
function formatDate(val) {
  if (!val) return '—'
  const d = val?.toDate ? val.toDate() : new Date(val)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

// ---- Room / Tenant selectors ----
const onRoomSelect = () => {
  const r = rooms.value.find(r => r.id === selectedRoomId.value)
  if (!r) return
  form.value.roomNo = r.name || r.roomName || ''
  form.value.address = r.address || ''
  form.value.rentfee = r.price || ''
}

const onTenantSelect = () => {
  const t = tenants.value.find(t => t.id === selectedTenantId.value)
  if (!t) return
  form.value.tenant = t.name || ''
  form.value.tenantId = t.idNumber || ''
  form.value.tenantPhone = t.phone || ''
}

// ---- Step navigation ----
const goToStep2 = () => {
  const required = ['roomNo', 'address', 'tenant', 'rentfee', 'startDate', 'endDate']
  if (required.some(k => !form.value[k])) { toast.warning('請確實填寫所有必填欄位'); return }
  step.value = 2
}

// ---- Tab switch ----
const switchTab = (id) => {
  activeTab.value = id
  if (id === 'history' && !signedContracts.value.length) loadHistory()
}

// ---- Signature ----
const setSignature = (img) => { form.value.signature = img }

// ---- Template saved ----
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

// ---- Build PDF display strings ----
const buildPdfPayload = (data = form.value) => {
  function pText(val) {
    if (!val || val === 'none') return '無'
    if (val === 'landlord') return '由出租人負擔'
    if (val === 'tenant') return '由承租人負擔'
    return val
  }
  const elec = pText(data.feeElectricity)
  return {
    ...data,
    feeWaterDisplay: pText(data.feeWater),
    feeElectricityDisplay: data.feeElectricityNote
      ? `${elec}（備註：${data.feeElectricityNote}）`
      : elec,
    feeGasDisplay: pText(data.feeGas),
    feeInternetDisplay: pText(data.feeInternet),
    feeManagementDisplay: pText(data.feeManagement),
    customArticle21Display: data.customArticle21 || '',
    templateType: 'Contract'
  }
}

// ---- Submit & save ----
const apiBase = import.meta.env.VITE_API_BASE

const submitContract = async () => {
  if (!form.value.signature && !form.value.landlordSignature) {
    toast.warning('請至少完成一方簽名')
    return
  }
  loading.value = true
  try {
    const token = await auth.currentUser?.getIdToken()
    const payload = buildPdfPayload()

    const res = await axios.post(`${apiBase}/generatePdf`, payload, {
      responseType: 'arraybuffer',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    })

    // Handle potential mock.js interference
    let finalData = res.data
    if (finalData && typeof finalData === 'object' && !(finalData instanceof ArrayBuffer)) {
      const keys = Object.keys(finalData)
      const uint8 = new Uint8Array(keys.length)
      for (let i = 0; i < keys.length; i++) uint8[i] = finalData[i]
      finalData = uint8.buffer
    }

    const blob = new Blob([finalData], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `租賃合約_${form.value.tenant}_${Date.now()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(link.href)

    // Save full form data for future re-download
    await addDoc(collection(db, 'signed_contracts'), {
      landlordUid: authStore.effectiveUid,
      ...form.value,
      rentfee: Number(form.value.rentfee) || 0,
      deposit: Number(form.value.deposit) || 0,
      signedAt: serverTimestamp(),
    })

    toast.success('合約已生成並下載！')

  } catch (e) {
    console.error('PDF 下載失敗:', e)
    if (e.response?.data) {
      try { console.error('後端錯誤:', new TextDecoder().decode(e.response.data)) } catch {}
    }
    toast.error('PDF 下載失敗，請查看 Console')
  } finally {
    loading.value = false
  }
}

// ---- Load history ----
const loadHistory = async () => {
  loadingHistory.value = true
  try {
    const uid = authStore.effectiveUid
    const snap = await getDocs(
      query(collection(db, 'signed_contracts'),
        where('landlordUid', '==', uid),
        orderBy('signedAt', 'desc'))
    )
    signedContracts.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('載入合約記錄失敗:', e)
  } finally {
    loadingHistory.value = false
  }
}

const redownloadContract = async (c) => {
  redownloading.value = c.id
  try {
    const token = await auth.currentUser?.getIdToken()
    const payload = buildPdfPayload(c)
    const res = await axios.post(`${apiBase}/generatePdf`, payload, {
      responseType: 'arraybuffer',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
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
    link.download = `租賃合約_${c.tenant}_${c.startDate}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(link.href)
    toast.success('合約已重新下載')
  } catch (e) {
    console.error('重新下載失敗:', e)
    toast.error('重新下載失敗，請稍後再試')
  } finally {
    redownloading.value = null
  }
}

// ---- Init ----
const initData = async () => {
  const uid = authStore.effectiveUid
  const profile = authStore.userProfile

  // Landlord info from profile
  form.value.landlord = profile?.name || ''
  form.value.landlordId = profile?.idNumber || ''
  form.value.landlordPhone = profile?.phone || ''

  try {
    const [roomsSnap, tenantsSnap, templateSnap] = await Promise.all([
      getDocs(query(collection(db, 'rooms'), where('landlordId', '==', uid))),
      getDocs(query(collection(db, 'tenants'), where('landlordId', '==', uid))),
      getDoc(doc(db, 'contract_templates', uid))
    ])

    rooms.value = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    tenants.value = tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    if (templateSnap.exists()) {
      const t = templateSnap.data()
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
    console.error('initData 失敗:', e)
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
