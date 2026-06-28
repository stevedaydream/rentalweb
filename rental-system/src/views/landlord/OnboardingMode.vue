<template>
  <div class="fixed inset-0 z-[100] bg-surface-light dark:bg-background-dark flex">

    <!-- ── Sidebar：步驟導覽 ── -->
    <aside class="w-60 shrink-0 bg-white dark:bg-card-dark border-r border-gray-100 dark:border-gray-800 flex flex-col">
      <div class="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <p class="text-xs text-text-secondary-light tracking-wide">租客上線</p>
        <h1 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">簽約流程</h1>
      </div>
      <nav class="flex-1 p-3 space-y-1">
        <button
          v-for="(s, i) in steps" :key="s.key"
          @click="goToStep(i + 1)"
          :disabled="i + 1 > maxReached"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
          :class="step === i + 1
            ? 'bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-300 font-bold'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-text-secondary-light'"
        >
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            :class="stepDone(s.key) ? 'bg-green-500 text-white'
              : isSkipped(s.key) ? 'bg-gray-300 text-white dark:bg-gray-600'
              : step === i + 1 ? 'bg-gold-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400'">
            <span v-if="stepDone(s.key)" class="material-symbols-outlined text-[15px]">check</span>
            <span v-else-if="isSkipped(s.key)" class="material-symbols-outlined text-[15px]">remove</span>
            <span v-else>{{ i + 1 }}</span>
          </span>
          <span class="flex-1">{{ s.label }}</span>
          <span v-if="!s.required" class="text-[10px] text-text-secondary-light">可略過</span>
        </button>
      </nav>
      <div class="p-3 border-t border-gray-100 dark:border-gray-800">
        <button @click="saveAndExit" :disabled="saving"
          class="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
          <span class="material-symbols-outlined text-[18px]">logout</span>
          {{ saving ? '儲存中…' : '儲存並退出' }}
        </button>
      </div>
    </aside>

    <!-- ── 主區 ── -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header class="h-16 shrink-0 px-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-card-dark">
        <div class="flex items-center gap-3 min-w-0">
          <span class="material-symbols-outlined text-gold-500">{{ currentStep.icon }}</span>
          <div class="min-w-0">
            <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark truncate">
              {{ currentStep.label }}<span v-if="form.name" class="text-text-secondary-light font-normal"> · {{ form.name }}</span>
            </h2>
            <p class="text-xs text-text-secondary-light">第 {{ step }} / {{ steps.length }} 步</p>
          </div>
        </div>
        <button @click="saveAndExit" :disabled="saving" aria-label="儲存並退出"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span class="material-symbols-outlined text-gray-500">close</span>
        </button>
      </header>

      <!-- Body -->
      <main class="flex-1 overflow-y-auto p-6 md:p-10">
        <div class="max-w-2xl mx-auto">

          <!-- ① 建檔 -->
          <section v-if="step === 1" class="space-y-5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">租客姓名 *</label>
                <input v-model="form.name" type="text" class="form-input" placeholder="承租人姓名" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">聯絡電話 *</label>
                <input v-model="form.phone" type="tel" class="form-input" placeholder="09xx-xxx-xxx" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">證件號碼（身分證／居留證／護照）*</label>
                <div class="flex gap-2">
                  <input v-model="form.idNumber" type="text" class="form-input flex-1" placeholder="身分證 / 居留證 / 護照號" />
                  <button type="button" @click="captureIdPhoto" title="拍照辨識（即將推出）"
                    class="shrink-0 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5 transition-colors">
                    <span class="material-symbols-outlined text-[18px]">photo_camera</span>
                    <span class="text-xs font-medium hidden sm:inline">拍照</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input v-model="form.email" type="email" class="form-input" placeholder="選填" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">緊急聯絡人</label>
                <input v-model="form.emergencyContact" type="text" class="form-input" placeholder="選填" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">承租房源 *</label>
                <select v-model="form.room" @change="onRoomSelect" class="form-input">
                  <option value="">請選擇房源</option>
                  <option v-for="r in availableRooms" :key="r.name" :value="r.name">{{ r.name }}</option>
                </select>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">租期（年）</label>
                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    v-for="opt in durationPresets" :key="opt" type="button"
                    @click="form.duration = opt"
                    class="px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors"
                    :class="form.duration === opt
                      ? 'bg-gold-500 text-white border-gold-500'
                      : 'border-gray-200 dark:border-gray-700 text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800'"
                  >{{ opt }} 年</button>
                  <input v-model.number="form.duration" type="number" step="0.5" min="0.5" class="form-input w-24" />
                  <span class="text-xs text-text-secondary-light">可自訂，0.5 為單位</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">租期起</label>
                <input v-model="form.leaseStart" type="date" class="form-input" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">租賃到期日（自動）</label>
                <input :value="computedLeaseEnd" type="date" readonly
                  class="form-input bg-gray-50 dark:bg-gray-800 text-gray-500" />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">月租金</label>
                <input v-model.number="form.rent" @input="applyDeposit" type="number" min="0" class="form-input" placeholder="選房源自動帶入，可調整" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">押金</label>
                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    v-for="m in depositMonthPresets" :key="m" type="button"
                    @click="setDepositMonths(m)"
                    class="px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors"
                    :class="form.depositMonths === m
                      ? 'bg-gold-500 text-white border-gold-500'
                      : 'border-gray-200 dark:border-gray-700 text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800'"
                  >{{ m }} 個月</button>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">NT$</span>
                    <input v-model.number="form.deposit" type="number" min="0" class="form-input w-36 pl-10" />
                  </div>
                  <span class="text-xs text-text-secondary-light">＝ 月租 × {{ form.depositMonths }} 個月，可自訂</span>
                </div>
              </div>
            </div>
            <p class="text-xs text-text-secondary-light">＊為必填。儲存後即建立租客檔案，可隨時退出、稍後從「繼續上線」接續。</p>
          </section>

          <!-- ② 簽約 -->
          <section v-else-if="currentStep.key === 'contract'">
            <ContractForm
              v-if="tenantId"
              :prefill="contractPrefill"
              :landlord-id="authStore.effectiveUid"
              @saved="onContractSaved"
            />
            <div v-else class="text-center py-16 text-text-secondary-light">請先於 ①建檔 建立租客，再進行簽約。</div>
          </section>

          <!-- ③ 收押金 -->
          <section v-else-if="currentStep.key === 'receipt'">
            <DepositReceiptForm
              v-if="tenantId"
              :prefill="receiptPrefill"
              :landlord-id="authStore.effectiveUid"
              @saved="onReceiptSaved"
            />
            <div v-else class="text-center py-16 text-text-secondary-light">請先於 ①建檔 建立租客。</div>
            <p v-if="completedKeys.receipt" class="mt-3 text-sm text-green-600 dark:text-green-400 text-center font-medium">押金收據已產生 ✓，可按「下一步」繼續。</p>
          </section>

          <!-- ④ 入住點交 -->
          <section v-else class="flex flex-col items-center justify-center text-center py-12 gap-4">
            <span class="material-symbols-outlined text-[56px]" :class="completedKeys.inspection ? 'text-green-500' : 'text-gold-300'">checklist</span>
            <div>
              <h3 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">入住點交</h3>
              <p class="text-sm text-text-secondary-light mt-1 max-w-sm">逐項勾選房間配備與入住狀況，退租時依此點交計算賠償。</p>
            </div>
            <button @click="showInspection = true" :disabled="!tenantId"
              class="px-5 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors disabled:opacity-50 flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px]">checklist</span>
              {{ completedKeys.inspection ? '查看 / 編輯入住點交' : '建立入住點交' }}
            </button>
            <p v-if="completedKeys.inspection" class="text-sm text-green-600 dark:text-green-400 font-medium">入住點交已完成 ✓</p>
          </section>
        </div>
      </main>

      <!-- Footer -->
      <footer class="shrink-0 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-card-dark flex items-center justify-between gap-3">
        <button v-if="step > 1" @click="prev" :disabled="saving"
          class="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
          ← 上一步
        </button>
        <span v-else></span>
        <div class="flex items-center gap-3">
          <button v-if="!currentStep.required" @click="skip" :disabled="saving"
            class="px-5 py-2.5 rounded-xl text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
            略過此步
          </button>
          <button v-if="currentStep.key !== 'contract' || completedKeys.contract" @click="next" :disabled="saving"
            class="px-6 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors disabled:opacity-50 shadow-md flex items-center gap-2">
            <span v-if="saving" class="material-symbols-outlined animate-spin text-[16px]">sync</span>
            {{ step === steps.length ? '完成上線' : '下一步 →' }}
          </button>
        </div>
      </footer>
    </div>

    <MoveInInspectionModal
      v-if="showInspection && tenantId"
      :tenant="inspectionTenant"
      :landlord-id="authStore.effectiveUid"
      @close="showInspection = false"
      @saved="onInspectionSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import {
  collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { ONBOARDING_STEPS, type OnboardingStepKey, type OnboardingState } from '../../utils/onboarding';
