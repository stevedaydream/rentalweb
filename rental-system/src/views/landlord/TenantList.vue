<template>
  <div class="max-w-7xl mx-auto space-y-6" @click="closeDropdown">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          租客列表
        </h1>
        <p class="text-text-secondary-light">管理所有租客資料、租約期限與聯繫方式</p>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center">
          <span class="material-symbols-outlined text-[18px] mr-2">download</span>
          匯出清單
        </button>
        <button 
          @click="openModal()"
          class="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">person_add</span>
          手動新增租客
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">在租人數</p>
          <p class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mt-1">{{ stats.total }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
          <span class="material-symbols-outlined">group</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">即將到期 (60天內)</p>
          <p class="text-2xl font-bold text-orange-600 mt-1">{{ stats.expiring }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
          <span class="material-symbols-outlined">alarm</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">逾期欠費</p>
          <p class="text-2xl font-bold text-red-600 mt-1">{{ stats.overdue }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600">
          <span class="material-symbols-outlined">gpp_bad</span>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          @click="currentFilter = filter.value"
          class="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          :class="currentFilter === filter.value ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'"
        >
          {{ filter.label }}
        </button>
      </div>
      
      <div class="relative w-full md:w-64">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
        <input
          v-model="rawSearch"
          type="text"
          placeholder="搜尋姓名、房號或電話..."
          class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-visible">
      <div class="overflow-x-auto min-h-[400px]">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th class="px-6 py-4 font-semibold">租客資訊</th>
              <th class="px-6 py-4 font-semibold">承租房源</th>
              <th class="px-6 py-4 font-semibold">租賃期間</th>
              <th class="px-6 py-4 font-semibold">繳費狀態</th>
              <th class="px-6 py-4 font-semibold">入住款項</th>
              <th class="px-6 py-4 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="tenant in pagedTenants" :key="tenant.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div 
                    class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold mr-3"
                    :class="tenant.isOnlineUser ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200'"
                  >
                    {{ tenant.name[0] }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                       <p class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ tenant.name }}</p>
                       <span v-if="tenant.isOnlineUser" class="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">已綁定帳號</span>
                    </div>
                    <p class="text-xs text-text-secondary-light mt-0.5">{{ tenant.phone }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center">
                   <span class="material-symbols-outlined text-gray-400 mr-2 text-[18px]">meeting_room</span>
                   <span :class="{'text-gray-400 italic': !tenant.room || tenant.room === '尚未設定'}">{{ tenant.room || '尚未設定' }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div v-if="tenant.leaseStart && tenant.leaseEnd" class="text-xs space-y-1">
                  <p><span class="text-text-secondary-light w-6 inline-block">起:</span> {{ tenant.leaseStart }}</p>
                  <p><span class="text-text-secondary-light w-6 inline-block">迄:</span> {{ tenant.leaseEnd }}</p>
                </div>
                <div v-else class="text-xs text-gray-400 italic">
                  租約未設定
                </div>
                <span v-if="isExpiringSoon(tenant.leaseEnd)" class="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
                   即將到期
                </span>
              </td>
              <td class="px-6 py-4">
                <span 
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="paymentStatusStyles[tenant.paymentStatus]"
                >
                  <span class="w-1.5 h-1.5 rounded-full mr-2" :class="paymentDotStyles[tenant.paymentStatus]"></span>
                  {{ paymentStatusLabels[tenant.paymentStatus] }}
                </span>
              </td>
              <td class="px-6 py-4">
                <button
                  v-if="tenant.contractId"
                  @click="openDepositModal(tenant)"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  :class="getDepositBadgeClass(tenant)"
                >
                  <span class="material-symbols-outlined text-[14px]">payments</span>
                  {{ getDepositLabel(tenant) }}
                </button>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 relative">
                  <button @click="openModal(tenant)" class="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <span class="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <div class="relative">
                    <button @click.stop="toggleMenu(tenant.id)" class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                       <span class="material-symbols-outlined text-[20px]">chat</span>
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="loading" class="p-12 text-center text-text-secondary-light">
         <p>載入中...</p>
      </div>
      <div v-else-if="filteredTenants.length === 0" class="p-12 text-center text-text-secondary-light">
         <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">person_off</span>
         <p>找不到符合條件的租客</p>
      </div>

      <!-- 分頁控制 -->
      <div v-if="totalTenantPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <span class="text-xs text-gray-500">第 {{ tenantPage }} / {{ totalTenantPages }} 頁，共 {{ filteredTenants.length }} 筆</span>
        <div class="flex gap-1">
          <button @click="tenantPage--" :disabled="tenantPage === 1"
            class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">上一頁</button>
          <button v-for="p in totalTenantPages" :key="p" @click="tenantPage = p"
            class="px-2.5 py-1 text-xs rounded-lg border transition-colors"
            :class="p === tenantPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'">{{ p }}</button>
          <button @click="tenantPage++" :disabled="tenantPage === totalTenantPages"
            class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">下一頁</button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ isEditing ? '編輯租客與合約' : '新增租客' }}
          </h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-4">
          <div v-if="!authStore.user" class="p-3 bg-red-100 text-red-700 text-sm rounded-lg mb-4">
             系統錯誤：無法識別房東身分，請重新登入。
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">姓名</label>
              <input v-model="form.name" type="text" class="form-input" placeholder="租客姓名">
            </div>
            <div>
               <label class="block text-sm font-medium text-text-secondary-light mb-1">承租房源</label>
               <select v-model="form.room" @change="onRoomSelect" class="form-input">
                  <option value="" disabled>請選擇房源</option>
                  <option v-if="currentEditingRoom" :value="currentEditingRoom.name">
                    {{ currentEditingRoom.name }} (目前承租)
                  </option>
                  <option v-for="room in vacantRooms" :key="room.id" :value="room.name">
                    {{ room.name }} ({{ room.price }}元)
                  </option>
                  <option v-if="form.room && !isRoomInList(form.room)" :value="form.room">
                    {{ form.room }} (未知房源)
                  </option>
               </select>
               <p v-if="vacantRooms.length === 0 && !currentEditingRoom" class="text-xs text-orange-500 mt-1">目前沒有閒置房源，請先至房源管理新增。</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">聯絡電話</label>
            <input v-model="form.phone" type="tel" class="form-input" placeholder="0912-345-678">
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">電子郵件 (選填)</label>
            <input v-model="form.email" type="email" class="form-input" placeholder="tenant@example.com">
          </div>

          <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
             <p class="text-xs font-bold text-text-secondary-light uppercase mb-3">租約設定</p>
             <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">起租日</label>
                  <input v-model="form.leaseStart" type="date" class="form-input">
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">租期（年）</label>
                  <select v-model.number="form.leaseDuration" class="form-input">
                    <option :value="0.5">0.5 年（6 個月）</option>
                    <option :value="1">1 年</option>
                    <option :value="1.5">1.5 年</option>
                    <option :value="2">2 年</option>
                    <option :value="3">3 年</option>
                  </select>
                </div>
             </div>
             <!-- 到期日（唯讀，自動計算） -->
             <div class="mt-3 flex items-center gap-2 text-sm text-text-secondary-light bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
               <span class="material-symbols-outlined text-[16px]">event</span>
               到期日：<span class="font-semibold text-text-primary-light dark:text-text-primary-dark">{{ form.leaseEnd || '—' }}</span>
               <span class="ml-auto text-xs">(住滿 {{ Math.round((form.leaseDuration || 1) * 365) }} 天)</span>
             </div>
             <div class="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">每月租金 (NT$)</label>
                  <input v-model.number="form.rent" type="number" class="form-input" placeholder="自動帶入房源價格">
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">押金月數</label>
                  <select v-model.number="form.depositMonths" class="form-input">
                    <option :value="1">1 個月</option>
                    <option :value="2">2 個月（慣例）</option>
                    <option :value="3">3 個月</option>
                  </select>
                </div>
             </div>
             <!-- 入住款項摘要 -->
             <div v-if="form.rent && form.rent > 0" class="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700 text-sm">
               <p class="font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1">
                 <span class="material-symbols-outlined text-[16px]">payments</span>
                 入住應收款項
               </p>
               <div class="space-y-1 text-amber-700 dark:text-amber-400">
                 <div class="flex justify-between" v-for="n in (form.depositMonths || 2)" :key="n">
                   <span>押金（第 {{ n }} 個月）</span>
                   <span class="font-medium">NT$ {{ (form.rent || 0).toLocaleString() }}</span>
                 </div>
                 <div class="flex justify-between border-t border-amber-200 dark:border-amber-700 pt-1 mt-1">
                   <span>首月租金</span>
                   <span class="font-medium">NT$ {{ (form.rent || 0).toLocaleString() }}</span>
                 </div>
                 <div class="flex justify-between font-bold text-amber-900 dark:text-amber-200 pt-1">
                   <span>合計應收</span>
                   <span>NT$ {{ (((form.depositMonths || 2) + 1) * (form.rent || 0)).toLocaleString() }}</span>
                 </div>
               </div>
             </div>
          </div>
          
          <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
             <p class="text-xs font-bold text-text-secondary-light uppercase mb-3">其他資訊</p>
             <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">緊急聯絡人</label>
                  <input v-model="form.emergencyContact" type="text" class="form-input" placeholder="姓名 - 關係 - 電話">
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">備註</label>
                  <textarea v-model="form.note" class="form-input min-h-[80px]" placeholder="例如：養一隻貓、習慣晚歸..."></textarea>
                </div>
             </div>
          </div>
        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button 
            @click="showModal = false"
            class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors"
          >
            取消
          </button>
          <button 
            @click="saveTenant"
            :disabled="isSaving"
            class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {{ isSaving ? '處理中...' : (isEditing ? '儲存並同步合約' : '新增租客') }}
          </button>
        </div>
      </div>
    </div>

  <!-- 押金收款 Modal -->
  <div v-if="showDepositModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showDepositModal = false"></div>
    <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
      <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h2 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">入住款項收款確認</h2>
          <p class="text-sm text-text-secondary-light mt-0.5">{{ depositTenant?.name }} — {{ depositTenant?.room }}</p>
        </div>
        <button @click="showDepositModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="p-6 space-y-3">
        <div
          v-for="(item, idx) in depositItems"
          :key="idx"
          class="flex items-center justify-between p-4 rounded-xl border transition-colors"
          :class="item.status === 'paid'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'"
        >
          <div>
            <p class="font-semibold text-sm text-text-primary-light dark:text-text-primary-dark">{{ item.label }}</p>
            <p class="text-xs text-text-secondary-light">NT$ {{ item.amount.toLocaleString() }}</p>
            <p v-if="item.paidAt" class="text-xs text-green-600 dark:text-green-400 mt-0.5">
              {{ item.paidAt }}
            </p>
          </div>
          <div>
            <span v-if="item.status === 'paid'" class="flex items-center gap-1 text-green-700 dark:text-green-400 text-sm font-bold">
              <span class="material-symbols-outlined text-[18px]">check_circle</span>
              已收款
            </span>
            <button
              v-else
              @click="markDepositPaid(idx)"
              :disabled="isMarkingPaid"
              class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-[14px]">payments</span>
              標記已收
            </button>
          </div>
        </div>

        <!-- 總計 -->
        <div class="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between text-sm font-bold">
          <span class="text-text-secondary-light">應收總計</span>
          <span>NT$ {{ depositItems.reduce((s, i) => s + i.amount, 0).toLocaleString() }}</span>
        </div>
        <div class="flex justify-between text-sm font-bold text-green-600">
          <span>已收金額</span>
          <span>NT$ {{ depositItems.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0).toLocaleString() }}</span>
        </div>
      </div>

      <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
        <button @click="showDepositModal = false" class="px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 transition-colors">
          關閉
        </button>
      </div>
    </div>
  </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  where,
  getDocs,
} from 'firebase/firestore';

// --- Type Definitions ---
interface DepositItem {
  label: string;
  amount: number;
  status: 'unpaid' | 'paid';
  paidAt?: string;
}

interface Tenant {
  id: string;
  name: string;
  room: string;
  phone: string;
  email?: string;
  leaseStart: string;
  leaseEnd: string;
  leaseDuration?: number;
  rent?: number;
  depositMonths?: number;
  paymentStatus: 'normal' | 'overdue' | 'unpaid' | 'pending';
  emergencyContact?: string;
  note?: string;
  landlordId?: string;
  isOnlineUser?: boolean;
  uid?: string;
  contractId?: string;
  deposits?: DepositItem[];
  createdAt?: any;
}

interface Room {
  id: string;
  name: string;
  status: string;
  price: number;
}

// --- State ---
const authStore = useAuthStore();
const toast = useToastStore();
const tenants = ref<Tenant[]>([]);
const availableRooms = ref<Room[]>([]); // [新增] 儲存所有房源
const loading = ref(true);
const isSaving = ref(false); // [新增]

// --- Subscription Handlers ---
let unsubscribeTenants: any = null;
let unsubscribeUsers: any = null;

// --- Date Helpers ---
const todayStr = () => new Date().toISOString().split('T')[0] as string;

const calcLeaseEnd = (start: string, durationYears: number): string => {
  if (!start || !durationYears) return '';
  const d = new Date(start);
  const totalDays = Math.round(durationYears * 365);
  d.setDate(d.getDate() + totalDays - 1);
  return d.toISOString().split('T')[0] as string;
};

// --- Filters & Search ---
const currentFilter = ref('all');
const rawSearch = ref('');
const searchQuery = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(rawSearch, (val) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery.value = val; }, 300);
});

