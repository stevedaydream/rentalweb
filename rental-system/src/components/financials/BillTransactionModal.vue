<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>

      <div class="relative bg-white dark:bg-card-dark w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]">

        <!-- Header -->
        <div class="px-6 pt-5 pb-4 flex items-center justify-between border-b border-ink-100 dark:border-ink-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center"
              :class="local.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'">
              <span class="material-symbols-outlined text-[20px]"
                :class="local.type === 'income' ? 'text-green-600' : 'text-red-500'">
                {{ local.type === 'income' ? 'add_circle' : 'remove_circle' }}
              </span>
            </div>
            <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
              {{ isEditing ? '編輯紀錄' : '記一筆' }}
            </h2>
          </div>
          <button @click="close" class="p-1.5 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-ink-300 hover:text-ink-600">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          <!-- Type Toggle -->
          <div class="flex gap-3">
            <button
              @click="setType('income')"
              class="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition-all"
              :class="local.type === 'income'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-700 dark:text-green-300'
                : 'border-ink-100 dark:border-ink-700 text-ink-400 hover:border-ink-200'"
            >
              <span class="material-symbols-outlined text-[20px]">trending_up</span>
              收入
            </button>
            <button
              @click="setType('expense')"
              class="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition-all"
              :class="local.type === 'expense'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-400 text-red-600 dark:text-red-400'
                : 'border-ink-100 dark:border-ink-700 text-ink-400 hover:border-ink-200'"
            >
              <span class="material-symbols-outlined text-[20px]">trending_down</span>
              支出
            </button>
          </div>

          <!-- Amount (large, prominent) -->
          <div>
            <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-2">金額</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 font-medium text-sm">NT$</span>
              <input
                v-model.number="local.amount"
                type="number"
                inputmode="numeric"
                class="w-full pl-12 pr-4 py-3.5 bg-surface-light dark:bg-surface-dark border-2 rounded-xl text-2xl font-bold outline-none transition-colors"
                :class="local.type === 'income'
                  ? 'border-transparent focus:border-green-400 text-green-700 dark:text-green-300'
                  : 'border-transparent focus:border-red-400 text-red-600 dark:text-red-400'"
                placeholder="0"
              >
            </div>
          </div>

          <!-- Category chips -->
          <div>
            <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-2">類別</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="cat in currentCategories"
                :key="cat.value"
                @click="local.category = cat.value"
                class="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                :class="local.category === cat.value
                  ? `${cat.active} border-transparent`
                  : 'bg-surface-light dark:bg-surface-dark border-ink-100 dark:border-ink-700 text-ink-500 hover:border-ink-300'"
              >
                {{ cat.label }}
              </button>
            </div>
          </div>

          <!-- Date + Target (2 cols) -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-2">日期</label>
              <input v-model="local.date" type="date" class="form-input text-sm" />
            </div>
            <div class="relative" ref="targetRef">
              <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-2">對象 / 房號</label>
              <div class="relative">
                <input
                  v-model="targetSearch"
                  @focus="showTargetDrop = true"
                  @input="showTargetDrop = true"
                  type="text"
                  class="form-input text-sm pr-8"
                  placeholder="搜尋租客或房號..."
                  autocomplete="off"
                />
                <button v-if="local.target" @click="clearTarget"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600">
                  <span class="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
              <!-- Dropdown -->
              <div v-if="showTargetDrop && filteredTenants.length"
                class="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 rounded-xl shadow-xl z-50 max-h-44 overflow-y-auto">
                <button
                  v-for="t in filteredTenants" :key="t.id"
                  @mousedown.prevent="selectTarget(t)"
                  class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-light dark:hover:bg-surface-dark text-left transition-colors"
                >
                  <div class="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                    {{ t.name[0] }}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{{ t.name }}</p>
                    <p class="text-xs text-text-secondary-light">{{ t.room || '未設定房號' }}</p>
                  </div>
                  <span class="ml-auto text-xs text-ink-300">{{ t.room }}</span>
                </button>
                <!-- 手動輸入選項 -->
                <button v-if="targetSearch && !filteredTenants.find(t => targetLabel(t) === targetSearch)"
                  @mousedown.prevent="selectCustomTarget"
                  class="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-light dark:hover:bg-surface-dark text-left border-t border-ink-100 dark:border-ink-700">
                  <span class="material-symbols-outlined text-[16px] text-ink-400">edit</span>
                  <span class="text-sm text-ink-500">使用「{{ targetSearch }}」</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-2">備註</label>
            <textarea
              v-model="local.description"
              class="form-input text-sm resize-none"
              rows="2"
              placeholder="輸入備註說明（選填）"
            ></textarea>
          </div>

          <!-- Status (editing only) -->
          <div v-if="isEditing">
            <label class="block text-xs font-semibold text-text-secondary-light uppercase tracking-wide mb-2">狀態</label>
            <div class="flex gap-2">
              <button
                v-for="s in statusOptions"
                :key="s.value"
                @click="local.status = s.value as any"
                class="flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all"
                :class="local.status === s.value ? s.active : 'border-ink-100 dark:border-ink-700 text-ink-400'"
              >
                {{ s.label }}
              </button>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-ink-100 dark:border-ink-800 flex gap-3 shrink-0">
          <button @click="close"
            class="flex-1 py-3 rounded-xl text-sm font-bold border border-ink-200 dark:border-ink-700 text-ink-500 hover:bg-surface-light transition-colors">
            取消
          </button>
          <button @click="handleSave"
            class="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors shadow-lg"
            :class="local.type === 'income'
              ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20'
              : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'">
            {{ isEditing ? '更新' : '儲存' }}
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { TransactionForm } from './types'

