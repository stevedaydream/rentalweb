<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          智慧電表登錄
        </h1>
        <p class="text-text-secondary-light">
          目前模式：<span class="font-bold text-blue-600">{{ currentModeLabel }}</span>
        </p>
      </div>
      <div class="flex gap-3">
        <button 
          @click="showSettingsModal = true"
          class="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">tune</span>
          計算參數設定
        </button>
        <button 
          @click="saveAllReadings"
          class="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">save</span>
          儲存紀錄
        </button>
      </div>
    </div>

    <div v-if="settings.mode === 'bill_share'" class="space-y-4">
      <div v-for="group in meterGroups" :key="group.id" class="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-5 shadow-sm">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 class="font-bold text-lg text-blue-900 dark:text-blue-100">{{ group.name }} (總表)</h3>
            <p class="text-xs text-blue-700">{{ group.address }}</p>
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

    <div v-if="settings.mode === 'tiered'" class="grid grid-cols-1 md:grid-cols-3 gap-4">
       <div class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
          <p class="text-xs text-gray-500 uppercase font-bold">級距策略</p>
          <p class="text-lg font-bold text-primary">
            {{ settings.tieredConfig.strategy === 'split' ? '資本拆分制 (除以房數)' : '標準台電制 (僅依總表)' }}
          </p>
       </div>
       <div class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
          <p class="text-xs text-gray-500 uppercase font-bold">季節判定</p>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-orange-500" v-if="settings.tieredConfig.season === 'summer'">sunny</span>
            <span class="material-symbols-outlined text-blue-500" v-if="settings.tieredConfig.season === 'non-summer'">ac_unit</span>
            <span class="material-symbols-outlined text-purple-500" v-if="settings.tieredConfig.season === 'average'">balance</span> <span class="material-symbols-outlined text-green-500" v-if="settings.tieredConfig.season === 'auto'">event_repeat</span>
            <p class="text-lg font-bold">{{ seasonLabel }}</p>
          </div>
       </div>
       <div class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm flex justify-between items-center">
          <div>
            <p class="text-xs text-gray-500 uppercase font-bold">預估總收</p>
            <p class="text-xl font-bold">NT$ {{ totalEstimatedCost.toLocaleString() }}</p>
          </div>
          <span class="text-xs text-gray-400">總用量: {{ totalUsage }} 度</span>
       </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="px-6 py-4 w-24">房號</th>
              <th class="px-6 py-4" v-if="settings.mode !== 'fixed'">計費期間</th>
              <th class="px-6 py-4 text-right">上期</th>
              <th class="px-6 py-4 text-center w-32">本期</th>
              <th class="px-6 py-4 text-right">用量</th>
              <th class="px-6 py-4 text-right">費用</th>
              <th class="px-6 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="room in meterData" :key="room.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4 font-bold text-lg">{{ room.name }}</td>
              
              <td class="px-6 py-4" v-if="settings.mode !== 'fixed'">
                <div class="flex flex-col gap-1">
                   <div class="flex items-center text-xs text-gray-500">
                     <span class="w-6">起</span>
                     <input type="date" v-model="room.lastReadingDate" class="bg-transparent border-0 p-0 text-xs focus:ring-0">
                   </div>
                   <div class="flex items-center text-xs text-gray-800 dark:text-gray-200">
                     <span class="w-6">迄</span>
                     <input type="date" v-model="room.currentReadingDate" class="bg-transparent border-b border-gray-300 dark:border-gray-600 p-0 text-xs focus:ring-0 w-24">
                   </div>
                </div>
              </td>

              <td class="px-6 py-4 text-right font-mono text-gray-500">{{ room.lastReading }}</td>

              <td class="px-6 py-4">
                <input 
                  type="number" 
                  v-model.number="room.currentReading" 
                  class="w-full px-3 py-2 text-center font-bold border rounded-lg focus:ring-2 focus:ring-primary outline-none transition-colors"
                  :class="validateReading(room) ? 'border-gray-300 dark:border-gray-600' : 'border-red-300 bg-red-50 text-red-600'"
                >
              </td>

              <td class="px-6 py-4 text-right font-mono font-bold">
                {{ calculateUsage(room) }}
              </td>

              <td class="px-6 py-4 text-right font-bold text-primary text-lg">
                NT$ {{ calculateResult(room).cost.toLocaleString() }}
              </td>

              <td class="px-6 py-4 text-center">
                <button @click="showDetails(room)" class="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors" title="查看詳情">
                  <span class="material-symbols-outlined text-[20px]">calculate</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showSettingsModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showSettingsModal = false"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">計算參數設定</h2>
          <button @click="showSettingsModal = false" class="text-gray-400 hover:text-gray-600">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto space-y-8">
          
          <section>
            <h3 class="text-sm font-bold text-gray-500 uppercase mb-3">步驟 1：選擇計費核心模式</h3>
            <div class="grid grid-cols-3 gap-3">
              <button 
                @click="settings.mode = 'fixed'"
                class="p-4 rounded-xl border-2 text-left transition-all"
                :class="settings.mode === 'fixed' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
              >
                <div class="font-bold mb-1">A. 固定費率</div>
                <div class="text-xs text-gray-500">每度電單一價格</div>
              </button>
              <button 
                @click="settings.mode = 'tiered'"
                class="p-4 rounded-xl border-2 text-left transition-all"
                :class="settings.mode === 'tiered' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
              >
                <div class="font-bold mb-1">B. 獨立累進</div>
                <div class="text-xs text-gray-500">每房依台電級距計算 (最常用)</div>
              </button>
              <button 
                @click="settings.mode = 'bill_share'"
                class="p-4 rounded-xl border-2 text-left transition-all"
                :class="settings.mode === 'bill_share' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
              >
                <div class="font-bold mb-1">C. 帳單分攤</div>
                <div class="text-xs text-gray-500">依總表金額平均分攤</div>
              </button>
            </div>
          </section>

          <section v-if="settings.mode === 'fixed'" class="animation-fade-in">
             <label class="block text-sm font-bold mb-2">每度電費 (元)</label>
             <input v-model.number="settings.fixedRate" type="number" step="0.1" class="form-input text-lg font-bold w-32">
          </section>

          <section v-if="settings.mode === 'tiered'" class="space-y-6 animation-fade-in">
             
             <div>
               <h3 class="text-sm font-bold text-gray-500 uppercase mb-3">步驟 2：級距策略</h3>
               <div class="grid grid-cols-2 gap-3">
                 <button 
                   @click="settings.tieredConfig.strategy = 'standard'"
                   class="p-3 rounded-lg border text-left flex items-center gap-3"
                   :class="settings.tieredConfig.strategy === 'standard' ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'border-gray-200'"
                 >
                   <span class="material-symbols-outlined text-gray-500">home</span>
                   <div>
                     <div class="font-bold text-sm">標準台電制</div>
                     <div class="text-[10px] text-gray-500">級距僅依「總表數」放大</div>
                   </div>
                 </button>
                 <button 
                   @click="settings.tieredConfig.strategy = 'split'"
                   class="p-3 rounded-lg border text-left flex items-center gap-3"
                   :class="settings.tieredConfig.strategy === 'split' ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'border-gray-200'"
                 >
                   <span class="material-symbols-outlined text-gray-500">safety_divider</span>
                   <div>
                     <div class="font-bold text-sm">資本拆分制</div>
                     <div class="text-[10px] text-gray-500">級距依「房間數」平均縮小</div>
                   </div>
                 </button>
               </div>
             </div>

             <div>
               <h3 class="text-sm font-bold text-gray-500 uppercase mb-3">步驟 3：夏月設定</h3>
               <select v-model="settings.tieredConfig.season" class="form-input">
                 <option value="auto">自動判斷 (依日期比例拆分)</option>
                 <option value="average">平均費率 (夏月+非夏月各半)</option> <option value="summer">強制夏月費率</option>
                 <option value="non-summer">強制非夏月費率</option>
               </select>
             </div>

             <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div class="grid grid-cols-3 gap-2 text-xs font-bold text-center mb-2">
                   <div>級距上限</div>
                   <div>非夏月單價</div>
                   <div>夏月單價</div>
                </div>
                <div v-for="(tier, idx) in settings.tiers" :key="idx" class="grid grid-cols-3 gap-2 items-center mb-2">
                   <input v-model.number="tier.limit" type="number" class="form-input text-center text-xs py-1">
                   <input v-model.number="tier.nonSummerRate" type="number" step="0.01" class="form-input text-center text-xs py-1">
                   <input v-model.number="tier.summerRate" type="number" step="0.01" class="form-input text-center text-xs py-1">
                </div>
                <div v-if="settings.tieredConfig.season === 'average'" class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                   <p class="text-[10px] text-purple-500 text-center font-bold">
                     目前使用平均值：
                     {{ settings.tiers.map(t => ((t.nonSummerRate + t.summerRate)/2).toFixed(2)).join(' / ') }}
                   </p>
                </div>
             </div>
          </section>

          <section v-if="settings.mode === 'bill_share'" class="animation-fade-in">
             <div class="bg-yellow-50 p-4 rounded-xl text-sm text-yellow-800">
               <p class="font-bold">注意</p>
               <p>此模式下，您需要在列表上方輸入總表抄表與總金額，系統會自動算出平均單價。</p>
             </div>
          </section>

        </div>
        <div class="p-6 border-t border-gray-100 dark:border-gray-700">
          <button @click="showSettingsModal = false" class="w-full btn-primary py-2.5 rounded-xl bg-blue-600 text-white font-bold">完成設定</button>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showDetailModal = false"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 class="text-xl font-bold">計算詳情</h2>
          <button @click="showDetailModal = false"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[60vh]">
           <pre class="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap font-mono text-gray-700">{{ detailLog }}</pre>
        </div>
        <div class="p-6 border-t border-gray-100 text-right">
           <p class="text-lg font-bold">總計: NT$ {{ detailTotal }}</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// --- Interfaces ---
