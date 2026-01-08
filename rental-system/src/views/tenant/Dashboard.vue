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
        <p v-if="rentalInfo.nextPaymentDate" class="text-xs text-text-secondary-light">
          下個繳費日: {{ rentalInfo.nextPaymentDate }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-6">

      <div class="md:col-span-12 lg:col-span-4 space-y-6">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full">
          <div v-if="loading.rental" class="animate-pulse space-y-4">
             <div class="h-16 w-16 bg-gray-200 rounded-full"></div>
             <div class="h-4 bg-gray-200 w-1/2 rounded"></div>
             <div class="h-20 bg-gray-200 w-full rounded"></div>
          </div>

          <div v-else-if="rentalInfo.hasData">
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

          <div v-else class="text-center py-8 text-gray-400">
             <span class="material-symbols-outlined text-4xl mb-2">home_work</span>
             <p>目前尚無有效的租約資訊</p>
             <p class="text-xs mt-2">請聯繫房東確認合約狀態</p>
          </div>
        </div>
      </div>

      <div class="md:col-span-12 lg:col-span-8">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full flex flex-col">
          
          <div v-if="loading.bill" class="flex-1 flex items-center justify-center">
             <span class="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
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
                  <span class="font-bold text-blue-600">{{ currentBill.usage }} 度</span>
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
                  NT$ {{ currentBill.totalAmount.toLocaleString() }}
                </p>
                <p class="text-xs text-red-500 font-medium" v-if="currentBill.status === 'unpaid'">
                  請於 {{ currentBill.dueDate }} 前繳費
                </p>
              </div>
            </div>

            <div class="mt-auto grid grid-cols-2 gap-4">
               <button @click="$router.push({ name: 'TenantBills' })" class="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined text-[18px]">history</span>
                  歷史帳單
               </button>
               <button @click="$router.push({ name: 'TenantBills' })" class="py-2.5 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
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

      <div class="md:col-span-6">
        <div class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg flex items-center gap-2">
              <span class="material-symbols-outlined text-orange-500">campaign</span>
              最新公告
            </h3>
            <button @click="$router.push({ name: 'TenantAnnouncements' })" class="text-xs text-blue-600 hover:underline">查看全部</button>
          </div>

          <div v-if="loading.announcement" class="space-y-3">
             <div v-for="i in 3" :key="i" class="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
          </div>

          <div v-else-if="announcements.length > 0" class="space-y-3 overflow-y-auto max-h-[300px]">
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

          <div v-else class="h-40 flex items-center justify-center text-gray-400 text-sm">
             目前沒有新公告
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
            :disabled="isSaving"
            class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {{ isSaving ? '儲存中...' : '儲存變更' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { db } from '../../firebase/config';
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
  // Timestamp // [修改] 新增 Timestamp 引用
} from 'firebase/firestore';

const authStore = useAuthStore();
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
      alert('找不到此邀請碼對應的房東，請確認後再試。');
      return;
    }

    // [修正] 加入 ! 非空斷言，確保 landlordDoc 存在
    const landlordDoc = querySnapshot.docs[0]!;
    const landlordData = landlordDoc.data();
    
    // 2. 更新當前租客的 users 文件
    if (authStore.user) {
      const userRef = doc(db, 'users', authStore.user.uid);
      await updateDoc(userRef, {
        landlordId: landlordDoc.id,
        // 可選擇性是否儲存 landlordName，或每次都即時讀取
      });

      // 3. 更新本地狀態
      userProfile.landlordId = landlordDoc.id;
      userProfile.landlordName = landlordData.name || '房東';
      
      // 4. 重新讀取相關資料 (公告等)
      fetchDashboardData();
      alert(`綁定成功！您已加入 ${userProfile.landlordName} 的管理列表。`);
    }
  } catch (error) {
    console.error('綁定失敗:', error);
    alert('發生錯誤，請稍後再試');
  }
};

const handleUnbindLandlord = async () => {
  if (!confirm('確定要解除與此房東的綁定嗎？解除後將無法查看相關資訊。')) return;
  
  try {
    if (authStore.user) {
      const userRef = doc(db, 'users', authStore.user.uid);
      await updateDoc(userRef, {
        landlordId: null
      });
      userProfile.landlordId = '';
      userProfile.landlordName = '';
      alert('已解除綁定');
      // 清空依賴房東的資料
      announcements.value = [];
    }
  } catch (error) {
    console.error('解除失敗:', error);
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
  } catch (error) {
    console.error('更新失敗:', error);
    alert('儲存失敗');
  } finally {
    isSaving.value = false;
  }
};

// --- 資料模型 (Data Models) ---

// 1. 租約資訊
const rentalInfo = reactive({
  hasData: false,
  roomNumber: '',
  leaseStart: '',
  leaseEnd: '',
  rent: 0,
  paymentDay: 5,
  nextPaymentDate: ''
});

// 2. 帳單資訊
const currentBill = reactive({
  hasData: false,
  period: '',
  rentAmount: 0,
  meterLast: 0,
  meterCurrent: 0,
  usage: 0,
  pricePerUnit: 0,
  electricAmount: 0,
  totalAmount: 0,
  status: '',
  dueDate: ''
});

// 3. 公告列表
const announcements = ref<any[]>([]);

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
    
    // 如果有房東 ID，嘗試讀取房東名稱
    if (userProfile.landlordId) {
      const landlordSnap = await getDoc(doc(db, 'users', userProfile.landlordId));
      if (landlordSnap.exists()) {
        // [修改] 確保 data() 存在
        const data = landlordSnap.data();
        if (data) userProfile.landlordName = data.name;
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
      rentalInfo.paymentDay = data.paymentDay || 5;
      
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

  // C. 讀取最新帳單 (bills)
  try {
    const billsQ = query(
      collection(db, 'bills'),
      where('tenantId', '==', uid),
      orderBy('dueDate', 'desc'),
      limit(1)
    );
    const billSnap = await getDocs(billsQ);
    
    if (!billSnap.empty) {
      const data = billSnap.docs[0]!.data();
      currentBill.hasData = true;
      currentBill.period = data.period;
      currentBill.rentAmount = Number(data.rentAmount);
      currentBill.meterLast = Number(data.lastMeter || 0);
      currentBill.meterCurrent = Number(data.currentMeter || 0);
      currentBill.usage = currentBill.meterCurrent - currentBill.meterLast;
      currentBill.pricePerUnit = Number(data.pricePerUnit || 5);
      
      const electric = Math.round(currentBill.usage * currentBill.pricePerUnit);
      currentBill.electricAmount = electric;
      currentBill.totalAmount = currentBill.rentAmount + electric;
      
      currentBill.status = data.status;
      currentBill.dueDate = data.dueDate;
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
</script>