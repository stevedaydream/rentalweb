<template>
  <div class="max-w-7xl mx-auto space-y-6" @click="closeDropdown">

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">帳務管理</h1>
        <p class="text-text-secondary-light">收支紀錄、帳單生成與電費盈虧</p>
      </div>
      <div class="flex gap-2 flex-wrap items-center">
        <MonthPicker v-model="currentMonth" />
        <button @click="showGenerateConfirm = true" :disabled="loading"
          class="px-3 py-2 bg-ink-700 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-ink-800 disabled:opacity-50 transition-colors">
          <span class="material-symbols-outlined text-[18px]">magic_button</span>一鍵生成帳單
        </button>
        <!-- 更多操作下拉 -->
        <div class="relative">
          <button @click.stop="showMoreMenu = !showMoreMenu"
            class="px-3 py-2 border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
            <span class="material-symbols-outlined text-[18px]">more_horiz</span>更多
          </button>
          <div v-if="showMoreMenu"
            class="absolute right-0 top-10 w-44 bg-white dark:bg-ink-800 rounded-xl shadow-xl border border-ink-100 dark:border-ink-700 z-50 overflow-hidden">
            <button @click="sendLineNotifications(); showMoreMenu = false" :disabled="sendingLine || loading"
              class="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50 transition-colors text-[#06C755]">
              <span v-if="sendingLine" class="material-symbols-outlined text-[16px] animate-spin">sync</span>
              <svg v-else class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              {{ sendingLine ? '發送中...' : 'LINE 通知租客' }}
            </button>
            <div class="border-t border-ink-100 dark:border-ink-700"></div>
            <button @click="openTaipowerModal(); showMoreMenu = false"
              class="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-ink-600 dark:text-ink-200">
              <span class="material-symbols-outlined text-[18px] text-yellow-500">electric_bolt</span>台電帳單
            </button>
          </div>
        </div>
        <button @click="openModal()"
          class="px-3 py-2 bg-gold-500 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gold-600 transition-colors">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>記一筆
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500"></div>
    </div>

    <template v-else>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
          <p class="text-xs text-text-secondary-light mb-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px] text-green-500">payments</span>本月已收
          </p>
          <p class="text-2xl font-bold text-green-600">NT$ {{ stats.income.toLocaleString() }}</p>
          <p class="text-xs text-text-secondary-light mt-1">{{ stats.incomeCount }} 筆</p>
        </div>
        <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
          <p class="text-xs text-text-secondary-light mb-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px] text-orange-500">pending_actions</span>待收 / 逾期
          </p>
          <p class="text-2xl font-bold text-orange-500">NT$ {{ stats.pending.toLocaleString() }}</p>
          <p class="text-xs text-text-secondary-light mt-1">{{ stats.pendingCount }} 筆</p>
        </div>
        <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
          <p class="text-xs text-text-secondary-light mb-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px] text-red-400">arrow_upward</span>本月支出
          </p>
          <p class="text-2xl font-bold text-red-500">NT$ {{ stats.expense.toLocaleString() }}</p>
          <p class="text-xs text-text-secondary-light mt-1">{{ stats.expenseCount }} 筆</p>
        </div>
        <div class="p-5 rounded-xl border shadow-sm"
          :class="stats.net >= 0
            ? 'bg-gold-50 dark:bg-gold-900/10 border-gold-100 dark:border-gold-900/30'
            : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'">
          <p class="text-xs mb-1 flex items-center gap-1"
            :class="stats.net >= 0 ? 'text-gold-700 dark:text-gold-300' : 'text-red-600'">
            <span class="material-symbols-outlined text-[16px]">account_balance</span>本月淨利
          </p>
          <p class="text-2xl font-bold" :class="stats.net >= 0 ? 'text-gold-600' : 'text-red-500'">
            NT$ {{ stats.net.toLocaleString() }}
          </p>
          <p class="text-xs mt-1" :class="stats.net >= 0 ? 'text-gold-500' : 'text-red-400'">
            已收 - 支出
          </p>
        </div>
      </div>

      <!-- Category Summary -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          v-for="cat in categoryStats" :key="cat.key"
          @click="currentTab = cat.key"
          class="p-4 rounded-xl border text-left transition-all hover:shadow-md"
          :class="currentTab === cat.key
            ? `${cat.activeBg} border-transparent shadow-md`
            : 'bg-white dark:bg-card-dark border-ink-100 dark:border-ink-800'"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="material-symbols-outlined text-[20px]" :class="cat.iconColor">{{ cat.icon }}</span>
            <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="cat.badgeClass">{{ cat.count }} 筆</span>
          </div>
          <p class="text-xs text-text-secondary-light">{{ cat.label }}</p>
          <p class="text-lg font-bold mt-0.5" :class="cat.amountColor">NT$ {{ cat.amount.toLocaleString() }}</p>
        </button>
      </div>

      <!-- Transaction Table -->
      <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm overflow-visible">

        <!-- Tabs -->
        <div class="flex items-center border-b border-ink-100 dark:border-ink-800 px-6 pt-2 overflow-x-auto">
          <button
            v-for="tab in tabs" :key="tab.value"
            @click="currentTab = tab.value"
            class="px-4 py-3 text-sm font-medium border-b-2 transition-colors relative top-[1px] whitespace-nowrap"
            :class="currentTab === tab.value
              ? 'border-gold-500 text-gold-600'
              : 'border-transparent text-text-secondary-light hover:text-ink-600 dark:hover:text-ink-300'"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" class="ml-1 text-xs bg-ink-100 dark:bg-ink-700 px-1.5 py-0.5 rounded-full">{{ tab.count }}</span>
          </button>
        </div>

        <div class="overflow-x-auto min-h-[300px]">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-text-secondary-light uppercase bg-surface-light dark:bg-surface-dark">
              <tr>
                <th class="px-6 py-3">日期</th>
                <th class="px-6 py-3">類別</th>
                <th class="px-6 py-3">對象 / 房號</th>
                <th class="px-6 py-3">摘要</th>
                <th class="px-6 py-3 text-right">金額</th>
                <th class="px-6 py-3 text-center">狀態</th>
                <th class="px-6 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100 dark:divide-ink-800">
              <tr v-for="item in filteredTransactions" :key="item.id"
                class="hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-text-secondary-light text-xs">{{ item.date }}</td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium" :class="categoryBadge(item.category)">
                    {{ item.category }}
                  </span>
                </td>
                <td class="px-6 py-4 font-medium text-sm">{{ item.target }}</td>
                <td class="px-6 py-4 text-text-secondary-light text-xs max-w-[180px] truncate">{{ item.description }}</td>
                <td class="px-6 py-4 text-right font-bold" :class="item.type === 'income' ? 'text-green-600' : 'text-red-500'">
                  {{ item.type === 'income' ? '+' : '-' }} {{ item.amount.toLocaleString() }}
                </td>
                <td class="px-6 py-4 text-center">
                  <!-- 待收：顯示快速收款按鈕 -->
                  <template v-if="item.status === 'pending' || item.status === 'overdue'">
                    <button
                      @click="markPaid(item)"
                      :disabled="markingPaidId === item.id"
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 hover:bg-green-100 hover:text-green-700 transition-colors disabled:opacity-50"
                    >
                      <span class="material-symbols-outlined text-[14px]">
                        {{ markingPaidId === item.id ? 'hourglass_empty' : 'payments' }}
                      </span>
                      {{ item.status === 'overdue' ? '逾期－收款' : '標記已收' }}
                    </button>
                  </template>
                  <!-- 待確認：顯示截圖預覽 + 確認按鈕 -->
                  <template v-else-if="item.status === 'waiting_confirmation'">
                    <div class="flex flex-col items-center gap-1.5">
                      <a v-if="item.paymentProofUrl" :href="item.paymentProofUrl" target="_blank" rel="noopener"
                        class="block w-12 h-10 rounded overflow-hidden border border-amber-300 hover:border-amber-500 transition-colors"
                        title="查看匯款截圖">
                        <img :src="item.paymentProofUrl" class="w-full h-full object-cover" />
                      </a>
                      <button
                        @click="markPaid(item)"
                        :disabled="markingPaidId === item.id"
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-green-100 hover:text-green-700 transition-colors disabled:opacity-50"
                      >
                        <span class="material-symbols-outlined text-[14px]">
                          {{ markingPaidId === item.id ? 'hourglass_empty' : 'check_circle' }}
                        </span>
                        確認收款
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                      :class="statusStyles[item.status] || 'text-green-600 bg-green-50'">
                      <span class="material-symbols-outlined text-[14px]">{{ statusIcons[item.status] || 'check_circle' }}</span>
                      {{ statusLabels[item.status] || '已結清' }}
                    </span>
                  </template>
                </td>
                <td class="px-6 py-4 text-center relative">
                  <button @click.stop="toggleMenu(item.id)"
                    class="text-ink-300 hover:text-gold-600 p-1 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                    :class="{ 'bg-gold-50 text-gold-600': activeMenuId === item.id }">
                    <span class="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                  <div v-if="activeMenuId === item.id"
                    class="absolute right-8 top-8 w-36 bg-white dark:bg-ink-800 rounded-xl shadow-xl border border-ink-100 dark:border-ink-700 z-50 overflow-hidden text-left animation-fade-in"
                    @click.stop>
                    <button @click="handleEdit(item)" class="w-full px-4 py-2 text-sm hover:bg-surface-light dark:hover:bg-surface-dark text-ink-600 dark:text-ink-200 flex items-center gap-2">
                      <span class="material-symbols-outlined text-[18px]">edit</span>編輯
                    </button>
                    <button @click="openHistory(item)" class="w-full px-4 py-2 text-sm hover:bg-surface-light dark:hover:bg-surface-dark text-ink-600 dark:text-ink-200 flex items-center gap-2">
                      <span class="material-symbols-outlined text-[18px]">history</span>修改紀錄
                    </button>
                    <div class="border-t border-ink-100 dark:border-ink-700 my-1"></div>
                    <button @click="handleDelete(item.id)" class="w-full px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2">
                      <span class="material-symbols-outlined text-[18px]">delete</span>刪除
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredTransactions.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-text-secondary-light">
                  <span class="material-symbols-outlined text-4xl block mb-2 text-ink-200">receipt_long</span>
                  本月 ({{ currentMonth }}) 無相關紀錄
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <BillTransactionModal v-model:show="showModal" v-model="form" :is-editing="isEditing" :tenants="tenantsList" @save="saveTransaction" />
    <TaipowerModal v-model:show="showTaipowerModal" v-model="taipowerForm" @save="saveTaipowerBill" />
    <BillHistoryModal v-model:show="showHistoryModal" :history="selectedHistory" />

    <!-- 一鍵生成帳單確認 Modal -->
    <div v-if="showGenerateConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showGenerateConfirm = false"></div>
      <div class="relative bg-white dark:bg-ink-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-amber-600">receipt_long</span>
          </div>
          <div>
            <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">確認生成帳單</h3>
            <p class="text-xs text-text-secondary-light">{{ currentMonth }} 月份</p>
          </div>
        </div>
        <p class="text-sm text-text-secondary-light">
          系統將為所有在租房客生成 <strong class="text-text-primary-light dark:text-text-primary-dark">{{ currentMonth }}</strong> 月份的租金與電費帳單。已存在的帳單不會重複建立。
        </p>
        <div class="flex gap-3 pt-2">
          <button @click="showGenerateConfirm = false"
            class="flex-1 py-2.5 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-ink-600 dark:text-ink-300 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
            取消
          </button>
          <button @click="confirmGenerateBills"
            class="flex-1 py-2.5 rounded-xl bg-ink-700 text-white text-sm font-bold hover:bg-ink-800 transition-colors">
            確認生成
          </button>
        </div>
      </div>
    </div>

    <!-- 刪除確認 Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteConfirm = false"></div>
      <div class="relative bg-white dark:bg-ink-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-red-600">delete</span>
          </div>
          <div>
            <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">確認刪除</h3>
            <p class="text-xs text-text-secondary-light">此操作無法復原</p>
          </div>
        </div>
        <p class="text-sm text-text-secondary-light">確定要刪除此筆紀錄嗎？刪除後將無法還原。</p>
        <div class="flex gap-3 pt-2">
          <button @click="showDeleteConfirm = false"
            class="flex-1 py-2.5 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-ink-600 dark:text-ink-300 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
            取消
          </button>
          <button @click="confirmDelete"
            class="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
            確認刪除
          </button>
        </div>
      </div>
    </div>

    <!-- 點擊外部關閉更多選單 overlay -->
    <div v-if="showMoreMenu" class="fixed inset-0 z-40" @click="showMoreMenu = false"></div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { db } from '../../firebase/config'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, getDocs, query, orderBy, where, limit,
  type Unsubscribe
} from 'firebase/firestore'
import MonthPicker from '../../components/financials/MonthPicker.vue'
import BillTransactionModal from '../../components/financials/BillTransactionModal.vue'
import TaipowerModal from '../../components/financials/TaipowerModal.vue'
import BillHistoryModal from '../../components/financials/BillHistoryModal.vue'
import {
  statusLabels, statusStyles, statusIcons,
  type TransactionHistory, type TransactionForm, type TaipowerForm, type TaipowerBill,
} from '../../components/financials/types'

