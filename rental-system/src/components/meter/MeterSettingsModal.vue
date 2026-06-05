<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meter-settings-modal-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
    >

      <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h2 id="meter-settings-modal-title" class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ roomName ? `${roomName} 電費方案` : '計算參數設定（全域）' }}
          </h2>
          <p v-if="roomName" class="text-xs text-text-secondary-light mt-0.5">此設定僅套用此房間，不影響其他房間</p>
        </div>
        <button @click="close" aria-label="關閉" class="text-gray-400 hover:text-gray-600">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="p-6 overflow-y-auto space-y-8">

        <section>
          <h3 class="text-sm font-bold text-gray-500 uppercase mb-3">步驟 1：選擇計費核心模式</h3>
          <div class="grid grid-cols-2 gap-3">
            <button
              @click="local.mode = 'fixed'"
              class="p-4 rounded-xl border-2 text-left transition-all"
              :class="local.mode === 'fixed' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
            >
              <div class="font-bold mb-1">A. 固定費率</div>
              <div class="text-xs text-gray-500">每度電單一價格</div>
            </button>
            <button
              @click="local.mode = 'tiered'"
              class="p-4 rounded-xl border-2 text-left transition-all"
              :class="local.mode === 'tiered' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
            >
              <div class="font-bold mb-1">B. 獨立累進</div>
              <div class="text-xs text-gray-500">依台電級距，有夏/非夏費率</div>
            </button>
            <button
              @click="switchToAvgMode"
              class="p-4 rounded-xl border-2 text-left transition-all"
              :class="local.mode === 'tiered_avg' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
            >
              <div class="font-bold mb-1">C. 平均費率</div>
              <div class="text-xs text-gray-500">累進但只填一個費率，不分夏/非夏</div>
            </button>
            <button
              @click="local.mode = 'bill_share'"
              class="p-4 rounded-xl border-2 text-left transition-all"
              :class="local.mode === 'bill_share' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
            >
              <div class="font-bold mb-1">D. 帳單分攤</div>
              <div class="text-xs text-gray-500">依總表金額平均分攤</div>
            </button>
          </div>
        </section>

        <section v-if="local.mode === 'fixed'" class="animation-fade-in">
          <label for="settings-unit-price" class="block text-sm font-bold mb-2">每度電費 (元)</label>
          <input id="settings-unit-price" v-model.number="local.fixedRate" type="number" step="0.1" class="form-input text-lg font-bold w-32">
        </section>

        <section v-if="local.mode === 'tiered_avg'" class="space-y-4 animation-fade-in">
          <div>
            <h3 class="text-sm font-bold text-gray-500 uppercase mb-1">級距策略</h3>
            <div class="grid grid-cols-2 gap-3">
              <button
                @click="local.tieredConfig.strategy = 'split'"
                class="p-3 rounded-lg border text-left flex items-center gap-3"
                :class="local.tieredConfig.strategy === 'split' ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'border-gray-200'"
              >
                <span class="material-symbols-outlined text-gray-500" aria-hidden="true">safety_divider</span>
                <div>
                  <div class="font-bold text-sm">資本拆分（推薦）</div>
                  <div class="text-[10px] text-gray-500">級距除以房間數</div>
                </div>
              </button>
              <button
                @click="local.tieredConfig.strategy = 'standard'"
                class="p-3 rounded-lg border text-left flex items-center gap-3"
                :class="local.tieredConfig.strategy === 'standard' ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'border-gray-200'"
              >
                <span class="material-symbols-outlined text-gray-500" aria-hidden="true">home</span>
                <div>
                  <div class="font-bold text-sm">標準台電制</div>
                  <div class="text-[10px] text-gray-500">級距依總表數放大</div>
                </div>
              </button>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div class="grid grid-cols-2 gap-2 text-xs font-bold text-center mb-2">
              <div>級距上限 (度)</div>
              <div>費率 (元/度)</div>
            </div>
            <div v-for="(tier, idx) in local.tiers" :key="idx" class="grid grid-cols-2 gap-2 items-center mb-2">
              <input v-model.number="tier.limit" type="number" class="form-input text-center text-xs py-1">
              <input v-model.number="tier.nonSummerRate" type="number" step="0.001"
                @update:modelValue="tier.summerRate = tier.nonSummerRate"
                class="form-input text-center text-xs py-1">
            </div>
          </div>
        </section>

        <section v-if="local.mode === 'tiered'" class="space-y-6 animation-fade-in">
          <div>
            <h3 class="text-sm font-bold text-gray-500 uppercase mb-3">步驟 2：級距策略</h3>
            <div class="grid grid-cols-2 gap-3">
              <button
                @click="local.tieredConfig.strategy = 'standard'"
                class="p-3 rounded-lg border text-left flex items-center gap-3"
                :class="local.tieredConfig.strategy === 'standard' ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'border-gray-200'"
              >
                <span class="material-symbols-outlined text-gray-500">home</span>
                <div>
                  <div class="font-bold text-sm">標準台電制</div>
                  <div class="text-[10px] text-gray-500">級距僅依「總表數」放大</div>
                </div>
              </button>
              <button
                @click="local.tieredConfig.strategy = 'split'"
                class="p-3 rounded-lg border text-left flex items-center gap-3"
                :class="local.tieredConfig.strategy === 'split' ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'border-gray-200'"
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
            <label for="settings-season" class="text-sm font-bold text-gray-500 uppercase mb-3 block">步驟 3：夏月設定</label>
            <select id="settings-season" v-model="local.tieredConfig.season" class="form-input">
              <option value="auto">自動判斷 (依日期比例拆分)</option>
              <option value="average">平均費率 (夏月+非夏月各半)</option>
              <option value="summer">強制夏月費率</option>
              <option value="non-summer">強制非夏月費率</option>
            </select>
          </div>

          <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div class="grid grid-cols-3 gap-2 text-xs font-bold text-center mb-2">
              <div>級距上限 (度)</div>
              <div>非夏月單價</div>
              <div>夏月單價</div>
            </div>
            <div v-for="(tier, idx) in local.tiers" :key="idx" class="grid grid-cols-3 gap-2 items-center mb-2">
              <input v-model.number="tier.limit" type="number" class="form-input text-center text-xs py-1">
              <input v-model.number="tier.nonSummerRate" type="number" step="0.01" class="form-input text-center text-xs py-1">
              <input v-model.number="tier.summerRate" type="number" step="0.01" class="form-input text-center text-xs py-1">
            </div>
            <div v-if="local.tieredConfig.season === 'average'" class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <p class="text-[10px] text-purple-500 text-center font-bold">
                目前使用平均值：
                {{ local.tiers.map(t => ((t.nonSummerRate + t.summerRate) / 2).toFixed(2)).join(' / ') }}
              </p>
            </div>
          </div>
        </section>

        <section v-if="local.mode === 'bill_share'" class="animation-fade-in">
          <div class="bg-yellow-50 p-4 rounded-xl text-sm text-yellow-800">
            <p class="font-bold">注意</p>
            <p>此模式下，您需要在列表上方輸入總表抄表與總金額，系統會自動算出平均單價。</p>
          </div>
        </section>

      </div>

      <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
        <button v-if="roomId"
          @click="handleResetRoom"
          class="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          重設為全域設定
        </button>
        <button
          @click="handleSave"
          class="flex-1 btn-primary py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
        >
          儲存並關閉
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { db } from '../../firebase/config';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { useToastStore } from '../../stores/toast';
import type { Settings } from './types';

