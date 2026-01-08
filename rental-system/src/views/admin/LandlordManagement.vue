<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">房東管理</h1>
        <p class="text-gray-500 text-sm">檢視與管理系統內所有註冊房東</p>
      </div>
      
      <div class="relative w-full md:w-72">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜尋姓名、Email 或代碼..." 
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
        >
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      
      <div v-if="loading" class="p-12 text-center text-gray-500">
        <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p>載入房東資料中...</p>
      </div>

      <div v-else-if="filteredLandlords.length === 0" class="p-12 text-center text-gray-500 flex flex-col items-center">
        <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">person_off</span>
        <p>找不到符合條件的房東</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="px-6 py-4 font-semibold">房東資訊</th>
              <th class="px-6 py-4 font-semibold">系統代碼</th>
              <th class="px-6 py-4 font-semibold text-center">持有房源</th>
              <th class="px-6 py-4 font-semibold text-center">旗下租客</th>
              <th class="px-6 py-4 font-semibold">註冊時間</th>
              <th class="px-6 py-4 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="landlord in filteredLandlords" :key="landlord.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold mr-3 text-lg">
                    {{ landlord.name?.[0] || '?' }}
                  </div>
                  <div>
                    <div class="font-bold text-gray-900 dark:text-white">{{ landlord.name || '未命名' }}</div>
                    <div class="text-xs text-gray-500">{{ landlord.email }}</div>
                    <div class="text-[10px] text-gray-400 mt-0.5 select-all">UID: {{ landlord.id }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 select-all">
                  {{ landlord.landlordCode || 'N/A' }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="font-bold text-gray-700 dark:text-gray-200">{{ landlord.roomCount }}</span>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="font-bold text-gray-700 dark:text-gray-200">{{ landlord.tenantCount }}</span>
              </td>
              <td class="px-6 py-4 text-gray-500">
                {{ formatDate(landlord.createdAt) }}
              </td>
              <td class="px-6 py-4 text-right">
                <button 
                  @click="confirmDelete(landlord)"
                  class="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                  title="刪除此帳號 (Delete)"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { db } from '../../firebase/config';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  // orderBy 
} from 'firebase/firestore';

interface Landlord {
  id: string;
  name: string;
  email: string;
  landlordCode: string;
  createdAt: any;
  roomCount: number;
  tenantCount: number;
}

const landlords = ref<Landlord[]>([]);
const loading = ref(true);
const searchQuery = ref('');

// === 1. 初始化資料抓取 ===
const fetchLandlords = async () => {
  loading.value = true;
  try {
    // A. 抓取所有房東
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'landlord'));
    const snapshot = await getDocs(q);
    
    const rawLandlords: Landlord[] = [];
    const landlordIds: string[] = [];
    const landlordCodes: string[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      rawLandlords.push({
        id: doc.id,
        name: data.name || 'Unknown',
        email: data.email || 'No Email',
        landlordCode: data.landlordCode || '',
        createdAt: data.createdAt,
        roomCount: 0,   // 待計算
        tenantCount: 0  // 待計算
      });
      landlordIds.push(doc.id);
      if(data.landlordCode) landlordCodes.push(data.landlordCode);
    });

    // B. (Optional) 抓取關聯數據統計 (房源 & 租客)
    // 注意：若資料量極大，建議改用後端 API 處理。此處為前端簡易實作。
    if (landlordIds.length > 0) {
      // 統計房源 (rooms collection)
      const roomsSnapshot = await getDocs(query(collection(db, 'rooms')));
      const roomMap = new Map<string, number>();
      
      roomsSnapshot.forEach(doc => {
        const lid = doc.data().landlordId;
        if (lid) roomMap.set(lid, (roomMap.get(lid) || 0) + 1);
      });

      // 統計租客 (tenants collection - 手動建立的)
      const tenantsSnapshot = await getDocs(query(collection(db, 'tenants')));
      const tenantMap = new Map<string, number>();
      
      tenantsSnapshot.forEach(doc => {
        const lid = doc.data().landlordId;
        if (lid) tenantMap.set(lid, (tenantMap.get(lid) || 0) + 1);
      });
      
      // 更新計數
      rawLandlords.forEach(l => {
        l.roomCount = roomMap.get(l.id) || 0;
        l.tenantCount = tenantMap.get(l.id) || 0;
      });
    }

    landlords.value = rawLandlords;
  } catch (error) {
    console.error("Error fetching landlords:", error);
    alert('資料讀取失敗，請檢查權限');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchLandlords();
});

// === 2. 搜尋與過濾 ===
const filteredLandlords = computed(() => {
  if (!searchQuery.value) return landlords.value;
  const q = searchQuery.value.toLowerCase();
  return landlords.value.filter(l => 
    l.name.toLowerCase().includes(q) || 
    l.email.toLowerCase().includes(q) || 
    l.landlordCode.toLowerCase().includes(q)
  );
});

// === 3. 操作邏輯 ===
const formatDate = (timestamp: any) => {
  if (!timestamp) return '-';
  // 處理 Firebase Timestamp
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('zh-TW');
};

const confirmDelete = async (landlord: Landlord) => {
  const msg = `警告：您確定要刪除房東「${landlord.name}」嗎？\n\n此操作僅會刪除 users 集合中的資料檔案，不會刪除 Auth 帳號 (需後台操作)，且可能導致其名下的房源與租客資料變成孤兒數據。\n\n請輸入房東代碼 "${landlord.landlordCode}" 以確認刪除：`;
  
  const input = prompt(msg);
  if (input === landlord.landlordCode) {
    try {
      loading.value = true;
      await deleteDoc(doc(db, 'users', landlord.id));
      
      // 前端移除該筆資料，不需重新整理
      landlords.value = landlords.value.filter(l => l.id !== landlord.id);
      
      alert('刪除成功');
    } catch (error) {
      console.error(error);
      alert('刪除失敗');
    } finally {
      loading.value = false;
    }
  } else {
    if (input !== null) alert('驗證碼錯誤，取消操作');
  }
};
</script>