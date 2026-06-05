<template>
  <div class="ob-root">
    <div class="ob-grain" aria-hidden="true" />

    <main class="ob-main">
      <div class="ob-card">

        <!-- Left gold accent bar -->
        <div class="ob-accent" aria-hidden="true" />

        <!-- Header -->
        <header class="ob-header">
          <span class="ob-step">最後一步</span>
          <h1 class="ob-title">
            {{ isLandlord ? '設定管理帳戶' : '讓我們認識您' }}
          </h1>
          <p class="ob-subtitle">
            {{ isLandlord
              ? '填寫以下資料後即可開始管理您的房源'
              : '填寫資料並綁定房東以完成設定' }}
          </p>
        </header>

        <form @submit.prevent="handleSubmit" class="ob-form" novalidate>

          <!-- Name + Phone row -->
          <div class="ob-row">
            <div class="ob-field" :class="{ 'ob-field--error': nameError }">
              <label class="ob-label" for="ob-name">姓名</label>
              <input
                id="ob-name"
                v-model="form.name"
                type="text"
                name="name"
                autocomplete="name"
                required
                @blur="validateName"
                class="ob-input"
                placeholder="您的真實姓名"
              >
              <div class="ob-underline" aria-hidden="true" />
              <p v-if="nameError" class="ob-errmsg" role="alert">{{ nameError }}</p>
            </div>

            <div class="ob-field" :class="{ 'ob-field--error': phoneError }">
              <label class="ob-label" for="ob-phone">手機號碼</label>
              <input
                id="ob-phone"
                v-model="form.phone"
                type="tel"
                name="tel"
                autocomplete="tel"
                required
                @blur="validatePhone"
                class="ob-input"
                placeholder="0912 345 678"
              >
              <div class="ob-underline" aria-hidden="true" />
              <p v-if="phoneError" class="ob-errmsg" role="alert">{{ phoneError }}</p>
            </div>
          </div>

          <!-- Tenant: landlord code section -->
          <div v-if="!isLandlord" class="ob-section">
            <div class="ob-section-header">
              <h2 class="ob-section-title">綁定房東</h2>
              <p class="ob-section-sub">請輸入房東提供給您的專屬代碼</p>
            </div>

            <div
              class="ob-field ob-field--code"
              :class="{
                'ob-field--error': landlordCodeError,
                'ob-field--ok': landlordFound
              }"
            >
              <label class="ob-label" for="ob-code">房東代碼</label>
              <div class="ob-code-wrap">
                <input
                  id="ob-code"
                  v-model="form.landlordCode"
                  type="text"
                  name="landlord-code"
                  autocomplete="off"
                  required
                  @input="onLandlordCodeInput"
                  @blur="validateLandlordCode"
                  class="ob-input ob-input--mono"
                  placeholder="例如：AB1C2D3E"
                  maxlength="8"
                  style="text-transform: uppercase"
                >
                <div class="ob-code-status" aria-live="polite">
                  <div v-if="landlordChecking" class="ob-spinner" aria-label="驗證中…" />
                  <svg v-else-if="landlordFound" class="ob-icon-ok" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 111.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                  <svg v-else-if="landlordCodeError" class="ob-icon-err" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div class="ob-underline" aria-hidden="true" />

              <div v-if="landlordFound" class="ob-found" role="status">
                找到房東：<strong>{{ landlordName }}</strong>
              </div>
              <p v-else-if="landlordCodeError" class="ob-errmsg" role="alert">{{ landlordCodeError }}</p>
              <p v-else class="ob-hint">代碼由房東提供，輸入後自動驗證</p>
            </div>

            <!-- Browse tip -->
            <div class="ob-tip">
              <svg class="ob-tip-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
              <span>
                還沒確定房源？可先
                <RouterLink to="/explore" class="ob-tip-link">瀏覽空置房間</RouterLink>
                ，和房東聯繫後再完成設定。
              </span>
            </div>
          </div>

          <!-- Landlord: info note -->
          <div v-if="isLandlord" class="ob-note">
            <svg class="ob-note-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            系統將自動為您產生一組唯一的房東代碼，供租客綁定使用。
          </div>

          <!-- Submit -->
          <div class="ob-submit-wrap">
            <button
              type="submit"
              :disabled="submitting || (!isLandlord && !landlordFound)"
              class="ob-submit"
            >
              <span v-if="submitting" class="ob-submit-spinner" aria-hidden="true" />
              {{ submitting ? '資料建立中…' : '完成設定，進入系統' }}
            </button>
            <p v-if="!isLandlord && !landlordFound" class="ob-submit-note">
              請先驗證房東代碼
            </p>
          </div>

        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { useRouter } from 'vue-router';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

