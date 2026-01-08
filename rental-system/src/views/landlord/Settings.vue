<template>
  <div class="max-w-4xl mx-auto space-y-6">
    
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">系統設定</h1>
        <p class="text-text-secondary-light">管理您的帳戶資訊與系統偏好</p>
      </div>
      <button 
        @click="handleSave"
        :disabled="isSaving"
        class="px-6 py-2 bg-primary text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="isSaving" class="material-symbols-outlined animate-spin mr-2 text-[20px]">progress_activity</span>
        <span v-else class="material-symbols-outlined mr-2 text-[20px]">save</span>
        {{ isSaving ? '儲存中...' : '儲存變更' }}
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <div class="lg:col-span-2 space-y-6">
        
        <section class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark flex items-center mb-4">
            <span class="material-symbols-outlined mr-2 text-blue-500">person</span>
            基本資料
          </h2>
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">顯示名稱</label>
                <input 
                  v-model="formData.name"
                  type="text" 
                  class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-text-primary-light dark:text-text-primary-dark transition-colors"
                  placeholder="例如：陳房東"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">聯絡電話</label>
                <input 
                  v-model="formData.phone"
                  type="tel" 
                  class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-text-primary-light dark:text-text-primary-dark transition-colors"
                  placeholder="0912-345-678"
                >
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">電子信箱 (帳號)</label>
              <input 
                :value="authStore.user?.email" 
                disabled
                type="email" 
                class="w-full px-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
              >
              <p class="text-xs text-text-secondary-light mt-1">如需更改信箱請聯繫系統管理員</p>
            </div>
          </div>
        </section>

        <section class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark flex items-center mb-4">
            <span class="material-symbols-outlined mr-2 text-green-500">account_balance</span>
            預設收款帳戶
            <span class="ml-2 text-xs font-normal text-text-secondary-light bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">用於收據顯示</span>
          </h2>
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="md:col-span-1">
                <label class="block text-sm font-medium text-text-secondary-light mb-1">銀行代碼</label>
                <input 
                  v-model="formData.bankCode"
                  type="text" 
                  maxlength="3"
                  class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-text-primary-light dark:text-text-primary-dark transition-colors"
                  placeholder="822"
                >
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-secondary-light mb-1">銀行帳號</label>
                <input 
                  v-model="formData.bankAccount"
                  type="text" 
                  class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-text-primary-light dark:text-text-primary-dark transition-colors"
                  placeholder="請輸入帳號"
                >
              </div>
            </div>
            <div>
               <label class="block text-sm font-medium text-text-secondary-light mb-1">戶名</label>
                <input 
                  v-model="formData.bankAccountName"
                  type="text" 
                  class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-text-primary-light dark:text-text-primary-dark transition-colors"
                  placeholder="預設為您的姓名"
                >
            </div>
          </div>
        </section>

      </div>

      <div class="lg:col-span-1 space-y-6">
        
        <section class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark flex items-center mb-4">
            <span class="material-symbols-outlined mr-2 text-yellow-500">notifications</span>
            通知設定
          </h2>
          <div class="space-y-4">
            <label class="flex items-center justify-between cursor-pointer group">
              <span class="text-sm font-medium text-text-secondary-light group-hover:text-text-primary-light transition-colors">接收 Email 通知</span>
              <input type="checkbox" v-model="formData.notifyEmail" class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary">
            </label>
            <label class="flex items-center justify-between cursor-pointer group">
              <span class="text-sm font-medium text-text-secondary-light group-hover:text-text-primary-light transition-colors">接收 Line 通知</span>
              <input type="checkbox" v-model="formData.notifyLine" class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" disabled>
            </label>
            <p class="text-xs text-gray-400 mt-2">* Line 通知功能即將推出</p>
          </div>
        </section>

        <section class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark flex items-center mb-4">
            <span class="material-symbols-outlined mr-2 text-red-500">shield</span>
            帳號安全
          </h2>
          <div class="space-y-3">
             <button class="w-full py-2 px-4 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left flex items-center">
               <span class="material-symbols-outlined text-[18px] mr-2">lock_reset</span>
               重設密碼
             </button>
             <button 
                @click="handleLogout"
                class="w-full py-2 px-4 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-lg text-sm font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-left flex items-center"
              >
               <span class="material-symbols-outlined text-[18px] mr-2">logout</span>
               登出裝置
             </button>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const authStore = useAuthStore();
const isSaving = ref(false);

// 表單資料介面
interface SettingsForm {
  name: string;
  phone: string;
  bankCode: string;
  bankAccount: string;
  bankAccountName: string;
  notifyEmail: boolean;
  notifyLine: boolean;
}

const formData = ref<SettingsForm>({
  name: '',
  phone: '',
  bankCode: '',
  bankAccount: '',
  bankAccountName: '',
  notifyEmail: true,
  notifyLine: false
});

// 當 userProfile 載入完成時，同步資料到表單
watchEffect(() => {
  if (authStore.userProfile) {
    const p = authStore.userProfile;
    formData.value = {
      name: p.name || '',
      phone: p.phone || '',
      bankCode: p.bankInfo?.code || '',
      bankAccount: p.bankInfo?.account || '',
      bankAccountName: p.bankInfo?.name || p.name || '',
      notifyEmail: p.settings?.notifyEmail ?? true,
      notifyLine: p.settings?.notifyLine ?? false,
    };
  }
});

const handleSave = async () => {
  if (!authStore.user) return;
  
  isSaving.value = true;
  try {
    const userRef = doc(db, 'users', authStore.user.uid);
    
    // 建構要更新的資料結構
    const updateData = {
      name: formData.value.name,
      phone: formData.value.phone,
      bankInfo: {
        code: formData.value.bankCode,
        account: formData.value.bankAccount,
        name: formData.value.bankAccountName
      },
      settings: {
        notifyEmail: formData.value.notifyEmail,
        notifyLine: formData.value.notifyLine
      },
      updatedAt: new Date().toISOString()
    };

    await updateDoc(userRef, updateData);
    
    // 更新本地 Store 的 userProfile
    if (authStore.userProfile) {
      Object.assign(authStore.userProfile, updateData);
    }

    alert('設定已儲存成功！');
  } catch (error) {
    console.error('儲存失敗:', error);
    alert('儲存失敗，請稍後再試。');
  } finally {
    isSaving.value = false;
  }
};

const handleLogout = () => {
  if (confirm('確定要登出嗎？')) {
    authStore.logout();
  }
};
</script>