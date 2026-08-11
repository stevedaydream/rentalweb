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

        <!-- 累進制共用參數（tiered / tiered_avg） -->
        <section v-if="isTieredMode" class="space-y-5 animation-fade-in border-t border-gray-100 dark:border-gray-700 pt-6">
          <h3 class="text-sm font-bold text-gray-500 uppercase">累進制共用參數</h3>

          <div>
            <label for="settings-cycle" class="block text-xs font-bold text-gray-500 mb-1">台電帳期</label>
            <select id="settings-cycle" v-model="local.tieredConfig.cycle" class="form-input text-sm">
              <option value="monthly">單月獨立（每月各自跑累進）</option>
              <option value="bimonthly">雙月累積（第2月用累積度數跑累進後扣掉第1月已收）</option>
            </select>
          </div>

          <div v-if="local.tieredConfig.cycle === 'bimonthly'">
            <label for="settings-cycle-anchor" class="block text-xs font-bold text-gray-500 mb-1">帳期第 1 個月</label>
            <select id="settings-cycle-anchor" v-model="local.tieredConfig.cycleAnchor" class="form-input text-sm">
              <option value="odd">奇數月（帳期為 1-2、3-4、5-6、7-8、9-10、11-12 月）</option>
              <option value="even">偶數月（帳期為 2-3、4-5、6-7、8-9、10-11、12-1 月）</option>
            </select>
          </div>

          <div>
            <label for="settings-day-scaling" class="block text-xs font-bold text-gray-500 mb-1">級距天數比例</label>
            <select id="settings-day-scaling" v-model="local.tieredConfig.dayScaling" class="form-input text-sm">
              <option value="full-month">完整月不縮放，不完整月才按比例（推薦）</option>
              <option value="none">不縮放（永遠用固定級距）</option>
              <option value="legacy">舊制：一律除以 30 天</option>
            </select>
            <p class="text-[11px] text-gray-400 mt-1">
              控制搬入／搬出等不滿一個月的期間，級距額度是否等比例縮小。
            </p>
          </div>

          <div>
            <label for="settings-min-rate" class="block text-xs font-bold text-gray-500 mb-1">保底單價 (元/度)</label>
            <input id="settings-min-rate" v-model.number="local.tieredConfig.minRate" type="number" step="0.1" min="0"
              class="form-input text-sm w-32">
            <p class="text-[11px] text-gray-400 mt-1">
              算出的平均單價低於此值時改用此值計費，填 0 停用。
            </p>
          </div>
        </section>

        <!-- 電表群組管理（僅全域設定） -->
        <section v-if="!roomId" class="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-6">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-sm font-bold text-gray-500 uppercase">電表群組</h3>
              <p class="text-[11px] text-gray-400 mt-0.5">台電計費電表為最上層；級距額度以群組內電表總數（房間＋公共表）均分，公共電費依子群組分攤</p>
            </div>
            <button v-if="!groupEnabled" @click="createGroup"
              class="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">
              建立群組
            </button>
          </div>

          <div v-if="groupLoading" class="text-xs text-gray-400 animate-pulse">群組資料載入中…</div>

          <div v-else-if="groupEnabled" class="space-y-4">
            <!-- 台電總表名稱 -->
            <div>
              <label for="group-name" class="block text-xs font-bold text-gray-500 mb-1">台電總表名稱</label>
              <input id="group-name" v-model="groupName" type="text" class="form-input text-sm" placeholder="如：基隆復興路總表">
            </div>

            <!-- 子群組 -->
            <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-bold text-gray-500 uppercase">子群組（樓層）</p>
                <button @click="addSubGroup" class="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>新增子群組
                </button>
              </div>
              <div v-for="(sg, idx) in subGroups" :key="sg.id" class="flex items-center gap-2 mb-2">
                <input v-model="sg.name" type="text" placeholder="如：4樓" class="form-input py-1.5 text-sm flex-1">
                <button @click="removeSubGroup(idx)" class="p-1 text-red-400 hover:text-red-600" :aria-label="`刪除子群組 ${sg.name}`">
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                </button>
              </div>
              <p v-if="subGroups.length === 0" class="text-xs text-gray-400">尚無子群組，新增後才能綁定房間與公共電表</p>
            </div>

            <!-- 房間綁定 -->
            <div v-if="subGroups.length > 0" class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <p class="text-xs font-bold text-gray-500 uppercase mb-3">房間綁定</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div v-for="room in roomsList" :key="room.id"
                  class="flex items-center justify-between gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                  <span class="text-sm font-medium truncate">{{ room.name }}</span>
                  <select v-model="roomBindings[room.id]" class="form-input py-1 text-xs w-28 shrink-0" :aria-label="`${room.name} 所屬群組`">
                    <option value="">未分組</option>
                    <option v-for="sg in subGroups" :key="sg.id" :value="sg.id">{{ sg.name || '(未命名)' }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 公共電表 -->
            <div v-if="subGroups.length > 0" class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-bold text-gray-500 uppercase">公共電表</p>
                <button @click="addPublicMeterRow" class="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                  <span class="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>新增公共電表
                </button>
              </div>
              <div v-for="(pm, idx) in publicMeters" :key="pm.id"
                class="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-3 mb-2 space-y-2">
                <div class="flex items-center gap-2">
                  <input v-model="pm.name" type="text" placeholder="如：4樓走廊" class="form-input py-1.5 text-sm flex-1">
                  <select v-model="pm.subGroupId" class="form-input py-1.5 text-xs w-28 shrink-0" :aria-label="`${pm.name || '公共電表'} 所屬子群組`">
                    <option v-for="sg in subGroups" :key="sg.id" :value="sg.id">{{ sg.name || '(未命名)' }}</option>
                  </select>
                  <button @click="removePublicMeter(idx)" class="p-1 text-red-400 hover:text-red-600" :aria-label="`刪除公共電表 ${pm.name}`">
                    <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                  </button>
                </div>
                <div class="flex items-center gap-3 flex-wrap">
                  <div class="flex items-center gap-1.5">
                    <label :for="`pm-reading-${pm.id}`" class="text-[11px] font-bold text-gray-500 whitespace-nowrap">起始度數</label>
                    <input :id="`pm-reading-${pm.id}`" v-model.number="pm.lastMeterReading" type="number" class="form-input py-1 text-xs w-24 text-right font-mono">
                  </div>
                  <div class="flex items-center gap-1.5">
                    <label :for="`pm-date-${pm.id}`" class="text-[11px] font-bold text-gray-500 whitespace-nowrap">起始日期</label>
                    <input :id="`pm-date-${pm.id}`" v-model="pm.lastMeterDate" type="date" class="form-input py-1 text-xs font-mono">
                  </div>
                  <label class="flex items-center gap-1.5 cursor-pointer select-none ml-auto">
                    <input type="checkbox" v-model="pm.landlordPays" class="rounded text-blue-600 focus:ring-blue-500">
                    <span class="text-xs font-medium">電費由房東負擔</span>
                  </label>
                </div>
              </div>
              <p v-if="publicMeters.length === 0" class="text-xs text-gray-400">尚無公共電表（走廊燈、洗衣機等共用電力）</p>
            </div>
          </div>

          <p v-else class="text-xs text-gray-400">尚未建立群組：所有房間視為同一個台電總表下的電表（現行行為），無公共電費分攤。</p>
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
import { computed, ref, watch } from 'vue';
import { db } from '../../firebase/config';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { useToastStore } from '../../stores/toast';
import { defaultSettings, normalizeSettings } from './types';
import type { Settings, SubGroup, MeterGroupDoc, PublicMeterDoc } from './types';
import { getMeterGroups, addMeterGroup, updateMeterGroup } from '../../services/meterGroupService';
import { getPublicMeters, addPublicMeter, updatePublicMeter, deletePublicMeter } from '../../services/publicMeterService';
import { getRooms, updateRoom } from '../../services/roomService';
import type { Room } from '../../types/index';

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
  'groups-updated': []; // 群組/公共電表有異動，父層需重載
}>();

