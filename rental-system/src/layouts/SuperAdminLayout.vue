<template>
  <div class="min-h-screen bg-background-light dark:bg-background-dark flex">
    
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-64 bg-ink-800 text-white transition-transform duration-300 transform lg:translate-x-0 lg:static lg:block"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full invisible lg:visible'"
    >
      <div class="h-full flex flex-col">
        <div class="h-20 flex items-center px-6 border-b border-ink-700 bg-ink-900">
          <div class="flex flex-col gap-1">
            <img :src="logoSrc" alt="Logo" class="h-10 w-auto brightness-0 invert" />
            <span class="text-[10px] w-fit px-2 py-0.5 bg-gold-500/15 text-gold-300 rounded-full font-bold">系統核心管理</span>
          </div>
        </div>
        <nav class="flex-1 overflow-y-auto p-4 space-y-1">
          <router-link 
            v-for="item in menuItems" 
            :key="item.name"
            :to="item.to"
            class="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors group"
            :class="isActive(item.to) ? 'bg-gold-500/15 text-gold-300' : 'text-ink-300 hover:bg-ink-700 hover:text-white'"
            @click="isSidebarOpen = false"
          >
            <span class="material-symbols-outlined mr-3 text-[20px]" aria-hidden="true">{{ item.icon }}</span>
            {{ item.name }}
          </router-link>
        </nav>

        <div class="p-4 border-t border-ink-700 bg-ink-900">
          <div class="flex items-center gap-3 mb-4 px-2">
            <div class="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {{ adminInitial }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ adminName }}</p>
              <p class="text-xs text-ink-300 truncate">{{ adminEmail }}</p>
            </div>
          </div>
          <button 
            @click="handleLogout"
            class="w-full flex items-center justify-center px-4 py-2 text-sm font-medium bg-ink-700 hover:bg-ink-600 rounded-lg transition-colors border border-gray-700"
          >
            <span class="material-symbols-outlined mr-2 text-sm" aria-hidden="true">logout</span>
            登出
          </button>
          <AppCopyright inverse class="pt-3" />
        </div>
      </div>
    </aside>

    <div
      v-if="isSidebarOpen"
      @click="isSidebarOpen = false"
      @keydown.enter="isSidebarOpen = false"
      @keydown.space.prevent="isSidebarOpen = false"
      role="button"
      tabindex="0"
      aria-label="關閉選單"
      class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
    ></div>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header class="lg:hidden flex items-center justify-between p-4 bg-ink-800 text-white border-b border-ink-700">
        <img :src="logoSrc" alt="Logo" class="h-8 w-auto brightness-0 invert" />
        <button @click="isSidebarOpen = true" class="p-2 rounded-lg hover:bg-ink-700" aria-label="開啟選單">
          <span class="material-symbols-outlined" aria-hidden="true">menu</span>
        </button>
      </header>

      <main class="flex-1 overflow-auto p-4 md:p-8 relative">
        <PlatformNotifications /><router-view></router-view>
      </main>
    </div>

  </div>
</template>

<script setup lang="ts">
import AppCopyright from '../components/AppCopyright.vue';
import PlatformNotifications from '../components/PlatformNotifications.vue';
import '../assets/admin.css';
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRoute } from 'vue-router';
import logoSrc from '../assets/logo.svg';

const authStore = useAuthStore();
const route = useRoute();
const isSidebarOpen = ref(false);

const adminName = computed(() => authStore.userProfile?.name || '系統管理員');
const adminEmail = computed(() => authStore.user?.email || '');
const adminInitial = computed(() => {
  const name = authStore.userProfile?.name || authStore.user?.email || 'A';
  return name.charAt(0).toUpperCase();
});

const menuItems = [
  { name: '待處理事項', to: { path: '/admin/dashboard' }, icon: 'space_dashboard' },
  { name: '房東管理', to: { path: '/admin/manage/users' }, icon: 'supervisor_account' },
  { name: '建物與房間', to: { path: '/admin/manage/properties' }, icon: 'apartment' },
  { name: '全平台房間', to: { path: '/admin/manage/rooms' }, icon: 'meeting_room' },
  { name: '租客管理', to: { path: '/admin/manage/tenants' }, icon: 'manage_accounts' },
  { name: '帳務管理', to: { path: '/admin/manage/bills' }, icon: 'account_balance_wallet' },
  { name: '租約管理', to: { path: '/admin/manage/contracts' }, icon: 'description' },
  { name: '簽署合約', to: { path: '/admin/manage/signed_contracts' }, icon: 'draw' },
  { name: '平台求助', to: { path: '/admin/support' }, icon: 'support_agent' },
  { name: '操作紀錄', to: { path: '/admin/audit' }, icon: 'history' },
  { name: '平台維護', to: { path: '/admin/maintenance' }, icon: 'settings' },
];
const isActive = (to: { path: string }) => route.path === to.path;
const handleLogout = () => {
  if (confirm('確定要登出管理系統嗎？')) {
    authStore.logout();
  }
};
</script>
