<template>
  <div class="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
    <div class="flex items-center justify-between gap-2 mb-1">
      <p class="text-[11px] text-text-secondary-light">出租人（房東）</p>
      <button v-if="modelValue" type="button" @click="handleLock"
        class="text-[10px] text-text-secondary-light hover:text-ink-600 dark:hover:text-ink-300 flex items-center gap-0.5"
        title="交給租客簽名前可鎖回，避免簽名被套用到其他單據">
        <span class="material-symbols-outlined text-[12px]" aria-hidden="true">lock</span>鎖回
      </button>
    </div>

    <div class="h-14 flex items-end justify-between gap-2">
      <img v-if="modelValue" :src="modelValue" alt="房東簽名" class="max-h-14 max-w-[60%] object-contain" />
      <span v-else-if="vault.hasVault.value" class="text-[11px] text-amber-600">已儲存，需解鎖</span>
      <span v-else class="text-[11px] text-text-secondary-light">尚未簽名</span>

      <button type="button" @click="onPrimary"
        class="shrink-0 px-2.5 py-1.5 rounded-lg bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition-colors">
        {{ primaryLabel }}
      </button>
    </div>

    <!-- 手寫簽名 -->
    <Signature v-model:visible="showPad" @confirm="onSigned" />

    <!-- PIN：解鎖 / 設定 -->
    <div v-if="pinMode" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closePin"></div>
      <div role="dialog" aria-modal="true" aria-labelledby="sig-pin-title"
        class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div>
          <h3 id="sig-pin-title" class="font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ pinMode === 'unlock' ? '解鎖我的簽名' : '設定簽名 PIN 碼' }}
          </h3>
          <p class="text-xs text-text-secondary-light mt-1">
            <template v-if="pinMode === 'unlock'">
              輸入 PIN 碼以取出已儲存的簽名。本次工作階段內不需再輸入，關閉分頁即失效。
            </template>
            <template v-else>
              簽名將以此 PIN 加密後儲存，未輸入 PIN 無法取出。<b>忘記 PIN 只能重新簽名</b>，系統無法還原。
            </template>
          </p>
        </div>

        <input
          ref="pinInput" v-model="pin" type="password" inputmode="numeric" autocomplete="off"
          maxlength="8" placeholder="4~8 位數字"
          class="form-input text-center text-lg tracking-[0.4em] font-mono"
          @keydown.enter="submitPin"
        />
        <p v-if="pinError" class="text-xs text-red-500">{{ pinError }}</p>

        <div v-if="pinMode === 'set'" class="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5">
          <span class="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">info</span>
          <span>PIN 只阻止簽名被下載或蓋到其他單據；租客簽署時本來就會看到這份文件上的簽名。</span>
        </div>

        <div class="flex gap-2">
          <button type="button" @click="closePin"
            class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            取消
          </button>
          <button type="button" @click="submitPin" :disabled="busy"
            class="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors disabled:opacity-50">
            {{ busy ? '處理中…' : (pinMode === 'unlock' ? '解鎖' : '加密並儲存') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 簽完後詢問是否儲存 -->
    <div v-if="askSave" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="askSave = false"></div>
      <div role="dialog" aria-modal="true" class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">要記住這個簽名嗎？</h3>
        <label class="flex items-start gap-2 cursor-pointer select-none">
          <input type="checkbox" v-model="wantSave" class="mt-0.5 rounded text-gold-600 focus:ring-gold-500">
          <span class="text-sm">
            儲存我的簽名，下次自動帶入
            <span class="block text-xs text-text-secondary-light mt-0.5">將以 PIN 碼加密後儲存；不勾選則此簽名僅用於這份文件，不會存入系統。</span>
          </span>
        </label>
        <div class="flex gap-2">
          <button type="button" @click="askSave = false"
            class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            這次就好
          </button>
          <button type="button" @click="confirmSave" :disabled="!wantSave"
            class="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors disabled:opacity-40">
            設定 PIN 並儲存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import Signature from './Signature.vue'
import { useToastStore } from '../stores/toast'
import { useSignatureVault } from '../composables/useSignatureVault'
import { isValidPin, WrongPinError } from '../utils/signatureVault'

const props = defineProps<{
  modelValue: string
  landlordId: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const toast = useToastStore()
const vault = useSignatureVault()

const showPad = ref(false)
const pinMode = ref<'' | 'unlock' | 'set'>('')
const pin = ref('')
const pinError = ref('')
const busy = ref(false)
const pinInput = ref<HTMLInputElement | null>(null)
const askSave = ref(false)
const wantSave = ref(true)
const draft = ref('')

const primaryLabel = computed(() => {
  if (props.modelValue) return '重簽'
  return vault.hasVault.value ? '解鎖簽名' : '簽名'
})

onMounted(async () => {
  await vault.load(props.landlordId)
  // 本次工作階段已解鎖過就直接帶入；舊的未加密簽名仍沿用，避免既有資料突然消失
  const existing = vault.unlockedSignature.value || vault.legacyPlainSignature.value
  if (!props.modelValue && existing) emit('update:modelValue', existing)
})

const openPin = async (mode: 'unlock' | 'set') => {
  pin.value = ''
  pinError.value = ''
  pinMode.value = mode
  await nextTick()
  pinInput.value?.focus()
}
const closePin = () => { pinMode.value = ''; pin.value = ''; pinError.value = '' }

const onPrimary = () => {
  if (!props.modelValue && vault.hasVault.value) openPin('unlock')
  else showPad.value = true
}

const onSigned = (img: string) => {
  emit('update:modelValue', img)
  draft.value = img
  // 已有保險箱者不再重複詢問儲存，避免每次重簽都被打擾
  if (!vault.hasVault.value) { wantSave.value = true; askSave.value = true }
}

const confirmSave = () => { askSave.value = false; openPin('set') }

const submitPin = async () => {
  if (!isValidPin(pin.value)) { pinError.value = 'PIN 碼須為 4~8 位數字'; return }
  busy.value = true
  pinError.value = ''
  try {
    if (pinMode.value === 'unlock') {
      emit('update:modelValue', await vault.unlock(props.landlordId, pin.value))
      toast.success('簽名已解鎖')
    } else {
      await vault.save(props.landlordId, draft.value, pin.value)
      toast.success('簽名已加密儲存')
    }
    closePin()
  } catch (e) {
    pinError.value = e instanceof WrongPinError ? 'PIN 碼不正確' : (e as Error).message || '操作失敗'
  } finally {
    busy.value = false
  }
}

const handleLock = () => {
  vault.lock()
  emit('update:modelValue', '')
  toast.info('簽名已鎖回，需重新輸入 PIN 才能取出')
}
</script>
