<template>
  <div class="max-w-7xl mx-auto space-y-6" @click="closeDropdown">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          帳務管理
        </h1>
        <p class="text-text-secondary-light">查看您的收支報表與電費盈虧分析</p>
      </div>
      <div class="flex gap-3 flex-wrap">
        <div class="relative">
          <input 
            type="month" 
            v-model="currentMonth"
            class="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 outline-none cursor-pointer hover:border-primary transition-colors"
          >
        </div>
        
        <button 
          @click="generateMonthlyBills"
          :disabled="loading"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">magic_button</span>
          一鍵生成帳單
        </button>

        <button 
          @click="openTaipowerModal()"
          class="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2 text-yellow-500">electric_bolt</span>
          登錄台電帳單
        </button>

        <button 
          @click="openModal()"
          class="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">add_circle</span>
          記一筆
        </button>
      </div>
    </div>

    <div v-if="isEvenMonth" class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/30">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="font-bold text-lg text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <span class="material-symbols-outlined">analytics</span>
            電費盈虧分析 ({{ electricityStats.periodStr }})
          </h3>
          <p class="text-sm text-blue-700 dark:text-blue-300 opacity-80">雙月結算：比對台電帳單與租客實收金額</p>
        </div>
        <span class="px-3 py-1 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-300 rounded-full text-xs font-bold shadow-sm">
          {{ electricityStats.statusLabel }}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
          <p class="text-xs text-gray-500 font-bold uppercase mb-1">房東應收電費 (帳單總額)</p>
          <p class="text-2xl font-bold text-gray-800 dark:text-gray-100">NT$ {{ electricityStats.estimated.toLocaleString() }}</p>
          <p class="text-xs text-gray-400 mt-1">來自 {{ electricityStats.billCount }} 筆租客帳單</p>
        </div>

        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4 border-green-500">
          <p class="text-xs text-gray-500 font-bold uppercase mb-1">實際已收電費</p>
          <p class="text-2xl font-bold text-green-600">NT$ {{ electricityStats.collected.toLocaleString() }}</p>
          <p class="text-xs text-gray-400 mt-1">回收率 {{ electricityStats.collectionRate }}%</p>
        </div>

        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4 border-yellow-500 relative group">
          <p class="text-xs text-gray-500 font-bold uppercase mb-1">台電帳單金額</p>
          <div v-if="electricityStats.taipowerBill">
             <p class="text-2xl font-bold text-yellow-600">NT$ {{ electricityStats.taipowerBill.amount.toLocaleString() }}</p>
             <p class="text-xs text-gray-400 mt-1">用電 {{ electricityStats.taipowerBill.usage }} 度</p>
          </div>
          <div v-else class="flex flex-col h-full justify-center">
             <p class="text-sm text-gray-400 italic">尚未登錄帳單</p>
             <button @click="openTaipowerModal()" class="text-xs text-blue-500 hover:underline mt-1">立即登錄</button>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4" 
             :class="electricityStats.profit >= 0 ? 'border-blue-500' : 'border-red-500'">
          <p class="text-xs text-gray-500 font-bold uppercase mb-1">本期電費盈虧</p>
          <p class="text-2xl font-bold" :class="electricityStats.profit >= 0 ? 'text-blue-600' : 'text-red-500'">
            {{ electricityStats.profit >= 0 ? '+' : '' }}NT$ {{ electricityStats.profit.toLocaleString() }}
          </p>
          <p class="text-xs text-gray-400 mt-1">實收 - 台電支出</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <p class="text-sm text-text-secondary-light mb-1">本月總收入</p>
        <p class="text-2xl font-bold text-green-600">+ NT$ {{ stats.income.toLocaleString() }}</p>
      </div>
      <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <p class="text-sm text-text-secondary-light mb-1">本月總支出</p>
        <p class="text-2xl font-bold text-red-500">- NT$ {{ stats.expense.toLocaleString() }}</p>
      </div>
      <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <p class="text-sm text-text-secondary-light mb-1">本月淨利</p>
        <p class="text-2xl font-bold" :class="stats.net >= 0 ? 'text-primary' : 'text-red-500'">
          NT$ {{ stats.net.toLocaleString() }}
        </p>
      </div>
      <div class="p-5 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30 shadow-sm">
        <div class="flex justify-between items-start">
           <div>
             <p class="text-sm text-orange-800 dark:text-orange-200 mb-1">待收帳款 (逾期)</p>
             <p class="text-2xl font-bold text-orange-600">NT$ {{ stats.pending.toLocaleString() }}</p>
           </div>
           <span class="material-symbols-outlined text-orange-400 text-3xl">pending_actions</span>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-visible">
      
      <div class="flex items-center border-b border-gray-100 dark:border-gray-800 px-6 pt-2">
        <button 
          v-for="tab in tabs" 
          :key="tab.value"
          @click="currentTab = tab.value"
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors relative top-[1px]"
          :class="currentTab === tab.value ? 'border-primary text-primary' : 'border-transparent text-text-secondary-light hover:text-gray-600 dark:hover:text-gray-300'"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="overflow-x-auto min-h-[400px]">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="px-6 py-4">日期</th>
              <th class="px-6 py-4">類別</th>
              <th class="px-6 py-4">對象 / 房號</th>
              <th class="px-6 py-4">摘要</th>
              <th class="px-6 py-4 text-right">金額</th>
              <th class="px-6 py-4 text-center">狀態</th>
              <th class="px-6 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="item in filteredTransactions" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-text-secondary-light">{{ item.date }}</td>
              <td class="px-6 py-4">
                <span 
                  class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                  :class="item.category === '電費' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'"
                >
                  {{ item.category }}
                </span>
              </td>
              <td class="px-6 py-4 font-medium">{{ item.target }}</td>
              <td class="px-6 py-4 text-text-secondary-light max-w-xs truncate">{{ item.description }}</td>
              <td class="px-6 py-4 text-right font-bold" :class="item.type === 'income' ? 'text-green-600' : 'text-red-500'">
                {{ item.type === 'income' ? '+' : '-' }} {{ item.amount.toLocaleString() }}
              </td>
              <td class="px-6 py-4 text-center">
                <span 
                  class="inline-flex items-center gap-1 text-xs font-medium"
                  :class="statusStyles[item.status]"
                >
                  <span class="material-symbols-outlined text-[14px]">{{ statusIcons[item.status] }}</span> 
                  {{ statusLabels[item.status] }}
                </span>
                <div v-if="!item.tenantId && item.category === '租金收入'" class="text-[10px] text-gray-400 mt-1">(手動帳單)</div>
              </td>
              
              <td class="px-6 py-4 text-center relative">
                 <button 
                   @click.stop="toggleMenu(item.id)"
                   class="text-gray-400 hover:text-primary transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                   :class="{ 'bg-blue-50 text-primary': activeMenuId === item.id }"
                 >
                   <span class="material-symbols-outlined text-[20px]">more_vert</span>
                 </button>

                 <div 
                    v-if="activeMenuId === item.id"
                    class="absolute right-8 top-8 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden text-left animation-fade-in"
                    @click.stop
                 >
                    <button @click="handleEdit(item)" class="w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2">
                       <span class="material-symbols-outlined text-[18px]">edit</span> 編輯
                    </button>
                    <button @click="openHistory(item)" class="w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2">
                       <span class="material-symbols-outlined text-[18px]">history</span> 修改紀錄
                    </button>
                    <div class="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                    <button @click="handleDelete(item.id)" class="w-full px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2">
                       <span class="material-symbols-outlined text-[18px]">delete</span> 刪除
                    </button>
                 </div>
              </td>
            </tr>
            
            <tr v-if="filteredTransactions.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-text-secondary-light">
                 <div class="flex flex-col items-center">
                   <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">calendar_month</span>
                   <p>本月 ({{ currentMonth }}) 尚無交易紀錄</p>
                 </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ isEditing ? '編輯紀錄' : '新增收支紀錄' }}
          </h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div class="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button 
              @click="form.type = 'income'"
              class="flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2"
              :class="form.type === 'income' ? 'bg-white text-green-600 shadow-sm dark:bg-gray-700 dark:text-green-400' : 'text-gray-500 hover:text-gray-700'"
            >
              <span class="material-symbols-outlined text-[18px]">add</span> 收入
            </button>
            <button 
              @click="form.type = 'expense'"
              class="flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2"
              :class="form.type === 'expense' ? 'bg-white text-red-500 shadow-sm dark:bg-gray-700 dark:text-red-400' : 'text-gray-500 hover:text-gray-700'"
            >
              <span class="material-symbols-outlined text-[18px]">remove</span> 支出
            </button>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">金額</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">NT$</span>
              <input v-model.number="form.amount" type="number" class="form-input pl-10 text-lg font-bold" placeholder="0">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
               <label class="block text-sm font-medium text-text-secondary-light mb-1">日期</label>
               <input v-model="form.date" type="date" class="form-input">
            </div>
            <div>
               <label class="block text-sm font-medium text-text-secondary-light mb-1">類別</label>
               <select v-model="form.category" class="form-input">
                 <template v-if="form.type === 'income'">
                   <option>租金收入</option>
                   <option>電費</option>
                   <option>押金</option>
                   <option>其他收入</option>
                 </template>
                 <template v-else>
                   <option>台電帳單</option>
                   <option>修繕費</option>
                   <option>水電費</option>
                   <option>清潔費</option>
                   <option>退還押金</option>
                   <option>其他支出</option>
                 </template>
               </select>
            </div>
          </div>

          <div>
             <label class="block text-sm font-medium text-text-secondary-light mb-1">對象 (房號/租客)</label>
             <input v-model="form.target" type="text" class="form-input" placeholder="例如：A-101 陳小明">
          </div>

          <div>
             <label class="block text-sm font-medium text-text-secondary-light mb-1">摘要備註</label>
             <textarea v-model="form.description" class="form-input min-h-[80px]" placeholder="輸入備註說明..."></textarea>
          </div>
          
          <div v-if="isEditing">
             <label class="block text-sm font-medium text-text-secondary-light mb-1">狀態</label>
             <select v-model="form.status" class="form-input">
                <option value="pending">待收款/待付款</option>
                <option value="completed">已結清</option>
                <option value="overdue">逾期</option>
             </select>
          </div>

        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button @click="showModal = false" class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors">取消</button>
          <button @click="saveTransaction" class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors">儲存紀錄</button>
        </div>
      </div>
    </div>

    <div v-if="showTaipowerModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showTaipowerModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">登錄台電帳單</h2>
          <button @click="showTaipowerModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div class="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
             <span class="material-symbols-outlined text-[18px] mt-0.5">info</span>
             <p>通常台電為雙月抄表。請輸入帳單上的「計費期間」與「應繳總金額」。</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">計費月份 (迄月)</label>
            <input v-model="taipowerForm.month" type="month" class="form-input">
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">帳單金額</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">NT$</span>
              <input v-model.number="taipowerForm.amount" type="number" class="form-input pl-10 text-lg font-bold" placeholder="0">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">總用電度數</label>
            <input v-model.number="taipowerForm.usage" type="number" class="form-input" placeholder="0">
          </div>
        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button @click="showTaipowerModal = false" class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100">取消</button>
          <button @click="saveTaipowerBill" class="px-5 py-2 rounded-xl bg-yellow-500 text-white font-bold shadow-lg hover:bg-yellow-600 transition-colors">儲存帳單</button>
        </div>
      </div>
    </div>

    <div v-if="showHistoryModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showHistoryModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">修改紀錄</h2>
            <p class="text-xs text-text-secondary-light">系統自動保留變更前的資料快照</p>
          </div>
          <button @click="showHistoryModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-4">
          <div v-if="selectedHistory.length === 0" class="text-center text-text-secondary-light py-8">
            <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">history_toggle_off</span>
            <p>此筆資料尚無修改紀錄</p>
          </div>

          <div v-else class="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-6">
            <div v-for="(record, index) in selectedHistory" :key="index" class="relative pl-6">
              <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-500"></div>
              
              <div class="text-xs text-text-secondary-light mb-1">
                {{ record.modifiedAt ? new Date(record.modifiedAt).toLocaleString() : '未知時間' }}
              </div>
              
              <div class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700 text-sm">
                <p class="font-bold mb-1">變更前版本：</p>
                <div class="space-y-1 text-text-secondary-light">
                   <p>金額: {{ record.data.amount }}</p>
                   <p>日期: {{ record.data.date }}</p>
                   <p>對象: {{ record.data.target }}</p>
                   <p>備註: {{ record.data.description }}</p>
                   <p>狀態: {{ statusLabels[record.data.status] }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../stores/auth'; // [修正] 引入 Auth
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  getDocs,
  query,
  orderBy,
  where // [修正] 引入 where
} from 'firebase/firestore';