const toast = useToastStore();

const local = ref<Settings>(normalizeSettings(JSON.parse(JSON.stringify(props.modelValue)), defaultSettings));

const isTieredMode = computed(() => local.value.mode === 'tiered' || local.value.mode === 'tiered_avg');

// --- 電表群組狀態（僅全域模式） ---
type EditablePublicMeter = PublicMeterDoc & { _isNew?: boolean };
const groupLoading = ref(false);
const groupEnabled = ref(false);
const existingGroup = ref<MeterGroupDoc | null>(null);
const groupName = ref('台電總表');
const subGroups = ref<SubGroup[]>([]);
const roomsList = ref<Room[]>([]);
const roomBindings = ref<Record<string, string>>({});
const originalBindings = ref<Record<string, string>>({});
const publicMeters = ref<EditablePublicMeter[]>([]);
const deletedPublicMeterIds = ref<string[]>([]);

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const loadGroupData = async () => {
  groupLoading.value = true;
  try {
    const [groups, meters, rooms] = await Promise.all([
      getMeterGroups(props.landlordId),
      getPublicMeters(props.landlordId),
      getRooms(props.landlordId),
    ]);
    existingGroup.value = groups[0] ?? null;
    groupEnabled.value = !!existingGroup.value;
    groupName.value = existingGroup.value?.name || '台電總表';
    subGroups.value = existingGroup.value?.subGroups
      ? JSON.parse(JSON.stringify(existingGroup.value.subGroups)) : [];
    roomsList.value = rooms;
    roomBindings.value = Object.fromEntries(rooms.map(r => [r.id, r.subGroupId || '']));
    originalBindings.value = { ...roomBindings.value };
    publicMeters.value = JSON.parse(JSON.stringify(meters));
    deletedPublicMeterIds.value = [];
  } catch (e) {
    console.error('loadGroupData error:', e);
    toast.error('群組資料載入失敗');
  } finally {
    groupLoading.value = false;
  }
};

