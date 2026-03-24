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
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">
                公開簡介
                <span class="text-xs font-normal ml-1 text-blue-500">（顯示於找房頁面的房東資料）</span>
              </label>
              <textarea
                v-model="formData.description"
                rows="3"
                maxlength="200"
                class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-text-primary-light dark:text-text-primary-dark transition-colors resize-none text-sm"
                placeholder="例如：管理 10 年以上，快速維修，友善溝通..."
              ></textarea>
              <p class="text-xs text-text-secondary-light mt-1 text-right">{{ formData.description.length }}/200</p>
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
            <div class="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">
              <p class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">每月帳單週期</p>

              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-blue-400 shrink-0">electric_meter</span>
                <span class="text-sm text-text-secondary-light w-20 shrink-0">抄表完成</span>
                <span class="text-xs text-gray-400">月底前完成（無固定設定）</span>
              </div>

              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-gold-500 shrink-0">receipt_long</span>
                <span class="text-sm text-text-secondary-light w-20 shrink-0">發送帳單</span>
                <span class="text-sm text-text-secondary-light">每月</span>
                <input
                  v-model.number="formData.billSendDay"
                  type="number" min="1" max="28"
                  class="w-16 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-center font-bold text-text-primary-light dark:text-text-primary-dark transition-colors"
                >
                <span class="text-sm text-text-secondary-light">號發送</span>
              </div>

              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-green-500 shrink-0">payments</span>
                <span class="text-sm text-text-secondary-light w-20 shrink-0">繳費截止</span>
                <span class="text-sm text-text-secondary-light">每月</span>
                <input
                  v-model.number="formData.paymentDay"
                  type="number" min="1" max="28"
                  class="w-16 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-center font-bold text-text-primary-light dark:text-text-primary-dark transition-colors"
                >
                <span class="text-sm text-text-secondary-light">號前</span>
              </div>

              <!-- 視覺化時間軸預覽 -->
              <div class="mt-2 p-3 bg-surface-light dark:bg-surface-dark rounded-xl text-xs text-text-secondary-light">
                <p class="font-medium text-text-primary-light dark:text-text-primary-dark mb-2">本月流程預覽</p>
                <div class="flex items-center gap-1 flex-wrap">
                  <span class="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium">月底 抄電表</span>
                  <span class="text-gray-300">→</span>
                  <span class="px-2 py-0.5 bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 rounded font-medium">{{ formData.billSendDay }} 號 發帳單</span>
                  <span class="text-gray-300">→</span>
                  <span class="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-medium">{{ formData.paymentDay }} 號 截止繳費</span>
                  <span v-if="formData.paymentDay > formData.billSendDay" class="text-gray-400 ml-1">
                    （租客有 {{ formData.paymentDay - formData.billSendDay }} 天繳款）
                  </span>
                  <span v-else class="text-red-400 ml-1">⚠ 截止日應晚於發送日</span>
                </div>
              </div>
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

    <!-- LINE Bot 設定 (full-width section) -->
    <section class="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-[#06C755]/30 dark:border-[#06C755]/20">
      <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark flex items-center mb-1">
        <svg class="w-5 h-5 mr-2 text-[#06C755]" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
        LINE Bot 整合設定
        <span
          :class="lineConfig.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
          class="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
        >
          {{ lineConfig.isEnabled ? '已啟用' : '未設定' }}
        </span>
      </h2>
      <p class="text-sm text-text-secondary-light mb-5">讓租客透過 LINE 直接傳訊給你，回覆訊息也會透過 LINE Bot 發送。</p>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Left: credentials form -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">Channel Secret</label>
            <input
              v-model="lineConfig.channelSecret"
              type="password"
              class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#06C755] outline-none font-mono text-sm"
              placeholder="從 LINE Developers Console 取得"
              autocomplete="off"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">Channel Access Token（長期）</label>
            <input
              v-model="lineConfig.channelAccessToken"
              type="password"
              class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#06C755] outline-none font-mono text-sm"
              placeholder="從 LINE Developers Console 取得"
              autocomplete="off"
            />
          </div>

          <!-- LINE Bot Basic ID -->
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">LINE Bot Basic ID（供租客掃碼加入）</label>
            <input
              v-model="lineConfig.lineBotId"
              type="text"
              class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#06C755] outline-none text-sm"
              placeholder="例如：@Rxxxxxxx（LINE Developers Console → Basic settings → Basic ID）"
            />
            <p class="text-xs text-text-secondary-light mt-1">填入後租客的「聯繫房東」頁面會顯示 QR Code 讓租客掃碼加入 Bot</p>
          </div>

          <!-- Webhook URL (read-only) -->
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">Webhook URL（填入 LINE Developers Console）</label>
            <div class="flex gap-2">
              <input
                :value="webhookUrl"
                readonly
                class="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-xs text-gray-600 dark:text-gray-400 cursor-text"
              />
              <button
                @click="copyWebhookUrl"
                class="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm flex-shrink-0"
                title="複製"
              >
                <span class="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
            </div>
          </div>

          <!-- Your UID (read-only, needed for LINE_LANDLORD_ID) -->
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">你的 Firebase UID</label>
            <div class="flex gap-2">
              <input
                :value="authStore.effectiveUid"
                readonly
                class="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-xs text-gray-600 dark:text-gray-400"
              />
              <button
                @click="copyUid"
                class="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm flex-shrink-0"
                title="複製"
              >
                <span class="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
            </div>
          </div>

          <button
            @click="saveLineConfig"
            :disabled="isSavingLine"
            class="w-full py-2.5 bg-[#06C755] hover:bg-[#05a848] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <span v-if="isSavingLine" class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            <span v-else class="material-symbols-outlined text-[18px]">save</span>
            {{ isSavingLine ? '儲存中...' : '儲存 LINE 設定' }}
          </button>
        </div>

        <!-- Right: setup guide -->
        <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 space-y-3 text-sm">
          <p class="font-bold text-text-primary-light dark:text-text-primary-dark">設定步驟</p>
          <ol class="space-y-2 text-text-secondary-light list-none">
            <li class="flex gap-2">
              <span class="flex-shrink-0 w-5 h-5 bg-[#06C755] text-white rounded-full text-[11px] font-bold flex items-center justify-center">1</span>
              前往 <a href="https://developers.line.biz/" target="_blank" class="text-[#06C755] underline">LINE Developers Console</a>，建立 Messaging API channel
            </li>
            <li class="flex gap-2">
              <span class="flex-shrink-0 w-5 h-5 bg-[#06C755] text-white rounded-full text-[11px] font-bold flex items-center justify-center">2</span>
              複製 <strong>Channel secret</strong> 與 <strong>Channel access token（長期）</strong> 填入左側
            </li>
            <li class="flex gap-2">
              <span class="flex-shrink-0 w-5 h-5 bg-[#06C755] text-white rounded-full text-[11px] font-bold flex items-center justify-center">3</span>
              在 LINE Developers Console 的 Messaging API 設定頁，將上方 Webhook URL 貼入並啟用
            </li>
            <li class="flex gap-2">
              <span class="flex-shrink-0 w-5 h-5 bg-[#06C755] text-white rounded-full text-[11px] font-bold flex items-center justify-center">4</span>
              部署 Firebase Functions：<code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">firebase deploy --only functions</code>
            </li>
            <li class="flex gap-2">
              <span class="flex-shrink-0 w-5 h-5 bg-[#06C755] text-white rounded-full text-[11px] font-bold flex items-center justify-center">5</span>
              讓租客掃描你的 LINE Bot QR Code 加好友，之後他們傳訊就會出現在訊息中心
            </li>
          </ol>
          <div class="pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400">
            本地測試需使用 ngrok 等工具將 localhost:5001 暴露到公網，再填入 LINE Webhook URL
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const authStore = useAuthStore();
const toast = useToastStore();
const isSaving = ref(false);