// --- Types ---
interface TransactionHistory {
  modifiedAt: string;
  data: any;
}

// [修改] 擴充 Transaction 介面，加入 relatedUsageId
interface Transaction {
  id: string; 
  date: string;
  type: 'income' | 'expense';
  category: string;
  target: string;
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'overdue';
  history?: TransactionHistory[];
  tenantId?: string; 
  landlordId?: string; 
  relatedUsageId?: string; // [新增] 用於關聯抄表紀錄 ID，防止重複
  createdAt?: any;
}

interface TaipowerBill {
  id: string;
  month: string; 
  amount: number;
  usage: number;
  landlordId?: string; // [新增]
}

// --- State ---
const authStore = useAuthStore(); // [新增]
const transactions = ref<Transaction[]>([]);
const taipowerBills = ref<TaipowerBill[]>([]);
const loading = ref(true);

const currentMonth = ref(new Date().toISOString().slice(0, 7));
const currentTab = ref('all');
const showModal = ref(false);
const showTaipowerModal = ref(false);
const showHistoryModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const activeMenuId = ref<string | null>(null);
const selectedHistory = ref<TransactionHistory[]>([]);

// --- Forms ---
const form = ref<any>({
  type: 'income',
  amount: undefined,
  date: '',
  category: '租金收入',
  target: '',
  description: '',
  status: 'pending'
});

