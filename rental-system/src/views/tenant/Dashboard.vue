<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
            早安，{{ authStore.userProfile?.name || '房客' }}
          </h1>
          <button 
            @click="openProfileModal"
            class="text-ink-300 hover:text-gold-600 transition-colors p-1.5 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark flex items-center justify-center"
            title="編輯個人資料"
          >
            <span class="material-symbols-outlined text-[20px]">edit_square</span>
          </button>
        </div>
        <p class="text-text-secondary-light">歡迎回到您的家</p>
      </div>
      <div class="text-right hidden md:block">
        <p class="text-sm font-bold text-text-primary-light">{{ todayDate }}</p>
        <p v-if="rentalInfo.nextPaymentDate" class="text-xs text-text-secondary-light">
          下個繳費日: {{ rentalInfo.nextPaymentDate }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-6">

      <div class="md:col-span-12 lg:col-span-4 space-y-6">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-ink-100 dark:border-ink-800 h-full">
          <div v-if="loading.rental" class="animate-pulse space-y-4">
             <div class="h-16 w-16 bg-gray-200 rounded-full"></div>
             <div class="h-4 bg-gray-200 w-1/2 rounded"></div>
             <div class="h-20 bg-gray-200 w-full rounded"></div>
          </div>

          <div v-else-if="rentalInfo.hasData">
            <div class="flex items-center gap-4 mb-6">
              <div class="w-16 h-16 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center text-gold-700 font-bold text-2xl">
                 <span class="material-symbols-outlined text-3xl">home</span>
              </div>
              <div>
                <h3 class="font-bold text-xl">{{ rentalInfo.roomNumber }}</h3>
                <p class="text-sm text-text-secondary-light">您的租屋處</p>
              </div>
            </div>
            
            <div class="space-y-3 text-sm">
              <div class="flex justify-between py-2 border-b border-ink-50 dark:border-ink-800">
                <span class="text-text-secondary-light">租賃期間</span>
                <span class="font-medium">{{ rentalInfo.leaseStart }} ~ {{ rentalInfo.leaseEnd }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-ink-50 dark:border-ink-800">
                <span class="text-text-secondary-light">每月租金</span>
                <span class="font-medium">NT$ {{ rentalInfo.rent.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-ink-50 dark:border-ink-800">
                <span class="text-text-secondary-light">繳費日</span>
                <span class="font-medium">每月 {{ rentalInfo.paymentDay }} 號</span>
              </div>
              <div v-if="rentalInfo.address" class="py-2 border-b border-ink-50 dark:border-ink-800">
                <span class="text-text-secondary-light text-xs">地址</span>
                <div class="flex items-center gap-1 mt-0.5">
                  <span
                    class="font-medium text-sm leading-snug flex-1 cursor-pointer active:opacity-60 select-text"
                    @click="copyAddress"
                    @touchstart.passive="startLongPress"
                    @touchend.passive="cancelLongPress"
                    @touchmove.passive="cancelLongPress"
                    title="點擊複製地址"
                  >{{ rentalInfo.address }}</span>
                  <a :href="getMapLink(rentalInfo.address)" target="_blank" rel="noopener noreferrer"
                    class="flex-shrink-0 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="在 Google 地圖開啟" @click.stop>
                    <span class="material-symbols-outlined text-[20px]">map</span>
                  </a>
                </div>
              </div>
              <div class="flex justify-between py-2">
                 <span class="text-text-secondary-light">狀態</span>
                 <span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">租賃中</span>
              </div>
            </div>
            <div v-if="signedContract" class="mt-4 flex gap-2">
              <button @click="previewContract = signedContract"
                class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <span class="material-symbols-outlined text-sm">visibility</span>
                查閱合約
              </button>
              <button @click="downloadSignedContract" :disabled="downloadingContract"
                class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50">
                <span class="material-symbols-outlined text-sm">{{ downloadingContract ? 'hourglass_empty' : 'download' }}</span>
                {{ downloadingContract ? '產生中...' : '下載 PDF' }}
              </button>
            </div>
          </div>

          <!-- 已綁定房東，等待建立合約 -->
          <div v-else-if="userProfile.landlordId" class="text-center py-6 space-y-4">
            <div class="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
              <span class="material-symbols-outlined text-3xl text-blue-400">pending</span>
            </div>
            <div>
              <p class="font-semibold text-text-primary-light dark:text-text-primary-dark">
                已綁定房東：{{ userProfile.landlordName || '載入中...' }}
              </p>
              <p class="text-sm text-text-secondary-light mt-1">等待房東建立您的租約資訊</p>
            </div>
            <button
              @click="$router.push({ name: 'ContactLandlord' })"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              <span class="material-symbols-outlined text-[18px]">chat</span>
              聯繫房東
            </button>
          </div>
          <!-- 完全未綁定 -->
          <div v-else class="text-center py-8 text-gray-400">
            <span class="material-symbols-outlined text-4xl mb-2">home_work</span>
            <p>尚未綁定房東</p>
            <p class="text-xs mt-2">請向房東索取綁定代碼後，至個人資料頁綁定</p>
          </div>
        </div>
      </div>

      <div class="md:col-span-12 lg:col-span-8">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full flex flex-col">
          
          <div v-if="loading.bill" class="flex-1 flex items-center justify-center">
             <span class="material-symbols-outlined animate-spin text-3xl text-ink-200">progress_activity</span>
          </div>

          <div v-else-if="currentBill.hasData" class="h-full flex flex-col">
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
              <div class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl space-y-2">
                <p class="text-sm font-bold text-text-secondary-light mb-2">電費使用詳情</p>
                <div class="flex justify-between text-sm">
                  <span>本期度數</span>
                  <span class="font-bold">{{ currentBill.meterCurrent }} 度</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span>上期度數</span>
                  <span class="text-text-secondary-light">{{ currentBill.meterLast }} 度</span>
                </div>
                <div class="flex justify-between text-sm border-t border-ink-100 dark:border-ink-700 pt-2 mt-2">
                  <span>使用度數</span>
                  <span class="font-bold text-gold-600">{{ currentBill.usage }} 度</span>
                </div>
                <div class="flex justify-between text-sm pt-1">
                   <span>計費方式</span>
                   <span>{{ currentBill.modeLabel }}
                     <span v-if="currentBill.modeLabel === '固定費率'" class="text-text-secondary-light">
                       ({{ currentBill.pricePerUnit }} 元/度)
                     </span>
                     <span v-else-if="currentBill.usage > 0" class="text-text-secondary-light">
                       (均{{ currentBill.pricePerUnit }} 元/度)
                     </span>
                   </span>
                </div>
                <div class="flex justify-between font-bold pt-2 text-text-primary-light">
                  <span>電費小計</span>
                  <span>NT$ {{ currentBill.electricAmount.toLocaleString() }}</span>
                </div>
              </div>

              <div class="flex flex-col justify-center items-center sm:items-end space-y-1">
                <p class="text-sm text-text-secondary-light">本月應繳總金額 (房租+電費)</p>
                <p class="text-4xl font-extrabold text-text-primary-light">
                  NT$ {{ currentBill.totalAmount.toLocaleString() }}
                </p>
                <p class="text-xs text-red-500 font-medium" v-if="currentBill.status === 'unpaid'">
                  請於 {{ currentBill.dueDate }} 前繳費
                </p>
              </div>
            </div>

            <div class="mt-auto grid grid-cols-2 gap-4">
               <button @click="$router.push({ name: 'TenantBills' })" class="py-2.5 px-4 rounded-xl border border-ink-100 dark:border-ink-700 font-medium text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined text-[18px]">history</span>
                  歷史帳單
               </button>
               <button @click="$router.push({ name: 'TenantBills' })" class="py-2.5 px-4 rounded-xl bg-gold-500 text-white font-bold text-sm hover:bg-gold-600 transition-colors shadow-md shadow-gold-500/20">
                  前往繳費
               </button>
            </div>
          </div>

          <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-3">
             <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <span class="material-symbols-outlined text-3xl">check_circle</span>
             </div>
             <p>本期目前沒有待繳帳單</p>
          </div>
        </div>
      </div>

      <!-- 入住款項卡片（有未繳押金時才顯示） -->
      <div v-if="pendingDeposits.some(d => d.status !== 'paid')" class="md:col-span-12">
        <div class="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800">
          <h3 class="font-bold text-base flex items-center gap-2 text-amber-800 dark:text-amber-300 mb-3">
            <span class="material-symbols-outlined text-[20px]">payments</span>
            入住款項待確認
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              v-for="item in pendingDeposits"
              :key="item.label"
              class="flex items-center justify-between bg-white dark:bg-card-dark rounded-xl px-4 py-3 border"
              :class="item.status === 'paid' ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-700'"
            >
              <div>
                <p class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{{ item.label }}</p>
                <p class="text-xs text-text-secondary-light">NT$ {{ item.amount.toLocaleString() }}</p>
              </div>
              <span
                class="text-xs px-2.5 py-1 rounded-full font-bold"
                :class="item.status === 'paid'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'"
              >
                {{ item.status === 'paid' ? '已收款' : '待確認' }}
              </span>
            </div>
          </div>
          <p class="text-xs text-amber-600 dark:text-amber-400 mt-3">款項由房東確認收款後更新，如有疑問請聯繫房東。</p>
        </div>
      </div>

      <div class="md:col-span-6">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-ink-100 dark:border-ink-800 h-full">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg flex items-center gap-2">
              <span class="material-symbols-outlined text-orange-500">campaign</span>
              最新公告
            </h3>
            <button @click="$router.push({ name: 'TenantAnnouncements' })" class="text-xs text-gold-600 hover:underline">查看全部</button>
          </div>

          <div v-if="loading.announcement" class="space-y-3">
             <div v-for="i in 3" :key="i" class="h-16 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse"></div>
          </div>

          <div v-else-if="announcements.length > 0" class="space-y-3 overflow-y-auto max-h-[300px]">
            <div v-for="news in announcements" :key="news.id" class="p-3 rounded-xl border border-ink-100 dark:border-ink-700 hover:border-gold-300 transition-colors cursor-pointer bg-white dark:bg-ink-800">
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

          <div v-else class="h-40 flex items-center justify-center text-gray-400 text-sm">
             目前沒有新公告
          </div>
        </div>
      </div>

      <div class="md:col-span-6">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-ink-100 dark:border-ink-800 h-full">
          <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-blue-500">support_agent</span>
            需要協助嗎？
          </h3>
          
          <div class="grid grid-cols-2 gap-4 h-[calc(100%-3rem)]">
            <button 
              @click="$router.push({ name: 'TenantRepairs' })"
              class="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-ink-100 dark:border-ink-700 hover:border-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/10 transition-all group"
            >
               <div class="w-12 h-12 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-2xl">build</span>
               </div>
               <span class="font-bold text-text-primary-light">我要報修</span>
               <span class="text-xs text-text-secondary-light mt-1">物品損壞、漏水等</span>
            </button>

            <button 
               @click="$router.push({ name: 'ContactLandlord' })" 
               class="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-ink-100 dark:border-ink-700 hover:border-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/10 transition-all group"
            >
               <div class="w-12 h-12 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
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
        <div class="p-6 border-b border-ink-100 dark:border-ink-700 flex justify-between items-center">
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
              class="w-full px-4 py-2 rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none transition-all"
              placeholder="請輸入您的姓名"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">所屬房東</label>
            <div class="flex items-center justify-between p-3 bg-surface-light dark:bg-surface-dark rounded-xl border border-ink-100 dark:border-ink-700">
               <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-gray-400">person</span>
                  <span :class="userProfile.landlordName ? 'text-text-primary-light font-medium' : 'text-gray-400'">
                    {{ userProfile.landlordName || '尚未綁定房東' }}
                  </span>
               </div>
               <button 
                  v-if="!userProfile.landlordName"
                  @click="handleBindLandlord"
                  class="text-xs px-3 py-1.5 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors shadow-sm"
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
              class="w-full px-4 py-2 rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none transition-all"
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
          </div>
        </div>

        <div class="p-6 border-t border-ink-100 dark:border-ink-700 flex justify-end gap-3">
          <button 
            @click="isProfileModalOpen = false"
            class="px-5 py-2 rounded-xl text-ink-500 hover:bg-surface-light dark:text-ink-300 dark:hover:bg-surface-dark font-medium transition-colors"
          >
            取消
          </button>
          <button 
            @click="saveProfile"
            :disabled="isSaving"
            class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold shadow-md shadow-gold-500/20 hover:bg-gold-600 transition-colors disabled:opacity-50"
          >
            {{ isSaving ? '儲存中...' : '儲存變更' }}
          </button>
        </div>
      </div>
    </div>

  </div>

  <!-- 合約查閱 Modal -->
  <Teleport to="body">
    <div v-if="previewContract"
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      @click.self="previewContract = null">
      <div class="w-full max-w-3xl bg-white dark:bg-card-dark rounded-2xl shadow-2xl my-8">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">
            租賃合約 — {{ previewContract.roomNo }}
          </h2>
          <div class="flex items-center gap-2">
            <button @click="downloadSignedContract(); previewContract = null" :disabled="downloadingContract"
              class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors disabled:opacity-50">
              <span class="material-symbols-outlined text-sm">download</span>
              下載 PDF
            </button>
            <button @click="previewContract = null"
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span class="material-symbols-outlined text-gray-500">close</span>
            </button>
          </div>
        </div>
        <div class="p-6 overflow-y-auto max-h-[75vh]">
          <Preview :form="previewContract" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { db, auth } from '../../firebase/config';
import Preview from '../../components/Preview.vue';
import { 
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';

const authStore = useAuthStore();
const toast = useToastStore();
const todayDate = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

// --- 狀態控制 ---
const loading = reactive({
  rental: true,
  bill: true,
  announcement: true
});
const isSaving = ref(false);

// --- 用戶資料 ---
// 注意：這裡增加了 landlordId 用於後續查詢
const userProfile = reactive({
  name: '',
  phone: '',
  email: '',
  landlordName: '',
  landlordId: '' 
});

// --- Modal 相關 ---
const isProfileModalOpen = ref(false);
const editForm = reactive({ name: '', phone: '', email: '' });

// --- 綁定房東邏輯 (資料庫對接版) ---
const handleBindLandlord = async () => {
  const code = prompt('請輸入房東提供的邀請碼 (例如房東 ID 或專屬代碼)');
  if (!code) return;

  try {
    // 1. 在 users 集合中搜尋符合 landlordCode 的房東
    const q = query(collection(db, 'users'), where('landlordCode', '==', code), where('role', '==', 'landlord'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      toast.error('找不到此邀請碼對應的房東，請確認後再試');
      return;
    }

    const landlordDoc = querySnapshot.docs[0]!;
    const landlordData = landlordDoc.data();

    if (authStore.user) {
      const userRef = doc(db, 'users', authStore.user.uid);
      await updateDoc(userRef, { landlordId: landlordDoc.id });
      userProfile.landlordId = landlordDoc.id;
      userProfile.landlordName = landlordData.name || '房東';
      fetchDashboardData();
      toast.success(`已綁定房東：${userProfile.landlordName}`);
    }
  } catch (error) {
    toast.error('發生錯誤，請稍後再試');
  }
};

const handleUnbindLandlord = async () => {
  if (!confirm('確定要解除與此房東的綁定嗎？')) return;
  try {
    if (authStore.user) {
      const userRef = doc(db, 'users', authStore.user.uid);
      await updateDoc(userRef, { landlordId: null });
      userProfile.landlordId = '';
      userProfile.landlordName = '';
      announcements.value = [];
      toast.success('已解除房東綁定');
    }
  } catch (error) {
    toast.error('操作失敗，請稍後再試');
  }
};

const openProfileModal = () => {
  editForm.name = userProfile.name;
  editForm.phone = userProfile.phone;
  editForm.email = userProfile.email;
  isProfileModalOpen.value = true;
};

const saveProfile = async () => {
  if (!authStore.user) return;
  isSaving.value = true;
  
  try {
    const userRef = doc(db, 'users', authStore.user.uid);
    await updateDoc(userRef, {
      name: editForm.name,
      phone: editForm.phone
    });
    
    // 更新本地顯示
    userProfile.name = editForm.name;
    userProfile.phone = editForm.phone;
    
    // 同步回 Store
    if (authStore.userProfile) {
      authStore.userProfile.name = editForm.name;
      authStore.userProfile.phone = editForm.phone;
    }
    
    isProfileModalOpen.value = false;
    toast.success('個人資料已儲存');
  } catch (error) {
    toast.error('儲存失敗，請稍後再試');
  } finally {
    isSaving.value = false;
  }
};

// --- 資料模型 (Data Models) ---

// 1. 租約資訊
const rentalInfo = reactive({
  hasData: false,
  roomNumber: '',
  address: '',
  leaseStart: '',
  leaseEnd: '',
  rent: 0,
  paymentDay: 5,
  nextPaymentDate: ''
});

const getMapLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

let longPressTimer: ReturnType<typeof setTimeout> | null = null;
const startLongPress = () => {
  longPressTimer = setTimeout(async () => {
    if (!rentalInfo.address) return;
    try {
      await navigator.clipboard.writeText(rentalInfo.address);
      toast.success('地址已複製');
    } catch {
      toast.info(rentalInfo.address);
    }
  }, 600);
};
const cancelLongPress = () => {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
};
const copyAddress = async () => {
  if (!rentalInfo.address) return;
  try {
    await navigator.clipboard.writeText(rentalInfo.address);
    toast.success('地址已複製');
  } catch {
    toast.info(rentalInfo.address);
  }
};

// 2. 帳單資訊
const currentBill = reactive({
  hasData: false,
  period: '',
  rentAmount: 0,
  meterLast: 0,
  meterCurrent: 0,
  usage: 0,
  pricePerUnit: 0,
  modeLabel: '固定費率',
  electricAmount: 0,
  totalAmount: 0,
  status: '',
  dueDate: ''
});

// 3. 公告列表
const announcements = ref<any[]>([]);

// 4. 入住押金狀態
const pendingDeposits = ref<{ label: string; amount: number; status: string }[]>([]);
let unsubscribeDeposits: (() => void) | null = null;

// 5. 已簽署合約
const signedContract = ref<any>(null);
const previewContract = ref<any>(null);
const downloadingContract = ref(false);

const downloadSignedContract = async () => {
  if (!signedContract.value) return;
  downloadingContract.value = true;
  try {
    const token = await auth.currentUser?.getIdToken();
    const c = signedContract.value;
    function pText(val: any) {
      if (!val || val === 'none') return '無';
      if (val === 'landlord') return '由出租人負擔';
      if (val === 'tenant') return '由承租人負擔';
      return val;
    }
    const elec = pText(c.feeElectricity);
    const payload = {
      ...c,
      feeWaterDisplay: pText(c.feeWater),
      feeElectricityDisplay: c.feeElectricityNote ? `${elec}（備註：${c.feeElectricityNote}）` : elec,
      feeGasDisplay: pText(c.feeGas),
      feeInternetDisplay: pText(c.feeInternet),
      feeManagementDisplay: pText(c.feeManagement),
      customArticle21Display: c.customArticle21 || '',
      templateType: 'Contract'
    };
    const res = await axios.post('/generatePdf', payload, {
      responseType: 'arraybuffer',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    let data = res.data;
    if (data && typeof data === 'object' && !(data instanceof ArrayBuffer)) {
      const keys = Object.keys(data);
      const uint8 = new Uint8Array(keys.length);
      for (let i = 0; i < keys.length; i++) uint8[i] = (data as any)[i];
      data = uint8.buffer;
    }
    const blob = new Blob([data], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `租賃合約_${c.tenant}_${c.startDate}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
    toast.success('合約已下載');
  } catch (e) {
    toast.error('下載失敗，請稍後再試');
  } finally {
    downloadingContract.value = false;
  }
};

// --- 核心資料讀取 ---
// [修改] 這是修改後的完整 fetchDashboardData 函式
const fetchDashboardData = async () => {
  if (!authStore.user) return;

  const uid = authStore.user.uid;

  // A. 初始化用戶資料
  if (authStore.userProfile) {
    userProfile.name = authStore.userProfile.name || '';
    userProfile.phone = authStore.userProfile.phone || '';
    userProfile.email = authStore.user.email || '';
    userProfile.landlordId = authStore.userProfile.landlordId || '';
    
    // 如果有房東 ID，嘗試讀取房東名稱與繳費設定
    if (userProfile.landlordId) {
      const landlordSnap = await getDoc(doc(db, 'users', userProfile.landlordId));
      if (landlordSnap.exists()) {
        const data = landlordSnap.data();
        if (data) {
          userProfile.landlordName = data.name;
          // 儲存房東的繳費截止日設定，section B 會用來覆蓋合約靜態值
          (userProfile as any)._landlordPaymentDay = data.settings?.paymentDay ?? null;
        }
      }
    }
  }

  // B. 讀取租約資訊 (contracts)
  try {
    const contractsQ = query(
      collection(db, 'contracts'), 
      where('tenantId', '==', uid), 
      where('status', '==', 'active'),
      limit(1)
    );
    const contractSnap = await getDocs(contractsQ);
    
    if (!contractSnap.empty) {
      const data = contractSnap.docs[0]!.data();
      rentalInfo.hasData = true;
      rentalInfo.roomNumber = data.roomNumber;
      rentalInfo.leaseStart = data.startDate;
      rentalInfo.leaseEnd = data.endDate;
      rentalInfo.rent = Number(data.rent);

      // 查詢房間地址
      if (data.landlordId && data.roomNumber) {
        try {
          const roomQ = query(collection(db, 'rooms'), where('landlordId', '==', data.landlordId), where('name', '==', data.roomNumber), limit(1));
          const roomSnap = await getDocs(roomQ);
          rentalInfo.address = roomSnap.empty ? '' : (roomSnap.docs[0]!.data().address || '');
        } catch { rentalInfo.address = ''; }
      }
      // 優先使用房東系統設定的繳費日，其次才是合約靜態值
      rentalInfo.paymentDay = (userProfile as any)._landlordPaymentDay ?? data.paymentDay ?? 5;

      // 押金狀態 — 即時監聽，房東確認後自動更新
      const contractDocId = contractSnap.docs[0]!.id;
      if (unsubscribeDeposits) unsubscribeDeposits();
      unsubscribeDeposits = onSnapshot(doc(db, 'contracts', contractDocId), (snap) => {
        if (snap.exists()) {
          pendingDeposits.value = Array.isArray(snap.data().deposits) ? snap.data().deposits : [];
        }
      });
      
      const today = new Date();
      let nextMonth = today.getMonth() + 1;
      let year = today.getFullYear();
      if (today.getDate() > rentalInfo.paymentDay) {
        nextMonth++;
      }
      if (nextMonth > 12) { nextMonth = 1; year++; }
      rentalInfo.nextPaymentDate = `${year}/${nextMonth}/${rentalInfo.paymentDay}`;
    } else {
      rentalInfo.hasData = false;
    }
  } catch (err) {
    console.error('租約讀取錯誤:', err);
  } finally {
    loading.rental = false;
  }

  // B2. 查詢已簽署合約備份 (signed_contracts)
  try {
    const scQ = query(
      collection(db, 'signed_contracts'),
      where('tenantId', '==', uid),
      orderBy('signedAt', 'desc'),
      limit(1)
    );
    const scSnap = await getDocs(scQ);
    signedContract.value = scSnap.empty ? null : { id: scSnap.docs[0]!.id, ...scSnap.docs[0]!.data() };
  } catch {
    // 索引未建或無資料不影響主畫面
  }

  // C. 讀取本月帳單 (bills)
  try {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const billsQ = query(
      collection(db, 'bills'),
      where('tenantId', '==', uid),
      where('type', '==', 'income'),
      orderBy('date', 'desc')
    );
    const billSnap = await getDocs(billsQ);

    if (!billSnap.empty) {
      const all = billSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      // 優先顯示本月帳單，若無則取最近一筆未繳
      const monthBills = all.filter((b: any) => b.date?.startsWith(thisMonth));
      const unpaidBills = all.filter((b: any) => b.status === 'pending' || b.status === 'overdue');
      const pool = monthBills.length > 0 ? monthBills : unpaidBills;

      if (pool.length > 0) {
        const rentBill = pool.find((b: any) => b.category === '租金收入');
        const electricBill = pool.find((b: any) => b.category === '電費');
        const anyBill = rentBill || electricBill || pool[0];

        currentBill.hasData = true;
        currentBill.rentAmount = Number(rentBill?.amount) || 0;
        currentBill.electricAmount = Number(electricBill?.amount) || 0;
        currentBill.totalAmount = currentBill.rentAmount + currentBill.electricAmount;
        currentBill.dueDate = anyBill.dueDate || '';

        // 狀態：任一未繳即為 unpaid
        const allPaid = pool.every((b: any) => b.status === 'completed');
        currentBill.status = allPaid ? 'paid' : 'unpaid';

        // 電表資料：從 meter_readings 查詢 relatedUsageId
        if (electricBill?.relatedUsageId) {
          try {
            const meterSnap = await getDoc(doc(db, 'meter_readings', electricBill.relatedUsageId));
            if (meterSnap.exists()) {
              const m = meterSnap.data();
              currentBill.meterLast = Number(m['lastReading']) || 0;
              currentBill.meterCurrent = Number(m['currentReading']) || 0;
              currentBill.usage = Number(m['usage']) || 0;
              currentBill.pricePerUnit = (m['cost'] && m['usage']) ? Math.round(m['cost'] / m['usage'] * 100) / 100 : 5;
              currentBill.period = `${m['periodStart']} ~ ${m['periodEnd']}`;
              const modeMap: Record<string, string> = { fixed: '固定費率', tiered: '累進費率', bill_share: '帳單分攤', imported: '匯入' };
              currentBill.modeLabel = modeMap[m['mode']] || m['mode'] || '固定費率';
            }
          } catch { /* 查不到不影響主要顯示 */ }
        } else if (electricBill) {
          // 電費帳單存在但無 relatedUsageId（如測試資料），從 description 顯示週期
          currentBill.period = electricBill.description || '';
        }
        if (!currentBill.period && anyBill.date) {
          currentBill.period = anyBill.date.slice(0, 7);
        }
      } else {
        currentBill.hasData = false;
      }
    } else {
      currentBill.hasData = false;
    }
  } catch (err) {
    console.warn('帳單讀取錯誤 (可能是索引未建立):', err);
    currentBill.hasData = false;
  } finally {
    loading.bill = false;
  }

  // D. 讀取公告 (announcements) - [修改重點區塊]
  // 修改原因：統一邏輯，無論是否綁定房東，都嘗試讀取公告(與 Announcements.vue 一致)，並修正日期格式
  try {
    // 建立查詢：移除 userProfile.landlordId 的強制過濾，改為讀取最新的 5 則
    // 注意：若您的系統設計嚴格要求只能看該房東公告，請加回 where('landlordId', '==', userProfile.landlordId)
    const newsQ = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'), 
      limit(5)
    );

    const newsSnap = await getDocs(newsQ);
    
    announcements.value = newsSnap.docs.map(doc => {
      const data = doc.data();
      
      // [修復] 將 Timestamp 轉換為 Dashboard 模板需要的 'date' 字串格式
      let dateStr = '';
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        const d = data.createdAt.toDate();
        dateStr = d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
      }

      return {
        id: doc.id,
        ...data,
        date: dateStr // 注入格式化後的日期
      };
    });
  } catch (err) {
    console.warn('公告讀取錯誤:', err);
  } finally {
    loading.announcement = false;
  }
};
// [修改結束]

onMounted(() => {
  fetchDashboardData();
});

onUnmounted(() => {
  if (unsubscribeDeposits) unsubscribeDeposits();
});
</script>