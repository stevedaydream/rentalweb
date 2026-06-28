<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-gold-500">mail</span>邀請租客填資料
          </h2>
          <button @click="$emit('close')" aria-label="關閉" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span class="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>

        <div class="p-6 space-y-4">
          <p class="text-sm text-text-secondary-light">產生一條邀請連結傳給租客，租客自行填寫基本資料；送出後在租客列表「待確認」核可即完成建檔。</p>

          <div v-if="generating" class="flex items-center justify-center gap-2 py-8 text-text-secondary-light">
            <span class="material-symbols-outlined animate-spin">progress_activity</span>產生連結中…
          </div>

          <template v-else-if="url">
            <div>
              <label class="block text-xs font-bold text-text-secondary-light mb-1">邀請連結（有效 {{ ttlDays }} 天）</label>
              <div class="flex gap-2">
                <input :value="url" readonly
                  class="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs font-mono text-gray-600 dark:text-gray-300" />
                <button @click="copy"
                  class="shrink-0 px-3 py-2 rounded-lg bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors flex items-center gap-1">
                  <span class="material-symbols-outlined text-[18px]">{{ copied ? 'check' : 'content_copy' }}</span>
                  {{ copied ? '已複製' : '複製' }}
                </button>
              </div>
            </div>
            <button @click="regenerate"
              class="text-xs text-text-secondary-light hover:text-gold-600 flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">refresh</span>重新產生新連結
            </button>
          </template>

          <div v-else class="text-center py-4">
            <button @click="generate"
              class="px-5 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors">
              產生邀請連結
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '../stores/toast';
import { createOnboardingInvite, INVITE_TTL_DAYS } from '../utils/onboardingInvite';

const props = defineProps<{ landlordId: string; landlordCode: string; landlordName: string }>();
defineEmits<{ close: [] }>();
const toast = useToastStore();

const ttlDays = INVITE_TTL_DAYS;
const generating = ref(false);
const url = ref('');
const copied = ref(false);

const generate = async () => {
  generating.value = true;
  try {
    const r = await createOnboardingInvite({
      landlordId: props.landlordId,
      landlordCode: props.landlordCode,
      landlordName: props.landlordName,
    });
    url.value = r.url;
  } catch (e) {
    console.error('建立邀請失敗:', e);
    toast.error('產生連結失敗，請稍後再試');
  } finally {
    generating.value = false;
  }
};
const regenerate = () => { url.value = ''; copied.value = false; generate(); };
const copy = () => {
  navigator.clipboard.writeText(url.value)
    .then(() => { copied.value = true; toast.success('連結已複製'); setTimeout(() => copied.value = false, 2000); })
    .catch(() => toast.warning('複製失敗，請手動複製'));
};

onMounted(generate);
</script>