const taipowerForm = ref({
  month: currentMonth.value,
  amount: undefined as number | undefined,
  usage: undefined as number | undefined
});

// --- Firestore Integration ---

onMounted(() => {
  if (!authStore.user) return; // 安全檢查
  const uid = authStore.user.uid;

  // 1. 監聽帳務集合 (Bills) - [修正] 增加 landlordId 篩選
  const qBills = query(
    collection(db, 'bills'), 
    where('landlordId', '==', uid),
    orderBy('date', 'desc')
  );
  
  onSnapshot(qBills, (snapshot) => {
    transactions.value = snapshot.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    } as Transaction));
    loading.value = false;
  });

  // 2. 監聽台電帳單集合 - [修正] 增加 landlordId 篩選
  const qTaipower = query(
    collection(db, 'taipower_bills'), 
    where('landlordId', '==', uid),
    orderBy('month', 'desc')
  );
  
  onSnapshot(qTaipower, (snapshot) => {
    taipowerBills.value = snapshot.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    } as TaipowerBill));
  });
});

// --- Logic: 一鍵生成本月帳單 ---
// [修改開頭] - 修改 generateMonthlyBills 函式以包含電費歷史整合
const generateMonthlyBills = async () => {
  if (!authStore.user) return;
  if (!confirm(`確定要為所有在租房客產生 ${currentMonth.value} 月份的租金與電費帳單嗎？`)) return;
  
  loading.value = true;
  try {
    const uid = authStore.user.uid;
    const dueDate = `${currentMonth.value}-05`; // 預設每月5號繳費

    // --- 步驟 1: 準備資料來源 (房客 + 電費抄表紀錄) ---
    
    // A. 獲取房客資料 (用於租金與比對電費歸屬)
    const qTenants = query(collection(db, 'tenants'), where('landlordId', '==', uid));
    
    // B. 獲取本月電費抄表紀錄 (用於電費)
    // 假設抄表紀錄集合為 'meter_readings'，且我們抓取 "計費迄日 (periodEnd)" 落在本月的紀錄
    const startOfMonth = `${currentMonth.value}-01`;
    const endOfMonth = `${currentMonth.value}-31`;
    
    const qReadings = query(
      collection(db, 'meter_readings'), 
      where('periodEnd', '>=', startOfMonth),
      where('periodEnd', '<=', endOfMonth)
    );

    // 平行讀取兩份資料
    const [tenantsSnap, readingsSnap] = await Promise.all([
      getDocs(qTenants),
      getDocs(qReadings)
    ]);
    
    // 轉換資料方便後續操作
    const tenants = tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const readings = readingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let count = 0;
    const batchPromises: Promise<any>[] = [];

    // --- 步驟 2: 處理租金帳單 (原有邏輯) ---
    tenants.forEach((tenant: any) => {
      // 檢查是否已存在「租金」帳單
      const exists = transactions.value.some(t => 
        (t.tenantId === tenant.uid || t.target.includes(tenant.name)) && 
        t.date.startsWith(currentMonth.value) && 
        t.category === '租金收入'
      );
      
      if (!exists) {
        count++;
        batchPromises.push(addDoc(collection(db, 'bills'), {
          tenantId: tenant.uid || null,
          relatedTenantDocId: tenant.id,
          landlordId: uid,
          date: `${currentMonth.value}-01`,
          type: 'income',
          category: '租金收入',
          target: `${tenant.room} ${tenant.name}`,
          description: `${currentMonth.value} 月份房租`,
          amount: Number(tenant.rent) || Number(tenant.monthlyRent) || 0,
          status: 'pending',
          dueDate: dueDate,
          history: [],
          createdAt: serverTimestamp()
        }));
      }
    });

    // --- 步驟 3: 處理電費帳單 (新增邏輯) ---
    readings.forEach((reading: any) => {
      // 1. 檢查是否已存在這筆「電費」帳單 (透過 relatedUsageId 絕對比對)
      const exists = transactions.value.some(t => 
        t.relatedUsageId === reading.id
      );

      // 2. 為了安全，確保這筆抄表的房間屬於目前房東的房客 (比對房號)
      // 若您的 meter_readings 沒存 landlordId，這步很重要
      const matchedTenant: any = tenants.find((t: any) => t.room === reading.roomName);

      if (!exists && reading.cost > 0) { // 金額大於 0 才產生
        count++;
        batchPromises.push(addDoc(collection(db, 'bills'), {
          tenantId: matchedTenant ? matchedTenant.uid : null, // 若比對到租客，寫入 ID
          relatedTenantDocId: matchedTenant ? matchedTenant.id : null,
          relatedUsageId: reading.id, // 關鍵：標記來源抄表 ID，防止重複
          landlordId: uid,
          date: reading.periodEnd, // 帳單日期設為抄表截止日
          type: 'income',
          category: '電費', // 分類設為電費
          target: matchedTenant ? `${reading.roomName} ${matchedTenant.name}` : reading.roomName,
          description: `${currentMonth.value} 電費 (${reading.periodStart}~${reading.periodEnd} 用電 ${reading.usage}度)`,
          amount: Number(reading.cost) || 0,
          status: 'pending',
          dueDate: dueDate,
          history: [],
          createdAt: serverTimestamp()
        }));
      }
    });

    await Promise.all(batchPromises);
    
    if (count > 0) {
      alert(`成功產生 ${count} 筆帳單（含租金與電費）！`);
    } else {
      alert('本月租金與電費帳單皆已存在，無須新增。');
    }

  } catch (error) {
    console.error('Generate bills error:', error);
    alert('產生失敗，請確認網路連線或稍後再試');
  } finally {
    loading.value = false;
  }
};