interface Transaction {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  target: string
  description: string
  amount: number
  status: 'completed' | 'pending' | 'overdue' | 'waiting_confirmation'
  history?: TransactionHistory[]
  tenantId?: string
  landlordId?: string
  paymentProofUrl?: string
  relatedUsageId?: string
  relatedTenantDocId?: string
  relatedContractId?: string
  createdAt?: any
}

const authStore = useAuthStore()
const toast = useToastStore()
const transactions = ref<Transaction[]>([])
const taipowerBills = ref<TaipowerBill[]>([])
const tenantsList = ref<{ id: string; name: string; room: string }[]>([])
const loading = ref(true)
const markingPaidId = ref<string | null>(null)
const sendingLine = ref(false)

const currentMonth = ref(new Date().toISOString().slice(0, 7))
const currentTab = ref('all')
const showModal = ref(false)
const showTaipowerModal = ref(false)
const showHistoryModal = ref(false)
const showGenerateConfirm = ref(false)
const showMoreMenu = ref(false)
const showDeleteConfirm = ref(false)
const deletingId = ref<string | null>(null)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const activeMenuId = ref<string | null>(null)
const selectedHistory = ref<TransactionHistory[]>([])

let unsubscribeBills: Unsubscribe | null = null
let unsubscribeTaipower: Unsubscribe | null = null

