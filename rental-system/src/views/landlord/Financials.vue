<template>
  <div class="max-w-7xl mx-auto space-y-6" @click="closeDropdown">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          帳務管理
        </h1>
        <p class="text-text-secondary-light">查看您的收支報表與電費盈虧分析</p>
      </div>
      <div class="flex gap-3">
        <div class="relative">
          <input 
            type="month" 
            v-model="currentMonth"
            class="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 outline-none cursor-pointer hover:border-primary transition-colors"
          >
        </div>
        
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
                  v-if="item.status === 'completed'" 
                  class="inline-flex items-center gap-1 text-xs text-green-600 font-medium"
                >
                  <span class="material-symbols-outlined text-[14px]">check_circle</span> 已結清
                </span>
                <span 
                  v-else-if="item.status === 'pending'" 
                  class="inline-flex items-center gap-1 text-xs text-orange-500 font-medium"
                >
                  <span class="material-symbols-outlined text-[14px]">schedule</span> 待收款
                </span>
                 <span 
                  v-else 
                  class="inline-flex items-center gap-1 text-xs text-red-500 font-medium"
                >
                  <span class="material-symbols-outlined text-[14px]">warning</span> 逾期
                </span>
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
                   <p v-if="transactions.length > 0">本月 ({{ currentMonth }}) 尚無交易紀錄</p>
                   <p v-else>目前沒有相關紀錄</p>
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

        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button 
            @click="showModal = false"
            class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors"
          >
            取消
          </button>
          <button 
            @click="saveTransaction"
            class="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
          >
            儲存紀錄
          </button>
        </div>
      </div>
    </div>

    <div v-if="showTaipowerModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showTaipowerModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            登錄台電帳單
          </h2>
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
            <p class="text-xs text-gray-400 mt-1">* 系統將自動關聯該月與前一個月的租客電費收入。</p>
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
            <p class="text-xs text-text-secondary-light">僅保留最近 90 天內的變更</p>
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
                {{ new Date(record.modifiedAt).toLocaleString() }}
              </div>
              
              <div class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700 text-sm">
                <p class="font-bold mb-1">變更前版本：</p>
                <div class="space-y-1 text-text-secondary-light">
                   <p>金額: {{ record.data.amount }}</p>
                   <p>日期: {{ record.data.date }}</p>
                   <p>對象: {{ record.data.target }}</p>
                   <p>備註: {{ record.data.description }}</p>
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
import { ref, computed } from 'vue';

// --- Types ---
interface TransactionHistory {
  modifiedAt: string;
  data: Omit<Transaction, 'history'>;
}

interface Transaction {
  id: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
  target: string;
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'overdue';
  history?: TransactionHistory[];
}

interface TaipowerBill {
  id: number;
  month: string; // YYYY-MM
  amount: number;
  usage: number;
}

// --- Mock Data ---
const transactions = ref<Transaction[]>([
  { id: 1, date: '2025-10-05', type: 'income', category: '租金收入', target: 'A-101 陳小明', description: '10月份房租', amount: 12000, status: 'completed', history: [] },
  { id: 2, date: '2025-10-05', type: 'income', category: '電費', target: 'A-101 陳小明', description: '8-9月電費', amount: 1500, status: 'completed', history: [] },
  { id: 3, date: '2025-10-05', type: 'income', category: '電費', target: 'A-102 張志豪', description: '8-9月電費', amount: 1200, status: 'pending', history: [] },
  { id: 4, date: '2025-10-05', type: 'income', category: '電費', target: 'B-201 林美麗', description: '8-9月電費', amount: 2000, status: 'completed', history: [] },
  { id: 5, date: '2025-09-05', type: 'income', category: '租金收入', target: 'A-101', description: '9月房租', amount: 12000, status: 'completed', history: [] },
]);

const taipowerBills = ref<TaipowerBill[]>([
  { id: 1, month: '2025-10', amount: 4800, usage: 1200 }
]);

// --- State ---
const currentMonth = ref('2025-10'); // YYYY-MM
const currentTab = ref('all');
const showModal = ref(false);
const showTaipowerModal = ref(false);
const showHistoryModal = ref(false);
const isEditing = ref(false);
const editingId = ref<number | null>(null);
const activeMenuId = ref<number | null>(null);
const selectedHistory = ref<TransactionHistory[]>([]);

// --- Forms ---
const form = ref({
  type: 'income' as 'income' | 'expense',
  amount: undefined as number | undefined,
  date: new Date().toISOString().split('T')[0],
  category: '租金收入',
  target: '',
  description: ''
});

