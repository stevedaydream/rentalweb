<template>
  <div class="min-h-screen bg-background-light dark:bg-background-dark flex">
    
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-card-dark border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:block"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="h-full flex flex-col">
        <div class="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
          <span class="material-symbols-outlined text-primary mr-2">home_work</span>
          <span class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">租屋管家 <span class="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">房東版</span></span>
        </div>

        <nav class="flex-1 overflow-y-auto p-4 space-y-1">
          <router-link 
            v-for="item in menuItems" 
            :key="item.name"
            :to="item.to"
            class="relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors group"
            :class="isActive(item.to) ? 'bg-blue-50 text-primary dark:bg-blue-900/20 dark:text-blue-200' : 'text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800'"
            @click="isSidebarOpen = false"
          >
            <span class="material-symbols-outlined mr-3 text-[20px]">{{ item.icon }}</span>
            <span class="flex-1">{{ item.name }}</span>

            <span 
              v-if="notifications[item.id] > 0" 
              class="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm transition-transform transform scale-100"
              :class="item.badgeColor || 'bg-red-500 text-white'"
            >
              {{ notifications[item.id] > 99 ? '99+' : notifications[item.id] }}
            </span>
            <span 
              v-else-if="notifications[item.id] === true" 
              class="ml-2 w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"
            ></span>

          </router-link>
        </nav>

        <div class="p-4 border-t border-gray-100 dark:border-gray-800">
          <button 
            @click="handleLogout"
            class="w-full flex items-center px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            <span class="material-symbols-outlined mr-3">logout</span>
            登出系統
          </button>
        </div>
      </div>
    </aside>

    <div 
      v-if="isSidebarOpen" 
      @click="isSidebarOpen = false"
      class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
    ></div>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header class="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-800">
        <span class="font-bold text-lg">Dashboard</span>
        <button @click="isSidebarOpen = true" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <span class="material-symbols-outlined">menu</span>
        </button>
      </header>

      <main class="flex-1 overflow-auto p-4 md:p-8">
        <router-view></router-view>
      </main>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRoute } from 'vue-router';
import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  limit
} from 'firebase/firestore';

const authStore = useAuthStore();
const route = useRoute();
const isSidebarOpen = ref(false);

// [新增] 通知狀態
const notifications = reactive<Record<string, number | boolean>>({
  messages: 0,
  tenants: 0,
  financials: false // Boolean for electricity bill warning
});

// 定義選單結構，加入 id 以便對應通知
const menuItems = [
  { id: 'dashboard', name: '儀表板', to: { name: 'LandlordDashboard' }, icon: 'dashboard' },
  { id: 'rooms', name: '房源管理', to: { name: 'RoomManagement' }, icon: 'bedroom_parent' },
  { id: 'tenants', name: '租客列表', to: { name: 'TenantList' }, icon: 'group', badgeColor: 'bg-orange-500 text-white' },
  { id: 'announcements', name: '社區公告', to: { name: 'LandlordAnnouncements' }, icon: 'campaign' },
  { id: 'financials', name: '帳務管理', to: { name: 'Financials' }, icon: 'payments' },
  { id: 'meter', name: '電表登錄', to: { name: 'MeterReading' }, icon: 'electric_meter' },
  { id: 'meter-history', name: '電表歷史', to: { name: 'MeterReadingHistory' }, icon: 'history' },
  { id: 'repairs', name: '報修管理', to: { name: 'RepairRequests' }, icon: 'build' },
  { id: 'contract', name: '電子合約', to: { name: 'Contract' }, icon: 'history_edu' },
  { id: 'receipts', name: '收據產生', to: { name: 'Receipts' }, icon: 'receipt' },
  { id: 'messages', name: '訊息中心', to: { name: 'LandlordMessages' }, icon: 'chat', badgeColor: 'bg-red-500 text-white' }, 
  { id: 'settings', name: '系統設定', to: { name: 'Settings' }, icon: 'settings' },
];

let unsubMessages: (() => void) | null = null;
let unsubTenants: (() => void) | null = null;
let unsubBills: (() => void) | null = null;

onMounted(() => {
  if (!authStore.user) return;
  const uid = authStore.user.uid;

  // 1. 監聽未讀訊息 (訊息中心)
  const qMessages = query(
    collection(db, 'messages'),
    where('landlordId', '==', uid),
    where('isRead', '==', false)
  );
  unsubMessages = onSnapshot(qMessages, (snap) => {
    notifications.messages = snap.size;
  });

  // 2. 監聽租約到期 (租客列表) - 90天內
  const qTenants = query(
    collection(db, 'tenants'),
    where('landlordId', '==', uid)
  );
  unsubTenants = onSnapshot(qTenants, (snap) => {
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setDate(today.getDate() + 90);

    let count = 0;
    snap.forEach(doc => {
      const data = doc.data();
      if (data.leaseEnd) {
        const endDate = new Date(data.leaseEnd);
        // 檢查是否在今天之後且90天內 (即將到期)
        if (endDate >= today && endDate <= threeMonthsLater) {
          count++;
        }
      }
    });
    notifications.tenants = count;
  });

  // 3. 檢查本期電費是否已登錄 (帳務管理)
  // 邏輯：檢查 taipower_bills 是否有當月(YYYY-MM)的紀錄
  const qBills = query(
    collection(db, 'taipower_bills'),
    orderBy('month', 'desc'),
    limit(5) // 抓最近幾筆即可
  );
  
  unsubBills = onSnapshot(qBills, (snap) => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const hasCurrentMonth = snap.docs.some(doc => doc.data().month === currentMonth);
    
    // 如果沒有當月帳單，顯示紅點提醒 (true)
    notifications.financials = !hasCurrentMonth;
  });
});

onUnmounted(() => {
  if (unsubMessages) unsubMessages();
  if (unsubTenants) unsubTenants();
  if (unsubBills) unsubBills();
});

const isActive = (to: any) => {
  return route.name === to.name;
};

const handleLogout = () => {
  if (confirm('確定要登出嗎？')) {
    authStore.logout();
  }
};
</script>