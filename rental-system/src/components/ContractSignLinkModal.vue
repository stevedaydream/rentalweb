<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')"></div>
      <div role="dialog" aria-modal="true" aria-labelledby="sign-link-title"
        class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-gold-600" aria-hidden="true">send</span>
          </div>
          <div>
            <h3 id="sign-link-title" class="font-bold text-text-primary-light dark:text-text-primary-dark">簽署連結</h3>
            <p class="text-xs text-text-secondary-light">把連結傳給{{ tenantName || '租客' }}，簽完後會通知您核對</p>
          </div>
        </div>

        <div v-if="generating" class="bg-surface-light dark:bg-surface-dark rounded-xl p-3 text-center">
          <p class="text-xs text-text-secondary-light">產生簽署連結中…</p>
        </div>

        <div v-else-if="error" role="alert" class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <p class="text-xs text-amber-800 dark:text-amber-300">{{ error }}</p>
        </div>

        <div v-else-if="link" class="bg-gold-50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-800/40 rounded-xl p-4 space-y-2">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[18px] text-gold-600" aria-hidden="true">link</span>
            <p class="text-sm font-bold text-gold-800 dark:text-gold-200">簽署連結</p>
            <span class="ml-auto text-[11px] text-gold-700 dark:text-gold-300">{{ expireDays }} 天內有效 · 簽完即失效</span>
          </div>
          <input :value="link" readonly aria-label="簽署連結"
            class="w-full px-3 py-2 rounded-lg border border-gold-200 dark:border-gold-800/40 bg-white dark:bg-ink-800 text-xs font-mono break-all"
            @focus="($event.target as HTMLInputElement).select()">
          <div class="flex gap-2">
            <button type="button" @click="copyLink"
              class="flex-1 py-2 rounded-lg bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors">
              {{ copied ? '已複製連結' : '複製連結' }}
            </button>
            <a :href="lineShareUrl" target="_blank" rel="noopener"
              class="flex-1 py-2 rounded-lg bg-[#06C755] text-white text-sm font-bold text-center hover:opacity-90 transition-opacity">
              用 LINE 傳送
            </a>
          </div>

          <div class="pt-1 border-t border-gold-200/70 dark:border-gold-800/40">
            <button type="button" @click="showQr = !showQr" :aria-expanded="showQr"
              class="w-full py-1.5 text-xs font-medium text-gold-700 dark:text-gold-300 flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-[16px]" aria-hidden="true">qr_code_2</span>
              {{ showQr ? '收起 QR 碼' : '顯示 QR 碼給租客掃描' }}
            </button>
            <div v-if="showQr" class="flex justify-center pb-1">
              <img :src="qrDataUrl" alt="簽署連結 QR 碼"
                class="w-48 h-48 bg-white rounded-lg p-1 border border-gold-200 dark:border-gold-800/40"
                style="image-rendering: pixelated">
            </div>
          </div>

          <p class="text-[11px] text-gold-700/80 dark:text-gold-300/80">
            租客點開後需輸入合約上的證件號碼，確認內容並簽名。之後可在「合約記錄」重發連結。
          </p>
        </div>

        <button type="button" @click="emit('close')"
          class="w-full py-2.5 rounded-xl bg-ink-700 text-white font-bold hover:bg-ink-800 transition-colors">
          知道了
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toQrDataUrl } from '../utils/qr'

const props = withDefaults(defineProps<{
  show: boolean
  link?: string
  tenantName?: string
  expireDays?: number
  error?: string
  generating?: boolean
}>(), { link: '', tenantName: '', expireDays: 7, error: '', generating: false })

const emit = defineEmits<{ close: [] }>()

const showQr = ref(false)
const qrDataUrl = computed(() => toQrDataUrl(props.link))
watch(() => props.link, () => { showQr.value = false })

const lineShareUrl = computed(() =>
  `https://line.me/R/msg/text/?${encodeURIComponent(`您好，請點以下連結確認租賃合約並簽名（${props.expireDays} 天內有效）：\n${props.link}`)}`)

const copied = ref(false)
const copyLink = async () => {
  if (!props.link) return
  try {
    await navigator.clipboard.writeText(props.link)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // 複製失敗時輸入框本身仍可手動選取
  }
}
</script>