const form = ref<TransactionForm>({
  type: 'income', amount: undefined, date: '',
  category: '租金收入', target: '', description: '', status: 'pending',
})
const taipowerForm = ref<TaipowerForm>({ month: currentMonth.value, amount: undefined, usage: undefined })

// --- Firestore ---
const initDataListeners = (uid: string) => {
  if (unsubscribeBills) unsubscribeBills()
  if (unsubscribeTaipower) unsubscribeTaipower()
  loading.value = true

  // 一次性讀取租客清單供表單使用
  getDocs(query(collection(db, 'tenants'), where('landlordId', '==', uid))).then(snap => {
    tenantsList.value = snap.docs.map(d => {
      const data = d.data()
      return { id: d.id, name: data.name || '', room: data.room || '' }
    })
  })

  unsubscribeBills = onSnapshot(
    query(collection(db, 'bills'), where('landlordId', '==', uid), orderBy('date', 'desc'), limit(200)),
    (snap) => {
      const today = new Date().toISOString().split('T')[0]
      const overdueUpdates: Promise<any>[] = []
      transactions.value = snap.docs.map(d => {
        const data = d.data()
        // 自動標記逾期：待收且已超過截止日
        if (data.status === 'pending' && data.dueDate && data.dueDate < today!) {
          overdueUpdates.push(updateDoc(doc(db, 'bills', d.id), { status: 'overdue', updatedAt: serverTimestamp() }))
          return { id: d.id, ...data, status: 'overdue' } as Transaction
        }
        return { id: d.id, ...data } as Transaction
      })
      if (overdueUpdates.length) Promise.all(overdueUpdates).catch(console.error)
      loading.value = false
    },
    (err: any) => { console.error('讀取帳務失敗:', err); loading.value = false }
  )

  unsubscribeTaipower = onSnapshot(
    query(collection(db, 'taipower_bills'), where('landlordId', '==', uid), orderBy('month', 'desc')),
    (snap) => { taipowerBills.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaipowerBill)) },
    (err: any) => console.error('讀取台電帳單失敗:', err)
  )
}

