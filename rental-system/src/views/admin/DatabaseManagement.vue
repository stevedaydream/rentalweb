<template>
  <div class="max-w-7xl mx-auto space-y-8">
    
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">資料庫與測試數據管理</h1>
      <p class="text-gray-500">快速生成測試資料、模擬各種情境與系統維護</p>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span class="material-symbols-outlined text-purple-500">science</span>
          全域測試資料 (Global Test Data)
        </h3>
      </div>
      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 border border-gray-100 dark:border-gray-700 rounded-xl space-y-3">
          <h4 class="font-bold text-gray-800 dark:text-white">生成測試使用者</h4>
          <p class="text-xs text-gray-500">建立未綁定的全新房東或租客帳號 (Users Collection)</p>
          <div class="flex gap-3">
            <button 
              @click="generateGlobalUser('landlord')"
              :disabled="loading"
              class="flex-1 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors"
            >
              + 測試房東
            </button>
            <button 
              @click="generateGlobalUser('tenant')"
              :disabled="loading"
              class="flex-1 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm font-bold transition-colors"
            >
              + 測試租客
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 class="font-bold text-lg flex items-center gap-2 text-blue-800 dark:text-blue-200">
          <span class="material-symbols-outlined">person_pin</span>
          指定房東情境模擬
        </h3>
        
        <div class="flex items-center gap-2 w-full md:w-auto">
          <span class="text-sm text-gray-500 whitespace-nowrap">選擇目標房東:</span>
          <select v-model="selectedLandlordId" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm w-full md:w-64">
            <option value="" disabled>-- 請選擇 --</option>
            <option v-for="l in landlords" :key="l.id" :value="l.id">
              {{ l.name }} ({{ l.landlordCode }})
            </option>
          </select>
        </div>
      </div>
      
      <div v-if="selectedLandlordId" class="p-6 space-y-6">

        <!-- Row 1: 基礎資料 + 日常營運 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div class="space-y-3">
            <h4 class="font-bold text-sm text-gray-500 uppercase flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[11px] flex items-center justify-center font-black">1</span>
              基礎資料
            </h4>
            <button @click="genRooms" :disabled="loading"
              class="flex items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm text-gray-700 dark:text-gray-300 gap-2 w-full disabled:opacity-50">
              <span class="material-symbols-outlined">meeting_room</span>生成 3 間測試房源
            </button>
            <button @click="genTenants" :disabled="loading || existingRooms.length === 0"
              class="flex items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm text-gray-700 dark:text-gray-300 gap-2 w-full disabled:opacity-50">
              <span class="material-symbols-outlined">group_add</span>
              生成測試租客
              <span class="text-xs text-gray-400">(綁定現有房間)</span>
            </button>
          </div>

          <div class="space-y-3">
            <h4 class="font-bold text-sm text-gray-500 uppercase flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-green-100 text-green-600 text-[11px] flex items-center justify-center font-black">3</span>
              日常營運
            </h4>
            <button @click="genRepairs" :disabled="loading || existingRooms.length === 0"
              class="flex items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm text-gray-700 dark:text-gray-300 gap-2 w-full disabled:opacity-50">
              <span class="material-symbols-outlined">home_repair_service</span>生成隨機報修申請
            </button>
            <button @click="genAnnouncements" :disabled="loading"
              class="flex items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm text-gray-700 dark:text-gray-300 gap-2 w-full disabled:opacity-50">
              <span class="material-symbols-outlined">campaign</span>生成測試公告
            </button>
          </div>
        </div>

        <!-- Row 2: 財務數據模擬 (full width with room selector) -->
        <div class="border border-blue-100 dark:border-blue-800 rounded-xl overflow-hidden">
          <div class="px-5 py-3 bg-blue-50 dark:bg-blue-900/10 flex items-center justify-between">
            <h4 class="font-bold text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-blue-200 text-blue-700 text-[11px] flex items-center justify-center font-black">2</span>
              財務數據模擬
            </h4>
            <span class="text-xs text-blue-600 dark:text-blue-400">
              已選 {{ selectedRoomIds.length }} / {{ existingRooms.length }} 間
            </span>
          </div>

          <div class="p-5 space-y-4">
            <!-- Room selector -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">選擇要模擬的房間</span>
                <button @click="toggleAllRooms"
                  class="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  {{ allSelected ? '取消全選' : '全選' }}
                </button>
              </div>

              <div v-if="loadingRooms" class="py-6 text-center text-sm text-gray-400 animate-pulse">
                載入房間資料...
              </div>
              <div v-else-if="existingRooms.length === 0"
                class="py-6 text-center text-sm text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                此房東尚無房源，請先點「生成測試房源」
              </div>
              <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                <label v-for="room in existingRooms" :key="room.id"
                  class="flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none"
                  :class="selectedRoomIds.includes(room.id)
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'">
                  <input type="checkbox" :checked="selectedRoomIds.includes(room.id)"
                    @change="toggleRoom(room.id)" class="mt-0.5 accent-blue-600 shrink-0" />
                  <div class="min-w-0 flex-1">
                    <p class="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{{ room.name }}</p>
                    <p v-if="room.tenantName" class="text-xs text-green-600 dark:text-green-400 truncate">
                      👤 {{ room.tenantName }}
                    </p>
                    <p v-else class="text-xs text-gray-400">空房</p>
                    <p class="text-xs text-gray-400 font-mono mt-0.5">{{ room.lastMeterReading }} 度</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-wrap gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button @click="genMeterReadings" :disabled="loading || selectedRoomIds.length === 0"
                class="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                <span class="material-symbols-outlined text-[18px]">electric_meter</span>
                生成電表紀錄 (近 4 個月)
                <span v-if="selectedRoomIds.length"
                  class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                  {{ selectedRoomIds.length }} 間
                </span>
              </button>
              <button @click="genBills" :disabled="loading || !hasTenantsInSelection"
                class="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                生成帳單情境 (3個月)
                <span v-if="hasTenantsInSelection"
                  class="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">
                  {{ selectedRooms.filter(r => r.tenantId).length }} 位租客
                </span>
              </button>
            </div>
          </div>
        </div>

      </div>
      <div v-else class="p-12 text-center text-gray-400">
        <span class="material-symbols-outlined text-4xl mb-2">touch_app</span>
        <p>請先從上方選單選擇一位房東，以執行細部資料生成。</p>
      </div>
    </div>

    <div class="border-2 border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden bg-red-50/50 dark:bg-red-900/10">
      <div class="p-4 bg-red-100 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex items-center gap-2 text-red-800 dark:text-red-200">
        <span class="material-symbols-outlined">gpp_maybe</span>
        <h3 class="font-bold">危險操作區域 (Dangerous Zone)</h3>
      </div>
      
      <div class="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <button 
          class="flex flex-col items-center justify-center p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors font-bold text-sm"
          @click="refreshData"
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
           刪除測試資料 (isTestData=true)
        </button>
        
         <button 
           class="flex flex-col items-center justify-center p-4 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors font-bold text-sm border-2 border-red-500"
           @click="nukeDatabase"
         >
           <span class="material-symbols-outlined mb-1 text-red-500 animate-pulse">dangerous</span>
           重置系統 (保留 Admin)
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { db } from '../../firebase/config';
import { useToastStore } from '../../stores/toast';
import {
  collection, getDocs, query, where, addDoc,
  serverTimestamp, doc, setDoc, writeBatch, updateDoc
} from 'firebase/firestore';

