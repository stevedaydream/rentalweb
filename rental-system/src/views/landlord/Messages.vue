<template>
  <div class="max-w-7xl mx-auto space-y-6">

    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          訊息中心
        </h1>
        <p class="text-text-secondary-light">查看租客詢問並進行回覆</p>
      </div>
      <div class="flex gap-2 flex-wrap">
         <button
           v-for="tab in tabs"
           :key="tab.value"
           @click="currentTab = tab.value"
           class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
           :class="currentTab === tab.value
             ? 'bg-gold-500 text-ink-900 border-gold-500'
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
              <th class="px-6 py-4">來源</th>
              <th class="px-6 py-4">租客</th>
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
              <!-- Source badge -->
              <td class="px-6 py-4">
                <span
                  v-if="msg.source === 'line'"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#06C755]/10 text-[#06C755] border border-[#06C755]/30"
                >
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                  LINE
                </span>
                <span v-else class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  <span class="material-symbols-outlined text-[12px]">web</span>
                  Web
                </span>
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
                  class="p-2 text-gray-400 hover:text-gold-500 transition-colors rounded-full hover:bg-white dark:hover:bg-gray-700 shadow-sm opacity-0 group-hover:opacity-100"
                  @click.stop="openMessage(msg)"
                >
                  <span class="material-symbols-outlined">reply</span>
                </button>
              </td>
            </tr>
            <tr v-if="filteredMessages.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-text-secondary-light">
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

    <!-- Reply Modal -->
    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal"></div>

      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <!-- LINE badge in modal header -->
              <span
                v-if="selectedMessage?.source === 'line'"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#06C755]/10 text-[#06C755] border border-[#06C755]/30"
              >
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                透過 LINE 傳送
              </span>
              <span class="px-2 py-0.5 rounded text-xs font-bold bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300">
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
          <!-- Message content -->
          <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
             <p class="text-sm text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap leading-relaxed">
               {{ selectedMessage?.content }}
             </p>
          </div>

          <!-- Existing reply (read-only) -->
          <div v-if="selectedMessage?.reply && !isEditing" class="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
             <div class="flex justify-between items-center mb-2">
               <p class="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1">
                 <span class="material-symbols-outlined text-[16px]">reply</span>
                 您的回覆
                 <span v-if="selectedMessage?.source === 'line'" class="ml-1 text-[#06C755]">（已發送至 LINE）</span>
               </p>
               <button @click="isEditing = true" class="text-xs text-green-600 underline">修改回覆</button>
             </div>
             <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
               {{ selectedMessage.reply }}
             </p>
          </div>

          <!-- Reply editor -->
          <div v-else>
            <label class="block text-sm font-medium text-text-secondary-light mb-2">
              {{ isEditing ? '修改回覆內容' : '撰寫回覆' }}
              <span v-if="selectedMessage?.source === 'line'" class="ml-1 text-[#06C755] font-normal">
                · 將透過 LINE Bot 發送給租客
              </span>
            </label>
            <textarea
              v-model="replyContent"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-gold-400 outline-none h-32 resize-none text-text-primary-light dark:text-text-primary-dark"
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
             class="px-5 py-2 rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             :class="selectedMessage?.source === 'line'
               ? 'bg-[#06C755] hover:bg-[#05a848] text-white shadow-green-500/30'
               : 'bg-gold-500 hover:bg-gold-600 text-ink-900 shadow-gold-500/30'"
             :disabled="isSubmitting || !replyContent.trim()"
          >
             <span v-if="isSubmitting" class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
             <template v-else>
               <svg v-if="selectedMessage?.source === 'line'" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
               <span v-else class="material-symbols-outlined text-[18px]">send</span>
             </template>
             {{ isSubmitting ? '發送中...' : (selectedMessage?.reply ? '更新回覆' : (selectedMessage?.source === 'line' ? '透過 LINE 回覆' : '發送回覆')) }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
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
const toast = useToastStore();

// --- Types ---
interface Message {
  id: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  content: string;
  reply?: string;
  replyAt?: any;
  isRead: boolean;
  createdAt: any;
  source?: 'web' | 'line';
  lineUserId?: string;
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

// Firebase Callable
const sendLineReplyFn = httpsCallable(functions, 'sendLineReply');

// --- Computed ---
const tabs = computed(() => [
  { label: '全部', value: 'all', count: 0 },
  { label: '未回覆', value: 'unread', count: messages.value.filter(m => !m.reply).length },
  { label: 'LINE', value: 'line', count: messages.value.filter(m => m.source === 'line' && !m.reply).length },
  { label: '已回覆', value: 'replied', count: 0 }
]);

const filteredMessages = computed(() => {
  return messages.value.filter(msg => {
    if (currentTab.value === 'all') return true;
    if (currentTab.value === 'unread') return !msg.reply;
    if (currentTab.value === 'line') return msg.source === 'line';
    if (currentTab.value === 'replied') return !!msg.reply;
    return true;
  });
});

// --- Actions ---
onMounted(() => {
  if (!authStore.user) return;

  const q = query(
    collection(db, 'messages'),
    where('landlordId', '==', authStore.effectiveUid),
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
    if (selectedMessage.value.source === 'line' && selectedMessage.value.lineUserId) {
      // Call Firebase Function → sends LINE push message + updates Firestore
      await sendLineReplyFn({
        messageId: selectedMessage.value.id,
        replyText: replyContent.value.trim(),
        lineUserId: selectedMessage.value.lineUserId,
      });
      selectedMessage.value.reply = replyContent.value;
      isEditing.value = false;
      toast.success('已透過 LINE 發送回覆！');
    } else {
      // Direct Firestore update for web-sourced messages
      const msgRef = doc(db, 'messages', selectedMessage.value.id);
      await updateDoc(msgRef, {
        reply: replyContent.value,
        replyAt: serverTimestamp(),
        isRead: true
      });
      selectedMessage.value.reply = replyContent.value;
      isEditing.value = false;
      toast.success('回覆發送成功！');
    }
    closeModal();
  } catch (error: any) {
    console.error('回覆失敗:', error);
    toast.error('發送失敗：' + (error.message || '請稍後再試'));
  } finally {
    isSubmitting.value = false;
  }
};

const formatDate = (ts: any) => {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>