const filters = [
  { label: '全部租客', value: 'all' },
  { label: '繳費正常', value: 'normal' },
  { label: '逾期/欠費', value: 'issue' },
];

const paymentStatusLabels: any = {
  normal: '繳費正常',
  unpaid: '本期未繳',
  overdue: '逾期欠費',
  pending: '未設定租約'
};

const paymentStatusStyles: any = {
  normal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  unpaid: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  pending: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
};

const paymentDotStyles: any = {
  normal: 'bg-green-500',
  unpaid: 'bg-yellow-500',
  overdue: 'bg-red-500',
  pending: 'bg-gray-400'
};

// --- Firestore Integration ---

// 讀取房源列表 (用於下拉選單)
const fetchRooms = async () => {
  if (!authStore.user) return;
  const q = query(collection(db, 'rooms'), where('landlordId', '==', authStore.effectiveUid));
  const snap = await getDocs(q);
  availableRooms.value = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Room));
};

const startListeners = () => {
  if (unsubscribeTenants) return; // 避免重複啟動

  const uid = authStore.effectiveUid;
  const myCode = authStore.userProfile?.landlordCode;

  // 0. 讀取房源
  fetchRooms();

  // 1. 監聽手動建立的租約 (Tenants)，同時 join contracts 中的 deposits
  const qTenants = query(collection(db, 'tenants'), where('landlordId', '==', uid));
  unsubscribeTenants = onSnapshot(qTenants, async (snapshot) => {
    const manualTenants = await Promise.all(snapshot.docs.map(async (d) => {
      const tenantData = { id: d.id, ...d.data() } as Tenant;
      if (tenantData.contractId) {
        const contractSnap = await getDoc(doc(db, 'contracts', tenantData.contractId));
        if (contractSnap.exists()) {
          tenantData.deposits = contractSnap.data().deposits || [];
        }
      }
      return tenantData;
    }));
    updateCombinedList(manualTenants, onlineUsers.value);
  });

  // 2. 監聽線上綁定的用戶 (Users)，僅在 landlordCode 已載入時啟動
  if (myCode) {
    const qUsers = query(collection(db, 'users'), where('boundLandlordCode', '==', myCode));
    unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const users = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          uid: d.id,
          name: data.name || '未命名用戶',
          phone: data.phone || '',
          email: data.email || '',
          room: '尚未設定',
          leaseStart: '',
          leaseEnd: '',
          paymentStatus: 'pending',
          isOnlineUser: true
        } as Tenant;
      });
      onlineUsers.value = users;
    });
  }
};

