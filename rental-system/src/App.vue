<template>
  <div v-if="!authStore.loading">
    <router-view></router-view>
  </div>

  <div v-else class="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
    <div class="flex flex-col items-center gap-4">
      <img :src="logoSrc" alt="Logo" class="h-20 w-auto mb-4 animate-pulse" />
      <div class="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-text-secondary-light animate-pulse font-medium">系統初始化中...</p>
    </div>
  </div>

  <ToastContainer />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';
import logoSrc from './assets/logo.svg'
import ToastContainer from './components/ToastContainer.vue'

const authStore = useAuthStore();

onMounted(async () => {
  // === 正解方案實作 ===
  
  // 1. 執行初始化監聽 (包含 getRedirectResult 處理手機登入)
  // 根據您目前的 authStore 結構，init() 已經整合了 Redirect 處理
  await authStore.init();

  console.log('[App] 系統初始化與轉址檢查完成');
});
</script>

<style>
/* 確保 Material Symbols 載入 */
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

/* 基本轉場效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>