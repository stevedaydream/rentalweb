<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark">
    <div class="w-full max-w-md bg-white dark:bg-card-dark p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
      
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary mb-4 cursor-default select-none"
          @click="handleIconClick"
        >
          <span class="material-symbols-outlined text-3xl">home_work</span>
        </div>
        <h1 class="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">
          歡迎使用租屋管家
        </h1>
        <p class="mt-2 text-text-secondary-light dark:text-text-secondary-dark">
          請選擇您的登入身分以繼續
        </p>
      </div>

      <div class="space-y-4">
        <button 
          @click="selectRole('tenant')"
          class="w-full group relative flex items-center p-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl hover:border-primary hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-200"
        >
          <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full text-primary dark:text-blue-100 group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined">person</span>
          </div>
          <div class="ml-4 text-left">
            <h3 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark group-hover:text-primary">我是租客</h3>
            <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">查詢帳單、報修、查看公告</p>
          </div>
          <div class="absolute right-4 text-gray-300 group-hover:text-primary transition-colors">
            <span class="material-symbols-outlined">arrow_forward_ios</span>
          </div>
        </button>

        <button 
          @click="selectRole('landlord')"
          class="w-full group relative flex items-center p-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl hover:border-primary hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-200"
        >
          <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-full text-orange-600 dark:text-orange-200 group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined">vpn_key</span>
          </div>
          <div class="ml-4 text-left">
            <h3 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark group-hover:text-primary">我是房東</h3>
            <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">管理房源、抄表、帳務管理</p>
          </div>
          <div class="absolute right-4 text-gray-300 group-hover:text-primary transition-colors">
            <span class="material-symbols-outlined">arrow_forward_ios</span>
          </div>
        </button>
      </div>

      <!-- 找房入口 -->
      <div class="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700 text-center">
        <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3">還在找房？</p>
        <router-link
          to="/explore"
          class="inline-flex items-center gap-2 w-full justify-center p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-sm text-text-secondary-light hover:text-blue-600 dark:hover:text-blue-400 font-medium"
        >
          <span class="material-symbols-outlined text-[18px]">search</span>
          瀏覽空置房間（無需登入）
        </router-link>
      </div>

    </div>

    <p class="mt-8 text-sm text-text-secondary-light dark:text-text-secondary-dark">
      Designed for Modern Rental Management
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const authStore = useAuthStore() as any;

const selectRole = (role: string) => {
  authStore.setRole(role);
  router.push({ name: 'Login' });
};

// 隱藏管理員入口：連點圖示 3 次
const iconClickCount = ref(0);
let iconClickTimer: ReturnType<typeof setTimeout> | null = null;

const handleIconClick = () => {
  iconClickCount.value++;
  if (iconClickTimer) clearTimeout(iconClickTimer);

  if (iconClickCount.value >= 3) {
    iconClickCount.value = 0;
    router.push({ name: 'AdminLogin' });
    return;
  }

  // 3 秒內未完成則重置
  iconClickTimer = setTimeout(() => {
    iconClickCount.value = 0;
  }, 3000);
};
</script>
