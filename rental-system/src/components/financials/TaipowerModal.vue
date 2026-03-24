<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>

    <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
      <div class="p-6 border-b border-ink-100 dark:border-ink-700 flex justify-between items-center">
        <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">登錄台電帳單</h2>
        <button @click="close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="p-6 space-y-4">
        <div class="bg-gold-50 dark:bg-gold-900/10 p-3 rounded-lg text-sm text-gold-800 dark:text-gold-200 flex items-start gap-2">
          <span class="material-symbols-outlined text-[18px] mt-0.5">info</span>
          <p>通常台電為雙月抄表。請輸入帳單上的「計費期間」與「應繳總金額」。</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary-light mb-1">計費月份 (迄月)</label>
          <input v-model="local.month" type="month" class="form-input">
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary-light mb-1">帳單金額</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">NT$</span>
            <input v-model.number="local.amount" type="number" class="form-input pl-10 text-lg font-bold" placeholder="0">
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary-light mb-1">總用電度數</label>
          <input v-model.number="local.usage" type="number" class="form-input" placeholder="0">
        </div>
      </div>

      <div class="p-6 border-t border-ink-100 dark:border-ink-700 flex justify-end gap-3">
        <button @click="close" class="px-5 py-2 rounded-xl text-ink-500 hover:bg-surface-light font-medium transition-colors">取消</button>
        <button @click="handleSave" class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold shadow-md hover:bg-gold-600 transition-colors">儲存帳單</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TaipowerForm } from './types'

const props = defineProps<{
  show: boolean
  modelValue: TaipowerForm
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'update:modelValue': [value: TaipowerForm]
  'save': []
}>()

const local = ref<TaipowerForm>(JSON.parse(JSON.stringify(props.modelValue)))

watch(() => props.show, (val) => {
  if (val) local.value = JSON.parse(JSON.stringify(props.modelValue))
})

const close = () => emit('update:show', false)

const handleSave = () => {
  emit('update:modelValue', JSON.parse(JSON.stringify(local.value)))
  emit('save')
}
</script>