onMounted(() => {
  if (!authStore.user) return;

  if (authStore.userProfile) {
    startListeners();
  } else {
    // userProfile 尚未載入，等待它就緒
    const stop = watch(() => authStore.userProfile, (profile) => {
      if (profile) {
        stop();
        startListeners();
      }
    });
  }
});

const manualTenantsList = ref<Tenant[]>([]);
const onlineUsers = ref<Tenant[]>([]);

const updateCombinedList = (manual: Tenant[], online: Tenant[]) => {
  manualTenantsList.value = manual;
  const manualPhones = new Set(manual.map(t => t.phone).filter(Boolean));
  const manualUids = new Set(manual.map(t => t.uid).filter(Boolean));
  // 已建立 tenant 文件的線上用戶不再顯示為獨立列
  const uniqueOnline = online.filter(u =>
    !manualPhones.has(u.phone) && !manualUids.has(u.uid)
  );
  tenants.value = [...manual, ...uniqueOnline];
  loading.value = false;
};

// Watchers for list syncing
watch([manualTenantsList, onlineUsers], ([newManual, newOnline]) => {
  const manualPhones = new Set(newManual.map(t => t.phone));
  const uniqueOnline = newOnline.filter(u => !manualPhones.has(u.phone));
  tenants.value = [...newManual, ...uniqueOnline];
});

