<template>
  <div class="min-h-screen flex flex-col h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
    
    <div class="bg-gray-900 text-white px-4 py-2 flex items-center justify-between shrink-0 z-50 shadow-md">
      <div class="flex items-center gap-4">
        <h1 class="font-bold text-lg flex items-center gap-2">
          <span class="material-symbols-outlined text-yellow-400">preview</span>
          全系統模擬實驗室 (System Simulator)
        </h1>
        <div class="text-xs text-gray-400 flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full">
          <span class="material-symbols-outlined text-[14px]">info</span>
          <span>利用來源隔離 (localhost vs 127.0.0.1) 實現雙帳號同時登入</span>
        </div>
      </div>
      
      <div class="flex gap-2">
        <button @click="refreshFrames" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center">
          <span class="material-symbols-outlined text-[14px] mr-1">refresh</span>
          重新整理視窗
        </button>
        <button @click="$router.push({ name: 'AdminDashboard' })" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs">
          返回後台
        </button>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden border-b-4 border-gray-300 dark:border-gray-700 h-[60%]">
      
      <div class="flex-1 flex flex-col border-r-4 border-gray-300 dark:border-gray-700 relative group">
        <div class="bg-blue-600 text-white text-xs px-3 py-1 font-bold flex justify-between items-center">
          <span>房東視角 (Landlord View) - {{ leftOrigin }}</span>
          <span class="opacity-50 text-[10px]">Primary Origin</span>
        </div>
        <iframe 
          ref="leftFrame"
          :src="leftUrl" 
          class="w-full h-full bg-white"
          frameborder="0"
        ></iframe>
        <div class="absolute top-8 left-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
           <div class="bg-black/70 text-white text-xs p-2 rounded backdrop-blur-sm">
             建議登入：測試房東帳號
           </div>
        </div>
      </div>

      <div class="flex-1 flex flex-col relative group">
        <div class="bg-green-600 text-white text-xs px-3 py-1 font-bold flex justify-between items-center">
          <span>租客視角 (Tenant View) - {{ rightOrigin }}</span>
          <span class="opacity-50 text-[10px]">Secondary Origin</span>
        </div>
        <iframe 
          ref="rightFrame"
          :src="rightUrl" 
          class="w-full h-full bg-white"
          frameborder="0"
        ></iframe>
        <div class="absolute top-8 right-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
           <div class="bg-black/70 text-white text-xs p-2 rounded backdrop-blur-sm">
             建議登入：測試租客帳號
           </div>
        </div>
      </div>

    </div>

    <div class="h-[40%] bg-gray-50 dark:bg-gray-800 overflow-y-auto shadow-inner relative">
      <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-2 z-10">
         <span class="material-symbols-outlined text-purple-600">settings_remote</span>
         <h3 class="font-bold text-gray-700 dark:text-gray-200">上帝模式控制台 (God Mode Control)</h3>
      </div>
      
      <div class="p-4">
        <DatabaseManagement />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted,  } from 'vue';
import DatabaseManagement from './DatabaseManagement.vue'; // 引入剛做好的元件

const leftFrame = ref<HTMLIFrameElement | null>(null);
const rightFrame = ref<HTMLIFrameElement | null>(null);

// 自動判斷網域以實現隔離
const currentOrigin = window.location.origin;
const currentPort = window.location.port || '5173'; // 預設 Vite port
const isLocalhost = currentOrigin.includes('localhost');

// 左側使用當前網域
const leftOrigin = currentOrigin;
const leftUrl = `${leftOrigin}/login`;

// 右側使用替代網域 (localhost <-> 127.0.0.1)
// 注意：如果您的開發環境不是 localhost/127.0.0.1 (例如用 IP)，這可能需要調整
const rightOrigin = isLocalhost 
  ? `http://127.0.0.1:${currentPort}` 
  : `http://localhost:${currentPort}`;
const rightUrl = `${rightOrigin}/login`;

const refreshFrames = () => {
  if (leftFrame.value) leftFrame.value.src = leftUrl;
  if (rightFrame.value) rightFrame.value.src = rightUrl;
};

// 提示使用者
onMounted(() => {
  console.log('System Simulator Mounted');
  console.log(`Left Frame: ${leftUrl}`);
  console.log(`Right Frame: ${rightUrl}`);
});
</script>

<style scoped>
/* 隱藏 DatabaseManagement 內的標題，因為我們已經有了外部標題 */
:deep(h1.text-2xl) {
  display: none;
}
:deep(.max-w-7xl) {
  max-width: 100%;
}
</style>