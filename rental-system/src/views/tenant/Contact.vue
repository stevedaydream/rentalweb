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

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
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

          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">{{ landlord.name }}</h2>
          <p class="text-sm text-text-secondary-light mb-6">您的專屬房東</p>

          <div class="space-y-4 text-left">
            <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
               <span class="material-symbols-outlined text-green-500">call</span>
               <div class="flex-1">
                 <p class="text-xs text-text-secondary-light">聯絡電話</p>
                 <p class="font-bold text-text-primary-light">{{ landlord.phone }}</p>
               </div>
               <a :href="`tel:${landlord.phone}`" class="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-green-600 hover:text-green-700">
                 <span class="material-symbols-outlined text-[20px]">phone_in_talk</span>
               </a>
            </div>

            <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
               <span class="material-symbols-outlined text-blue-500">mail</span>
               <div class="flex-1 overflow-hidden">
                 <p class="text-xs text-text-secondary-light">電子信箱</p>
                 <p class="font-bold text-text-primary-light truncate">{{ landlord.email }}</p>
               </div>
               <button @click="copyText(landlord.email)" class="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-blue-600 hover:text-blue-700">
                 <span class="material-symbols-outlined text-[20px]">content_copy</span>
               </button>
            </div>

            <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
               <span class="material-symbols-outlined text-green-600">chat</span>
               <div class="flex-1">
                 <p class="text-xs text-text-secondary-light">Line ID</p>
                 <p class="font-bold text-text-primary-light">{{ landlord.lineId }}</p>
               </div>
               <button @click="copyText(landlord.lineId)" class="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-green-600 hover:text-green-700">
                 <span class="material-symbols-outlined text-[20px]">content_copy</span>
               </button>
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
               <select v-model="form.subject" class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none">
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
                 class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none h-32 resize-none"
                 placeholder="請輸入您想詢問的事項..."
               ></textarea>
             </div>

             <div class="flex justify-end">
               <button 
                 @click="sendMessage"
                 class="px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors flex items-center gap-2"
                 :disabled="isSending"
               >
                 <span v-if="!isSending" class="material-symbols-outlined text-[20px]">send</span>
                 <span v-else class="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                 {{ isSending ? '發送中...' : '送出訊息' }}
               </button>
             </div>
           </div>
        </div>

        <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
           <div class="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
             <h3 class="font-bold text-gray-700 dark:text-gray-200">歷史訊息紀錄</h3>
           </div>
           
           <div class="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto">
             <div v-for="msg in history" :key="msg.id" class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <div class="flex justify-between items-start mb-2">
                   <div class="flex items-center gap-2">
                     <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{{ msg.subject }}</span>
                     <span class="text-xs text-text-secondary-light">{{ msg.date }}</span>
                   </div>
                   <span 
                     class="text-xs px-2 py-1 rounded-full font-medium"
                     :class="msg.isReplied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                   >
                     {{ msg.isReplied ? '已回覆' : '已送出' }}
                   </span>
                </div>
                <p class="text-sm text-text-primary-light mb-2">{{ msg.content }}</p>
                
                <div v-if="msg.reply" class="mt-3 pl-4 border-l-2 border-green-500 bg-green-50 dark:bg-green-900/10 p-3 rounded-r-lg">
                   <p class="text-xs font-bold text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                     <span class="material-symbols-outlined text-[14px]">reply</span>
                     房東回覆
                   </p>
                   <p class="text-sm text-gray-700 dark:text-gray-300">{{ msg.reply }}</p>
                </div>
             </div>

             <div v-if="history.length === 0" class="p-8 text-center text-text-secondary-light">
               <p>目前沒有歷史訊息</p>
             </div>
           </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// --- Mock Data ---
const landlord = ref({
  name: '王大明',
  phone: '0912-345-678',
  email: 'landlord.wang@example.com',
  lineId: 'wang_rent_888'
});

const history = ref([
  { 
    id: 1, 
    subject: '費用疑問', 
    content: '請問本期的電費計算方式是否為夏季電價？感覺比上個月高出許多。', 
    date: '2025/10/25 14:30', 
    isReplied: true,
    reply: '您好，是的，6月至9月皆為夏季電價計費，之後會恢復正常費率。' 
  },
  { 
    id: 2, 
    subject: '生活公約', 
    content: '隔壁鄰居晚上11點後聲音有點大，能否請房東幫忙提醒？', 
    date: '2025/10/10 23:15', 
    isReplied: true,
    reply: '好的，我會再發公告提醒大家夜間降低音量，謝謝告知。' 
  }
]);

// --- Form State ---
const form = ref({
  subject: '合約問題',
  content: ''
});

const isSending = ref(false);

// --- Actions ---
const sendMessage = () => {
  if (!form.value.content) return alert('請輸入訊息內容');
  
  isSending.value = true;
  
  // 模擬 API 請求
  setTimeout(() => {
    history.value.unshift({
      id: Date.now(),
      subject: form.value.subject,
      content: form.value.content,
      date: new Date().toLocaleString('zh-TW', { hour12: false }),
      isReplied: false,
      reply: ''
    });
    
    form.value.content = ''; // 清空輸入
    isSending.value = false;
    alert('訊息已發送！');
  }, 800);
};

const copyText = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    alert(`已複製: ${text}`);
  }).catch(() => {
    alert('複製失敗，請手動複製');
  });
};
</script>