<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
            早安，{{ userProfile.name }}
          </h1>
          <button 
            @click="openProfileModal"
            class="text-gray-400 hover:text-primary transition-colors p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
            title="編輯個人資料"
          >
            <span class="material-symbols-outlined text-[20px]">edit_square</span>
          </button>
        </div>
        <p class="text-text-secondary-light">歡迎回到您的家</p>
      </div>
      <div class="text-right hidden md:block">
        <p class="text-sm font-bold text-text-primary-light">{{ todayDate }}</p>
        <p class="text-xs text-text-secondary-light">下個繳費日: {{ rentalInfo.nextPaymentDate }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-6">

      <div class="md:col-span-12 lg:col-span-4 space-y-6">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 font-bold text-2xl">
               <span class="material-symbols-outlined text-3xl">home</span>
            </div>
            <div>
              <h3 class="font-bold text-xl">{{ rentalInfo.roomNumber }}</h3>
              <p class="text-sm text-text-secondary-light">您的租屋處</p>
            </div>
          </div>
          
          <div class="space-y-3 text-sm">
            <div class="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <span class="text-text-secondary-light">租賃期間</span>
              <span class="font-medium">{{ rentalInfo.leaseStart }} ~ {{ rentalInfo.leaseEnd }}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <span class="text-text-secondary-light">每月租金</span>
              <span class="font-medium">NT$ {{ rentalInfo.rent.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
              <span class="text-text-secondary-light">繳費日</span>
              <span class="font-medium">每月 {{ rentalInfo.paymentDay }} 號</span>
            </div>
            <div class="flex justify-between py-2">
               <span class="text-text-secondary-light">狀態</span>
               <span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">租賃中</span>
            </div>
          </div>
        </div>
      </div>

      <div class="md:col-span-12 lg:col-span-8">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full flex flex-col">
          <div class="flex justify-between items-start mb-6">
            <div>
              <h3 class="font-bold text-lg flex items-center gap-2">
                <span class="material-symbols-outlined text-yellow-500">receipt_long</span>
                本月帳單
              </h3>
              <p class="text-xs text-text-secondary-light mt-1">計費週期: {{ currentBill.period }}</p>
            </div>
            <div class="text-right">
              <span v-if="currentBill.status === 'unpaid'" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                尚未繳費
              </span>
              <span v-else class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                已繳費
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-2">
              <p class="text-sm font-bold text-text-secondary-light mb-2">電費使用詳情</p>
              <div class="flex justify-between text-sm">
                <span>本期度數</span>
                <span class="font-bold">{{ currentBill.meterCurrent }} 度</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>上期度數</span>
                <span class="text-text-secondary-light">{{ currentBill.meterLast }} 度</span>
              </div>
              <div class="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <span>使用度數</span>
                <span class="font-bold text-blue-600">{{ currentBill.meterCurrent - currentBill.meterLast }} 度</span>
              </div>
              <div class="flex justify-between text-sm pt-1">
                 <span>計費方式</span>
                 <span>{{ currentBill.pricePerUnit }} 元/度</span>
              </div>
              <div class="flex justify-between font-bold pt-2 text-text-primary-light">
                <span>電費小計</span>
                <span>NT$ {{ currentBill.electricAmount.toLocaleString() }}</span>
              </div>
            </div>

            <div class="flex flex-col justify-center items-center sm:items-end space-y-1">
              <p class="text-sm text-text-secondary-light">本月應繳總金額 (房租+電費)</p>
              <p class="text-4xl font-extrabold text-text-primary-light">
                NT$ {{ (currentBill.rentAmount + currentBill.electricAmount).toLocaleString() }}
              </p>
              <p class="text-xs text-red-500 font-medium" v-if="currentBill.status === 'unpaid'">
                請於 {{ currentBill.dueDate }} 前繳費
              </p>
            </div>
          </div>

          <div class="mt-auto grid grid-cols-2 gap-4">
             <button class="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-[18px]">history</span>
                歷史帳單
             </button>
             <button class="py-2.5 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                前往繳費
             </button>
          </div>
        </div>
      </div>

      <div class="md:col-span-6">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg flex items-center gap-2">
              <span class="material-symbols-outlined text-orange-500">campaign</span>
              最新公告
            </h3>
            <button class="text-xs text-blue-600 hover:underline">查看全部</button>
          </div>

          <div class="space-y-3 overflow-y-auto max-h-[300px]">
            <div v-for="news in announcements" :key="news.id" class="p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 transition-colors cursor-pointer bg-white dark:bg-gray-800">
               <div class="flex justify-between items-start mb-1">
                  <div class="flex items-center gap-2">
                     <span v-if="news.isPinned" class="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold">置頂</span>
                     <h4 class="font-bold text-sm text-text-primary-light line-clamp-1">{{ news.title }}</h4>
                  </div>
                  <span class="text-[10px] text-text-secondary-light whitespace-nowrap">{{ news.date }}</span>
               </div>
               <p class="text-xs text-text-secondary-light line-clamp-2">{{ news.content }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="md:col-span-6">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full">
          <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-blue-500">support_agent</span>
            需要協助嗎？
          </h3>
          
          <div class="grid grid-cols-2 gap-4 h-[calc(100%-3rem)]">
            <button 
  @click="$router.push({ name: 'TenantRepairs' })"
  class="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
>
               <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-2xl">build</span>
               </div>
               <span class="font-bold text-text-primary-light">我要報修</span>
               <span class="text-xs text-text-secondary-light mt-1">物品損壞、漏水等</span>
            </button>

            <button 
  @click="$router.push({ name: 'ContactLandlord' })" 
  class="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all group"
>
   <div class="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
      <span class="material-symbols-outlined text-2xl">chat</span>
   </div>
   <span class="font-bold text-text-primary-light">聯繫房東</span>
   <span class="text-xs text-text-secondary-light mt-1">傳送訊息給房東</span>
</button>
          </div>
        </div>
      </div>

    </div>

    <div v-if="isProfileModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isProfileModalOpen = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">編輯個人資料</h2>
          <button @click="isProfileModalOpen = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">顯示名稱</label>
            <input 
              v-model="editForm.name" 
              type="text" 
              class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="請輸入您的姓名"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">所屬房東</label>
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
               <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-gray-400">person</span>
                  <span :class="userProfile.landlordName ? 'text-text-primary-light font-medium' : 'text-gray-400'">
                    {{ userProfile.landlordName || '尚未綁定房東' }}
                  </span>
               </div>
               <button 
                  v-if="!userProfile.landlordName"
                  @click="handleBindLandlord"
                  class="text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
               >
                  綁定
               </button>
               <button 
                  v-else
                  @click="handleUnbindLandlord"
                  class="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
               >
                  解除
               </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">聯絡電話</label>
            <input 
              v-model="editForm.phone" 
              type="tel" 
              class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="09xx-xxx-xxx"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">Email (登入帳號)</label>
            <input 
              v-model="editForm.email" 
              type="email" 
              disabled
              class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-500 cursor-not-allowed outline-none transition-all"
            >
            <p class="text-xs text-text-secondary-light mt-1">* Email 無法修改，若需變更請聯繫管理員</p>
          </div>
        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button 
            @click="isProfileModalOpen = false"
            class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors"
          >
            取消
          </button>
          <button 
            @click="saveProfile"
            class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
          >
            儲存變更
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();
const todayDate = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

// --- 用戶資料 State (模擬與 Store 連動) ---
const userProfile = reactive({
  name: authStore.userProfile?.name || '租客',
  phone: '0912-345-678', // 預設模擬資料
  email: authStore.userProfile?.email || 'tenant@example.com',
  landlordName: '' // [新增] 所屬房東，空字串代表未綁定
});

// --- Modal State ---
const isProfileModalOpen = ref(false);
const editForm = reactive({
  name: '',
  phone: '',
  email: ''
});

// 開啟編輯視窗
const openProfileModal = () => {
  editForm.name = userProfile.name;
  editForm.phone = userProfile.phone;
  editForm.email = userProfile.email;
  isProfileModalOpen.value = true;
};

// [新增] 綁定房東邏輯 (模擬)
const handleBindLandlord = () => {
  const code = prompt('請輸入房東提供的邀請碼 (測試用: 輸入 8888)');
  
  if (code === '8888') {
     userProfile.landlordName = '王大明 (房東)';
     alert('綁定成功！您現在可以查看房東發布的公告與帳單。');
  } else if (code) {
     alert('邀請碼錯誤，請確認後再試。');
  }
};

// [新增] 解除綁定邏輯
const handleUnbindLandlord = () => {
  if (confirm('確定要解除與此房東的綁定嗎？解除後將無法查看相關資訊。')) {
     userProfile.landlordName = '';
  }
};

// 儲存變更
const saveProfile = () => {
  if (!editForm.name || !editForm.phone) {
    alert('請填寫完整資料');
    return;
  }
  
  // 更新本地顯示資料
  userProfile.name = editForm.name;
  userProfile.phone = editForm.phone;
  
  // 更新 Store (若 Store 有提供 actions 則呼叫 actions)
  if (authStore.userProfile) {
    authStore.userProfile.name = editForm.name;
  }

  isProfileModalOpen.value = false;
  
  // 模擬 API 延遲
  // alert('個人資料更新成功！'); 
};

// --- Mock Data (其他資料保持不變) ---
const rentalInfo = ref({
  roomNumber: 'A-201',
  leaseStart: '2025/01/01',
  leaseEnd: '2026/01/01',
  rent: 12000,
  paymentDay: 5,
  nextPaymentDate: '2025/11/05'
});

const currentBill = ref({
  period: '2025/10/01 - 2025/10/31',
  rentAmount: 12000,
  meterLast: 1450,
  meterCurrent: 1680,
  pricePerUnit: 5.0,
  electricAmount: 1150, 
  status: 'unpaid', 
  dueDate: '2025/11/05'
});

const announcements = ref([
  { id: 1, title: '【重要】大樓清洗水塔通知', date: '2025/10/24', isPinned: true, content: '本大樓將於下週二上午9:00至下午4:00進行水塔清洗，屆時將暫停供水，請提早儲水備用。' },
  { id: 2, title: '包裹代收服務調整說明', date: '2025/10/20', isPinned: false, content: '即日起管理室代收包裹時間調整為每日上午8點至晚上9點，請住戶留意取件時間。' },
  { id: 3, title: '垃圾分類稽查公告', date: '2025/10/15', isPinned: false, content: '近期發現回收區有未分類垃圾，環保局將加強稽查，請住戶務必配合分類。' },
  { id: 4, title: '公共區域照明維修', date: '2025/10/10', isPinned: false, content: 'B1停車場照明燈具將於明日進行更換作業。' },
]);

</script>