interface RoomItem {
  id: string
  name: string
  status: string
  tenantName: string
  tenantId: string
  tenantUid: string | null
  tenantRent: number
  lastMeterReading: number
  lastMeterDate: string
}

// --- State ---
const toast = useToastStore();
const loading = ref(false);
const landlords = ref<any[]>([]);
const selectedLandlordId = ref('');

// Room selector state
const existingRooms = ref<RoomItem[]>([]);
const selectedRoomIds = ref<string[]>([]);
const loadingRooms = ref(false);

const selectedRooms = computed(() =>
  existingRooms.value.filter(r => selectedRoomIds.value.includes(r.id))
);
const allSelected = computed(() =>
  existingRooms.value.length > 0 && selectedRoomIds.value.length === existingRooms.value.length
);
const hasTenantsInSelection = computed(() =>
  selectedRooms.value.some(r => r.tenantId)
);

async function loadLandlordRooms(uid: string) {
  loadingRooms.value = true;
  selectedRoomIds.value = [];
  try {
    const [roomsSnap, tenantsSnap] = await Promise.all([
      getDocs(query(collection(db, 'rooms'), where('landlordId', '==', uid))),
      getDocs(query(collection(db, 'tenants'), where('landlordId', '==', uid))),
    ]);
    // Build tenant lookup by room name
    const tenantsByRoom = new Map<string, any>();
    tenantsSnap.docs.forEach(d => {
      const data = d.data();
      if (data.room) tenantsByRoom.set(data.room, { id: d.id, ...data });
    });
    existingRooms.value = roomsSnap.docs.map(d => {
      const data = d.data();
      const tenant = tenantsByRoom.get(data.name);
      return {
        id: d.id,
        name: data.name || '未命名',
        status: data.status || 'vacant',
        tenantName: tenant?.name || data.tenantName || '',
        tenantId: tenant?.id || '',
        tenantUid: tenant?.uid || null,
        tenantRent: tenant?.rent || 0,
        lastMeterReading: data.lastMeterReading || 0,
        lastMeterDate: data.lastMeterDate || '',
      };
    });
  } catch(e) {
    console.error('loadLandlordRooms error', e);
  } finally {
    loadingRooms.value = false;
  }
}

