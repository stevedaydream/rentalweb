<template>
  <div class="max-w-4xl mx-auto space-y-6">
    
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          收據產生器
        </h1>
        <p class="text-text-secondary-light">快速產生訂金或租金收據 PDF</p>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 md:p-8">
      <form @submit.prevent="generatePDF" class="space-y-5">
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">房號</label>
            <div class="relative">
              <input 
                v-model="form.roomNo" 
                list="room-options" 
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
                placeholder="選擇房號" 
                required 
              />
              <datalist id="room-options">
                <option v-for="item in roomList" :key="item" :value="item" />
              </datalist>
            </div>
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">地址</label>
            <input 
              v-model="form.address" 
              list="address-options" 
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
              placeholder="地址" 
              required 
            />
            <datalist id="address-options">
              <option v-for="item in addressList" :key="item" :value="item" />
            </datalist>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">承租人姓名</label>
            <input 
              v-model="form.tenant" 
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
              placeholder="姓名" 
              required 
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">出租人姓名</label>
            <input 
              v-model="form.landlord" 
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
              placeholder="房東或代理人" 
              required 
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">定金金額</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">NT$</span>
            <input 
              v-model="form.deposit" 
              type="number" 
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors pl-12 text-lg font-bold" 
              placeholder="0" 
              required 
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">保留起算日</label>
            <input 
              v-model="form.startDate" 
              type="date" 
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
              required 
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">保留截止日 (自動+7天)</label>
            <input 
              :value="computedEndDate" 
              type="date" 
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-gray-50 text-gray-500 transition-colors" 
              readonly 
            />
          </div>
        </div>

        <div class="pt-4 flex justify-end">
          <button 
            type="submit" 
            :disabled="downloading"
            class="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center"
          >
            <span v-if="downloading" class="material-symbols-outlined animate-spin mr-2">sync</span>
            {{ downloading ? 'PDF 產生中...' : '下載 PDF 收據' }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
// [修改開始]：引入共用的 PDF 下載工具
import { downloadPdfFromBlob } from '../pdfHelper.js'
// [修改結束]

const downloading = ref(false)
const roomList = ref([401, 402, 403, 501, 502, 503, 504])
const addressList = ref([
  '基隆市中山區復興路389-3號',
  '桃園市桃園區復興路83號10樓'
])

const form = ref({
  roomNo: '',
  tenant: '',
  landlord: '王子建(Steve)',
  deposit: 1000,
  address: '',
  startDate: new Date().toISOString().split('T')[0]
})

const computedEndDate = computed(() => {
  if (!form.value.startDate) return ''
  const date = new Date(form.value.startDate)
  date.setDate(date.getDate() + 7)
  return date.toISOString().split('T')[0]
})

function formatROCDate(date) {
  const d = new Date(date)
  return `${d.getFullYear() - 1911}年${d.getMonth() + 1}月${d.getDate()}日`
}

const apiBase = import.meta.env.VITE_API_BASE

/**
 * 修改後的 PDF 產生函式
 * 增加了對回傳資料型態的檢查，避免下載到 Firebase 的 HTML 頁面
 */
const generatePDF = async () => {
  // [修改開始]
  downloading.value = true
  
  if (form.value.address && !addressList.value.includes(form.value.address)) {
    addressList.value.push(form.value.address)
  }

  try {
    const res = await axios.post(
      `${apiBase}/generatePdf`, 
      {
        ...form.value,
        endDate: computedEndDate.value,
        today: formatROCDate(new Date()),
        templateType: 'Deposit',
      },
      { 
        // 使用 blob 接收資料，方便 pdfHelper 處理
        responseType: 'blob', 
        headers: { 'Content-Type': 'application/json' }
      }
    )

    // 關鍵檢查：如果回傳的資料類型是 text/html，代表請求被 Firebase 導向了 index.html (通常是 API 路徑錯誤)
    if (res.data.type === 'text/html') {
      console.error('[PDF Error] 接收到 HTML 資料，而非 PDF 二進位檔。請檢查 VITE_API_BASE 是否設定正確。');
      throw new Error('伺服器設定錯誤：無法取得 PDF 檔案（接收到 HTML）。');
    }

    // 調用工具函式進行下載
    downloadPdfFromBlob(res.data, `訂金收據_${form.value.tenant}.pdf`);

  } catch (err) {
    const errorMsg = err.message || 'PDF 下載失敗，請確認後端服務是否啟動';
    alert(errorMsg);
    console.error('[PDF Helper Error]', err);
  } finally {
    downloading.value = false
  }
  // [修改結束]
}
</script>