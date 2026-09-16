<template>
  <div class="min-h-screen bg-surface-light dark:bg-surface-dark px-4 py-8">
    <div class="mx-auto" :class="phase === 'review' ? 'max-w-3xl' : 'max-w-sm'">

      <div v-if="phase === 'checking'" class="py-16 text-center text-text-secondary-light">
        <span class="material-symbols-outlined text-3xl animate-spin motion-reduce:animate-none text-ink-300" aria-hidden="true">progress_activity</span>
        <p class="mt-2 text-sm">確認連結中…</p>
      </div>

      <!-- 連結無效 / 過期 / 已使用 -->
      <div v-else-if="phase === 'invalid'" class="bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-ink-100 dark:border-ink-800 p-6 text-center space-y-3">
        <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-red-600" aria-hidden="true">link_off</span>
        </div>
        <h1 class="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">{{ errorTitle }}</h1>
        <p class="text-sm text-text-secondary-light">{{ errorDetail }}</p>
      </div>

      <!-- 身分確認 -->
      <form v-else-if="phase === 'verify'" class="bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-ink-100 dark:border-ink-800 p-6 space-y-5" @submit.prevent="verify">
        <div class="text-center space-y-1">
          <div class="w-12 h-12 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center mx-auto">
            <span class="material-symbols-outlined text-gold-600" aria-hidden="true">history_edu</span>
          </div>
          <h1 class="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">
            {{ tenantName ? `嗨 ${tenantName}，` : '' }}請簽署租賃合約
          </h1>
          <p class="text-sm text-text-secondary-light">請先輸入證件號碼確認身分</p>
        </div>

        <div>
          <label for="sign-id" class="block text-sm font-medium text-text-secondary-light mb-1">證件號碼</label>
          <input id="sign-id" v-model="idNumber" type="text" autocomplete="off"
            class="form-input tracking-wider" placeholder="身分證 / 居留證號碼" :disabled="submitting">
          <p v-if="errorDetail" role="alert" class="text-xs text-red-600 mt-1.5">{{ errorDetail }}</p>
        </div>

        <button type="submit" :disabled="submitting || !idNumber.trim()"
          class="w-full py-2.5 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 disabled:opacity-50 transition-colors">
          {{ submitting ? '確認中…' : '查看合約' }}
        </button>
      </form>

      <!-- 審閱並簽名 -->
      <div v-else-if="phase === 'review'" class="space-y-4">
        <div>
          <h1 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">租賃合約</h1>
          <p class="text-sm text-text-secondary-light">請詳閱合約內容，確認無誤後在下方簽名。送出後由房東核對並簽名，合約才正式生效。</p>
        </div>

        <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm p-4 max-h-[60vh] overflow-y-auto">
          <Preview :form="contract" />
        </div>

        <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm p-4 space-y-4">
          <div class="flex items-end justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs text-text-secondary-light mb-1">承租人簽名</p>
              <img v-if="contract.signature" :src="contract.signature" alt="您的簽名" class="h-16 max-w-full object-contain bg-white rounded" />
              <p v-else class="text-sm text-text-secondary-light">尚未簽名</p>
            </div>
            <button type="button" @click="showSignModal = true"
              class="shrink-0 px-4 py-2 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors">
              {{ contract.signature ? '重簽' : '簽名' }}
            </button>
          </div>

          <label class="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer">
            <input type="checkbox" v-model="agreed" class="mt-0.5 w-5 h-5 text-gold-500 rounded" />
            <span class="text-sm text-gray-700 dark:text-gray-200">我已詳閱並同意上述合約條款，確認資料無誤。</span>
          </label>

          <p v-if="errorDetail" role="alert" class="text-sm text-red-600">{{ errorDetail }}</p>

          <button type="button" :disabled="!contract.signature || !agreed || submitting" @click="submit"
            class="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {{ submitting ? '送出中…' : '確認並送出簽名' }}
          </button>
        </div>
      </div>

      <!-- 完成 -->
      <div v-else-if="phase === 'done'" class="bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-ink-100 dark:border-ink-800 p-6 text-center space-y-3">
        <div class="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-green-600" aria-hidden="true">check_circle</span>
        </div>
        <h1 class="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">簽名已送出</h1>
        <p class="text-sm text-text-secondary-light">房東核對並簽名後，合約即正式生效。有帳號的話可在「我的合約」查閱。</p>
      </div>
    </div>

    <Signature v-model:visible="showSignModal" @confirm="(img: string) => { contract.signature = img }" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase/config'
import Preview from '../components/Preview.vue'
import Signature from '../components/Signature.vue'

const route = useRoute()
const code = String(route.params.code || '')

const phase = ref<'checking' | 'verify' | 'review' | 'done' | 'invalid'>('checking')
const tenantName = ref('')
const idNumber = ref('')
const contract = ref<Record<string, any>>({})
const agreed = ref(false)
const showSignModal = ref(false)
const submitting = ref(false)
const errorTitle = ref('連結無效')
const errorDetail = ref('')

/** Cloud Function 的錯誤碼轉成使用者看得懂的話 */
const describe = (e: any): { title: string; detail: string } => {
  const c = String(e?.code || '').replace('functions/', '')
  switch (c) {
    case 'not-found':
      return { title: '連結無效', detail: '這個連結不存在或合約已被取消，請向房東索取新的簽署連結。' }
    case 'failed-precondition':
      return { title: '連結已使用', detail: '這份合約已經完成簽名，不需要再簽一次。' }
    case 'deadline-exceeded':
      return { title: '連結已過期', detail: '簽署連結有效期為 7 天，請向房東索取新的連結。' }
    case 'resource-exhausted':
      return { title: '連結已鎖定', detail: '證件號碼錯誤次數過多，請向房東索取新的簽署連結。' }
    case 'permission-denied':
      return { title: '證件號碼不符', detail: '證件號碼與合約上的不符，請確認後再試。' }
    default:
      return { title: '發生錯誤', detail: e?.message || '請稍後再試，或聯繫房東。' }
  }
}

// 證件號碼打錯留在原畫面重試；其餘視為連結本身失效
const handleError = (e: any) => {
  const d = describe(e)
  if (String(e?.code || '').includes('permission-denied')) {
    errorDetail.value = d.detail
    return
  }
  errorTitle.value = d.title
  errorDetail.value = d.detail
  phase.value = 'invalid'
}

onMounted(async () => {
  if (!code) { phase.value = 'invalid'; return }
  try {
    const res: any = await httpsCallable(functions, 'getContractForSigning')({ code })
    tenantName.value = res.data?.name || ''
    phase.value = 'verify'
  } catch (e) {
    handleError(e)
  }
})

const verify = async () => {
  if (!idNumber.value.trim()) return
  submitting.value = true
  errorDetail.value = ''
  try {
    const res: any = await httpsCallable(functions, 'getContractForSigning')({ code, idNumber: idNumber.value.trim() })
    contract.value = { ...res.data.contract, signature: '', landlordSignature: '' }
    phase.value = 'review'
  } catch (e) {
    handleError(e)
  } finally {
    submitting.value = false
  }
}

const submit = async () => {
  if (!contract.value.signature || !agreed.value) return
  submitting.value = true
  errorDetail.value = ''
  try {
    await httpsCallable(functions, 'submitContractSignature')({
      code, idNumber: idNumber.value.trim(), signature: contract.value.signature,
    })
    phase.value = 'done'
  } catch (e) {
    handleError(e)
  } finally {
    submitting.value = false
  }
}
</script>