const authStore = useAuthStore();
const router = useRouter();
const toast = useToastStore();

const isLandlord = computed(() => authStore.selectedRole === 'landlord');
const submitting = ref(false);

const nameError = ref('');
const phoneError = ref('');
const landlordCodeError = ref('');
const landlordChecking = ref(false);
const landlordFound = ref(false);
const landlordName = ref('');
const landlordUid = ref('');
let codeCheckTimer: ReturnType<typeof setTimeout> | null = null;

const validateName = () => {
  if (!form.value.name.trim()) { nameError.value = '姓名為必填'; return false; }
  if (form.value.name.trim().length < 2) { nameError.value = '姓名至少需要 2 個字元'; return false; }
  nameError.value = '';
  return true;
};

const validatePhone = () => {
  if (!form.value.phone) { phoneError.value = '手機號碼為必填'; return false; }
  if (!/^09\d{8}$/.test(form.value.phone)) { phoneError.value = '請輸入有效的手機號碼（格式：09XXXXXXXX）'; return false; }
  phoneError.value = '';
  return true;
};

const checkLandlordCode = async (code: string) => {
  if (!code || code.length < 6) {
    landlordFound.value = false;
    landlordName.value = '';
    landlordCodeError.value = '';
    return;
  }

  landlordChecking.value = true;
  landlordFound.value = false;
  landlordCodeError.value = '';

  try {
    const q = query(
      collection(db, 'users'),
      where('landlordCode', '==', code.toUpperCase()),
      where('role', '==', 'landlord')
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      landlordFound.value = true;
      landlordUid.value = snap.docs[0]!.id;
      landlordName.value = snap.docs[0]!.data().name || '（未知）';
      landlordCodeError.value = '';
    } else {
      landlordFound.value = false;
      landlordUid.value = '';
      landlordName.value = '';
      landlordCodeError.value = '找不到此房東代碼，請確認是否正確';
    }
  } catch {
    landlordCodeError.value = '驗證時發生錯誤，請稍後再試';
  } finally {
    landlordChecking.value = false;
  }
};

const onLandlordCodeInput = () => {
  landlordFound.value = false;
  landlordCodeError.value = '';
  if (codeCheckTimer) clearTimeout(codeCheckTimer);
  codeCheckTimer = setTimeout(() => {
    checkLandlordCode(form.value.landlordCode);
  }, 500);
};

const validateLandlordCode = () => {
  if (!isLandlord.value) {
    if (!form.value.landlordCode.trim()) {
      landlordCodeError.value = '請輸入房東代碼';
      return false;
    }
    if (!landlordFound.value) {
      if (!landlordChecking.value) {
        checkLandlordCode(form.value.landlordCode);
      }
      return false;
    }
  }
  return true;
};

const form = ref({
  name: '',
  phone: '',
  landlordCode: '',
});

const generateUniqueId = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

onMounted(() => {
  if (!authStore.user) {
    router.push({ name: 'Login' });
  }
});

