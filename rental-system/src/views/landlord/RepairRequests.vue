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
          class="px-4 py-2 bg-gold-500 text-white rounded-lg shadow-sm hover:bg-gold-600 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">build</span>
          新增報修單
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-red-200 transition-colors" @click="currentFilter = 'pending'">
        <div>
          <p class="text-sm text-text-secondary-light">待處理</p>
          <p class="text-2xl font-bold text-red-500 mt-1">{{ stats.pending }} 件</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
          <span class="material-symbols-outlined">notification_important</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-orange-200 transition-colors" @click="currentFilter = 'processing'">
        <div>
          <p class="text-sm text-text-secondary-light">處理中</p>
          <p class="text-2xl font-bold text-orange-500 mt-1">{{ stats.processing }} 件</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
          <span class="material-symbols-outlined">engineering</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-green-200 transition-colors" @click="currentFilter = 'completed'">
        <div>
          <p class="text-sm text-text-secondary-light">已完成</p>
          <p class="text-2xl font-bold text-green-600 mt-1">{{ stats.completed }} 件</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
      </div>
      <div class="p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">累積維修支出</p>
          <p class="text-2xl font-bold text-gray-700 dark:text-gray-200 mt-1">NT$ {{ stats.totalCost.toLocaleString() }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
          <span class="material-symbols-outlined">payments</span>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm overflow-hidden">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-ink-100 dark:border-ink-800 px-6 py-4 gap-4">
        <div class="flex items-center gap-2">
           <button 
            v-for="filter in filters" :key="filter.value"
            @click="currentFilter = filter.value"
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            :class="currentFilter === filter.value ? 'bg-ink-800 text-white dark:bg-white dark:text-ink-800' : 'bg-surface-light text-ink-500 hover:bg-ink-100 dark:bg-surface-dark dark:text-ink-300'"
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
            class="w-full pl-10 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none"
          >
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-surface-light dark:bg-surface-dark">
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
        <div class="p-6 border-b border-ink-100 dark:border-ink-700 flex justify-between items-center">
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

          <div class="bg-surface-light dark:bg-surface-dark p-4 rounded-xl space-y-4">
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
                <label class="block text-sm font-medium mb-1">維修費用 (自動記帳)</label>
                <input v-model.number="form.cost" type="number" class="form-input" placeholder="0">
              </div>
            </div>
            <div>
               <label class="block text-sm font-medium mb-1">房東私有備註</label>
               <textarea v-model="form.note" class="form-input h-20" placeholder="僅房東可見..."></textarea>
            </div>

            <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center">
                  <span class="material-symbols-outlined text-sm mr-1 text-blue-500">campaign</span>
                  同步發布公告通知
                </h3>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="form.isNotify" class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                </label>
              </div>
              
              <div v-if="form.isNotify" class="grid grid-cols-1 gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <div>
                  <label class="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">公告對象</label>
                  <div class="flex gap-6">
                    <label class="flex items-center text-sm cursor-pointer text-gray-700 dark:text-gray-300">
                      <input type="radio" v-model="form.notifyScope" value="room" class="mr-2 text-primary focus:ring-primary">
                      僅對應房號 ({{ form.room || '未填' }})
                    </label>
                    <label class="flex items-center text-sm cursor-pointer text-gray-700 dark:text-gray-300">
                      <input type="radio" v-model="form.notifyScope" value="all" class="mr-2 text-primary focus:ring-primary">
                      全體租客
                    </label>
                  </div>
                </div>
                  <p class="text-[11px] text-blue-500/80 italic flex items-center">
                  <span class="material-symbols-outlined text-[14px] mr-1">info</span>
                  發布後，租客將在「社區公告」中看到即時進度。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="p-6 border-t flex justify-end gap-3">
          <button v-if="isEditing" @click="deleteTicket" class="mr-auto text-red-500 font-medium hover:underline">刪除案件</button>
          <button @click="showModal = false" class="px-5 py-2">取消</button>
          <button @click="saveTicket" class="px-5 py-2 bg-gold-500 text-white rounded-xl font-bold shadow-md hover:bg-gold-600 transition-all">
            {{ isEditing ? '更新並儲存' : '提交' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { 
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, 
  doc, serverTimestamp, orderBy, where, getDocs 
} from 'firebase/firestore';

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
  landlordId?: string;
  // UI 輔助欄位
  isNotify?: boolean;
  notifyScope?: 'room' | 'all';
}

const authStore = useAuthStore();
const toast = useToastStore();
const tickets = ref<RepairTicket[]>([]);
const loading = ref(true);

let unsubscribe: (() => void) | null = null;

// [功能 1] 初始化監聽器：使用 where 過濾 landlordId，解決讀取權限問題
const initListener = (uid: string) => {
  if (unsubscribe) unsubscribe();

  loading.value = true;
  // 重要：查詢條件必須包含 landlordId 以符合 Firestore Rules
  const q = query(
    collection(db, 'repair_requests'), 
    where('landlordId', '==', uid),
    orderBy('createdAt', 'desc')
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    const newTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RepairTicket));
    
    // 偵測新案件
    if (!loading.value && newTickets.length > tickets.value.length) {
      const latest = newTickets[0];
      if (latest && latest.status === 'pending') {
        toast.info(`新報修申請：${latest.room} - ${latest.description}`);
      }
    }
    
    tickets.value = newTickets;
    loading.value = false;
  }, (err) => {
    console.error("讀取失敗 (請檢查 Console 是否有索引連結):", err);
    loading.value = false;
  });
};

// 生命週期管理
onMounted(() => {
  if (authStore.user) {
    initListener(authStore.effectiveUid);
  }
});