import ContractForm from '../../components/ContractForm.vue';
import DepositReceiptForm from '../../components/DepositReceiptForm.vue';
import MoveInInspectionModal from '../../components/MoveInInspectionModal.vue';
import type { InspectionItem } from '../../utils/inventory';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToastStore();

const steps = ONBOARDING_STEPS;
const step = ref(1);
const tenantId = ref<string>((route.params.tenantId as string) || '');
const saving = ref(false);
const availableRooms = ref<{ name: string; rent: number }[]>([]);
const skipped = ref<OnboardingStepKey[]>([]);
const completedKeys = ref<Record<string, boolean>>({});

const form = ref<any>({
  name: '', phone: '', idNumber: '', email: '', emergencyContact: '',
  room: '', leaseStart: new Date().toISOString().split('T')[0], duration: 1,
  rent: 0, depositMonths: 2, deposit: 0,
});

// 押金 = 月租 × 月數（房源選取 / 改租金 / 換月數時自動重算，仍可手動微調）
const depositMonthPresets = [1, 2, 3];
const applyDeposit = () => {
  form.value.deposit = Math.round((Number(form.value.rent) || 0) * (Number(form.value.depositMonths) || 0));
};
const setDepositMonths = (m: number) => { form.value.depositMonths = m; applyDeposit(); };
// 選房源 → 帶入月租金 → 連動押金
const onRoomSelect = () => {
  const r = availableRooms.value.find(x => x.name === form.value.room);
  if (r && r.rent) { form.value.rent = r.rent; applyDeposit(); }
};

