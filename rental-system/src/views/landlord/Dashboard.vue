<template>
  <div class="max-w-7xl mx-auto space-y-6">

    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          {{ greeting }}，{{ authStore.userProfile?.name || '房東' }}
        </h1>
        <p class="text-text-secondary-light dark:text-text-secondary-dark">這裡是您的物業概況</p>
      </div>
      <div class="flex gap-3">
        <RouterLink
          :to="{ name: 'RoomManagement', query: { action: 'new' } }"
          class="px-4 py-2 bg-gold-500 text-white rounded-xl shadow-sm hover:bg-gold-600 transition-colors text-sm font-medium flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          <span class="material-symbols-outlined text-[18px] mr-2" aria-hidden="true">add</span>
          新增房源
        </RouterLink>
      </div>
    </div>

    <!-- 開始簽約 / 邀請租客填資料：新租客上線入口 -->
    <div class="rounded-2xl bg-gradient-to-r from-gold-500 to-gold-600 text-white p-5 md:p-6 shadow-lg shadow-gold-500/20">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-4">
          <span class="material-symbols-outlined text-[34px]" aria-hidden="true">draw</span>
          <div>
            <h2 class="text-lg font-bold">開始簽約</h2>
            <p class="text-sm text-white/85">建檔 → 簽約 → 收押金 → 入住點交，引導新租客一條龍上線</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="showInvite = true"
            class="px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">mail</span>邀請填資料
          </button>
          <RouterLink
            :to="{ name: 'OnboardingMode' }"
            class="px-4 py-2 bg-white text-gold-600 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-gold-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            開始<span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <InviteTenantModal
      v-if="showInvite"
      :landlord-id="authStore.effectiveUid"
      :landlord-code="authStore.userProfile?.landlordCode || ''"
      :landlord-name="authStore.userProfile?.name || '房東'"
      @close="showInvite = false"
    />

    <div v-if="isLoading" role="status" aria-label="載入中" class="flex justify-center py-12">
      <span class="material-symbols-outlined animate-spin motion-reduce:animate-none text-4xl text-ink-200">progress_activity</span>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

      <MonthlyTaskCard
        :landlord-id="authStore.effectiveUid"
        :pending-count="financial.unpaidTenantCount"
        :bill-send-day="authStore.userProfile?.settings?.billSendDay ?? 1"
        :payment-day="authStore.userProfile?.settings?.paymentDay ?? 12"
      />

      <LandlordProfileCard
        :name="authStore.userProfile?.name || ''"
        :landlord-code="authStore.userProfile?.landlordCode || ''"
        :stats="stats"
      />

      <FinancialOverviewCard :financial="financial" @select="billFilter = $event" />

      <MeterUsageOverview :usage="meterUsage" />

      <RepairTicketCard :tickets="repairTickets" />

    </div>

    <BillStatusModal
      v-if="billFilter"
      :category="billFilter"
      :bills="billDetails[billFilter]"
      @close="billFilter = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { db } from '../../firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  type QuerySnapshot,
  type DocumentData
} from 'firebase/firestore';

import LandlordProfileCard from '../../components/dashboard/LandlordProfileCard.vue';
import FinancialOverviewCard from '../../components/dashboard/FinancialOverviewCard.vue';
import MeterUsageOverview, { type MeterUsageSummary, type MeterUsageRow } from '../../components/dashboard/MeterUsageOverview.vue';
import { getPublicMeters } from '../../services/publicMeterService';
import RepairTicketCard, { type RepairTicket } from '../../components/dashboard/RepairTicketCard.vue';
import MonthlyTaskCard from '../../components/dashboard/MonthlyTaskCard.vue';
import BillStatusModal, { type BillCategory, type BillLite } from '../../components/dashboard/BillStatusModal.vue';
import InviteTenantModal from '../../components/InviteTenantModal.vue';

const authStore = useAuthStore();
const isLoading = ref(true);
const showInvite = ref(false);

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return '早安';
  if (h < 18) return '午安';
  return '晚安';
});

const stats = reactive({
  totalRooms: 0,
  occupied: 0,
  vacant: 0,
  maintenance: 0,
  activeTenants: 0,
  pendingTenants: 0
});

