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

        <!-- 搜尋（地區） -->
        <div class="relative flex-1 min-w-[160px] max-w-xs">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
          <input
            v-model="rawSearch"
            type="text"
            placeholder="搜尋地區、縣市..."
            class="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          >
        </div>

        <!-- 格局篩選 -->
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

        <!-- 價格篩選 -->
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

        <!-- 結果數 -->
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
            <!-- 照片數 -->
            <div class="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
              <span class="material-symbols-outlined text-[13px]">photo_library</span>
              {{ room.images?.length || 1 }}
            </div>
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

            <!-- 地區（只顯示城市+行政區） -->
            <p class="text-sm text-text-secondary-light mb-3 flex items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">location_on</span>
              {{ maskAddress(room.address) }}
            </p>

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
                  <div class="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold text-xs">
                    {{ room.landlordName?.[0] || '房' }}
                  </div>
                  <span>{{ room.landlordName || '房東' }}</span>
                </div>

                <!-- 查看聯絡方式 button / 顯示電話 -->
                <div>
                  <button
                    v-if="revealedContact !== room.id"
                    @click="revealedContact = room.id"
                    class="text-xs px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium transition-colors flex items-center gap-1"
                  >
                    <span class="material-symbols-outlined text-[14px]">phone</span>
                    聯絡房東
                  </button>
                  <a
                    v-else
                    :href="`tel:${room.landlordPhone}`"
                    class="text-xs px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold transition-colors flex items-center gap-1 hover:bg-green-100 dark:hover:bg-green-900/50"
                  >
                    <span class="material-symbols-outlined text-[14px]">call</span>
                    {{ room.landlordPhone || '電話未提供' }}
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

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
  landlordName?: string;
  landlordPhone?: string;
}

const rooms = ref<PublicRoom[]>([]);
const loading = ref(true);
const rawSearch = ref('');
const searchQuery = ref('');
const filterLayout = ref('');
const filterPrice = ref('');
const revealedContact = ref<string | null>(null);

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
    rooms.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as PublicRoom));
  } catch (e) {
    console.error('載入房間失敗', e);
  } finally {
    loading.value = false;
  }
});

const maskAddress = (address: string): string => {
  if (!address) return '地區未公開';
  // 嘗試擷取城市+行政區（台北市大安區 / 新北市板橋區 等）
  const match = address.match(/^(.{2,3}[市縣])(.{2,4}[區鄉鎮市])?/);
  if (match) return (match[1] || '') + (match[2] || '');
  // fallback: 只顯示前 6 字
  return address.slice(0, 6) + (address.length > 6 ? '...' : '');
};

const getCoverImage = (room: PublicRoom): string => {
  if (room.coverImage) return room.coverImage;
  if (room.images?.length) return room.images[0];
  return defaultImage;
};

const filteredRooms = computed(() => {
  return rooms.value.filter(room => {
    // 地區搜尋
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      if (!room.address.toLowerCase().includes(q) && !room.name.toLowerCase().includes(q)) return false;
    }
    // 格局篩選
    if (filterLayout.value && room.layout !== filterLayout.value) return false;
    // 價格篩選
    if (filterPrice.value) {
      const [min, max] = filterPrice.value.split('-').map(Number);
      if (room.price < min || room.price > max) return false;
    }
    return true;
  });
});
</script>