const durationPresets = [0.5, 1, 2];
// 訖日 = 起 + N 年（含半年）− 1 天（與收據押金模式一致）
const computedLeaseEnd = computed(() => {
  if (!form.value.leaseStart) return '';
  const d = new Date(form.value.leaseStart);
  const years = Number(form.value.duration) || 1;
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  d.setFullYear(d.getFullYear() + whole);
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
});

// 預留：拍證件 → 朦板對齊 → OCR 辨識姓名/證號（後續升級）
const captureIdPhoto = () => {
  toast.warning('拍照辨識功能開發中，敬請期待');
};

const currentStep = computed(() => steps[step.value - 1]!);
const maxReached = ref(1);

const isSkipped = (k: OnboardingStepKey) => skipped.value.includes(k);
const stepDone = (k: OnboardingStepKey) => !!completedKeys.value[k];

// ②簽約：帶入①建檔資料；簽署完成 → 設 contractId、標記完成、進下一步
const contractPrefill = computed(() => ({
  tenant: form.value.name,
  tenantId: form.value.idNumber,
  tenantPhone: form.value.phone,
  roomNo: form.value.room,
  rentfee: form.value.rent,
  startDate: form.value.leaseStart,
  duration: form.value.duration,
}));
const onContractSaved = async (contractId: string) => {
  if (tenantId.value) {
    try { await updateDoc(doc(db, 'tenants', tenantId.value), { contractId }); } catch (e) { console.warn('set contractId failed', e); }
  }
  completedKeys.value.contract = true;
  await next();
};

// ③收押金
const receiptPrefill = computed(() => ({
  roomNo: form.value.room,
  tenant: form.value.name,
  rentfee: form.value.rent,
  deposit: form.value.deposit,
  duration: form.value.duration,
  startDate: form.value.leaseStart,
}));
const onReceiptSaved = () => { completedKeys.value.receipt = true; };

// ④入住點交（複用 MoveInInspectionModal）
const showInspection = ref(false);
const inspectionTenant = computed(() => ({ id: tenantId.value, name: form.value.name, room: form.value.room }));
const onInspectionSaved = (_items: InspectionItem[]) => {
  completedKeys.value.inspection = true;
  showInspection.value = false;
};

onMounted(async () => {
  await loadRooms();
  if (tenantId.value) await loadTenant();
  const qStep = Number(route.query.step);
  if (qStep >= 1 && qStep <= steps.length) step.value = qStep;
  maxReached.value = Math.max(maxReached.value, step.value);
});

const loadRooms = async () => {
  try {
    const snap = await getDocs(query(
      collection(db, 'rooms'),
      where('landlordId', '==', authStore.effectiveUid),
    ));
    availableRooms.value = snap.docs
      .map(d => d.data())
      .filter(r => r.status === 'vacant' || r.name === form.value.room)
      .map(r => ({ name: r.name as string, rent: Number(r.rent) || 0 }));
  } catch (e) {
    console.warn('載入房源失敗:', e);
  }
};

