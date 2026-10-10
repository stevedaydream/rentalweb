<template>
  <div class="entry-page min-h-screen flex flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark">
    <ServiceBrand label="系統管理" />
    <div class="w-full max-w-sm bg-white dark:bg-card-dark p-8 rounded-2xl shadow-sm border border-ink-100 dark:border-ink-800">

      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold-50 dark:bg-gold-900/30 border border-gold-200 dark:border-gold-800 text-gold-600 dark:text-gold-300 mb-4">
          <span class="material-symbols-outlined text-3xl">shield_person</span>
        </div>
        <h1 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">系統管理員</h1>
        <p class="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">限授權人員使用</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-text-secondary-light mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            name="email"
            autocomplete="email"
            required
            class="w-full px-3 py-2.5 bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 rounded-lg text-text-primary-light dark:text-text-primary-dark placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:outline-none focus:border-gold-500 transition-colors"
            placeholder="admin@example.com"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-text-secondary-light mb-1">密碼</label>
          <input
            v-model="password"
            type="password"
            name="password"
            autocomplete="current-password"
            required
            class="w-full px-3 py-2.5 bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 rounded-lg text-text-primary-light dark:text-text-primary-dark placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:outline-none focus:border-gold-500 transition-colors"
            placeholder="••••••••"
          >
        </div>
        <p v-if="errorMsg" class="text-xs text-red-400">{{ errorMsg }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-sm mt-2"
        >
          {{ loading ? '登入中...' : '登入' }}
        </button>
      </form>

      <!-- Back -->
      <RouterLink
        :to="{ name: 'Identity' }"
        class="mt-6 block w-full text-center text-xs text-text-secondary-light hover:text-gold-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded"
      >
        ← 返回
      </RouterLink>

    </div>
  </div>
</template>

<script setup lang="ts">
import ServiceBrand from '../../components/ServiceBrand.vue';
import { ref } from 'vue';

import { useAuthStore } from '../../stores/auth';






const authStore = useAuthStore();


const email = ref('');
const password = ref('');

const loading = ref(false);
const errorMsg = ref('');

const handleLogin = async () => {
  errorMsg.value = '';
  loading.value = true;
  try {
    await authStore.loginEmail(email.value, password.value);
    // 登入後 authStore 會自動讀取 userProfile；路由守衛會導向 AdminDashboard
    const role = authStore.userProfile?.role;
    if (role !== 'admin') {
      await authStore.logout();
      errorMsg.value = '此帳號沒有管理員權限';
    }
  } catch (e: any) {
    errorMsg.value = '登入失敗：' + (e.message ?? '請確認帳號密碼');
  } finally {
    loading.value = false;
  }
};

</script>
