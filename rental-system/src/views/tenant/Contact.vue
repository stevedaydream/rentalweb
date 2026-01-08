<template>
  <div class="max-w-6xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          聯繫房東
        </h1>
        <p class="text-text-secondary-light">查看房東聯絡資訊或發送站內訊息</p>
      </div>
    </div>

    <div v-if="!loading && !landlordInfo.hasData" class="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-8 text-center">
       <span class="material-symbols-outlined text-5xl text-yellow-500 mb-4">link_off</span>
       <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">尚未綁定房東</h2>
       <p class="text-gray-600 dark:text-gray-400 mb-6">您目前尚未綁定任何房東，無法查看聯絡資訊或發送訊息。</p>
       <button 
         @click="$router.push({ name: 'TenantDashboard' })" 
         class="px-6 py-2 bg-primary text-white rounded-xl shadow hover:bg-blue-700 transition-colors"
       >
         前往儀表板綁定
       </button>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <div class="space-y-6">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm text-center relative overflow-hidden">
          <div class="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          
          <div class="relative z-10 mt-12 mb-4">
            <div class="w-24 h-24 mx-auto rounded-full bg-white p-1 shadow-lg">
               <div class="w-full h-full rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                 <span class="material-symbols-outlined text-4xl text-gray-400">person</span>
               </div>
            </div>
          </div>

          <div v-if="loading" class="animate-pulse space-y-3">
             <div class="h-6 bg-gray-200 rounded w-1/2 mx-auto"></div>
             <div class="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-6"></div>
          </div>

          <div v-else>
            <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
              {{ landlordInfo.name || '您的房東' }}
            </h2>
            <p class="text-sm text-text-secondary-light mb-6">您的專屬房東</p>

            <div class="space-y-4 text-left">
              <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                 <span class="material-symbols-outlined text-green-500">call</span>
                 <div class="flex-1">
                   <p class="text-xs text-text-secondary-light">聯絡電話</p>
                   <p class="font-bold text-text-primary-light">{{ landlordInfo.phone || '未提供' }}</p>
                 </div>
                 <a v-if="landlordInfo.phone" :href="`tel:${landlordInfo.phone}`" class="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-green-600 hover:text-green-700 transition-colors">
                   <span class="material-symbols-outlined text-[20px]">phone_in_talk</span>
                 </a>
              </div>

              <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                 <span class="material-symbols-outlined text-blue-500">mail</span>
                 <div class="flex-1 overflow-hidden">
                   <p class="text-xs text-text-secondary-light">電子信箱</p>
                   <p class="font-bold text-text-primary-light truncate">{{ landlordInfo.email || '未提供' }}</p>
                 </div>
                 <button v-if="landlordInfo.email" @click="copyText(landlordInfo.email)" class="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-blue-600 hover:text-blue-700 transition-colors">
                   <span class="material-symbols-outlined text-[20px]">content_copy</span>
                 </button>
              </div>

              <div v-if="landlordInfo.lineId" class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                 <span class="material-symbols-outlined text-green-600">chat</span>
                 <div class="flex-1">
                   <p class="text-xs text-text-secondary-light">Line ID</p>
                   <p class="font-bold text-text-primary-light">{{ landlordInfo.lineId }}</p>
                 </div>
                 <button @click="copyText(landlordInfo.lineId)" class="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-green-600 hover:text-green-700 transition-colors">
                   <span class="material-symbols-outlined text-[20px]">content_copy</span>
                 </button>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20 flex gap-3">
           <span class="material-symbols-outlined text-red-500">warning</span>
           <div>
             <h4 class="font-bold text-red-700 dark:text-red-300 text-sm">緊急狀況處理</h4>
             <p class="text-xs text-red-600 dark:text-red-400 mt-1">
               若發生火災、嚴重漏水或人身安全疑慮，請優先撥打 119 或直接致電房東手機，勿僅使用留言功能。
             </p>
           </div>
        </div>
      </div>

      <div class="lg:col-span-2 space-y-6">
        
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
           <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
             <span class="material-symbols-outlined text-primary">send</span>
             發送訊息
           </h3>
           
           <div class="space-y-4">
             <div>
               <label class="block text-sm font-medium text-text-secondary-light mb-1">主旨</label>
               <select v-model="form.subject" class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none text-text-primary-light dark:text-text-primary-dark">
                 <option value="合約問題">合約問題</option>
                 <option value="費用疑問">費用疑問</option>
                 <option value="生活公約">生活公約</option>
                 <option value="退租諮詢">退租諮詢</option>
                 <option value="其他事項">其他事項</option>
               </select>
             </div>
             
             <div>
               <label class="block text-sm font-medium text-text-secondary-light mb-1">內容</label>
               <textarea 
                 v-model="form.content" 
                 class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none h-32 resize-none text-text-primary-light dark:text-text-primary-dark"
                 placeholder="請輸入您想詢問的事項..."
               ></textarea>
             </div>

             <div class="flex justify-end">
               <button 
                 @click="sendMessage"
                 class="px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 :disabled="isSending || !form.content.trim()"
               >
                 <span v-if="!isSending" class="material-symbols-outlined text-[20px]">send</span>
                 <span v-else class="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                 {{ isSending ? '發送中...' : '送出訊息' }}
               </button>
             </div>
           </div>
        </div>

        <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-[500px]">
           <div class="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center flex-shrink-0">
             <h3 class="font-bold text-gray-700 dark:text-gray-200">歷史訊息紀錄</h3>
             <span v-if="history.length" class="text-xs text-text-secondary-light">共 {{ history.length }} 則</span>
           </div>
           
           <div class="flex-1 overflow-y-auto p-4 space-y-4">
             <div v-if="loadingHistory" class="p-8 text-center text-gray-400">
                <span class="material-symbols-outlined animate-spin mb-2">progress_activity</span>
                <p>載入訊息中...</p>
             </div>

             <template v-else-if="history.length > 0">
               <div v-for="msg in history" :key="msg.id" class="flex flex-col space-y-2">
                  
                  <div class="self-end max-w-[85%] sm:max-w-[75%]">
                    <div class="flex items-center justify-end gap-2 mb-1">
                      <span class="text-[10px] text-text-secondary-light">{{ formatDate(msg.createdAt) }}</span>
                      <span class="text-xs text-text-primary-light font-bold">{{ authStore.userProfile?.name || '我' }}</span>
                    </div>
                    <div class="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-sm shadow-md">
                      <div class="text-xs text-blue-100 mb-1 font-medium pb-1 border-b border-blue-500/50 inline-block">
                        #{{ msg.subject }}
                      </div>
                      <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ msg.content }}</p>
                    </div>
                    <div class="text-right mt-1">
                       <span class="text-[10px] text-gray-400" v-if="!msg.reply">已送達</span>
                    </div>
                  </div>

                  <div v-if="msg.reply" class="self-start max-w-[85%] sm:max-w-[75%] animate-in fade-in slide-in-from-left-2 duration-300">
                     <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-bold text-text-primary-light">{{ landlordInfo.name }} (房東)</span>
                        <span class="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold">回覆</span>
                     </div>
                     <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl rounded-tl-sm shadow-sm">
                        <p class="text-sm text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap leading-relaxed">{{ msg.reply }}</p>
                     </div>
                  </div>

               </div>
             </template>

             <div v-else class="h-full flex flex-col items-center justify-center text-text-secondary-light">
               <span class="material-symbols-outlined text-5xl mb-3 text-gray-200">chat_bubble_outline</span>
               <p>目前沒有歷史訊息</p>
               <p class="text-xs mt-1">有任何問題歡迎隨時詢問房東！</p>
             </div>
           </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { db } from '../../firebase/config';
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';