interface MeterGroup {
  id: number;
  name: string;
  address: string;
  officialMetersCount: number; // 台電表數
  roomCount: number;           // 分房數
  masterLastReading?: number;
  masterCurrentReading?: number;
  masterBillAmount?: number;
}

interface MeterEntry {
  id: number;
  groupId: number;
  name: string;
  lastReading: number;
  lastReadingDate: string;
  currentReading?: number;
  currentReadingDate: string;
}

// interface Tier { limit: number; nonSummerRate: number; summerRate: number; }

// --- Settings State ---
const settings = ref({
  mode: 'tiered', // 'fixed' | 'tiered' | 'bill_share'
  tieredConfig: {
    strategy: 'split', // 'standard' | 'split'
    season: 'auto',    // 'auto' | 'summer' | 'non-summer' | 'average'
  },
  fixedRate: 5.0,
  tiers: [
    { limit: 120, nonSummerRate: 1.63, summerRate: 1.63 },
    { limit: 330, nonSummerRate: 2.10, summerRate: 2.38 },
    { limit: 500, nonSummerRate: 2.89, summerRate: 3.52 },
    { limit: 700, nonSummerRate: 3.94, summerRate: 4.80 },
    { limit: 1000, nonSummerRate: 4.60, summerRate: 5.83 },
    { limit: 99999, nonSummerRate: 5.03, summerRate: 6.41 }
  ]
});

