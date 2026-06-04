<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          電表歷史紀錄
        </h1>
        <p class="text-text-secondary-light">{{ activeTab === 'history' ? '查看所有已儲存的抄表數據與費用計算詳情' : '檢視每個月份各房間的抄表完成狀況' }}</p>
      </div>

      <div v-show="activeTab === 'history'" class="flex gap-3">
        <select v-model="selectedMonth" aria-label="篩選月份" class="px-4 py-2 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm">
           <option value="all">所有月份</option>
           <option v-for="m in uniqueMonths" :key="m" :value="m">{{ m }}</option>
        </select>
        <select v-model="selectedRoom" aria-label="篩選房間" class="px-4 py-2 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm">
           <option value="all">所有房間</option>
           <option v-for="r in uniqueRooms" :key="r" :value="r">{{ r }}</option>
        </select>
      </div>
    </div>

    <!-- Tab 切換 -->
    <div class="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
      <button @click="activeTab = 'history'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
        :class="activeTab === 'history' ? 'bg-white dark:bg-card-dark shadow text-text-primary-light dark:text-white' : 'text-text-secondary-light hover:text-text-primary-light dark:hover:text-white'">
        <span class="material-symbols-outlined text-[16px]">history</span>歷史紀錄
      </button>
      <button @click="activeTab = 'coverage'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
        :class="activeTab === 'coverage' ? 'bg-white dark:bg-card-dark shadow text-text-primary-light dark:text-white' : 'text-text-secondary-light hover:text-text-primary-light dark:hover:text-white'">
        <span class="material-symbols-outlined text-[16px]">grid_view</span>缺漏追蹤
      </button>
    </div>

    <template v-if="activeTab === 'history'">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <p class="text-sm text-text-secondary-light">顯示筆數</p>
        <p class="text-3xl font-extrabold text-text-primary-light dark:text-text-primary-dark mt-1">{{ filteredList.length }}</p>
      </div>
      <div class="p-6 bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <p class="text-sm text-text-secondary-light">總用電量 (度)</p>
        <p class="text-3xl font-extrabold text-blue-600 mt-1">{{ totalUsage.toLocaleString() }}</p>
      </div>
      <div class="p-6 bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <p class="text-sm text-text-secondary-light">總電費金額</p>
        <p class="text-3xl font-extrabold text-primary mt-1">NT$ {{ totalCost.toLocaleString() }}</p>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div class="overflow-x-auto relative min-h-[300px]">
        
        <div v-if="loading" class="absolute inset-0 z-10 bg-white/50 dark:bg-card-dark/50 flex items-center justify-center">
           <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>

        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="px-6 py-4">
                <button @click="setSort('createdAt')" aria-label="依抄表/建立日期排序" class="flex items-center gap-1 hover:text-text-primary-light dark:hover:text-white transition-colors">
                  抄表/建立日期
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">{{ sortKey === 'createdAt' ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}</span>
                </button>
              </th>
              <th class="px-6 py-4">
                <button @click="setSort('roomName')" aria-label="依房號排序" class="flex items-center gap-1 hover:text-text-primary-light dark:hover:text-white transition-colors">
                  房號
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">{{ sortKey === 'roomName' ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}</span>
                </button>
              </th>
              <th class="px-6 py-4">
                <button @click="setSort('periodEnd')" aria-label="依計費區間排序" class="flex items-center gap-1 hover:text-text-primary-light dark:hover:text-white transition-colors">
                  計費區間
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">{{ sortKey === 'periodEnd' ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}</span>
                </button>
              </th>
              <th class="px-6 py-4 text-right">區間讀數</th>
              <th class="px-6 py-4 text-right">
                <button @click="setSort('usage')" aria-label="依用量排序" class="flex items-center gap-1 ml-auto hover:text-text-primary-light dark:hover:text-white transition-colors">
                  用量
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">{{ sortKey === 'usage' ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}</span>
                </button>
              </th>
              <th class="px-6 py-4 text-right">
                <button @click="setSort('cost')" aria-label="依費用排序" class="flex items-center gap-1 ml-auto hover:text-text-primary-light dark:hover:text-white transition-colors">
                  費用
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">{{ sortKey === 'cost' ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}</span>
                </button>
              </th>
              <th class="px-6 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="item in filteredList" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-text-secondary-light">
                {{ formatDate(item.createdAt) }}
              </td>
              <td class="px-6 py-4 font-bold text-base text-text-primary-light dark:text-text-primary-dark">
                {{ item.roomName }}
              </td>
              <td class="px-6 py-4 text-xs text-text-secondary-light">
                 {{ item.periodStart }} ~ {{ item.periodEnd }}
              </td>
              <td class="px-6 py-4 text-right font-mono text-gray-500">
                 {{ item.lastReading }} <span class="material-symbols-outlined text-[12px] align-middle px-1" aria-hidden="true">arrow_right_alt</span> {{ item.currentReading }}
              </td>
              <td class="px-6 py-4 text-right font-bold">
                 {{ item.usage }} 度
              </td>
              <td class="px-6 py-4 text-right font-bold text-primary">
                 NT$ {{ item.cost.toLocaleString() }}
              </td>
              <td class="px-6 py-4 text-center">
                 <div class="flex items-center justify-center gap-2">
                   <button
                     @click="openDetail(item)"
                     class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                     title="查看計算過程"
                     aria-label="查看詳情"
                   >
                     <span class="material-symbols-outlined text-[20px]" aria-hidden="true">description</span>
                   </button>
                   <template v-if="confirmDeleteId === item.id">
                     <span class="text-xs text-red-600">確定刪除？</span>
                     <button @click="deleteRecord(item.id)" class="text-xs text-red-600 hover:underline">確定</button>
                     <button @click="confirmDeleteId = null" class="text-xs text-gray-500 hover:underline">取消</button>
                   </template>
                   <button
                     v-else
                     @click="confirmDeleteId = item.id"
                     class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                     title="刪除紀錄"
                     aria-label="刪除紀錄"
                   >
                     <span class="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span>
                   </button>
                 </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="!loading && filteredList.length === 0" class="p-12 text-center text-text-secondary-light">
         <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">history</span>
         <p>沒有符合條件的歷史紀錄</p>
      </div>
    </div>
    </template>

    <!-- 缺漏追蹤矩陣 -->
    <template v-if="activeTab === 'coverage'">
      <div v-if="loading" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
      <div v-else-if="coverageRooms.length === 0" class="p-12 text-center text-text-secondary-light bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">grid_view</span>
        <p>尚無任何抄表紀錄</p>
      </div>
      <div v-else class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th class="px-5 py-4 whitespace-nowrap sticky left-0 bg-gray-50 dark:bg-gray-800/50 z-10">月份</th>
                <th v-for="room in coverageRooms" :key="room.roomId" class="px-4 py-4 text-center whitespace-nowrap">{{ room.roomName }}</th>
                <th class="px-5 py-4 text-center whitespace-nowrap">完成度</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-for="month in allMonths" :key="month"
                :class="isMonthComplete(month) ? '' : 'bg-orange-50/40 dark:bg-orange-900/5'">
                <td class="px-5 py-3 font-mono font-bold whitespace-nowrap sticky left-0 bg-inherit z-10 border-r border-gray-100 dark:border-gray-800">
                  {{ month }}
                </td>
                <td v-for="room in coverageRooms" :key="room.roomId" class="px-4 py-3 text-center">
                  <span v-if="hasReading(month, room.roomId)" class="material-symbols-outlined text-[20px] text-green-500">check_circle</span>
                  <span v-else class="material-symbols-outlined text-[20px] text-orange-400">radio_button_unchecked</span>
                </td>
                <td class="px-5 py-3 text-center font-bold whitespace-nowrap"
                  :class="isMonthComplete(month) ? 'text-green-600' : 'text-orange-500'">
                  {{ coverageMap.get(month)?.size ?? 0 }} / {{ coverageRooms.length }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-if="showModal && selectedItem" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col animate-scale-in">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
             <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">費用計算詳情</h2>
             <p class="text-sm text-text-secondary-light">{{ selectedItem.roomName }} ({{ selectedItem.periodStart }} ~ {{ selectedItem.periodEnd }})</p>
          </div>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="關閉">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto max-h-[60vh]">
           <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
             <pre class="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{{ selectedItem.calcLog }}</pre>
           </div>
           
           <div class="mt-4 flex justify-between items-center px-2">
              <span class="text-sm text-text-secondary-light">計費模式：{{ formatMode(selectedItem.mode) }}</span>
              <p class="text-xl font-bold text-primary">總計: NT$ {{ selectedItem.cost.toLocaleString() }}</p>
           </div>
        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button 
            @click="showModal = false"
            class="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 font-bold transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { db } from '../../firebase/config';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useToastStore } from '../../stores/toast';
import { useAuthStore } from '../../stores/auth';

const toast = useToastStore();
const authStore = useAuthStore();

// --- Types ---
interface MeterRecord {
  id: string;
  roomId: string;
  roomName: string;
  lastReading: number;
  currentReading: number;
  usage: number;
  cost: number;
  periodStart: string;
  periodEnd: string;
  calcLog: string;
  mode: string;
  createdAt: Timestamp;
}

// --- Types ---
interface CoverageRoom { roomId: string; roomName: string; }

// --- State ---
const list = ref<MeterRecord[]>([]);
const loading = ref(true);
const activeTab = ref<'history' | 'coverage'>('history');
const selectedMonth = ref('all');
const selectedRoom = ref('all');
const showModal = ref(false);
const selectedItem = ref<MeterRecord | null>(null);
const sortKey = ref<'createdAt' | 'roomName' | 'periodEnd' | 'usage' | 'cost'>('createdAt');
const sortDir = ref<'asc' | 'desc'>('desc');
const confirmDeleteId = ref<string | null>(null);

// --- Lifecycle ---
onMounted(async () => {
  try {
    const q = query(collection(db, 'meter_readings'), where('landlordId', '==', authStore.effectiveUid), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    list.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MeterRecord));
  } catch (err) {
    console.error("Fetch Error:", err);
  } finally {
    loading.value = false;
  }
});

