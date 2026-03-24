<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border pointer-events-auto cursor-pointer"
          :class="styleMap[toast.type]"
          @click="toastStore.remove(toast.id)"
        >
          <span class="material-symbols-outlined text-[20px] mt-0.5 shrink-0">{{ iconMap[toast.type] }}</span>
          <p class="text-sm font-medium leading-snug">{{ toast.message }}</p>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '../stores/toast'

const toastStore = useToastStore()

const iconMap = {
  success: 'check_circle',
  error:   'error',
  warning: 'warning',
  info:    'info',
}

const styleMap = {
  success: 'bg-white dark:bg-ink-800 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  error:   'bg-white dark:bg-ink-800 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  warning: 'bg-white dark:bg-ink-800 border-gold-200 dark:border-gold-800 text-gold-800 dark:text-gold-200',
  info:    'bg-white dark:bg-ink-800 border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-200',
}
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from  { opacity: 0; transform: translateX(100%); }
.toast-leave-to    { opacity: 0; transform: translateX(100%); }
.toast-move        { transition: transform 0.3s ease; }
</style>
