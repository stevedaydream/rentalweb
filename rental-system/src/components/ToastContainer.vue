<template>
  <Teleport to="body">
    <div
      aria-live="polite"
      aria-atomic="true"
      class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      <TransitionGroup name="toast">
        <button
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          type="button"
          :aria-label="`關閉通知：${toast.message}`"
          class="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border pointer-events-auto cursor-pointer text-left w-full"
          :class="styleMap[toast.type]"
          @click="toastStore.remove(toast.id)"
        >
          <span class="material-symbols-outlined text-[20px] mt-0.5 shrink-0" aria-hidden="true">{{ iconMap[toast.type] }}</span>
          <p class="text-sm font-medium leading-snug">{{ toast.message }}</p>
        </button>
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
.toast-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.toast-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.toast-enter-from  { opacity: 0; transform: translateX(100%); }
.toast-leave-to    { opacity: 0; transform: translateX(100%); }
.toast-move        { transition: transform 0.3s ease; }

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move { transition: none; }
  .toast-enter-from,
  .toast-leave-to { transform: none; }
}
</style>
