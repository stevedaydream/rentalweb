<template>
  <div class="min-h-screen bg-background-light dark:bg-background-dark flex">
    
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-card-dark border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:block"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="h-full flex flex-col">
        <div class="h-20 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
          <div class="flex flex-col gap-1">
            <img :src="logoSrc" alt="Logo" class="h-10 w-auto" />
            <span class="text-[10px] w-fit px-2 py-0.5 bg-green-100 text-green-600 rounded-full font-bold ml-1">租客專用版</span>
          </div>
        </div>
        <nav class="flex-1 overflow-y-auto p-4 space-y-1">
          <router-link 
            v-for="item in menuItems" 
            :key="item.name"
            :to="item.to"
            class="flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-colors group relative"
            :class="isActive(item.to) ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200' : 'text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800'"
            @click="isSidebarOpen = false"
          >
            <div class="flex items-center">
              <span class="material-symbols-outlined mr-3 text-[20px]">{{ item.icon }}</span>
              {{ item.name }}
            </div>
            
            <span v-if="item.hasNotification" class="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50"></span>
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
        <img :src="logoSrc" alt="Logo" class="h-8 w-auto" />
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRoute } from 'vue-router';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
// [修改開始]：引入 Logo 路徑
import logoSrc from '../assets/logo.svg';
// [修改結束]

const authStore = useAuthStore();
const route = useRoute();
const isSidebarOpen = ref(false);
const hasNewReply = ref(false);

let unsubscribe: (() => void) | null = null;

const menuItems = computed(() => [
  { name: '儀表板', to: { name: 'TenantDashboard' }, icon: 'dashboard', hasNotification: false },
  { name: '我的帳單', to: { name: 'TenantBills' }, icon: 'receipt_long', hasNotification: false },
  { name: '社區公告', to: { name: 'TenantAnnouncements' }, icon: 'campaign', hasNotification: false },
  { name: '報修申請', to: { name: 'TenantRepairs' }, icon: 'build_circle', hasNotification: false },
  { name: '聯繫房東', to: { name: 'ContactLandlord' }, icon: 'support_agent', hasNotification: hasNewReply.value },
]);

const isActive = (to: any) => {
  return route.name === to.name;
};

const handleLogout = () => {
  if (confirm('確定要登出嗎？')) {
    authStore.logout();
  }
};

const handleMessageReadEvent = () => {
  hasNewReply.value = false;
};

onMounted(() => {
  window.addEventListener('messages-read', handleMessageReadEvent);

  if (authStore.user) {
    const q = query(
      collection(db, 'messages'),
      where('tenantId', '==', authStore.user.uid)
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
      const totalReplies = snapshot.docs.filter(doc => doc.data().reply).length;
      const readCount = parseInt(localStorage.getItem('tenant_read_reply_count') || '0');

      if (totalReplies > readCount) {
        if (route.name === 'ContactLandlord') {
           localStorage.setItem('tenant_read_reply_count', totalReplies.toString());
           hasNewReply.value = false;
        } else {
           hasNewReply.value = true;
        }
      } else {
        hasNewReply.value = false;
      }
    }, (error) => {
      console.error("Layout 監聽訊息錯誤:", error);
    });
  }
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
  window.removeEventListener('messages-read', handleMessageReadEvent);
});
</script>