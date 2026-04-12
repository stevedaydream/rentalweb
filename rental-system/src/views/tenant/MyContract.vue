<template>
  <div class="max-w-3xl mx-auto space-y-6">

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">我的合約</h1>
      <p class="text-sm text-text-secondary-light mt-0.5">查閱租賃合約並完成電子確認</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <span class="material-symbols-outlined animate-spin text-4xl text-ink-200">progress_activity</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="!contracts.length"
      class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
      <span class="material-symbols-outlined text-5xl text-ink-200">history_edu</span>
      <p class="mt-3 text-text-secondary-light">目前尚無合約記錄</p>
      <p class="text-sm text-text-secondary-light mt-1">如有疑問，請透過「聯繫房東」詢問</p>
    </div>

    <!-- Contract cards -->
    <div v-else class="space-y-5">
      <div v-for="c in contracts" :key="c.id"
        class="bg-white dark:bg-card-dark rounded-2xl shadow-sm overflow-hidden"
        :class="!c.tenantAcknowledgedAt
          ? 'border-2 border-amber-400 dark:border-amber-600'
          : 'border border-gray-100 dark:border-gray-800'">

        <!-- Pending banner -->
        <div v-if="!c.tenantAcknowledgedAt"
          class="px-5 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 flex items-center gap-2">
          <span class="material-symbols-outlined text-amber-500 text-[18px]">pending_actions</span>
          <span class="text-sm font-semibold text-amber-800 dark:text-amber-300">需要您確認合約內容</span>
        </div>

        <div class="p-5 space-y-4">
          <!-- Title row -->
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">
                  {{ c.roomNo || '—' }} 租賃合約
                </h3>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="c.contractSource === 'paper'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'">
                  {{ c.contractSource === 'paper' ? '紙本掃描' : '電子合約' }}
                </span>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="isActive(c.endDate)
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'">
                  {{ isActive(c.endDate) ? '生效中' : '已到期' }}
                </span>
              </div>
              <p class="text-sm text-text-secondary-light mt-0.5">{{ c.address }}</p>
            </div>
          </div>

          <!-- Info grid -->
          <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-surface-light dark:bg-surface-dark rounded-xl p-3">
            <div class="flex justify-between gap-2">
              <span class="text-text-secondary-light shrink-0">租期起</span>
              <span class="font-medium">{{ c.startDate || '—' }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-text-secondary-light shrink-0">租期迄</span>
              <span class="font-medium">{{ c.endDate || '—' }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-text-secondary-light shrink-0">月租金</span>
              <span class="font-medium">NT${{ Number(c.rentfee || 0).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-text-secondary-light shrink-0">押金</span>
              <span class="font-medium">NT${{ Number(c.deposit || 0).toLocaleString() }}</span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Paper: view scan -->
            <a v-if="c.contractSource === 'paper' && c.attachmentUrl"
              :href="c.attachmentUrl" target="_blank" rel="noopener"
              class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
              <span class="material-symbols-outlined text-[18px]">open_in_new</span>
              查看掃描檔
            </a>
            <!-- Digital: preview -->
            <button v-else-if="c.contractSource !== 'paper'"
              @click="previewContract = c"
              class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
              <span class="material-symbols-outlined text-[18px]">visibility</span>
              查閱合約
            </button>

            <!-- Confirmed status -->
            <div v-if="c.tenantAcknowledgedAt"
              class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <span class="material-symbols-outlined text-[18px]">verified</span>
              已確認（{{ formatDate(c.tenantAcknowledgedAt) }}）
            </div>
          </div>

          <!-- Confirmation section -->
          <div v-if="!c.tenantAcknowledgedAt"
            class="pt-4 border-t border-amber-100 dark:border-amber-900/40 space-y-3">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              請先查閱上方合約內容，確認無誤後勾選並完成確認。此記錄將作為您已收到並同意合約的電子憑據。
            </p>
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" v-model="acknowledgeChecked[c.id]"
                class="mt-0.5 w-4 h-4 text-gold-500 rounded focus:ring-gold-500 cursor-pointer shrink-0" />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-200 select-none">
                我已詳閱此租賃合約，確認內容無誤，並同意遵守各項條款。
              </span>
            </label>
            <button
              :disabled="!acknowledgeChecked[c.id] || acknowledging === c.id"
              @click="confirmAcknowledge(c)"
              class="flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-white rounded-xl font-bold shadow-lg shadow-gold-500/30 hover:bg-gold-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <span v-if="acknowledging === c.id" class="material-symbols-outlined animate-spin text-[18px]">sync</span>
              <span v-else class="material-symbols-outlined text-[18px]">task_alt</span>
              {{ acknowledging === c.id ? '確認中...' : '確認已收到此合約' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Digital contract preview modal -->
  <Teleport to="body">
    <div v-if="previewContract"
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      @click.self="previewContract = null">
      <div class="w-full max-w-3xl bg-white dark:bg-card-dark rounded-2xl shadow-2xl my-8">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">合約查閱</h2>
          <button @click="previewContract = null"
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span class="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[75vh]">
          <Preview :form="previewContract" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import Preview from '../../components/Preview.vue'

const authStore = useAuthStore()
const toast = useToastStore()

const contracts = ref([])
const loading = ref(true)
const previewContract = ref(null)
const acknowledgeChecked = ref({})
const acknowledging = ref(null)

const isActive = (endDate) => !!endDate && new Date(endDate) >= new Date()

const formatDate = (val) => {
  if (!val) return '—'
  const d = val?.toDate ? val.toDate() : new Date(val)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

const loadContracts = async () => {
  loading.value = true
  try {
    const uid = authStore.user?.uid
    if (!uid) return
    const snap = await getDocs(
      query(collection(db, 'signed_contracts'),
        where('tenantUid', '==', uid),
        orderBy('signedAt', 'desc'))
    )
    contracts.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    contracts.value.forEach(c => { acknowledgeChecked.value[c.id] = false })
  } catch (e) {
    console.error('載入合約失敗:', e)
    toast.error('載入失敗，請重新整理')
  } finally {
    loading.value = false
  }
}

const confirmAcknowledge = async (contract) => {
  acknowledging.value = contract.id
  try {
    await updateDoc(doc(db, 'signed_contracts', contract.id), {
      tenantAcknowledgedAt: serverTimestamp(),
      tenantAcknowledgedUid: authStore.user?.uid,
    })
    const idx = contracts.value.findIndex(c => c.id === contract.id)
    if (idx !== -1) contracts.value[idx] = { ...contracts.value[idx], tenantAcknowledgedAt: new Date() }
    toast.success('已完成合約確認！')
  } catch (e) {
    console.error('合約確認失敗:', e)
    toast.error('確認失敗，請稍後再試')
  } finally {
    acknowledging.value = null
  }
}

onMounted(loadContracts)
</script>