// 表單資料介面
interface SettingsForm {
  name: string;
  phone: string;
  description: string;
  bankCode: string;
  bankAccount: string;
  bankAccountName: string;
  billSendDay: number;
  paymentDay: number;
  notifyEmail: boolean;
  notifyLine: boolean;
}

const formData = ref<SettingsForm>({
  name: '',
  phone: '',
  description: '',
  bankCode: '',
  bankAccount: '',
  bankAccountName: '',
  billSendDay: 1,
  paymentDay: 12,
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
      description: p.description || '',
      bankCode: p.bankInfo?.code || '',
      bankAccount: p.bankInfo?.account || '',
      bankAccountName: p.bankInfo?.name || p.name || '',
      billSendDay: p.settings?.billSendDay ?? 1,
      paymentDay: p.settings?.paymentDay ?? 12,
      notifyEmail: p.settings?.notifyEmail ?? true,
      notifyLine: p.settings?.notifyLine ?? false,
    };
  }
});

const handleSave = async () => {
  if (!authStore.user) return;
  
  isSaving.value = true;
  try {
    const userRef = doc(db, 'users', authStore.effectiveUid);
    
    // 建構要更新的資料結構
    const updateData = {
      name: formData.value.name,
      phone: formData.value.phone,
      description: formData.value.description,
      bankInfo: {
        code: formData.value.bankCode,
        account: formData.value.bankAccount,
        name: formData.value.bankAccountName
      },
      settings: {
        billSendDay: formData.value.billSendDay,
        paymentDay: formData.value.paymentDay,
        notifyEmail: formData.value.notifyEmail,
        notifyLine: formData.value.notifyLine
      },
      updatedAt: new Date().toISOString()
    };

    await updateDoc(userRef, updateData);

    // 同步公開資料到 public_profiles（供找房頁顯示房東名稱與簡介）
    const { setDoc: sd } = await import('firebase/firestore');
    await sd(doc(db, 'public_profiles', authStore.effectiveUid), {
      displayName: formData.value.name,
      name: formData.value.name,
      description: formData.value.description,
    }, { merge: true });

    // 更新本地 Store 的 userProfile
    if (authStore.userProfile) {
      Object.assign(authStore.userProfile, updateData);
    }

    toast.success('設定已儲存成功！');
  } catch (error) {
    console.error('儲存失敗:', error);
    toast.error('儲存失敗，請稍後再試。');
  } finally {
    isSaving.value = false;
  }
};

