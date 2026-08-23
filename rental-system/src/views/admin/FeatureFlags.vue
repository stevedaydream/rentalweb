<template>
  <div class="max-w-4xl mx-auto space-y-6">

    <div>
      <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">功能維護開關</h1>
      <p class="text-text-secondary-light mt-0.5">
        關閉後，該身分的選單會隱藏此功能，直接輸入網址也會導向「功能維修中」頁。設定即時生效，不需重新部署。
      </p>
    </div>

    <div v-if="disabledCount" class="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm">
      <span class="material-symbols-outlined text-amber-500 text-[20px]" aria-hidden="true">construction</span>
      <p class="text-amber-800 dark:text-amber-300">
        目前有 <strong>{{ disabledCount }}</strong> 項功能維修中。
      </p>
    </div>

    <div v-for="role in roles" :key="role" class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px] text-gold-500" aria-hidden="true">
          {{ role === 'landlord' ? 'manage_accounts' : 'person' }}
        </span>
        <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ roleLabels[role] }}</h2>
      </div>

      <ul class="divide-y divide-gray-100 dark:divide-gray-800">
        <li v-for="feature in featuresByRole[role]" :key="feature.id"
          class="flex items-center justify-between gap-4 px-5 py-3">
          <div class="min-w-0">
            <p class="font-medium text-text-primary-light dark:text-text-primary-dark">{{ feature.label }}</p>
            <p class="text-xs" :class="isDisabled(role, feature.id) ? 'text-amber-600 dark:text-amber-400' : 'text-text-secondary-light'">
              {{ isDisabled(role, feature.id) ? '維修中，租客／房東看不到此功能' : '正常開放' }}
            </p>
          </div>

          <button
            @click="toggle(role, feature.id)"
            :disabled="saving === key(role, feature.id)"
            role="switch"
            :aria-checked="!isDisabled(role, feature.id)"
            :aria-label="`${roleLabels[role]}－${feature.label}`"
            class="relative w-12 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
            :class="isDisabled(role, feature.id) ? 'bg-gray-300 dark:bg-gray-600' : 'bg-green-500'"
          >
            <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
              :class="isDisabled(role, feature.id) ? 'left-0.5' : 'left-[26px]'"></span>
          </button>
        </li>
      </ul>
    </div>

    <p class="text-xs text-text-secondary-light">
      儀表板與系統設定不列入開關 —— 那是登入後的落點，關掉會讓使用者一進站就卡在維修頁。
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useFeatureFlagStore } from '../../stores/featureFlags';
import { useToastStore } from '../../stores/toast';
import {
  FEATURES_BY_ROLE as featuresByRole, ROLE_LABELS as roleLabels, flagKey as key,
  type FeatureRole,
} from '../../utils/featureFlags';

const flags = useFeatureFlagStore();
const toast = useToastStore();

const roles: FeatureRole[] = ['landlord', 'tenant'];
const saving = ref('');

const isDisabled = (role: FeatureRole, id: string) => flags.isDisabled(role, id);

const disabledCount = computed(() =>
  roles.reduce((sum, role) =>
    sum + featuresByRole[role].filter(f => flags.isDisabled(role, f.id)).length, 0));

const toggle = async (role: FeatureRole, id: string) => {
  const next = !isDisabled(role, id);
  saving.value = key(role, id);
  try {
    await flags.setDisabled(role, id, next);
    const label = featuresByRole[role].find(f => f.id === id)?.label ?? id;
    toast.success(next ? `已關閉「${label}」，改顯示維修頁` : `已恢復「${label}」`);
  } catch (e) {
    console.error('切換功能開關失敗:', e);
    toast.error('設定失敗，請稍後再試');
  } finally {
    saving.value = '';
  }
};

onMounted(() => { void flags.ensureLoaded(); });
</script>
