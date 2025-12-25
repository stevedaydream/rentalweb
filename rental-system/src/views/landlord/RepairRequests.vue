<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          報修管理
        </h1>
        <p class="text-text-secondary-light">追蹤租客報修案件與維護修繕進度</p>
      </div>
      <div class="flex gap-3">
        <button 
          @click="openModal()"
          class="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">build</span>
          新增報修單
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-red-200 transition-colors" @click="currentFilter = 'pending'">
        <div>
          <p class="text-sm text-text-secondary-light">待處理</p>
          <p class="text-2xl font-bold text-red-500 mt-1">{{ stats.pending }} 件</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
          <span class="material-symbols-outlined">notification_important</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-orange-200 transition-colors" @click="currentFilter = 'processing'">
        <div>
          <p class="text-sm text-text-secondary-light">處理中</p>
          <p class="text-2xl font-bold text-orange-500 mt-1">{{ stats.processing }} 件</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
          <span class="material-symbols-outlined">engineering</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-green-200 transition-colors" @click="currentFilter = 'completed'">
        <div>
          <p class="text-sm text-text-secondary-light">已完成 (本月)</p>
          <p class="text-2xl font-bold text-green-600 mt-1">{{ stats.completed }} 件</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
      </div>
      <div class="p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">累積維修支出</p>
          <p class="text-2xl font-bold text-gray-700 dark:text-gray-200 mt-1">NT$ {{ stats.totalCost.toLocaleString() }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
          <span class="material-symbols-outlined">payments</span>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4 gap-4">
        <div class="flex items-center gap-2">
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
        <div class="relative w-full sm:w-64">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="搜尋房號、描述或廠商..." 
            class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="px-6 py-4">優先級</th>
              <th class="px-6 py-4">房號 / 租客</th>
              <th class="px-6 py-4">類別</th>
              <th class="px-6 py-4">問題描述</th>
              <th class="px-6 py-4">提交日期</th>
              <th class="px-6 py-4 text-center">狀態</th>
              <th class="px-6 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="ticket in filteredTickets" :key="ticket.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4">
                <span 
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide"
                  :class="priorityStyles[ticket.priority]"
                >
                  {{ priorityLabels[ticket.priority] }}
                </span>
              </td>
              <td class="px-6 py-4">
                <p class="font-bold text-text-primary-light">{{ ticket.room }}</p>
                <p class="text-xs text-text-secondary-light">{{ ticket.tenantName }}</p>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[18px] text-gray-400">{{ categoryIcons[ticket.category] || 'help' }}</span>
                  <span>{{ ticket.category }}</span>
                </div>
              </td>
              <td class="px-6 py-4 max-w-xs truncate text-text-secondary-light" :title="ticket.description">
                {{ ticket.description }}
              </td>
              <td class="px-6 py-4 text-text-secondary-light whitespace-nowrap">
                {{ ticket.createdAt }}
              </td>
              <td class="px-6 py-4 text-center">
                <span 
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="statusStyles[ticket.status]"
                >
                  <span class="w-1.5 h-1.5 rounded-full mr-2" :class="statusDotStyles[ticket.status]"></span>
                  {{ statusLabels[ticket.status] }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                 <button 
                   @click="openModal(ticket)"
                   class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm transition-colors"
                 >
                   處理
                 </button>
              </td>
            </tr>
            
            <tr v-if="filteredTickets.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-text-secondary-light">
                 <div class="flex flex-col items-center">
                   <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">task_alt</span>
                   <p>目前沒有符合的報修單</p>
                 </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ isEditing ? '處理報修單' : '新增報修' }}
          </h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-6">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">房號 / 租客</label>
                <input v-model="form.room" type="text" class="form-input" placeholder="例如: A-101" :disabled="isEditing">
              </div>
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">報修類別</label>
                <select v-model="form.category" class="form-input" :disabled="isEditing">
                  <option>水電設備</option>
                  <option>家具家電</option>
                  <option>網路訊號</option>
                  <option>門窗鎖具</option>
                  <option>房屋結構</option>
                  <option>其他</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1 flex justify-between">
                  優先級 
                  <span v-if="autoDetected" class="text-xs text-blue-500 font-bold bg-blue-50 px-2 rounded-full animate-pulse">
                     系統已自動判斷
                  </span>
                </label>
                <select v-model="form.priority" class="form-input">
                  <option value="low">低 (一般)</option>
                  <option value="medium">中 (需留意)</option>
                  <option value="high">高 (緊急)</option>
                </select>
              </div>
            </div>

            <div class="space-y-4">
               <div>
                 <label class="block text-sm font-medium text-text-secondary-light mb-1">問題描述</label>
                 <textarea 
                    v-model="form.description" 
                    class="form-input h-32" 
                    placeholder="請詳細描述問題狀況..." 
                    :disabled="isEditing"
                 ></textarea>
               </div>
               
               <div v-if="isEditing && form.images?.length" class="flex gap-2 overflow-x-auto pb-2">
                 <div v-for="(img, idx) in form.images" :key="idx" class="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                   <img :src="img" class="w-full h-full object-cover">
                 </div>
               </div>
               <div v-else-if="!isEditing">
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">上傳照片 (模擬)</label>
                  <div class="border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center text-gray-400 text-sm">
                    點擊上傳照片
                  </div>
               </div>
            </div>
          </div>

          <div class="border-t border-gray-100 dark:border-gray-700 my-2"></div>

          <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-4 border border-gray-100 dark:border-gray-700">
            <h3 class="font-bold text-text-primary-light flex items-center gap-2">
              <span class="material-symbols-outlined text-blue-500">manage_accounts</span>
              處理進度與紀錄
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">當前狀態</label>
                <select v-model="form.status" class="form-input">
                  <option value="pending">待處理 (Pending)</option>
                  <option value="processing">處理中 (Processing)</option>
                  <option value="completed">已完成 (Completed)</option>
                  <option value="cancelled">已取消 (Cancelled)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">維修廠商 / 師傅 (選填)</label>
                <input v-model="form.contractor" type="text" class="form-input" placeholder="例如: 陳師傅水電">
              </div>
            </div>

            <div v-if="form.status === 'completed'" class="animation-fade-in">
              <label class="block text-sm font-medium text-text-secondary-light mb-1">維修費用 (NT$)</label>
              <div class="flex gap-4 items-center">
                <input v-model.number="form.cost" type="number" class="form-input" placeholder="0">
                <div class="flex items-center gap-2 whitespace-nowrap">
                  <input type="checkbox" id="syncExpense" v-model="syncToFinancials" class="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary">
                  <label for="syncExpense" class="text-sm text-text-secondary-light cursor-pointer select-none">同步至帳務支出</label>
                </div>
              </div>
              <p class="text-xs text-orange-500 mt-1" v-if="syncToFinancials">
                * 儲存後將自動在帳務系統新增一筆「修繕費」支出紀錄。
              </p>
            </div>
            
            <div>
               <label class="block text-sm font-medium text-text-secondary-light mb-1">房東備註 (僅房東可見)</label>
               <textarea v-model="form.note" class="form-input h-20" placeholder="紀錄處理細節..."></textarea>
            </div>
          </div>

        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button 
            v-if="isEditing"
            @click="deleteTicket"
            class="mr-auto px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl font-medium transition-colors"
          >
            刪除
          </button>

          <button 
            @click="showModal = false"
            class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors"
          >
            取消
          </button>
          <button 
            @click="saveTicket"
            class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
          >
            {{ isEditing ? '更新進度' : '提交報修' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

// --- Types ---
interface RepairTicket {
  id: number;
  room: string;
  tenantName: string;
  category: string;
  description: string;
  images: string[];
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  contractor?: string;
  cost?: number;
  note?: string;
}

// --- Mock Data ---
const tickets = ref<RepairTicket[]>([
  { 
    id: 1, room: 'A-101', tenantName: '陳小明', category: '水電設備', 
    description: '浴室洗手台下方水管漏水，地板積水嚴重', 
    images: ['https://images.unsplash.com/photo-1585250438634-60c7f2010879?w=150&h=150&fit=crop'],
    status: 'pending', priority: 'high', createdAt: '2025-10-24' 
  },
  { 
    id: 2, room: 'B-201', tenantName: '林美麗', category: '家電家具', 
    description: '冷氣不冷，而且運轉聲音很大', 
    images: [],
    status: 'processing', priority: 'medium', createdAt: '2025-10-23',
    contractor: '大金空調原廠', note: '已預約 10/26 下午維修'
  },
  { 
    id: 3, room: 'C-301', tenantName: '王大同', category: '網路訊號', 
    description: 'Wi-Fi 連不上，重開機也沒用', 
    images: [],
    status: 'completed', priority: 'low', createdAt: '2025-10-20',
    contractor: '中華電信', cost: 0, note: '數據機重置後恢復正常'
  },
]);

// --- Filters & Search ---
const currentFilter = ref('all');
const searchQuery = ref('');

const filters = [
  { label: '全部', value: 'all' },
  { label: '待處理', value: 'pending' },
  { label: '處理中', value: 'processing' },
  { label: '已完成', value: 'completed' }
];

// --- Stats Logic ---
const stats = computed(() => {
  return {
    pending: tickets.value.filter(t => t.status === 'pending').length,
    processing: tickets.value.filter(t => t.status === 'processing').length,
    completed: tickets.value.filter(t => t.status === 'completed').length,
    totalCost: tickets.value.reduce((sum, t) => sum + (t.cost || 0), 0)
  };
});

// --- Filtered Data ---
const filteredTickets = computed(() => {
  return tickets.value.filter(t => {
    // Status Filter
    if (currentFilter.value !== 'all' && t.status !== currentFilter.value) return false;
    
    // Search
    const q = searchQuery.value.toLowerCase();
    const match = t.room.toLowerCase().includes(q) || 
                  t.description.toLowerCase().includes(q) ||
                  (t.contractor || '').toLowerCase().includes(q);
    return match;
  }).sort((a, b) => {
    // Sort by priority (High first) then Date
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

// --- UI Helpers ---
const priorityLabels = { high: '緊急', medium: '一般', low: '次要' };
const priorityStyles = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
};

const statusLabels = { pending: '待處理', processing: '處理中', completed: '已完成', cancelled: '已取消' };
const statusStyles = {
  pending: 'bg-red-50 text-red-700',
  processing: 'bg-orange-50 text-orange-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600'
};
const statusDotStyles = {
  pending: 'bg-red-500',
  processing: 'bg-orange-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-500'
};

const categoryIcons: Record<string, string> = {
  '水電設備': 'plumbing',
  '家具家電': 'ac_unit',
  '網路訊號': 'wifi',
  '門窗鎖具': 'door_front',
  '房屋結構': 'foundation',
  '其他': 'build'
};

// --- Modal Logic ---
const showModal = ref(false);
const isEditing = ref(false);
const syncToFinancials = ref(false);
const autoDetected = ref(false); // [NEW] Flag for auto-detect

const form = ref<Partial<RepairTicket>>({
  room: '',
  category: '水電設備',
  description: '',
  priority: 'medium',
  status: 'pending',
  contractor: '',
  cost: undefined,
  note: '',
  images: []
});

// [NEW] Keyword Lists
const HIGH_PRIORITY_KEYWORDS = ['漏水', '淹水', '沒水', '停電', '跳電', '沒電', '火', '煙', '門鎖', '鎖壞', '無法鎖', '遭竊', '危險', '破裂', '受傷'];
const MEDIUM_PRIORITY_KEYWORDS = ['冷氣', '不冷', '熱水器', '瓦斯', '網路', '斷線', '異音', '噪音'];

// [NEW] Auto-detect function
const detectPriority = () => {
  if (isEditing.value) return; // Don't override if editing existing ticket

  const desc = form.value.description || '';
  const cat = form.value.category || '';
  let newPriority: 'high' | 'medium' | 'low' = 'low';

  // 1. Check Keywords (Highest precedence)
  if (HIGH_PRIORITY_KEYWORDS.some(k => desc.includes(k))) {
    newPriority = 'high';
  } else if (MEDIUM_PRIORITY_KEYWORDS.some(k => desc.includes(k))) {
    newPriority = 'medium';
  } else {
    // 2. Check Category Baseline
    if (cat === '水電設備' || cat === '門窗鎖具' || cat === '房屋結構') {
      newPriority = 'medium'; // Baseline for these categories
    } else {
      newPriority = 'low';
    }
  }

  // Update if different
  if (form.value.priority !== newPriority) {
    form.value.priority = newPriority;
    autoDetected.value = true;
    
    // Reset notification flag after 2 seconds
    setTimeout(() => {
      autoDetected.value = false;
    }, 2000);
  }
};

// [NEW] Watchers
watch(() => form.value.description, detectPriority);
watch(() => form.value.category, detectPriority);


const openModal = (ticket?: RepairTicket) => {
  syncToFinancials.value = false;
  autoDetected.value = false;
  if (ticket) {
    isEditing.value = true;
    form.value = JSON.parse(JSON.stringify(ticket));
  } else {
    isEditing.value = false;
    form.value = {
      room: '',
      category: '水電設備',
      description: '',
      priority: 'medium',
      status: 'pending',
      contractor: '',
      cost: undefined,
      note: '',
      images: []
    };
  }
  showModal.value = true;
};

const saveTicket = () => {
  if (!form.value.room || !form.value.description) return alert('請填寫完整資料');

  if (isEditing.value) {
    const index = tickets.value.findIndex(t => t.id === form.value.id);
    if (index !== -1) {
      tickets.value[index] = { ...tickets.value[index], ...form.value } as RepairTicket;
      
      if (form.value.status === 'completed' && form.value.cost && syncToFinancials.value) {
        alert(`系統提示：\n已自動在帳務系統新增一筆支出：\n類別：修繕費\n金額：$${form.value.cost}\n備註：維修 ${form.value.room} - ${form.value.category}`);
      }
    }
  } else {
    const newId = Math.max(...tickets.value.map(t => t.id), 0) + 1;
    tickets.value.unshift({
      ...form.value,
      id: newId,
      tenantName: '房東代填', // Mock
      createdAt: new Date().toISOString().split('T')[0]
    } as RepairTicket);
  }
  showModal.value = false;
};

const deleteTicket = () => {
  if (confirm('確定要刪除此報修單嗎？')) {
    const index = tickets.value.findIndex(t => t.id === form.value.id);
    if (index !== -1) tickets.value.splice(index, 1);
    showModal.value = false;
  }
};
</script>

<style scoped>
.animation-fade-in {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>