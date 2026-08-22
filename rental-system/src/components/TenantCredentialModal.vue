<template>
  <div v-if="credential" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    <div role="dialog" aria-modal="true" aria-labelledby="tenant-credential-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-green-600" aria-hidden="true">check_circle</span>
        </div>
        <div>
          <h3 id="tenant-credential-title" class="font-bold text-text-primary-light dark:text-text-primary-dark">租客帳號已建立</h3>
          <p class="text-xs text-text-secondary-light">把啟用連結傳給租客即可</p>
        </div>
      </div>

      <!-- 啟用連結（主要路徑）-->
      <div v-if="activationLink" class="bg-gold-50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-800/40 rounded-xl p-4 space-y-2">
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[18px] text-gold-600" aria-hidden="true">link</span>
          <p class="text-sm font-bold text-gold-800 dark:text-gold-200">啟用連結</p>
          <span class="ml-auto text-[11px] text-gold-700 dark:text-gold-300">{{ expireDays }} 天內有效 · 限用一次</span>
        </div>
        <input
          :value="activationLink" readonly aria-label="啟用連結"
          class="w-full px-3 py-2 rounded-lg border border-gold-200 dark:border-gold-800/40 bg-white dark:bg-ink-800 text-xs font-mono break-all"
          @focus="($event.target as HTMLInputElement).select()"
        >
        <button
          type="button" @click="copyLink"
          class="w-full py-2 rounded-lg bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors"
        >{{ copied ? '已複製連結' : '複製連結' }}</button>
        <p class="text-[11px] text-gold-700/80 dark:text-gold-300/80">
          租客點開後需輸入證件號碼確認身分，接著會引導設定密碼與綁定 LINE。
        </p>
      </div>

      <div v-else-if="linkError" class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
        <p class="text-xs text-amber-800 dark:text-amber-300">{{ linkError }}</p>
      </div>

      <div v-else class="bg-surface-light dark:bg-surface-dark rounded-xl p-3 text-center">
        <p class="text-xs text-text-secondary-light">產生啟用連結中…</p>
      </div>

      <!-- 帳密（日後登入用）-->
      <details class="rounded-xl border border-gray-200 dark:border-gray-700">
        <summary class="px-4 py-2.5 text-xs font-medium text-text-secondary-light cursor-pointer select-none">
          租客日後登入用的帳號密碼
        </summary>
        <div class="px-4 pb-3 space-y-2 font-mono text-sm">
          <div class="flex justify-between items-center gap-3">
            <span class="text-text-secondary-light text-xs shrink-0">手機號碼（帳號）</span>
            <span class="font-bold text-text-primary-light dark:text-text-primary-dark break-all">{{ credential.phone }}</span>
          </div>
          <div class="flex justify-between items-center gap-3 border-t border-gray-200 dark:border-gray-700 pt-2">
            <span class="text-text-secondary-light text-xs shrink-0">證件號碼（密碼）</span>
            <span class="font-bold text-text-primary-light dark:text-text-primary-dark break-all">{{ credential.idNumber }}</span>
          </div>
          <p class="text-[11px] text-text-secondary-light font-sans pt-1">
            登入頁選「租客身分證登入」。若租客在引導頁自行設過密碼，這組密碼即失效。
          </p>
        </div>
      </details>

      <button type="button" @click="emit('close')"
        class="w-full py-2.5 rounded-xl bg-ink-700 text-white font-bold hover:bg-ink-800 transition-colors">
        知道了
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface TenantCredential {
  phone: string
  idNumber: string
}

const props = withDefaults(defineProps<{
  credential: TenantCredential | null
  /** 啟用連結；尚未產生時為空字串，產生失敗時由 linkError 說明 */
  activationLink?: string
  linkError?: string
  expireDays?: number
}>(), { activationLink: '', linkError: '', expireDays: 7 })

const emit = defineEmits<{ close: [] }>()

const copied = ref(false)
const copyLink = async () => {
  if (!props.activationLink) return
  try {
    await navigator.clipboard.writeText(props.activationLink)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // 複製失敗時輸入框本身仍可手動選取
  }
}
</script>