const createGroup = () => {
  groupEnabled.value = true;
  if (subGroups.value.length === 0) addSubGroup();
};

const addSubGroup = () => {
  subGroups.value.push({ id: genId('sg'), name: '' });
};

const removeSubGroup = (idx: number) => {
  const sg = subGroups.value[idx];
  if (!sg) return;
  if (publicMeters.value.some(pm => pm.subGroupId === sg.id)) {
    toast.error('此子群組仍有公共電表，請先移除公共電表');
    return;
  }
  Object.keys(roomBindings.value).forEach(roomId => {
    if (roomBindings.value[roomId] === sg.id) roomBindings.value[roomId] = '';
  });
  subGroups.value.splice(idx, 1);
};

const addPublicMeterRow = () => {
  const firstSg = subGroups.value[0];
  if (!firstSg) return;
  publicMeters.value.push({
    id: genId('pm'),
    _isNew: true,
    landlordId: props.landlordId,
    groupId: existingGroup.value?.id || '',
    subGroupId: firstSg.id,
    name: '',
    landlordPays: false,
    lastMeterReading: 0,
    lastMeterDate: new Date().toISOString().split('T')[0] || '',
  });
};

const removePublicMeter = (idx: number) => {
  const pm = publicMeters.value[idx];
  if (!pm) return;
  if (!pm._isNew) deletedPublicMeterIds.value.push(pm.id);
  publicMeters.value.splice(idx, 1);
};

const saveGroupData = async () => {
  if (!groupEnabled.value) return;
  if (subGroups.value.some(sg => !sg.name.trim())) {
    throw new Error('子群組名稱不可空白');
  }
  if (publicMeters.value.some(pm => !pm.name.trim())) {
    throw new Error('公共電表名稱不可空白');
  }

  const groupPayload = {
    name: groupName.value.trim() || '台電總表',
    subGroups: JSON.parse(JSON.stringify(subGroups.value)),
  };
  let groupId = existingGroup.value?.id;
  if (!groupId) {
    const refDoc = await addMeterGroup(props.landlordId, groupPayload);
    groupId = refDoc.id;
  } else {
    await updateMeterGroup(groupId, groupPayload);
  }

  const ops: Promise<any>[] = [];
  // 房間綁定異動
  Object.entries(roomBindings.value).forEach(([roomId, sgId]) => {
    if (originalBindings.value[roomId] !== sgId) {
      ops.push(updateRoom(roomId, { subGroupId: sgId }));
    }
  });
  // 公共電表增刪改
  publicMeters.value.forEach(pm => {
    const payload = {
      groupId: groupId!,
      subGroupId: pm.subGroupId,
      name: pm.name.trim(),
      landlordPays: !!pm.landlordPays,
      lastMeterReading: Number(pm.lastMeterReading) || 0,
      lastMeterDate: pm.lastMeterDate || '',
    };
    if (pm._isNew) {
      ops.push(addPublicMeter(props.landlordId, payload));
    } else {
      ops.push(updatePublicMeter(pm.id, payload));
    }
  });
  deletedPublicMeterIds.value.forEach(id => ops.push(deletePublicMeter(id)));
  await Promise.all(ops);
};

watch(() => props.show, (val) => {
  if (val) {
    local.value = normalizeSettings(JSON.parse(JSON.stringify(props.modelValue)), defaultSettings);
    if (!props.roomId) loadGroupData();
  }
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
      await saveGroupData();
      emit('groups-updated');
    }
    emit('update:modelValue', JSON.parse(JSON.stringify(local.value)));
    close();
  } catch (e: any) {
    console.error('MeterSettings save error:', e);
    toast.error(e?.message === '子群組名稱不可空白' || e?.message === '公共電表名稱不可空白'
      ? e.message : '設定儲存失敗');
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
