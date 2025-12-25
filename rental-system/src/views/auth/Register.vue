<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-background-light dark:bg-background-dark">
    <div class="w-full max-w-md bg-white dark:bg-card-dark p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
      
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">註冊{{ roleTitle }}帳號</h2>
        <p class="mt-2 text-sm text-text-secondary-light">建立您的帳戶以開始使用</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text-secondary-light mb-1">Email</label>
          <input 
            v-model="email" 
            type="email" 
            required
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            placeholder="name@example.com"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-text-secondary-light mb-1">設定密碼</label>
          <input 
            v-model="password" 
            type="password" 
            required
            minlength="6"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            placeholder="至少 6 位數"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary-light mb-1">確認密碼</label>
          <input 
            v-model="confirmPassword" 
            type="password" 
            required
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            placeholder="再次輸入密碼"
          >
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50"
        >
          {{ loading ? '註冊中...' : '註冊' }}
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-text-secondary-light">
          已有帳號？ 
          <router-link :to="{ name: 'Login' }" class="font-bold text-blue-600 hover:text-blue-500">
            登入
          </router-link>
        </p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);

const roleTitle = computed(() => {
  if (authStore.selectedRole === 'landlord') return '房東';
  if (authStore.selectedRole === 'tenant') return '租客';
  return '';
});

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    alert('兩次密碼輸入不一致');
    return;
  }

  loading.value = true;
  try {
    await authStore.registerEmail(email.value, password.value);
    // 註冊成功後，store 會自動導向 Onboarding (因為是新用戶)
  } catch (e: any) {
    alert('註冊失敗: ' + e.message);
  } finally {
    loading.value = false;
  }
};
</script>