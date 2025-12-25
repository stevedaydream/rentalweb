<template>
  <div class="min-h-screen bg-background-light dark:bg-background-dark flex">
    
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-card-dark border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:block"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="h-full flex flex-col">
        <div class="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
          <span class="material-symbols-outlined text-primary mr-2">home_work</span>
          <span class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">租屋管家 <span class="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full">租客版</span></span>
        </div>

        <nav class="flex-1 overflow-y-auto p-4 space-y-1">
          <router-link 
            v-for="item in menuItems" 
            :key="item.name"
            :to="item.to"
            class="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors group"
            :class="isActive(item.to) ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200' : 'text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800'"
            @click="isSidebarOpen = false"
          >
            <span class="material-symbols-outlined mr-3 text-[20px]">{{ item.icon }}</span>
            {{ item.name }}
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
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRoute } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const isSidebarOpen = ref(false);

const menuItems = [
  { name: '儀表板', to: { name: 'TenantDashboard' }, icon: 'dashboard' },
  { name: '我的帳單', to: { name: 'TenantBills' }, icon: 'receipt_long' }, // 待開發
  { name: '社區公告', to: { name: 'TenantAnnouncements' }, icon: 'campaign' }, // 待開發
  { name: '報修申請', to: { name: 'TenantRepairs' }, icon: 'build_circle' }, // 待開發
  { name: '聯繫房東', to: { name: 'ContactLandlord' }, icon: 'support_agent' }, // 待開發
];

const isActive = (to: any) => {
  return route.name === to.name;
};

const handleLogout = () => {
  if (confirm('確定要登出嗎？')) {
    authStore.logout();
  }
};
</script>