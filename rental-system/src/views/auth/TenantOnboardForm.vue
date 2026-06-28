<template>
  <div class="min-h-screen bg-surface-light dark:bg-background-dark flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">

      <!-- Header -->
      <div class="px-6 py-5 bg-gradient-to-r from-gold-500 to-gold-600 text-white">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined">badge</span>
          <h1 class="text-lg font-bold">租客資料填寫</h1>
        </div>
        <p v-if="landlordName" class="text-sm text-white/85 mt-0.5">由 {{ landlordName }} 邀請</p>
      </div>

      <div class="p-6">
        <!-- 載入中 -->
        <div v-if="loading" class="flex flex-col items-center py-10 gap-3 text-text-secondary-light">
          <span class="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
          <p class="text-sm">驗證邀請連結中…</p>
        </div>

        <!-- 無效 / 過期 -->
        <div v-else-if="state === 'invalid' || state === 'expired'" class="flex flex-col items-center py-10 gap-3 text-center">
          <span class="material-symbols-outlined text-5xl text-red-400">link_off</span>
          <p class="font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ state === 'expired' ? '邀請連結已過期' : '邀請連結無效' }}
          </p>
          <p class="text-sm text-text-secondary-light">請向房東索取新的邀請連結。</p>
        </div>

        <!-- 已送出 -->
        <div v-else-if="state === 'submitted' || state === 'done'" class="flex flex-col items-center py-8 gap-3 text-center">
          <span class="material-symbols-outlined text-5xl text-green-500">task_alt</span>
          <p class="font-bold text-text-primary-light dark:text-text-primary-dark">資料已送出</p>
          <p class="text-sm text-text-secondary-light">房東確認後即完成建檔，後續簽約/點交將另行安排。</p>
          <div class="w-full pt-3 mt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <p class="text-xs text-text-secondary-light">想隨時查看帳單、合約、報修？可選擇註冊帳號（自動綁定房東）</p>
            <a :href="registerUrl"
              class="block w-full py-2.5 rounded-xl border border-gold-300 dark:border-gold-700 text-gold-700 dark:text-gold-300 text-sm font-bold hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors text-center">
              註冊帳號（選填）
            </a>
          </div>
        </div>

        <!-- 填表 -->
        <form v-else @submit.prevent="submit" class="space-y-4">
          <p class="text-sm text-text-secondary-light">請填寫您的基本資料，送出後由房東確認建檔。</p>
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">姓名 *</label>
            <input v-model="form.name" type="text" class="form-input" placeholder="您的姓名" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">聯絡電話 *</label>
            <input v-model="form.phone" type="tel" class="form-input" placeholder="09xx-xxx-xxx" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">證件號碼（身分證／居留證／護照）</label>
            <input v-model="form.idNumber" type="text" class="form-input" placeholder="選填" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input v-model="form.email" type="email" class="form-input" placeholder="選填" />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">緊急聯絡人</label>
            <input v-model="form.emergencyContact" type="text" class="form-input" placeholder="選填" />
          </div>
          <button type="submit" :disabled="submitting"
            class="w-full py-3 bg-gold-500 text-white rounded-xl font-bold shadow-lg shadow-gold-500/30 hover:bg-gold-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <span v-if="submitting" class="material-symbols-outlined animate-spin text-[18px]">sync</span>
            {{ submitting ? '送出中…' : '送出資料' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { onboardingInviteCall, type InviteSubmission } from '../../utils/onboardingInvite';
import { useToastStore } from '../../stores/toast';

const route = useRoute();
const toast = useToastStore();
const code = String(route.params.code || '');

const loading = ref(true);
const submitting = ref(false);
const state = ref<'form' | 'submitted' | 'done' | 'invalid' | 'expired'>('form');
const landlordName = ref('');
const landlordCode = ref('');

const form = ref<InviteSubmission>({ name: '', phone: '', idNumber: '', email: '', emergencyContact: '' });

const registerUrl = computed(() =>
  `${window.location.origin}/register${landlordCode.value ? `?code=${encodeURIComponent(landlordCode.value)}` : ''}`,
);

onMounted(async () => {
  try {
    const info = await onboardingInviteCall(code, 'info');
    landlordName.value = info.landlordName || '';
    landlordCode.value = info.landlordCode || '';
    if (info.expired) state.value = 'expired';
    else if (info.submitted) state.value = 'submitted';
    else state.value = 'form';
  } catch (e: any) {
    state.value = e?.response?.status === 410 ? 'expired' : 'invalid';
  } finally {
    loading.value = false;
  }
});

const submit = async () => {
  if (!form.value.name || !form.value.phone) { toast.warning('請填寫姓名與電話'); return; }
  submitting.value = true;
  try {
    await onboardingInviteCall(code, 'submit', form.value);
    state.value = 'done';
  } catch (e: any) {
    const msg = e?.response?.data?.error || '送出失敗，請稍後再試';
    toast.error(msg);
    if (e?.response?.status === 410) state.value = 'expired';
  } finally {
    submitting.value = false;
  }
};
</script>
