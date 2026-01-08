<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          訊息中心
        </h1>
        <p class="text-text-secondary-light">查看租客詢問並進行回覆</p>
      </div>
      <div class="flex gap-2">
         <button 
           v-for="tab in tabs" 
           :key="tab.value"
           @click="currentTab = tab.value"
           class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
           :class="currentTab === tab.value 
             ? 'bg-primary text-white border-primary' 
             : 'bg-white dark:bg-card-dark text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'"
         >
           {{ tab.label }}
           <span v-if="tab.count > 0" class="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
             {{ tab.count }}
           </span>
         </button>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div class="overflow-x-auto min-h-[400px]">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th class="px-6 py-4 w-4">狀態</th>
              <th class="px-6 py-4">租客 / 房號</th>
              <th class="px-6 py-4">主旨</th>
              <th class="px-6 py-4">內容摘要</th>
              <th class="px-6 py-4">時間</th>
              <th class="px-6 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr 
              v-for="msg in filteredMessages" 
              :key="msg.id" 
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
              :class="{'bg-blue-50/50 dark:bg-blue-900/10': !msg.isRead}"
              @click="openMessage(msg)"
            >
              <td class="px-6 py-4">
                <span v-if="!msg.isRead" class="w-2.5 h-2.5 rounded-full bg-blue-500 block" title="未讀"></span>
                <span v-else-if="msg.reply" class="material-symbols-outlined text-green-500 text-[18px]" title="已回覆">check_circle</span>
                <span v-else class="material-symbols-outlined text-gray-300 text-[18px]" title="已讀">drafts</span>
              </td>
              <td class="px-6 py-4">
                <p class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ msg.tenantName }}</p>
                </td>
              <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded text-xs font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  {{ msg.subject }}
                </span>
              </td>
              <td class="px-6 py-4 text-text-secondary-light max-w-xs truncate">
                {{ msg.content }}
              </td>
              <td class="px-6 py-4 text-xs text-text-secondary-light whitespace-nowrap">
                {{ formatDate(msg.createdAt) }}
              </td>
              <td class="px-6 py-4 text-center">
                <button 
                  class="p-2 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-white dark:hover:bg-gray-700 shadow-sm opacity-0 group-hover:opacity-100"
                  @click.stop="openMessage(msg)"
                >
                  <span class="material-symbols-outlined">reply</span>
                </button>
              </td>
            </tr>
            <tr v-if="filteredMessages.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-text-secondary-light">
                 <div class="flex flex-col items-center">
                   <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">inbox</span>
                   <p>目前沒有{{ currentTab === 'unread' ? '未讀' : '' }}訊息</p>
                 </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {{ selectedMessage?.subject }}
              </span>
              <span class="text-xs text-text-secondary-light">{{ formatDate(selectedMessage?.createdAt) }}</span>
            </div>
            <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
              來自 {{ selectedMessage?.tenantName }} 的訊息
            </h2>
          </div>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-6">
          <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
             <p class="text-sm text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap leading-relaxed">
               {{ selectedMessage?.content }}
             </p>
          </div>

          <div v-if="selectedMessage?.reply && !isEditing" class="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
             <div class="flex justify-between items-center mb-2">
               <p class="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1">
                 <span class="material-symbols-outlined text-[16px]">reply</span>
                 您的回覆
               </p>
               <button @click="isEditing = true" class="text-xs text-green-600 underline">修改回覆</button>
             </div>
             <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
               {{ selectedMessage.reply }}
             </p>
          </div>

          <div v-else>
            <label class="block text-sm font-medium text-text-secondary-light mb-2">
              {{ isEditing ? '修改回覆內容' : '撰寫回覆' }}
            </label>
            <textarea 
              v-model="replyContent" 
              class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none h-32 resize-none text-text-primary-light dark:text-text-primary-dark"
              placeholder="請輸入回覆內容..."
            ></textarea>
          </div>
        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <button 
            @click="closeModal"
            class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors"
          >
            關閉
          </button>
          
          <button 
             v-if="!selectedMessage?.reply || isEditing"
             @click="sendReply"
             class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors flex items-center gap-2"
             :disabled="isSubmitting || !replyContent.trim()"
          >
             <span v-if="isSubmitting" class="material-symbols-outlined text-[18px] animate-spin">refresh</span>
             <span v-else class="material-symbols-outlined text-[18px]">send</span>
             {{ selectedMessage?.reply ? '更新回覆' : '發送回覆' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { db } from '../../firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

const authStore = useAuthStore();

// --- Types ---
interface Message {
  id: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  content: string;
  reply?: string;
  isRead: boolean;
  createdAt: any;
}

// --- State ---
const messages = ref<Message[]>([]);
const loading = ref(true);
const currentTab = ref('all');
const showModal = ref(false);
const selectedMessage = ref<Message | null>(null);
const replyContent = ref('');
const isSubmitting = ref(false);
const isEditing = ref(false);
let unsubscribe: (() => void) | null = null;

// --- Computed ---
const tabs = computed(() => [
  { label: '全部', value: 'all', count: 0 },
  { label: '未讀 / 待回覆', value: 'unread', count: messages.value.filter(m => !m.reply).length },
  { label: '已回覆', value: 'replied', count: 0 }
]);

const filteredMessages = computed(() => {
  return messages.value.filter(msg => {
    if (currentTab.value === 'all') return true;
    if (currentTab.value === 'unread') return !msg.reply; // 這裡定義「未讀」Tab 為「尚未回覆」的訊息
    if (currentTab.value === 'replied') return !!msg.reply;
    return true;
  });
});

// --- Actions ---
onMounted(() => {
  if (!authStore.user) return;
  
  // 監聽此房東的所有訊息
  const q = query(
    collection(db, 'messages'),
    where('landlordId', '==', authStore.user.uid),
    orderBy('createdAt', 'desc')
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    messages.value = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Message));
    loading.value = false;
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const openMessage = async (msg: Message) => {
  selectedMessage.value = msg;
  replyContent.value = msg.reply || '';
  isEditing.value = false;
  showModal.value = true;

  // 如果是未讀，標記為已讀
  if (!msg.isRead) {
    try {
      await updateDoc(doc(db, 'messages', msg.id), { isRead: true });
    } catch (e) {
      console.error('標記已讀失敗', e);
    }
  }
};

const closeModal = () => {
  showModal.value = false;
  selectedMessage.value = null;
  replyContent.value = '';
};

const sendReply = async () => {
  if (!selectedMessage.value || !replyContent.value.trim()) return;
  
  isSubmitting.value = true;
  try {
    const msgRef = doc(db, 'messages', selectedMessage.value.id);
    await updateDoc(msgRef, {
      reply: replyContent.value,
      replyAt: serverTimestamp(),
      isRead: true // 回覆時確保標記為已讀
    });
    
    // 更新本地狀態顯示 (雖然 snapshot 會自動更新，但為了 UX 即時性)
    selectedMessage.value.reply = replyContent.value;
    isEditing.value = false;
    alert('回覆發送成功！');
    
    // 如果是第一次回覆，關閉視窗 (可選)
    if (!isEditing.value) {
       closeModal();
    }
  } catch (error) {
    console.error('回覆失敗:', error);
    alert('發送失敗，請稍後再試');
  } finally {
    isSubmitting.value = false;
  }
};

const formatDate = (ts: any) => {
  if (!ts) return '';
  // 相容 Firebase Timestamp 與一般 Date
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>