// --- Computed ---
const uniqueMonths = computed(() => {
  const months = new Set<string>();
  list.value.forEach(item => {
    if (item.createdAt) {
      const date = item.createdAt.toDate();
      const str = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      months.add(str);
    }
  });
  return Array.from(months).sort().reverse();
});

const uniqueRooms = computed(() => {
  const rooms = new Set<string>();
  list.value.forEach(item => rooms.add(item.roomName));
  return Array.from(rooms).sort();
});

const filteredList = computed(() => {
  const filtered = list.value.filter(item => {
    if (selectedMonth.value !== 'all' && item.createdAt) {
      const date = item.createdAt.toDate();
      const str = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (str !== selectedMonth.value) return false;
    }
    if (selectedRoom.value !== 'all' && item.roomName !== selectedRoom.value) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    let valA: number | string;
    let valB: number | string;
    if (sortKey.value === 'createdAt') {
      valA = a.createdAt?.toDate().getTime() ?? 0;
      valB = b.createdAt?.toDate().getTime() ?? 0;
    } else if (sortKey.value === 'roomName') {
      valA = a.roomName ?? '';
      valB = b.roomName ?? '';
    } else if (sortKey.value === 'periodEnd') {
      valA = a.periodEnd ?? '';
      valB = b.periodEnd ?? '';
    } else {
      valA = a[sortKey.value] ?? 0;
      valB = b[sortKey.value] ?? 0;
    }
    if (valA < valB) return sortDir.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir.value === 'asc' ? 1 : -1;
    return 0;
  });
});

