<template>
  <div class="max-w-4xl mx-auto space-y-6">

    <div>
      <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">評價管理</h1>
      <p class="text-text-secondary-light text-sm">管理租客留下的公開評價，可隱藏不當留言或回覆租客</p>
    </div>

    <!-- 統計卡 -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
        <div class="text-3xl font-extrabold text-amber-500">{{ avgRating > 0 ? avgRating.toFixed(1) : '-' }}</div>
        <div class="flex items-center justify-center gap-0.5 mt-1">
          <span v-for="i in 5" :key="i"
            class="material-symbols-outlined text-[14px]"
            :class="i <= Math.round(avgRating) ? 'text-amber-400' : 'text-gray-300'"
            style="font-variation-settings: 'FILL' 1"
          >star</span>
        </div>
        <p class="text-xs text-text-secondary-light mt-1">平均評分</p>
      </div>
      <div class="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
        <div class="text-3xl font-extrabold text-blue-600">{{ reviews.length }}</div>
        <p class="text-xs text-text-secondary-light mt-2">總評價數</p>
      </div>
      <div class="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
        <div class="text-3xl font-extrabold text-green-600">{{ visibleCount }}</div>
        <p class="text-xs text-text-secondary-light mt-2">公開中</p>
      </div>
    </div>

    <!-- 篩選 -->
    <div class="flex items-center gap-3">
      <button
        v-for="f in filters" :key="f.value"
        @click="activeFilter = f.value as 'all' | 'visible' | 'hidden'"
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="activeFilter === f.value
          ? 'bg-gold-500 text-white'
          : 'bg-white dark:bg-card-dark text-text-secondary-light border border-gray-200 dark:border-gray-700 hover:border-gold-400'"
      >
        {{ f.label }}
        <span class="ml-1 text-xs opacity-70">({{ f.count }})</span>
      </button>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="space-y-4">
      <div v-for="n in 3" :key="n" class="bg-white dark:bg-card-dark rounded-2xl p-6 animate-pulse">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-else-if="filteredReviews.length === 0" class="bg-white dark:bg-card-dark rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-800">
      <span class="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">rate_review</span>
      <p class="text-text-secondary-light mt-2">{{ activeFilter === 'all' ? '目前還沒有評價' : '此分類沒有評價' }}</p>
    </div>

    <!-- 評價卡列表 -->
    <div v-else class="space-y-4">
      <div
        v-for="review in filteredReviews" :key="review.id"
        class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border transition-colors"
        :class="review.isVisible ? 'border-gray-100 dark:border-gray-800' : 'border-gray-300 dark:border-gray-600 opacity-60'"
      >
        <!-- 頂部：作者 + 評分 + 狀態 -->
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500">
              {{ review.authorName?.[0] || '匿' }}
            </div>
            <div>
              <span class="font-medium text-text-primary-light dark:text-text-primary-dark text-sm">{{ review.authorName || '匿名' }}</span>
              <p class="text-xs text-text-secondary-light">{{ formatDate(review.createdAt) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-0.5">
              <span v-for="i in 5" :key="i"
                class="material-symbols-outlined text-[16px]"
                :class="i <= review.rating ? 'text-amber-400' : 'text-gray-300'"
                style="font-variation-settings: 'FILL' 1"
              >star</span>
              <span class="ml-1 text-sm font-bold text-text-secondary-light">{{ review.rating }}.0</span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium"
              :class="review.isVisible ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'"
            >
              {{ review.isVisible ? '公開中' : '已隱藏' }}
            </span>
          </div>
        </div>

        <!-- 評價內容 -->
        <p class="mt-3 text-sm text-text-primary-light dark:text-text-primary-dark leading-relaxed">{{ review.content }}</p>

        <!-- 現有回覆 -->
        <div v-if="review.landlordReply" class="mt-3 ml-4 pl-3 border-l-2 border-blue-200 dark:border-blue-700">
          <p class="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">您的回覆</p>
          <p class="text-sm text-text-secondary-light">{{ review.landlordReply }}</p>
        </div>

        <!-- 回覆輸入框（展開時） -->
        <div v-if="replyingId === review.id" class="mt-4">
          <textarea
            v-model="replyText"
            rows="3" maxlength="300"
            placeholder="輸入您的回覆..."
            class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none"
          ></textarea>
          <div class="flex justify-end gap-2 mt-2">
            <button @click="replyingId = null; replyText = ''" class="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
            <button @click="saveReply(review)" :disabled="!replyText.trim() || saving"
              class="px-4 py-1.5 text-sm bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >儲存回覆</button>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 flex-wrap">
          <!-- 隱藏/公開切換 -->
          <button
            @click="toggleVisibility(review)"
            :disabled="saving"
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="review.isVisible
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100'"
          >
            <span class="material-symbols-outlined text-[14px]">{{ review.isVisible ? 'visibility_off' : 'visibility' }}</span>
            {{ review.isVisible ? '隱藏評價' : '重新公開' }}
          </button>

          <!-- 回覆 -->
          <button
            v-if="replyingId !== review.id"
            @click="startReply(review)"
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gold-50 dark:bg-gold-900/20 text-gold-600 dark:text-gold-400 hover:bg-gold-100 transition-colors"
          >
            <span class="material-symbols-outlined text-[14px]">reply</span>
            {{ review.landlordReply ? '修改回覆' : '回覆' }}
          </button>

          <!-- 刪除回覆 -->
          <button
            v-if="review.landlordReply && replyingId !== review.id"
            @click="deleteReply(review)"
            :disabled="saving"
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <span class="material-symbols-outlined text-[14px]">delete</span>
            刪除回覆
          </button>
        </div>
      </div>
    </div>

    <!-- 提示：隱藏說明 -->
    <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 flex items-start gap-2">
      <span class="material-symbols-outlined text-blue-500 text-[18px] mt-0.5">info</span>
      <p class="text-xs text-blue-700 dark:text-blue-300">隱藏的評價只有您可以看到，租客與訪客不會看到被隱藏的評價，也不會知道您執行了任何操作。</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';

interface Review {
  id: string;
  landlordId: string;
  authorName: string;
  rating: number;
  content: string;
  createdAt: any;
  isVisible: boolean;
  landlordReply: string | null;
  landlordReplyAt: any;
}

const authStore = useAuthStore();
const toast = useToastStore();

const loading = ref(true);
const saving = ref(false);
const reviews = ref<Review[]>([]);
const activeFilter = ref<'all' | 'visible' | 'hidden'>('all');
const replyingId = ref<string | null>(null);
const replyText = ref('');

const avgRating = computed(() => {
  const visible = reviews.value.filter(r => r.isVisible);
  if (!visible.length) return 0;
  return visible.reduce((s, r) => s + r.rating, 0) / visible.length;
});

const visibleCount = computed(() => reviews.value.filter(r => r.isVisible).length);

const filters = computed(() => [
  { value: 'all', label: '全部', count: reviews.value.length },
  { value: 'visible', label: '公開中', count: visibleCount.value },
  { value: 'hidden', label: '已隱藏', count: reviews.value.length - visibleCount.value },
]);

const filteredReviews = computed(() => {
  if (activeFilter.value === 'visible') return reviews.value.filter(r => r.isVisible);
  if (activeFilter.value === 'hidden') return reviews.value.filter(r => !r.isVisible);
  return reviews.value;
});

const formatDate = (ts: any): string => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
};

onMounted(async () => {
  try {
    const snap = await getDocs(query(
      collection(db, 'reviews'),
      where('landlordId', '==', authStore.effectiveUid),
    ));
    reviews.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Review))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (e) {
    console.error('載入評價失敗', e);
  } finally {
    loading.value = false;
  }
});

