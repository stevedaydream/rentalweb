<template>
  <!-- 匯入觸發按鈕 -->
  <label
    class="px-4 py-2 border border-gold-400 text-gold-600 dark:text-gold-400 dark:border-gold-600 rounded-lg text-sm font-medium hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors flex items-center cursor-pointer"
    :class="{ 'opacity-50 cursor-wait': importParsing }"
  >
    <span v-if="importParsing" class="material-symbols-outlined text-[18px] mr-2 animate-spin">progress_activity</span>
    <span v-else class="material-symbols-outlined text-[18px] mr-2">upload_file</span>
    {{ importParsing ? '解析中...' : '匯入歷史資料' }}
    <input
      ref="fileInput"
      type="file"
      accept=".xlsx,.xlsm,.xls"
      class="hidden"
      :disabled="importParsing"
      @change="handleFileChange"
    />
  </label>

  <!-- 匯入 Modal -->
  <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
    <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col animate-scale-in max-h-[90vh]">

      <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
        <div>
          <h2 class="text-xl font-bold dark:text-gray-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-gold-500">upload_file</span>
            匯入歷史抄表資料
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            已解析 <span class="font-bold text-gold-600">{{ importData.length }}</span> 個房間 ·
            共 <span class="font-bold text-gold-600">{{ totalImportRows }}</span> 筆紀錄 ·
            已配對 <span class="font-bold text-green-600">{{ importMappedCount }}</span> / {{ importData.length }} 個房間
          </p>
        </div>
        <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:text-gray-400">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="overflow-y-auto flex-1 p-6 space-y-4">
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 flex gap-3">
          <span class="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">info</span>
          <div>
            請確認每個 Excel 工作表對應到正確的 Firestore 房間。匯入後可在「抄表紀錄」頁面查看所有歷史資料。
            <strong>不會覆蓋現有紀錄</strong>（每次匯入都會新增）。
          </div>
        </div>

        <div
          v-for="room in importData"
          :key="room.sheetName"
          class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
        >
          <div class="bg-surface-light dark:bg-surface-dark px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div class="flex items-center gap-3">
              <span class="bg-ink-800 text-gold-400 font-bold text-sm px-3 py-1 rounded-lg">{{ room.sheetName }}</span>
              <span class="text-sm text-gray-500">{{ room.rows.length }} 筆</span>
              <span class="text-xs text-gray-400">
                {{ room.rows[0]?.yearMonth }} ～ {{ room.rows[room.rows.length - 1]?.yearMonth }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 flex-shrink-0">對應房間：</span>
              <!-- 建立新房間模式 -->
              <template v-if="room.isCreatingNew">
                <input
                  v-model="room.newRoomName"
                  type="text"
                  placeholder="輸入新房間名稱"
                  class="text-sm border border-gold-400 rounded-lg px-3 py-1.5 bg-white dark:bg-ink-800 dark:text-gray-100 focus:ring-2 focus:ring-gold-400 focus:outline-none w-36"
                  @keydown.enter="createRoom(room)"
                />
                <button
                  @click="createRoom(room)"
                  :disabled="!room.newRoomName?.trim() || room.isCreatingSaving"
                  class="text-xs px-3 py-1.5 bg-gold-500 text-white font-bold rounded-lg hover:bg-gold-600 disabled:opacity-50 transition-colors"
                >
                  <span v-if="room.isCreatingSaving" class="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                  <span v-else>確認建立</span>
                </button>
                <button
                  @click="room.isCreatingNew = false; room.mappedRoomId = ''"
                  class="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-700 rounded-lg"
                >取消</button>
              </template>
              <!-- 正常選單模式 -->
              <template v-else>
                <select
                  :value="room.mappedRoomId"
                  @change="onMappingChange(room, ($event.target as HTMLSelectElement).value)"
                  class="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-ink-800 dark:text-gray-100 focus:ring-2 focus:ring-gold-400 focus:outline-none"
                >
                  <option value="">— 不匯入此房間 —</option>
                  <option v-for="fr in firestoreRooms" :key="fr.id" :value="fr.id">{{ fr.name }}</option>
                  <option value="__new__">＋ 建立新房間...</option>
                </select>
                <span v-if="room.mappedRoomId" class="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                <span v-else class="material-symbols-outlined text-gray-300 text-[20px]">radio_button_unchecked</span>
              </template>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase">
                <tr>
                  <th class="px-3 py-2 text-left">年月</th>
                  <th class="px-3 py-2 text-right">上期度數</th>
                  <th class="px-3 py-2 text-right">本期度數</th>
                  <th class="px-3 py-2 text-right">使用度數</th>
                  <th class="px-3 py-2 text-right">電費 (NT$)</th>
                  <th class="px-3 py-2 text-center">繳費狀態</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="(row, idx) in room.rows.slice(0, 5)" :key="idx" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td class="px-3 py-2 font-medium">{{ row.yearMonth }}</td>
                  <td class="px-3 py-2 text-right text-gray-500">{{ row.lastReading }}</td>
                  <td class="px-3 py-2 text-right font-bold">{{ row.currentReading }}</td>
                  <td class="px-3 py-2 text-right text-blue-600">{{ row.usage }}</td>
                  <td class="px-3 py-2 text-right text-green-600">{{ row.cost.toFixed(0) }}</td>
                  <td class="px-3 py-2 text-center">
                    <span :class="[
                      'px-2 py-0.5 rounded-full text-[10px] font-bold',
                      row.status.includes('已繳') ? 'bg-green-100 text-green-700' :
                      row.status.includes('欠') ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    ]">{{ row.status || '—' }}</span>
                  </td>
                </tr>
                <tr v-if="room.rows.length > 5" class="bg-gray-50 dark:bg-gray-800">
                  <td colspan="6" class="px-3 py-2 text-center text-gray-400">... 還有 {{ room.rows.length - 5 }} 筆</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
        <p class="text-sm text-gray-500">
          將匯入 <strong class="text-gold-600">{{ importData.filter(r => r.mappedRoomId).reduce((s, r) => s + r.rows.length, 0) }}</strong> 筆紀錄
        </p>
        <div class="flex gap-3">
          <button
            @click="showModal = false"
            class="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >取消</button>
          <button
            @click="confirmImport"
            :disabled="importSaving || importMappedCount === 0"
            class="px-6 py-2 text-sm bg-gold-500 hover:bg-gold-600 text-ink-900 font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="importSaving" class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            <span v-else class="material-symbols-outlined text-[18px]">cloud_upload</span>
            {{ importSaving ? '匯入中...' : '確認匯入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import * as XLSX from 'xlsx';
import { db } from '../../firebase/config';
import { collection, doc, addDoc, getDocs, query, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';

const authStore = useAuthStore();
const toast = useToastStore();

// --- Interfaces ---
interface ImportRow {
  yearMonth: string;
  yearMonthInt: number;
  currentReading: number;
  lastReading: number;
  usage: number;
  cost: number;
  status: string;
  periodStart: string;
  periodEnd: string;
}

interface ImportRoomData {
  sheetName: string;
  rows: ImportRow[];
  mappedRoomId: string;
  mappedRoomName: string;
  isCreatingNew?: boolean;
  newRoomName?: string;
  isCreatingSaving?: boolean;
}

// --- State ---
const fileInput = ref<HTMLInputElement | null>(null);
const showModal = ref(false);
const importParsing = ref(false);
const importSaving = ref(false);
const importData = ref<ImportRoomData[]>([]);
const firestoreRooms = ref<{ id: string; name: string }[]>([]);

const EXCEL_ROOM_SHEETS = ['401', '402', '403', '501', '502', '503', '504'];

// --- Computed ---
const totalImportRows = computed(() => importData.value.reduce((sum, r) => sum + r.rows.length, 0));
const importMappedCount = computed(() => importData.value.filter(r => r.mappedRoomId).length);

// --- Helpers ---
const getLastDayOfMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

// --- Logic ---
const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) parseExcelFile(file);
};

const parseExcelFile = async (file: File) => {
  importParsing.value = true;
  importData.value = [];
  try {
    if (firestoreRooms.value.length === 0) {
      const snap = await getDocs(query(collection(db, 'rooms'), orderBy('name', 'asc')));
      firestoreRooms.value = snap.docs.map(d => ({ id: d.id, name: d.data().name as string }));
    }
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const result: ImportRoomData[] = [];

    for (const sheetName of EXCEL_ROOM_SHEETS) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null });
      const dataRows: ImportRow[] = [];

      for (let i = 2; i < rawRows.length; i++) {
        const row = rawRows[i] as any[];
        const yearMonthInt = row[8];
        const currentReading = row[1];
        const usage = row[6];
        const cost = row[3];
        const status = row[5] ?? '';
        if (!yearMonthInt || currentReading == null) continue;

        const ymStr = String(yearMonthInt);
        const year = parseInt(ymStr.substring(0, 4));
        const month = parseInt(ymStr.substring(4, 6));
        const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
        const lastDay = getLastDayOfMonth(year, month);
        dataRows.push({
          yearMonth,
          yearMonthInt,
          currentReading: Number(currentReading),
          lastReading: Number(currentReading) - Number(usage || 0),
          usage: Number(usage || 0),
          cost: Number(cost || 0),
          status: String(status),
          periodStart: `${yearMonth}-01`,
          periodEnd: `${yearMonth}-${String(lastDay).padStart(2, '0')}`,
        });
      }
      if (dataRows.length === 0) continue;
      const matched = firestoreRooms.value.find(r => r.name.includes(sheetName) || r.name === sheetName);
      result.push({ sheetName, rows: dataRows, mappedRoomId: matched?.id ?? '', mappedRoomName: matched?.name ?? '' });
    }
    importData.value = result;
    showModal.value = true;
  } catch (e) {
    console.error('Excel 解析失敗:', e);
    toast.error('Excel 解析失敗，請確認檔案格式正確');
  } finally {
    importParsing.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
};

