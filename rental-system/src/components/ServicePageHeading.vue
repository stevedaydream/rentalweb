<template>
  <div class="service-heading">
    <p class="service-heading__eyebrow">
      <span class="service-heading__mark" aria-hidden="true"></span>
      租賃管家 <span aria-hidden="true">/</span> {{ role === 'landlord' ? '房東服務' : '租客生活' }}
    </p>
    <h1 class="service-heading__title">{{ title }}</h1>
    <p class="service-heading__description">{{ description }}</p>
    <nav v-if="links?.length" class="service-heading__links" aria-label="相關服務">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to">
        {{ link.label }} <span aria-hidden="true">↗</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  role?: 'landlord' | 'tenant';
  links?: { label: string; to: string }[];
}>();
</script>

<style scoped>
.service-heading { min-width: 0; }
.service-heading__eyebrow { display: flex; align-items: center; gap: 10px; font-size: 10px; font-weight: 700; letter-spacing: .16em; color: #8b6b32; margin-bottom: 12px; }
.service-heading__mark { width: 18px; height: 2px; background: #a8792e; }
.service-heading__title { font-family: 'Noto Serif TC', serif; font-size: clamp(24px, 3vw, 34px); font-weight: 700; letter-spacing: .03em; line-height: 1.4; }
.service-heading__description { margin-top: 8px; font-size: 13px; color: #766d60; line-height: 1.7; }
.service-heading__links { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 14px; }
.service-heading__links a { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #78551f; padding-block: 6px; text-underline-offset: 4px; }
.service-heading__links a:hover { text-decoration: underline; }
.service-heading__links a:focus-visible { outline: 2px solid #a8792e; outline-offset: 4px; border-radius: 2px; }
@media (max-width: 640px) { .service-heading__eyebrow { margin-bottom: 8px; } }
</style>