onMounted(() => { if (authStore.user) initDataListeners(authStore.effectiveUid) })
watch(() => authStore.user, (u) => { if (u) initDataListeners(u.uid); else { unsubscribeBills?.(); unsubscribeTaipower?.(); transactions.value = []; loading.value = false } })
onUnmounted(() => { unsubscribeBills?.(); unsubscribeTaipower?.() })

// --- Computed ---
const monthlyTransactions = computed(() =>
  transactions.value.filter(t => t.date?.startsWith(currentMonth.value))
)

const isCollected = (t: Transaction) => t.status === 'completed' || (t.status as string) === 'paid'

const stats = computed(() => {
  let income = 0, incomeCount = 0, pending = 0, pendingCount = 0, expense = 0, expenseCount = 0
  monthlyTransactions.value.forEach(t => {
    if (t.type === 'income') {
      if (isCollected(t)) { income += t.amount; incomeCount++ }
      else { pending += t.amount; pendingCount++ }
    } else {
      expense += t.amount; expenseCount++
    }
  })
  return { income, incomeCount, pending, pendingCount, expense, expenseCount, net: income - expense }
})

const categoryStats = computed(() => {
  const mt = monthlyTransactions.value
  const sum = (cat: string, typeFilter?: 'income' | 'expense') =>
    mt.filter(t => t.category === cat && (!typeFilter || t.type === typeFilter))

  const rent = sum('租金收入')
  const deposit = sum('入住款項')
  const elec = sum('電費')
  const taipower = sum('台電帳單')

  return [
    {
      key: '租金收入', label: '租金收入', icon: 'home',
      count: rent.length, amount: rent.reduce((s, t) => s + t.amount, 0),
      iconColor: 'text-blue-500', amountColor: 'text-blue-700 dark:text-blue-300',
      badgeClass: 'bg-blue-100 text-blue-700', activeBg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200',
    },
    {
      key: '入住款項', label: '入住款項', icon: 'key',
      count: deposit.length, amount: deposit.reduce((s, t) => s + t.amount, 0),
      iconColor: 'text-purple-500', amountColor: 'text-purple-700 dark:text-purple-300',
      badgeClass: 'bg-purple-100 text-purple-700', activeBg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200',
    },
    {
      key: '電費', label: '電費（分攤）', icon: 'bolt',
      count: elec.length, amount: elec.reduce((s, t) => s + t.amount, 0),
      iconColor: 'text-yellow-500', amountColor: 'text-yellow-700 dark:text-yellow-300',
      badgeClass: 'bg-yellow-100 text-yellow-700', activeBg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200',
    },
    {
      key: '台電帳單', label: '台電帳單（支出）', icon: 'electric_bolt',
      count: taipower.length, amount: taipower.reduce((s, t) => s + t.amount, 0),
      iconColor: 'text-red-400', amountColor: 'text-red-600 dark:text-red-400',
      badgeClass: 'bg-red-100 text-red-600', activeBg: 'bg-red-50 dark:bg-red-900/20 border-red-200',
    },
  ]
})

