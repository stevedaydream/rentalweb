<template>
  <div class="min-h-screen bg-gray-50 dark:bg-background-dark">

    <!-- Header -->
    <header class="sticky top-0 z-40 bg-white dark:bg-card-dark border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-blue-600 text-2xl">apartment</span>
          <span class="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">找房</span>
          <span class="text-xs text-text-secondary-light hidden sm:block">— 瀏覽待租房間</span>
        </div>
        <div class="flex items-center gap-2">
          <router-link
            to="/login"
            class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
          >
            登入
          </router-link>
          <router-link
            to="/register"
            class="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors shadow-sm"
          >
            已有代碼？立即註冊
          </router-link>
        </div>
      </div>
    </header>

    <!-- 說明 Banner -->
    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <div class="max-w-7xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-1">找到理想的租屋</h1>
        <p class="text-blue-100 text-sm">瀏覽房東公開刊登的空置房間，找到喜歡的就聯繫房東洽談。</p>
        <div class="mt-4 flex items-center gap-2 text-sm bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5 w-fit">
          <span class="material-symbols-outlined text-[16px]">lightbulb</span>
          談好之後，請房東提供綁定代碼，再來
          <router-link to="/register" class="font-bold underline">完成註冊</router-link>
          即可使用完整租客功能。
        </div>
      </div>
    </div>

    <!-- 篩選列 -->
    <div class="sticky top-[57px] z-30 bg-white dark:bg-card-dark border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center">
        <div class="relative flex-1 min-w-[160px] max-w-xs">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
          <input
            v-model="rawSearch"
            type="text"
            placeholder="搜尋地區、縣市..."
            class="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          >
        </div>
        <select
          v-model="filterLayout"
          class="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option value="">全部格局</option>
          <option>獨立套房</option>
          <option>分租套房</option>
          <option>雅房</option>
          <option>整層住家</option>
        </select>
        <select
          v-model="filterPrice"
          class="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option value="">全部價格</option>
          <option value="0-5000">5,000 以下</option>
          <option value="5000-8000">5,000–8,000</option>
          <option value="8000-12000">8,000–12,000</option>
          <option value="12000-18000">12,000–18,000</option>
          <option value="18000-99999">18,000 以上</option>
        </select>
        <span class="text-sm text-text-secondary-light ml-auto hidden sm:block">
          共 {{ filteredRooms.length }} 間
        </span>
      </div>
    </div>

    <!-- 主內容 -->
    <main class="max-w-7xl mx-auto px-4 py-8">

      <!-- 載入中 -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="n in 6" :key="n" class="bg-white dark:bg-card-dark rounded-2xl overflow-hidden shadow-sm animate-pulse">
          <div class="h-48 bg-gray-200 dark:bg-gray-700"></div>
          <div class="p-5 space-y-3">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4"></div>
          </div>
        </div>
      </div>

      <!-- 空白狀態 -->
      <div v-else-if="filteredRooms.length === 0" class="text-center py-20">
        <div class="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="material-symbols-outlined text-4xl text-gray-400">search_off</span>
        </div>
        <h3 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">找不到符合條件的房間</h3>
        <p class="text-text-secondary-light mt-1 text-sm">試試調整篩選條件</p>
      </div>

      <!-- 房間卡片 Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="room in filteredRooms"
          :key="room.id"
          class="group bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
        >
          <!-- 照片 -->
          <div class="relative h-48 bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <img
              :src="getCoverImage(room)"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              alt="房間照片"
            >
            <!-- 格局標籤 -->
            <div class="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium">
              {{ room.layout }}
            </div>
            <!-- 照片數（點擊開啟 lightbox） -->
            <button
              @click="openLightbox(room, 0)"
              class="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <span class="material-symbols-outlined text-[13px]">photo_library</span>
              {{ getRoomImages(room).length }}
            </button>
          </div>

          <!-- 內容 -->
          <div class="p-5 flex-1 flex flex-col">
            <div class="flex justify-between items-start mb-1">
              <h3 class="font-bold text-base text-text-primary-light dark:text-text-primary-dark line-clamp-1">
                {{ room.name }}
              </h3>
              <span class="text-blue-600 font-extrabold text-base whitespace-nowrap ml-2">
                NT$ {{ room.price.toLocaleString() }}<span class="text-xs font-normal text-text-secondary-light">/月</span>
              </span>
            </div>

            <!-- 地址（點擊開啟 Google 地圖） -->
            <a
              :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(room.address)}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-text-secondary-light mb-3 flex items-center gap-1 hover:text-blue-600 transition-colors w-fit"
              :title="room.address"
            >
              <span class="material-symbols-outlined text-[15px]">location_on</span>
              {{ maskAddress(room.address) }}
            </a>

            <!-- 規格 chips -->
            <div class="flex flex-wrap gap-2 mb-4">
              <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-text-secondary-light flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">square_foot</span>
                {{ room.size }} 坪
              </span>
              <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-text-secondary-light flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">bed</span>
                {{ room.layout }}
              </span>
            </div>

            <!-- 房東資訊 -->
            <div class="mt-auto">
              <div class="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                <div class="flex items-center gap-2 text-sm text-text-secondary-light">
                  <router-link
                    v-if="room.landlordId"
                    :to="{ name: 'LandlordProfile', params: { landlordId: room.landlordId } }"
                    class="flex items-center gap-2 hover:text-blue-600 transition-colors"
                  >
                    <div class="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold text-xs">
                      {{ room.landlordName?.[0] || '房' }}
                    </div>
                    <div>
                      <span class="block leading-tight">{{ room.landlordName || '房東' }}</span>
                      <div v-if="room.landlordReviewCount && room.landlordReviewCount > 0" class="flex items-center gap-0.5 mt-0.5">
                        <span class="material-symbols-outlined text-[11px] text-amber-400" style="font-variation-settings: 'FILL' 1">star</span>
                        <span class="text-xs text-amber-500 font-medium">{{ room.landlordAvgRating?.toFixed(1) }}</span>
                        <span class="text-xs text-gray-400">({{ room.landlordReviewCount }})</span>
                      </div>
                      <span v-else class="text-xs text-gray-400">查看資料</span>
                    </div>
                  </router-link>
                  <div v-else class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold text-xs">
                      {{ room.landlordName?.[0] || '房' }}
                    </div>
                    <span>{{ room.landlordName || '房東' }}</span>
                  </div>
                </div>

                <!-- 聯絡按鈕群 -->
                <div class="flex items-center gap-1.5">
                  <a
                    v-if="room.landlordLineBotId"
                    :href="`https://line.me/R/ti/p/${room.landlordLineBotId}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs px-2.5 py-1.5 rounded-lg bg-[#06C755]/10 text-[#06C755] hover:bg-[#06C755]/20 font-medium transition-colors flex items-center gap-1"
                    title="透過 LINE 詢問房源"
                  >
                    <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    LINE 詢問
                  </a>
                  <button
                    v-if="revealedContact !== room.id"
                    @click="revealedContact = room.id"
                    class="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium transition-colors flex items-center gap-1"
                  >
                    <span class="material-symbols-outlined text-[14px]">phone</span>
                    電話
                  </button>
                  <a
                    v-else
                    :href="`tel:${room.landlordPhone}`"
                    class="text-xs px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold transition-colors flex items-center gap-1 hover:bg-green-100 dark:hover:bg-green-900/50"
                  >
                    <span class="material-symbols-outlined text-[14px]">call</span>
                    {{ room.landlordPhone || '未提供' }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer CTA -->
    <footer class="bg-white dark:bg-card-dark border-t border-gray-100 dark:border-gray-800 mt-8">
      <div class="max-w-7xl mx-auto px-4 py-8 text-center">
        <p class="text-text-secondary-light text-sm mb-3">已和房東談好了嗎？</p>
        <router-link
          to="/register"
          class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/30"
        >
          <span class="material-symbols-outlined text-[20px]">login</span>
          輸入房東代碼，完成租客註冊
        </router-link>
      </div>
    </footer>

    <!-- ===== 照片 Lightbox ===== -->
    <Teleport to="body">
      <div
        v-if="lightboxRoom"
        class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        @click.self="closeLightbox"
      >
        <!-- 關閉 -->
        <button @click="closeLightbox" class="absolute top-4 right-4 text-white/70 hover:text-white">
          <span class="material-symbols-outlined text-[32px]">close</span>
        </button>

        <!-- 計數 -->
        <div class="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {{ lightboxIndex + 1 }} / {{ getRoomImages(lightboxRoom).length }}
        </div>

        <!-- 主圖 -->
        <img
          :src="getRoomImages(lightboxRoom)[lightboxIndex]"
          class="max-w-full max-h-[80vh] object-contain rounded-lg select-none"
          alt="放大圖"
        >

        <!-- 左右箭頭 -->
        <button
          v-if="lightboxIndex > 0"
          @click="lightboxIndex--"
          class="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
        >
          <span class="material-symbols-outlined text-[28px]">chevron_left</span>
        </button>
        <button
          v-if="lightboxIndex < getRoomImages(lightboxRoom).length - 1"
          @click="lightboxIndex++"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
        >
          <span class="material-symbols-outlined text-[28px]">chevron_right</span>
        </button>

        <!-- 縮圖列 -->
        <div v-if="getRoomImages(lightboxRoom).length > 1" class="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
          <button
            v-for="(img, i) in getRoomImages(lightboxRoom)"
            :key="i"
            @click="lightboxIndex = i"
            class="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all"
            :class="i === lightboxIndex ? 'border-white' : 'border-transparent opacity-50 hover:opacity-75'"
          >
            <img :src="img" class="w-full h-full object-cover" alt="">
          </button>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface PublicRoom {
  id: string;
  name: string;
  address: string;
  price: number;
  size: number;
  layout: string;
  images?: string[];
  coverImage?: string;
  landlordId?: string;
  landlordName?: string;
  landlordPhone?: string;
  landlordLineBotId?: string;
  landlordAvgRating?: number;
  landlordReviewCount?: number;
}

const rooms = ref<PublicRoom[]>([]);
const loading = ref(true);
const rawSearch = ref('');
const searchQuery = ref('');
const filterLayout = ref('');
const filterPrice = ref('');
const revealedContact = ref<string | null>(null);

// Lightbox 狀態
const lightboxRoom = ref<PublicRoom | null>(null);
const lightboxIndex = ref(0);

const defaultImage = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80';

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(rawSearch, (val) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery.value = val.trim(); }, 300);
});

