<template>
  <div class="max-w-7xl mx-auto space-y-6" @click="closeDropdown">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          租客列表
        </h1>
        <p class="text-text-secondary-light">管理所有租客資料、租約期限與聯繫方式</p>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center">
          <span class="material-symbols-outlined text-[18px] mr-2">download</span>
          匯出清單
        </button>
        <button 
          @click="openModal()"
          class="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">person_add</span>
          新增租客
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">在租人數</p>
          <p class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mt-1">{{ stats.total }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
          <span class="material-symbols-outlined">group</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">即將到期 (60天內)</p>
          <p class="text-2xl font-bold text-orange-600 mt-1">{{ stats.expiring }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
          <span class="material-symbols-outlined">alarm</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">逾期欠費</p>
          <p class="text-2xl font-bold text-red-600 mt-1">{{ stats.overdue }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600">
          <span class="material-symbols-outlined">gpp_bad</span>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          @click="currentFilter = filter.value"
          class="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
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
          placeholder="搜尋姓名、房號或電話..." 
          class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-visible">
      <div class="overflow-x-auto min-h-[400px]">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th class="px-6 py-4 font-semibold">租客資訊</th>
              <th class="px-6 py-4 font-semibold">承租房源</th>
              <th class="px-6 py-4 font-semibold">租賃期間</th>
              <th class="px-6 py-4 font-semibold">繳費狀態</th>
              <th class="px-6 py-4 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="tenant in filteredTenants" :key="tenant.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex-shrink-0 flex items-center justify-center text-blue-600 dark:text-blue-200 font-bold mr-3">
                    {{ tenant.name[0] }}
                  </div>
                  <div>
                    <p class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ tenant.name }}</p>
                    <p class="text-xs text-text-secondary-light mt-0.5">{{ tenant.phone }}</p>
                  </div>
                </div>
              </td>
              
              <td class="px-6 py-4">
                <div class="flex items-center">
                   <span class="material-symbols-outlined text-gray-400 mr-2 text-[18px]">meeting_room</span>
                   <span class="font-medium">{{ tenant.room }}</span>
                </div>
              </td>

              <td class="px-6 py-4">
                <div class="text-xs space-y-1">
                  <p><span class="text-text-secondary-light w-6 inline-block">起:</span> {{ tenant.leaseStart }}</p>
                  <p><span class="text-text-secondary-light w-6 inline-block">迄:</span> {{ tenant.leaseEnd }}</p>
                </div>
                <span v-if="isExpiringSoon(tenant.leaseEnd)" class="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
                   即將到期
                </span>
              </td>

              <td class="px-6 py-4">
                <span 
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="paymentStatusStyles[tenant.paymentStatus]"
                >
                  <span class="w-1.5 h-1.5 rounded-full mr-2" :class="paymentDotStyles[tenant.paymentStatus]"></span>
                  {{ paymentStatusLabels[tenant.paymentStatus] }}
                </span>
              </td>

              <td class="px-6 py-4">
                <div class="flex items-center gap-2 relative">
                  <button 
                    @click="openModal(tenant)"
                    class="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="編輯"
                  >
                    <span class="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  
                  <div class="relative">
                    <button 
                      @click.stop="toggleMenu(tenant.id)"
                      class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      :class="{ 'bg-blue-50 dark:bg-blue-900/20': activeMenuId === tenant.id }"
                      title="發送通知/訊息"
                    >
                       <span class="material-symbols-outlined text-[20px]">chat</span>
                    </button>

                    <div 
                      v-if="activeMenuId === tenant.id"
                      class="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animation-fade-in"
                      @click.stop
                    >
                      <div class="py-1">
                        <button 
                          @click="handleAction('renewal', tenant)"
                          :disabled="!checkRenewalEligible(tenant.leaseEnd)"
                          class="w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors"
                          :class="checkRenewalEligible(tenant.leaseEnd) 
                            ? 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700' 
                            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-50/50 dark:bg-gray-800'"
                        >
                          <span class="material-symbols-outlined text-[18px]">update</span>
                          <div>
                            <span class="font-medium">續租詢問提醒</span>
                            <p class="text-[10px] opacity-70" v-if="!checkRenewalEligible(tenant.leaseEnd)">合約未臨近到期 (3個月內)</p>
                          </div>
                        </button>

                        <div class="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                        <button 
                           @click="handleAction('payment', tenant)"
                           class="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                        >
                          <span class="material-symbols-outlined text-[18px] text-blue-500">notifications</span>
                          <span>發送繳費通知</span>
                        </button>

                        <button 
                           @click="handleAction('overdue', tenant)"
                           :disabled="tenant.paymentStatus !== 'overdue'"
                           class="w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors"
                           :class="tenant.paymentStatus === 'overdue'
                             ? 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700' 
                             : 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-50/50 dark:bg-gray-800'"
                        >
                          <span class="material-symbols-outlined text-[18px]" :class="tenant.paymentStatus === 'overdue' ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'">warning</span>
                          <div>
                             <span class="font-medium">發送欠費催繳</span>
                             <p class="text-[10px] opacity-70" v-if="tenant.paymentStatus !== 'overdue'">目前無逾期款項</p>
                          </div>
                        </button>

                         <div class="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                        <button 
                           @click="handleAction('chat', tenant)"
                           class="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                        >
                          <span class="material-symbols-outlined text-[18px] text-green-500">chat_bubble</span>
                          <span>站內聊天訊息通知</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="filteredTenants.length === 0" class="p-12 text-center text-text-secondary-light">
         <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">person_off</span>
         <p>找不到符合條件的租客</p>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ isEditing ? '編輯租客資料' : '新增租客' }}
          </h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">姓名</label>
              <input v-model="form.name" type="text" class="form-input" placeholder="租客姓名">
            </div>
            <div>
               <label class="block text-sm font-medium text-text-secondary-light mb-1">承租房源</label>
               <select v-model="form.room" class="form-input">
                 <option value="" disabled>選擇房間</option>
                 <option v-for="r in availableRooms" :key="r" :value="r">{{ r }}</option>
               </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">聯絡電話</label>
            <input v-model="form.phone" type="tel" class="form-input" placeholder="0912-345-678">
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">電子郵件 (選填)</label>
            <input v-model="form.email" type="email" class="form-input" placeholder="tenant@example.com">
          </div>

          <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
             <p class="text-xs font-bold text-text-secondary-light uppercase mb-3">租約設定</p>
             <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">起租日</label>
                  <input v-model="form.leaseStart" type="date" class="form-input">
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">到期日</label>
                  <input v-model="form.leaseEnd" type="date" class="form-input">
                </div>
             </div>
          </div>
          
           <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
             <p class="text-xs font-bold text-text-secondary-light uppercase mb-3">其他資訊</p>
             <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">緊急聯絡人</label>
                  <input v-model="form.emergencyContact" type="text" class="form-input" placeholder="姓名 - 關係 - 電話">
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">備註</label>
                  <textarea v-model="form.note" class="form-input min-h-[80px]" placeholder="例如：養一隻貓、習慣晚歸..."></textarea>
                </div>
             </div>
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
            @click="saveTenant"
            class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
          >
            {{ isEditing ? '儲存變更' : '新增租客' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// --- Type Definitions ---
interface Tenant {
  id: number;
  name: string;
  room: string;
  phone: string;
  email?: string;
  leaseStart: string;
  leaseEnd: string;
  paymentStatus: 'normal' | 'overdue' | 'unpaid';
  emergencyContact?: string;
  note?: string;
}

// --- Mock Data ---
const availableRooms = ['A-101', 'A-102', 'B-201', 'B-202', 'C-301']; 

const tenants = ref<Tenant[]>([
  { 
    id: 1, name: '陳小明', room: 'A-101', phone: '0912-345-678', 
    leaseStart: '2025-01-01', leaseEnd: '2026-01-01', paymentStatus: 'normal',
    note: '生活作息正常' 
  },
  { 
    id: 2, name: '林美麗', room: 'B-201', phone: '0988-777-666', 
    leaseStart: '2024-06-01', leaseEnd: '2025-06-01', paymentStatus: 'overdue',
    emergencyContact: '林爸爸 (父) 0911-222-333'
  },
  { 
    id: 3, name: '王大同', room: 'C-301', phone: '0955-444-333', 
    leaseStart: '2024-11-15', leaseEnd: '2025-11-15', paymentStatus: 'unpaid' 
  },
  { 
    id: 4, name: '張志豪', room: 'A-102', phone: '0922-111-000', 
    leaseStart: '2024-01-01', leaseEnd: '2024-12-31', paymentStatus: 'normal' 
  },
]);

// --- Stats Calculation ---
const stats = computed(() => {
  const today = new Date();
  const sixtyDaysLater = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  
  return {
    total: tenants.value.length,
    expiring: tenants.value.filter(t => {
      const endDate = new Date(t.leaseEnd);
      return endDate >= today && endDate <= sixtyDaysLater;
    }).length,
    overdue: tenants.value.filter(t => t.paymentStatus === 'overdue').length
  };
});

// --- Helper Functions ---
const isExpiringSoon = (dateStr: string) => {
  const today = new Date();
  const targetDate = new Date(dateStr);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 60;
};

// Check if lease is ending within 3 months (90 days)
const checkRenewalEligible = (dateStr: string) => {
  const today = new Date();
  const endDate = new Date(dateStr);
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 90;
};

// --- Dropdown Logic ---
const activeMenuId = ref<number | null>(null);

const toggleMenu = (id: number) => {
  if (activeMenuId.value === id) {
    activeMenuId.value = null;
  } else {
    activeMenuId.value = id;
  }
};

const closeDropdown = () => {
  activeMenuId.value = null;
};

// --- Action Handlers ---
const handleAction = (type: string, tenant: Tenant) => {
  activeMenuId.value = null; // Close menu first
  
  switch(type) {
    case 'renewal':
      alert(`已向租客 ${tenant.name} 發送「續租詢問」通知。\n(系統將自動帶入合約到期日: ${tenant.leaseEnd})`);
      break;
    case 'payment':
      alert(`已向租客 ${tenant.name} 發送「繳費提醒」通知。`);
      break;
    case 'overdue':
      alert(`已向租客 ${tenant.name} 發送「欠費催繳」警告！`);
      break;
    case 'chat':
      alert(`已發送站內訊息通知給 ${tenant.name}，請留意對話視窗。`);
      break;
  }
};

// --- Filters & Search ---
const currentFilter = ref('all');
const searchQuery = ref('');

const filters = [
  { label: '全部租客', value: 'all' },
  { label: '繳費正常', value: 'normal' },
  { label: '逾期/欠費', value: 'issue' },
];

const paymentStatusLabels = {
  normal: '繳費正常',
  unpaid: '本期未繳',
  overdue: '逾期欠費'
};

const paymentStatusStyles = {
  normal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  unpaid: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
};

const paymentDotStyles = {
  normal: 'bg-green-500',
  unpaid: 'bg-yellow-500',
  overdue: 'bg-red-500'
};

const filteredTenants = computed(() => {
  return tenants.value.filter(t => {
    // Search
    const q = searchQuery.value.toLowerCase();
    const matchSearch = t.name.toLowerCase().includes(q) || 
                        t.room.toLowerCase().includes(q) || 
                        t.phone.includes(q);
    if (!matchSearch) return false;

    // Filter
    if (currentFilter.value === 'all') return true;
    if (currentFilter.value === 'normal') return t.paymentStatus === 'normal';
    if (currentFilter.value === 'issue') return ['overdue', 'unpaid'].includes(t.paymentStatus);
    
    return true;
  });
});

// --- Modal Logic ---
const showModal = ref(false);
const isEditing = ref(false);
const form = ref<Partial<Tenant>>({
  name: '',
  room: '',
  phone: '',
  email: '',
  leaseStart: '',
  leaseEnd: '',
  paymentStatus: 'normal',
  emergencyContact: '',
  note: ''
});

const openModal = (tenant?: Tenant) => {
  if (tenant) {
    isEditing.value = true;
    form.value = { ...tenant };
  } else {
    isEditing.value = false;
    form.value = {
      name: '',
      room: '',
      phone: '',
      leaseStart: '',
      leaseEnd: '',
      paymentStatus: 'normal'
    };
  }
  showModal.value = true;
};

const saveTenant = () => {
  if (!form.value.name || !form.value.room) return alert('請填寫完整資料');
  
  if (isEditing.value) {
    const index = tenants.value.findIndex(t => t.id === form.value.id);
    if (index !== -1) {
      tenants.value[index] = { ...tenants.value[index], ...form.value } as Tenant;
    }
  } else {
    const newId = Math.max(...tenants.value.map(t => t.id), 0) + 1;
    tenants.value.push({
      ...form.value,
      id: newId
    } as Tenant);
  }
  showModal.value = false;
};
</script>

<style scoped>
.animation-fade-in {
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>