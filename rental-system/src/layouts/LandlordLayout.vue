<template>
  <div class="min-h-screen bg-background-light dark:bg-background-dark flex">
    
    <aside
      class="fixed inset-y-0 left-0 z-50 w-64 bg-ink-800 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:block"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="h-full flex flex-col">
        <div class="h-20 flex items-center px-6 border-b border-ink-700">
          <div class="flex flex-col gap-1">
            <img :src="logoSrc" alt="Logo" class="h-10 w-auto brightness-0 invert" />
            <span class="text-[10px] w-fit px-2 py-0.5 bg-gold-500/20 text-gold-300 rounded-full font-bold ml-1">房東管理版</span>
          </div>
        </div>
        <nav class="flex-1 overflow-y-auto p-4 space-y-1">
          <router-link
            v-for="item in menuItems"
            :key="item.name"
            :to="item.to"
            class="relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors group"
            :class="isActive(item.to) ? 'bg-gold-500/15 text-gold-300' : 'text-ink-300 hover:bg-ink-700 hover:text-ink-100'"
            @click="isSidebarOpen = false"
          >
            <span class="material-symbols-outlined mr-3 text-[20px]">{{ item.icon }}</span>
            <span class="flex-1">{{ item.name }}</span>

            <span
              v-if="getBadgeCount(item.id) > 0"
              class="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold-500 text-ink-900"
            >
              {{ getBadgeCount(item.id) > 99 ? '99+' : getBadgeCount(item.id) }}
            </span>
            <span
              v-else-if="getBadgeDot(item.id)"
              class="ml-2 w-2 h-2 rounded-full bg-gold-400"
            ></span>

          </router-link>
        </nav>

        <div class="p-4 border-t border-ink-700">
          <button
            @click="handleLogout"
            class="w-full flex items-center px-4 py-3 text-sm font-medium text-ink-400 hover:bg-ink-700 hover:text-red-400 rounded-xl transition-colors"
          >
            <span class="material-symbols-outlined mr-3">{{ authStore.impersonatingLandlord ? 'manage_accounts' : 'logout' }}</span>
            {{ authStore.impersonatingLandlord ? '結束模擬' : '登出系統' }}
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
      <header class="lg:hidden flex items-center justify-between p-4 bg-ink-800 border-b border-ink-700">
        <img :src="logoSrc" alt="Logo" class="h-8 w-auto brightness-0 invert" />
        <button @click="isSidebarOpen = true" class="p-2 rounded-lg text-ink-300 hover:bg-ink-700">
          <span class="material-symbols-outlined">menu</span>
        </button>
      </header>

      <!-- 模擬身份 Banner -->
      <div v-if="authStore.impersonatingLandlord" class="flex items-center justify-between px-4 py-2 bg-amber-400 text-amber-900 text-sm font-medium">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-base">manage_accounts</span>
          <span>正在模擬房東：<strong>{{ authStore.impersonatingLandlord.name }}</strong>（{{ authStore.impersonatingLandlord.landlordCode }}）</span>
        </div>
        <button
          @click="authStore.stopImpersonation()"
          class="flex items-center gap-1 px-3 py-1 bg-amber-900/20 hover:bg-amber-900/30 rounded-lg transition-colors"
        >
          <span class="material-symbols-outlined text-base">close</span>
          結束模擬
        </button>
      </div>

      <main class="flex-1 overflow-auto p-4 md:p-8">
        <router-view></router-view>
      </main>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useNotificationStore } from '../stores/notification';
import { useRoute } from 'vue-router';
import logoSrc from '../assets/logo.svg';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const route = useRoute();
const isSidebarOpen = ref(false);

const menuItems = [
  { id: 'dashboard', name: '儀表板', to: { name: 'LandlordDashboard' }, icon: 'dashboard' },
  { id: 'rooms', name: '房源管理', to: { name: 'RoomManagement' }, icon: 'bedroom_parent' },
  { id: 'tenants', name: '租客列表', to: { name: 'TenantList' }, icon: 'group', badgeColor: 'bg-orange-500 text-white' },
  { id: 'announcements', name: '社區公告', to: { name: 'LandlordAnnouncements' }, icon: 'campaign' },
  { id: 'financials', name: '帳務管理', to: { name: 'Financials' }, icon: 'payments' },
  { id: 'investment', name: '投資試算', to: { name: 'InvestmentCalculator' }, icon: 'analytics' },
  { id: 'meter', name: '電表登錄', to: { name: 'MeterReading' }, icon: 'electric_meter' },
  { id: 'meter-history', name: '電表歷史', to: { name: 'MeterReadingHistory' }, icon: 'history' },
  { id: 'repairs', name: '報修管理', to: { name: 'RepairRequests' }, icon: 'build' },
  { id: 'building', name: '大樓資訊', to: { name: 'LandlordBuildingInfo' }, icon: 'apartment' },
  { id: 'contract', name: '電子合約', to: { name: 'Contract' }, icon: 'history_edu' },
  { id: 'receipts', name: '收據產生', to: { name: 'Receipts' }, icon: 'receipt' },
  { id: 'reviews', name: '評價管理', to: { name: 'LandlordReviews' }, icon: 'star' },
  { id: 'messages', name: '訊息中心', to: { name: 'LandlordMessages' }, icon: 'chat', badgeColor: 'bg-red-500 text-white' },
  { id: 'settings', name: '系統設定', to: { name: 'Settings' }, icon: 'settings' },
];

onMounted(() => {
  if (!authStore.user) return;
  notificationStore.startListeners(authStore.effectiveUid);
});

onUnmounted(() => {
  notificationStore.stopListeners();
});

const isActive = (to: any) => {
  return route.name === to.name;
};

const handleLogout = () => {
  if (authStore.impersonatingLandlord) {
    authStore.stopImpersonation();
  } else if (confirm('確定要登出嗎？')) {
    authStore.logout();
  }
};

const getBadgeCount = (id: string): number => notificationStore.getBadgeCount(id);
const getBadgeDot = (id: string): boolean => notificationStore.getBadgeDot(id);
</script>