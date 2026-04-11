<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-red-500">exit_to_app</span>
            辦理退租
          </h2>
          <button @click="$emit('close')" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span class="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>

        <!-- Step indicator -->
        <div class="px-6 py-3 flex items-center border-b border-gray-50 dark:border-gray-800 shrink-0">
          <template v-for="(s, i) in steps" :key="s.id">
            <div class="flex items-center gap-1.5 shrink-0">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                :class="step > s.id ? 'bg-green-500 text-white' : step === s.id ? 'bg-gold-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'">
                <span v-if="step > s.id" class="material-symbols-outlined text-[14px]">check</span>
                <span v-else>{{ s.id }}</span>
              </div>
              <span class="text-xs font-medium hidden sm:block"
                :class="step === s.id ? 'text-gold-600 dark:text-gold-400' : 'text-text-secondary-light'">{{ s.label }}</span>
            </div>
            <div v-if="i < steps.length - 1" class="flex-1 h-0.5 mx-2"
              :class="step > s.id ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'"></div>
          </template>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-5">

          <!-- ── STEP 1: 退租資訊 ── -->
          <template v-if="step === 1">
            <div class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl space-y-2.5 text-sm">
              <div class="flex justify-between">
                <span class="text-text-secondary-light">租客</span>
                <span class="font-semibold">{{ tenant.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-secondary-light">房間</span>
                <span class="font-semibold">{{ tenant.room }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-secondary-light">租約期間</span>
                <span class="font-semibold text-right">{{ tenant.leaseStart || '—' }} ~ {{ tenant.leaseEnd || '—' }}</span>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">實際退租日</label>
              <input v-model="moveOutDate" type="date" class="form-input" />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">退租原因</label>
              <select v-model="moveOutReason" class="form-input">
                <option value="expired">到期退租</option>
                <option value="early">提前退租</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div v-if="loadingData" class="flex items-center gap-2 text-sm text-text-secondary-light py-2">
              <span class="material-symbols-outlined animate-spin text-[18px]">sync</span>
              載入資料中...
            </div>

            <div v-else-if="unpaidBillCount > 0"
              class="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm">
              <span class="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5">warning</span>
              <p class="text-amber-700 dark:text-amber-300">
                尚有 <strong>{{ unpaidBillCount }} 筆</strong>未收帳單，合計
                <strong>NT$ {{ unpaidBillAmount.toLocaleString() }}</strong>，退租後仍可手動結清。
              </p>
            </div>
          </template>

          <!-- ── STEP 2: 費用結清 ── -->
          <template v-if="step === 2">

            <!-- Paid deposits -->
            <div class="space-y-2">
              <p class="text-xs font-bold text-text-secondary-light uppercase tracking-wide">已收押金</p>
              <div class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl text-sm space-y-2">
                <div v-if="paidDeposits.length === 0" class="text-text-secondary-light text-xs">無已收押金記錄</div>
                <div v-for="dep in paidDeposits" :key="dep.label" class="flex justify-between">
                  <span class="text-text-secondary-light">{{ dep.label }}</span>
                  <span class="font-medium text-green-600 dark:text-green-400">NT$ {{ dep.amount.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-semibold">
                  <span>押金合計</span>
                  <span>NT$ {{ totalDepositPaid.toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- Electricity settlement -->
            <div class="space-y-2">
              <p class="text-xs font-bold text-text-secondary-light uppercase tracking-wide">電費結清</p>
              <div class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl text-sm space-y-3">
                <div class="flex justify-between">
                  <span class="text-text-secondary-light">基準度數（上次）</span>
                  <span class="font-medium">{{ lastMeterReading !== null ? lastMeterReading + ' 度' : '無資料' }}</span>
                </div>
                <div>
                  <label class="block text-text-secondary-light mb-1">退租時電表度數</label>
                  <input v-model.number="finalMeterReading" type="number" min="0" class="form-input"
                    placeholder="請輸入電表讀數（可留空）" />
                </div>
                <template v-if="electricityUsage !== null && finalMeterReading !== null">
                  <div class="flex justify-between text-text-secondary-light">
                    <span>本期用電</span>
                    <span class="font-medium text-text-primary-light dark:text-text-primary-dark">{{ electricityUsage }} 度</span>
                  </div>
                  <!-- Fixed mode: auto calc -->
                  <template v-if="elecMode === 'fixed'">
                    <div class="flex justify-between font-medium">
                      <span class="text-text-secondary-light">電費（固定 {{ fixedRate }} 元/度）</span>
                      <span class="text-orange-600">NT$ {{ autoElecAmount.toLocaleString() }}</span>
                    </div>
                    <label class="flex items-center gap-2 text-xs text-text-secondary-light cursor-pointer">
                      <input type="checkbox" v-model="overrideElec" class="rounded" />
                      手動調整電費金額
                    </label>
                    <input v-if="overrideElec" v-model.number="electricityAmount" type="number" min="0" class="form-input"
                      placeholder="手動輸入電費" />
                  </template>
                  <!-- Non-fixed: manual only -->
                  <template v-else>
                    <div class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                      計費模式：{{ elecModeLabel }}，請手動輸入電費金額
                    </div>
                    <input v-model.number="electricityAmount" type="number" min="0" class="form-input"
                      placeholder="電費金額（NT$）" />
                  </template>
                </template>
                <div v-else class="text-xs text-text-secondary-light">
                  輸入電表度數後自動計算，或留空不計電費
                </div>
              </div>
            </div>

            <!-- Water settlement -->
            <div class="space-y-2">
              <p class="text-xs font-bold text-text-secondary-light uppercase tracking-wide">水費結清（選填）</p>
              <div class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl">
                <input v-model.number="waterAmount" type="number" min="0" class="form-input"
                  placeholder="若無水費欠款請留空" />
              </div>
            </div>

            <!-- Deductions -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-bold text-text-secondary-light uppercase tracking-wide">損壞扣款（選填）</p>
                <button @click="addDeduction"
                  class="text-xs text-gold-600 hover:text-gold-700 font-medium flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">add</span>新增
                </button>
              </div>
              <div v-if="deductions.length > 0" class="space-y-2">
                <div v-for="(d, i) in deductions" :key="i" class="flex gap-2 items-center">
                  <input v-model="d.label" type="text" class="form-input flex-1 text-sm" placeholder="說明（如：牆壁修繕）" />
                  <input v-model.number="d.amount" type="number" min="0" class="form-input w-28 text-sm" placeholder="金額" />
                  <button @click="deductions.splice(i, 1)" class="text-red-400 hover:text-red-600 shrink-0">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Refund calculation -->
            <div class="p-4 bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700 rounded-xl space-y-2 text-sm">
              <p class="text-xs font-bold text-gold-700 dark:text-gold-300 uppercase tracking-wide mb-2">應退押金計算</p>
              <div class="flex justify-between text-text-secondary-light">
                <span>押金合計</span>
                <span>NT$ {{ totalDepositPaid.toLocaleString() }}</span>
              </div>
              <div v-if="effectiveElecAmount > 0" class="flex justify-between text-orange-600 dark:text-orange-400">
                <span>－ 電費</span>
                <span>NT$ {{ effectiveElecAmount.toLocaleString() }}</span>
              </div>
              <div v-if="(waterAmount || 0) > 0" class="flex justify-between text-orange-600 dark:text-orange-400">
                <span>－ 水費</span>
                <span>NT$ {{ (waterAmount || 0).toLocaleString() }}</span>
              </div>
              <div v-for="d in deductions.filter(x => (x.amount || 0) > 0)" :key="d.label"
                class="flex justify-between text-red-600 dark:text-red-400">
                <span>－ {{ d.label || '扣款' }}</span>
                <span>NT$ {{ d.amount.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between font-bold text-base pt-2 border-t border-gold-200 dark:border-gold-700">
                <span>應退金額</span>
                <span class="text-gold-700 dark:text-gold-300">NT$ {{ computedRefund.toLocaleString() }}</span>
              </div>
              <label class="flex items-center gap-2 text-xs text-text-secondary-light cursor-pointer pt-1">
                <input type="checkbox" v-model="overrideRefund" class="rounded" />
                手動調整退還金額
              </label>
              <input v-if="overrideRefund" v-model.number="depositRefundOverride" type="number" min="0" class="form-input" />
            </div>
          </template>

          <!-- ── STEP 3: 確認執行 ── -->
          <template v-if="step === 3">
            <div class="space-y-4 text-sm">
              <p class="text-xs font-bold text-text-secondary-light uppercase tracking-wide">退租摘要</p>
              <div class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl space-y-2.5">
                <div class="flex justify-between">
                  <span class="text-text-secondary-light">租客</span>
                  <span class="font-semibold">{{ tenant.name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary-light">退租房間</span>
                  <span class="font-semibold">{{ tenant.room }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary-light">退租日期</span>
                  <span class="font-semibold">{{ moveOutDate }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary-light">退租原因</span>
                  <span>{{ moveOutReasonLabel }}</span>
                </div>
                <template v-if="effectiveElecAmount > 0">
                  <div class="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>電費結清</span>
                    <span>NT$ {{ effectiveElecAmount.toLocaleString() }}</span>
                  </div>
                </template>
                <template v-if="(waterAmount || 0) > 0">
                  <div class="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>水費結清</span>
                    <span>NT$ {{ (waterAmount || 0).toLocaleString() }}</span>
                  </div>
                </template>
                <div v-for="d in deductions.filter(x => (x.amount || 0) > 0)" :key="d.label"
                  class="flex justify-between text-red-600 dark:text-red-400">
                  <span>{{ d.label }}</span>
                  <span>NT$ {{ d.amount.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>應退押金</span>
                  <span class="text-gold-700 dark:text-gold-400">NT$ {{ finalRefundAmount.toLocaleString() }}</span>
                </div>
                <div v-if="unpaidBillCount > 0" class="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>未收帳單</span>
                  <span>{{ unpaidBillCount }} 筆（NT$ {{ unpaidBillAmount.toLocaleString() }}）</span>
                </div>
              </div>

              <div class="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl">
                <p class="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2">確認後將自動執行：</p>
                <ul class="space-y-1.5 text-xs text-blue-700 dark:text-blue-300">
                  <li class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                    合約標記為「已終止」
                  </li>
                  <li class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                    房間改回「空房」，最終度數設為下個租客電費基準
                  </li>
                  <li class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                    新增押金退還帳務記錄
                  </li>
                  <li class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                    清除租客租約資料（保留歷史檔案）
                  </li>
                  <li class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                    建立退租紀錄存檔
                  </li>
                </ul>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">備註（選填）</label>
                <textarea v-model="notes" class="form-input min-h-[60px]"
                  placeholder="點交說明、特殊事項等..."></textarea>
              </div>
            </div>
          </template>

        </div>

        <!-- Footer actions -->
        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 shrink-0">
          <button v-if="step > 1" @click="step--" :disabled="isExecuting"
            class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
            ← 上一步
          </button>
          <button v-if="step < 3" @click="nextStep" :disabled="loadingData"
            class="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors disabled:opacity-50 shadow-md">
            下一步 →
          </button>
          <button v-if="step === 3" @click="execute" :disabled="isExecuting"
            class="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50 shadow-md flex items-center justify-center gap-2">
            <span v-if="isExecuting" class="material-symbols-outlined animate-spin text-[16px]">sync</span>
            {{ isExecuting ? '處理中...' : '確認退租' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { db } from '../firebase/config';
import { useToastStore } from '../stores/toast';
import {
  collection, query, where, getDocs, getDoc, addDoc, updateDoc,
  doc, serverTimestamp, orderBy, limit,
} from 'firebase/firestore';

interface Tenant {
  id: string;
  name: string;
  room: string;
  leaseStart?: string;
  leaseEnd?: string;
  rent?: number;
  contractId?: string;
  uid?: string;
}

interface DepositItem {
  label: string;
  amount: number;
  status: 'paid' | 'unpaid';
}

const props = defineProps<{ tenant: Tenant; landlordId: string }>();
const emit = defineEmits<{ close: []; completed: [] }>();
const toast = useToastStore();

// ── Steps ──
const steps = [
  { id: 1, label: '退租資訊' },
  { id: 2, label: '費用結清' },
  { id: 3, label: '確認執行' },
];
const step = ref(1);

// ── Step 1 ──
const moveOutDate = ref(new Date().toISOString().split('T')[0] as string);
const moveOutReason = ref<'expired' | 'early' | 'other'>('expired');
const moveOutReasonLabel = computed(() =>
  ({ expired: '到期退租', early: '提前退租', other: '其他' }[moveOutReason.value])
);
const loadingData = ref(true);
const unpaidBillCount = ref(0);
const unpaidBillAmount = ref(0);

// ── Step 2: Deposits ──
const paidDeposits = ref<DepositItem[]>([]);
const totalDepositPaid = computed(() => paidDeposits.value.reduce((s, d) => s + d.amount, 0));

// ── Step 2: Electricity ──
const lastMeterReading = ref<number | null>(null);
const finalMeterReading = ref<number | null>(null);
const electricityUsage = computed(() => {
  if (finalMeterReading.value === null || lastMeterReading.value === null) return null;
  return Math.max(0, finalMeterReading.value - lastMeterReading.value);
});
const elecMode = ref('fixed');
const elecModeLabel = computed(() =>
  ({ fixed: '固定費率', tiered: '獨立累進費率', bill_share: '帳單分攤制' }[elecMode.value] ?? elecMode.value)
);
const fixedRate = ref(5);
const autoElecAmount = computed(() => {
  if (elecMode.value === 'fixed' && electricityUsage.value !== null)
    return Math.round(electricityUsage.value * fixedRate.value);
  return 0;
});
const overrideElec = ref(false);
const electricityAmount = ref(0);
const effectiveElecAmount = computed(() => {
  if (elecMode.value === 'fixed' && !overrideElec.value) return autoElecAmount.value;
  return electricityAmount.value || 0;
});

// ── Step 2: Water & Deductions ──
const waterAmount = ref(0);
const deductions = ref<{ label: string; amount: number }[]>([]);
const addDeduction = () => deductions.value.push({ label: '', amount: 0 });
const totalDeductions = computed(() => deductions.value.reduce((s, d) => s + (d.amount || 0), 0));

// ── Step 2: Refund ──
const computedRefund = computed(() =>
  Math.max(0, totalDepositPaid.value - effectiveElecAmount.value - (waterAmount.value || 0) - totalDeductions.value)
);
const overrideRefund = ref(false);
const depositRefundOverride = ref(0);
const finalRefundAmount = computed(() =>
  overrideRefund.value ? (depositRefundOverride.value || 0) : computedRefund.value
);

// ── Step 3 ──
const notes = ref('');
const isExecuting = ref(false);

// ── Data loading ──
onMounted(async () => {
  try {
    await Promise.all([loadSettings(), loadUnpaidBills(), loadDeposits(), loadLastMeterReading()]);
  } catch (e) {
    console.warn('MoveOutWizard load error:', e);
  } finally {
    loadingData.value = false;
  }
});

const loadSettings = async () => {
  try {
    const snap = await getDoc(doc(db, 'settings', props.landlordId));
    if (snap.exists()) {
      const s = snap.data();
      elecMode.value = s.mode || 'fixed';
      fixedRate.value = s.fixedRate || 5;
    }
  } catch { /* settings may not exist */ }
};

const loadUnpaidBills = async () => {
  const snap = await getDocs(query(
    collection(db, 'bills'),
    where('landlordId', '==', props.landlordId),
    where('relatedTenantDocId', '==', props.tenant.id),
    where('status', 'in', ['pending', 'overdue']),
    where('type', '==', 'income'),
  ));
  unpaidBillCount.value = snap.size;
  unpaidBillAmount.value = snap.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0);
};

const loadDeposits = async () => {
  if (!props.tenant.contractId) return;
  const snap = await getDoc(doc(db, 'contracts', props.tenant.contractId));
  if (!snap.exists()) return;
  const deps = (snap.data().deposits || []) as DepositItem[];
  paidDeposits.value = deps.filter(d => d.status === 'paid');
};

const loadLastMeterReading = async () => {
  // Try rooms document first (fastest path)
  const roomSnap = await getDocs(query(
    collection(db, 'rooms'),
    where('landlordId', '==', props.landlordId),
    where('name', '==', props.tenant.room),
  ));
  if (!roomSnap.empty) {
    const rd = roomSnap.docs[0]!.data();
    if (rd.lastMeterReading !== undefined) {
      lastMeterReading.value = rd.lastMeterReading;
      return;
    }
  }
  // Fallback: latest meter_readings record
  const readSnap = await getDocs(query(
    collection(db, 'meter_readings'),
    where('landlordId', '==', props.landlordId),
    where('roomName', '==', props.tenant.room),
    orderBy('yearMonth', 'desc'),
    limit(1),
  ));
  if (!readSnap.empty) {
    lastMeterReading.value = readSnap.docs[0]!.data().currentReading ?? null;
  }
};

// ── Navigation ──
const nextStep = () => {
  if (step.value === 1 && !moveOutDate.value) {
    toast.warning('請選擇退租日期');
    return;
  }
  step.value++;
};

// ── Execute ──
const execute = async () => {
  isExecuting.value = true;
  try {
    const today = new Date().toISOString().split('T')[0] as string;

    const moveOutPayload = {
      moveOutDate: moveOutDate.value,
      moveOutReason: moveOutReason.value,
      finalMeterReading: finalMeterReading.value,
      electricitySettlement: effectiveElecAmount.value,
      waterSettlement: waterAmount.value || 0,
      deductions: deductions.value.filter(d => (d.amount || 0) > 0),
      depositPaid: totalDepositPaid.value,
      depositRefund: finalRefundAmount.value,
      notes: notes.value,
    };

    // 1. Terminate contract
    if (props.tenant.contractId) {
      await updateDoc(doc(db, 'contracts', props.tenant.contractId), {
        status: 'terminated',
        ...moveOutPayload,
        terminatedAt: serverTimestamp(),
      });
    }

    // 2. Update tenant doc: clear lease, mark historical
    await updateDoc(doc(db, 'tenants', props.tenant.id), {
      isHistorical: true,
      room: '',
      leaseStart: '',
      leaseEnd: '',
      rent: 0,
      contractId: '',
      moveOutSummary: {
        room: props.tenant.room,
        leaseStart: props.tenant.leaseStart || '',
        leaseEnd: props.tenant.leaseEnd || '',
        moveOutDate: moveOutDate.value,
        moveOutReason: moveOutReason.value,
        depositRefund: finalRefundAmount.value,
        contractId: props.tenant.contractId || '',
      },
      updatedAt: serverTimestamp(),
    });

    // 3. Reset room to vacant, store final meter reading as baseline
    const roomSnap = await getDocs(query(
      collection(db, 'rooms'),
      where('landlordId', '==', props.landlordId),
      where('name', '==', props.tenant.room),
    ));
    if (!roomSnap.empty) {
      const roomUpdate: Record<string, any> = {
        status: 'vacant',
        tenantName: '',
        leaseEnd: '',
      };
      if (finalMeterReading.value !== null) {
        roomUpdate.lastMeterReading = finalMeterReading.value;
        roomUpdate.lastMeterDate = moveOutDate.value;
      }
      await updateDoc(roomSnap.docs[0]!.ref, roomUpdate);
    }

    // 4. Create deposit refund bill (expense)
    if (finalRefundAmount.value > 0) {
      await addDoc(collection(db, 'bills'), {
        landlordId: props.landlordId,
        tenantId: props.tenant.uid || null,
        relatedTenantDocId: props.tenant.id,
        relatedContractId: props.tenant.contractId || null,
        date: today,
        type: 'expense',
        category: '押金退還',
        description: `${props.tenant.name} 退租押金退還`,
        amount: finalRefundAmount.value,
        status: 'completed',
        createdAt: serverTimestamp(),
      });
    }

    // 5. Create moveOutRecord (permanent summary)
    await addDoc(collection(db, 'moveOutRecords'), {
      landlordId: props.landlordId,
      tenantDocId: props.tenant.id,
      contractId: props.tenant.contractId || null,
      tenantName: props.tenant.name,
      room: props.tenant.room,
      leaseStart: props.tenant.leaseStart || '',
      leaseEnd: props.tenant.leaseEnd || '',
      ...moveOutPayload,
      createdAt: serverTimestamp(),
    });

    toast.success(`${props.tenant.name} 退租手續已完成`);
    emit('completed');
  } catch (e) {
    console.error('MoveOutWizard execute error:', e);
    toast.error('退租處理失敗，請稍後再試');
  } finally {
    isExecuting.value = false;
  }
};
</script>
