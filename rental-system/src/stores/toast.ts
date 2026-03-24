import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  type: ToastType
  message: string
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let nextId = 0

  const add = (type: ToastType, message: string, duration = 3500) => {
    const id = nextId++
    toasts.value.push({ id, type, message })
    setTimeout(() => remove(id), duration)
  }

  const remove = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) toasts.value.splice(index, 1)
  }

  const success = (message: string) => add('success', message)
  const error   = (message: string) => add('error', message, 5000)
  const warning = (message: string) => add('warning', message)
  const info    = (message: string) => add('info', message)

  return { toasts, success, error, warning, info, remove }
})