const onMappingChange = (roomData: ImportRoomData, newId: string) => {
  if (newId === '__new__') {
    roomData.isCreatingNew = true;
    roomData.newRoomName = roomData.sheetName;
    roomData.mappedRoomId = '';
    roomData.mappedRoomName = '';
    return;
  }
  const found = firestoreRooms.value.find(r => r.id === newId);
  roomData.mappedRoomId = newId;
  roomData.mappedRoomName = found?.name ?? '';
};

const createRoom = async (roomData: ImportRoomData) => {
  const name = roomData.newRoomName?.trim();
  if (!name) return;
  roomData.isCreatingSaving = true;
  try {
    const ref = await addDoc(collection(db, 'rooms'), {
      name,
      landlordId: authStore.effectiveUid,
      status: 'vacant',
      price: 0,
      size: 0,
      address: '',
      layout: '獨立套房',
      type: '公寓',
      images: [],
      coverImage: '',
      isPublic: false,
      createdAt: serverTimestamp(),
    });
    const newRoom = { id: ref.id, name };
    firestoreRooms.value.push(newRoom);
    roomData.mappedRoomId = ref.id;
    roomData.mappedRoomName = name;
    roomData.isCreatingNew = false;
    toast.success(`房間「${name}」已建立`);
  } catch (e) {
    console.error(e);
    toast.error('建立房間失敗，請檢查網路連線');
  } finally {
    roomData.isCreatingSaving = false;
  }
};

