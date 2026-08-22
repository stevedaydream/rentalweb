<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-surface-light dark:bg-surface-dark">
    <div class="w-full max-w-sm bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-ink-100 dark:border-ink-800 p-6 space-y-5">

      <div v-if="phase === 'checking'" class="py-10 text-center text-text-secondary-light">
        <span class="material-symbols-outlined text-3xl animate-spin motion-reduce:animate-none text-ink-300" aria-hidden="true">progress_activity</span>
        <p class="mt-2 text-sm">確認連結中…</p>
      </div>

      <!-- 連結無效 / 過期 / 已使用 -->
      <div v-else-if="phase === 'invalid'" class="py-6 text-center space-y-3">
        <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-red-600" aria-hidden="true">link_off</span>
        </div>
        <h1 class="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">{{ errorTitle }}</h1>
        <p class="text-sm text-text-secondary-light">{{ errorDetail }}</p>
        <RouterLink :to="{ name: 'Identity' }" class="inline-block text-sm text-gold-600 hover:underline">
          前往登入頁
        </RouterLink>
      </div>

      <!-- 身分確認 -->
      <form v-else-if="phase === 'verify'" class="space-y-5" @submit.prevent="submit">
        <div class="text-center space-y-1">
          <div class="w-12 h-12 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center mx-auto">
            <span class="material-symbols-outlined text-gold-600" aria-hidden="true">key</span>
          </div>
          <h1 class="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">
            {{ tenantName ? `嗨 ${tenantName}，` : '' }}啟用您的帳號
          </h1>
          <p class="text-sm text-text-secondary-light">請輸入證件號碼確認身分</p>
        </div>

        <div>
          <label for="activate-id" class="block text-sm font-medium text-text-secondary-light mb-1">證件號碼</label>
          <input
            id="activate-id" v-model="idNumber" type="text" autocomplete="off"
            class="form-input tracking-wider" placeholder="身分證 / 居留證號碼"
            :disabled="submitting"
          >
          <p v-if="errorDetail" class="text-xs text-red-600 mt-1.5">{{ errorDetail }}</p>
        </div>

        <button
          type="submit" :disabled="submitting || !idNumber.trim()"
          class="w-full py-2.5 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 disabled:opacity-50 transition-colors"
        >
          {{ submitting ? '確認中…' : '確認並登入' }}
        </button>

        <p class="text-xs text-text-secondary-light text-center">
          此連結僅能使用一次。日後登入請用「手機號碼 + 證件號碼」。
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase/config'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const phase = ref<'checking' | 'verify' | 'invalid'>('checking')
const tenantName = ref('')
const idNumber = ref('')
const submitting = ref(false)
const errorTitle = ref('連結無效')
const errorDetail = ref('')

const code = String(route.params.code || '')

/** Cloud Function 的錯誤碼轉成使用者看得懂的話 */
const describe = (e: any): { title: string; detail: string } => {
  const c = String(e?.code || '').replace('functions/', '')
  switch (c) {
    case 'not-found':
      return { title: '連結無效', detail: '這個連結不存在，請向房東索取新的啟用連結。' }
    case 'failed-precondition':
      return { title: '連結已使用', detail: '此連結已經啟用過了。請直接用「手機號碼 + 證件號碼」登入。' }
    case 'deadline-exceeded':
      return { title: '連結已過期', detail: '啟用連結有效期為 7 天，請向房東索取新的連結。' }
    case 'permission-denied':
      return { title: '證件號碼不符', detail: '證件號碼與房東登記的不符，請確認後再試。' }
    default:
      return { title: '啟用失敗', detail: e?.message || '請稍後再試，或聯繫房東。' }
  }
}

onMounted(async () => {
  if (!code) { phase.value = 'invalid'; return }
  try {
    // 先只帶 code 探詢，取回姓名讓畫面能稱呼對方，同時提早擋掉無效連結
    const fn = httpsCallable(functions, 'activateTenant')
    const res: any = await fn({ code })
    tenantName.value = res.data?.name || ''
    phase.value = 'verify'
  } catch (e: any) {
    const d = describe(e)
    errorTitle.value = d.title
    errorDetail.value = d.detail
    phase.value = 'invalid'
  }
})

const submit = async () => {
  if (!idNumber.value.trim()) return
  submitting.value = true
  errorDetail.value = ''
  try {
    const fn = httpsCallable(functions, 'activateTenant')
    const res: any = await fn({ code, idNumber: idNumber.value.trim() })
    const token = res.data?.token
    if (!token) throw new Error('未取得登入憑證')

    await authStore.loginWithCustomToken(token)
    router.replace({ name: 'TenantWelcome' })
  } catch (e: any) {
    const d = describe(e)
    // 證件號碼打錯時留在原畫面讓他重試；其餘視為連結本身失效
    if (String(e?.code || '').includes('permission-denied')) {
      errorDetail.value = d.detail
    } else {
      errorTitle.value = d.title
      errorDetail.value = d.detail
      phase.value = 'invalid'
    }
  } finally {
    submitting.value = false
  }
}
</script>
