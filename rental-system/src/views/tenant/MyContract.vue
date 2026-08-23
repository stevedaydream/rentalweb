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
        :class="!c.tenantAcknowledgedAt && c._linked
          ? 'border-2 border-amber-400 dark:border-amber-600'
          : 'border border-gray-100 dark:border-gray-800'">

        <!-- Pending banner -->
        <div v-if="!c.tenantAcknowledgedAt && c._linked"
          class="px-5 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 flex items-center gap-2">
          <span class="material-symbols-outlined text-amber-500 text-[18px]">pending_actions</span>
          <span class="text-sm font-semibold text-amber-800 dark:text-amber-300">需要您確認合約內容</span>
        </div>

        <!-- 房東尚未把這份合約連結到您的帳號：可查閱，但線上確認要等連結完成 -->
        <div v-else-if="!c._linked"
          class="px-5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <span class="material-symbols-outlined text-gray-400 text-[18px]">visibility</span>
          <span class="text-sm font-medium text-gray-600 dark:text-gray-300">僅供查閱（房東尚未完成帳號連結）</span>
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

          <!-- 未連結：說明為何還不能確認 -->
          <p v-if="!c._linked" class="text-sm text-text-secondary-light pt-4 border-t border-gray-100 dark:border-gray-800">
            這份合約尚未與您的帳號連結，暫時無法在線上完成確認。請透過「聯繫房東」告知，房東於合約頁按一次「連結」即可。
          </p>

          <!-- Confirmation section -->
          <div v-else-if="!c.tenantAcknowledgedAt"
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
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore'
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
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

const signedAtMs = (c) => c?.signedAt?.seconds ? c.signedAt.seconds * 1000 : 0

/** 依 tenantUid 查詢；缺複合索引時 Firestore 回 failed-precondition，退回不排序版本自己排 */
const fetchLinked = async (uid) => {
  const base = [collection(db, 'signed_contracts'), where('tenantUid', '==', uid)]
  try {
    const snap = await getDocs(query(...base, orderBy('signedAt', 'desc')))
    return snap.docs
  } catch (e) {
    console.warn('合約排序查詢失敗（多半是索引未建立），改用不排序查詢:', e)
    const snap = await getDocs(query(...base))
    return snap.docs
  }
}

/**
 * 房東尚未完成「租客連結」的合約。
 * 這類合約沒有 tenantUid，依 UID 查一定查不到，但房東端明明看得到——
 * 以本人的證件號碼／姓名房號比對撈回來，至少先讓租客讀得到內容。
 * 規則不允許租客寫 tenantUid，故只能唯讀，確認仍須房東先連結。
 */
const fetchUnlinked = async (uid, landlordId) => {
  if (!landlordId) return []
  const meSnap = await getDocs(
    query(collection(db, 'tenants'), where('uid', '==', uid), limit(1)))
  const me = meSnap.docs[0]?.data() || {}
  const myId = (me.idNumber || '').trim()
  const myName = (me.name || authStore.userProfile?.name || '').trim()
  const myRoom = (me.room || me.roomNumber || '').trim()
  if (!myId && !myName) return []

  const snap = await getDocs(
    query(collection(db, 'signed_contracts'), where('landlordUid', '==', landlordId)))
  return snap.docs.filter(d => {
    const c = d.data()
    if (c.tenantUid) return false
    if (myId && (c.tenantId || '').trim()) return (c.tenantId || '').trim() === myId
    if (!myName || (c.tenant || '').trim() !== myName) return false
    // 只靠姓名容易撞名，房號有值就一併比對
    return !myRoom || !c.roomNo || String(c.roomNo).trim() === myRoom
  })
}

const loadContracts = async () => {
  loading.value = true
  try {
    const uid = authStore.user?.uid
    if (!uid) return
    const landlordId = authStore.userProfile?.landlordId

    const linked = (await fetchLinked(uid)).map(d => ({ id: d.id, ...d.data(), _linked: true }))

    let unlinked = []
    try {
      unlinked = (await fetchUnlinked(uid, landlordId))
        .map(d => ({ id: d.id, ...d.data(), _linked: false }))
    } catch (e) {
      console.warn('比對未連結合約失敗（不影響已連結的合約）:', e)
    }

    contracts.value = [...linked, ...unlinked].sort((a, b) => signedAtMs(b) - signedAtMs(a))
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