const confirmImport = async () => {
  const toImport = importData.value.filter(r => r.mappedRoomId);
  if (toImport.length === 0) { toast.warning('請至少配對一個房間後再匯入'); return; }

  const totalRows = toImport.reduce((sum, r) => sum + r.rows.length, 0);
  const roomNames = toImport.map(r => r.mappedRoomName || r.sheetName).join('、');
  const confirmed = confirm(
    `確認匯入以下資料？\n\n房間：${roomNames}\n共 ${toImport.length} 個房間、${totalRows} 筆電表紀錄\n\n此操作無法還原，請確認資料正確後再繼續。`
  );
  if (!confirmed) return;

  importSaving.value = true;
  let totalWritten = 0;
  try {
    const BATCH_LIMIT = 400;
    let batch = writeBatch(db);
    let opCount = 0;
    for (const room of toImport) {
      for (const row of room.rows) {
        const ref = doc(collection(db, 'meter_readings'));
        batch.set(ref, {
          landlordId: authStore.effectiveUid,
          roomId: room.mappedRoomId,
          roomName: room.mappedRoomName,
          yearMonth: row.yearMonth,
          lastReading: row.lastReading,
          currentReading: row.currentReading,
          usage: row.usage,
          cost: row.cost,
          periodStart: row.periodStart,
          periodEnd: row.periodEnd,
          paymentStatus: row.status,
          calcLog: `[匯入自 Excel] 表單：${room.sheetName}，使用度數：${row.usage}度，電費：NT$${row.cost.toFixed(0)}`,
          mode: 'imported',
          createdAt: serverTimestamp(),
        });
        opCount++;
        totalWritten++;
        if (opCount >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }
    }
    if (opCount > 0) await batch.commit();
    toast.success(`匯入完成！共寫入 ${totalWritten} 筆抄表紀錄`);
    showModal.value = false;
    importData.value = [];
  } catch (e) {
    console.error('匯入失敗:', e);
    toast.error('匯入失敗，請檢查網路連線');
  } finally {
    importSaving.value = false;
  }
};
</script>

<style scoped>
.animate-scale-in { animation: scaleIn 0.2s ease-out; }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
