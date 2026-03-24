<template>
  <div class="p-4 pb-24 max-w-2xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">報修申請</h1>
      <button 
        @click="showNewRequest = true"
        class="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20"
      >
        + 新增報修
      </button>
    </div>

    <div class="space-y-4">
      <div v-if="loading" class="text-center py-10 text-gray-400">載入中...</div>
      <div v-else-if="requests.length === 0" class="text-center py-10 text-gray-400">目前沒有報修紀錄</div>
      
      <div 
        v-for="req in requests" 
        :key="req.id"
        class="bg-white dark:bg-card-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
      >
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ req.category }} - {{ req.title }}</h3>
            <p class="text-xs text-text-secondary-light mt-1">申請時間：{{ formatDate(req.createdAt) }}</p>
          </div>
          <span 
            :class="statusStyles[req.status]"
            class="px-3 py-1 rounded-full text-xs font-medium"
          >
            {{ statusLabels[req.status] }}
          </span>
        </div>
        <p class="text-sm text-text-secondary-light line-clamp-2">{{ req.description }}</p>
      </div>
    </div>

    <div v-if="showNewRequest" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showNewRequest = false"></div>
      <div class="relative bg-white dark:bg-card-dark w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
        <h2 class="text-xl font-bold mb-6">填寫報修單</h2>
        
        <div v-if="roomNumber" class="mb-4 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg flex items-center">
          <span class="material-symbols-outlined text-base mr-1">home</span>
          <span>自動帶入房號：{{ roomNumber }}</span>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">設備類別</label>
            <select v-model="form.category" class="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none">
              <option>水電設備</option>
              <option>家電產品</option>
              <option>房屋結構</option>
              <option>家具維修</option>
              <option>其他</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">問題標題</label>
            <input v-model="form.title" type="text" placeholder="例如：浴室蓮蓬頭漏水" class="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none">
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">詳細說明</label>
            <textarea v-model="form.description" rows="3" class="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none"></textarea>
          </div>
        </div>

        <div class="mt-8 flex gap-3">
          <button @click="showNewRequest = false" class="flex-1 py-3 text-gray-500 font-medium">取消</button>
          <button 
            @click="submitRequest" 
            :disabled="isSubmitting"
            class="flex-1 py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-50"
          >
            {{ isSubmitting ? '送出中...' : '確認送出' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
// [修改] 增加 getDocs, limit 引用
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  getDocs, 
  limit 
} from 'firebase/firestore';

const authStore = useAuthStore();
const toast = useToastStore();
const requests = ref<any[]>([]);
const loading = ref(true);
const isSubmitting = ref(false);
const showNewRequest = ref(false);
const roomNumber = ref(''); // [修改] 新增變數儲存房號

const form = ref({
  category: '水電設備',
  title: '',
  description: ''
});

const statusLabels: any = { pending: '待處理', processing: '維修中', completed: '已完成' };
const statusStyles: any = {
  pending: 'bg-orange-100 text-orange-600',
  processing: 'bg-blue-100 text-blue-600',
  completed: 'bg-green-100 text-green-600'
};

onMounted(async () => {
  if (!authStore.user) return;

  // 1. 監聽報修紀錄
  const q = query(
    collection(db, 'repair_requests'),
    where('tenantId', '==', authStore.user.uid),
    orderBy('createdAt', 'desc')
  );

  onSnapshot(q, (snapshot) => {
    requests.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    loading.value = false;
  });

  // 2. [修改] 讀取用戶合約以獲取房號
  try {
    const contractQ = query(
      collection(db, 'contracts'),
      where('tenantId', '==', authStore.user.uid),
      where('status', '==', 'active'), // 只抓有效合約
      limit(1)
    );
    const contractSnap = await getDocs(contractQ);
    if (!contractSnap.empty) {
     const data = contractSnap.docs[0]!.data();
      roomNumber.value = data.roomNumber || ''; 
    }
  } catch (err) {
    console.error('無法讀取合約資訊:', err);
  }
});

const submitRequest = async () => {
  if (!form.value.title || !form.value.description) { toast.warning('請完整填寫內容'); return; }
  
  isSubmitting.value = true;
  try {
    // [修改] 送出資料時，加入 room 欄位
    await addDoc(collection(db, 'repair_requests'), {
      tenantId: authStore.user?.uid,
      tenantName: authStore.userProfile?.name || '匿名租客',
      room: roomNumber.value || '未綁定', // 自動帶入房號
      ...form.value,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    showNewRequest.value = false;
    form.value = { category: '水電設備', title: '', description: '' };
  } catch (err) {
    console.error(err);
    toast.error('送出失敗');
  } finally {
    isSubmitting.value = false;
  }
};

const formatDate = (ts: any) => {
  if (!ts) return '傳送中...';
  return ts.toDate().toLocaleString();
};
</script>