interface TenantOption { id: string; name: string; room: string }

const props = defineProps<{
  show: boolean
  modelValue: TransactionForm
  isEditing: boolean
  tenants?: TenantOption[]
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'update:modelValue': [value: TransactionForm]
  'save': []
}>()

const local = ref<TransactionForm>(JSON.parse(JSON.stringify(props.modelValue)))
const targetRef = ref<HTMLElement | null>(null)
const targetSearch = ref('')
const showTargetDrop = ref(false)

watch(() => props.show, (val) => {
  if (val) {
    local.value = JSON.parse(JSON.stringify(props.modelValue))
    targetSearch.value = props.modelValue.target || ''
  }
})

// Sync targetSearch → local.target when typing freely
watch(targetSearch, (v) => { local.value.target = v })

const targetLabel = (t: TenantOption) => t.room ? `${t.room} ${t.name}` : t.name

const filteredTenants = computed(() => {
  const q = targetSearch.value.toLowerCase()
  if (!q) return props.tenants ?? []
  return (props.tenants ?? []).filter(t =>
    t.name.toLowerCase().includes(q) || t.room.toLowerCase().includes(q)
  )
})

const selectTarget = (t: TenantOption) => {
  local.value.target = targetLabel(t)
  targetSearch.value = targetLabel(t)
  showTargetDrop.value = false
}

const selectCustomTarget = () => {
  local.value.target = targetSearch.value
  showTargetDrop.value = false
}

const clearTarget = () => {
  local.value.target = ''
  targetSearch.value = ''
}

// Close dropdown on outside click
const handleOutside = (e: MouseEvent) => {
  if (targetRef.value && !targetRef.value.contains(e.target as Node)) {
    showTargetDrop.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', handleOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleOutside))

const incomeCategories = [
  { value: '租金收入', label: '租金收入', active: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: '入住款項', label: '入住款項', active: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: '電費', label: '電費', active: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { value: '押金', label: '押金', active: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { value: '其他收入', label: '其他', active: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300' },
]

const expenseCategories = [
  { value: '台電帳單', label: '台電帳單', active: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300' },
  { value: '修繕費', label: '修繕費', active: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: '清潔費', label: '清潔費', active: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300' },
  { value: '退還押金', label: '退還押金', active: 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300' },
  { value: '其他支出', label: '其他', active: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300' },
]

const currentCategories = computed(() =>
  local.value.type === 'income' ? incomeCategories : expenseCategories
)

const setType = (type: 'income' | 'expense') => {
  local.value.type = type
  // auto-select first category of new type
  const cats = type === 'income' ? incomeCategories : expenseCategories
  if (!cats.find(c => c.value === local.value.category)) {
    local.value.category = cats[0]!.value
  }
}

const statusOptions = [
  { value: 'pending', label: '待收款', active: 'bg-orange-50 text-orange-600 border-orange-300' },
  { value: 'completed', label: '已結清', active: 'bg-green-50 text-green-600 border-green-400' },
  { value: 'overdue', label: '逾期', active: 'bg-red-50 text-red-600 border-red-400' },
]

const close = () => emit('update:show', false)

const handleSave = () => {
  emit('update:modelValue', JSON.parse(JSON.stringify(local.value)))
  emit('save')
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-active .relative, .modal-leave-active .relative { transition: transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .relative { transform: translateY(20px); }
</style>