const loadTenant = async () => {
  try {
    const snap = await getDoc(doc(db, 'tenants', tenantId.value));
    if (!snap.exists()) return;
    const t: any = snap.data();
    const ob: OnboardingState | undefined = t.onboarding;
    // 既有欄位 + 進行中草稿還原
    form.value = {
      name: t.name || '', phone: t.phone || '', idNumber: t.idNumber || '', email: t.email || '',
      emergencyContact: t.emergencyContact || '', room: t.room || '',
      leaseStart: t.leaseStart || new Date().toISOString().split('T')[0],
      duration: t.leaseDuration || 1,
      rent: t.rent || 0, depositMonths: t.depositMonths || 2, deposit: t.deposit || 0,
      ...(ob?.draft || {}),
    };
    skipped.value = ob?.skipped || [];
    completedKeys.value = {
      profile: true,
      contract: !!t.contractId,
      inspection: !!t.moveInInspection,
    };
    if (ob?.step) { step.value = ob.step; maxReached.value = Math.max(maxReached.value, ob.step); }
  } catch (e) {
    console.warn('載入租客失敗:', e);
  }
};

const buildOnboarding = (status: 'in_progress' | 'completed'): OnboardingState => ({
  status,
  step: step.value,
  skipped: skipped.value,
  draft: { ...form.value },
  updatedAt: serverTimestamp(),
});

// 建檔：建立或更新租客檔案
const saveProfile = async (): Promise<boolean> => {
  if (!form.value.name || !form.value.phone) { toast.warning('請填寫姓名與電話'); return false; }
  if (!form.value.idNumber) { toast.warning('請填寫證件號碼（身分證／居留證／護照）'); return false; }
  if (!form.value.room) { toast.warning('請選擇承租房源'); return false; }
  const profile = {
    name: form.value.name, phone: form.value.phone, idNumber: form.value.idNumber,
    email: form.value.email || '', emergencyContact: form.value.emergencyContact || '',
    room: form.value.room, leaseStart: form.value.leaseStart || '', leaseEnd: computedLeaseEnd.value,
    leaseDuration: Number(form.value.duration) || 1,
    rent: Number(form.value.rent) || 0,
    deposit: Number(form.value.deposit) || 0, depositMonths: Number(form.value.depositMonths) || 2,
    landlordId: authStore.effectiveUid, updatedAt: serverTimestamp(),
  };
  if (tenantId.value) {
    await updateDoc(doc(db, 'tenants', tenantId.value), { ...profile });
  } else {
    const docRef = await addDoc(collection(db, 'tenants'), {
      ...profile, paymentStatus: 'normal', createdAt: serverTimestamp(),
    });
    tenantId.value = docRef.id;
  }
  completedKeys.value.profile = true;
  return true;
};

// 持久化 onboarding 狀態（需先有 tenantId）
const persistOnboarding = async (status: 'in_progress' | 'completed') => {
  if (!tenantId.value) return;
  await updateDoc(doc(db, 'tenants', tenantId.value), { onboarding: buildOnboarding(status) });
};

const next = async () => {
  saving.value = true;
  try {
    if (step.value === 1) {
      if (!(await saveProfile())) return;
    }
    if (step.value === steps.length) {
      await persistOnboarding('completed');
      toast.success('租客上線完成！');
      router.push({ name: 'TenantList' });
      return;
    }
    step.value++;
    maxReached.value = Math.max(maxReached.value, step.value);
    await persistOnboarding('in_progress');
  } catch (e) {
    console.error('onboarding next error:', e);
    toast.error('儲存失敗，請稍後再試');
  } finally {
    saving.value = false;
  }
};

const skip = async () => {
  if (currentStep.value.required) return;
  if (!skipped.value.includes(currentStep.value.key)) skipped.value.push(currentStep.value.key);
  await next();
};

const prev = () => { if (step.value > 1) step.value--; };

const goToStep = (n: number) => {
  if (n <= maxReached.value) step.value = n;
};

const saveAndExit = async () => {
  saving.value = true;
  try {
    if (step.value === 1 && !tenantId.value) {
      if (!form.value.name) { router.push({ name: 'TenantList' }); return; } // 尚未填，直接離開
      if (!(await saveProfile())) return;
    }
    await persistOnboarding('in_progress');
    toast.success('已儲存，可從「繼續上線」接續');
    router.push({ name: 'TenantList' });
  } catch (e) {
    console.error('saveAndExit error:', e);
    toast.error('儲存失敗，請稍後再試');
  } finally {
    saving.value = false;
  }
};
</script>