// --- Logic: CRUD Operations ---

const saveTransaction = async () => {
  if (!authStore.user) return;
  if (!form.value.amount && form.value.amount !== 0) return alert('請填寫金額'); // 允許 0
  if (!form.value.target || !form.value.date) return alert('請填寫完整資訊');
  
  try {
    const payload = {
       ...form.value,
       landlordId: authStore.user.uid, // [修正] 強制寫入房東 ID
       updatedAt: serverTimestamp()
    };

    if (isEditing.value && editingId.value) {
      // 編輯模式：備份舊資料
      const oldDoc = transactions.value.find(t => t.id === editingId.value);
      const historyRecord = {
        modifiedAt: new Date().toISOString(),
        data: { ...oldDoc }
      };
      
      delete historyRecord.data.history;
      delete historyRecord.data.id;

      const docRef = doc(db, 'bills', editingId.value);
      const newHistory = [historyRecord, ...(oldDoc?.history || [])];

      await updateDoc(docRef, {
        ...payload,
        history: newHistory
      });
    } else {
      // 新增模式
      await addDoc(collection(db, 'bills'), {
        ...payload,
        history: [],
        createdAt: serverTimestamp()
      });
    }
    showModal.value = false;
  } catch (e) {
    console.error(e);
    alert('儲存失敗');
  }
};

