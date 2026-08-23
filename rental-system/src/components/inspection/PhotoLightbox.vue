<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/85" @click="emit('close')">
      <img :src="src" :alt="alt" class="max-w-full max-h-full object-contain rounded-lg" @click.stop>
      <button @click="emit('close')" aria-label="關閉"
        class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
      <p v-if="hint" class="absolute bottom-4 inset-x-0 text-center text-xs text-white/70">{{ hint }}</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ src: string; alt: string; hint?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>