onUnmounted(() => {
  if (unsubscribeTenants) unsubscribeTenants();
  if (unsubscribeUsers) unsubscribeUsers();
});

// --- Save & Logic (Critical Fixes) ---
const saveTenant = async () => {
  if (!authStore.user) return;
  if (!form.value.name) { toast.warning('請填寫完整資料'); return; }
  if (!form.value.room) { toast.warning('請選擇房源'); return; }
  
  isSaving.value = true;

  try {
    const tenantData: any = {
       ...form.value,
       landlordId: authStore.effectiveUid,
       updatedAt: serverTimestamp()
    };
    
    // 移除不需寫入 tenants 集合的 UI 輔助欄位
    const isOnlineProfile = tenantData.isOnlineUser;
    const targetUid = tenantData.uid; // 如果是線上用戶，這是他的 User UID
    
    delete tenantData.isOnlineUser;
    delete tenantData.id; 
    delete tenantData.uid; // 雖然我們需要它來建合約，但不需要存在 tenant 集合內 (或可選擇保留)

    // 1. 處理 Tenants Collection (租客檔案)
    // let tenantDocId = form.value.id;
    
    if (isEditing.value && form.value.id) {
      if (isOnlineProfile) {
        // 線上用戶：先查是否已有 tenant 文件，避免重複建立
        const existQ = query(
          collection(db, 'tenants'),
          where('uid', '==', targetUid),
          where('landlordId', '==', authStore.effectiveUid)
        );
        const existSnap = await getDocs(existQ);
        if (existSnap.empty) {
          const newDoc = await addDoc(collection(db, 'tenants'), {
            ...tenantData,
            uid: targetUid,
            createdAt: serverTimestamp(),
            paymentStatus: 'normal',
          });
          // 更新 form.value.id 方便後面回存 contractId
          form.value.id = newDoc.id;
          toast.success('已建立租客檔案');
        } else {
          // 已存在，直接更新
          const existId = existSnap.docs[0]!.id;
          form.value.id = existId;
          await updateDoc(doc(db, 'tenants', existId), tenantData);
        }
      } else {
        // 更新現有 Tenant
        await updateDoc(doc(db, 'tenants', form.value.id), tenantData);
      }
    } else {
      // 純手動新增：先以電話查重
      const dupQ = query(
        collection(db, 'tenants'),
        where('phone', '==', form.value.phone),
        where('landlordId', '==', authStore.effectiveUid)
      );
      const dupSnap = await getDocs(dupQ);
      if (!dupSnap.empty) {
        toast.warning('此電話號碼的租客已存在，請直接編輯該筆資料');
        isSaving.value = false;
        return;
      }
      const newDoc = await addDoc(collection(db, 'tenants'), {
        ...tenantData,
        createdAt: serverTimestamp(),
        paymentStatus: 'normal',
      });
      form.value.id = newDoc.id;
    }

    // 2. 處理 Rooms Collection (房源狀態同步)
    // 找出選定的房間 ID
    const selectedRoom = availableRooms.value.find(r => r.name === form.value.room);
    if (selectedRoom) {
      const roomRef = doc(db, 'rooms', selectedRoom.id);
      await updateDoc(roomRef, {
        status: 'occupied',
        tenantName: form.value.name,
        leaseEnd: form.value.leaseEnd,
        // 如果需要可以存 tenantId: tenantDocId
      });
      // TODO: 如果換房間，應把舊房間設回 vacant (這裡簡化暫不處理)
    }

    // 3. 處理 Contracts Collection（所有租客都建立，含手動新增）
    {
      const tenantDocId = form.value.id!;
      const contractsRef = collection(db, 'contracts');

      // 查既有合約：線上用戶用 tenantId，手動用 tenantDocId
      const qContract = targetUid
        ? query(contractsRef, where('landlordId', '==', authStore.effectiveUid), where('tenantId', '==', targetUid), where('status', '==', 'active'))
        : query(contractsRef, where('landlordId', '==', authStore.effectiveUid), where('tenantDocId', '==', tenantDocId), where('status', '==', 'active'));
      const contractSnap = await getDocs(qContract);

      const rent = form.value.rent || 0;
      const depositMonths = form.value.depositMonths || 2;

      const buildDeposits = (existingDeposits?: DepositItem[]): DepositItem[] => {
        const items: DepositItem[] = [];
        for (let n = 1; n <= depositMonths; n++) {
          const existing = existingDeposits?.find(d => d.label === `押金（第 ${n} 個月）`);
          items.push(existing ?? { label: `押金（第 ${n} 個月）`, amount: rent, status: 'unpaid' });
        }
        const firstRent = existingDeposits?.find(d => d.label === '首月租金');
        items.push(firstRent ?? { label: '首月租金', amount: rent, status: 'unpaid' });
        return items;
      };

      const contractData: any = {
        landlordId: authStore.effectiveUid,
        tenantDocId,
        tenantName: form.value.name,
        roomNumber: form.value.room,
        rent,
        depositMonths,
        startDate: form.value.leaseStart,
        endDate: form.value.leaseEnd,
        paymentDay: 5,
        status: 'active',
        updatedAt: serverTimestamp()
      };
      if (targetUid) contractData.tenantId = targetUid;

      let contractId: string;
      if (!contractSnap.empty) {
        const contractDoc = contractSnap.docs[0]!;
        contractId = contractDoc.id;
        contractData.deposits = buildDeposits(contractDoc.data().deposits as DepositItem[] | undefined);
        await updateDoc(doc(db, 'contracts', contractId), contractData);
      } else {
        contractData.deposits = buildDeposits();
        contractData.createdAt = serverTimestamp();
        const newContract = await addDoc(contractsRef, contractData);
        contractId = newContract.id;
      }

      // 回存 contractId 到 tenants 文件
      await updateDoc(doc(db, 'tenants', tenantDocId), { contractId });
    }

    // 重新抓取房源狀態 (因為狀態變了)
    await fetchRooms();
    showModal.value = false;

  } catch (error) {
    console.error("Error saving tenant:", error);
    toast.error("儲存失敗: " + error);
  } finally {
    isSaving.value = false;
  }
};