const authStore = useAuthStore();

// --- 狀態管理 ---
const loading = ref(true);
const loadingHistory = ref(true);
const isSending = ref(false);

const landlordInfo = reactive({
  hasData: false,
  id: '',
  name: '',
  phone: '',
  email: '',
  lineId: ''
});

const form = ref({
  subject: '合約問題',
  content: ''
});

// 訊息介面
interface Message {
  id: string;
  subject: string;
  content: string;
  reply?: string;
  createdAt: Timestamp;
  tenantId: string;
  landlordId: string;
}

const history = ref<Message[]>([]);
let unsubscribe: (() => void) | null = null;

// --- 1. 獲取房東資料 ---
const fetchLandlordInfo = async () => {
  if (!authStore.userProfile?.landlordId) {
    loading.value = false;
    return;
  }

  try {
    const landlordId = authStore.userProfile.landlordId;
    const docRef = doc(db, 'users', landlordId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      landlordInfo.hasData = true;
      landlordInfo.id = landlordId;
      landlordInfo.name = data.name || '未命名房東';
      landlordInfo.phone = data.phone || '';
      landlordInfo.email = data.email || '';
      landlordInfo.lineId = data.lineId || '';
    }
  } catch (error) {
    console.error('獲取房東資料失敗:', error);
  } finally {
    loading.value = false;
  }
};

// --- 2. 監聽訊息列表 & 處理已讀邏輯 ---
const listenToMessages = () => {
  if (!authStore.user) return;

  const q = query(
    collection(db, 'messages'),
    where('tenantId', '==', authStore.user.uid),
    orderBy('createdAt', 'asc') // 改為 asc，舊訊息在上面，像聊天室
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Message));
    
    history.value = messages;
    loadingHistory.value = false;

    // 計算有多少則訊息包含回覆
    const replyCount = messages.filter(m => m.reply).length;
    // 更新 LocalStorage，表示用戶已查看了這些回覆 (用於消除 Sidebar 紅點)
    localStorage.setItem('tenant_read_reply_count', replyCount.toString());
    // 觸發一個自定義事件，通知 Layout 更新紅點 (選用，或讓 Layout 自己的 storage event 處理)
    window.dispatchEvent(new Event('messages-read'));
    
  }, (error) => {
    console.error('監聽訊息失敗:', error);
    loadingHistory.value = false;
  });
};

// --- 3. 發送訊息 ---
const sendMessage = async () => {
  if (!form.value.content.trim() || !authStore.user || !landlordInfo.id) return;
  
  isSending.value = true;
  try {
    await addDoc(collection(db, 'messages'), {
      tenantId: authStore.user.uid,
      tenantName: authStore.userProfile?.name || '租客',
      landlordId: landlordInfo.id,
      subject: form.value.subject,
      content: form.value.content,
      createdAt: Timestamp.now(),
      isRead: false, // 房東未讀
      reply: null    // 初始無回覆
    });
    
    form.value.content = '';
    // 不需要 alert，列表會自動更新
  } catch (error) {
    console.error('發送失敗:', error);
    alert('訊息發送失敗，請檢查網路連線。');
  } finally {
    isSending.value = false;
  }
};

// --- 工具函式 ---
const formatDate = (ts: Timestamp) => {
  // [Fix] 增加 ?. 檢查，防止 serverTimestamp 尚未寫入時造成 crash
  if (!ts || !ts.toDate) return '傳送中...';
  return ts.toDate().toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const copyText = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    alert(`已複製: ${text}`);
  }).catch(() => {
    alert('複製失敗，請手動複製');
  });
};

// --- Lifecycle Hooks ---
onMounted(async () => {
  await fetchLandlordInfo();
  if (landlordInfo.hasData) {
    listenToMessages();
  } else {
    loadingHistory.value = false;
  }
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});
</script>