watch(selectedLandlordId, uid => {
  if (uid) loadLandlordRooms(uid);
  else existingRooms.value = [];
});

function toggleRoom(id: string) {
  const idx = selectedRoomIds.value.indexOf(id);
  if (idx >= 0) selectedRoomIds.value.splice(idx, 1);
  else selectedRoomIds.value.push(id);
}

function toggleAllRooms() {
  if (allSelected.value) selectedRoomIds.value = [];
  else selectedRoomIds.value = existingRooms.value.map(r => r.id);
}

// --- Init ---
onMounted(() => {
  fetchLandlords();
});

const fetchLandlords = async () => {
  const q = query(collection(db, 'users'), where('role', '==', 'landlord'));
  const snap = await getDocs(q);
  landlords.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// --- 1. Global Helpers ---
const generateGlobalUser = async (role: 'landlord' | 'tenant') => {
  loading.value = true;
  try {
    const fakeUid = `test_${role}_${Date.now()}`;
    const fakeCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    await setDoc(doc(db, 'users', fakeUid), {
      email: `${fakeUid}@example.com`,
      role: role,
      name: `測試${role === 'landlord' ? '房東' : '租客'} (Auto)`,
      landlordCode: role === 'landlord' ? fakeCode : null,
      boundLandlordCode: null,
      createdAt: serverTimestamp(),
      isTestData: true
    });
    toast.success(`已建立測試${role}，UID: ${fakeUid}`);
    if(role === 'landlord') fetchLandlords(); // Refresh dropdown
  } catch(e) { console.error(e); toast.error('失敗'); }
  finally { loading.value = false; }
};

// --- 2. Targeted Generators ---

// 生成房間
const genRooms = async () => {
  if(!selectedLandlordId.value) return;
  loading.value = true;
  try {
    const batch = writeBatch(db);
    const roomsRef = collection(db, 'rooms');
    const floors = ['2', '3', '5'];

    for(let i=0; i<3; i++) {
      const newRef = doc(roomsRef);
      batch.set(newRef, {
        landlordId: selectedLandlordId.value,
        name: `測試公寓 ${floors[i]}0${i+1}`,
        address: `測試市中正路 ${100+i} 號`,
        price: 10000 + (i * 500),
        status: 'vacant',
        layout: '獨立套房',
        type: '公寓',
        size: 8 + i,
        tenantName: '',
        lastMeterReading: 0,
        lastMeterDate: '',
        images: [],
        coverImage: '',
        isPublic: false,
        createdAt: serverTimestamp(),
        isTestData: true
      });
    }
    await batch.commit();
    toast.success('已生成 3 間測試房間');
    await loadLandlordRooms(selectedLandlordId.value);
  } catch(e) { console.error(e); toast.error('失敗'); }
  finally { loading.value = false; }
};

// 生成租客 (綁定現有房間，並更新房間狀態)
const genTenants = async () => {
  if(!selectedLandlordId.value || existingRooms.value.length === 0) return;
  loading.value = true;
  try {
    // 只綁定目前空房
    const vacantRooms = existingRooms.value.filter(r => r.status === 'vacant' || !r.tenantName);
    if(vacantRooms.length === 0) { toast.warning('此房東名下沒有空房可以綁定租客'); loading.value = false; return; }

    const batch = writeBatch(db);
    const tenantsRef = collection(db, 'tenants');
    const count = Math.min(3, vacantRooms.length);

    for(let i = 0; i < count; i++) {
      const room = vacantRooms[i]!;
      const rent = 8000 + (i + 1) * 500;
      const tenantName = `測試房客 No.${i + 1}`;

      // 寫入 tenants 集合
      batch.set(doc(tenantsRef), {
        landlordId: selectedLandlordId.value,
        name: tenantName,
        phone: `090000000${i + 1}`,
        room: room.name,          // 對應真實房間名稱
        rent,
        paymentStatus: 'normal',
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        createdAt: serverTimestamp(),
        isTestData: true
      });

      // 更新房間狀態
      batch.update(doc(db, 'rooms', room.id), {
        status: 'occupied',
        tenantName,
      });
    }
    await batch.commit();
    toast.success(`已生成 ${count} 位測試房客並綁定房間`);
    await loadLandlordRooms(selectedLandlordId.value);
  } catch(e) { console.error(e); toast.error('失敗'); }
  finally { loading.value = false; }
};

// 生成電表紀錄 (對選取的房間，近 4 個月)
const genMeterReadings = async () => {
  if(selectedRooms.value.length === 0) { toast.warning('請先選擇房間'); return; }
  loading.value = true;
  try {
    const batch = writeBatch(db);
    const readingsRef = collection(db, 'meter_readings');
    const now = new Date();
    const months = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 3 + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return { ym, lastDay };
    });

    for(const room of selectedRooms.value) {
      let lastReading = room.lastMeterReading || 1000;
      let finalReading = lastReading;

      for(const { ym, lastDay } of months) {
        const currentReading = lastReading + Math.floor(Math.random() * 200) + 50;
        const usage = currentReading - lastReading;
        const cost = Math.round(usage * 5);
        const periodEnd = `${ym}-${String(lastDay).padStart(2, '0')}`;

        batch.set(doc(readingsRef), {
          landlordId: selectedLandlordId.value,
          roomId: room.id,
          roomName: room.name,
          lastReading,
          currentReading,
          usage, cost,
          periodStart: `${ym}-01`,
          periodEnd,
          calcLog: `固定費率: ${usage}度 x $5 = $${cost}`,
          mode: 'fixed',
          createdAt: serverTimestamp(),
          isTestData: true
        });
        lastReading = currentReading;
        finalReading = currentReading;
      }

      // 回寫最新讀數到房間
      const last = months[months.length - 1]!;
      batch.update(doc(db, 'rooms', room.id), {
        lastMeterReading: finalReading,
        lastMeterDate: `${last.ym}-${String(last.lastDay).padStart(2, '0')}`,
      });
    }

    await batch.commit();
    toast.success(`已為 ${selectedRooms.value.length} 間房間生成 4 個月份電表紀錄`);
    await loadLandlordRooms(selectedLandlordId.value);
  } catch(e) { console.error(e); toast.error('失敗'); }
  finally { loading.value = false; }
};