// --- Computed & Helpers ---
const stats = computed(() => {
  const today = new Date();
  const sixtyDaysLater = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const activeTenants = tenants.value.filter(t => t.paymentStatus !== 'pending');

  return {
    total: activeTenants.length,
    expiring: activeTenants.filter(t => {
      if (!t.leaseEnd) return false;
      const endDate = new Date(t.leaseEnd);
      return endDate >= today && endDate <= sixtyDaysLater;
    }).length,
    overdue: activeTenants.filter(t => t.paymentStatus === 'overdue').length
  };
});

const filteredTenants = computed(() => {
  return tenants.value.filter(t => {
    const q = searchQuery.value.toLowerCase();
    const matchSearch = t.name.toLowerCase().includes(q) ||
                        t.room.toLowerCase().includes(q) ||
                        t.phone.includes(q);
    if (!matchSearch) return false;
    if (currentFilter.value === 'all') return true;
    if (currentFilter.value === 'normal') return t.paymentStatus === 'normal';
    if (currentFilter.value === 'issue') return ['overdue', 'unpaid', 'pending'].includes(t.paymentStatus);
    return true;
  });
});

// --- 分頁 ---
const TENANT_PAGE_SIZE = 15;
const tenantPage = ref(1);

// 搜尋或篩選變化時重置頁碼
watch([searchQuery, currentFilter], () => { tenantPage.value = 1; });

