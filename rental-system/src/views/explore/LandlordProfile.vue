<template>
  <div class="min-h-screen bg-gray-50 dark:bg-background-dark">

    <!-- Header -->
    <header class="sticky top-0 z-40 bg-white dark:bg-card-dark border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <div class="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <button @click="$router.back()" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span class="material-symbols-outlined text-[20px] text-gray-500">arrow_back</span>
        </button>
        <span class="font-bold text-text-primary-light dark:text-text-primary-dark">房東資料</span>
        <router-link to="/explore" class="ml-auto text-sm text-blue-600 hover:underline">← 回找房</router-link>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-6 space-y-6">

      <!-- 載入中 -->
      <div v-if="loading" class="space-y-4">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 animate-pulse">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div class="flex-1 space-y-2">
              <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>

      <template v-else>

        <!-- 房東資訊卡 -->
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold text-2xl flex-shrink-0">
              {{ profile.displayName?.[0] || '房' }}
            </div>
            <div class="flex-1 min-w-0">
              <h1 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
                {{ profile.displayName || profile.name || '房東' }}
              </h1>
              <!-- 星評 -->
              <div class="flex items-center gap-2 mt-1">
                <div class="flex items-center gap-0.5">
                  <span v-for="i in 5" :key="i"
                    class="material-symbols-outlined text-[18px]"
                    :class="i <= Math.round(avgRating) ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'"
                    style="font-variation-settings: 'FILL' 1"
                  >star</span>
                </div>
                <span class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">
                  {{ avgRating > 0 ? avgRating.toFixed(1) : '尚無評價' }}
                </span>
                <span v-if="visibleReviews.length > 0" class="text-sm text-text-secondary-light">
                  ({{ visibleReviews.length }} 則評價)
                </span>
              </div>
              <!-- 簡介 -->
              <p v-if="profile.description" class="mt-3 text-sm text-text-secondary-light leading-relaxed">
                {{ profile.description }}
              </p>
            </div>
          </div>

          <!-- LINE 詢問 -->
          <div v-if="profile.lineBotId" class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <a
              :href="`https://line.me/R/ti/p/${profile.lineBotId}`"
              target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-4 py-2 bg-[#06C755] hover:bg-[#05a848] text-white rounded-lg font-medium text-sm transition-colors"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              透過 LINE 詢問
            </a>
          </div>
        </div>

        <!-- 評價列表 -->
        <div class="bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
              <span class="material-symbols-outlined text-amber-400 text-[20px]" style="font-variation-settings: 'FILL' 1">star</span>
              租客評價
            </h2>
            <span class="text-sm text-text-secondary-light">{{ visibleReviews.length }} 則</span>
          </div>

          <div v-if="visibleReviews.length === 0" class="py-12 text-center">
            <span class="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">rate_review</span>
            <p class="text-text-secondary-light mt-2 text-sm">尚無評價，成為第一個留下評價的租客！</p>
          </div>

          <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
            <div v-for="review in visibleReviews" :key="review.id" class="px-6 py-5">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500">
                    {{ review.authorName?.[0] || '匿' }}
                  </div>
                  <div>
                    <span class="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{{ review.authorName || '匿名' }}</span>
                    <p class="text-xs text-text-secondary-light">{{ formatDate(review.createdAt) }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-0.5 flex-shrink-0">
                  <span v-for="i in 5" :key="i"
                    class="material-symbols-outlined text-[15px]"
                    :class="i <= review.rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'"
                    style="font-variation-settings: 'FILL' 1"
                  >star</span>
                </div>
              </div>
              <p class="mt-3 text-sm text-text-primary-light dark:text-text-primary-dark leading-relaxed">{{ review.content }}</p>

              <!-- 房東回覆 -->
              <div v-if="review.landlordReply" class="mt-3 ml-4 pl-3 border-l-2 border-blue-200 dark:border-blue-700">
                <p class="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">房東回覆</p>
                <p class="text-sm text-text-secondary-light">{{ review.landlordReply }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 撰寫評價 -->
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-blue-500">edit</span>
            留下評價
          </h2>

          <div v-if="submitSuccess" class="text-center py-6">
            <span class="material-symbols-outlined text-4xl text-green-500" style="font-variation-settings: 'FILL' 1">check_circle</span>
            <p class="mt-2 font-medium text-text-primary-light dark:text-text-primary-dark">感謝您的評價！</p>
            <button @click="submitSuccess = false" class="mt-3 text-sm text-blue-600 hover:underline">再留一則</button>
          </div>

          <form v-else @submit.prevent="submitReview" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">您的名稱</label>
              <input
                v-model="form.authorName"
                type="text" maxlength="20" required
                placeholder="例如：前租客小明（可使用暱稱）"
                class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-2">評分</label>
              <div class="flex items-center gap-1">
                <button
                  v-for="i in 5" :key="i" type="button"
                  @click="form.rating = i"
                  class="p-0.5 focus:outline-none transition-transform hover:scale-110"
                >
                  <span
                    class="material-symbols-outlined text-[32px]"
                    :class="i <= form.rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'"
                    style="font-variation-settings: 'FILL' 1"
                  >star</span>
                </button>
                <span class="ml-2 text-sm text-text-secondary-light">{{ ratingLabel }}</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">評價內容</label>
              <textarea
                v-model="form.content"
                rows="4" maxlength="500" required
                placeholder="分享您的租屋經驗，幫助其他租客做決定..."
                class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none"
              ></textarea>
              <p class="text-xs text-text-secondary-light mt-1 text-right">{{ form.content.length }}/500</p>
            </div>
            <p class="text-xs text-text-secondary-light bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
              ⚠️ 評價一經提交即公開顯示，請確保內容屬實。房東有權隱藏不實或不當評價。
            </p>
            <button
              type="submit" :disabled="submitting || form.rating === 0"
              class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span v-if="submitting" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              {{ submitting ? '提交中...' : '提交評價' }}
            </button>
          </form>
        </div>

      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

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

interface LandlordProfile {
  displayName?: string;
  description?: string;
  lineBotId?: string;
}

const route = useRoute();
const landlordId = route.params.landlordId as string;

const loading = ref(true);
const profile = ref<LandlordProfile>({});
const visibleReviews = ref<Review[]>([]);
const submitSuccess = ref(false);
const submitting = ref(false);

const form = ref({ authorName: '', rating: 0, content: '' });

const avgRating = computed(() => {
  if (!visibleReviews.value.length) return 0;
  const sum = visibleReviews.value.reduce((s, r) => s + r.rating, 0);
  return sum / visibleReviews.value.length;
});

const ratingLabel = computed(() => {
  const labels = ['', '很差', '不好', '普通', '不錯', '非常好'];
  return labels[form.value.rating] || '請選擇';
});

const formatDate = (ts: any): string => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
};

onMounted(async () => {
  try {
    const [profileSnap, reviewsSnap] = await Promise.all([
      getDoc(doc(db, 'public_profiles', landlordId)),
      getDocs(query(
        collection(db, 'reviews'),
        where('landlordId', '==', landlordId),
        where('isVisible', '==', true),
      )),
    ]);
    if (profileSnap.exists()) profile.value = profileSnap.data() as LandlordProfile;
    visibleReviews.value = reviewsSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as Review))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (e) {
    console.error('載入房東資料失敗', e);
  } finally {
    loading.value = false;
  }
});

const submitReview = async () => {
  if (!form.value.authorName.trim() || form.value.rating === 0 || !form.value.content.trim()) return;
  submitting.value = true;
  try {
    const newReview = {
      landlordId,
      authorName: form.value.authorName.trim(),
      rating: form.value.rating,
      content: form.value.content.trim(),
      createdAt: serverTimestamp(),
      isVisible: true,
      landlordReply: null,
      landlordReplyAt: null,
    };
    const ref = await addDoc(collection(db, 'reviews'), newReview);
    // Optimistically add to list
    visibleReviews.value.unshift({
      id: ref.id,
      ...newReview,
      createdAt: { toDate: () => new Date() },
    } as Review);
    // Note: public_profiles avgRating/reviewCount is updated via Cloud Function (onReviewCreated)
    form.value = { authorName: '', rating: 0, content: '' };
    submitSuccess.value = true;
  } catch (e) {
    console.error('提交評價失敗', e);
    alert('提交失敗，請稍後再試。');
  } finally {
    submitting.value = false;
  }
};
</script>