const handleSubmit = async () => {
  if (!authStore.user) return;
  const valid = validateName() && validatePhone();
  if (!valid) return;

  if (!isLandlord.value && !landlordFound.value) {
    await checkLandlordCode(form.value.landlordCode);
    if (!landlordFound.value) return;
  }

  submitting.value = true;

  try {
    const uid = authStore.user.uid;
    const email = authStore.user.email;
    const role = authStore.selectedRole;

    const userData: any = {
      uid,
      email,
      name: form.value.name,
      phone: form.value.phone,
      role,
      createdAt: new Date(),
    };

    if (role === 'landlord') {
      userData.landlordCode = generateUniqueId(8);
    } else {
      userData.tenantId = generateUniqueId(10);
      userData.boundLandlordCode = form.value.landlordCode.toUpperCase();
      userData.landlordId = landlordUid.value;
    }

    await setDoc(doc(db, 'users', uid), userData);
    authStore.userProfile = userData;
    router.push({ name: 'Dashboard' });

  } catch (e: any) {
    console.error(e);
    toast.error('設定失敗: ' + e.message);
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
/* ── Root ── */
.ob-root {
  min-height: 100svh;
  min-height: 100vh;
  background: #F7F4EE;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
  position: relative;
  animation: ob-appear 0.45s ease both;
}

@keyframes ob-appear {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.ob-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.35;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
  background-size: 250px 250px;
}

/* ── Card ── */
.ob-main {
  width: 100%;
  max-width: 600px;
  position: relative;
  z-index: 1;
}

.ob-card {
  background: #FFFFFF;
  border-radius: 18px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 20px 48px rgba(0,0,0,0.07);
  padding: 2.75rem 2.5rem;
  position: relative;
  overflow: hidden;
  animation: ob-rise 0.55s ease both;
}

@keyframes ob-rise {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 480px) {
  .ob-card {
    padding: 2rem 1.5rem;
    border-radius: 14px;
  }
}

/* Gold left accent bar */
.ob-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #C9A84C 0%, #E8C96A 50%, #C9A84C 100%);
  border-radius: 18px 0 0 18px;
}

/* ── Header ── */
.ob-header {
  margin-bottom: 2.25rem;
}

.ob-step {
  display: inline-block;
  font-size: 0.65rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #C9A84C;
  font-weight: 600;
  margin-bottom: 0.6rem;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
}

.ob-title {
  margin: 0 0 0.35rem;
  font-size: 1.7rem;
  font-weight: 700;
  color: #1A1510;
  letter-spacing: 0.02em;
  font-family: "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
  line-height: 1.2;
}

.ob-subtitle {
  margin: 0;
  font-size: 0.82rem;
  color: #9A9088;
  letter-spacing: 0.02em;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
}

/* ── Form ── */
.ob-form {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

/* Row grid */
.ob-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem 2rem;
}

@media (max-width: 480px) {
  .ob-row {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

/* Field */
.ob-field {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

.ob-label {
  font-size: 0.65rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #A09890;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
}

.ob-input {
  background: transparent;
  border: none;
  border-bottom: 1.5px solid #E2DBD2;
  padding: 0.45rem 2rem 0.45rem 0;
  font-size: 1rem;
  color: #1A1510;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
  transition: border-color 0.2s ease;
  outline: none;
  width: 100%;
}

.ob-input::placeholder {
  color: #C8C0B6;
  font-size: 0.9rem;
}

.ob-input:focus {
  border-bottom-color: #C9A84C;
}

.ob-input:focus-visible {
  outline: none;
}

.ob-input--mono {
  font-family: "SF Mono", "Roboto Mono", "Cascadia Code", monospace;
  letter-spacing: 0.18em;
  font-size: 0.95rem;
}

/* Animated underline on focus */
.ob-underline {
  height: 1.5px;
  background: #C9A84C;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  transform: scaleX(0);
  transition: transform 0.25s ease;
  pointer-events: none;
}

.ob-field:focus-within .ob-underline {
  transform: scaleX(1);
}

/* Error state */
.ob-field--error .ob-input {
  border-bottom-color: #C0392B;
  color: #C0392B;
}

.ob-field--error .ob-underline {
  background: #C0392B;
}

/* Success state */
.ob-field--ok .ob-input {
  border-bottom-color: #27AE60;
}

.ob-field--ok .ob-underline {
  background: #27AE60;
  transform: scaleX(1);
}

.ob-errmsg {
  font-size: 0.72rem;
  color: #C0392B;
  margin-top: 0.4rem;
  letter-spacing: 0.02em;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
}

.ob-hint {
  font-size: 0.7rem;
  color: #B0A898;
  margin-top: 0.4rem;
  letter-spacing: 0.02em;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
}

/* Landlord code field */
.ob-code-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.ob-code-wrap .ob-input {
  flex: 1;
}

.ob-code-status {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}

.ob-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(201, 168, 76, 0.25);
  border-top-color: #C9A84C;
  border-radius: 50%;
  animation: ob-spin 0.7s linear infinite;
}

@keyframes ob-spin {
  to { transform: rotate(360deg); }
}

.ob-icon-ok {
  width: 18px;
  height: 18px;
  color: #27AE60;
}

.ob-icon-err {
  width: 18px;
  height: 18px;
  color: #C0392B;
}

.ob-found {
  font-size: 0.78rem;
  color: #27AE60;
  margin-top: 0.5rem;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* Section (landlord code block) */
.ob-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-top: 0.25rem;
  border-top: 1px solid #EDE8DF;
}

.ob-section-header {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.ob-section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1A1510;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
}

.ob-section-sub {
  margin: 0;
  font-size: 0.78rem;
  color: #9A9088;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
}

/* Browse tip */
.ob-tip {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.875rem 1rem;
  background: #F0EDE4;
  border-radius: 10px;
  font-size: 0.78rem;
  color: #6A6058;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
  line-height: 1.6;
}

.ob-tip-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #C9A84C;
  margin-top: 0.1rem;
}

.ob-tip-link {
  color: #C9A84C;
  font-weight: 600;
  text-decoration: none;
}

.ob-tip-link:hover {
  text-decoration: underline;
}

.ob-tip-link:focus-visible {
  outline: 2px solid #C9A84C;
  outline-offset: 2px;
  border-radius: 2px;
}

/* Landlord info note */
.ob-note {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.875rem 1rem;
  background: #FDF8EC;
  border: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: 10px;
  font-size: 0.82rem;
  color: #7A6830;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
  line-height: 1.6;
}

.ob-note-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #C9A84C;
  margin-top: 0.15rem;
}

/* Submit */
.ob-submit-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding-top: 0.25rem;
}

.ob-submit {
  width: 100%;
  padding: 0.9rem 1.5rem;
  background: #C9A84C;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
  box-shadow: 0 4px 18px rgba(201, 168, 76, 0.35);
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
}

.ob-submit:hover:not(:disabled) {
  background: #B8962E;
  box-shadow: 0 6px 24px rgba(201, 168, 76, 0.45);
  transform: translateY(-1px);
}

.ob-submit:active:not(:disabled) {
  transform: translateY(0);
}

.ob-submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.ob-submit:focus-visible {
  outline: 2px solid #C9A84C;
  outline-offset: 3px;
}

.ob-submit-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ob-spin 0.7s linear infinite;
  flex-shrink: 0;
}

.ob-submit-note {
  font-size: 0.72rem;
  color: #B0A898;
  margin: 0;
  font-family: "PingFang TC", "Noto Sans TC", sans-serif;
  letter-spacing: 0.02em;
}

@media (prefers-reduced-motion: reduce) {
  .ob-root,
  .ob-card { animation: none; }
  .ob-input,
  .ob-underline,
  .ob-submit { transition: none; }
  .ob-spinner,
  .ob-submit-spinner { animation: none; }
}
</style>