// --- Mock Data ---
const meterGroups = ref<MeterGroup[]>([
  { id: 1, name: '復興路透天', address: '復興路112號', officialMetersCount: 1, roomCount: 2, masterLastReading: 12500, masterCurrentReading: undefined, masterBillAmount: undefined }
]);

const meterData = ref<MeterEntry[]>([
  { id: 1, groupId: 1, name: 'A房', lastReading: 1450, lastReadingDate: '2025-09-01', currentReading: undefined, currentReadingDate: '2025-10-01' },
  { id: 2, groupId: 1, name: 'B房', lastReading: 2100, lastReadingDate: '2025-09-01', currentReading: undefined, currentReadingDate: '2025-10-01' },
]);

// --- Modal State ---
const showSettingsModal = ref(false);
const showDetailModal = ref(false);
const detailLog = ref('');
const detailTotal = ref(0);

// --- Helpers ---
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
    if (m >= 5 && m <= 8) count++; // June(5) to Sept(8)
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const getGroup = (id: number) => meterGroups.value.find(g => g.id === id);

// --- Core Calculation Logic ---

// Bill Share Rate
const calculateGroupAvgRate = (group: MeterGroup) => {
  if (!group.masterCurrentReading || !group.masterBillAmount) return 0;
  const usage = Math.max(0, group.masterCurrentReading - (group.masterLastReading || 0));
  if (usage === 0) return 0;
  return group.masterBillAmount / usage;
};

