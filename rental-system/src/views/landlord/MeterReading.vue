<template>
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- 頁面標題列 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">智慧電表登錄</h1>
        <div class="flex items-center gap-2 text-text-secondary-light mt-1">
          <span>目前模式：</span>
          <span class="font-bold text-blue-600 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
            {{ currentModeLabel }}
          </span>
          <span v-if="loading" class="text-xs animate-pulse ml-2">資料載入中...</span>
        </div>
      </div>
      <div class="flex gap-3 flex-wrap">
        <button
          @click="showSettingsModal = true"
          class="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">tune</span>
          計算參數設定
        </button>

        <!-- 匯入元件（內含觸發按鈕 + modal） -->
        <MeterReadingImport />

        <button
          @click="saveAllReadings"
          :disabled="saving || !hasValidChanges"
          class="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="saving" class="material-symbols-outlined text-[18px] mr-2 animate-spin">progress_activity</span>
          <span v-else class="material-symbols-outlined text-[18px] mr-2">save</span>
          {{ saving ? '儲存中...' : '儲存紀錄' }}
        </button>
      </div>
    </div>

    <!-- 帳單分攤：步驟引導 + 主建物總表輸入 -->
    <div v-if="settings.mode === 'bill_share'" class="space-y-3">
      <div class="flex items-center gap-3 text-sm text-gray-500">
        <span class="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
        <span>輸入本棟總表本期讀數與台電總帳單金額</span>
        <span class="text-gray-300 mx-1">→</span>
        <span class="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold shrink-0"
          :class="meterGroups[0] && calculateGroupAvgRate(meterGroups[0]) > 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'">2</span>
        <span :class="meterGroups[0] && calculateGroupAvgRate(meterGroups[0]) > 0 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'">填寫各房間本期讀數</span>
        <span class="text-gray-300 mx-1">→</span>
        <span class="w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center font-bold shrink-0">3</span>
        <span class="text-gray-400">儲存紀錄</span>
      </div>
      <div v-for="group in meterGroups" :key="group.id" class="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-5 shadow-sm">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 class="font-bold text-lg text-blue-900 dark:text-blue-100">{{ group.name || '主建物總表' }}</h3>
            <p class="text-xs text-blue-700">用於計算平均分攤單價</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <label class="text-xs font-bold text-gray-500 block">本期總度數</label>
              <input type="number" v-model.number="group.masterCurrentReading" class="w-24 text-right font-bold border-b border-blue-500 bg-transparent focus:outline-none" placeholder="輸入">
            </div>
            <div class="text-right">
              <label class="text-xs font-bold text-gray-500 block">本期總帳單($)</label>
              <input type="number" v-model.number="group.masterBillAmount" class="w-24 text-right font-bold border-b border-blue-500 bg-transparent focus:outline-none" placeholder="輸入金額">
            </div>
          </div>
          <div class="text-right">
            <p class="text-xs font-bold text-blue-800 uppercase">換算平均單價</p>
            <p class="text-2xl font-bold text-blue-600">
              {{ calculateGroupAvgRate(group).toFixed(2) }} <span class="text-sm">元/度</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 統計資訊列 (固定費率 / 獨立累進) -->
    <div v-if="settings.mode !== 'bill_share'" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500 uppercase font-bold">計費模式</p>
        <p class="text-base font-bold text-primary mt-1">
          <template v-if="settings.mode === 'fixed'">固定 {{ settings.fixedRate }} 元/度</template>
          <template v-else>{{ settings.tieredConfig.strategy === 'split' ? '拆分制' : '標準台電' }}</template>
        </p>
      </div>
      <div v-if="settings.mode === 'tiered'" class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500 uppercase font-bold">季節判定</p>
        <div class="flex items-center gap-1.5 mt-1">
          <span class="material-symbols-outlined text-[18px] text-orange-500" v-if="settings.tieredConfig.season === 'summer'">sunny</span>
          <span class="material-symbols-outlined text-[18px] text-blue-500" v-if="settings.tieredConfig.season === 'non-summer'">ac_unit</span>
          <span class="material-symbols-outlined text-[18px] text-purple-500" v-if="settings.tieredConfig.season === 'average'">balance</span>
          <span class="material-symbols-outlined text-[18px] text-green-500" v-if="settings.tieredConfig.season === 'auto'">event_repeat</span>
          <p class="text-base font-bold">{{ seasonLabel }}</p>
        </div>
      </div>
      <div v-else class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500 uppercase font-bold">已填寫</p>
        <p class="text-base font-bold text-green-600 mt-1">{{ filledCount }} / {{ occupiedRooms.length }} 間</p>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500 uppercase font-bold">本月電費合計</p>
        <p class="text-base font-bold mt-1">NT$ {{ totalEstimatedCost.toLocaleString() }}</p>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm flex items-center justify-between gap-2">
        <div>
          <p class="text-xs text-gray-500 uppercase font-bold">統一抄表日</p>
          <p class="text-xs text-gray-400 mt-0.5">套用至所有未填房間</p>
        </div>
        <input type="date" v-model="unifiedDate" @change="applyUnifiedDate"
          class="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-xs focus:ring-2 focus:ring-primary outline-none font-mono">
      </div>
    </div>

    <!-- 主抄表表格 -->
    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div class="overflow-x-auto relative min-h-[300px]">
        <div v-if="loading" class="absolute inset-0 z-10 bg-white/50 dark:bg-card-dark/50 flex items-center justify-center">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="px-6 py-4">房號 / 租客</th>
              <th class="px-6 py-4">{{ settings.mode === 'fixed' ? '抄表日' : '計費期間' }}</th>
              <th class="px-6 py-4 text-right">上期讀數</th>
              <th class="px-6 py-4 text-center w-40">本期讀數</th>
              <th class="px-6 py-4 text-right">用量</th>
              <th class="px-6 py-4 text-right">{{ settings.mode === 'fixed' ? '電費金額' : '預估費用' }}</th>
              <th class="px-6 py-4 text-center w-20">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">

            <!-- 有租客的房間 -->
            <template v-if="occupiedRooms.length > 0">
              <tr v-for="room in occupiedRooms" :key="room.roomId"
                class="transition-colors"
                :class="room.isLocked ? 'bg-green-50/50 dark:bg-green-900/5' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'">

                <td class="px-6 py-4">
                  <p class="font-bold text-base">{{ room.name }}</p>
                  <p class="text-xs text-text-secondary-light">{{ room.tenantName }}</p>
                </td>

                <td class="px-6 py-4">
                  <div v-if="settings.mode === 'fixed'">
                    <input type="date" v-model="room.currentReadingDate" :disabled="room.isLocked"
                      class="px-2 py-1 border rounded-lg text-xs font-mono outline-none transition-colors"
                      :class="room.isLocked ? 'border-transparent bg-transparent text-gray-500 cursor-default' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary'">
                  </div>
                  <div v-else class="flex flex-col gap-1.5">
                    <div class="flex items-center gap-1.5 text-xs text-gray-500">
                      <span class="text-[10px] font-bold text-gray-400 w-4">起</span>
                      <span class="font-mono">{{ formatShortDate(room.lastReadingDate) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs">
                      <span class="text-[10px] font-bold text-primary w-4">迄</span>
                      <input type="date" v-model="room.currentReadingDate" :disabled="room.isLocked"
                        class="px-1.5 py-0.5 border rounded text-xs font-mono outline-none transition-colors"
                        :class="room.isLocked ? 'border-transparent bg-transparent text-gray-500 cursor-default' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-primary'">
                    </div>
                  </div>
                </td>

                <td class="px-6 py-4 text-right">
                  <span class="font-mono font-bold text-gray-700 dark:text-gray-300">{{ room.lastReading }}</span>
                  <p v-if="room.lastReadingDate" class="text-[11px] text-gray-400 mt-0.5">{{ formatShortDate(room.lastReadingDate) }}</p>
                </td>

                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      v-model.number="room.currentReading"
                      :disabled="room.isLocked"
                      class="flex-1 px-3 py-2 text-center font-bold border rounded-lg outline-none transition-colors"
                      :class="room.isLocked
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 cursor-default'
                        : validateReading(room) ? 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary' : 'border-red-300 bg-red-50 text-red-600'"
                      placeholder="輸入"
                    >
                    <!-- 已抄表 badge -->
                    <span v-if="room.isLocked"
                      class="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      <span class="material-symbols-outlined text-[12px]">check_circle</span>已抄
                    </span>
                  </div>
                </td>

                <td class="px-6 py-4 text-right font-mono font-bold">
                  <span :class="{'text-red-500': calculateUsage(room) < 0}">{{ room.currentReading ? calculateUsage(room) : '—' }}</span>
                </td>

                <td class="px-6 py-4 text-right font-bold text-primary">
                  <span v-if="room.currentReading">NT$ {{ calculateResult(room).cost.toLocaleString() }}</span>
                  <span v-else class="text-gray-300">—</span>
                </td>

                <td class="px-6 py-4 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button v-if="room.isLocked"
                      @click="unlockRoom(room)"
                      class="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                      title="修改本月抄表數值">
                      <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button v-else
                      @click="showDetails(room)"
                      class="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
                      :disabled="!room.currentReading"
                      title="查看計算詳情">
                      <span class="material-symbols-outlined text-[18px]">calculate</span>
                    </button>
                  </div>
                </td>
              </tr>
            </template>

            <!-- 空房分隔區 -->
            <template v-if="vacantRooms.length > 0">
              <tr>
                <td colspan="7" class="px-6 py-2 bg-gray-50 dark:bg-gray-800/30">
                  <span class="text-xs font-bold text-gray-400 uppercase">空房 ({{ vacantRooms.length }} 間，不計費)</span>
                </td>
              </tr>
              <tr v-for="room in vacantRooms" :key="room.roomId"
                class="opacity-50 hover:opacity-70 transition-opacity">
                <td class="px-6 py-3">
                  <p class="font-medium text-sm text-gray-500">{{ room.name }}</p>
                  <p class="text-xs text-gray-400">空房</p>
                </td>
                <td class="px-6 py-3 text-xs text-gray-400">—</td>
                <td class="px-6 py-3 text-right font-mono text-xs text-gray-400">{{ room.lastReading }}</td>
                <td class="px-6 py-3">
                  <input type="number" v-model.number="room.currentReading"
                    class="w-full px-2 py-1.5 text-center text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-primary outline-none bg-white dark:bg-gray-800"
                    placeholder="可選填">
                </td>
                <td class="px-6 py-3 text-right text-xs text-gray-400">{{ room.currentReading ? calculateUsage(room) : '—' }}</td>
                <td class="px-6 py-3 text-right text-xs text-gray-400">—</td>
                <td class="px-6 py-3"></td>
              </tr>
            </template>

          </tbody>
        </table>
      </div>

      <!-- 儲存前摘要 -->
      <div v-if="!loading && hasValidChanges" class="px-6 py-4 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-800 flex items-center justify-between gap-4">
        <div class="text-sm text-blue-800 dark:text-blue-200">
          <span class="font-bold">準備儲存 {{ pendingSaveCount }} 筆：</span>
          <span class="text-blue-600 dark:text-blue-300">
            {{ pendingSaveRooms.map(r => r.name).join('、') }}
          </span>
        </div>
        <button @click="saveAllReadings" :disabled="saving"
          class="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0">
          <span v-if="saving" class="material-symbols-outlined text-[16px] animate-spin">sync</span>
          <span v-else class="material-symbols-outlined text-[16px]">save</span>
          {{ saving ? '儲存中...' : '確認儲存' }}
        </button>
      </div>

      <!-- 儲存成功 Banner -->
      <div v-if="showSaveBanner" class="px-6 py-4 bg-green-50 dark:bg-green-900/10 border-t border-green-200 dark:border-green-800 flex items-center justify-between">
        <div class="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm font-medium">
          <span class="material-symbols-outlined text-[20px]">check_circle</span>
          已成功儲存 {{ savedCount }} 筆電表紀錄
        </div>
        <router-link :to="{ name: 'Financials' }"
          class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">receipt_long</span>
          前往帳務管理，生成帳單
        </router-link>
      </div>

      <div v-if="!loading && meterData.length === 0" class="p-12 text-center text-text-secondary-light">
        <p>目前沒有房源資料，請先至「房源管理」新增房源。</p>
      </div>
    </div>

    <!-- 設定 Modal -->
    <MeterSettingsModal
      v-model:show="showSettingsModal"
      v-model="settings"
      :landlord-id="authStore.effectiveUid"
    />

    <!-- 計算詳情 Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showDetailModal = false"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col animate-scale-in">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold dark:text-gray-100">計算詳情</h2>
          <button @click="showDetailModal = false" class="dark:text-gray-300"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <pre class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">{{ detailLog }}</pre>
        </div>
        <div class="p-6 border-t border-gray-100 dark:border-gray-700 text-right">
          <p class="text-lg font-bold dark:text-white">總計: NT$ {{ detailTotal }}</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { db } from '../../firebase/config';
import { useToastStore } from '../../stores/toast';
import { useAuthStore } from '../../stores/auth';
import {
  collection, doc, getDoc, setDoc, getDocs, addDoc,
  query, where, orderBy, updateDoc, serverTimestamp,
} from 'firebase/firestore';

import MeterSettingsModal from '../../components/meter/MeterSettingsModal.vue';
import MeterReadingImport from '../../components/meter/MeterReadingImport.vue';
import { defaultSettings, type Settings, type MeterGroup, type MeterEntry } from '../../components/meter/types';

const toast = useToastStore();
const authStore = useAuthStore();
const loading = ref(true);
const saving = ref(false);
const settings = ref<Settings>(JSON.parse(JSON.stringify(defaultSettings)));
const meterGroups = ref<MeterGroup[]>([]);
const meterData = ref<MeterEntry[]>([]);

const showSettingsModal = ref(false);
const showDetailModal = ref(false);
const detailLog = ref('');
const detailTotal = ref(0);
const unifiedDate = ref(new Date().toISOString().split('T')[0] || '');
const showSaveBanner = ref(false);
const savedCount = ref(0);

// --- 初始化 ---
onMounted(async () => {
  try {
    await Promise.all([loadSettings(), loadData()]);
  } catch (e) {
    console.error('Init Error', e);
    toast.error('資料載入失敗，請檢查網路連線');
  } finally {
    loading.value = false;
  }
});

const loadSettings = async () => {
  const uid = authStore.effectiveUid;
  const docRef = doc(db, 'settings', uid);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    settings.value = { ...defaultSettings, ...snap.data() } as Settings;
  } else {
    await setDoc(docRef, defaultSettings);
  }
};

const loadData = async () => {
  const uid = authStore.effectiveUid;
  const today = new Date().toISOString().split('T')[0] || '';
  const currentMonth = today.slice(0, 7);

  const [roomsSnap, readingsSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'rooms'),
      where('landlordId', '==', uid),
      orderBy('name', 'asc')
    )),
    getDocs(query(
      collection(db, 'meter_readings'),
      where('landlordId', '==', uid),
      where('periodEnd', '>=', `${currentMonth}-01`),
      where('periodEnd', '<=', `${currentMonth}-31`)
    )),
  ]);

  // 本月最新抄表紀錄 (by roomId)
  const thisMonthMap = new Map<string, any>();
  readingsSnap.docs.forEach(d => {
    const data = d.data();
    const existing = thisMonthMap.get(data.roomId);
    if (!existing || (data.createdAt?.seconds ?? 0) > (existing.createdAt?.seconds ?? 0)) {
      thisMonthMap.set(data.roomId, { id: d.id, ...data });
    }
  });

  meterData.value = roomsSnap.docs.map(d => {
    const data = d.data();
    const existing = thisMonthMap.get(d.id);
    return {
      roomId: d.id,
      name: data.name || '未命名',
      tenantName: data.tenantName || '',
      status: data.status || 'vacant',
      // 若本月已有紀錄，使用紀錄的原始起讀值（不用 rooms 被更新過的值）
      lastReading: existing ? existing.lastReading : (data.lastMeterReading || 0),
      lastReadingDate: existing ? existing.periodStart : (data.lastMeterDate || today),
      currentReading: existing ? existing.currentReading : undefined,
      currentReadingDate: existing ? existing.periodEnd : today,
      existingReadingId: existing ? existing.id : null,
      isLocked: !!existing,
    };
  });

  meterGroups.value = [{
    id: 'default_group',
    name: '本棟總表',
    officialMetersCount: 1,
    roomCount: meterData.value.length,
    masterLastReading: 0,
    masterCurrentReading: undefined,
    masterBillAmount: undefined,
  }];
};

