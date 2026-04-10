<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          我的帳單
        </h1>
        <p class="text-text-secondary-light">查看本期應繳費用與歷史繳費紀錄</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-gradient-to-br from-gold-500 to-gold-600 rounded-2xl p-6 text-white shadow-lg shadow-gold-500/30 relative overflow-hidden">
        <div class="relative z-10">
          <p class="text-gold-100 font-medium mb-1">本期應繳總額</p>
          <p class="text-3xl font-extrabold">NT$ {{ summary.unpaidTotal.toLocaleString() }}</p>
          <div class="mt-4 flex items-center gap-2 text-sm text-gold-100">
             <span class="bg-white/20 px-2 py-0.5 rounded text-xs">截止日</span>
             {{ summary.nextDueDate || '無待繳帳單' }}
          </div>
        </div>
        <span class="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] opacity-10 rotate-12">receipt_long</span>
      </div>

      <div class="bg-white dark:bg-card-dark rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center">
        <p class="text-text-secondary-light text-sm font-bold">未繳筆數</p>
        <div class="flex items-end gap-2 mt-2">
           <span class="text-3xl font-bold text-red-500">{{ summary.unpaidCount }}</span>
           <span class="text-sm text-text-secondary-light mb-1">筆</span>
        </div>
      </div>

       <div class="bg-white dark:bg-card-dark rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center">
        <p class="text-text-secondary-light text-sm font-bold">最後繳費日</p>
        <div class="flex items-end gap-2 mt-2">
           <span class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">{{ summary.lastPaymentDate }}</span>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div class="flex items-center border-b border-gray-100 dark:border-gray-800 px-6 pt-2">
        <button 
          v-for="tab in tabs" 
          :key="tab.value"
          @click="currentTab = tab.value"
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors relative top-[1px]"
          :class="currentTab === tab.value ? 'border-gold-500 text-gold-600' : 'border-transparent text-text-secondary-light hover:text-gray-600 dark:hover:text-gray-300'"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="overflow-x-auto">
        <!-- 帳單 tab -->
        <template v-if="currentTab !== 'meter'">
          <div v-if="loading" class="p-12 text-center text-text-secondary-light">
            <span class="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
            <p>載入帳單資料中...</p>
          </div>

          <table v-else class="w-full text-sm text-left">
            <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th class="px-6 py-4">帳單月份</th>
                <th class="px-6 py-4">項目</th>
                <th class="px-6 py-4">繳費期限</th>
                <th class="px-6 py-4 text-right">金額</th>
                <th class="px-6 py-4 text-center">狀態</th>
                <th class="px-6 py-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-for="bill in filteredBills" :key="bill.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td class="px-6 py-4">
                  <p class="font-bold text-text-primary-light">{{ bill.monthStr }}</p>
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-wrap gap-2">
                    <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                      {{ bill.category }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-text-secondary-light">
                  {{ bill.dueDate || '無期限' }}
                </td>
                <td class="px-6 py-4 text-right font-bold text-lg text-text-primary-light">
                  NT$ {{ bill.amount.toLocaleString() }}
                </td>
                <td class="px-6 py-4 text-center">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    :class="statusStyles[bill.status]"
                  >
                    <span class="w-1.5 h-1.5 rounded-full mr-2" :class="statusDotStyles[bill.status]"></span>
                    {{ statusLabels[bill.status] }}
                  </span>
                </td>
                <td class="px-6 py-4 text-center">
                  <button
                    @click="openModal(bill)"
                    class="text-gold-600 hover:bg-gold-50 dark:hover:bg-gold-900/20 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                  >
                    詳情
                  </button>
                </td>
              </tr>
              <tr v-if="filteredBills.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-text-secondary-light">
                  <div class="flex flex-col items-center">
                    <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">receipt_long</span>
                    <p>目前沒有相關帳單紀錄</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- 用電記錄 tab -->
        <template v-else>
          <div v-if="meterLoading" class="p-12 text-center text-text-secondary-light">
            <span class="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
            <p>載入用電記錄中...</p>
          </div>
          <table v-else class="w-full text-sm text-left">
            <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th class="px-6 py-4">期間</th>
                <th class="px-6 py-4 text-right">上期度數</th>
                <th class="px-6 py-4 text-right">本期度數</th>
                <th class="px-6 py-4 text-right">使用度數</th>
                <th class="px-6 py-4 text-right">電費</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-for="m in meterReadings" :key="m.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td class="px-6 py-4 font-medium text-text-primary-light">{{ m.periodEnd || m.yearMonth || '-' }}</td>
                <td class="px-6 py-4 text-right text-text-secondary-light">{{ m.lastReading ?? '-' }} 度</td>
                <td class="px-6 py-4 text-right font-bold">{{ m.currentReading ?? '-' }} 度</td>
                <td class="px-6 py-4 text-right font-bold text-gold-600">{{ m.usage ?? '-' }} 度</td>
                <td class="px-6 py-4 text-right font-bold">{{ m.cost ? `NT$ ${Number(m.cost).toLocaleString()}` : '-' }}</td>
              </tr>
              <tr v-if="meterReadings.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-text-secondary-light">
                  <div class="flex flex-col items-center">
                    <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">electric_meter</span>
                    <p>尚無用電記錄</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">帳單詳情</h2>
            <p class="text-sm text-text-secondary-light">{{ selectedBill?.monthStr }}</p>
          </div>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div ref="billReceiptRef" class="bg-white dark:bg-card-dark p-6 overflow-y-auto space-y-6">
          
          <div class="text-center">
            <p class="text-sm text-text-secondary-light mb-1">應繳總金額</p>
            <p class="text-4xl font-extrabold text-gold-600">NT$ {{ selectedBill?.amount.toLocaleString() }}</p>
            <div class="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" 
                 :class="selectedBill ? statusStyles[selectedBill.status] : ''">
               {{ selectedBill ? statusLabels[selectedBill.status] : '' }}
            </div>
            <p class="text-[10px] text-gray-300 mt-2">MyRental 租務管理系統</p>
          </div>

          <div v-if="selectedBill" class="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div class="flex justify-between items-start">
               <div>
                 <p class="font-bold text-text-primary-light">{{ selectedBill.category }}</p>
                 <p class="text-xs text-text-secondary-light">{{ selectedBill.description }}</p>
               </div>
               <p class="font-medium text-text-primary-light">NT$ {{ selectedBill.amount.toLocaleString() }}</p>
            </div>
             <div class="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
               <p class="text-sm font-bold text-text-secondary-light">合計</p>
               <p class="font-bold">NT$ {{ selectedBill.amount.toLocaleString() }}</p>
            </div>
          </div>

          <div v-if="selectedBill?.status !== 'completed'" class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl text-sm space-y-2">
            <p class="font-bold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">匯款資訊</p>
            <template v-if="landlordBankInfo?.account">
              <div class="flex justify-between">
                <span class="text-gray-500">銀行代碼</span>
                <span class="font-mono font-bold">{{ landlordBankInfo.code || '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">轉帳帳號</span>
                <span class="font-mono font-bold">{{ landlordBankInfo.account }}</span>
              </div>
              <div v-if="landlordBankInfo.name" class="flex justify-between">
                <span class="text-gray-500">戶名</span>
                <span class="font-mono font-bold">{{ landlordBankInfo.name }}</span>
              </div>
            </template>
            <p v-else class="text-gray-400 text-center py-1">房東尚未設定收款帳戶，請直接聯繫房東</p>
          </div>
          
           <div v-if="selectedBill?.status === 'completed'" class="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl text-center border border-green-100">
             <span class="material-symbols-outlined text-green-500 text-3xl mb-1">check_circle</span>
             <p class="text-green-700 font-bold text-sm">此帳單已於 {{ selectedBill.paymentDate || '日前' }} 完成繳費</p>
          </div>

        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <button 
            @click="downloadImage"
            class="flex items-center gap-2 px-5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-sm"
          >
            <span v-if="!isGenerating" class="material-symbols-outlined text-lg">image</span>
            <span v-else class="material-symbols-outlined text-lg animate-spin">refresh</span>
            {{ isGenerating ? '處理中...' : '下載圖片' }}
          </button>
          
          <button 
             v-if="selectedBill?.status !== 'completed'"
             @click="handlePay(selectedBill!)"
             class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold shadow-lg shadow-gold-500/30 hover:bg-gold-600 transition-colors"
          >
             前往繳費
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { db } from '../../firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import html2canvas from 'html2canvas';

// --- Type Definitions ---
// 對應 Firebase 'bills' collection 結構
interface Bill {
  id: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  monthStr?: string; // Derived: YYYY年 MM月
  type: 'income' | 'expense';
  category: string;
  target: string;
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'overdue';
  dueDate?: string;
  paymentDate?: string;
}

// --- State ---
const authStore = useAuthStore();
const toast = useToastStore();
const route = useRoute();
const bills = ref<Bill[]>([]);
const loading = ref(true);
let unsubscribe: any = null;

const validTabs = ['unpaid', 'history', 'all', 'meter'];
const initialTab = validTabs.includes(route.query.tab as string) ? (route.query.tab as string) : 'unpaid';
const currentTab = ref(initialTab);
const showModal = ref(false);
const selectedBill = ref<Bill | null>(null);
const landlordBankInfo = ref<{ code: string; account: string; name: string } | null>(null);
const billReceiptRef = ref<HTMLElement | null>(null);
const isGenerating = ref(false);

// 用電記錄
const meterReadings = ref<any[]>([]);
const meterLoading = ref(false);

const tabs = [
  { label: '未繳帳單', value: 'unpaid' },
  { label: '已繳/歷史', value: 'history' },
  { label: '全部', value: 'all' },
  { label: '用電記錄', value: 'meter' },
];

// --- Data Fetching ---
onMounted(async () => {
  if (!authStore.user) return;

  try {
    const uid = authStore.user.uid;

    // 直接以 auth UID 查詢帳單（Financials 存的是 tenantId: tenant.uid）
    const qBills = query(
      collection(db, 'bills'),
      where('tenantId', '==', uid),
      where('type', '==', 'income'),
      orderBy('date', 'desc')
    );

    unsubscribe = onSnapshot(qBills, async (snapshot) => {
      bills.value = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          monthStr: data.date ? data.date.slice(0, 7).replace('-', '年 ') + '月' : '未知月份'
        } as Bill;
      });
      loading.value = false;

      // 載入房東銀行資訊（只需抓一次）
      if (!landlordBankInfo.value && snapshot.docs.length > 0) {
        const landlordId = snapshot.docs[0]!.data().landlordId;
        if (landlordId) {
          try {
            const landlordSnap = await getDoc(doc(db, 'users', landlordId));
            if (landlordSnap.exists()) {
              landlordBankInfo.value = landlordSnap.data().bankInfo || null;
            }
          } catch { /* silent */ }
        }
      }
    });

  } catch (error) {
    console.error("Error fetching bills:", error);
    loading.value = false;
  }
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

// 查詢用電記錄（切到 meter tab 時才載入）
const fetchMeterReadings = async () => {
  if (!authStore.user) return;
  meterLoading.value = true;
  try {
    const uid = authStore.user.uid;
    // 1. 從 contracts 取得 landlordId + roomNumber
    const contractQ = query(
      collection(db, 'contracts'),
      where('tenantId', '==', uid),
      where('status', '==', 'active'),
      limit(1)
    );
    const contractSnap = await getDocs(contractQ);
    if (contractSnap.empty) { meterLoading.value = false; return; }
    const contractData = contractSnap.docs[0]!.data();

    // 2. 從 rooms 取得 roomId
    const roomQ = query(
      collection(db, 'rooms'),
      where('landlordId', '==', contractData.landlordId),
      where('name', '==', contractData.roomNumber),
      limit(1)
    );
    const roomSnap = await getDocs(roomQ);
    if (roomSnap.empty) { meterLoading.value = false; return; }
    const roomId = roomSnap.docs[0]!.id;

    // 3. 查詢 meter_readings（前端排序避免 orderBy 索引問題）
    const meterQ = query(
      collection(db, 'meter_readings'),
      where('roomId', '==', roomId),
      limit(24)
    );
    const meterSnap = await getDocs(meterQ);
    // 依 yearMonth 或 periodEnd 降序排列（前端排序避免索引問題）
    const docs = meterSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    docs.sort((a, b) => {
      const ka = a.yearMonth || a.periodEnd || '';
      const kb = b.yearMonth || b.periodEnd || '';
      return kb.localeCompare(ka);
    });
    meterReadings.value = docs;
  } catch (err) {
    console.error('[Meter] 查詢失敗:', err);
  } finally {
    meterLoading.value = false;
  }
};

watch(currentTab, (tab) => {
  if (tab === 'meter' && meterReadings.value.length === 0) {
    fetchMeterReadings();
  }
}, { immediate: true });

// --- Computed ---
const filteredBills = computed(() => {
  return bills.value.filter(bill => {
    if (currentTab.value === 'all') return true;
    if (currentTab.value === 'unpaid') return bill.status === 'pending' || bill.status === 'overdue';
    if (currentTab.value === 'history') return bill.status === 'completed';
    return true;
  });
});

const summary = computed(() => {
  const unpaidBills = bills.value.filter(b => b.status === 'pending' || b.status === 'overdue');
  const lastPaid = bills.value.find(b => b.status === 'completed');
  // 找出最近的一筆未繳帳單的到期日
  const nextDue = unpaidBills.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];

  return {
    unpaidCount: unpaidBills.length,
    unpaidTotal: unpaidBills.reduce((sum, b) => sum + b.amount, 0),
    nextDueDate: nextDue?.dueDate || null,
    lastPaymentDate: lastPaid?.paymentDate || lastPaid?.date || '尚無紀錄'
  };
});

// --- UI Helpers ---
// 狀態對應 (DB Status -> UI Label)
const statusLabels = {
  completed: '已繳費',
  pending: '未繳費',
  overdue: '已逾期'
};

const statusStyles = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
};

