<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

      <div role="dialog" aria-modal="true" aria-labelledby="handback-title"
        class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-gold-600" aria-hidden="true">lock</span>
          </div>
          <div class="min-w-0">
            <h3 id="handback-title" class="font-bold text-text-primary-light dark:text-text-primary-dark">交還房東</h3>
            <p class="text-xs text-text-secondary-light">請把裝置交回房東操作</p>
          </div>
        </div>

        <div v-if="!complete" class="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
          <p class="text-xs text-amber-800 dark:text-amber-300">
            尚有 {{ remaining }} 項未確認。現在交還會保留已填的部分，之後可以接回來繼續。
          </p>
        </div>

        <div>
          <label for="handback-secret" class="block text-sm text-text-secondary-light mb-1.5">
            <template v-if="hasVault">請輸入房東簽名 PIN</template>
            <template v-else>請輸入 <strong class="font-mono text-text-primary-light dark:text-text-primary-dark">交還</strong> 二字</template>
          </label>
          <input
            id="handback-secret" ref="inputEl" v-model="secret"
            :type="hasVault ? 'password' : 'text'"
            :inputmode="hasVault ? 'numeric' : 'text'"
            autocomplete="off" class="form-input text-center tracking-widest"
            @keyup.enter="submit"
          >
          <p v-if="error" class="mt-1.5 text-xs text-red-600">{{ error }}</p>
          <p v-else-if="!hasVault" class="mt-1.5 text-[11px] text-text-secondary-light">
            尚未建立簽名保險箱，暫以文字確認。建議到「設定 → 我的簽名」設一組 PIN。
          </p>
        </div>

        <div class="flex gap-3">
          <button @click="emit('close')" :disabled="busy"
            class="flex-1 py-2.5 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-text-secondary-light disabled:opacity-50">
            繼續確認
          </button>
          <button @click="submit" :disabled="busy || !secret.trim()"
            class="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 disabled:opacity-40 transition-colors">
            {{ busy ? '驗證中…' : '確認交還' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useSignatureVault } from '../../composables/useSignatureVault'

const props = defineProps<{
  landlordId: string
  /** 租客是否已把每一項都確認完 */
  complete: boolean
  remaining: number
}>()
const emit = defineEmits<{ close: []; verified: [] }>()

const vault = useSignatureVault()
const secret = ref('')
const error = ref('')
const busy = ref(false)
const hasVault = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await vault.load(props.landlordId)
  hasVault.value = vault.hasVault.value
  await nextTick()
  inputEl.value?.focus()
})

const submit = async () => {
  const value = secret.value.trim()
  if (!value) return
  error.value = ''
  busy.value = true
  try {
    if (hasVault.value) {
      // 以解密驗證 PIN：解得開才是房東本人
      await vault.unlock(props.landlordId, value)
    } else if (value !== '交還') {
      error.value = '請輸入「交還」二字'
      return
    }
    emit('verified')
  } catch {
    error.value = 'PIN 不正確'
  } finally {
    busy.value = false
  }
}
</script>
