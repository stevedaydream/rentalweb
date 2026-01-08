<template>
  <div class="max-w-4xl mx-auto space-y-6">
    
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          社區公告
        </h1>
        <p class="text-text-secondary-light">查看最新的大樓通知與消息</p>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
      <div class="relative flex-1">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜尋關鍵字..." 
          class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
        >
      </div>
      <select v-model="selectedCategory" class="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg outline-none cursor-pointer">
         <option value="all">所有類別</option>
         <option value="important">重要公告</option>
         <option value="maintenance">維修通知</option>
         <option value="activity">活動訊息</option>
         <option value="general">一般通知</option>
      </select>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>

    <div v-else class="space-y-4">
      <div 
        v-for="item in filteredList" 
        :key="item.id"
        @click="openDetail(item)"
        class="group bg-white dark:bg-card-dark p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer relative overflow-hidden"
      >
        <div v-if="item.isPinned" class="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
           <span class="material-symbols-outlined text-6xl transform rotate-12">push_pin</span>
        </div>

        <div class="flex justify-between items-start mb-2 relative z-10">
           <div class="flex items-center gap-2">
             <span v-if="item.isPinned" class="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded font-bold flex items-center">
               <span class="material-symbols-outlined text-[14px] mr-1 fill-1">push_pin</span> 置頂
             </span>
             <span class="inline-block px-2 py-0.5 rounded text-xs font-medium" :class="categoryStyles[item.category]">
               {{ item.category }}
             </span>
             <span v-if="!isRead(item.id)" class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
           </div>
           <span class="text-xs text-text-secondary-light">{{ formatDate(item.createdAt) }}</span>
        </div>

        <h3 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark mb-2 group-hover:text-primary transition-colors relative z-10">
          {{ item.title }}
        </h3>
        
        <p class="text-text-secondary-light text-sm line-clamp-2 leading-relaxed relative z-10">
          {{ item.content }}
        </p>

        <div class="mt-4 flex items-center justify-between text-xs text-text-secondary-light font-medium relative z-10">
          <div class="group-hover:text-primary transition-colors flex items-center">
            閱讀更多 <span class="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
          </div>
          <div class="flex items-center gap-1 opacity-60">
            <span class="material-symbols-outlined text-[14px]">visibility</span>
            {{ item.views || 0 }}
          </div>
        </div>
      </div>

      <div v-if="filteredList.length === 0" class="text-center py-12">
        <span class="material-symbols-outlined text-6xl text-gray-200 dark:text-gray-700 mb-4">inbox</span>
        <p class="text-text-secondary-light">沒有符合條件的公告</p>
      </div>
    </div>

    <div v-if="selectedItem" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeDetail"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-scale-in">
        <div class="p-6 md:p-8 overflow-y-auto">
          
          <div class="flex items-center gap-3 mb-4">
            <span class="px-3 py-1 rounded-full text-sm font-bold" :class="categoryStyles[selectedItem.category]">
               {{ selectedItem.category }}
            </span>
            <span class="text-sm text-text-secondary-light">{{ formatDate(selectedItem.createdAt) }}</span>
          </div>

          <h2 class="text-2xl md:text-3xl font-extrabold text-text-primary-light dark:text-text-primary-dark mb-6 leading-tight">
            {{ selectedItem.title }}
          </h2>

          <div class="prose dark:prose-invert max-w-none text-text-primary-light dark:text-text-primary-dark leading-loose whitespace-pre-wrap">
            {{ selectedItem.content }}
          </div>

          <div class="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
             <div class="text-xs text-gray-400">
               發布者：管理委員會
             </div>
             <button 
               @click="closeDetail"
               class="px-6 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
             >
               關閉
             </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { db } from '../../firebase/config';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, Timestamp } from 'firebase/firestore';

// --- Types ---
interface Announcement {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: Timestamp; // Firestore Timestamp
  isPinned: boolean;
  views: number;
}

// --- State ---
const list = ref<Announcement[]>([]);
const searchQuery = ref('');
const selectedCategory = ref('all');
const selectedItem = ref<Announcement | null>(null);
const loading = ref(true);
const readIds = ref<Set<string>>(new Set()); // 本地已讀 ID 集合

// --- Constants ---
const categoryStyles: Record<string, string> = {
  '一般通知': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  '重要公告': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  '維修通知': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  '活動訊息': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
};

const categoryMap: Record<string, string> = {
  'important': '重要公告',
  'maintenance': '維修通知',
  'activity': '活動訊息',
  'general': '一般通知'
};

let unsubscribe: (() => void) | null = null;

// --- Lifecycle ---
onMounted(() => {
  // 1. Load read status from local storage
  const savedReadIds = localStorage.getItem('announcementReadIds');
  if (savedReadIds) {
    readIds.value = new Set(JSON.parse(savedReadIds));
  }

  // 2. Fetch data from Firestore
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  
  unsubscribe = onSnapshot(q, (snapshot) => {
    list.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Announcement));
    loading.value = false;
  }, (err) => {
    console.error("Fetch announcements failed:", err);
    loading.value = false;
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

// --- Helpers ---
const formatDate = (ts: Timestamp) => {
  if (!ts) return '';
  const date = ts.toDate();
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const isRead = (id: string) => {
  return readIds.value.has(id);
};

// --- Computed ---
const filteredList = computed(() => {
  let result = list.value;

  if (selectedCategory.value !== 'all') {
    const targetCat = categoryMap[selectedCategory.value];
    result = result.filter(i => i.category === targetCat);
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(i => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q));
  }

  // Client-side sort: Pinned first, then Date (Firestore handles date sort, but pinning needs re-sort)
  return result.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    // If pinned status is same, Firestore already sorted by date, but safer to keep stable or re-sort
    return b.createdAt.toMillis() - a.createdAt.toMillis();
  });
});

// --- Actions ---
const openDetail = async (item: Announcement) => {
  selectedItem.value = item;

  // Mark as read locally
  if (!readIds.value.has(item.id)) {
    readIds.value.add(item.id);
    localStorage.setItem('announcementReadIds', JSON.stringify(Array.from(readIds.value)));
    
    // Increment view count in Firestore
    try {
      const docRef = doc(db, 'announcements', item.id);
      await updateDoc(docRef, {
        views: increment(1)
      });
    } catch (e) {
      console.error("Error incrementing views", e);
    }
  }
};

const closeDetail = () => {
  selectedItem.value = null;
};
</script>

<style scoped>
.fill-1 { font-variation-settings: 'FILL' 1; }
.animate-scale-in { animation: scaleIn 0.2s ease-out; }
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>