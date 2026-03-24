<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('update:show', false)"></div>

    <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
      <div class="p-6 border-b border-ink-100 dark:border-ink-700 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">修改紀錄</h2>
          <p class="text-xs text-text-secondary-light">系統自動保留變更前的資料快照</p>
        </div>
        <button @click="$emit('update:show', false)" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="p-6 overflow-y-auto space-y-4">
        <div v-if="history.length === 0" class="text-center text-text-secondary-light py-8">
          <span class="material-symbols-outlined text-4xl mb-2 text-ink-200">history_toggle_off</span>
          <p>此筆資料尚無修改紀錄</p>
        </div>

        <div v-else class="relative border-l-2 border-ink-100 dark:border-ink-700 ml-3 space-y-6">
          <div v-for="(record, index) in history" :key="index" class="relative pl-6">
            <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-ink-800 border-2 border-gold-500"></div>

            <div class="text-xs text-text-secondary-light mb-1">
              {{ record.modifiedAt ? new Date(record.modifiedAt).toLocaleString() : '未知時間' }}
            </div>

            <div class="bg-surface-light dark:bg-surface-dark p-3 rounded-lg border border-ink-100 dark:border-ink-700 text-sm">
              <p class="font-bold mb-1">變更前版本：</p>
              <div class="space-y-1 text-text-secondary-light">
                <p>金額: {{ record.data.amount }}</p>
                <p>日期: {{ record.data.date }}</p>
                <p>對象: {{ record.data.target }}</p>
                <p>備註: {{ record.data.description }}</p>
                <p>狀態: {{ statusLabels[record.data.status] }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { statusLabels, type TransactionHistory } from './types'

defineProps<{
  show: boolean
  history: TransactionHistory[]
}>()

defineEmits<{ 'update:show': [value: boolean] }>()
</script>