// 生成帳單 (3個月不同狀況)
const genBills = async () => {
  const roomsWithTenants = selectedRooms.value.filter(r => r.tenantId);
  if(roomsWithTenants.length === 0) { toast.warning('所選房間中沒有租客，無法生成帳單'); return; }
  loading.value = true;
  try {
    const batch = writeBatch(db);
    const billsRef = collection(db, 'bills');
    const now = new Date();
    const mkMonth = (offset: number) => {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const scenarios = [
      { month: mkMonth(-2), status: 'completed', label: '已繳清' },
      { month: mkMonth(-1), status: 'overdue',   label: '逾期欠費' },
      { month: mkMonth(0),  status: 'pending',   label: '本月待繳' },
    ];

    for(const room of roomsWithTenants) {
      const rent = room.tenantRent || 8000;
      for(const s of scenarios) {
        batch.set(doc(billsRef), {
          landlordId: selectedLandlordId.value,
          tenantId: room.tenantUid || null,
          relatedTenantDocId: room.tenantId,
          date: `${s.month}-01`,
          type: 'income',
          category: '租金收入',
          target: `${room.name} ${room.tenantName}`,
          description: `${s.month} 月份房租`,
          amount: rent,
          totalAmount: rent,
          status: s.status,
          dueDate: `${s.month}-05`,
          history: [],
          createdAt: serverTimestamp(),
          isTestData: true
        });
      }
    }

    await batch.commit();
    toast.success(`已為 ${roomsWithTenants.length} 位租客生成 3 個月份帳單`);
  } catch(e) { console.error(e); toast.error('失敗'); }
  finally { loading.value = false; }
};

// 生成報修
const genRepairs = async () => {
  if(!selectedLandlordId.value || existingRooms.value.length === 0) return;
  loading.value = true;
  try {
    const issues = ['冷氣不冷', '馬桶堵塞', '燈泡壞了', '網路連不上', '熱水器故障', '門鎖損壞'];
    const statuses = ['pending', 'processing', 'completed', 'rejected'];
    const priorities = ['high', 'medium', 'low'];

    // 優先使用有租客的房間
    const occupiedRooms = existingRooms.value.filter(r => r.tenantName);
    const pool = occupiedRooms.length > 0 ? occupiedRooms : existingRooms.value;
    const room = pool[Math.floor(Math.random() * pool.length)]!;

    await addDoc(collection(db, 'repair_requests'), {
      landlordId: selectedLandlordId.value,
      tenantName: room.tenantName || '未知租客',
      roomNumber: room.name,
      roomId: room.id,
      type: issues[Math.floor(Math.random() * issues.length)],
      description: '這是一個由系統生成的測試報修單。',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      createdAt: serverTimestamp(),
      isTestData: true
    });
    toast.success(`已為「${room.name}」生成一筆測試報修單`);
  } catch(e) { console.error(e); toast.error('失敗'); }
  finally { loading.value = false; }
};

// 生成公告
const genAnnouncements = async () => {
    if(!selectedLandlordId.value) return;
    loading.value = true;
    try {
        await addDoc(collection(db, 'announcements'), {
            landlordId: selectedLandlordId.value,
            title: '【系統測試】停水通知',
            content: '這是測試公告：本週五將進行水塔清洗，請儲水備用。',
            target: 'all',
            createdAt: serverTimestamp(),
            isTestData: true
        });
        toast.success('已發布測試公告');
    } catch(e) { console.error(e); toast.error('失敗'); }
    finally { loading.value = false; }
};


// --- 3. Dangerous Actions ---
const refreshData = () => {
  window.location.reload();
};

const clearSystemLogs = () => {
  toast.info('模擬：系統日誌已清除 (需對接後端 Log 服務)');
};

const deleteTestData = async () => {
  const code = prompt('警告：這將刪除所有標記為 isTestData=true 的資料。\n包含：User, Room, Tenant, Bill, Meter, Repair...\n\n請輸入 "DELETE" 確認：');
  if(code !== 'DELETE') return;

  loading.value = true;
  try {
    const collectionsToCheck = ['users', 'rooms', 'tenants', 'bills', 'meter_readings', 'repair_requests', 'repairs', 'announcements'];
    let totalDeleted = 0;

    for (const colName of collectionsToCheck) {
        const q = query(collection(db, colName), where('isTestData', '==', true));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        totalDeleted += snap.size;
    }
    
    toast.success(`清理完成，共刪除 ${totalDeleted} 筆測試資料。`);
    fetchLandlords(); // Refresh UI
  } catch(e) {
    console.error(e);
    toast.error('刪除過程發生錯誤');
  } finally {
    loading.value = false;
  }
};

// const clearLocalCache = () => {
//   if(confirm('這將清除 localStorage 並登出，確定嗎？')) {
//     localStorage.clear();
//     sessionStorage.clear();
//     window.location.href = '/login';
//   }
// };

// [修改] 重置整個資料庫 (但保留 Admin)
const nukeDatabase = async () => {
  const code = prompt('【嚴重警告】此操作將刪除資料庫中「除了 Admin 以外」的所有資料！\n\n執行後：\n1. 所有房東、租客、房源、帳單等將被清空。\n2. 您 (Admin) 的帳號會被保留，無需重新登入。\n\n請輸入 "NUKE" 以確認執行：');
  
  if(code !== 'NUKE') {
    if(code !== null) toast.warning('驗證碼錯誤，取消操作。');
    return;
  }

  if(!confirm('最後確認：您真的要重置系統嗎？')) return;

  loading.value = true;
  try {
    // 1. 定義要完全清空的集合 (不含 users)
    const collectionsToClear = [
      'rooms', 
      'tenants', 
      'bills', 
      'meter_readings', 
      'repair_requests', 
      'repairs', 
      'announcements', 
      'contracts'
    ];
    
    let totalDeleted = 0;
    const batchSize = 400; 
    
    // 2. 清空非 User 集合
    for (const colName of collectionsToClear) {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        
        let batch = writeBatch(db);
        let count = 0;

        for (const doc of snap.docs) {
           batch.delete(doc.ref);
           count++;
           totalDeleted++;

           if (count >= batchSize) {
             await batch.commit();
             batch = writeBatch(db);
             count = 0;
           }
        }
        if (count > 0) await batch.commit();
    }

    // 3. 處理 Users 集合 (保留 Admin)
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    let uBatch = writeBatch(db);
    let uCount = 0;
    
    for (const doc of usersSnap.docs) {
      const userData = doc.data();
      // [關鍵] 跳過 admin 角色
      if (userData.role === 'admin') {
        console.log(`Skipped admin: ${userData.name || doc.id}`);
        continue;
      }

      uBatch.delete(doc.ref);
      uCount++;
      totalDeleted++;

      if (uCount >= batchSize) {
        await uBatch.commit();
        uBatch = writeBatch(db);
        uCount = 0;
      }
    }
    if (uCount > 0) await uBatch.commit();
    
    toast.success(`系統重置成功！保留了管理員帳號，並刪除了 ${totalDeleted} 筆其他資料。`);
    
    // 不執行登出，僅重新整理
    fetchLandlords();
    window.location.reload();

  } catch(e) {
    console.error(e);
    toast.error('重置過程發生錯誤，請檢查 Console。');
  } finally {
    loading.value = false;
  }
};
</script>