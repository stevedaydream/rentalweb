<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">租客配對管理</h1>
        <p class="text-gray-500 text-sm">管理註冊租客帳號，並協助綁定房東 (配對)</p>
      </div>
      
      <div class="relative w-full md:w-72">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜尋姓名、電話或 Email..." 
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all shadow-sm"
        >
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
        <div>
           <p class="text-xs text-gray-500">總租客數</p>
           <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.total }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
           <span class="material-symbols-outlined">group</span>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
        <div>
           <p class="text-xs text-gray-500">已配對</p>
           <p class="text-2xl font-bold text-green-600">{{ stats.matched }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
           <span class="material-symbols-outlined">link</span>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-red-200 dark:border-red-900/30 shadow-sm flex items-center justify-between">
        <div>
           <p class="text-xs text-red-500 font-bold">未歸屬 (需處理)</p>
           <p class="text-2xl font-bold text-red-600">{{ stats.orphans }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center animate-pulse">
           <span class="material-symbols-outlined">link_off</span>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      
      <div v-if="loading" class="p-12 text-center text-gray-500">
        <div class="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p>載入租客資料中...</p>
      </div>

      <div v-else-if="filteredTenants.length === 0" class="p-12 text-center text-gray-500 flex flex-col items-center">
        <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">person_search</span>
        <p>找不到符合條件的租客</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="px-6 py-4 font-semibold">租客資訊</th>
              <th class="px-6 py-4 font-semibold">歸屬狀態</th>
              <th class="px-6 py-4 font-semibold">所屬房東</th>
              <th class="px-6 py-4 font-semibold">註冊時間</th>
              <th class="px-6 py-4 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="tenant in filteredTenants" :key="tenant.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300 flex items-center justify-center font-bold mr-3 text-lg">
                    {{ tenant.name?.[0] || 'T' }}
                  </div>
                  <div>
                    <div class="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {{ tenant.name || '未命名' }}
                    </div>
                    <div class="text-xs text-gray-500">{{ tenant.email }}</div>
                    <div class="text-xs text-gray-400">{{ tenant.phone || '無電話' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span 
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="tenant.boundLandlordCode ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'"
                >
                  <span class="w-1.5 h-1.5 rounded-full mr-2" :class="tenant.boundLandlordCode ? 'bg-green-500' : 'bg-red-500'"></span>
                  {{ tenant.boundLandlordCode ? '已配對' : '未歸屬' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div v-if="tenant.boundLandlordCode">
                   <p class="font-bold text-gray-700 dark:text-gray-200">{{ getLandlordName(tenant.boundLandlordCode) }}</p>
                   <p class="text-xs text-gray-400 font-mono">Code: {{ tenant.boundLandlordCode }}</p>
                </div>
                <div v-else class="text-gray-400 text-xs italic">
                   - 尚無房東 -
                </div>
              </td>
              <td class="px-6 py-4 text-gray-500">
                {{ formatDate(tenant.createdAt) }}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openAssignModal(tenant)"
                    class="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors border border-blue-200"
                  >
                    {{ tenant.boundLandlordCode ? '重新指派' : '配對房東' }}
                  </button>
                  <button 
                    @click="confirmDelete(tenant)"
                    class="text-red-400 hover:text-red-600 p-2 rounded-lg transition-colors"
                    title="刪除帳號"
                  >
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
        <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">配對房東</h3>
        
        <div class="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <p class="text-xs text-gray-500 mb-1">目標租客</p>
          <p class="font-bold text-lg">{{ selectedTenant?.name }}</p>
          <p class="text-xs text-gray-400">{{ selectedTenant?.email }}</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">選擇房東</label>
            <select 
              v-model="targetLandlordCode"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="" disabled>請選擇一位房東</option>
              <option v-for="ll in landlords" :key="ll.id" :value="ll.landlordCode">
                {{ ll.name }} ({{ ll.landlordCode }}) - 房源數: {{ ll.roomCount || 0 }}
              </option>
            </select>
            <p class="text-xs text-gray-500 mt-2">
              * 此操作將會把租客的 <code>boundLandlordCode</code> 更新為選定房東的代碼。
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button 
            @click="showModal = false"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            取消
          </button>
          <button 
            @click="submitAssignment"
            :disabled="!targetLandlordCode || assigning"
            class="px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors font-bold disabled:opacity-50 flex items-center"
          >
            <span v-if="assigning" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            確認配對
          </button>
        </div>
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
  updateDoc,
  doc 
} from 'firebase/firestore';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'landlord' | 'tenant';
  landlordCode?: string;      // Only for landlord
  boundLandlordCode?: string; // Only for tenant
  createdAt: any;
  roomCount?: number;         // Aux for UI
}

const tenants = ref<User[]>([]);
const landlords = ref<User[]>([]);
const loading = ref(true);
const searchQuery = ref('');

// Modal State
const showModal = ref(false);
const selectedTenant = ref<User | null>(null);
const targetLandlordCode = ref('');
const assigning = ref(false);

// === 1. 初始化資料抓取 ===
const fetchData = async () => {
  loading.value = true;
  try {
    const usersRef = collection(db, 'users');
    
    // 平行抓取租客與房東
    const [tenantSnap, landlordSnap] = await Promise.all([
      getDocs(query(usersRef, where('role', '==', 'tenant'))),
      getDocs(query(usersRef, where('role', '==', 'landlord')))
    ]);

    // 處理租客
    tenants.value = tenantSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as User));

    // 處理房東 (需要用來做下拉選單與名稱對照)
    landlords.value = landlordSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as User));

  } catch (error) {
    console.error("Error fetching data:", error);
    alert('資料讀取失敗');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

// === 2. Computed & Helpers ===
const stats = computed(() => {
  const total = tenants.value.length;
  const matched = tenants.value.filter(t => t.boundLandlordCode).length;
  return {
    total,
    matched,
    orphans: total - matched
  };
});

const filteredTenants = computed(() => {
  let list = tenants.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(t => 
      (t.name || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      (t.phone || '').includes(q)
    );
  }
  // 讓未歸屬的排在前面
  return list.sort((a, b) => {
    if (!a.boundLandlordCode && b.boundLandlordCode) return -1;
    if (a.boundLandlordCode && !b.boundLandlordCode) return 1;
    return 0;
  });
});

const getLandlordName = (code: string) => {
  const found = landlords.value.find(l => l.landlordCode === code);
  return found ? found.name : '未知房東';
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('zh-TW');
};

// === 3. Actions ===
const openAssignModal = (tenant: User) => {
  selectedTenant.value = tenant;
  // 如果已經有綁定，預設選取該房東
  targetLandlordCode.value = tenant.boundLandlordCode || '';
  showModal.value = true;
};

const submitAssignment = async () => {
  if (!selectedTenant.value || !targetLandlordCode.value) return;
  
  assigning.value = true;
  try {
    const userRef = doc(db, 'users', selectedTenant.value.id);
    
    // 更新資料庫
    await updateDoc(userRef, {
      boundLandlordCode: targetLandlordCode.value
    });

    // 更新本地狀態
    const idx = tenants.value.findIndex(t => t.id === selectedTenant.value?.id);
    if (idx !== -1) {
      tenants.value[idx].boundLandlordCode = targetLandlordCode.value;
    }

    alert(`配對成功！\n已將 ${selectedTenant.value.name} 指派給 ${getLandlordName(targetLandlordCode.value)}`);
    showModal.value = false;
  } catch (error) {
    console.error(error);
    alert('配對失敗，請稍後再試');
  } finally {
    assigning.value = false;
  }
};

const confirmDelete = async (tenant: User) => {
  if (confirm(`確定要刪除租客「${tenant.name}」嗎？\n此操作不可逆。`)) {
    try {
      await deleteDoc(doc(db, 'users', tenant.id));
      tenants.value = tenants.value.filter(t => t.id !== tenant.id);
    } catch (e) {
      console.error(e);
      alert('刪除失敗');
    }
  }
};
</script>