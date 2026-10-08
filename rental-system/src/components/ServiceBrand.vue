<template>
  <div class="service-brand">
    <span class="service-brand__name">租賃管家</span>
    <span class="service-brand__context">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<style scoped>
.service-brand { display: flex; align-items: center; justify-content: space-between; gap: 24px; width: 100%; max-width: var(--service-brand-width, 48rem); padding-bottom: 16px; border-bottom: 1px solid var(--service-border); }
.service-brand__name { font-family: var(--font-heading); font-size: 16px; font-weight: 700; letter-spacing: .12em; }
.service-brand__context { font-size: 12px; color: var(--service-gold-text); }
</style>