const props = defineProps<{
  show: boolean;
  modelValue: Settings;
  landlordId: string;
  roomId?: string;    // 若有，儲存至 rooms/{roomId}.electricitySettings
  roomName?: string;  // 顯示在 title 的房間名稱
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'update:modelValue': [value: Settings];
  'reset-room': [];   // 清除此房間的個別設定，改用全域
}>();

const toast = useToastStore();

const local = ref<Settings>(JSON.parse(JSON.stringify(props.modelValue)));

watch(() => props.show, (val) => {
  if (val) local.value = JSON.parse(JSON.stringify(props.modelValue));
});

const close = () => emit('update:show', false);

const handleSave = async () => {
  // 同步 tiered_avg 的 summerRate = nonSummerRate
  if (local.value.mode === 'tiered_avg') {
    local.value.tiers = local.value.tiers.map(t => ({ ...t, summerRate: t.nonSummerRate }))
  }
  try {
    if (props.roomId) {
      await updateDoc(doc(db, 'rooms', props.roomId), {
        electricitySettings: JSON.parse(JSON.stringify(local.value))
      });
    } else {
      await setDoc(doc(db, 'settings', props.landlordId || 'electricity'), local.value);
    }
    emit('update:modelValue', JSON.parse(JSON.stringify(local.value)));
    close();
  } catch {
    toast.error('設定儲存失敗');
  }
};

const switchToAvgMode = () => {
  // 若目前在 tiered 模式，用夏月/非夏月平均值帶入；否則維持現有費率
  local.value.tiers = local.value.tiers.map(t => {
    const avg = Math.round(((t.nonSummerRate + t.summerRate) / 2) * 1000) / 1000
    return { ...t, nonSummerRate: avg, summerRate: avg }
  })
  local.value.mode = 'tiered_avg'
}

const handleResetRoom = async () => {
  if (!props.roomId) return;
  try {
    await updateDoc(doc(db, 'rooms', props.roomId), { electricitySettings: null });
    emit('reset-room');
    close();
  } catch {
    toast.error('重設失敗');
  }
};
</script>

<style scoped>
.animation-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
</style>
