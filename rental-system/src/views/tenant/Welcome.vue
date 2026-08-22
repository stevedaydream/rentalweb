<template>
  <div class="min-h-screen flex items-start justify-center p-4 py-10 bg-surface-light dark:bg-surface-dark">
    <div class="w-full max-w-md space-y-5">

      <div class="text-center space-y-1">
        <div class="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-green-600 text-[28px]" aria-hidden="true">celebration</span>
        </div>
        <h1 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
          歡迎{{ displayName ? `，${displayName}` : '' }}！
        </h1>
        <p class="text-sm text-text-secondary-light">帳號已啟用，還有兩個小步驟</p>
      </div>

      <!-- ① 密碼 -->
      <section class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm p-5 space-y-3">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-ink-100 dark:bg-ink-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
          <h2 class="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">設定專屬密碼</h2>
          <span v-if="passwordDone" class="ml-auto text-xs font-bold text-green-600 inline-flex items-center gap-0.5">
            <span class="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>已設定
          </span>
          <span v-else class="ml-auto text-xs text-ink-400">選填</span>
        </div>

        <template v-if="!passwordDone">
          <p class="text-xs text-text-secondary-light">
            目前密碼是您的證件號碼。設定一組只有您知道的密碼會更安全，也可以之後再說。
          </p>
          <div class="space-y-2">
            <div>
              <label for="welcome-pw" class="sr-only">新密碼</label>
              <input id="welcome-pw" v-model="password" type="password" class="form-input" placeholder="新密碼（至少 6 碼）" autocomplete="new-password">
            </div>
            <div>
              <label for="welcome-pw2" class="sr-only">再次輸入新密碼</label>
              <input id="welcome-pw2" v-model="password2" type="password" class="form-input" placeholder="再次輸入" autocomplete="new-password">
            </div>
          </div>
          <p v-if="pwError" class="text-xs text-red-600">{{ pwError }}</p>
          <button
            @click="savePassword" :disabled="savingPw"
            class="w-full py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 disabled:opacity-50 transition-colors"
          >
            {{ savingPw ? '設定中…' : '設定密碼' }}
          </button>
        </template>
      </section>

      <!-- ② LINE -->
      <section class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm p-5 space-y-3">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-ink-100 dark:bg-ink-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
          <h2 class="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">綁定 LINE 接收通知</h2>
          <span v-if="lineBound" class="ml-auto text-xs font-bold text-green-600 inline-flex items-center gap-0.5">
            <span class="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>已綁定
          </span>
        </div>

        <template v-if="lineBound">
          <p class="text-xs text-text-secondary-light">帳單與公告會直接傳到您的 LINE。</p>
        </template>
        <template v-else-if="!lineBotId">
          <p class="text-xs text-text-secondary-light">房東尚未設定 LINE 官方帳號，可略過此步驟。</p>
        </template>
        <template v-else>
          <p class="text-xs text-text-secondary-light">
            帳單、繳費提醒與公告會直接傳到 LINE。加好友後把下方綁定碼傳給官方帳號即可。
          </p>

          <div class="bg-surface-light dark:bg-surface-dark rounded-xl p-3 flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-[11px] text-text-secondary-light">綁定碼</p>
              <p class="text-2xl font-black tracking-[0.2em] font-mono text-text-primary-light dark:text-text-primary-dark">
                {{ bindingCode || '------' }}
              </p>
              <p v-if="bindingCode" class="text-[11px] text-text-secondary-light">{{ countdownLabel }}</p>
            </div>
            <button
              @click="copyCode" :disabled="!bindingCode"
              class="shrink-0 px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-700 text-xs font-medium hover:bg-white dark:hover:bg-ink-800 disabled:opacity-50 transition-colors"
            >{{ copied ? '已複製' : '複製' }}</button>
          </div>

          <a
            :href="`https://line.me/R/ti/p/${lineBotId}`" target="_blank" rel="noopener"
            class="w-full py-2.5 rounded-xl bg-[#06C755] text-white text-sm font-bold hover:brightness-95 flex items-center justify-center gap-2 transition-all"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            加房東 LINE 好友
          </a>

          <button
            v-if="!bindingCode || expired"
            @click="generateCode" :disabled="generating"
            class="w-full py-2 rounded-xl border border-ink-200 dark:border-ink-700 text-xs font-medium text-text-secondary-light hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50 transition-colors"
          >{{ generating ? '產生中…' : (expired ? '綁定碼已過期，重新產生' : '取得綁定碼') }}</button>
        </template>
      </section>

      <button
        @click="finish"
        class="w-full py-3 rounded-xl bg-ink-700 text-white font-bold hover:bg-ink-800 transition-colors"
      >
        {{ allDone ? '完成，進入我的租屋' : '略過，直接進入' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { updatePassword } from 'firebase/auth'
import { auth, db } from '../../firebase/config'
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, onSnapshot } from 'firebase/firestore'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

const displayName = computed(() => authStore.userProfile?.name || '')

// ── 密碼 ──
const password = ref('')
const password2 = ref('')
const savingPw = ref(false)
const passwordDone = ref(false)
const pwError = ref('')

const savePassword = async () => {
  pwError.value = ''
  if (password.value.length < 6) { pwError.value = '密碼至少需要 6 個字元'; return }
  if (password.value !== password2.value) { pwError.value = '兩次輸入的密碼不一致'; return }
  if (!auth.currentUser) { pwError.value = '登入狀態已失效，請重新開啟連結'; return }

  savingPw.value = true
  try {
    // 剛以 custom token 登入，屬於近期登入，不會被要求重新驗證
    await updatePassword(auth.currentUser, password.value)
    passwordDone.value = true
    toast.success('密碼已設定')
  } catch (e: any) {
    pwError.value = e?.code === 'auth/requires-recent-login'
      ? '登入時間過久，請重新開啟啟用連結後再設定'
      : '設定失敗，請稍後再試'
  } finally {
    savingPw.value = false
  }
}

// ── LINE ──
const lineBotId = ref('')
const lineBound = ref(false)
const bindingCode = ref('')
const generating = ref(false)
const copied = ref(false)
const remaining = ref(0)
const expired = computed(() => !!bindingCode.value && remaining.value <= 0)

let timer: ReturnType<typeof setInterval> | null = null
let unsubUser: (() => void) | null = null

const countdownLabel = computed(() => {
  if (expired.value) return '已過期'
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${m}:${String(s).padStart(2, '0')} 內有效`
})

const generateCode = async () => {
  if (!authStore.user) return
  generating.value = true
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    await setDoc(doc(db, 'line_bindings', code), {
      uid: authStore.user.uid,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
      createdAt: serverTimestamp(),
    })
    bindingCode.value = code
    remaining.value = 600
    if (timer) clearInterval(timer)
    timer = setInterval(() => { if (remaining.value > 0) remaining.value-- }, 1000)
  } catch {
    toast.error('產生綁定碼失敗，請稍後再試')
  } finally {
    generating.value = false
  }
}

const copyCode = async () => {
  if (!bindingCode.value) return
  try {
    await navigator.clipboard.writeText(bindingCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    toast.warning('複製失敗，請手動輸入')
  }
}

onMounted(async () => {
  const uid = authStore.user?.uid
  if (!uid) { router.replace({ name: 'Identity' }); return }

  // 綁定成功是由 LINE webhook 寫進 users 文件的，用監聽即時反映，
  // 租客不必回來重整才看得到「已綁定」
  unsubUser = onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) lineBound.value = !!snap.data().lineUserId
  })

  const landlordId = authStore.userProfile?.landlordId
  if (landlordId) {
    try {
      const s = await getDoc(doc(db, 'users', landlordId))
      if (s.exists()) lineBotId.value = s.data().lineBotId || ''
    } catch { /* 拿不到就只是不顯示加好友按鈕 */ }
  }

  if (lineBotId.value && !lineBound.value) await generateCode()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  unsubUser?.()
})

const allDone = computed(() => passwordDone.value || lineBound.value)
const finish = () => router.replace({ name: 'TenantDashboard' })
</script>
