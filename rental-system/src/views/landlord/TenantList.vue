<template>
  <div class="max-w-7xl mx-auto space-y-6" @click="closeDropdown">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          租客列表
        </h1>
        <p class="text-text-secondary-light">管理所有租客資料、租約期限與聯繫方式</p>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center">
          <span class="material-symbols-outlined text-[18px] mr-2">download</span>
          匯出清單
        </button>
        <button 
          @click="openModal()"
          class="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">person_add</span>
          手動新增租客
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">在租人數</p>
          <p class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mt-1">{{ stats.total }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
          <span class="material-symbols-outlined">group</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">即將到期 (60天內)</p>
          <p class="text-2xl font-bold text-orange-600 mt-1">{{ stats.expiring }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
          <span class="material-symbols-outlined">alarm</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">逾期欠費</p>
          <p class="text-2xl font-bold text-red-600 mt-1">{{ stats.overdue }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600">
          <span class="material-symbols-outlined">gpp_bad</span>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          @click="currentFilter = filter.value"
          class="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          :class="currentFilter === filter.value ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'"
        >
          {{ filter.label }}
        </button>
      </div>
      
      <div class="relative w-full md:w-64">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜尋姓名、房號或電話..." 
          class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-visible">
      <div class="overflow-x-auto min-h-[400px]">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th class="px-6 py-4 font-semibold">租客資訊</th>
              <th class="px-6 py-4 font-semibold">承租房源</th>
              <th class="px-6 py-4 font-semibold">租賃期間</th>
              <th class="px-6 py-4 font-semibold">繳費狀態</th>
              <th class="px-6 py-4 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="tenant in filteredTenants" :key="tenant.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div 
                    class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold mr-3"
                    :class="tenant.isOnlineUser ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200'"
                  >
                    {{ tenant.name[0] }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                       <p class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ tenant.name }}</p>
                       <span v-if="tenant.isOnlineUser" class="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">已綁定帳號</span>
                    </div>
                    <p class="text-xs text-text-secondary-light mt-0.5">{{ tenant.phone }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center">
                   <span class="material-symbols-outlined text-gray-400 mr-2 text-[18px]">meeting_room</span>
                   <span :class="{'text-gray-400 italic': !tenant.room || tenant.room === '尚未設定'}">{{ tenant.room || '尚未設定' }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div v-if="tenant.leaseStart && tenant.leaseEnd" class="text-xs space-y-1">
                  <p><span class="text-text-secondary-light w-6 inline-block">起:</span> {{ tenant.leaseStart }}</p>
                  <p><span class="text-text-secondary-light w-6 inline-block">迄:</span> {{ tenant.leaseEnd }}</p>
                </div>
                <div v-else class="text-xs text-gray-400 italic">
                  租約未設定
                </div>
                <span v-if="isExpiringSoon(tenant.leaseEnd)" class="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
                   即將到期
                </span>
              </td>
              <td class="px-6 py-4">
                <span 
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="paymentStatusStyles[tenant.paymentStatus]"
                >
                  <span class="w-1.5 h-1.5 rounded-full mr-2" :class="paymentDotStyles[tenant.paymentStatus]"></span>
                  {{ paymentStatusLabels[tenant.paymentStatus] }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 relative">
                  <button @click="openModal(tenant)" class="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <span class="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <div class="relative">
                    <button @click.stop="toggleMenu(tenant.id)" class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                       <span class="material-symbols-outlined text-[20px]">chat</span>
                    </button>
                    </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="loading" class="p-12 text-center text-text-secondary-light">
         <p>載入中...</p>
      </div>
      <div v-else-if="filteredTenants.length === 0" class="p-12 text-center text-text-secondary-light">
         <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">person_off</span>
         <p>找不到符合條件的租客</p>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ isEditing ? '編輯租客與合約' : '新增租客' }}
          </h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-4">
          <div v-if="!authStore.user" class="p-3 bg-red-100 text-red-700 text-sm rounded-lg mb-4">
             系統錯誤：無法識別房東身分，請重新登入。
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">姓名</label>
              <input v-model="form.name" type="text" class="form-input" placeholder="租客姓名">
            </div>
            <div>
               <label class="block text-sm font-medium text-text-secondary-light mb-1">承租房源</label>
               <select v-model="form.room" @change="onRoomSelect" class="form-input">
                  <option value="" disabled>請選擇房源</option>
                  <option v-if="currentEditingRoom" :value="currentEditingRoom.name">
                    {{ currentEditingRoom.name }} (目前承租)
                  </option>
                  <option v-for="room in vacantRooms" :key="room.id" :value="room.name">
                    {{ room.name }} ({{ room.price }}元)
                  </option>
                  <option v-if="form.room && !isRoomInList(form.room)" :value="form.room">
                    {{ form.room }} (未知房源)
                  </option>
               </select>
               <p v-if="vacantRooms.length === 0 && !currentEditingRoom" class="text-xs text-orange-500 mt-1">目前沒有閒置房源，請先至房源管理新增。</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">聯絡電話</label>
            <input v-model="form.phone" type="tel" class="form-input" placeholder="0912-345-678">
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">電子郵件 (選填)</label>
            <input v-model="form.email" type="email" class="form-input" placeholder="tenant@example.com">
          </div>

          <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
             <p class="text-xs font-bold text-text-secondary-light uppercase mb-3">租約設定</p>
             <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">起租日</label>
                  <input v-model="form.leaseStart" type="date" class="form-input">
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">到期日</label>
                  <input v-model="form.leaseEnd" type="date" class="form-input">
                </div>
             </div>
             <div class="mt-3">
                <label class="block text-sm font-medium text-text-secondary-light mb-1">每月租金 (NT$)</label>
                <input v-model.number="form.rent" type="number" class="form-input" placeholder="自動帶入房源價格">
             </div>
          </div>
          
          <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
             <p class="text-xs font-bold text-text-secondary-light uppercase mb-3">其他資訊</p>
             <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">緊急聯絡人</label>
                  <input v-model="form.emergencyContact" type="text" class="form-input" placeholder="姓名 - 關係 - 電話">
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">備註</label>
                  <textarea v-model="form.note" class="form-input min-h-[80px]" placeholder="例如：養一隻貓、習慣晚歸..."></textarea>
                </div>
             </div>
          </div>
        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button 
            @click="showModal = false"
            class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors"
          >
            取消
          </button>
          <button 
            @click="saveTenant"
            :disabled="isSaving"
            class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {{ isSaving ? '處理中...' : (isEditing ? '儲存並同步合約' : '新增租客') }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../stores/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  where,
  getDocs,
  setDoc // [新增]
} from 'firebase/firestore';

// --- Type Definitions ---
interface Tenant {
  id: string; 
  name: string;
  room: string;
  phone: string;
  email?: string;
  leaseStart: string;
  leaseEnd: string;
  rent?: number; // [新增]
  paymentStatus: 'normal' | 'overdue' | 'unpaid' | 'pending';
  emergencyContact?: string;
  note?: string;
  landlordId?: string;
  isOnlineUser?: boolean;
  uid?: string; // 線上用戶的 UID
  createdAt?: any;
}

interface Room {
  id: string;
  name: string;
  status: string;
  price: number;
}

// --- State ---
const authStore = useAuthStore();
const tenants = ref<Tenant[]>([]);
const availableRooms = ref<Room[]>([]); // [新增] 儲存所有房源
const loading = ref(true);
const isSaving = ref(false); // [新增]

// --- Subscription Handlers ---
let unsubscribeTenants: any = null;
let unsubscribeUsers: any = null;

// --- Filters & Search ---
const currentFilter = ref('all');
const searchQuery = ref('');

const filters = [
  { label: '全部租客', value: 'all' },
  { label: '繳費正常', value: 'normal' },
  { label: '逾期/欠費', value: 'issue' },
];

const paymentStatusLabels: any = {
  normal: '繳費正常',
  unpaid: '本期未繳',
  overdue: '逾期欠費',
  pending: '未設定租約'
};

const paymentStatusStyles: any = {
  normal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  unpaid: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  pending: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
};

const paymentDotStyles: any = {
  normal: 'bg-green-500',
  unpaid: 'bg-yellow-500',
  overdue: 'bg-red-500',
  pending: 'bg-gray-400'
};

// --- Firestore Integration ---

// 讀取房源列表 (用於下拉選單)
const fetchRooms = async () => {
  if (!authStore.user) return;
  const q = query(collection(db, 'rooms'), where('landlordId', '==', authStore.user.uid));
  const snap = await getDocs(q);
  availableRooms.value = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Room));
};

