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

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

      <div class="lg:col-span-4 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between mb-6">
            <div class="flex items-center">
              <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary font-bold text-xl">
                {{ (authStore.userProfile?.name?.[0] || 'Me').toUpperCase() }}
              </div>
              <div class="ml-3">
                <h3 class="font-bold text-lg">{{ authStore.userProfile?.name }}</h3>
                <p class="text-xs text-text-secondary-light bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full inline-block mt-1">
                  ID: {{ authStore.userProfile?.landlordCode || 'Loading...' }}
                </p>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
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
            本月帳務概況
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
           <button class="px-3 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">台北市 (3)</button>
           <button class="px-3 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">基隆市 (2)</button>
        </div>
      </div>

      <div class="lg:col-span-7 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg flex items-center">
            <span class="material-symbols-outlined mr-2 text-blue-500">electric_bolt</span>
            電表快速登錄
          </h3>
          <select class="px-3 py-1 rounded-lg border border-gray-200 text-sm bg-transparent">
            <option>2025年 10月</option>
            <option>2025年 9月</option>
          </select>
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
                    type="number" 
                    placeholder="輸入度數" 
                    class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                </td>
                <td class="px-4 py-3">
                  <button class="text-blue-600 hover:text-blue-800 font-medium">儲存</button>
                </td>
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
          <span class="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">3 未處理</span>
        </div>

        <div class="space-y-3">
          <div v-for="ticket in repairTickets" :key="ticket.id" class="p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary transition-colors cursor-pointer group">
            <div class="flex justify-between items-start">
              <div>
                <span class="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded mr-2">{{ ticket.room }}</span>
                <span class="text-sm font-medium">{{ ticket.tenant }}</span>
              </div>
              <span class="text-xs text-text-secondary-light">{{ ticket.date }}</span>
            </div>
            <p class="mt-2 text-sm text-text-secondary-light line-clamp-1 group-hover:text-text-primary-light">
              <span class="font-bold mr-1" :class="ticket.priorityColor">{{ ticket.type }}:</span>
              {{ ticket.desc }}
            </p>
          </div>
        </div>
        
        <button class="mt-4 w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-text-secondary-light hover:text-primary hover:border-primary transition-colors">
          查看所有報修紀錄
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();

// --- Mock Data (之後替換為 Firebase 資料) ---
const stats = ref({
  totalRooms: 12,
  occupied: 8,
  vacant: 3,
  maintenance: 1
});

const financial = ref({
  unpaidCount: 5,
  unpaidAmount: 45000,
  paidCount: 15,
  paidAmount: 180000,
  overdueCount: 2,
  overdueAmount: 24000
});

const meterRooms = ref([
  { id: 1, name: '201室', lastReading: 1450 },
  { id: 2, name: '202室', lastReading: 2100 },
  { id: 3, name: '301室', lastReading: 3050 },
]);

const repairTickets = ref([
  { id: 1, room: '201室', tenant: '陳小明', type: '漏水', desc: '浴室洗手台下方一直在漏水，地板都濕了', date: '今天 10:30', priorityColor: 'text-red-500' },
  { id: 2, room: '305室', tenant: '王阿姨', type: '家電', desc: '冷氣不冷，而且有怪聲音', date: '昨天 15:20', priorityColor: 'text-orange-500' },
  { id: 3, room: '402室', tenant: '李大同', type: '網路', desc: 'Wi-Fi 連不上，重開機也沒用', date: '10/22', priorityColor: 'text-blue-500' },
]);

</script>