const financial = reactive({
  unpaidCount: 0,
  unpaidAmount: 0,
  unpaidTenantCount: 0,
  paidCount: 0,
  paidAmount: 0,
  overdueCount: 0,
  overdueAmount: 0
});

const currentMonthStr = new Date().toISOString().slice(0, 7);
const meterUsage = ref<MeterUsageSummary>({
  month: currentMonthStr,
  metersTotal: 0, metersRead: 0, unreadNames: [],
  totalUsage: 0, totalCost: 0, deltaPct: null, rows: [],
});
const repairTickets = ref<RepairTicket[]>([]);

const billFilter = ref<BillCategory | null>(null);
const billDetails = reactive<Record<BillCategory, BillLite[]>>({
  unpaid: [],
  paid: [],
  overdue: []
});

// 依本月／上月抄表紀錄組出用電概況。同一電表若當月有多筆，取 periodEnd 最新的一筆。
type ReadingSnap = QuerySnapshot<DocumentData> | null;

const buildMeterUsage = (
  billableMeters: { id: string; name: string; isPublic: boolean }[],
  readingsSnap: ReadingSnap,
  prevReadingsSnap: ReadingSnap,
): MeterUsageSummary => {
  const latestByMeter = (snap: ReadingSnap) => {
    const map = new Map<string, DocumentData>();
    snap?.docs.forEach(d => {
      const data = d.data();
      const existing = map.get(data.roomId);
      if (!existing || (data.periodEnd ?? '') > (existing.periodEnd ?? '')) map.set(data.roomId, data);
    });
    return map;
  };

  const current = latestByMeter(readingsSnap);
  const prev = latestByMeter(prevReadingsSnap);

  const rows: MeterUsageRow[] = [];
  const unreadNames: string[] = [];
  for (const meter of billableMeters) {
    const r = current.get(meter.id);
    if (r) rows.push({ name: meter.name, usage: Number(r.usage) || 0, cost: Number(r.cost) || 0, isPublic: meter.isPublic });
    else unreadNames.push(meter.name);
  }
  rows.sort((a, b) => b.usage - a.usage);

  const totalUsage = rows.reduce((s, r) => s + r.usage, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const prevUsage = billableMeters.reduce((s, m) => s + (Number(prev.get(m.id)?.usage) || 0), 0);

  return {
    month: currentMonthStr,
    metersTotal: billableMeters.length,
    metersRead: rows.length,
    unreadNames,
    totalUsage,
    totalCost,
    deltaPct: prevUsage > 0 ? ((totalUsage - prevUsage) / prevUsage) * 100 : null,
    rows,
  };
};

const fetchDashboardData = async () => {
  if (!authStore.user) return;
  const uid = authStore.effectiveUid;
  const myLandlordCode = authStore.userProfile?.landlordCode;

  isLoading.value = true;

  try {
    // 用電概況：本月與上月的抄表紀錄（沿用既有索引 landlordId + periodEnd）
    const prevDate = new Date();
    prevDate.setDate(1);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const readingsQuery = (month: string) => getDocs(query(
      collection(db, 'meter_readings'),
      where('landlordId', '==', uid),
      where('periodEnd', '>=', `${month}-01`),
      where('periodEnd', '<=', `${month}-31`)
    )).catch(() => null);

    const [roomsSnap, billsSnap, repairsSnap, tenantsSnap, usersSnap,
           readingsSnap, prevReadingsSnap, publicMeters] = await Promise.all([
      getDocs(query(collection(db, 'rooms'), where('landlordId', '==', uid))),
      getDocs(query(collection(db, 'bills'), where('landlordId', '==', uid))),
      getDocs(query(
        collection(db, 'repair_requests'),
        where('landlordId', '==', uid),
        where('status', 'in', ['pending', 'processing']),
        orderBy('createdAt', 'desc'),
        limit(3)
      )).catch(() => null),
      getDocs(query(collection(db, 'tenants'), where('landlordId', '==', uid))),
      myLandlordCode
        ? getDocs(query(collection(db, 'users'), where('boundLandlordCode', '==', myLandlordCode)))
        : Promise.resolve(null),
      readingsQuery(currentMonthStr),
      readingsQuery(prevMonthStr),
      getPublicMeters(uid).catch(() => []),
    ]);

    // 1. 房源統計 & 電表
    stats.totalRooms = roomsSnap.size;
    stats.occupied = 0;
    stats.vacant = 0;
    stats.maintenance = 0;
    // 應抄表清單 = 在租房間 + 公共電表（與抄表頁 billableEntries 定義一致）
    const billableMeters: { id: string; name: string; isPublic: boolean }[] = [];

    roomsSnap.forEach(d => {
      const data = d.data();
      if (data.status === 'occupied') stats.occupied++;
      else if (data.status === 'maintenance') stats.maintenance++;
      else stats.vacant++;
      if (data.tenantName || data.status === 'occupied') {
        billableMeters.push({ id: d.id, name: data.name || '未命名', isPublic: false });
      }
    });
    (publicMeters ?? []).forEach(pm => {
      billableMeters.push({ id: pm.id, name: pm.name || '公共表', isPublic: true });
    });

    meterUsage.value = buildMeterUsage(billableMeters, readingsSnap, prevReadingsSnap);

    // 2. 在租人數（來自 tenants 集合，含手動建立）
    stats.activeTenants = tenantsSnap.size;

    // 新綁定通知：已綁定但尚未建立租客檔案的用戶
    if (usersSnap) {
      const processedUids = new Set(tenantsSnap.docs.map(d => d.data().uid).filter(Boolean));
      stats.pendingTenants = usersSnap.docs.filter(d => !processedUids.has(d.id)).length;
    } else {
      stats.pendingTenants = 0;
    }

    // 3. 帳務概況
    financial.unpaidCount = 0;
    financial.unpaidAmount = 0;
    financial.unpaidTenantCount = 0;
    financial.paidCount = 0;
    financial.paidAmount = 0;
    financial.overdueCount = 0;
    financial.overdueAmount = 0;
    billDetails.unpaid = [];
    billDetails.paid = [];
    billDetails.overdue = [];
    const todayStr = new Date().toISOString().split('T')[0] || '';
    const unpaidTenantIds = new Set<string>();
    billsSnap.forEach(d => {
      const data = d.data();
      const amount = Number(data.amount) || 0;
      const billLite: BillLite = {
        id: d.id,
        tenantId: data.tenantId || '',
        tenantName: data.tenantName || '未知租客',
        roomName: data.roomName || '',
        amount,
        month: data.month || '',
        dueDate: data.dueDate || ''
      };
      if (data.status === 'completed' || data.status === 'paid') {
        financial.paidCount++;
        financial.paidAmount += amount;
        billDetails.paid.push(billLite);
      } else if (data.dueDate && data.dueDate < todayStr) {
        financial.overdueCount++;
        financial.overdueAmount += amount;
        if (data.tenantId) unpaidTenantIds.add(data.tenantId);
        billDetails.overdue.push(billLite);
      } else {
        financial.unpaidCount++;
        financial.unpaidAmount += amount;
        if (data.tenantId) unpaidTenantIds.add(data.tenantId);
        billDetails.unpaid.push(billLite);
      }
    });
    financial.unpaidTenantCount = unpaidTenantIds.size;

    // 4. 最新報修
    if (repairsSnap) {
      repairTickets.value = repairsSnap.docs.map(d => {
        const data = d.data();
        let dateStr = '';
        if (data.createdAt?.toDate) {
          const dt = data.createdAt.toDate();
          dateStr = `${dt.getMonth() + 1}/${dt.getDate()}`;
        }
        return {
          id: d.id,
          room: data.roomNumber || '未知',
          tenant: data.tenantName || '未知',
          type: data.type || '維修',
          desc: data.description || '',
          date: dateStr,
          priority: data.priority || 'medium'
        };
      });
    }

  } catch (error) {
    console.error('Fetch dashboard data error:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  if (authStore.user) {
    fetchDashboardData();
  } else {
    setTimeout(() => {
      if (authStore.user) fetchDashboardData();
    }, 1000);
  }
});
</script>