// 監聽登入狀態變化，防止 F5 重新整理後抓不到資料
watch(() => authStore.user, (newUser) => {
  if (newUser) {
    initListener(newUser.uid);
  } else {
    if (unsubscribe) unsubscribe();
  }
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

// [功能 2] 儲存與更新：包含權限修復、公告同步、自動記帳
const saveTicket = async () => {
  if (!form.value.room || !form.value.description) { toast.warning('請完整填寫房號與描述'); return; }
  if (!authStore.user) { toast.error('請先登入'); return; }

  const uid = authStore.effectiveUid;
   // ✅ 加入診斷 log,確認用戶資訊
  console.log('🔐 當前用戶 UID:', uid);
  console.log('👤 當前用戶完整資訊:', authStore.user);
  console.log('📝 即將寫入的資料:', {
    ...form.value,
    landlordId: uid
  });
  
  try {
    // A. 準備資料 payload (確保 landlordId 存在)
    const ticketData = { 
      ...form.value, 
      landlordId: uid // 強制寫入 ID
    };
    
    // 移除 UI 專用欄位，避免寫入 DB 報錯或髒資料
    const isNotify = ticketData.isNotify;
    const notifyScope = ticketData.notifyScope;
    delete ticketData.isNotify;
    delete ticketData.notifyScope;

    let ticketId = form.value.id;

    // B. 寫入 repair_requests 集合
    if (isEditing.value && ticketId) {
      const docRef = doc(db, 'repair_requests', ticketId);
      await updateDoc(docRef, { ...ticketData, updatedAt: serverTimestamp() });
    } else {
      const docRef = await addDoc(collection(db, 'repair_requests'), {
        ...ticketData,
        tenantName: '房東代填',
        createdAt: serverTimestamp()
      });
      ticketId = docRef.id;
    }

    // C. 同步發布公告 (若勾選)
    if (isNotify) {
      await addDoc(collection(db, 'announcements'), {
        title: `【維修通知】${form.value.room} - ${form.value.category}`,
        category: '維修通知',
        content: `房號：${form.value.room}\n項目：${form.value.category}\n狀態：${statusLabels[form.value.status as keyof typeof statusLabels]}\n說明：${form.value.description}`,
        isPinned: false,
        views: 0,
        createdAt: serverTimestamp(),
        landlordId: uid, // 確保公告也有 ID
        targetRoom: notifyScope === 'room' ? form.value.room : 'all',
        relatedRepairId: ticketId
      });
    }

    // D. 自動化記帳：若已完成且有費用，寫入 bills 集合
    if (form.value.status === 'completed' && form.value.cost && form.value.cost > 0) {
      // 檢查是否已存在關聯此報修單的帳單 (防止重複記帳)
      const qBills = query(collection(db, 'bills'), where('relatedRepairId', '==', ticketId));
      const billSnap = await getDocs(qBills);
      
      const billPayload = {
        amount: form.value.cost,
        category: '修繕費',
        date: new Date().toISOString().slice(0, 10),
        description: `維修支出: ${form.value.category} (${form.value.description})`,
        landlordId: uid,
        relatedRepairId: ticketId,
        status: 'completed',
        target: `${form.value.room}`,
        type: 'expense', // 標記為支出
        updatedAt: serverTimestamp()
      };

      const firstBillDoc = billSnap.docs[0];
      if (firstBillDoc) {
        // 更新現有支出紀錄
        await updateDoc(doc(db, 'bills', firstBillDoc.id), billPayload);
      } else {
        // 新增支出紀錄
        await addDoc(collection(db, 'bills'), {
          ...billPayload,
          createdAt: serverTimestamp(),
          history: []
        });
      }
    }

    const financeMsg = (form.value.status === 'completed' && form.value.cost) ? '，已同步記入支出帳務' : '';
    toast.success((isEditing.value ? '報修單已更新' : '報修單已新增') + financeMsg);
    showModal.value = false;
  } catch (err: any) {
    console.error('報修單操作失敗:', err);
    if (err.code === 'permission-denied') {
      toast.error('權限不足，請確認 Firestore Rules 設定');
    } else if (err.message?.includes('index')) {
      toast.error('缺少資料庫索引，請前往 Firebase Console 建立');
    } else if (err.code === 'not-found') {
      toast.error('找不到該報修單，可能已被刪除');
    } else {
      toast.error('操作失敗：' + err.message);
    }
  }
};

const deleteTicket = async () => {
  if (!form.value.id || !confirm('確定刪除？這不會刪除已產生的財務紀錄。')) return;
  try {
    await deleteDoc(doc(db, 'repair_requests', form.value.id));
    showModal.value = false;
    toast.success('報修單已刪除');
  } catch (err) {
    toast.error('刪除失敗，請稍後再試');
  }
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
  form.value = ticket 
    ? { ...ticket, isNotify: false, notifyScope: 'room' } 
    : { category: '水電設備', priority: 'medium', status: 'pending', room: '', description: '', isNotify: true, notifyScope: 'room' };
  showModal.value = true;
};

const formatDate = (ts: any) => ts?.toDate ? ts.toDate().toLocaleDateString() : '---';

// 自動判斷優先級關鍵字
watch(() => form.value.description, (newVal) => {
  if (isEditing.value || !newVal) return;
  const highKeywords = ['漏水', '停電', '火', '鎖壞', '淹水', '瓦斯'];
  if (highKeywords.some(k => newVal.includes(k))) {
    form.value.priority = 'high';
    autoDetected.value = true;
    setTimeout(() => autoDetected.value = false, 2000);
  }
});
</script>