const totalTenantPages = computed(() => Math.ceil(filteredTenants.value.length / TENANT_PAGE_SIZE));

const pagedTenants = computed(() => {
  const start = (tenantPage.value - 1) * TENANT_PAGE_SIZE;
  return filteredTenants.value.slice(start, start + TENANT_PAGE_SIZE);
});

const isExpiringSoon = (dateStr: string) => {
  if (!dateStr) return false;
  const today = new Date();
  const targetDate = new Date(dateStr);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 60;
};

// --- Modal Logic ---
const showModal = ref(false);
const isEditing = ref(false);
const form = ref<Partial<Tenant>>({
  name: '',
  room: '',
  phone: '',
  email: '',
  leaseStart: todayStr(),
  leaseEnd: calcLeaseEnd(todayStr(), 1),
  leaseDuration: 1,
  rent: 0,
  depositMonths: 2,
  paymentStatus: 'normal',
  emergencyContact: '',
  note: ''
});

// 自動計算到期日
watch(
  [() => form.value.leaseStart, () => form.value.leaseDuration],
  ([start, duration]) => {
    if (start && duration) {
      form.value.leaseEnd = calcLeaseEnd(start, duration);
    }
  }
);

// Computed properties for Dropdown logic
const vacantRooms = computed(() => availableRooms.value.filter(r => r.status === 'vacant'));
const currentEditingRoom = computed(() => {
  // 如果正在編輯，且該租客已經有房間，就算該房間狀態是 occupied，也要顯示出來給他選
  if (!form.value.room) return null;
  return availableRooms.value.find(r => r.name === form.value.room);
});