const totalUsage = computed(() => filteredList.value.reduce((sum, item) => sum + item.usage, 0));
const totalCost = computed(() => filteredList.value.reduce((sum, item) => sum + item.cost, 0));

// --- 缺漏追蹤 ---
const coverageRooms = computed((): CoverageRoom[] => {
  const map = new Map<string, string>();
  list.value.forEach(r => { if (r.roomId && r.roomName) map.set(r.roomId, r.roomName); });
  return Array.from(map.entries())
    .map(([roomId, roomName]) => ({ roomId, roomName }))
    .sort((a, b) => a.roomName.localeCompare(b.roomName, 'zh-TW'));
});

const allMonths = computed((): string[] => {
  if (!list.value.length) return [];
  const currentMonth = new Date().toISOString().slice(0, 7);
  let earliest = currentMonth;
  list.value.forEach(r => {
    if (r.periodEnd) {
      const ym = r.periodEnd.slice(0, 7);
      if (ym < earliest) earliest = ym;
    }
  });
  const result: string[] = [];
  let cursor = earliest;
  while (cursor <= currentMonth) {
    result.push(cursor);
    const [y, m] = cursor.split('-').map(Number) as [number, number];
    const next = new Date(y, m, 1);
    cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }
  return result.reverse();
});

const coverageMap = computed((): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  list.value.forEach(r => {
    if (!r.periodEnd || !r.roomId) return;
    const ym = r.periodEnd.slice(0, 7);
    if (!map.has(ym)) map.set(ym, new Set());
    map.get(ym)!.add(r.roomId);
  });
  return map;
});

const hasReading = (yearMonth: string, roomId: string) =>
  coverageMap.value.get(yearMonth)?.has(roomId) ?? false;

const isMonthComplete = (yearMonth: string) =>
  coverageRooms.value.length > 0 &&
  (coverageMap.value.get(yearMonth)?.size ?? 0) >= coverageRooms.value.length;

// --- Actions ---
const setSort = (key: typeof sortKey.value) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = key === 'roomName' || key === 'periodEnd' ? 'asc' : 'desc';
  }
};

const formatDate = (ts: Timestamp) => {
  if (!ts) return '-';
  return ts.toDate().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatMode = (mode: string) => {
  const map: Record<string, string> = { fixed: '固定費率', tiered: '累進費率', bill_share: '帳單分攤' };
  return map[mode] || mode;
};

const openDetail = (item: MeterRecord) => {
  selectedItem.value = item;
  showModal.value = true;
};

const deleteRecord = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'meter_readings', id));
    list.value = list.value.filter(item => item.id !== id);
    confirmDeleteId.value = null;
  } catch (e) {
    console.error(e);
    toast.error('刪除失敗');
  }
};
</script>

<style scoped>
.animate-scale-in { animation: scaleIn 0.2s ease-out; }
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>