<template>
  <div class="min-h-screen bg-background-light dark:bg-background-dark flex">

    <!-- ── Desktop Sidebar (lg+) ── -->
    <aside
      class="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-ink-800 flex-col lg:static lg:w-64"
    >
      <div class="h-full flex flex-col">
        <div class="h-20 flex items-center px-6 border-b border-ink-700">
          <div class="flex flex-col gap-1">
            <img :src="logoSrc" alt="Logo" class="h-10 w-auto brightness-0 invert" />
            <span class="text-[10px] w-fit px-2 py-0.5 bg-gold-500/20 text-gold-300 rounded-full font-bold ml-1">租客專用版</span>
          </div>
        </div>
        <nav class="flex-1 overflow-y-auto p-4 space-y-1">
          <router-link
            v-for="item in menuItems"
            :key="item.name"
            :to="item.to"
            class="flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-colors"
            :class="isActive(item.to) ? 'bg-gold-500/15 text-gold-300' : 'text-ink-300 hover:bg-ink-700 hover:text-ink-100'"
          >
            <div class="flex items-center">
              <span class="material-symbols-outlined mr-3 text-[20px]">{{ item.icon }}</span>
              {{ item.name }}
            </div>
            <span
              v-if="getBadgeCount(item) > 0"
              class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gold-500 text-ink-900 min-w-[18px] text-center"
            >
              {{ getBadgeCount(item) > 99 ? '99+' : getBadgeCount(item) }}
            </span>
            <span v-else-if="item.id === 'contact' && hasNewReply" class="w-2 h-2 bg-gold-400 rounded-full animate-pulse"></span>
          </router-link>
        </nav>
        <div class="p-4 border-t border-ink-700">
          <button
            @click="handleLogout"
            class="w-full flex items-center px-4 py-3 text-sm font-medium text-ink-400 hover:bg-ink-700 hover:text-red-400 rounded-xl transition-colors"
          >
            <span class="material-symbols-outlined mr-3">logout</span>
            登出系統
          </button>
        </div>
      </div>
    </aside>

    <!-- ── Main content area ── -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

      <!-- Mobile minimal top bar (< lg) -->
      <header class="lg:hidden flex items-center justify-between px-4 py-3 bg-ink-800 border-b border-ink-700">
        <img :src="logoSrc" alt="Logo" class="h-8 w-auto brightness-0 invert" />
        <span class="text-[10px] px-2 py-0.5 bg-gold-500/20 text-gold-300 rounded-full font-bold">租客版</span>
      </header>

      <!-- Page content; pb-24 on mobile to clear bottom tab bar -->
      <main class="flex-1 overflow-auto p-4 md:p-8 pb-24 lg:pb-8">
        <router-view></router-view>
      </main>
    </div>

    <!-- ── Mobile Bottom Tab Bar (< lg) ── -->
    <nav class="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-ink-800 border-t border-ink-700 flex safe-area-inset-bottom">
      <router-link
        v-for="item in menuItems"
        :key="item.id"
        :to="item.to"
        class="flex-1 flex flex-col items-center py-2 pt-2.5 relative transition-colors min-w-0"
        :class="isActive(item.to) ? 'text-gold-400' : 'text-ink-400 hover:text-ink-200'"
      >
        <!-- icon + badge -->
        <div class="relative">
          <span class="material-symbols-outlined text-[22px]" :class="isActive(item.to) ? 'text-gold-400' : ''">{{ item.icon }}</span>

          <!-- number badge -->
          <span
            v-if="getBadgeCount(item) > 0"
            class="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-red-500 text-white flex items-center justify-center leading-none"
          >
            {{ getBadgeCount(item) > 99 ? '99+' : getBadgeCount(item) }}
          </span>
          <!-- dot badge -->
          <span
            v-else-if="item.id === 'contact' && hasNewReply"
            class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-gold-400"
          ></span>
        </div>

        <span class="text-[10px] mt-0.5 font-medium leading-tight truncate w-full text-center px-0.5">{{ item.tabLabel }}</span>

        <!-- active indicator bar -->
        <span v-if="isActive(item.to)" class="absolute top-0 inset-x-2 h-0.5 bg-gold-400 rounded-full"></span>
      </router-link>
    </nav>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRoute } from 'vue-router';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import logoSrc from '../assets/logo.svg';

const authStore = useAuthStore();
const route = useRoute();

const hasNewReply = ref(false);
const replyCount = ref(0);
const unpaidBillCount = ref(0);

let unsubMessages: (() => void) | null = null;
let unsubBills: (() => void) | null = null;

interface MenuItem {
  id: string;
  name: string;
  tabLabel: string;
  to: { name: string };
  icon: string;
}

const menuItems = computed<MenuItem[]>(() => [
  { id: 'dashboard',     name: '儀表板',  tabLabel: '首頁', to: { name: 'TenantDashboard' },    icon: 'dashboard' },
  { id: 'bills',         name: '我的帳單', tabLabel: '帳單', to: { name: 'TenantBills' },         icon: 'receipt_long' },
  { id: 'announcements', name: '社區公告', tabLabel: '公告', to: { name: 'TenantAnnouncements' }, icon: 'campaign' },
  { id: 'repairs',       name: '報修申請', tabLabel: '報修', to: { name: 'TenantRepairs' },       icon: 'build_circle' },
  { id: 'contact',       name: '聯繫房東', tabLabel: '聯繫', to: { name: 'ContactLandlord' },     icon: 'support_agent' },
  { id: 'building',      name: '大樓資訊', tabLabel: '資訊', to: { name: 'TenantBuildingInfo' },  icon: 'apartment' },
]);

const getBadgeCount = (item: MenuItem): number => {
  if (item.id === 'bills') return unpaidBillCount.value;
  if (item.id === 'contact') return replyCount.value;
  return 0;
};

const isActive = (to: { name: string }) => route.name === to.name;

const handleLogout = () => {
  if (confirm('確定要登出嗎？')) {
    authStore.logout();
  }
};

const handleMessageReadEvent = () => {
  replyCount.value = 0;
  hasNewReply.value = false;
};

onMounted(() => {
  window.addEventListener('messages-read', handleMessageReadEvent);

  if (!authStore.user) return;
  const uid = authStore.user.uid;

  // 監聽未繳帳單數
  unsubBills = onSnapshot(
    query(collection(db, 'bills'), where('tenantId', '==', uid), where('status', 'in', ['pending', 'overdue'])),
    (snap) => { unpaidBillCount.value = snap.size; },
    (err) => console.error('bills listener:', err)
  );

  // 監聽房東回覆數
  unsubMessages = onSnapshot(
    query(collection(db, 'messages'), where('tenantId', '==', uid)),
    (snapshot) => {
      const totalReplies = snapshot.docs.filter(d => d.data().reply).length;
      const readCount = parseInt(localStorage.getItem('tenant_read_reply_count') || '0');
      const unread = Math.max(0, totalReplies - readCount);

      if (route.name === 'ContactLandlord') {
        localStorage.setItem('tenant_read_reply_count', totalReplies.toString());
        replyCount.value = 0;
        hasNewReply.value = false;
      } else {
        replyCount.value = unread;
        hasNewReply.value = unread > 0;
      }
    },
    (err) => console.error('messages listener:', err)
  );
});

onUnmounted(() => {
  unsubMessages?.();
  unsubBills?.();
  window.removeEventListener('messages-read', handleMessageReadEvent);
});
</script>
