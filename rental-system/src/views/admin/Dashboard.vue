<template>
  <div class="max-w-7xl mx-auto space-y-8">
    
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">系統控制台</h1>
      <p class="text-gray-500">Super Admin Control Panel</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">註冊房東數</p>
          <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">24</p>
        </div>
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
          <span class="material-symbols-outlined">vpn_key</span>
        </div>
      </div>
      
      <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">註冊租客數</p>
          <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">156</p>
        </div>
        <div class="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
          <span class="material-symbols-outlined">person</span>
        </div>
      </div>

      <div 
        @click="$router.push({ name: 'AdminTenants' })"
        class="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
      >
        <div>
          <p class="text-sm text-red-600 font-bold">未歸屬租客 (無房東)</p>
          <p class="text-3xl font-bold text-red-700 mt-1">3</p>
        </div>
        <div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center animate-pulse">
          <span class="material-symbols-outlined">warning</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 class="font-bold text-lg">資料管理</h3>
        </div>
        <div class="p-6 grid gap-4">
          <button @click="$router.push({ name: 'AdminLandlords' })" class="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
            <div class="bg-blue-100 text-blue-600 p-2 rounded-lg mr-4 group-hover:bg-blue-200">
              <span class="material-symbols-outlined">supervisor_account</span>
            </div>
            <div class="text-left">
              <span class="block font-bold">房東列表管理</span>
              <span class="text-xs text-gray-500">查看房東、刪除房東(連動刪除ID)、查看旗下租客</span>
            </div>
            <span class="material-symbols-outlined ml-auto text-gray-400 group-hover:text-blue-500">arrow_forward</span>
          </button>

          <button @click="$router.push({ name: 'AdminTenants' })" class="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group">
            <div class="bg-green-100 text-green-600 p-2 rounded-lg mr-4 group-hover:bg-green-200">
              <span class="material-symbols-outlined">person_add</span>
            </div>
            <div class="text-left">
              <span class="block font-bold">租客配對管理</span>
              <span class="text-xs text-gray-500">指派房東給未登記租客、管理租客資料</span>
            </div>
            <span class="material-symbols-outlined ml-auto text-gray-400 group-hover:text-green-500">arrow_forward</span>
          </button>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <h3 class="font-bold text-lg flex items-center gap-2">
            <span class="material-symbols-outlined text-purple-500">construction</span>
            測試資料生成
          </h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/20">
            <h4 class="font-bold text-purple-700 dark:text-purple-300 mb-2">一鍵生成測試房東</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              自動建立一個測試用的房東帳號，包含 3 間房間與隨機租客數據。
            </p>
            <button 
              @click="generateTestLandlord" 
              :disabled="loading"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center"
            >
              <span class="material-symbols-outlined text-sm mr-2">add_circle</span>
              {{ loading ? '生成中...' : '生成測試資料' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="border-2 border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden bg-red-50/50 dark:bg-red-900/10">
      <div class="p-4 bg-red-100 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex items-center gap-2 text-red-800 dark:text-red-200">
        <span class="material-symbols-outlined">gpp_maybe</span>
        <h3 class="font-bold">危險操作區域 (Dangerous Zone)</h3>
      </div>
      
      <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button class="danger-btn" @click="syncDatabase">
          <span class="material-symbols-outlined mb-1">sync</span>
          強制同步本地資料庫
        </button>
        
        <button class="danger-btn" @click="mockDangerAction('刪除所有日誌')">
           <span class="material-symbols-outlined mb-1">delete_history</span>
           清除系統日誌
        </button>

        <button class="danger-btn !bg-red-600 !text-white hover:!bg-red-700" @click="resetDatabase">
           <span class="material-symbols-outlined mb-1">delete_forever</span>
           刪除所有資料 (Reset DB)
        </button>
        
         <button class="danger-btn !bg-gray-700 !text-white hover:!bg-gray-800" @click="mockDangerAction('刪除本地緩存')">
           <span class="material-symbols-outlined mb-1">cleaning_services</span>
           清除本地緩存
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const loading = ref(false);

const generateTestLandlord = async () => {
  loading.value = true;
  // 模擬延遲
  await new Promise(r => setTimeout(r, 1500));
  alert('測試房東資料生成完畢！\n帳號: test_landlord@example.com\n密碼: 123456');
  loading.value = false;
};

const syncDatabase = () => {
  alert('正在從 Firebase 強制拉取最新資料並覆蓋本地狀態...');
};

const mockDangerAction = (action: string) => {
  if(confirm(`確定要執行「${action}」嗎？此操作不可逆。`)) {
    alert(`${action} 已執行。`);
  }
};

const resetDatabase = () => {
  const code = prompt('請輸入 "DELETE" 以確認刪除所有資料庫內容：');
  if (code === 'DELETE') {
    alert('正在執行全域刪除操作... (模擬)');
    // 實際開發會呼叫 Cloud Functions 遞迴刪除 collections
  } else {
    alert('驗證碼錯誤，操作取消。');
  }
};
</script>