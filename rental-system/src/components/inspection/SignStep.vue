<template>
  <div class="space-y-4">
    <div class="p-4 rounded-2xl bg-surface-light dark:bg-ink-800/50 border border-ink-100 dark:border-ink-700">
      <p class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">
        共 {{ items.length }} 項<span v-if="contested.length">，其中 {{ contested.length }} 項經雙方協調</span>
      </p>
      <p class="mt-1 text-xs text-text-secondary-light">
        簽名前請雙方一起看過一次。簽下去代表認可「最終狀況」欄的內容，退租時以此為比對基準。
      </p>
    </div>

    <!-- 曾有歧異的置頂 -->
    <section v-if="contested.length">
      <h3 class="text-sm font-bold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">priority_high</span>
        經協調的項目
      </h3>
      <div class="space-y-2">
        <div v-for="e in contested" :key="e.key"
          class="p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-900/10">
          <p class="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">{{ e.name }}</p>
          <p class="mt-1 text-xs text-text-secondary-light">
            租客 {{ label(e.tenantCondition) }} · 房東 {{ label(e.landlordCondition) }} →
            <strong class="text-text-primary-light dark:text-text-primary-dark">共識 {{ label(e.finalCondition) }}</strong>
          </p>
          <p v-if="e.landlordNote" class="mt-0.5 text-xs text-text-secondary-light">「{{ e.landlordNote }}」</p>
        </div>
      </div>
    </section>

    <!-- 完整清單 -->
    <details class="rounded-xl border border-ink-100 dark:border-ink-700">
      <summary class="px-4 py-2.5 text-sm font-medium text-text-secondary-light cursor-pointer select-none">
        檢視完整清單（{{ items.length }} 項）
      </summary>
      <ul class="px-4 pb-3 divide-y divide-ink-50 dark:divide-ink-800">
        <li v-for="e in items" :key="e.key" class="py-2 flex items-center gap-2 text-sm">
          <span class="text-[11px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-700 text-text-secondary-light shrink-0">
            {{ e.kind === 'asset' ? '物品' : '屋況' }}
          </span>
          <span class="flex-1 min-w-0 truncate text-text-primary-light dark:text-text-primary-dark">{{ e.name }}</span>
          <span v-if="e.photos.length" class="text-[11px] text-text-secondary-light shrink-0">
            {{ e.photos.length }} 張
          </span>
          <span class="px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0" :class="badge(final(e))">
            {{ label(final(e)) }}
          </span>
        </li>
      </ul>
    </details>

    <!-- 租客簽名 -->
    <section class="p-4 rounded-2xl border" :class="tenantSig
      ? 'border-green-200 dark:border-green-800 bg-green-50/40 dark:bg-green-900/10'
      : 'border-gold-300 dark:border-gold-700'">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">1. 承租人簽名</span>
        <span v-if="tenantSig" class="material-symbols-outlined text-[18px] text-green-600" aria-hidden="true">check_circle</span>
      </div>
      <img v-if="tenantSig" :src="tenantSig" alt="承租人簽名"
        class="h-16 bg-white rounded-lg border border-ink-100 dark:border-ink-700 object-contain px-2">
      <button @click="signing = 'tenant'"
        class="mt-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
        :class="tenantSig
          ? 'border border-ink-200 dark:border-ink-600 text-text-secondary-light'
          : 'bg-gold-500 text-white hover:bg-gold-600'">
        {{ tenantSig ? '重新簽名' : '請租客簽名' }}
      </button>
    </section>

    <!-- 房東簽名 -->
    <section class="p-4 rounded-2xl border" :class="landlordSig
      ? 'border-green-200 dark:border-green-800 bg-green-50/40 dark:bg-green-900/10'
      : 'border-ink-100 dark:border-ink-700'">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">2. 出租人簽章</span>
        <span v-if="landlordSig" class="material-symbols-outlined text-[18px] text-green-600" aria-hidden="true">check_circle</span>
      </div>
      <img v-if="landlordSig" :src="landlordSig" alt="出租人簽章"
        class="h-16 bg-white rounded-lg border border-ink-100 dark:border-ink-700 object-contain px-2">

      <div v-if="!landlordSig" class="space-y-2">
        <div v-if="vault.isUnlocked.value || vault.legacyPlainSignature.value">
          <button @click="stamp"
            class="px-4 py-2 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">approval</span>
            蓋上保險箱簽名
          </button>
        </div>

        <div v-else-if="vault.hasVault.value" class="flex gap-2">
          <input v-model="pin" type="password" inputmode="numeric" placeholder="簽名 PIN"
            aria-label="簽名保險箱 PIN" class="form-input w-32 text-center tracking-widest"
            @keyup.enter="unlock">
          <button @click="unlock" :disabled="unlocking || !pin.trim()"
            class="px-4 py-2 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 disabled:opacity-40 transition-colors">
            {{ unlocking ? '解鎖中…' : '解鎖並蓋章' }}
          </button>
        </div>

        <p v-else class="text-xs text-text-secondary-light">
          尚未建立簽名保險箱，請改用手寫，或到「設定 → 我的簽名」建立一組。
        </p>

        <p v-if="pinError" class="text-xs text-red-600">{{ pinError }}</p>
      </div>

      <button @click="signing = 'landlord'"
        class="mt-2 px-4 py-2 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-text-secondary-light">
        {{ landlordSig ? '重新簽名' : '改用手寫' }}
      </button>
    </section>

    <Signature
      :visible="signing !== null"
      @update:visible="signing = $event ? signing : null"
      @confirm="onSigned"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Signature from '../Signature.vue'
import { useSignatureVault } from '../../composables/useSignatureVault'
import {
  contestedItems, effectiveCondition, CONDITION_LABELS,
  type InspectionEntry,
} from '../../utils/inspection'
import type { Condition } from '../../utils/inventory'

const props = defineProps<{
  items: InspectionEntry[]
  landlordId: string
  tenantSig: string
  landlordSig: string
}>()
const emit = defineEmits<{
  'update:tenantSig': [string]
  'update:landlordSig': [string]
}>()

const vault = useSignatureVault()
const signing = ref<'tenant' | 'landlord' | null>(null)
const pin = ref('')
const pinError = ref('')
const unlocking = ref(false)

const contested = computed(() => contestedItems(props.items))
const final = (e: InspectionEntry) => effectiveCondition(e)
const label = (c?: Condition) => (c ? CONDITION_LABELS[c] : '—')

const badge = (c: Condition) => {
  if (c === 'total') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  if (c === 'minor') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
  return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
}

onMounted(() => vault.load(props.landlordId))

const onSigned = (dataUrl: string) => {
  if (signing.value === 'tenant') emit('update:tenantSig', dataUrl)
  else if (signing.value === 'landlord') emit('update:landlordSig', dataUrl)
  signing.value = null
}

const stamp = () => {
  const img = vault.unlockedSignature.value || vault.legacyPlainSignature.value
  if (img) emit('update:landlordSig', img)
}

const unlock = async () => {
  pinError.value = ''
  unlocking.value = true
  try {
    const img = await vault.unlock(props.landlordId, pin.value.trim())
    emit('update:landlordSig', img)
    pin.value = ''
  } catch {
    pinError.value = 'PIN 不正確'
  } finally {
    unlocking.value = false
  }
}
</script>