// --- 計算邏輯 ---
const getDaysDiff = (start: string, end: string) => {
  const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const countSummerDays = (start: string, end: string) => {
  let count = 0;
  let current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    const m = current.getMonth();
    if (m >= 5 && m <= 8) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const calculateGroupAvgRate = (group: MeterGroup) => {
  if (!group.masterCurrentReading || !group.masterBillAmount) return 0;
  const usage = Math.max(0, group.masterCurrentReading - (group.masterLastReading || 0));
  return usage === 0 ? 0 : group.masterBillAmount / usage;
};

const calculateTieredLogic = (usage: number, room: MeterEntry, group: MeterGroup) => {
  let totalCost = 0;
  let log = '';
  const days = getDaysDiff(room.lastReadingDate, room.currentReadingDate);
  const summerDays = countSummerDays(room.lastReadingDate, room.currentReadingDate);

  let usageSummer = 0;
  let usageNonSummer = 0;
  let useAverageRate = false;

  if (settings.value.tieredConfig.season === 'average') {
    useAverageRate = true;
    log += `季節判定: 採用平均費率 (夏月+非夏月)/2\n`;
  } else if (settings.value.tieredConfig.season === 'summer') {
    usageSummer = usage;
  } else if (settings.value.tieredConfig.season === 'non-summer') {
    usageNonSummer = usage;
  } else {
    const summerRatio = summerDays / days;
    usageSummer = usage * summerRatio;
    usageNonSummer = usage * (1 - summerRatio);
    log += `季節判定 (共${days}天): 夏月${summerDays}天 / 非夏月${days - summerDays}天\n`;
    log += `用量拆分: 夏月 ${usageSummer.toFixed(1)}度 / 非夏月 ${usageNonSummer.toFixed(1)}度\n\n`;
  }

  let scaleFactor = days / 30;
  if (settings.value.tieredConfig.strategy === 'split') {
    scaleFactor *= (group.officialMetersCount / group.roomCount);
    log += `級距策略: 資本拆分 (總表${group.officialMetersCount} / 房數${group.roomCount})\n`;
  } else {
    scaleFactor *= group.officialMetersCount;
    log += `級距策略: 標準台電 (總表${group.officialMetersCount})\n`;
  }
  log += `級距調整係數: ${scaleFactor.toFixed(3)}\n`;

  const calcPart = (amount: number, type: 'summer' | 'non-summer' | 'average') => {
    let remaining = amount;
    let cost = 0;
    let prevLimit = 0;
    let partLog = type === 'summer' ? '--- [夏月計算] ---\n' : type === 'non-summer' ? '--- [非夏月計算] ---\n' : '--- [平均費率計算] ---\n';
    for (const tier of settings.value.tiers) {
      if (remaining <= 0) break;
      const scaledLimit = (tier.limit === 99999) ? 99999 : tier.limit * scaleFactor;
      const gap = scaledLimit - (prevLimit * scaleFactor);
      const inTier = Math.min(remaining, gap);
      if (inTier > 0) {
        const rate = type === 'summer' ? tier.summerRate : type === 'non-summer' ? tier.nonSummerRate : (tier.summerRate + tier.nonSummerRate) / 2;
        const tierCost = inTier * rate;
        cost += tierCost;
        partLog += `級距${tier.limit}: ${inTier.toFixed(1)}度 x $${rate.toFixed(3)} = $${tierCost.toFixed(1)}\n`;
        remaining -= inTier;
      }
      prevLimit = tier.limit;
    }
    return { cost, log: partLog };
  };

  if (useAverageRate) {
    const res = calcPart(usage, 'average');
    totalCost += res.cost;
    log += res.log;
  } else {
    if (usageSummer > 0) { const res = calcPart(usageSummer, 'summer'); totalCost += res.cost; log += res.log; }
    if (usageNonSummer > 0) { const res = calcPart(usageNonSummer, 'non-summer'); totalCost += res.cost; log += res.log; }
  }
  return { cost: Math.round(totalCost), log };
};

const calculateElectricity = (room: MeterEntry) => {
  const usage = Math.max(0, (room.currentReading || 0) - room.lastReading);
  if (usage === 0) return { cost: 0, log: '無用量' };
  if (settings.value.mode === 'fixed') {
    const cost = Math.round(usage * settings.value.fixedRate);
    return { cost, log: `固定費率: ${usage}度 x $${settings.value.fixedRate} = $${cost}` };
  }
  const group = meterGroups.value[0];
  if (!group) return { cost: 0, log: '錯誤: 無群組設定' };
  if (settings.value.mode === 'bill_share') {
    const rate = calculateGroupAvgRate(group);
    const cost = Math.round(usage * rate);
    return { cost, log: `帳單分攤: ${usage}度 x 平均單價$${rate.toFixed(4)} = $${cost}` };
  }
  return calculateTieredLogic(usage, room, group);
};

// --- Computed ---
const currentModeLabel = computed(() => {
  const map: Record<string, string> = { fixed: '固定費率', tiered: '獨立累進費率', bill_share: '帳單分攤制' };
  return map[settings.value.mode] || settings.value.mode;
});
const seasonLabel = computed(() => {
  const map: Record<string, string> = { auto: '自動判斷', average: '平均費率', summer: '強制夏月', 'non-summer': '強制非夏月' };
  return map[settings.value.tieredConfig.season];
});
const occupiedRooms = computed(() => meterData.value.filter(r => r.tenantName || r.status === 'occupied'));
const vacantRooms = computed(() => meterData.value.filter(r => !r.tenantName && r.status !== 'occupied'));
const filledCount = computed(() => occupiedRooms.value.filter(r => r.currentReading !== undefined).length);
const pendingSaveRooms = computed(() => meterData.value.filter(r => !r.isLocked && r.currentReading !== undefined && r.currentReading >= r.lastReading));
const pendingSaveCount = computed(() => pendingSaveRooms.value.length);

const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  return `${Number(parts[1])}/${Number(parts[2])}`;
};
const applyUnifiedDate = () => {
  meterData.value.forEach(r => {
    if (!r.isLocked) r.currentReadingDate = unifiedDate.value;
  });
};
const unlockRoom = (room: MeterEntry) => {
  room.isLocked = false;
};
const calculateUsage = (room: MeterEntry) => Math.max(0, (room.currentReading || 0) - room.lastReading);
const calculateResult = (room: MeterEntry) => calculateElectricity(room);
const validateReading = (room: MeterEntry) => !((room.currentReading || 0) < room.lastReading && room.currentReading !== undefined);
const totalEstimatedCost = computed(() => meterData.value.reduce((sum, r) => sum + calculateResult(r).cost, 0));

const hasValidChanges = computed(() => pendingSaveCount.value > 0);

// --- 操作 ---
const showDetails = (room: MeterEntry) => {
  const res = calculateElectricity(room);
  detailLog.value = res.log;
  detailTotal.value = res.cost;
  showDetailModal.value = true;
};

const saveAllReadings = async () => {
  const validEntries = pendingSaveRooms.value;
  if (validEntries.length === 0) return;

  saving.value = true;
  showSaveBanner.value = false;
  try {
    const uid = authStore.effectiveUid;
    const promises: Promise<any>[] = [];

    for (const entry of validEntries) {
      const usage = (entry.currentReading || 0) - entry.lastReading;
      const { cost, log } = calculateElectricity(entry);
      const readingData = {
        landlordId: uid,
        roomId: entry.roomId,
        roomName: entry.name,
        lastReading: entry.lastReading,
        currentReading: entry.currentReading,
        usage, cost,
        periodStart: entry.lastReadingDate,
        periodEnd: entry.currentReadingDate,
        calcLog: log,
        mode: settings.value.mode,
        createdAt: serverTimestamp(),
      };

      if (entry.existingReadingId) {
        // 更新既有紀錄
        promises.push(updateDoc(doc(db, 'meter_readings', entry.existingReadingId), readingData));
      } else {
        // 新增紀錄
        promises.push(addDoc(collection(db, 'meter_readings'), readingData));
      }
      promises.push(updateDoc(doc(db, 'rooms', entry.roomId), {
        lastMeterReading: entry.currentReading,
        lastMeterDate: entry.currentReadingDate,
      }));
    }

    await Promise.all(promises);
    savedCount.value = validEntries.length;
    showSaveBanner.value = true;
    await loadData();
  } catch (e) {
    console.error(e);
    toast.error('儲存失敗，請重試');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.animate-scale-in { animation: scaleIn 0.2s ease-out; }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
