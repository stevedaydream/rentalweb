<template>
  <div v-if="credential" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    <div role="dialog" aria-modal="true" aria-labelledby="tenant-credential-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-green-600" aria-hidden="true">check_circle</span>
        </div>
        <div>
          <h3 id="tenant-credential-title" class="font-bold text-text-primary-light dark:text-text-primary-dark">租客帳號已建立</h3>
          <p class="text-xs text-text-secondary-light">請將以下資訊告知租客</p>
        </div>
      </div>

      <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3 font-mono text-sm">
        <div class="flex justify-between items-center gap-3">
          <span class="text-text-secondary-light text-xs shrink-0">手機號碼（帳號）</span>
          <span class="font-bold text-text-primary-light dark:text-text-primary-dark break-all">{{ credential.phone }}</span>
        </div>
        <div class="flex justify-between items-center gap-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          <span class="text-text-secondary-light text-xs shrink-0">身分證號（密碼）</span>
          <span class="font-bold text-text-primary-light dark:text-text-primary-dark break-all">{{ credential.idNumber }}</span>
        </div>
      </div>

      <p class="text-xs text-text-secondary-light text-center">租客在登入頁選擇「租客身分證登入」即可使用上述帳密</p>

      <button type="button" @click="emit('close')"
        class="w-full py-2.5 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 transition-colors">
        知道了
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface TenantCredential {
  phone: string
  idNumber: string
}

defineProps<{ credential: TenantCredential | null }>()
const emit = defineEmits<{ close: [] }>()
</script>
