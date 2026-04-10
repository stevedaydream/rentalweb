<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-background-light dark:bg-background-dark">
    <div class="w-full max-w-md bg-white dark:bg-card-dark p-8 rounded-2xl shadow-sm border border-ink-100 dark:border-ink-800">

      <div class="mb-8 relative">
        <button
          @click="router.push({ name: 'Identity' })"
          class="absolute -left-2 -top-1 p-2 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 transition-colors rounded-full hover:bg-surface-light dark:hover:bg-surface-dark"
          title="重新選擇身分"
        >
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div class="text-center">
          <h2 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">登入{{ roleTitle }}</h2>
          <p class="mt-2 text-sm text-text-secondary-light dark:text-text-secondary-dark">歡迎回來</p>
        </div>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="form-input"
            placeholder="name@example.com"
          >
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">密碼</label>
            <button
              type="button"
              @click="handleForgotPassword"
              :disabled="forgotLoading"
              class="text-xs text-gold-600 hover:text-gold-700 dark:text-gold-400 disabled:opacity-50 transition-colors"
            >
              {{ forgotLoading ? '寄送中...' : '忘記密碼？' }}
            </button>
          </div>
          <input
            v-model="password"
            type="password"
            required
            class="form-input"
            placeholder="••••••••"
          >
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 px-4 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl transition-colors shadow-md shadow-gold-500/20 disabled:opacity-50"
        >
          {{ loading ? '登入中...' : '登入' }}
        </button>
      </form>

      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-ink-100 dark:border-ink-800"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white dark:bg-card-dark text-text-secondary-light dark:text-text-secondary-dark">或使用其他方式登入</span>
          </div>
        </div>

        <button
          @click="handleGoogleLogin"
          type="button"
          class="mt-6 w-full flex items-center justify-center gap-3 px-4 py-3 border border-ink-100 dark:border-ink-800 rounded-xl hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5" alt="Google">
          <span class="font-medium text-text-primary-light dark:text-text-primary-dark">使用 Google 登入</span>
        </button>
      </div>

      <p class="mt-8 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
        還沒有帳號？
        <router-link :to="{ name: 'Register' }" class="font-bold text-gold-600 hover:text-gold-700 dark:text-gold-400">
          立即註冊
        </router-link>
      </p>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { useRouter } from 'vue-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';

const authStore = useAuthStore();
const toast = useToastStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const forgotLoading = ref(false);

const getFirebaseErrorMessage = (code: string): string => {
  const map: Record<string, string> = {
    'auth/user-not-found': '找不到此電子郵件對應的帳號',
    'auth/wrong-password': '密碼錯誤，請重新輸入',
    'auth/invalid-credential': '帳號或密碼錯誤，請確認後再試',
    'auth/invalid-email': '電子郵件格式不正確',
    'auth/user-disabled': '此帳號已被停用，請聯絡管理員',
    'auth/too-many-requests': '嘗試次數過多，帳號已暫時鎖定，請稍後再試',
    'auth/network-request-failed': '網路連線失敗，請檢查網路狀態',
    'auth/popup-closed-by-user': '登入視窗已關閉，請重新嘗試',
    'auth/cancelled-popup-request': '登入已取消',
  };
  return map[code] || '登入失敗，請稍後再試';
};

const roleTitle = computed(() => {
  if (authStore.selectedRole === 'landlord') return '房東';
  if (authStore.selectedRole === 'tenant') return '租客';
  return '';
});

const handleLogin = async () => {
  loading.value = true;
  try {
    await authStore.loginEmail(email.value, password.value);
  } catch (e: any) {
    toast.error(getFirebaseErrorMessage(e.code));
  } finally {
    loading.value = false;
  }
};

const handleGoogleLogin = async () => {
  try {
    await authStore.loginWithGoogle();
  } catch (e: any) {
    toast.error(getFirebaseErrorMessage(e.code));
  }
};

const handleForgotPassword = async () => {
  if (!email.value) {
    toast.warning('請先在上方輸入您的 Email');
    return;
  }
  forgotLoading.value = true;
  try {
    await sendPasswordResetEmail(auth, email.value);
    toast.success('密碼重設信已寄出，請檢查您的信箱');
  } catch (e: any) {
    toast.error(getFirebaseErrorMessage(e.code));
  } finally {
    forgotLoading.value = false;
  }
};
</script>