const isRoomInList = (roomName: string) => {
  return availableRooms.value.some(r => r.name === roomName);
};

// 選擇房間時自動帶入價格
const onRoomSelect = () => {
  const r = availableRooms.value.find(room => room.name === form.value.room);
  if (r) {
    form.value.rent = Number(r.price);
  }
};

const openModal = (tenant?: Tenant) => {
  fetchRooms(); // 確保房源資料最新
  if (tenant) {
    isEditing.value = true;
    form.value = JSON.parse(JSON.stringify(tenant));
    // 如果沒有 rent 資料，嘗試從房源補
    if (!form.value.rent && form.value.room) {
       const r = availableRooms.value.find(room => room.name === form.value.room);
       if (r) form.value.rent = r.price;
    }
  } else {
    isEditing.value = false;
    const today = todayStr();
    form.value = {
      name: '',
      room: '',
      phone: '',
      leaseStart: today,
      leaseEnd: calcLeaseEnd(today, 1),
      leaseDuration: 1,
      rent: 0,
      depositMonths: 2,
      paymentStatus: 'normal'
    };
  }
  showModal.value = true;
};

// --- Dropdown Logic ---
const activeMenuId = ref<string | null>(null);
const toggleMenu = (id: string) => {
  activeMenuId.value = activeMenuId.value === id ? null : id;
};
const closeDropdown = () => {
  activeMenuId.value = null;
};

// --- Deposit Modal Logic ---
const showDepositModal = ref(false);
const depositTenant = ref<Tenant | null>(null);
const depositItems = ref<DepositItem[]>([]);
const isMarkingPaid = ref(false);

const openDepositModal = async (tenant: Tenant) => {
  depositTenant.value = tenant;
  if (tenant.contractId) {
    const snap = await getDoc(doc(db, 'contracts', tenant.contractId));
    if (snap.exists()) {
      depositItems.value = (snap.data().deposits as DepositItem[]) || [];
    }
  } else {
    depositItems.value = tenant.deposits || [];
  }
  showDepositModal.value = true;
};

const markDepositPaid = async (idx: number) => {
  if (!depositTenant.value?.contractId) return;
  isMarkingPaid.value = true;
  try {
    const tenant = depositTenant.value;
    const item = depositItems.value[idx]!;
    const todayDate = new Date().toISOString().split('T')[0]!;
    const nowLabel = new Date().toLocaleDateString('zh-TW');

    depositItems.value[idx] = { ...item, status: 'paid', paidAt: nowLabel };

    // 1. 更新合約的 deposits 陣列
    await updateDoc(doc(db, 'contracts', tenant.contractId!), {
      deposits: depositItems.value
    });

    // 2. 在 bills 建立已收帳目
    await addDoc(collection(db, 'bills'), {
      landlordId: authStore.effectiveUid,
      tenantId: tenant.uid || null,
      relatedTenantDocId: tenant.id,
      relatedContractId: tenant.contractId,
      date: todayDate,
      type: 'income',
      category: '入住款項',
      target: `${tenant.room} ${tenant.name}`,
      description: item.label,
      amount: item.amount,
      status: 'completed',
      dueDate: todayDate,
      history: [],
      createdAt: serverTimestamp(),
    });

    toast.success(`已標記「${item.label}」收款完成`);
  } catch {
    toast.error('更新失敗，請稍後再試');
  } finally {
    isMarkingPaid.value = false;
  }
};

const getDepositLabel = (tenant: Tenant): string => {
  const deps = tenant.deposits || [];
  const paid = deps.filter(d => d.status === 'paid').length;
  if (paid === deps.length && deps.length > 0) return '全部已收';
  if (paid === 0) return '待收款';
  return `${paid}/${deps.length} 已收`;
};

const getDepositBadgeClass = (tenant: Tenant): string => {
  const deps = tenant.deposits || [];
  const paid = deps.filter(d => d.status === 'paid').length;
  if (paid === deps.length && deps.length > 0)
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (paid === 0)
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
};
</script>