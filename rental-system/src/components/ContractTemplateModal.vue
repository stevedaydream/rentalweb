<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('update:show', false)"></div>

      <div class="relative bg-white dark:bg-card-dark w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">

        <!-- Header -->
        <div class="px-6 pt-5 pb-4 flex items-center justify-between border-b border-ink-100 dark:border-ink-800 shrink-0">
          <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-gold-500">edit_document</span>
            合約範本設定
          </h2>
          <button @click="$emit('update:show', false)" class="p-1.5 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark text-ink-300 hover:text-ink-600">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          <!-- 第三條：付款日 -->
          <section>
            <h3 class="flex items-center gap-2 font-bold text-sm text-text-primary-light dark:text-text-primary-dark">
              <span class="w-6 h-6 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 text-xs flex items-center justify-center font-black shrink-0">3</span>第三條　租金支付日期
            </h3>
            <div class="flex items-center gap-3 mt-3">
              <span class="text-sm text-text-secondary-light">每月</span>
              <input v-model.number="local.paymentDay" type="number" min="1" max="28"
                class="w-20 form-input text-sm text-center" />
              <span class="text-sm text-text-secondary-light">日前支付</span>
            </div>
          </section>

          <!-- 第五條：費用約定 -->
          <section>
            <h3 class="flex items-center gap-2 font-bold text-sm text-text-primary-light dark:text-text-primary-dark">
              <span class="w-6 h-6 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 text-xs flex items-center justify-center font-black shrink-0">5</span>第五條　費用約定
            </h3>
            <div class="mt-3 space-y-3">
              <div v-for="fee in feeFields" :key="fee.key" class="flex items-center gap-3">
                <span class="w-16 text-sm text-text-secondary-light shrink-0">{{ fee.label }}</span>
                <div class="flex gap-2 flex-wrap">
                  <button
                    v-for="opt in fee.options" :key="opt.value"
                    @click="(local as any)[fee.key] = opt.value"
                    class="px-3 py-1 rounded-lg text-xs font-medium border transition-all"
                    :class="(local as any)[fee.key] === opt.value
                      ? 'bg-gold-500 text-white border-gold-500'
                      : 'border-ink-200 dark:border-ink-700 text-text-secondary-light hover:border-gold-400'"
                  >{{ opt.label }}</button>
                </div>
              </div>
              <!-- 電費備註 -->
              <div class="flex items-center gap-3">
                <span class="w-16 text-sm text-text-secondary-light shrink-0">電費備註</span>
                <input v-model="local.feeElectricityNote" type="text"
                  class="flex-1 form-input text-sm"
                  placeholder="例：公共區域電費由房東負擔（留空則不顯示）" />
              </div>
            </div>
          </section>

          <!-- 第二十一條：其他約定 -->
          <section>
            <h3 class="flex items-center gap-2 font-bold text-sm text-text-primary-light dark:text-text-primary-dark">
              <span class="w-6 h-6 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 text-xs flex items-center justify-center font-black shrink-0">21</span>第二十一條　其他約定
            </h3>
            <textarea
              v-model="local.customArticle21"
              class="form-input text-sm resize-none mt-3"
              rows="4"
              placeholder="輸入額外條款，例：未經同意不可飼養寵物。若有損壞須修繕回原狀..."
            ></textarea>
            <p class="text-xs text-text-secondary-light mt-1">此文字將附加於合約第二十一條末尾。</p>
          </section>

        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-ink-100 dark:border-ink-800 flex gap-3 shrink-0">
          <button @click="$emit('update:show', false)"
            class="flex-1 py-2.5 rounded-xl text-sm font-bold border border-ink-200 dark:border-ink-700 text-ink-500 hover:bg-surface-light transition-colors">
            取消
          </button>
          <button @click="save" :disabled="saving"
            class="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gold-500 hover:bg-gold-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <span v-if="saving" class="material-symbols-outlined text-[16px] animate-spin">sync</span>
            {{ saving ? '儲存中...' : '儲存範本' }}
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { db } from '../firebase/config'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { useToastStore } from '../stores/toast'

export interface ContractTemplate {
  paymentDay: number
  feeWater: string
  feeElectricity: string
  feeElectricityNote: string
  feeGas: string
  feeInternet: string
  feeManagement: string
  customArticle21: string
}

const DEFAULT: ContractTemplate = {
  paymentDay: 5,
  feeWater: 'landlord',
  feeElectricity: 'tenant',
  feeElectricityNote: '公共區域電費由房東負擔',
  feeGas: 'none',
  feeInternet: 'landlord',
  feeManagement: 'none',
  customArticle21: ''
}

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  'saved': [template: ContractTemplate]
}>()

const authStore = useAuthStore()
const toast = useToastStore()
const saving = ref(false)
const local = ref<ContractTemplate>({ ...DEFAULT })

const feeFields = [
  {
    key: 'feeWater', label: '水費',
    options: [{ value: 'landlord', label: '房東負擔' }, { value: 'tenant', label: '租客負擔' }]
  },
  {
    key: 'feeElectricity', label: '電費',
    options: [{ value: 'landlord', label: '房東負擔' }, { value: 'tenant', label: '租客負擔' }]
  },
  {
    key: 'feeGas', label: '瓦斯費',
    options: [{ value: 'none', label: '無' }, { value: 'tenant', label: '租客負擔' }, { value: 'landlord', label: '房東負擔' }]
  },
  {
    key: 'feeInternet', label: '網路費',
    options: [{ value: 'landlord', label: '房東負擔' }, { value: 'tenant', label: '租客負擔' }, { value: 'none', label: '無' }]
  },
  {
    key: 'feeManagement', label: '管理費',
    options: [{ value: 'none', label: '無' }, { value: 'tenant', label: '租客負擔' }, { value: 'landlord', label: '房東負擔' }]
  },
]

watch(() => props.show, async (val) => {
  if (!val) return
  try {
    const snap = await getDoc(doc(db, 'contract_templates', authStore.effectiveUid))
    local.value = snap.exists() ? { ...DEFAULT, ...(snap.data() as ContractTemplate) } : { ...DEFAULT }
  } catch {
    local.value = { ...DEFAULT }
  }
})

const save = async () => {
  saving.value = true
  try {
    await setDoc(doc(db, 'contract_templates', authStore.effectiveUid), {
      ...local.value,
      updatedAt: new Date().toISOString()
    })
    emit('saved', { ...local.value })
    emit('update:show', false)
    toast.success('合約範本已儲存')
  } catch {
    toast.error('儲存失敗，請稍後再試')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