onMounted(() => {
  if (!authStore.user || !authStore.userProfile?.landlordCode) return;
  
  const uid = authStore.user.uid;
  const myCode = authStore.userProfile.landlordCode;

  // 0. 讀取房源
  fetchRooms();

  // 1. 監聽手動建立的租約 (Tenants)
  const qTenants = query(collection(db, 'tenants'), where('landlordId', '==', uid));
  unsubscribeTenants = onSnapshot(qTenants, (snapshot) => {
    const manualTenants = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Tenant));
    updateCombinedList(manualTenants, onlineUsers.value);
  });

  // 2. 監聽線上綁定的用戶 (Users)
  const qUsers = query(collection(db, 'users'), where('boundLandlordCode', '==', myCode));
  unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id, // user uid
        uid: doc.id,
        name: data.name || '未命名用戶',
        phone: data.phone || '',
        email: data.email || '',
        room: '尚未設定',
        leaseStart: '',
        leaseEnd: '',
        paymentStatus: 'pending',
        isOnlineUser: true
      } as Tenant;
    });
    onlineUsers.value = users;
  });
});

const manualTenantsList = ref<Tenant[]>([]);
const onlineUsers = ref<Tenant[]>([]);

const updateCombinedList = (manual: Tenant[], online: Tenant[]) => {
  manualTenantsList.value = manual;
  // 過濾：如果 online user 的電話已經在 manual list 出現，則不顯示 (假設已轉正)
  // 更好的方式是檢查 uid，但目前 manual tenants 結構可能還沒存 uid，暫時用 phone 或 name
  const manualPhones = new Set(manual.map(t => t.phone));
  const uniqueOnline = online.filter(u => !manualPhones.has(u.phone));
  
  tenants.value = [...manual, ...uniqueOnline];
  loading.value = false;
};

