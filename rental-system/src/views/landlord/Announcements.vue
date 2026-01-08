<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          社區公告管理
        </h1>
        <p class="text-text-secondary-light">發布大樓維護通知、重要訊息與住戶規約</p>
      </div>
      <button 
        @click="openModal()"
        class="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
      >
        <span class="material-symbols-outlined text-[18px] mr-2">campaign</span>
        發布新公告
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">本月發布</p>
          <p class="text-3xl font-extrabold text-text-primary-light dark:text-text-primary-dark mt-1">{{ stats.monthCount }}</p>
        </div>
        <div class="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
          <span class="material-symbols-outlined">calendar_month</span>
        </div>
      </div>
      <div class="p-6 bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">置頂公告</p>
          <p class="text-3xl font-extrabold text-red-500 mt-1">{{ stats.pinnedCount }}</p>
        </div>
        <div class="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600">
          <span class="material-symbols-outlined">push_pin</span>
        </div>
      </div>
      <div class="p-6 bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">總瀏覽人次</p>
          <p class="text-3xl font-extrabold text-green-600 mt-1">{{ stats.views.toLocaleString() }}</p>
        </div>
        <div class="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
          <span class="material-symbols-outlined">visibility</span>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div class="flex gap-2">
          <button 
            v-for="filter in filters" 
            :key="filter.value"
            @click="currentFilter = filter.value"
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            :class="currentFilter === filter.value ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'"
          >
            {{ filter.label }}
          </button>
        </div>
        <div class="relative w-full md:w-64">
           <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
           <input 
             v-model="searchQuery"
             type="text" 
             placeholder="搜尋公告標題..." 
             class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
           >
        </div>
      </div>

      <div class="overflow-x-auto relative min-h-[200px]">
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-card-dark/50 z-10">
           <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="px-6 py-4 w-20 text-center">狀態</th>
              <th class="px-6 py-4">標題 / 摘要</th>
              <th class="px-6 py-4 w-32">類別</th>
              <th class="px-6 py-4 w-32">發布日期</th>
              <th class="px-6 py-4 w-24 text-center">瀏覽</th>
              <th class="px-6 py-4 w-32 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="item in filteredList" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
              <td class="px-6 py-4 text-center">
                 <button 
                   @click="togglePin(item)"
                   class="transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                   :class="item.isPinned ? 'text-red-500' : 'text-gray-300'"
                   title="切換置頂"
                 >
                   <span class="material-symbols-outlined" :class="{'fill-1': item.isPinned}">push_pin</span>
                 </button>
              </td>
              <td class="px-6 py-4">
                 <p class="font-bold text-base text-text-primary-light dark:text-text-primary-dark mb-1">{{ item.title }}</p>
                 <p class="text-text-secondary-light truncate max-w-md">{{ item.content }}</p>
              </td>
              <td class="px-6 py-4">
                 <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium" :class="categoryStyles[item.category]">
                   {{ item.category }}
                 </span>
              </td>
              <td class="px-6 py-4 text-text-secondary-light whitespace-nowrap">
                 {{ formatDate(item.createdAt) }}
              </td>
              <td class="px-6 py-4 text-center text-text-secondary-light">
                 {{ item.views || 0 }}
              </td>
              <td class="px-6 py-4 text-center">
                 <div class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="openModal(item)" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button @click="deleteItem(item.id)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                 </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="!loading && filteredList.length === 0" class="p-12 text-center text-text-secondary-light">
         <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">campaign</span>
         <p>目前沒有任何公告</p>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ isEditing ? '編輯公告' : '發布新公告' }}
          </h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-4">
           <div>
             <label class="block text-sm font-medium text-text-secondary-light mb-1">公告標題</label>
             <input v-model="form.title" type="text" class="form-input text-lg font-bold" placeholder="請輸入標題">
           </div>

           <div class="grid grid-cols-2 gap-4">
             <div>
               <label class="block text-sm font-medium text-text-secondary-light mb-1">類別</label>
               <select v-model="form.category" class="form-input">
                 <option>一般通知</option>
                 <option>重要公告</option>
                 <option>維修通知</option>
                 <option>活動訊息</option>
               </select>
             </div>
             <div class="flex items-center pt-6">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" v-model="form.isPinned" class="w-5 h-5 rounded text-red-500 focus:ring-red-500 border-gray-300">
                  <span class="text-sm font-bold" :class="form.isPinned ? 'text-red-500' : 'text-gray-600'">設為置頂公告</span>
                </label>
             </div>
           </div>

           <div>
             <label class="block text-sm font-medium text-text-secondary-light mb-1">公告內容</label>
             <textarea 
               v-model="form.content" 
               class="form-input min-h-[200px] leading-relaxed" 
               placeholder="請輸入公告詳細內容..."
             ></textarea>
           </div>
           
           <div class="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg flex gap-2 items-start text-xs text-blue-700 dark:text-blue-200">
             <span class="material-symbols-outlined text-[16px] mt-0.5">send</span>
             <p>發布後，所有租客將在首頁看到此公告，且系統會發送通知提醒租客查看。</p>
           </div>
        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button 
            @click="showModal = false"
            class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors"
          >
            取消
          </button>
          <button 
            @click="saveItem"
            :disabled="submitting"
            class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <span v-if="submitting" class="material-symbols-outlined animate-spin text-sm mr-2">progress_activity</span>
            {{ isEditing ? '儲存變更' : '確認發布' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { db } from '../../firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

// --- Type Definitions ---
interface Announcement {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: Timestamp;
  isPinned: boolean;
  views: number;
}

// --- State ---
const list = ref<Announcement[]>([]);
const loading = ref(true);
const submitting = ref(false);
const currentFilter = ref('all');
const searchQuery = ref('');
const showModal = ref(false);
const isEditing = ref(false);

const form = ref<Partial<Announcement>>({
  title: '',
  category: '一般通知',
  content: '',
  isPinned: false
});

const filters = [
  { label: '全部', value: 'all' },
  { label: '重要/置頂', value: 'pinned' },
  { label: '一般通知', value: 'normal' }
];

const categoryStyles: Record<string, string> = {
  '一般通知': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  '重要公告': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  '維修通知': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  '活動訊息': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
};

let unsubscribe: (() => void) | null = null;

// --- Lifecycle ---
onMounted(() => {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  
  unsubscribe = onSnapshot(q, (snapshot) => {
    list.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Announcement));
    loading.value = false;
  }, (error) => {
    // [修改開始] 加入錯誤處理，確保沒資料或報錯時不會一直轉圈
    console.error("讀取公告失敗 (可能是缺少索引或權限問題):", error);
    loading.value = false; // 強制關閉載入狀態，讓畫面顯示「無資料」區域
    // [修改結束]
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

// --- Computed ---
const filteredList = computed(() => {
  let result = list.value;

  // Filter
  if (currentFilter.value === 'pinned') {
    result = result.filter(i => i.isPinned || i.category === '重要公告');
  } else if (currentFilter.value === 'normal') {
    result = result.filter(i => i.category === '一般通知');
  }

  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(i => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q));
  }

  // Sort: Pinned first, then Date
  return result.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    // Safe sort if timestamp is missing temporarily
    const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
});

const stats = computed(() => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return {
    monthCount: list.value.filter(i => {
       if(!i.createdAt) return false;
       const d = i.createdAt.toDate();
       return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length,
    pinnedCount: list.value.filter(i => i.isPinned).length,
    views: list.value.reduce((acc, cur) => acc + (cur.views || 0), 0)
  };
});

// --- Actions ---
const openModal = (item?: Announcement) => {
  if (item) {
    isEditing.value = true;
    // Copy data to form
    form.value = { 
      id: item.id,
      title: item.title,
      category: item.category,
      content: item.content,
      isPinned: item.isPinned
    };
  } else {
    isEditing.value = false;
    form.value = {
      title: '',
      category: '一般通知',
      content: '',
      isPinned: false
    };
  }
  showModal.value = true;
};

// ... 前面 import 保持不變

// [修改開始] saveItem 函式：確保資料格式乾淨，修復 400 錯誤
const saveItem = async () => {
  // 1. 基本驗證
  if (!form.value.title || !form.value.content) return alert('請填寫完整內容');
  
  submitting.value = true;

  try {
    // 2. 建立乾淨的 Payload (關鍵步驟)
    // 直接從 form.value 取值，而不是使用 ...spread 語法，避免將 undefined 或 Vue Proxy 傳入 Firestore
    const payload = {
      title: form.value.title,
      category: form.value.category || '一般通知', // 確保有預設值
      content: form.value.content,
      isPinned: form.value.isPinned || false      // 確保是 boolean
    };

    if (isEditing.value && form.value.id) {
      // --- 更新模式 (Update) ---
      const docRef = doc(db, 'announcements', form.value.id);
      
      // 更新時只傳送 payload，不更動 createdAt 或 views
      await updateDoc(docRef, payload);

    } else {
      // --- 新增模式 (Create) ---
      // 這裡不包含 id (Firestore 會自動產生)
      // 確保所有欄位都有值，沒有 undefined
      await addDoc(collection(db, 'announcements'), {
        ...payload,
        createdAt: serverTimestamp(),
        views: 0
      });
    }
    
    // 3. 成功後關閉視窗
    showModal.value = false;

  } catch (error: any) {
    console.error("儲存失敗 (詳細錯誤):", error);
    // 顯示更易懂的錯誤提示
    if (error.code === 'invalid-argument') {
        alert("儲存失敗：資料格式錯誤 (400)。請檢查是否有欄位為 undefined。");
    } else {
        alert(`儲存失敗：${error.message}`);
    }
  } finally {
    submitting.value = false;
  }
};
// [修改結束]

const deleteItem = async (id: string) => {
  if (confirm('確定要刪除此公告嗎？此操作無法復原。')) {
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (error) {
      console.error("Error deleting:", error);
      alert("刪除失敗");
    }
  }
};

const togglePin = async (item: Announcement) => {
  try {
    const docRef = doc(db, 'announcements', item.id);
    await updateDoc(docRef, {
      isPinned: !item.isPinned
    });
  } catch (error) {
    console.error("Error toggling pin:", error);
  }
};
</script>

<style scoped>
.fill-1 {
  font-variation-settings: 'FILL' 1;
}
</style>