const handleLogout = () => {
  if (confirm('確定要登出嗎？')) {
    authStore.logout();
  }
};

// =============================================
// LINE Bot Config
// =============================================
const FIREBASE_PROJECT_ID = 'rental-system-7675e';
const FUNCTIONS_REGION = 'asia-east1';

const lineConfig = ref({
  channelSecret: '',
  channelAccessToken: '',
  lineBotId: '',   // LINE Bot Basic ID，例如 @Rxxxxxx
  isEnabled: false,
});
const isSavingLine = ref(false);

// 每位房東的 Webhook URL 帶有自己的 ?lid= 參數
const webhookUrl = computed(() =>
  `https://${FUNCTIONS_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/lineWebhook?lid=${authStore.effectiveUid}`
);

onMounted(async () => {
  // Load existing LINE config (only channel enabled status, not secrets for security)
  try {
    const [lineSnap, userSnap] = await Promise.all([
      getDoc(doc(db, 'line_configs', authStore.effectiveUid)),
      getDoc(doc(db, 'users', authStore.effectiveUid)),
    ]);
    if (lineSnap.exists()) {
      const data = lineSnap.data();
      lineConfig.value.isEnabled = !!(data.channelSecret && data.channelAccessToken);
    }
    if (userSnap.exists()) {
      lineConfig.value.lineBotId = userSnap.data().lineBotId || '';
    }
  } catch (e) {
    console.warn('Cannot read LINE config:', e);
  }
});

const saveLineConfig = async () => {
  if (!authStore.user) return;
  if (!lineConfig.value.channelSecret.trim() || !lineConfig.value.channelAccessToken.trim()) {
    toast.warning('請填入 Channel Secret 和 Channel Access Token');
    return;
  }
  isSavingLine.value = true;
  try {
    const savePromises: Promise<any>[] = [
      // 每位房東寫入自己的 line_configs/{uid}
      setDoc(doc(db, 'line_configs', authStore.effectiveUid), {
        channelSecret: lineConfig.value.channelSecret.trim(),
        channelAccessToken: lineConfig.value.channelAccessToken.trim(),
        updatedAt: new Date().toISOString(),
      }),
    ];
    // lineBotId 存到 users/{uid}（租客可讀）及 public_profiles/{uid}（未登入訪客可讀）
    if (lineConfig.value.lineBotId.trim()) {
      const { updateDoc: upd, setDoc: sd } = await import('firebase/firestore');
      const botId = lineConfig.value.lineBotId.trim();
      savePromises.push(upd(doc(db, 'users', authStore.effectiveUid), { lineBotId: botId }));
      savePromises.push(sd(doc(db, 'public_profiles', authStore.effectiveUid), { lineBotId: botId }, { merge: true }));
    }
    await Promise.all(savePromises);
    lineConfig.value.isEnabled = true;
    lineConfig.value.channelSecret = '';
    lineConfig.value.channelAccessToken = '';
    toast.success('LINE Bot 設定已儲存！請確認 Webhook URL 已填入 LINE Developers Console');
  } catch (e) {
    console.error('LINE config save error:', e);
    toast.error('儲存失敗，請稍後再試');
  } finally {
    isSavingLine.value = false;
  }
};

const copyWebhookUrl = () => {
  navigator.clipboard.writeText(webhookUrl.value).then(() => {
    toast.success('Webhook URL 已複製');
  }).catch(() => {
    toast.warning('複製失敗，請手動複製');
  });
};

const copyUid = () => {
  const uid = authStore.effectiveUid || '';
  navigator.clipboard.writeText(uid).then(() => {
    toast.success('UID 已複製');
  }).catch(() => {
    toast.warning('複製失敗，請手動複製');
  });
};
</script>