const toggleVisibility = async (review: Review) => {
  saving.value = true;
  try {
    await updateDoc(doc(db, 'reviews', review.id), { isVisible: !review.isVisible });
    review.isVisible = !review.isVisible;
    toast.success(review.isVisible ? '評價已重新公開' : '評價已隱藏（僅您可見）');
  } catch (e) {
    toast.error('操作失敗，請稍後再試');
  } finally {
    saving.value = false;
  }
};

const startReply = (review: Review) => {
  replyingId.value = review.id;
  replyText.value = review.landlordReply || '';
};

const saveReply = async (review: Review) => {
  if (!replyText.value.trim()) return;
  saving.value = true;
  try {
    await updateDoc(doc(db, 'reviews', review.id), {
      landlordReply: replyText.value.trim(),
      landlordReplyAt: new Date(),
    });
    review.landlordReply = replyText.value.trim();
    replyingId.value = null;
    replyText.value = '';
    toast.success('回覆已儲存');
  } catch (e) {
    toast.error('儲存失敗，請稍後再試');
  } finally {
    saving.value = false;
  }
};

const deleteReply = async (review: Review) => {
  saving.value = true;
  try {
    await updateDoc(doc(db, 'reviews', review.id), { landlordReply: null, landlordReplyAt: null });
    review.landlordReply = null;
    toast.success('回覆已刪除');
  } catch (e) {
    toast.error('刪除失敗，請稍後再試');
  } finally {
    saving.value = false;
  }
};
</script>
