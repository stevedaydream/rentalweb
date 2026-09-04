<template>
  <div class="max-w-3xl mx-auto space-y-6">

    <div>
      <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">我的資料</h1>
      <p class="text-text-secondary-light">維護聯絡方式、房東綁定與登入密碼</p>
    </div>

    <!-- ── 租約資訊（房東維護，唯讀） ── -->
    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
      <h2 class="text-base font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-gold-500" aria-hidden="true">badge</span>
        租約資訊
      </h2>

      <div v-if="loading" class="text-sm text-text-secondary-light py-2">載入中…</div>

      <template v-else>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div v-for="row in leaseRows" :key="row.label" class="bg-surface-light dark:bg-surface-dark rounded-xl p-4">
            <dt class="text-text-secondary-light text-xs mb-1">{{ row.label }}</dt>
            <dd class="font-semibold text-text-primary-light dark:text-text-primary-dark break-all">{{ row.value }}</dd>
          </div>
        </dl>
        <p class="text-xs text-text-secondary-light flex items-start gap-1.5">
          <span class="material-symbols-outlined text-[15px] shrink-0" aria-hidden="true">info</span>
          <span>
            這些是房東維護的租約內容，無法自行修改。有誤請透過
            <RouterLink :to="{ name: 'ContactLandlord' }" class="text-gold-600 dark:text-gold-400 font-medium underline underline-offset-2">聯繫房東</RouterLink>
            告知更正。
          </span>
        </p>
      </template>
    </div>

    <!-- ── 個人資料（可自行修改） ── -->
    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
      <h2 class="text-base font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-gold-500" aria-hidden="true">contact_page</span>
        個人資料
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="profile-name" class="block text-sm font-medium text-text-secondary-light mb-1">顯示名稱</label>
          <input id="profile-name" v-model.trim="formName" type="text" class="form-input"
            placeholder="請輸入您的姓名" autocomplete="name" :disabled="loading || saving">
        </div>
        <div>
          <label for="profile-phone" class="block text-sm font-medium text-text-secondary-light mb-1">聯絡電話</label>
          <input id="profile-phone" v-model.trim="formPhone" type="tel" class="form-input"
            placeholder="09xx-xxx-xxx" autocomplete="tel" :disabled="loading || saving">
        </div>
      </div>

      <!-- 自行註冊、房東尚未建檔的租客沒有 tenants 文件，這兩欄沒有地方可存 -->
      <div v-if="!loading && !tenant"
        class="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200">
        <span class="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">pending</span>
        <p>房東尚未替您建立租客檔案，聯絡 Email 與緊急聯絡人暫時無處可存。上方的顯示名稱與電話仍可儲存。</p>
      </div>

      <template v-else>
        <div>
          <label for="profile-email" class="block text-sm font-medium text-text-secondary-light mb-1">聯絡 Email</label>
          <input id="profile-email" v-model.trim="formEmail" type="email" class="form-input"
            placeholder="me@example.com" autocomplete="email" :disabled="loading || saving">
          <p class="text-xs text-text-secondary-light mt-1">房東寄送帳單與通知用；與您的登入帳號無關。</p>
        </div>
        <div>
          <label for="profile-emergency" class="block text-sm font-medium text-text-secondary-light mb-1">緊急聯絡人</label>
          <input id="profile-emergency" v-model.trim="formEmergency" type="text" class="form-input"
            placeholder="姓名 - 關係 - 電話" autocomplete="off" :disabled="loading || saving">
        </div>
      </template>

      <button
        type="button" @click="saveProfile" :disabled="!isDirty || saving || loading"
        class="w-full py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >{{ saving ? '儲存中…' : '儲存個人資料' }}</button>
    </div>

    <!-- ── 所屬房東 ── -->
    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
      <h2 class="text-base font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-gold-500" aria-hidden="true">real_estate_agent</span>
        所屬房東
      </h2>

      <div class="flex items-center justify-between gap-3 p-4 bg-surface-light dark:bg-surface-dark rounded-xl">
        <div class="flex items-center gap-2 min-w-0">
          <span class="material-symbols-outlined text-gray-400" aria-hidden="true">person</span>
          <span class="truncate" :class="landlordName
            ? 'font-medium text-text-primary-light dark:text-text-primary-dark'
            : 'text-text-secondary-light'">{{ landlordName || '尚未綁定房東' }}</span>
        </div>
        <button
          v-if="landlordName" type="button" @click="unbindLandlord" :disabled="binding"
          class="shrink-0 text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
        >解除綁定</button>
      </div>

      <div v-if="!landlordName" class="space-y-2">
        <label for="profile-landlord-code" class="block text-sm font-medium text-text-secondary-light">房東邀請碼</label>
        <div class="flex gap-2">
          <input id="profile-landlord-code" v-model.trim="landlordCode" type="text"
            class="form-input font-mono uppercase" placeholder="向房東索取" autocomplete="off"
            spellcheck="false" :disabled="binding"
            @input="landlordCode = landlordCode.toUpperCase()" @keyup.enter="bindLandlord">
          <button
            type="button" @click="bindLandlord" :disabled="!landlordCode || binding"
            class="shrink-0 px-4 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors disabled:opacity-50"
          >{{ binding ? '綁定中…' : '綁定' }}</button>
        </div>
      </div>
    </div>

    <!-- ── 登入密碼 ── -->
    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
      <h2 class="text-base font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-gold-500" aria-hidden="true">lock</span>
        登入密碼
      </h2>

      <!-- 只用 Google 登入的帳號沒有密碼可換 -->
      <p v-if="!hasPasswordLogin" class="text-sm text-text-secondary-light">
        您以 Google 帳號登入，沒有需要維護的密碼。
      </p>

      <template v-else>
        <div>
          <label for="profile-pw-current" class="block text-sm font-medium text-text-secondary-light mb-1">目前密碼</label>
          <input id="profile-pw-current" v-model="pwCurrent" type="password" class="form-input"
            autocomplete="current-password" :disabled="savingPw">
          <p class="text-xs text-text-secondary-light mt-1">若從未改過，預設為您的證件號碼。</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="profile-pw-new" class="block text-sm font-medium text-text-secondary-light mb-1">新密碼</label>
            <input id="profile-pw-new" v-model="pwNew" type="password" class="form-input"
              placeholder="至少 6 碼" autocomplete="new-password" :disabled="savingPw">
          </div>
          <div>
            <label for="profile-pw-confirm" class="block text-sm font-medium text-text-secondary-light mb-1">確認新密碼</label>
            <input id="profile-pw-confirm" v-model="pwConfirm" type="password" class="form-input"
              autocomplete="new-password" :disabled="savingPw">
          </div>
        </div>
        <p v-if="pwError" class="text-sm text-red-500" role="alert">{{ pwError }}</p>
        <button
          type="button" @click="savePassword" :disabled="savingPw"
          class="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-text-primary-light dark:text-text-primary-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >{{ savingPw ? '變更中…' : '變更密碼' }}</button>
      </template>
    </div>

    <!-- ── 通知綁定（既有功能在「聯繫房東」頁，不重複實作） ── -->
    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-3">
      <h2 class="text-base font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-gold-500" aria-hidden="true">notifications_active</span>
        通知與登入綁定
      </h2>
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="text-text-secondary-light">LINE 通知</span>
        <span :class="lineBound
          ? 'text-green-600 dark:text-green-400 font-semibold'
          : 'text-text-secondary-light'">{{ lineBound ? '已綁定' : '未綁定' }}</span>
        <span class="text-gray-300 dark:text-gray-700">·</span>
        <span class="text-text-secondary-light">Google 登入</span>
        <span :class="authStore.hasGoogleLinked
          ? 'text-green-600 dark:text-green-400 font-semibold'
          : 'text-text-secondary-light'">{{ authStore.hasGoogleLinked ? '已綁定' : '未綁定' }}</span>
      </div>
      <RouterLink
        :to="{ name: 'ContactLandlord' }"
        class="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-primary-light dark:text-text-primary-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
      >
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">tune</span>
        前往設定綁定
      </RouterLink>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '../../firebase/config'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { getTenantByUid, updateTenantContact } from '../../services/tenantService'
