<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
    
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transition-transform duration-300 transform lg:translate-x-0 lg:static lg:block"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="h-full flex flex-col">
        <div class="h-20 flex items-center px-6 border-b border-gray-800 bg-gray-950">
          <div class="flex flex-col gap-1">
            <img :src="logoSrc" alt="Logo" class="h-10 w-auto brightness-200 grayscale contrast-200" />
            <span class="text-[10px] w-fit px-2 py-0.5 bg-red-600 text-white rounded-full font-bold">系統核心管理</span>
          </div>
        </div>
        <nav class="flex-1 overflow-y-auto p-4 space-y-1">
          <router-link 
            v-for="item in menuItems" 
            :key="item.name"
            :to="item.to"
            class="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors group"
            :class="isActive(item.to) ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'"
            @click="isSidebarOpen = false"
          >
            <span class="material-symbols-outlined mr-3 text-[20px]">{{ item.icon }}</span>
            {{ item.name }}
          </router-link>
        </nav>

        <div class="p-4 border-t border-gray-800 bg-gray-950">
          <div class="flex items-center gap-3 mb-4 px-2">
            <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">A</div>
            <div>
              <p class="text-sm font-medium">Administrator</p>
              <p class="text-xs text-gray-500">System Root</p>
            </div>
          </div>
          <button 
            @click="handleLogout"
            class="w-full flex items-center justify-center px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
          >
            <span class="material-symbols-outlined mr-2 text-sm">logout</span>
            登出
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
      <header class="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <img :src="logoSrc" alt="Logo" class="h-8 w-auto" />
        <button @click="isSidebarOpen = true" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <span class="material-symbols-outlined">menu</span>
        </button>
      </header>

      <main class="flex-1 overflow-auto p-4 md:p-8 relative">
        <router-view></router-view>
      </main>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRoute } from 'vue-router';
// [修改開始]
import logoSrc from '../assets/logo.svg';
// [修改結束]

const authStore = useAuthStore();
const route = useRoute();
const isSidebarOpen = ref(false);

const menuItems = [
  { name: '系統總覽', to: { name: 'AdminDashboard' }, icon: 'dashboard' },
  { name: '房東管理', to: { name: 'AdminLandlords' }, icon: 'supervisor_account' },
  { name: '租客與配對', to: { name: 'AdminTenants' }, icon: 'manage_accounts' }, 
  { name: '資料庫操作', to: { name: 'AdminDatabase' }, icon: 'database' },
  { name: '系統模擬器', to: { name: 'SystemSimulator' }, icon: 'settings_remote' },
];

const isActive = (to: any) => {
  return route.name === to.name;
};

const handleLogout = () => {
  if (confirm('確定要登出管理系統嗎？')) {
    authStore.logout();
  }
};
</script>