const handleDelete = async (id: string) => {
  closeDropdown();
  if (confirm('確定要刪除此筆紀錄？此操作無法復原。')) {
    try {
      await deleteDoc(doc(db, 'bills', id));
    } catch (e) {
      alert('刪除失敗');
    }
  }
};

const saveTaipowerBill = async () => {
  if (!authStore.user) return;
  if (!taipowerForm.value.amount) return alert('請輸入金額');
  
  try {
    // 1. 儲存台電帳單資料
    await addDoc(collection(db, 'taipower_bills'), {
      ...taipowerForm.value,
      landlordId: authStore.user.uid, // [修正]
      createdAt: serverTimestamp()
    });

    // 2. 自動記一筆支出
    await addDoc(collection(db, 'bills'), {
      date: `${taipowerForm.value.month}-15`,
      type: 'expense',
      category: '台電帳單',
      target: '台灣電力公司',
      description: `${taipowerForm.value.month} 電費帳單`,
      amount: taipowerForm.value.amount,
      landlordId: authStore.user.uid, // [修正]
      status: 'completed',
      history: [],
      createdAt: serverTimestamp()
    });

    showTaipowerModal.value = false;
    alert('台電帳單登錄成功');
  } catch (e) {
    alert('操作失敗');
  }
};

// --- Computed & Helpers ---

