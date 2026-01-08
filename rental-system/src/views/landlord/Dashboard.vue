<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          早安，{{ authStore.userProfile?.name || '房東' }}
        </h1>
        <p class="text-text-secondary-light">這裡是您的物業概況</p>
      </div>
      <div class="flex gap-3">
        <button 
          @click="$router.push({ name: 'RoomManagement' })"
          class="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">add</span>
          新增房源
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="flex justify-center py-12">
      <span class="material-symbols-outlined animate-spin text-4xl text-gray-300">progress_activity</span>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

      <div class="lg:col-span-4 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between mb-6">
            <div class="flex items-center">
              <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary font-bold text-xl">
                {{ (authStore.userProfile?.name?.[0] || 'Me').toUpperCase() }}
              </div>
              <div class="ml-3">
                <h3 class="font-bold text-lg">{{ authStore.userProfile?.name }}</h3>
                
                <button 
                  @click="copyLandlordCode"
                  class="group flex items-center gap-1 text-xs text-text-secondary-light bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full mt-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title="點擊複製房東 ID"
                >
                  <span>ID: {{ authStore.userProfile?.landlordCode || 'Loading...' }}</span>
                  <span class="material-symbols-outlined text-[10px] text-gray-400 group-hover:text-gray-600 transition-colors">content_copy</span>
                </button>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
            <div 
              v-if="stats.pendingTenants > 0"
              @click="$router.push({ name: 'TenantList' })"
              class="cursor-pointer p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/50 flex items-center justify-between hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
               <div class="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                 <span class="material-symbols-outlined animate-pulse">person_add</span>
                 <div class="flex flex-col">
                   <span class="text-sm font-bold">新租客綁定通知</span>
                   <span class="text-[10px] opacity-80">有人綁定了您的 ID</span>
                 </div>
               </div>
               <span class="bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-100 text-xs font-bold px-2 py-1 rounded-full">
                 {{ stats.pendingTenants }} 人
               </span>
            </div>

             <div 
              @click="$router.push({ name: 'RoomManagement' })"
              class="group cursor-pointer p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <div class="flex justify-between items-center">
                <span class="text-text-secondary-light">名下房源總數</span>
                <span class="material-symbols-outlined text-gray-300 group-hover:text-primary">arrow_forward</span>
              </div>
              <p class="text-3xl font-extrabold text-text-primary-light mt-1 group-hover:text-primary transition-colors">
                {{ stats.totalRooms }} <span class="text-sm font-normal text-text-secondary-light">間</span>
              </p>
            </div>
            
            <div class="grid grid-cols-3 gap-2 text-center text-sm">
              <div class="p-2 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                <div class="font-bold">{{ stats.occupied }}</div>
                <div class="text-xs opacity-80">出租中</div>
              </div>
              <div class="p-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                <div class="font-bold">{{ stats.vacant }}</div>
                <div class="text-xs opacity-80">可出租</div>
              </div>
              <div class="p-2 rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                <div class="font-bold">{{ stats.maintenance }}</div>
                <div class="text-xs opacity-80">維修中</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-8 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-lg flex items-center">
            <span class="material-symbols-outlined mr-2 text-yellow-500">payments</span>
            帳務概況 (全覽)
          </h3>
          <button class="text-sm text-primary hover:underline" @click="$router.push({ name: 'Financials' })">查看詳細報表</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10">
            <p class="text-sm text-text-secondary-light">未繳費</p>
            <div class="flex items-end justify-between mt-2">
              <span class="text-2xl font-bold text-text-primary-light">{{ financial.unpaidCount }} 筆</span>
              <span class="text-sm font-medium text-yellow-600">NT$ {{ financial.unpaidAmount.toLocaleString() }}</span>
            </div>
          </div>
          
          <div class="p-4 rounded-xl border-l-4 border-green-500 bg-green-50 dark:bg-green-900/10">
            <p class="text-sm text-text-secondary-light">已繳費</p>
            <div class="flex items-end justify-between mt-2">
              <span class="text-2xl font-bold text-text-primary-light">{{ financial.paidCount }} 筆</span>
              <span class="text-sm font-medium text-green-600">NT$ {{ financial.paidAmount.toLocaleString() }}</span>
            </div>
          </div>

          <div class="p-4 rounded-xl border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10">
            <p class="text-sm text-text-secondary-light">逾期欠費</p>
            <div class="flex items-end justify-between mt-2">
              <span class="text-2xl font-bold text-red-600">{{ financial.overdueCount }} 筆</span>
              <span class="text-sm font-medium text-red-600">NT$ {{ financial.overdueAmount.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap gap-2">
           <span class="text-sm text-text-secondary-light self-center mr-2">快捷篩選:</span>
           <button class="px-3 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">全部房源</button>
        </div>
      </div>

      <div class="lg:col-span-7 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg flex items-center">
            <span class="material-symbols-outlined mr-2 text-blue-500">electric_bolt</span>
            電表快速登錄
          </h3>
          <span class="text-xs text-text-secondary-light">顯示前 5 筆</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th class="px-4 py-3 rounded-l-lg">房號</th>
                <th class="px-4 py-3">上期度數</th>
                <th class="px-4 py-3">本期度數</th>
                <th class="px-4 py-3 rounded-r-lg">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="room in meterRooms" :key="room.id" class="border-b border-gray-100 dark:border-gray-800 last:border-0">
                <td class="px-4 py-3 font-medium">{{ room.name }}</td>
                <td class="px-4 py-3 text-text-secondary-light">{{ room.lastReading }}</td>
                <td class="px-4 py-3">
                  <input 
                    v-model.number="room.newReading"
                    type="number" 
                    placeholder="輸入度數" 
                    class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    :min="room.lastReading"
                  >
                </td>
                <td class="px-4 py-3">
                  <button 
                    @click="saveMeterReading(room)"
                    :disabled="!room.newReading || room.newReading < room.lastReading"
                    class="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    儲存
                  </button>
                </td>
              </tr>
              <tr v-if="meterRooms.length === 0">
                 <td colspan="4" class="px-4 py-4 text-center text-gray-400">暫無房源資料</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="mt-4 text-center">
          <button class="text-sm text-primary hover:underline flex items-center justify-center w-full" @click="$router.push({ name: 'MeterReading' })">
            批量輸入與進階設定 <span class="material-symbols-outlined text-sm ml-1">arrow_forward</span>
          </button>
        </div>
      </div>

      <div class="lg:col-span-5 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg flex items-center">
            <span class="material-symbols-outlined mr-2 text-orange-500">build_circle</span>
            最新報修
          </h3>
          <span class="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
            {{ repairTickets.length }} 未處理
          </span>
        </div>

        <div class="space-y-3">
          <div 
             v-for="ticket in repairTickets" 
             :key="ticket.id" 
             class="p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary transition-colors cursor-pointer group"
             @click="$router.push({ name: 'RepairRequests' })"
          >
            <div class="flex justify-between items-start">
              <div>
                <span class="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded mr-2">{{ ticket.room }}</span>
                <span class="text-sm font-medium">{{ ticket.tenant }}</span>
              </div>
              <span class="text-xs text-text-secondary-light">{{ ticket.date }}</span>
            </div>
            <p class="mt-2 text-sm text-text-secondary-light line-clamp-1 group-hover:text-text-primary-light">
              <span class="font-bold mr-1" :class="getPriorityColor(ticket.priority)">{{ ticket.type }}:</span>
              {{ ticket.desc }}
            </p>
          </div>

          <div v-if="repairTickets.length === 0" class="text-center py-6 text-gray-400 text-sm">
             目前沒有待處理的報修
          </div>
        </div>
        
        <button 
          @click="$router.push({ name: 'RepairRequests' })"
          class="mt-4 w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-text-secondary-light hover:text-primary hover:border-primary transition-colors"
        >
          查看所有報修紀錄
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { db } from '../../firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  doc, 
  updateDoc, 
  addDoc
} from 'firebase/firestore';

const authStore = useAuthStore();
const isLoading = ref(true);

// --- 狀態資料 ---
const stats = reactive({
  totalRooms: 0,
  occupied: 0,
  vacant: 0,
  maintenance: 0,
  pendingTenants: 0 // [新增]
});

const financial = reactive({
  unpaidCount: 0,
  unpaidAmount: 0,
  paidCount: 0,
  paidAmount: 0,
  overdueCount: 0,
  overdueAmount: 0
});

interface MeterRoom {
  id: string;
  name: string;
  lastReading: number;
  newReading?: number;
}
const meterRooms = ref<MeterRoom[]>([]);

interface RepairTicket {
  id: string;
  room: string;
  tenant: string;
  type: string;
  desc: string;
  date: string;
  priority: string;
}
const repairTickets = ref<RepairTicket[]>([]);

// --- 複製房東 ID 功能 ---
const copyLandlordCode = async () => {
  const code = authStore.userProfile?.landlordCode;
  
  if (!code) {
    alert('房東 ID 載入中，請稍後再試。');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(code);
    alert(`已複製房東 ID: ${code}\n您可以將此 ID 分享給租客，讓他們綁定您的帳號。`);
  } catch (err) {
    console.error('複製失敗:', err);
    alert('複製失敗，請手動選取複製。');
  }
};

// --- 資料讀取與處理 (Firebase) ---

const fetchDashboardData = async () => {
  if (!authStore.user) return;
  const uid = authStore.user.uid;
  // 確保取得房東代碼
  const myLandlordCode = authStore.userProfile?.landlordCode;

  isLoading.value = true;

  try {
    // 1. 讀取房源統計 & 電表資料
    // [重點] 確保使用 landlordId 篩選，這樣新建立的房源才會出現
    const roomsQuery = query(collection(db, 'rooms'), where('landlordId', '==', uid));
    const roomsSnap = await getDocs(roomsQuery);
    
    stats.totalRooms = roomsSnap.size;
    stats.occupied = 0;
    stats.vacant = 0;
    stats.maintenance = 0;
    
    const tempMeterRooms: MeterRoom[] = [];

    roomsSnap.forEach(doc => {
      const data = doc.data();
      if (data.status === 'occupied') stats.occupied++;
      else if (data.status === 'maintenance') stats.maintenance++;
      else stats.vacant++;

      if (tempMeterRooms.length < 5) {
        tempMeterRooms.push({
          id: doc.id,
          name: data.roomName || data.name || data.roomNumber || '未命名',
          lastReading: Number(data.currentMeter) || 0,
          newReading: undefined
        });
      }
    });
    meterRooms.value = tempMeterRooms.sort((a, b) => a.name.localeCompare(b.name));

    // [新增] 2. 讀取「新綁定」的線上租客
    if (myLandlordCode) {
      const usersQuery = query(collection(db, 'users'), where('boundLandlordCode', '==', myLandlordCode));
      const usersSnap = await getDocs(usersQuery);
      // 這裡簡單計算所有綁定的用戶數量，實務上您可以進一步比對是否已在 tenants 列表中
      // 目前為了讓您直接看到效果，直接顯示總連結人數
      // 如果您希望只顯示「未處理」的，通常需要比對 tenants collection
      stats.pendingTenants = usersSnap.size; 
    }

    // 3. 讀取帳務概況
    const billsQuery = query(collection(db, 'bills'), where('landlordId', '==', uid));
    const billsSnap = await getDocs(billsQuery);

    financial.unpaidCount = 0;
    financial.unpaidAmount = 0;
    financial.paidCount = 0;
    financial.paidAmount = 0;
    financial.overdueCount = 0;
    financial.overdueAmount = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    billsSnap.forEach(doc => {
      const data = doc.data();
      const amount = Number(data.totalAmount) || 0;
      
      if (data.status === 'paid') {
        financial.paidCount++;
        financial.paidAmount += amount;
      } else {
        if (data.dueDate && data.dueDate < todayStr) {
          financial.overdueCount++;
          financial.overdueAmount += amount;
        } else {
          financial.unpaidCount++;
          financial.unpaidAmount += amount;
        }
      }
    });

    // 4. 讀取最新報修
    const repairsQuery = query(
      collection(db, 'repairs'),
      where('landlordId', '==', uid),
      where('status', 'in', ['pending', 'processing']),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    
    try {
      const repairsSnap = await getDocs(repairsQuery);
      repairTickets.value = repairsSnap.docs.map(doc => {
        const data = doc.data();
        let dateStr = '';
        if (data.createdAt && data.createdAt.toDate) {
            const d = data.createdAt.toDate();
            dateStr = `${d.getMonth()+1}/${d.getDate()}`;
        }
        
        return {
          id: doc.id,
          room: data.roomNumber || '未知',
          tenant: data.tenantName || '未知',
          type: data.type || '維修',
          desc: data.description || '',
          date: dateStr,
          priority: data.priority || 'medium'
        };
      });
    } catch (err) {
      console.warn('Repairs query error (check indexes):', err);
    }

  } catch (error) {
    console.error('Fetch dashboard data error:', error);
  } finally {
    isLoading.value = false;
  }
};

// --- 操作函式 ---

const saveMeterReading = async (room: MeterRoom) => {
  if (!room.newReading || !authStore.user) return;
  
  if (!confirm(`確定要將 ${room.name} 的度數更新為 ${room.newReading} 嗎？`)) return;

  try {
    const roomRef = doc(db, 'rooms', room.id);
    
    await updateDoc(roomRef, {
      currentMeter: room.newReading,
      lastMeterUpdate: new Date().toISOString()
    });

    await addDoc(collection(db, 'meter_readings'), {
      roomId: room.id,
      landlordId: authStore.user.uid,
      roomName: room.name,
      reading: room.newReading,
      date: new Date().toISOString(),
      type: 'manual_quick'
    });

    room.lastReading = room.newReading;
    room.newReading = undefined;
    alert('儲存成功！');

  } catch (error) {
    console.error('Save meter reading error:', error);
    alert('儲存失敗，請稍後再試。');
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-orange-500';
    case 'low': return 'text-blue-500';
    default: return 'text-gray-500';
  }
};

onMounted(() => {
  // 等待 authStore 初始化完成再讀取資料
  if (authStore.user) {
    fetchDashboardData();
  } else {
    // 簡單的 retry 機制，確保重整頁面時也能讀到
    setTimeout(() => {
        if (authStore.user) fetchDashboardData();
    }, 1000);
  }
});
</script>