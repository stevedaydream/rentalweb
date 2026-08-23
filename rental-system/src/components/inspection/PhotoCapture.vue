<template>
  <div>
    <div class="flex flex-wrap items-center gap-2">
      <div v-for="p in photos" :key="p.id" class="relative shrink-0">
        <img
          :src="srcOf(p)" :alt="`${entryName} 照片`"
          class="w-16 h-16 rounded-lg object-cover border border-ink-100 dark:border-ink-700"
        >
        <span v-if="p.pending"
          class="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] text-center py-0.5 rounded-b-lg">
          待上傳
        </span>
        <button
          @click="emit('remove', p.id)" :aria-label="`移除 ${entryName} 的照片`"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
        >
          <span class="material-symbols-outlined text-[13px]" aria-hidden="true">close</span>
        </button>
      </div>

      <label
        class="shrink-0 w-16 h-16 rounded-lg border border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors"
        :class="missing
          ? 'border-red-300 dark:border-red-700 text-red-500 bg-red-50/50 dark:bg-red-900/10'
          : 'border-ink-200 dark:border-ink-600 text-text-secondary-light hover:bg-surface-light dark:hover:bg-ink-800'"
      >
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">
          {{ busy ? 'progress_activity' : 'photo_camera' }}
        </span>
        <span class="text-[10px] mt-0.5">{{ busy ? '處理中' : '拍照' }}</span>
        <input
          type="file" accept="image/*" capture="environment" class="sr-only"
          :disabled="busy" :aria-label="`為 ${entryName} 拍照`"
          @change="onPick"
        >
      </label>
    </div>

    <p v-if="missing" class="mt-1.5 text-xs text-red-600 flex items-center gap-1">
      <span class="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
      嚴重瑕疵需至少一張照片
    </p>
  </div>
</template>

<script setup lang="ts">
import type { InspectionPhoto } from '../../utils/inspection'

const props = defineProps<{
  photos: InspectionPhoto[]
  entryName: string
  /** 尚未上傳的照片本地預覽，key 為照片 id */
  previews: Record<string, string>
  /** 需要照片卻還沒有 */
  missing?: boolean
  /** 這一項正在壓縮中，由父層控制 */
  busy?: boolean
}>()
const emit = defineEmits<{ pick: [File]; remove: [string] }>()

/** 已上傳走遠端 URL，未上傳走本地預覽——現場沒網路時照片一樣看得到 */
const srcOf = (p: InspectionPhoto) => p.thumbUrl || props.previews[p.id] || ''

const onPick = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 清空才能連拍同一個檔名
  if (file) emit('pick', file)
}
</script>