const statusDotStyles = {
  completed: 'bg-green-500',
  pending: 'bg-blue-500',
  overdue: 'bg-red-500'
};

// --- Actions ---
const openModal = (bill: Bill) => {
  selectedBill.value = bill;
  showModal.value = true;
};

const handlePay = async (bill: Bill) => {
  if (confirm(`確定要繳納 ${bill.monthStr} 的帳單 NT$${bill.amount.toLocaleString()} 嗎？`)) {
     try {
       const billRef = doc(db, 'bills', bill.id);
       const today = new Date().toISOString().split('T')[0];
       
       await updateDoc(billRef, {
         status: 'completed',
         paymentDate: today,
         updatedAt: serverTimestamp()
       });
       
       toast.success('繳費成功！系統已更新狀態。');
       // selectedBill.value.status = 'completed'; // Snapshot 會自動更新，不需手動設
     } catch (e) {
       console.error(e);
       toast.error('繳費失敗，請檢查網路連線');
     }
  }
};

// 下載圖片功能
const downloadImage = async () => {
  if (!billReceiptRef.value) return;
  
  isGenerating.value = true;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(billReceiptRef.value, {
      backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
      scale: 2, 
      logging: false
    });

    const image = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = image;
    link.download = `帳單_${selectedBill.value?.monthStr || 'receipt'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error('截圖失敗:', error);
    toast.error('截圖失敗，請稍後再試');
  } finally {
    isGenerating.value = false;
  }
};
</script>