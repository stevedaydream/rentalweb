<template>
  <div class="max-w-4xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          我的報修
        </h1>
        <p class="text-text-secondary-light">提交房屋修繕申請與追蹤處理進度</p>
      </div>
      <button 
        @click="openModal()"
        class="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
      >
        <span class="material-symbols-outlined text-[18px] mr-2">build_circle</span>
        我要報修
      </button>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div 
        @click="currentFilter = 'all'"
        class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm text-center cursor-pointer transition-all"
        :class="currentFilter === 'all' ? 'ring-2 ring-primary border-transparent' : 'hover:border-gray-300'"
      >
        <p class="text-2xl font-bold text-gray-700 dark:text-gray-200">{{ stats.total }}</p>
        <p class="text-xs text-text-secondary-light mt-1">全部紀錄</p>
      </div>
      <div 
        @click="currentFilter = 'processing'"
        class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm text-center cursor-pointer transition-all"
        :class="currentFilter === 'processing' ? 'ring-2 ring-orange-400 border-transparent' : 'hover:border-gray-300'"
      >
        <p class="text-2xl font-bold text-orange-500">{{ stats.processing }}</p>
        <p class="text-xs text-text-secondary-light mt-1">處理中</p>
      </div>
      <div 
        @click="currentFilter = 'completed'"
        class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm text-center cursor-pointer transition-all"
        :class="currentFilter === 'completed' ? 'ring-2 ring-green-500 border-transparent' : 'hover:border-gray-300'"
      >
        <p class="text-2xl font-bold text-green-600">{{ stats.completed }}</p>
        <p class="text-xs text-text-secondary-light mt-1">已完成</p>
      </div>
    </div>

    <div class="space-y-4">
      <div 
        v-for="ticket in filteredTickets" 
        :key="ticket.id" 
        class="bg-white dark:bg-card-dark p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
      >
        <div class="flex justify-between items-start mb-3">
          <div class="flex items-center gap-3">
            <span 
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :class="statusStyles[ticket.status]"
            >
              {{ statusLabels[ticket.status] }}
            </span>
            <span class="text-xs text-text-secondary-light">{{ ticket.createdAt }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {{ ticket.category }}
            </span>
          </div>
        </div>

        <h3 class="font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-2">
          {{ ticket.description }}
        </h3>

        <div v-if="ticket.images && ticket.images.length > 0" class="flex gap-2 mb-4 overflow-x-auto pb-2">
           <div 
             v-for="(img, idx) in ticket.images" 
             :key="idx" 
             class="w-16 h-16 flex-shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600"
           >
             <img :src="img" class="w-full h-full object-cover">
           </div>
        </div>

        <div v-if="ticket.contractor || ticket.response" class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-sm space-y-1">
           <div v-if="ticket.contractor" class="flex items-center gap-2">
             <span class="material-symbols-outlined text-[16px] text-blue-500">engineering</span>
             <span class="font-bold text-gray-700 dark:text-gray-200">維修廠商：</span>
             <span class="text-gray-600 dark:text-gray-400">{{ ticket.contractor }}</span>
           </div>
           <div v-if="ticket.response" class="flex items-start gap-2">
             <span class="material-symbols-outlined text-[16px] text-green-500 mt-0.5">chat</span>
             <div>
                <span class="font-bold text-gray-700 dark:text-gray-200">房東回覆：</span>
                <span class="text-gray-600 dark:text-gray-400">{{ ticket.response }}</span>
             </div>
           </div>
        </div>
      </div>

      <div v-if="filteredTickets.length === 0" class="text-center py-12">
        <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">task_alt</span>
        <p class="text-text-secondary-light">目前沒有相關報修紀錄</p>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">新增報修申請</h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-4">
          
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">問題類別</label>
            <div class="grid grid-cols-2 gap-2">
              <button 
                v-for="cat in categories" 
                :key="cat"
                @click="form.category = cat"
                class="py-2 px-3 rounded-lg text-sm border transition-all text-center"
                :class="form.category === cat ? 'border-primary bg-blue-50 text-primary font-bold' : 'border-gray-200 hover:bg-gray-50 text-gray-600'"
              >
                {{ cat }}
              </button>
            </div>
          </div>

          <div>
             <label class="block text-sm font-medium text-text-secondary-light mb-1">詳細狀況描述</label>
             <textarea 
               v-model="form.description" 
               class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all h-32" 
               placeholder="請描述發生什麼問題、發生位置..."
             ></textarea>
          </div>

          <div>
             <label class="block text-sm font-medium text-text-secondary-light mb-2">上傳照片 (選填)</label>
             <div class="flex gap-2 overflow-x-auto">
               <div v-for="(img, idx) in form.images" :key="idx" class="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border border-gray-200">
                 <img :src="img" class="w-full h-full object-cover">
                 <button @click="removeImage(idx)" class="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl">
                   <span class="material-symbols-outlined text-[14px]">close</span>
                 </button>
               </div>
               
               <div 
                 @click="mockUpload"
                 class="w-20 h-20 flex-shrink-0 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-primary hover:text-primary transition-colors"
               >
                 <span class="material-symbols-outlined text-2xl">add_a_photo</span>
                 <span class="text-[10px]">新增</span>
               </div>
             </div>
          </div>
          
          <div class="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg flex gap-2 items-start">
             <span class="material-symbols-outlined text-yellow-600 text-[18px] mt-0.5">info</span>
             <p class="text-xs text-yellow-700 dark:text-yellow-200">
               提交後，房東將會收到通知。若為緊急危險狀況（如火災、嚴重漏水），請直接撥打電話聯繫。
             </p>
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
            @click="submitForm"
            class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
          >
            送出申請
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// --- Type Definitions ---
interface Ticket {
  id: number;
  category: string;
  description: string;
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
  images: string[];
  contractor?: string;
  response?: string;
}

// --- Mock Data ---
const tickets = ref<Ticket[]>([
  {
    id: 1,
    category: '水電設備',
    description: '浴室熱水器忽冷忽熱，且有異音，擔心有危險。',
    status: 'processing',
    createdAt: '2025-10-25',
    images: ['https://images.unsplash.com/photo-1585250438634-60c7f2010879?w=150&h=150&fit=crop'],
    contractor: '大新水電行',
    response: '師傅預計週三下午過去查看。'
  },
  {
    id: 2,
    category: '家具家電',
    description: '提供的冰箱冷藏室不冷，食物容易壞掉。',
    status: 'completed',
    createdAt: '2025-10-10',
    images: [],
    response: '已更換良品冰箱。'
  }
]);

// --- State ---
const currentFilter = ref('all');
const showModal = ref(false);
const categories = ['水電設備', '家具家電', '網路訊號', '門窗鎖具', '房屋結構', '其他'];

const form = ref({
  category: '水電設備',
  description: '',
  images: [] as string[]
});

// --- Computed ---
const stats = computed(() => ({
  total: tickets.value.length,
  processing: tickets.value.filter(t => t.status === 'processing' || t.status === 'pending').length,
  completed: tickets.value.filter(t => t.status === 'completed').length
}));

const filteredTickets = computed(() => {
  if (currentFilter.value === 'all') return tickets.value;
  if (currentFilter.value === 'processing') return tickets.value.filter(t => t.status === 'processing' || t.status === 'pending');
  if (currentFilter.value === 'completed') return tickets.value.filter(t => t.status === 'completed');
  return tickets.value;
});

// --- UI Helpers ---
const statusLabels = {
  pending: '待處理',
  processing: '處理中',
  completed: '已完成'
};

const statusStyles = {
  pending: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  processing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
};

// --- Actions ---
const openModal = () => {
  form.value = {
    category: '水電設備',
    description: '',
    images: []
  };
  showModal.value = true;
};

const mockUpload = () => {
  // 模擬上傳圖片
  const mockImg = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&h=150&fit=crop';
  form.value.images.push(mockImg);
};

const removeImage = (idx: number) => {
  form.value.images.splice(idx, 1);
};

const submitForm = () => {
  if (!form.value.description) return alert('請填寫問題描述');

  const newTicket: Ticket = {
    id: Date.now(),
    category: form.value.category,
    description: form.value.description,
    status: 'pending',
    // [修復] 確保回傳 string，使用 ?? ''
    createdAt: new Date().toISOString().split('T')[0] ?? '',
    images: [...form.value.images]
  };

  tickets.value.unshift(newTicket);
  showModal.value = false;
  alert('報修申請已送出！');
};
</script>