const pendingCount = computed(() => monthlyTransactions.value.filter(t => !isCollected(t) && t.type === 'income').length)

const tabs = computed(() => [
  { label: '全部', value: 'all', count: 0 },
  { label: '租金收入', value: '租金收入', count: 0 },
  { label: '入住款項', value: '入住款項', count: 0 },
  { label: '電費', value: '電費', count: 0 },
  { label: '支出', value: 'expense', count: 0 },
  { label: '待收', value: 'pending', count: pendingCount.value },
])

const filteredTransactions = computed(() => {
  return monthlyTransactions.value.filter(t => {
    if (currentTab.value === 'all') return true
    if (currentTab.value === 'expense') return t.type === 'expense'
    if (currentTab.value === 'pending') return !isCollected(t) && t.type === 'income'
    return t.category === currentTab.value
  })
})

// --- Category badge style ---
const categoryBadge = (cat: string) => {
  const map: Record<string, string> = {
    '租金收入': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    '入住款項': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    '電費': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    '台電帳單': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  }
  return map[cat] || 'bg-surface-light dark:bg-surface-dark text-ink-500 dark:text-ink-300'
}

// --- Mark as Paid (quick action) ---
const markPaid = async (item: Transaction) => {
  markingPaidId.value = item.id
  try {
    await updateDoc(doc(db, 'bills', item.id), {
      status: 'completed',
      paidAt: new Date().toISOString().split('T')[0],
      updatedAt: serverTimestamp(),
    })
    toast.success(`已標記「${item.target}」收款完成`)
  } catch {
    toast.error('更新失敗，請稍後再試')
  } finally {
    markingPaidId.value = null
  }
}

