<template>
  <div class="min-h-screen bg-background-light dark:bg-background-dark">
    <header class="sticky top-0 z-40 bg-ink-800 border-b border-ink-700">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <RouterLink :to="backTarget" class="flex items-center gap-1 text-ink-300 hover:text-white text-sm rounded-lg px-2 py-1.5 hover:bg-ink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
          <span class="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_back</span>
          {{ authStore.userProfile ? '回到系統' : '找房頁' }}
        </RouterLink>
        <img :src="logoSrc" alt="Logo" class="h-7 w-auto brightness-0 invert ml-auto" />
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <div class="space-y-2">
        <p class="text-xs font-bold tracking-widest text-gold-600 dark:text-gold-400">使用指南</p>
        <h1 class="text-2xl md:text-3xl font-bold text-text-primary-light dark:text-text-primary-dark">操作說明</h1>
        <p class="text-text-secondary-light max-w-2xl">請先選擇您的身分，每個分頁都依實際操作順序排列，示意圖上的編號對應左側步驟。</p>
      </div>

      <div role="tablist" aria-label="選擇身分" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          v-for="c in GUIDE_CONTENT"
          :id="`guide-tab-${c.role}`"
          :key="c.role"
          type="button"
          role="tab"
          :aria-selected="activeRole === c.role"
          :aria-controls="`guide-panel-${c.role}`"
          class="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          :class="activeRole === c.role
            ? 'bg-ink-800 border-ink-800 text-white dark:bg-gold-500 dark:border-gold-500 dark:text-ink-900'
            : 'bg-white dark:bg-card-dark border-ink-100 dark:border-ink-700 text-text-secondary-light hover:text-text-primary-light dark:hover:text-white'"
          @click="selectRole(c.role)"
        >
          <span class="material-symbols-outlined text-[20px]" aria-hidden="true">{{ c.icon }}</span>
          {{ c.label }}
        </button>
      </div>

      <section :id="`guide-panel-${content.role}`" role="tabpanel" :aria-labelledby="`guide-tab-${content.role}`" class="space-y-8">
        <div class="rounded-2xl bg-white dark:bg-card-dark border border-ink-100 dark:border-ink-800 p-5 md:p-6 space-y-4 shadow-sm">
          <p class="text-text-primary-light dark:text-text-primary-dark">{{ content.intro }}</p>
          <nav aria-label="操作流程">
            <ol class="flex flex-wrap items-center gap-y-2">
              <li v-for="(f, i) in content.flow" :key="f.sectionId" class="flex items-center">
                <button
                  type="button"
                  class="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-surface-light dark:bg-surface-dark border border-ink-100 dark:border-ink-700 text-sm hover:border-gold-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                  @click="scrollTo(f.sectionId)"
                >
                  <span class="w-6 h-6 rounded-full bg-gold-500 text-white text-xs font-bold flex items-center justify-center">{{ i + 1 }}</span>
                  {{ f.label }}
                </button>
                <span v-if="i < content.flow.length - 1" class="material-symbols-outlined text-[18px] text-ink-300 mx-1" aria-hidden="true">chevron_right</span>
              </li>
            </ol>
          </nav>
        </div>

        <article
          v-for="s in content.sections"
          :id="s.id"
          :key="s.id"
          class="scroll-mt-20 rounded-2xl bg-white dark:bg-card-dark border border-ink-100 dark:border-ink-800 shadow-sm overflow-hidden"
        >
          <div class="grid lg:grid-cols-2">
            <div class="p-5 md:p-6 space-y-4">
              <div class="flex items-start gap-3">
                <span class="w-10 h-10 shrink-0 rounded-xl bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[22px]" aria-hidden="true">{{ s.icon }}</span>
                </span>
                <div class="min-w-0">
                  <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">{{ s.title }}</h2>
                  <p class="text-xs text-text-secondary-light mt-0.5 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]" aria-hidden="true">location_on</span>{{ s.location }}
                  </p>
                </div>
              </div>

              <p class="text-sm text-text-secondary-light">{{ s.summary }}</p>

              <ol class="space-y-2.5">
                <li v-for="(step, i) in s.steps" :key="i" class="flex gap-3 text-sm text-text-primary-light dark:text-text-primary-dark">
                  <span class="w-6 h-6 shrink-0 rounded-full bg-gold-500 text-white text-xs font-bold flex items-center justify-center mt-px">{{ i + 1 }}</span>
                  <span>{{ step }}</span>
                </li>
              </ol>

              <div v-if="s.tips?.length" class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 p-3 space-y-1.5">
                <p v-for="(tip, i) in s.tips" :key="i" class="flex gap-2 text-xs text-blue-800 dark:text-blue-200">
                  <span class="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">lightbulb</span>{{ tip }}
                </p>
              </div>

              <RouterLink
                v-if="s.routeName && canVisit"
                :to="{ name: s.routeName }"
                class="inline-flex items-center gap-1 text-sm font-bold text-gold-600 dark:text-gold-400 hover:underline"
              >
                前往此頁<span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
              </RouterLink>
            </div>

            <div class="p-5 md:p-6 lg:border-l border-t lg:border-t-0 border-ink-100 dark:border-ink-800 bg-surface-light/60 dark:bg-surface-dark/40 flex items-center">
              <GuideIllustration :name="s.illustration" :caption="s.title" class="w-full" />
            </div>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { GUIDE_CONTENT } from '../components/guide/guideContent';
import GuideIllustration from '../components/guide/GuideIllustration.vue';
import type { GuideRole } from '../types';
import logoSrc from '../assets/logo.svg';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const userRole = computed<GuideRole | null>(() => {
  const role = authStore.userProfile?.role;
  return role === 'landlord' || role === 'tenant' || role === 'admin' ? role : null;
});

const activeRole = computed<GuideRole>(() => {
  const q = route.query.role;
  if (GUIDE_CONTENT.some(c => c.role === q)) return q as GuideRole;
  return userRole.value ?? 'visitor';
});

const content = computed(() => GUIDE_CONTENT.find(c => c.role === activeRole.value)!);

// 只在看自己身分的分頁時提供捷徑；訪客頁的公開頁面任何人都能去
const canVisit = computed(() => activeRole.value === 'visitor' || activeRole.value === userRole.value);

const backTarget = computed(() => authStore.userProfile ? { name: 'Dashboard' } : { name: 'RoomExplore' });

const selectRole = (role: GuideRole) => {
  router.replace({ query: { ...route.query, role } });
  window.scrollTo({ top: 0 });
};

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
</script>
