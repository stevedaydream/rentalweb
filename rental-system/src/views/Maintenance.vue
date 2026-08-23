<template>
  <div class="min-h-[60vh] flex items-center justify-center p-6">
    <div class="max-w-md w-full text-center space-y-5">
      <div class="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <span class="material-symbols-outlined text-[40px] text-amber-500" aria-hidden="true">construction</span>
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          {{ featureLabel }}維修中
        </h1>
        <p class="text-text-secondary-light leading-relaxed">
          此功能目前暫停使用，我們正在全速搶修，造成不便敬請見諒。<br>
          其他功能不受影響，修復後會自動恢復。
        </p>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <RouterLink
          :to="{ name: 'Dashboard' }"
          class="px-5 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors"
        >
          回到首頁
        </RouterLink>
        <RouterLink
          v-if="contactRoute"
          :to="{ name: contactRoute }"
          class="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          聯繫房東
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const authStore = useAuthStore();

const featureLabel = computed(() => {
  const f = route.query.f;
  return typeof f === 'string' && f ? `「${f}」` : '此功能';
});

// 租客卡住時至少留一條回報管道；房東端沒有對應頁面就不顯示
const contactRoute = computed(() =>
  authStore.userProfile?.role === 'tenant' ? 'ContactLandlord' : '');
</script>