// --- Generate Monthly Bills ---
const confirmGenerateBills = async () => {
  showGenerateConfirm.value = false
  await generateMonthlyBills()
}

const generateMonthlyBills = async () => {
  if (!authStore.user) return
  loading.value = true
  try {
    const uid = authStore.effectiveUid
    const payDay = String(authStore.userProfile?.settings?.paymentDay ?? 5).padStart(2, '0')
    const dueDate = `${currentMonth.value}-${payDay}`
    const [tenantsSnap, readingsSnap] = await Promise.all([
      getDocs(query(collection(db, 'tenants'), where('landlordId', '==', uid))),
      getDocs(query(collection(db, 'meter_readings'),
        where('landlordId', '==', uid),
        where('periodEnd', '>=', `${currentMonth.value}-01`),
        where('periodEnd', '<=', `${currentMonth.value}-31`))),
    ])
    // 只對還在租的房客生成帳單（leaseEnd 為空或 >= 本月）
    const allTenants = tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }))
    const tenants = allTenants.filter((t: any) => !t.leaseEnd || t.leaseEnd >= `${currentMonth.value}-01`)
    const readings = readingsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    let count = 0
    const batch: Promise<any>[] = []

    tenants.forEach((tenant: any) => {
      const exists = transactions.value.some(t =>
        (t.tenantId === tenant.uid || t.relatedTenantDocId === tenant.id) &&
        t.date.startsWith(currentMonth.value) && t.category === '租金收入'
      )
      if (!exists) {
        count++
        batch.push(addDoc(collection(db, 'bills'), {
          tenantId: tenant.uid || null, relatedTenantDocId: tenant.id,
          landlordId: uid, date: `${currentMonth.value}-01`,
          type: 'income', category: '租金收入',
          target: `${tenant.name} ${tenant.room}`,
          description: `${currentMonth.value} 月份房租`,
          amount: Number(tenant.rent) || 0,
          status: 'pending', dueDate, history: [], createdAt: serverTimestamp(),
        }))
      }
    })

    readings.forEach((reading: any) => {
      const exists = transactions.value.some(t => t.relatedUsageId === reading.id)
      const matched: any = tenants.find((t: any) => t.room === reading.roomName)
      if (!exists && reading.cost > 0 && matched) {
        count++
        batch.push(addDoc(collection(db, 'bills'), {
          tenantId: matched.uid || null, relatedTenantDocId: matched.id,
          relatedUsageId: reading.id, landlordId: uid,
          date: reading.periodEnd, type: 'income', category: '電費',
          target: `${matched.name} ${reading.roomName}`,
          description: `${currentMonth.value} 電費 (${reading.periodStart}~${reading.periodEnd} 用電 ${reading.usage}度)`,
          amount: Number(reading.cost) || 0,
          status: 'pending', dueDate, history: [], createdAt: serverTimestamp(),
        }))
      }
    })

    await Promise.all(batch)
    toast[count > 0 ? 'success' : 'info'](count > 0 ? `成功產生 ${count} 筆帳單` : '本月帳單皆已存在')
  } catch (err) {
    console.error('generateMonthlyBills error:', err)
    toast.error('產生失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

// --- LINE 通知租客 ---
const sendLineNotifications = async () => {
  if (!authStore.user) return
  // 找本月待收帳單中有 lineUserId 的租客
  const uid = authStore.effectiveUid
  const pendingBills = transactions.value.filter(t =>
    t.date?.startsWith(currentMonth.value) && t.status === 'pending' && t.type === 'income'
  )
  if (pendingBills.length === 0) {
    toast.info('本月沒有待收帳單')
    return
  }
  // 取得有 LINE 的租客 lineUserId
  const tenantsSnap = await getDocs(query(collection(db, 'users'), where('boundLandlordCode', '==', authStore.userProfile?.landlordCode || '')))
  const lineUsers = tenantsSnap.docs
    .map(d => d.data())
    .filter((u: any) => u.lineUserId)
  if (lineUsers.length === 0) {
    toast.warning('目前沒有租客綁定 LINE，請請租客先在系統中取得綁定碼')
    return
  }
  sendingLine.value = true
  try {
    const fn = httpsCallable(getFunctions(undefined, 'asia-east1'), 'sendLineBillNotifications')
    const result: any = await fn({ month: currentMonth.value, landlordId: uid })
    toast.success(`已發送 LINE 通知給 ${result.data?.sent ?? 0} 位租客`)
  } catch (e: any) {
    toast.error(e.message || 'LINE 通知發送失敗')
  } finally {
    sendingLine.value = false
  }
}

// --- CRUD ---
const saveTransaction = async () => {
  if (!authStore.user) return
  if (!form.value.amount && form.value.amount !== 0) { toast.warning('請填寫金額'); return }
  if (!form.value.target || !form.value.date) { toast.warning('請填寫完整資訊'); return }
  try {
    const payload = { ...form.value, landlordId: authStore.effectiveUid, updatedAt: serverTimestamp() }
    if (isEditing.value && editingId.value) {
      const old = transactions.value.find(t => t.id === editingId.value)
      const rec: any = { modifiedAt: new Date().toISOString(), data: { ...old } }
      delete rec.data.history; delete rec.data.id
      await updateDoc(doc(db, 'bills', editingId.value), { ...payload, history: [rec, ...(old?.history || [])] })
    } else {
      await addDoc(collection(db, 'bills'), { ...payload, history: [], createdAt: serverTimestamp() })
    }
    showModal.value = false
    toast.success(isEditing.value ? '紀錄已更新' : '紀錄已新增')
  } catch { toast.error('儲存失敗，請稍後再試') }
}

const handleDelete = (id: string) => {
  closeDropdown()
  deletingId.value = id
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!deletingId.value) return
  showDeleteConfirm.value = false
  try { await deleteDoc(doc(db, 'bills', deletingId.value)); toast.success('紀錄已刪除') }
  catch { toast.error('刪除失敗') }
  finally { deletingId.value = null }
}

const saveTaipowerBill = async () => {
  if (!authStore.user) return
  if (!taipowerForm.value.amount) { toast.warning('請輸入金額'); return }
  try {
    await addDoc(collection(db, 'taipower_bills'), { ...taipowerForm.value, landlordId: authStore.effectiveUid, createdAt: serverTimestamp() })
    await addDoc(collection(db, 'bills'), {
      date: `${taipowerForm.value.month}-15`, type: 'expense', category: '台電帳單',
      target: '台灣電力公司', description: `${taipowerForm.value.month} 電費帳單`,
      amount: taipowerForm.value.amount, landlordId: authStore.effectiveUid,
      status: 'completed', history: [], createdAt: serverTimestamp(),
    })
    showTaipowerModal.value = false
    toast.success('台電帳單已登錄')
  } catch { toast.error('登錄失敗，請稍後再試') }
}

// --- UI helpers ---
const toggleMenu = (id: string) => { activeMenuId.value = activeMenuId.value === id ? null : id }
const closeDropdown = () => { activeMenuId.value = null; showMoreMenu.value = false }

const openModal = () => {
  isEditing.value = false; editingId.value = null
  form.value = { type: 'income', amount: undefined, date: `${currentMonth.value}-01`, category: '租金收入', target: '', description: '', status: 'pending' }
  showModal.value = true
}
const handleEdit = (item: Transaction) => {
  closeDropdown(); isEditing.value = true; editingId.value = item.id
  form.value = { ...item } as TransactionForm; showModal.value = true
}
const openHistory = (item: Transaction) => { closeDropdown(); selectedHistory.value = item.history || []; showHistoryModal.value = true }
const openTaipowerModal = () => { taipowerForm.value.month = currentMonth.value; showTaipowerModal.value = true }
</script>

<style scoped>
.animation-fade-in { animation: fadeIn 0.15s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