import type { Tenant } from '../../types/index'

const authStore = useAuthStore()
const toast = useToastStore()

const loading = ref(true)
const tenant = ref<Tenant | null>(null)

// ── 租約資訊（唯讀） ──
/** 證件號碼是身分驗證用的，畫面上只留頭尾供本人辨識 */
const maskId = (id: string) =>
  id.length <= 4 ? id : `${id.slice(0, 3)}${'*'.repeat(id.length - 5)}${id.slice(-2)}`

const leaseRows = computed(() => {
  const t = tenant.value
  return [
    { label: '租約姓名', value: t?.name || '—' },
    { label: '證件號碼', value: t?.idNumber ? maskId(t.idNumber) : '—' },
    { label: '房號', value: t?.room || t?.roomName || '—' },
    { label: '登入帳號', value: authStore.user?.email || '—' },
    { label: '起租日', value: t?.leaseStart || '—' },
    { label: '到期日', value: t?.leaseEnd || '—' },
  ]
})

// ── 個人資料 ──
// 顯示名稱與電話存在 users（自行註冊的租客，房東是以 users 反查名下租客的），
// 聯絡 Email 與緊急聯絡人存在 tenants（房東列表與抽屜讀的是這裡）。
// 兩份文件由同一顆按鈕儲存，只送有變動的那一份。
const formName = ref('')
const formPhone = ref('')
const formEmail = ref('')
const formEmergency = ref('')
const saving = ref(false)