// Watchers for list syncing
watch([manualTenantsList, onlineUsers], ([newManual, newOnline]) => {
  const manualPhones = new Set(newManual.map(t => t.phone));
  const uniqueOnline = newOnline.filter(u => !manualPhones.has(u.phone));
  tenants.value = [...newManual, ...uniqueOnline];
});

onUnmounted(() => {
  if (unsubscribeTenants) unsubscribeTenants();
  if (unsubscribeUsers) unsubscribeUsers();
});

// --- Save & Logic (Critical Fixes) ---
const saveTenant = async () => {
  if (!authStore.user) return;
  if (!form.value.name) return alert('請填寫完整資料');
  if (!form.value.room) return alert('請選擇房源');
  
  isSaving.value = true;

  try {
    const tenantData: any = {
       ...form.value,
       landlordId: authStore.user.uid,
       updatedAt: serverTimestamp()
    };
    
    // 移除不需寫入 tenants 集合的 UI 輔助欄位
    const isOnlineProfile = tenantData.isOnlineUser;
    const targetUid = tenantData.uid; // 如果是線上用戶，這是他的 User UID
    
    delete tenantData.isOnlineUser;
    delete tenantData.id; 
    delete tenantData.uid; // 雖然我們需要它來建合約，但不需要存在 tenant 集合內 (或可選擇保留)

    // 1. 處理 Tenants Collection (租客檔案)
    let tenantDocId = form.value.id;
    
    if (isEditing.value && form.value.id) {
       if (isOnlineProfile) {
         // 線上用戶首次轉正：建立 Tenant 文件
         const docRef = await addDoc(collection(db, 'tenants'), {
            ...tenantData,
            createdAt: serverTimestamp(),
            paymentStatus: 'normal',
            uid: targetUid // 綁定 UID 方便未來查詢
         });
         tenantDocId = docRef.id;
         alert('已建立租客檔案與合約');
       } else {
         // 更新現有 Tenant
         const tenantRef = doc(db, 'tenants', form.value.id);
         await updateDoc(tenantRef, tenantData);
       }
    } else {
      // 純手動新增
      const docRef = await addDoc(collection(db, 'tenants'), {
        ...tenantData,
        createdAt: serverTimestamp(),
        paymentStatus: 'normal'
      });
      tenantDocId = docRef.id;
    }

    // 2. 處理 Rooms Collection (房源狀態同步)
    // 找出選定的房間 ID
    const selectedRoom = availableRooms.value.find(r => r.name === form.value.room);
    if (selectedRoom) {
      const roomRef = doc(db, 'rooms', selectedRoom.id);
      await updateDoc(roomRef, {
        status: 'occupied',
        tenantName: form.value.name,
        leaseEnd: form.value.leaseEnd,
        // 如果需要可以存 tenantId: tenantDocId
      });
      // TODO: 如果換房間，應把舊房間設回 vacant (這裡簡化暫不處理)
    }

    // 3. [關鍵修正] 處理 Contracts Collection (合約同步)
    // 這是 Dashboard 讀取的來源。如果有 UID (線上用戶)，必須建立此文件。
    if (targetUid) {
       // 檢查是否已有合約，或直接用 setDoc 覆蓋 (假設一人一租約)
       // 為了簡化，我們用 tenantId(uid) + landlordId 作為合約 ID，或直接 addDoc
       // Dashboard 查詢: where('tenantId', '==', uid)
       
       // 我們先搜尋是否已有舊合約，若有則更新，無則新增 (或是每次都新增一筆新的? 這裡採用新增/更新邏輯)
       const contractsRef = collection(db, 'contracts');
       const qContract = query(contractsRef, where('tenantId', '==', targetUid), where('status', '==', 'active'));
       const contractSnap = await getDocs(qContract);

       const contractData = {
         tenantId: targetUid,
         landlordId: authStore.user.uid,
         roomNumber: form.value.room, // 房號
         rent: form.value.rent || 0,
         startDate: form.value.leaseStart,
         endDate: form.value.leaseEnd,
         paymentDay: 5, // 預設
         status: 'active',
         updatedAt: serverTimestamp()
       };

       if (!contractSnap.empty) {
         const contractId = contractSnap.docs[0].id;
         await updateDoc(doc(db, 'contracts', contractId), contractData);
       } else {
         await addDoc(collection(db, 'contracts'), {
           ...contractData,
           createdAt: serverTimestamp()
         });
       }
    }

    // 重新抓取房源狀態 (因為狀態變了)
    await fetchRooms();
    showModal.value = false;

  } catch (error) {
    console.error("Error saving tenant:", error);
    alert("儲存失敗: " + error);
  } finally {
    isSaving.value = false;
  }
};

