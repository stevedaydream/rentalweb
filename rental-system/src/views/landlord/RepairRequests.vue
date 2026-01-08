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
          <p class="text-sm text-text-secondary-light">已完成</p>
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
            v-for="filter in filters" :key="filter.value"
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
            placeholder="搜尋房號、描述..." 
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
                <span :class="priorityStyles[ticket.priority]" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase">
                  {{ priorityLabels[ticket.priority] }}
                </span>
              </td>
              <td class="px-6 py-4">
                <p class="font-bold text-text-primary-light">{{ ticket.room || '未填' }}</p>
                <p class="text-xs text-text-secondary-light">{{ ticket.tenantName }}</p>
              </td>
              <td class="px-6 py-4">{{ ticket.category }}</td>
              <td class="px-6 py-4 max-w-xs truncate" :title="ticket.description">{{ ticket.description }}</td>
              <td class="px-6 py-4 whitespace-nowrap">{{ formatDate(ticket.createdAt) }}</td>
              <td class="px-6 py-4 text-center">
                <span :class="statusStyles[ticket.status]" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium">
                  <span class="w-1.5 h-1.5 rounded-full mr-2" :class="statusDotStyles[ticket.status]"></span>
                  {{ statusLabels[ticket.status] }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                 <button @click="openModal(ticket)" class="text-blue-600 hover:text-blue-800 font-medium text-sm">處理</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" class="p-12 text-center text-gray-400">載入中...</div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold">{{ isEditing ? '處理報修單' : '新增報修' }}</h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600"><span class="material-symbols-outlined">close</span></button>
        </div>

        <div class="p-6 overflow-y-auto space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">房號</label>
                <input v-model="form.room" type="text" class="form-input" placeholder="例如: A-101">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">類別</label>
                <select v-model="form.category" class="form-input">
                  <option>水電設備</option>
                  <option>家電產品</option>
                  <option>房屋結構</option>
                  <option>家具維修</option>
                  <option>其他</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1 flex justify-between">
                  優先級 <span v-if="autoDetected" class="text-xs text-blue-500 animate-pulse">系統自動判斷</span>
                </label>
                <select v-model="form.priority" class="form-input">
                  <option value="low">低 (一般)</option>
                  <option value="medium">中 (需留意)</option>
                  <option value="high">高 (緊急)</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">問題描述</label>
              <textarea v-model="form.description" class="form-input h-32"></textarea>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">進度狀態</label>
                <select v-model="form.status" class="form-input">
                  <option value="pending">待處理</option>
                  <option value="processing">處理中</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
              <div v-if="form.status === 'completed'">
                <label class="block text-sm font-medium mb-1">維修費用</label>
                <input v-model.number="form.cost" type="number" class="form-input" placeholder="0">
              </div>
            </div>
            <div>
               <label class="block text-sm font-medium mb-1">房東私有備註</label>
               <textarea v-model="form.note" class="form-input h-20" placeholder="僅房東可見..."></textarea>
            </div>
          </div>
        </div>

        <div class="p-6 border-t flex justify-end gap-3">
          <button v-if="isEditing" @click="deleteTicket" class="mr-auto text-red-500 font-medium">刪除</button>
          <button @click="showModal = false" class="px-5 py-2">取消</button>
          <button @click="saveTicket" class="px-5 py-2 bg-primary text-white rounded-xl font-bold shadow-lg">
            {{ isEditing ? '更新進度' : '提交' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { db } from '../../firebase/config';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';

interface RepairTicket {
  id: string;
  room: string;
  tenantName: string;
  category: string;
  description: string;
  status: 'pending' | 'processing' | 'completed';
  priority: 'high' | 'medium' | 'low';
  createdAt: any;
  cost?: number;
  note?: string;
}

const tickets = ref<RepairTicket[]>([]);
const loading = ref(true);

// 1. 實時監聽報修單
onMounted(() => {
  const q = query(collection(db, 'repair_requests'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    const newTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RepairTicket));
    
    // [Alert 整合]：偵測是否有新的 pending 案件
    if (!loading.value && newTickets.length > tickets.value.length) {
      const latest = newTickets[0];
      if (latest && latest.status === 'pending') {
        alert(`🔔 收到新報修申請！\n房號：${latest.room}\n內容：${latest.description}`);
      }
    }
    
    tickets.value = newTickets;
    loading.value = false;
  });
});

// 2. 儲存與更新
const saveTicket = async () => {
  if (!form.value.room || !form.value.description) return alert('請完整填寫');
  
  try {
    if (isEditing.value && form.value.id) {
      const docRef = doc(db, 'repair_requests', form.value.id);
      await updateDoc(docRef, { ...form.value, updatedAt: serverTimestamp() });
      alert('更新成功');
    } else {
      await addDoc(collection(db, 'repair_requests'), {
        ...form.value,
        tenantName: '房東代填',
        createdAt: serverTimestamp()
      });
      alert('新增成功');
    }
    showModal.value = false;
  } catch (err) {
    alert('操作失敗');
  }
};

const deleteTicket = async () => {
  if (!form.value.id || !confirm('確定刪除？')) return;
  await deleteDoc(doc(db, 'repair_requests', form.value.id));
  showModal.value = false;
};

// UI 邏輯
const currentFilter = ref('all');
const searchQuery = ref('');
const showModal = ref(false);
const isEditing = ref(false);
const autoDetected = ref(false);
const form = ref<Partial<RepairTicket>>({});

const priorityLabels = { high: '緊急', medium: '一般', low: '次要' };
const priorityStyles = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-blue-100 text-blue-700'
};
const statusLabels = { pending: '待處理', processing: '處理中', completed: '已完成' };
const statusStyles = { pending: 'bg-red-50 text-red-700', processing: 'bg-orange-50 text-orange-700', completed: 'bg-green-50 text-green-700' };
const statusDotStyles = { pending: 'bg-red-500', processing: 'bg-orange-500', completed: 'bg-green-500' };
const filters = [{ label: '全部', value: 'all' }, { label: '待處理', value: 'pending' }, { label: '處理中', value: 'processing' }, { label: '已完成', value: 'completed' }];

const stats = computed(() => ({
  pending: tickets.value.filter(t => t.status === 'pending').length,
  processing: tickets.value.filter(t => t.status === 'processing').length,
  completed: tickets.value.filter(t => t.status === 'completed').length,
  totalCost: tickets.value.reduce((sum, t) => sum + (t.cost || 0), 0)
}));

const filteredTickets = computed(() => {
  return tickets.value.filter(t => {
    if (currentFilter.value !== 'all' && t.status !== currentFilter.value) return false;
    const q = searchQuery.value.toLowerCase();
    return t.room?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
  });
});

const openModal = (ticket?: RepairTicket) => {
  isEditing.value = !!ticket;
  form.value = ticket ? { ...ticket } : { category: '水電設備', priority: 'medium', status: 'pending', room: '', description: '' };
  showModal.value = true;
};

const formatDate = (ts: any) => ts?.toDate ? ts.toDate().toLocaleDateString() : '---';

// 自動判斷優先級關鍵字
watch(() => form.value.description, (newVal) => {
  if (isEditing.value || !newVal) return;
  const highKeywords = ['漏水', '停電', '火', '鎖壞', '淹水'];
  if (highKeywords.some(k => newVal.includes(k))) {
    form.value.priority = 'high';
    autoDetected.value = true;
    setTimeout(() => autoDetected.value = false, 2000);
  }
});
</script>