const userDirty = computed(() =>
  formName.value !== (authStore.userProfile?.name || '') ||
  formPhone.value !== (authStore.userProfile?.phone || '')
)
const tenantDirty = computed(() =>
  !!tenant.value &&
  (formEmail.value !== (tenant.value.email || '') ||
   formEmergency.value !== (tenant.value.emergencyContact || ''))
)
const isDirty = computed(() => userDirty.value || tenantDirty.value)

const saveProfile = async () => {
  if (!isDirty.value || !authStore.user) return
  if (!formName.value) { toast.warning('請填寫顯示名稱'); return }
  if (formEmail.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.value)) {
    toast.warning('Email 格式不正確')
    return
  }

  saving.value = true
  try {
    if (userDirty.value) {
      await updateDoc(doc(db, 'users', authStore.user.uid), {
        name: formName.value,
        phone: formPhone.value,
      })
      if (authStore.userProfile) {
        authStore.userProfile.name = formName.value
        authStore.userProfile.phone = formPhone.value
      }
    }
    if (tenantDirty.value && tenant.value) {
      await updateTenantContact(tenant.value.id, {
        email: formEmail.value,
        emergencyContact: formEmergency.value,
      })
      // 本地同步，dirty 才會歸零；此頁不掛 onSnapshot（這些欄位只有自己會改）
      tenant.value = {
        ...tenant.value,
        email: formEmail.value,
        emergencyContact: formEmergency.value,
      }
    }
    toast.success('個人資料已更新')
  } catch (e: any) {
    toast.error(e?.code === 'permission-denied'
      ? '沒有權限修改，請聯繫房東'
      : '儲存失敗，請稍後再試')
  } finally {
    saving.value = false
  }
}

// ── 所屬房東 ──
const landlordName = ref('')
const landlordCode = ref('')
const binding = ref(false)

const loadLandlordName = async () => {
  const id = authStore.userProfile?.landlordId
  if (!id) { landlordName.value = ''; return }
  try {
    const snap = await getDoc(doc(db, 'users', id))
    landlordName.value = snap.exists() ? (snap.data().name || '房東') : ''
  } catch {
    landlordName.value = ''
  }
}

