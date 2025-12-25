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

const generatePDF = async () => {
  downloading.value = true
  
  if (form.value.address && !addressList.value.includes(form.value.address)) {
    addressList.value.push(form.value.address)
  }

  try {
    // 1. 路徑修正為 generatePdf
    const res = await axios.post(
      `${apiBase}/generatePdf`, 
      {
        ...form.value,
        endDate: computedEndDate.value,
        today: formatROCDate(new Date()),
        templateType: 'Deposit',
      },
      { 
        responseType: 'arraybuffer',
        headers: { 'Content-Type': 'application/json' }
      }
    )

    let finalData = res.data;

    // 2. 加入 Mock.js 亂碼資料修復邏輯
    if (finalData && typeof finalData === 'object' && !(finalData instanceof ArrayBuffer)) {
        console.warn('檢測到 Mock.js 干擾，正在修復 PDF 資料...');
        const keys = Object.keys(finalData);
        const len = keys.length;
        const uint8Arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            uint8Arr[i] = finalData[i];
        }
        finalData = uint8Arr.buffer;
    }

    // 3. 使用修復後的 finalData 建立 Blob
    const blob = new Blob([finalData], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `訂金收據_${form.value.tenant}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    alert('PDF 下載失敗，請確認後端服務是否啟動')
    console.error(err)
  }
  downloading.value = false
}
</script>