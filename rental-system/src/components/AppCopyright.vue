<template>
  <footer class="text-center text-xs leading-5" :class="inverse ? 'text-gray-400' : 'text-ink-500 dark:text-ink-400'">
    <p>© {{ year }} stevedaydream</p>
    <p :class="inverse ? 'text-gray-400/80' : 'text-ink-500/80 dark:text-ink-400/80'">租賃管家 v{{ version }}</p>
  </footer>
</template>

<script setup lang="ts">
import { version } from '../../package.json';

defineProps<{ inverse?: boolean }>();
const year = new Date().getFullYear();
</script>