const monthlyTransactions = computed(() => {
  return transactions.value.filter(t => t.date.startsWith(currentMonth.value));
});

const stats = computed(() => {
  let income = 0;
  let expense = 0;
  let pending = 0;

  monthlyTransactions.value.forEach(t => {
    if (t.type === 'income') {
      if (t.status === 'completed') income += t.amount;
      else pending += t.amount; 
    } else {
      expense += t.amount;
    }
  });

  return { income, expense, net: income - expense, pending };
});

const filteredTransactions = computed(() => {
  return monthlyTransactions.value.filter(t => {
    if (currentTab.value === 'all') return true;
    if (currentTab.value === 'income') return t.type === 'income';
    if (currentTab.value === 'expense') return t.type === 'expense';
    if (currentTab.value === 'pending') return ['pending', 'overdue'].includes(t.status);
    return true;
  });
});

// 電費雙月分析邏輯
const isEvenMonth = computed(() => {
  const parts = currentMonth.value.split('-');
  if (parts.length < 2) return false;
  return parseInt(parts[1] || '0') % 2 === 0;
});

const electricityStats = computed(() => {
  const defaultStats = {
    periodStr: '', estimated: 0, collected: 0, collectionRate: 0,
    taipowerBill: undefined as TaipowerBill | undefined, profit: 0, billCount: 0, statusLabel: ''
  };

  if (!isEvenMonth.value) return defaultStats;

  const parts = currentMonth.value.split('-');
  const year = parseInt(parts[0] || '0');
  const month = parseInt(parts[1] || '0');
  // 本月
  const currentStr = currentMonth.value;
  // 前一個月 (處理跨年)
  const prevDate = new Date(year, month - 2, 1); 
  const prevStr = prevDate.toISOString().slice(0, 7);

  // 篩選這兩個月的所有「電費」收入
  const elecTrans = transactions.value.filter(t => 
    (t.date.startsWith(currentStr) || t.date.startsWith(prevStr)) && 
    t.category === '電費' && t.type === 'income'
  );

  const estimated = elecTrans.reduce((sum, t) => sum + t.amount, 0);
  const collected = elecTrans.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
  
  const bill = taipowerBills.value.find(b => b.month === currentStr);
  const profit = collected - (bill ? bill.amount : 0);
  
  return {
    periodStr: `${prevStr} ~ ${currentStr}`,
    estimated,
    collected,
    collectionRate: estimated > 0 ? Math.round((collected / estimated) * 100) : 0,
    taipowerBill: bill,
    profit,
    billCount: elecTrans.length,
    statusLabel: bill ? '已結算' : '等待帳單'
  };
});

// --- UI Actions ---
const tabs = [
  { label: '全部交易', value: 'all' },
  { label: '收入', value: 'income' },
  { label: '支出', value: 'expense' },
  { label: '欠費/待收', value: 'pending' }
];

const statusLabels: any = { completed: '已結清', pending: '待收款', overdue: '逾期' };
const statusStyles: any = {
  completed: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  pending: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  overdue: 'text-red-600 bg-red-50 dark:bg-red-900/20'
};
const statusIcons: any = { completed: 'check_circle', pending: 'schedule', overdue: 'warning' };

const toggleMenu = (id: string) => { activeMenuId.value = activeMenuId.value === id ? null : id; };
const closeDropdown = () => { activeMenuId.value = null; };

const openModal = () => {
  isEditing.value = false;
  editingId.value = null;
  form.value = {
    type: 'income',
    amount: undefined,
    date: `${currentMonth.value}-01`,
    category: '租金收入',
    target: '',
    description: '',
    status: 'pending'
  };
  showModal.value = true;
};

const handleEdit = (item: Transaction) => {
  closeDropdown();
  isEditing.value = true;
  editingId.value = item.id;
  form.value = { ...item }; // Copy data
  showModal.value = true;
};

const openHistory = (item: Transaction) => {
  closeDropdown();
  selectedHistory.value = item.history || [];
  showHistoryModal.value = true;
};

const openTaipowerModal = () => {
  taipowerForm.value.month = currentMonth.value;
  showTaipowerModal.value = true;
};
</script>

<style scoped>
.animation-fade-in {
  animation: fadeIn 0.15s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>