onMounted(async () => {
  try {
    const q = query(
      collection(db, 'rooms'),
      where('isPublic', '==', true),
      where('status', '==', 'vacant')
    );
    const snap = await getDocs(q);
    const rawRooms = snap.docs.map(d => ({ id: d.id, ...d.data() } as PublicRoom));

    const landlordIds = [...new Set(rawRooms.map(r => r.landlordId).filter(Boolean))] as string[];
    const profileMap: Record<string, any> = {};
    await Promise.all(
      landlordIds.map(async (uid) => {
        try {
          const profileSnap = await getDoc(doc(db, 'public_profiles', uid));
          if (profileSnap.exists()) profileMap[uid] = profileSnap.data();
        } catch { /* ignore */ }
      })
    );

    rooms.value = rawRooms.map(r => ({
      ...r,
      landlordLineBotId: r.landlordId ? (profileMap[r.landlordId]?.lineBotId || '') : '',
      landlordAvgRating: r.landlordId ? (profileMap[r.landlordId]?.avgRating || 0) : 0,
      landlordReviewCount: r.landlordId ? (profileMap[r.landlordId]?.reviewCount || 0) : 0,
    }));
  } catch (e) {
    console.error('載入房間失敗', e);
  } finally {
    loading.value = false;
  }
});