const taipowerForm = ref({
  month: '2025-10',
  amount: undefined as number | undefined,
  usage: undefined as number | undefined
});

// --- Computed ---
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
    if (currentTab.value === 'pending') return t.status === 'pending' || t.status === 'overdue';
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

const isEvenMonth = computed(() => {
  const parts = currentMonth.value.split('-');
  if (parts.length < 2) return false;
  // [修復] 加入 ! 告訴 TS 這裡一定有值 (因為前面檢查過長度了)
  const month = parseInt(parts[1]!);
  return month % 2 === 0;
});

const electricityStats = computed(() => {
  const defaultStats = {
    periodStr: '',
    estimated: 0,
    collected: 0,
    collectionRate: 0,
    taipowerBill: undefined as TaipowerBill | undefined,
    profit: 0,
    billCount: 0,
    statusLabel: ''
  };

  if (!isEvenMonth.value) return defaultStats;

  const parts = currentMonth.value.split('-');
  if (parts.length < 2) return defaultStats;

  // [修復] 加入 ! 告訴 TS 這裡一定有值
  const year = parseInt(parts[0]!);
  const month = parseInt(parts[1]!);
  
  const currentStr = currentMonth.value;
  const prevMonth = month - 1;
  const prevStr = `${year}-${prevMonth.toString().padStart(2, '0')}`;

  const elecTrans = transactions.value.filter(t => 
    (t.date.startsWith(currentStr) || t.date.startsWith(prevStr)) && 
    t.category === '電費'
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

// --- Tabs ---
const tabs = [
  { label: '全部交易', value: 'all' },
  { label: '收入', value: 'income' },
  { label: '支出', value: 'expense' },
  { label: '欠費/待收', value: 'pending' }
];

// --- Operations ---
const toggleMenu = (id: number) => {
  activeMenuId.value = activeMenuId.value === id ? null : id;
};
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
    description: ''
  };
  showModal.value = true;
};

const handleEdit = (item: Transaction) => {
  closeDropdown();
  isEditing.value = true;
  editingId.value = item.id;
  form.value = { ...item };
  showModal.value = true;
};

const handleDelete = (id: number) => {
  closeDropdown();
  if (confirm('確定要刪除？')) {
    const idx = transactions.value.findIndex(t => t.id === id);
    if (idx !== -1) transactions.value.splice(idx, 1);
  }
};

const saveTransaction = () => {
  if (!form.value.amount || !form.value.target) return alert('請填寫完整資訊');
  
  const newRecord = {
    id: editingId.value || Date.now(),
    ...form.value,
    status: isEditing.value ? transactions.value.find(t=>t.id===editingId.value)?.status : 'completed',
    history: isEditing.value ? [] : []
  } as Transaction;

  if (isEditing.value && editingId.value) {
    const idx = transactions.value.findIndex(t => t.id === editingId.value);
    if (idx !== -1) transactions.value[idx] = newRecord;
  } else {
    transactions.value.unshift(newRecord);
  }
  showModal.value = false;
};

// --- Taipower Operations ---
const openTaipowerModal = () => {
  taipowerForm.value.month = currentMonth.value;
  showTaipowerModal.value = true;
};

const saveTaipowerBill = () => {
  if (!taipowerForm.value.amount) return alert('請輸入金額');
  
  const existingIdx = taipowerBills.value.findIndex(b => b.month === taipowerForm.value.month);
  
  if (existingIdx !== -1) {
    const existingBill = taipowerBills.value[existingIdx];
    if (existingBill) {
      taipowerBills.value[existingIdx] = { 
        id: existingBill.id,
        month: taipowerForm.value.month,
        amount: taipowerForm.value.amount,
        usage: taipowerForm.value.usage || 0
      };
    }
  } else {
    taipowerBills.value.push({
      id: Date.now(),
      month: taipowerForm.value.month,
      amount: taipowerForm.value.amount,
      usage: taipowerForm.value.usage || 0
    });
  }
  
  transactions.value.unshift({
    id: Date.now() + 1,
    date: `${taipowerForm.value.month}-15`,
    type: 'expense',
    category: '台電帳單',
    target: '台灣電力公司',
    description: `${taipowerForm.value.month} 電費帳單`,
    amount: taipowerForm.value.amount,
    status: 'completed',
    history: []
  });

  showTaipowerModal.value = false;
};

const openHistory = (item: Transaction) => {
  closeDropdown();
  selectedHistory.value = item.history || [];
  showHistoryModal.value = true;
};
</script>

<style scoped>
.animation-fade-in { animation: fadeIn 0.1s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>