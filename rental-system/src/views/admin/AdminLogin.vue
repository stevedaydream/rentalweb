<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gray-950">
    <div class="w-full max-w-sm bg-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700">

      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-900/40 border border-red-700/50 text-red-400 mb-4">
          <span class="material-symbols-outlined text-3xl">shield_person</span>
        </div>
        <h1 class="text-xl font-bold text-white">系統管理員</h1>
        <p class="mt-1 text-sm text-gray-500">限授權人員使用</p>
      </div>

      <!-- Tab -->
      <div class="flex rounded-lg overflow-hidden border border-gray-700 mb-6">
        <button
          @click="tab = 'login'"
          :class="tab === 'login'
            ? 'bg-red-800 text-white'
            : 'bg-transparent text-gray-400 hover:text-gray-200'"
          class="flex-1 py-2 text-sm font-medium transition-colors"
        >登入</button>
        <button
          @click="tab = 'register'"
          :class="tab === 'register'
            ? 'bg-red-800 text-white'
            : 'bg-transparent text-gray-400 hover:text-gray-200'"
          class="flex-1 py-2 text-sm font-medium transition-colors"
        >建立帳號</button>
      </div>

      <!-- Login Form -->
      <form v-if="tab === 'login'" @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 transition-colors"
            placeholder="admin@example.com"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">密碼</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 transition-colors"
            placeholder="••••••••"
          >
        </div>
        <p v-if="errorMsg" class="text-xs text-red-400">{{ errorMsg }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-sm mt-2"
        >
          {{ loading ? '登入中...' : '登入' }}
        </button>
      </form>

      <!-- Register Form -->
      <form v-else @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 transition-colors"
            placeholder="admin@example.com"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">密碼</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            class="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 transition-colors"
            placeholder="至少 8 個字元"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">授權碼</label>
          <input
            v-model="adminKey"
            type="password"
            required
            class="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 transition-colors"
            placeholder="請輸入管理員授權碼"
          >
        </div>
        <p v-if="errorMsg" class="text-xs text-red-400">{{ errorMsg }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-sm mt-2"
        >
          {{ loading ? '建立中...' : '建立管理員帳號' }}
        </button>
      </form>

      <!-- Back -->
      <button
        @click="router.push({ name: 'Identity' })"
        class="mt-6 w-full text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        ← 返回
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/config';

const router = useRouter();
const authStore = useAuthStore();

const tab = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const adminKey = ref('');
const loading = ref(false);
const errorMsg = ref('');

// 管理員授權碼（與後端 / 環境變數一致）
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET ?? 'CHANGE_ME';

const handleLogin = async () => {
  errorMsg.value = '';
  loading.value = true;
  try {
    await authStore.loginEmail(email.value, password.value);
    // 登入後 authStore 會自動讀取 userProfile；路由守衛會導向 AdminDashboard
    const role = authStore.userProfile?.role;
    if (role !== 'admin') {
      await authStore.logout();
      errorMsg.value = '此帳號沒有管理員權限';
    }
  } catch (e: any) {
    errorMsg.value = '登入失敗：' + (e.message ?? '請確認帳號密碼');
  } finally {
    loading.value = false;
  }
};

const handleRegister = async () => {
  errorMsg.value = '';
  if (adminKey.value !== ADMIN_SECRET) {
    errorMsg.value = '授權碼錯誤';
    return;
  }
  loading.value = true;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.value, password.value);
    const uid = credential.user.uid;
    const userData = {
      uid,
      email: email.value,
      role: 'admin',
      name: '系統管理員',
      createdAt: new Date(),
    };
    await setDoc(doc(db, 'users', uid), userData);
    authStore.userProfile = userData;
    router.push({ name: 'AdminDashboard' });
  } catch (e: any) {
    errorMsg.value = '建立失敗：' + (e.message ?? '請稍後再試');
  } finally {
    loading.value = false;
  }
};
</script>
