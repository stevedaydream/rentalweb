<template>
  <div class="max-w-7xl mx-auto space-y-6">

    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          早安，{{ authStore.userProfile?.name || '房東' }}
        </h1>
        <p class="text-text-secondary-light">這裡是您的物業概況</p>
      </div>
      <div class="flex gap-3">
        <button
          @click="$router.push({ name: 'RoomManagement' })"
          class="px-4 py-2 bg-gold-500 text-white rounded-xl shadow-sm hover:bg-gold-600 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">add</span>
          新增房源
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="flex justify-center py-12">
      <span class="material-symbols-outlined animate-spin text-4xl text-ink-200">progress_activity</span>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

      <MonthlyTaskCard
        :landlord-id="authStore.effectiveUid"
        :pending-count="financial.unpaidCount + financial.overdueCount"
        :bill-send-day="authStore.userProfile?.settings?.billSendDay ?? 1"
        :payment-day="authStore.userProfile?.settings?.paymentDay ?? 12"
      />

      <LandlordProfileCard
        :name="authStore.userProfile?.name || ''"
        :landlord-code="authStore.userProfile?.landlordCode || ''"
        :stats="stats"
      />

      <FinancialOverviewCard :financial="financial" />

      <MeterQuickEntry :rooms="meterRooms" @save="saveMeterReading" />

      <RepairTicketCard :tickets="repairTickets" />

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { db } from '../../firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  updateDoc,
  addDoc
} from 'firebase/firestore';

import LandlordProfileCard from '../../components/dashboard/LandlordProfileCard.vue';
import FinancialOverviewCard from '../../components/dashboard/FinancialOverviewCard.vue';
import MeterQuickEntry, { type MeterRoom } from '../../components/dashboard/MeterQuickEntry.vue';
import RepairTicketCard, { type RepairTicket } from '../../components/dashboard/RepairTicketCard.vue';
import MonthlyTaskCard from '../../components/dashboard/MonthlyTaskCard.vue';

const authStore = useAuthStore();
const toast = useToastStore();
const isLoading = ref(true);

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
  paidCount: 0,
  paidAmount: 0,
  overdueCount: 0,
  overdueAmount: 0
});

const meterRooms = ref<MeterRoom[]>([]);
const repairTickets = ref<RepairTicket[]>([]);

const fetchDashboardData = async () => {
  if (!authStore.user) return;
  const uid = authStore.effectiveUid;
  const myLandlordCode = authStore.userProfile?.landlordCode;

  isLoading.value = true;

  try {
    const [roomsSnap, billsSnap, repairsSnap, tenantsSnap, usersSnap] = await Promise.all([
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
        : Promise.resolve(null)
    ]);

    // 1. 房源統計 & 電表
    stats.totalRooms = roomsSnap.size;
    stats.occupied = 0;
    stats.vacant = 0;
    stats.maintenance = 0;
    const tempMeterRooms: MeterRoom[] = [];

    roomsSnap.forEach(d => {
      const data = d.data();
      if (data.status === 'occupied') stats.occupied++;
      else if (data.status === 'maintenance') stats.maintenance++;
      else stats.vacant++;
      if (tempMeterRooms.length < 5) {
        tempMeterRooms.push({
          id: d.id,
          name: data.roomName || data.name || data.roomNumber || '未命名',
          lastReading: Number(data.currentMeter) || 0,
          newReading: undefined
        });
      }
    });
    meterRooms.value = tempMeterRooms.sort((a, b) => a.name.localeCompare(b.name));

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
    financial.paidCount = 0;
    financial.paidAmount = 0;
    financial.overdueCount = 0;
    financial.overdueAmount = 0;
    const todayStr = new Date().toISOString().split('T')[0] || '';
    billsSnap.forEach(d => {
      const data = d.data();
      const amount = Number(data.totalAmount) || 0;
      if (data.status === 'paid') {
        financial.paidCount++;
        financial.paidAmount += amount;
      } else if (data.dueDate && data.dueDate < todayStr) {
        financial.overdueCount++;
        financial.overdueAmount += amount;
      } else {
        financial.unpaidCount++;
        financial.unpaidAmount += amount;
      }
    });

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

const saveMeterReading = async (room: MeterRoom) => {
  if (!room.newReading || !authStore.user) return;
  try {
    const roomRef = doc(db, 'rooms', room.id);
    await updateDoc(roomRef, {
      currentMeter: room.newReading,
      lastMeterUpdate: new Date().toISOString()
    });
    await addDoc(collection(db, 'meter_readings'), {
      roomId: room.id,
      landlordId: authStore.effectiveUid,
      roomName: room.name,
      reading: room.newReading,
      date: new Date().toISOString(),
      type: 'manual_quick'
    });
    room.lastReading = room.newReading;
    room.newReading = undefined;
    toast.success(`${room.name} 電表已儲存`);
  } catch {
    toast.error('儲存失敗，請稍後再試');
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