const maskAddress = (address: string): string => {
  if (!address) return '地區未公開';
  const match = address.match(/^(.{2,3}[市縣])(.{2,4}[區鄉鎮市])?/);
  if (match) return (match[1] || '') + (match[2] || '');
  return address.slice(0, 6) + (address.length > 6 ? '...' : '');
};

const getCoverImage = (room: PublicRoom): string => {
  if (room.coverImage) return room.coverImage;
  if (room.images?.length) return room.images[0];
  return defaultImage;
};

const getRoomImages = (room: PublicRoom): string[] => {
  const seen = new Set<string>();
  const imgs: string[] = [];
  if (room.coverImage) { seen.add(room.coverImage); imgs.push(room.coverImage); }
  if (room.images?.length) {
    room.images.forEach(img => { if (!seen.has(img)) { seen.add(img); imgs.push(img); } });
  }
  if (imgs.length === 0) imgs.push(defaultImage);
  return imgs;
};

const openLightbox = (room: PublicRoom, index: number) => {
  lightboxRoom.value = room;
  lightboxIndex.value = index;
  document.body.style.overflow = 'hidden';
};

const closeLightbox = () => {
  lightboxRoom.value = null;
  document.body.style.overflow = '';
};

const filteredRooms = computed(() => {
  return rooms.value.filter(room => {
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      if (!room.address.toLowerCase().includes(q) && !room.name.toLowerCase().includes(q)) return false;
    }
    if (filterLayout.value && room.layout !== filterLayout.value) return false;
    if (filterPrice.value) {
      const [min, max] = filterPrice.value.split('-').map(Number);
      if (room.price < min || room.price > max) return false;
    }
    return true;
  });
});
</script>
