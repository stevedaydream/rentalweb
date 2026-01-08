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
          <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {{ loadingStats ? '...' : stats.landlords }}
          </p>
        </div>
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
          <span class="material-symbols-outlined">vpn_key</span>
        </div>
      </div>
      
      <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">註冊租客數</p>
          <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {{ loadingStats ? '...' : stats.tenants }}
          </p>
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
          <p class="text-3xl font-bold text-red-700 mt-1">
            {{ loadingStats ? '...' : stats.orphans }}
          </p>
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
              自動建立一個測試用的房東帳號(User)，並寫入 3 間房間(Rooms)與 5 位測試租客(Tenants)數據。
            </p>
            <button 
              @click="generateTestLandlord" 
              :disabled="generating"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center disabled:opacity-50"
            >
              <span class="material-symbols-outlined text-sm mr-2">add_circle</span>
              {{ generating ? '生成中...' : '生成測試資料' }}
            </button>
          </div>
          
          <button 
            @click="$router.push({ name: 'AdminDatabase' })"
            class="w-full py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-bold flex items-center justify-center"
          >
            <span class="material-symbols-outlined text-sm mr-2">settings_suggest</span>
            前往進階資料庫管理 (更多生成選項)
          </button>
        </div>
      </div>
    </div>

    <div class="border-2 border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden bg-red-50/50 dark:bg-red-900/10">
      <div class="p-4 bg-red-100 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex items-center gap-2 text-red-800 dark:text-red-200">
        <span class="material-symbols-outlined">gpp_maybe</span>
        <h3 class="font-bold">危險操作區域 (Dangerous Zone)</h3>
      </div>
      
      <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          class="flex flex-col items-center justify-center p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors font-bold text-sm"
          @click="fetchStats"
        >
          <span class="material-symbols-outlined mb-1">sync</span>
          強制重新整理數據
        </button>
        
        <button 
          class="flex flex-col items-center justify-center p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors font-bold text-sm"
          @click="clearSystemLogs"
        >
           <span class="material-symbols-outlined mb-1">delete_history</span>
           清除系統日誌
        </button>

        <button 
          class="flex flex-col items-center justify-center p-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold text-sm"
          @click="deleteTestData"
        >
           <span class="material-symbols-outlined mb-1">delete_forever</span>
           刪除所有測試資料 (Reset)
        </button>
        
        <button 
           class="flex flex-col items-center justify-center p-4 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-colors font-bold text-sm"
           @click="clearLocalCache"
         >
           <span class="material-symbols-outlined mb-1">cleaning_services</span>
           清除本地緩存
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { db } from '../../firebase/config';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  doc, 
  setDoc,
  writeBatch
} from 'firebase/firestore';

const loadingStats = ref(true);
const generating = ref(false);

const stats = ref({
  landlords: 0,
  tenants: 0,
  orphans: 0
});

// === 1. 讀取統計數據 ===
const fetchStats = async () => {
  loadingStats.value = true;
  try {
    const usersRef = collection(db, 'users');
    const qSnapshot = await getDocs(usersRef);
    
    let lCount = 0;
    let tCount = 0;
    let oCount = 0;

    qSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.role === 'landlord') {
        lCount++;
      } else if (data.role === 'tenant') {
        tCount++;
        if (!data.boundLandlordCode) {
          oCount++;
        }
      }
    });

    stats.value = {
      landlords: lCount,
      tenants: tCount,
      orphans: oCount
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
  } finally {
    loadingStats.value = false;
  }
};

onMounted(() => {
  fetchStats();
});

// === 2. 生成測試資料 (測試房東) ===
const generateTestLandlord = async () => {
  if (generating.value) return;
  generating.value = true;

  try {
    const fakeUid = `test_landlord_${Date.now()}`;
    const fakeCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 2-1. User
    await setDoc(doc(db, 'users', fakeUid), {
      email: `test_ll_${Date.now()}@example.com`,
      role: 'landlord',
      name: '測試房東 (Auto)',
      landlordCode: fakeCode,
      createdAt: serverTimestamp(),
      isTestData: true
    });

    // 2-2. Rooms
    const batch = writeBatch(db);
    const roomPrefix = ['A', 'B', 'C'];
    const roomsRef = collection(db, 'rooms');

    for (let i = 0; i < 3; i++) {
      const roomRef = doc(roomsRef);
      batch.set(roomRef, {
        landlordId: fakeUid,
        name: `測試公寓 ${roomPrefix[i]}-${101 + i}`,
        address: `測試市測試區測試路 ${100 + i} 號`,
        price: 12000 + (i * 1000),
        status: i === 0 ? 'occupied' : 'vacant',
        layout: '獨立套房',
        size: 10,
        type: '公寓',
        createdAt: serverTimestamp(),
        isTestData: true
      });
    }

    // 2-3. Tenants
    const tenantsRef = collection(db, 'tenants');
    for (let j = 0; j < 5; j++) {
      const tenantRef = doc(tenantsRef);
      batch.set(tenantRef, {
        landlordId: fakeUid,
        name: `測試租客 ${j + 1}`,
        room: j === 0 ? `測試公寓 A-101` : '尚未設定',
        phone: `090000000${j}`,
        paymentStatus: j === 1 ? 'overdue' : 'normal',
        leaseStart: '2025-01-01',
        leaseEnd: '2025-12-31',
        createdAt: serverTimestamp(),
        isTestData: true
      });
    }

    await batch.commit();
    alert(`測試資料生成成功！\n虛擬房東 UID: ${fakeUid}\n請重新整理數據查看變化。`);
    fetchStats();

  } catch (error: any) {
    console.error("Error generating test data:", error);
    alert('生成失敗: ' + error.message);
  } finally {
    generating.value = false;
  }
};

// === 3. 危險區域功能對接 ===

// 3-1. 清除本地緩存 (實作)
const clearLocalCache = () => {
  if (confirm('這將清除 localStorage 並重新載入頁面 (類似登出效果)，確定嗎？')) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }
};

// 3-2. 刪除所有測試資料 (實作 - 類似 DatabaseManagement 的邏輯)
const deleteTestData = async () => {
  const code = prompt('警告：這將刪除所有標記為 isTestData=true 的資料。\n請輸入 "DELETE" 以確認刪除：');
  if (code !== 'DELETE') return;

  if (confirm('這是最後確認：確定要執行嗎？')) {
    generating.value = true; // 使用 loading 狀態
    try {
      const collectionsToCheck = ['users', 'rooms', 'tenants', 'bills', 'meter_readings', 'repair_requests', 'announcements'];
      let totalDeleted = 0;

      for (const colName of collectionsToCheck) {
        const q = query(collection(db, colName), where('isTestData', '==', true));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        totalDeleted += snap.size;
      }

      alert(`清理完成，共刪除 ${totalDeleted} 筆測試資料。`);
      fetchStats();
    } catch (e) {
      console.error(e);
      alert('刪除過程發生錯誤');
    } finally {
      generating.value = false;
    }
  }
};

// 3-3. 清除日誌 (模擬)
const clearSystemLogs = () => {
  if(confirm('確定要清除系統日誌嗎？(模擬)')) {
    alert('日誌清理指令已發送');
  }
};
</script>