// 邀請碼的查驗與 landlordId 的寫入都在伺服端：規則已鎖住租客自改 landlordId，
// 否則前端比對邀請碼形同虛設，改一行就能把自己掛到任意房東名下。
const bindLandlord = async () => {
  if (!landlordCode.value || !authStore.user) return
  binding.value = true
  try {
    const fn = httpsCallable(functions, 'bindLandlordByCode')
    const res: any = await fn({ code: landlordCode.value })
    if (authStore.userProfile) authStore.userProfile.landlordId = res.data?.landlordId
    landlordName.value = res.data?.landlordName || '房東'
    landlordCode.value = ''
    toast.success(`已綁定房東：${landlordName.value}`)
  } catch (e: any) {
    toast.error(String(e?.code || '').includes('not-found')
      ? '找不到此邀請碼對應的房東，請確認後再試'
      : (e?.message || '綁定失敗，請稍後再試'))
  } finally {
    binding.value = false
  }
}

const unbindLandlord = async () => {
  if (!authStore.user) return
  binding.value = true
  try {
    await httpsCallable(functions, 'unbindLandlord')({})
    if (authStore.userProfile) authStore.userProfile.landlordId = ''
    landlordName.value = ''
    toast.success('已解除房東綁定')
  } catch (e: any) {
    toast.error(e?.message || '操作失敗，請稍後再試')
  } finally {
    binding.value = false
  }
}

// ── 密碼 ──
const pwCurrent = ref('')
const pwNew = ref('')
const pwConfirm = ref('')
const pwError = ref('')
const savingPw = ref(false)

const hasPasswordLogin = computed(() =>
  authStore.user?.providerData.some(p => p.providerId === 'password') ?? false
)

/**
 * 先以目前密碼重新驗證再改。
 *
 * 直接呼叫 updatePassword 只在「剛登入」時有效，租客多半是開著 PWA 好幾天才想到要改，
 * 會撞上 auth/requires-recent-login；那時再回頭要密碼，使用者已經填完一輪表單了。
 */
const savePassword = async () => {
  pwError.value = ''
  const user = auth.currentUser
  if (!user?.email) { pwError.value = '登入狀態已失效，請重新登入'; return }
  if (!pwCurrent.value) { pwError.value = '請輸入目前密碼'; return }
  if (pwNew.value.length < 6) { pwError.value = '新密碼至少需要 6 個字元'; return }
  if (pwNew.value !== pwConfirm.value) { pwError.value = '兩次輸入的新密碼不一致'; return }

  savingPw.value = true
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, pwCurrent.value))
    await updatePassword(user, pwNew.value)
    pwCurrent.value = ''
    pwNew.value = ''
    pwConfirm.value = ''
    toast.success('密碼已變更')
  } catch (e: any) {
    const code = String(e?.code || '')
    if (code.includes('wrong-password') || code.includes('invalid-credential')) {
      pwError.value = '目前密碼不正確'
    } else if (code.includes('too-many-requests')) {
      pwError.value = '嘗試次數過多，請稍後再試'
    } else if (code.includes('weak-password')) {
      pwError.value = '密碼強度不足，請換一組'
    } else {
      pwError.value = '變更失敗，請稍後再試'
    }
  } finally {
    savingPw.value = false
  }
}

// ── LINE 綁定狀態（唯讀顯示；綁定操作在「聯繫房東」頁） ──
const lineBound = ref(false)
let unsubUser: (() => void) | null = null

onMounted(async () => {
  const uid = authStore.user?.uid
  if (!uid) { loading.value = false; return }

  // 綁定是 LINE webhook 寫進 users 的，用監聽才會即時反映
  unsubUser = onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) lineBound.value = !!snap.data().lineUserId
  })

  formName.value = authStore.userProfile?.name || ''
  formPhone.value = authStore.userProfile?.phone || ''

  try {
    const t = await getTenantByUid(uid)
    tenant.value = t
    formEmail.value = t?.email || ''
    formEmergency.value = t?.emergencyContact || ''
    await loadLandlordName()
  } catch {
    toast.error('載入個人資料失敗，請稍後再試')
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  unsubUser?.()
})
</script>