// --- Computed & Helpers ---
const stats = computed(() => {
  const today = new Date();
  const sixtyDaysLater = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const activeTenants = tenants.value.filter(t => t.paymentStatus !== 'pending');

  return {
    total: activeTenants.length,
    expiring: activeTenants.filter(t => {
      if (!t.leaseEnd) return false;
      const endDate = new Date(t.leaseEnd);
      return endDate >= today && endDate <= sixtyDaysLater;
    }).length,
    overdue: activeTenants.filter(t => t.paymentStatus === 'overdue').length
  };
});

const filteredTenants = computed(() => {
  return tenants.value.filter(t => {
    const q = searchQuery.value.toLowerCase();
    const matchSearch = t.name.toLowerCase().includes(q) || 
                        t.room.toLowerCase().includes(q) || 
                        t.phone.includes(q);
    if (!matchSearch) return false;

    if (currentFilter.value === 'all') return true;
    if (currentFilter.value === 'normal') return t.paymentStatus === 'normal';
    if (currentFilter.value === 'issue') return ['overdue', 'unpaid', 'pending'].includes(t.paymentStatus);
    
    return true;
  });
});

const isExpiringSoon = (dateStr: string) => {
  if (!dateStr) return false;
  const today = new Date();
  const targetDate = new Date(dateStr);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 60;
};

// --- Modal Logic ---
const showModal = ref(false);
const isEditing = ref(false);
const form = ref<Partial<Tenant>>({
  name: '',
  room: '',
  phone: '',
  email: '',
  leaseStart: '',
  leaseEnd: '',
  rent: 0,
  paymentStatus: 'normal',
  emergencyContact: '',
  note: ''
});

// Computed properties for Dropdown logic
const vacantRooms = computed(() => availableRooms.value.filter(r => r.status === 'vacant'));
const currentEditingRoom = computed(() => {
  // 如果正在編輯，且該租客已經有房間，就算該房間狀態是 occupied，也要顯示出來給他選
  if (!form.value.room) return null;
  return availableRooms.value.find(r => r.name === form.value.room);
});

const isRoomInList = (roomName: string) => {
  return availableRooms.value.some(r => r.name === roomName);
};

// 選擇房間時自動帶入價格
const onRoomSelect = () => {
  const r = availableRooms.value.find(room => room.name === form.value.room);
  if (r) {
    form.value.rent = Number(r.price);
  }
};

const openModal = (tenant?: Tenant) => {
  fetchRooms(); // 確保房源資料最新
  if (tenant) {
    isEditing.value = true;
    form.value = JSON.parse(JSON.stringify(tenant));
    // 如果沒有 rent 資料，嘗試從房源補
    if (!form.value.rent && form.value.room) {
       const r = availableRooms.value.find(room => room.name === form.value.room);
       if (r) form.value.rent = r.price;
    }
  } else {
    isEditing.value = false;
    form.value = {
      name: '',
      room: '',
      phone: '',
      leaseStart: '',
      leaseEnd: '',
      rent: 0,
      paymentStatus: 'normal'
    };
  }
  showModal.value = true;
};

// --- Dropdown Logic ---
const activeMenuId = ref<string | null>(null);
const toggleMenu = (id: string) => {
  activeMenuId.value = activeMenuId.value === id ? null : id;
};
const closeDropdown = () => {
  activeMenuId.value = null;
};
</script>