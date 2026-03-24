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
          <label class="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">密碼</label>
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

const authStore = useAuthStore();
const toast = useToastStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);

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
    toast.error('登入失敗：' + (e.message || '請確認帳號密碼'));
  } finally {
    loading.value = false;
  }
};

const handleGoogleLogin = async () => {
  try {
    await authStore.loginWithGoogle();
  } catch (e: any) {
    toast.error('Google 登入失敗：' + (e.message || '請稍後再試'));
  }
};
</script>