// Tiered Calculator (Supports Season & Split)
const calculateTieredLogic = (usage: number, room: MeterEntry, group: MeterGroup) => {
  let totalCost = 0;
  let log = '';
  const days = getDaysDiff(room.lastReadingDate, room.currentReadingDate);
  const summerDays = countSummerDays(room.lastReadingDate, room.currentReadingDate);
  
  // 1. Determine Usage Split or Rate Mode
  let usageSummer = 0;
  let usageNonSummer = 0;
  let useAverageRate = false;
  
  if (settings.value.tieredConfig.season === 'average') {
    // [NEW] Average Mode: Don't split usage, use avg rate
    useAverageRate = true;
    log += `季節判定: 採用平均費率 (夏月+非夏月)/2\n`;
  } else if (settings.value.tieredConfig.season === 'summer') {
    usageSummer = usage;
  } else if (settings.value.tieredConfig.season === 'non-summer') {
    usageNonSummer = usage;
  } else { // Auto
    const summerRatio = summerDays / days;
    usageSummer = usage * summerRatio;
    usageNonSummer = usage * (1 - summerRatio);
    log += `季節判定 (共${days}天): 夏月${summerDays}天 / 非夏月${days - summerDays}天\n`;
    log += `用量拆分: 夏月 ${usageSummer.toFixed(1)}度 / 非夏月 ${usageNonSummer.toFixed(1)}度\n\n`;
  }

  // 2. Determine Scale Factor (Strategy)
  let scaleFactor = days / 30; // Time Scale
  if (settings.value.tieredConfig.strategy === 'split') {
    scaleFactor *= (group.officialMetersCount / group.roomCount);
    log += `級距策略: 資本拆分 (總表${group.officialMetersCount} / 房數${group.roomCount})\n`;
  } else {
    scaleFactor *= group.officialMetersCount;
    log += `級距策略: 標準台電 (總表${group.officialMetersCount})\n`;
  }
  log += `級距調整係數: ${scaleFactor.toFixed(3)}\n`;

  // 3. Calculate Function
  const calcPart = (amount: number, type: 'summer' | 'non-summer' | 'average') => {
    let remaining = amount;
    let cost = 0;
    let prevLimit = 0;
    let partLog = '';
    
    if (type === 'summer') partLog = '--- [夏月計算] ---\n';
    else if (type === 'non-summer') partLog = '--- [非夏月計算] ---\n';
    else partLog = '--- [平均費率計算] ---\n';

    for (const tier of settings.value.tiers) {
      if (remaining <= 0) break;
      const scaledLimit = (tier.limit === 99999) ? 99999 : tier.limit * scaleFactor;
      const gap = scaledLimit - (prevLimit * scaleFactor);
      const inTier = Math.min(remaining, gap);
      
      if (inTier > 0) {
        let rate = 0;
        if (type === 'summer') rate = tier.summerRate;
        else if (type === 'non-summer') rate = tier.nonSummerRate;
        else rate = (tier.summerRate + tier.nonSummerRate) / 2; // Average Logic

        const tierCost = inTier * rate;
        cost += tierCost;
        partLog += `級距${tier.limit}: ${inTier.toFixed(1)}度 x $${rate.toFixed(3)} = $${tierCost.toFixed(1)}\n`;
        remaining -= inTier;
      }
      prevLimit = tier.limit;
    }
    return { cost, log: partLog };
  };

  // 4. Run Calculation
  if (useAverageRate) {
     // [NEW] Run single pass with Average Rate
     const res = calcPart(usage, 'average');
     totalCost += res.cost;
     log += res.log;
  } else {
     // Run split pass
     if (usageSummer > 0) {
       const res = calcPart(usageSummer, 'summer');
       totalCost += res.cost;
       log += res.log;
     }
     if (usageNonSummer > 0) {
       const res = calcPart(usageNonSummer, 'non-summer');
       totalCost += res.cost;
       log += res.log;
     }
  }

  return { cost: Math.round(totalCost), log };
};

// Main Entry Point
const calculateElectricity = (room: MeterEntry) => {
  const usage = Math.max(0, (room.currentReading || 0) - room.lastReading);
  if (usage === 0) return { cost: 0, log: '無用量' };

  if (settings.value.mode === 'fixed') {
    const cost = Math.round(usage * settings.value.fixedRate);
    return { cost, log: `固定費率: ${usage}度 x $${settings.value.fixedRate} = $${cost}` };
  }

  const group = getGroup(room.groupId);
  if (!group) return { cost: 0, log: 'Error: Group not found' };

  if (settings.value.mode === 'bill_share') {
    const rate = calculateGroupAvgRate(group);
    const cost = Math.round(usage * rate);
    return { cost, log: `帳單分攤: ${usage}度 x 平均單價$${rate.toFixed(4)} = $${cost}` };
  }

  // Tiered
  return calculateTieredLogic(usage, room, group);
};

// --- UI Display Helpers ---
const currentModeLabel = computed(() => {
  const map: Record<string, string> = { fixed: '固定費率', tiered: '獨立累進費率', bill_share: '帳單分攤制' };
  return map[settings.value.mode];
});

const seasonLabel = computed(() => {
  const map: Record<string, string> = { auto: '自動判斷', average: '平均費率', summer: '強制夏月', 'non-summer': '強制非夏月' };
  return map[settings.value.tieredConfig.season];
});

const calculateUsage = (room: MeterEntry) => Math.max(0, (room.currentReading || 0) - room.lastReading);
const calculateResult = (room: MeterEntry) => calculateElectricity(room);
const validateReading = (room: MeterEntry) => !((room.currentReading || 0) < room.lastReading && room.currentReading !== undefined);

const showDetails = (room: MeterEntry) => {
  const res = calculateElectricity(room);
  detailLog.value = res.log;
  detailTotal.value = res.cost;
  showDetailModal.value = true;
};

const totalEstimatedCost = computed(() => meterData.value.reduce((sum, r) => sum + calculateResult(r).cost, 0));
const totalUsage = computed(() => meterData.value.reduce((sum, r) => sum + calculateUsage(r), 0));
const saveAllReadings = () => alert('儲存成功！');

</script>

<style scoped>
.animation-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
</style>