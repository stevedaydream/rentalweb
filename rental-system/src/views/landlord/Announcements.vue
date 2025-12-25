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

      <div class="overflow-x-auto">
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
                 {{ item.date }}
              </td>
              <td class="px-6 py-4 text-center text-text-secondary-light">
                 {{ item.views }}
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
      
      <div v-if="filteredList.length === 0" class="p-12 text-center text-text-secondary-light">
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
            class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
          >
            {{ isEditing ? '儲存變更' : '確認發布' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// --- Type Definitions ---
interface Announcement {
  id: number;
  title: string;
  category: string;
  content: string;
  date: string;
  isPinned: boolean;
  views: number;
}

// --- Mock Data ---
const list = ref<Announcement[]>([
  { id: 1, title: '【重要】大樓清洗水塔通知', category: '維修通知', content: '本大樓將於下週二 (10/31) 上午9:00至下午4:00進行水塔清洗，屆時將暫停供水，請各位住戶提早儲水備用。造成不便敬請見諒。', date: '2025/10/24', isPinned: true, views: 45 },
  { id: 2, title: '包裹代收服務調整說明', category: '一般通知', content: '即日起管理室代收包裹時間調整為每日上午8點至晚上9點，請住戶留意取件時間，以免撲空。', date: '2025/10/20', isPinned: false, views: 32 },
  { id: 3, title: '11月份社區聯誼烤肉活動', category: '活動訊息', content: '為增進住戶情誼，管委會將於 11/15 舉辦烤肉活動，歡迎至管理室報名參加！', date: '2025/10/18', isPinned: false, views: 18 },
  { id: 4, title: '垃圾分類加強稽查公告', category: '重要公告', content: '近期發現回收區有未分類垃圾，環保局將加強稽查，請住戶務必配合分類，以免受罰。', date: '2025/10/15', isPinned: false, views: 89 },
]);

// --- State ---
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
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
});

const stats = computed(() => ({
  monthCount: list.value.filter(i => i.date.startsWith('2025/10')).length,
  pinnedCount: list.value.filter(i => i.isPinned).length,
  views: list.value.reduce((acc, cur) => acc + cur.views, 0)
}));

// --- Actions ---
const openModal = (item?: Announcement) => {
  if (item) {
    isEditing.value = true;
    form.value = { ...item };
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

const saveItem = () => {
  if (!form.value.title || !form.value.content) return alert('請填寫完整內容');

  if (isEditing.value) {
    const idx = list.value.findIndex(i => i.id === form.value.id);
    if (idx !== -1) {
      list.value[idx] = { ...list.value[idx], ...form.value } as Announcement;
    }
  } else {
    const newId = Math.max(...list.value.map(i => i.id), 0) + 1;
    list.value.unshift({
      ...form.value,
      id: newId,
      date: new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      views: 0
    } as Announcement);
  }
  showModal.value = false;
};

const deleteItem = (id: number) => {
  if (confirm('確定要刪除此公告嗎？')) {
    const idx = list.value.findIndex(i => i.id === id);
    if (idx !== -1) list.value.splice(idx, 1);
  }
};

const togglePin = (item: Announcement) => {
  item.isPinned = !item.isPinned;
};
</script>

<style scoped>
.fill-1 {
  font-variation-settings: 'FILL' 1;
}
</style>