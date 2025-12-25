<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          電子合約簽署
        </h1>
        <p class="text-text-secondary-light">填寫租賃資料並進行線上簽署，自動生成 PDF 合約</p>
      </div>
    </div>

    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      
      <div v-if="step === 1" class="p-6 md:p-8 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <h3 class="text-lg font-bold text-gray-700 dark:text-gray-200 border-b pb-2">房源資訊</h3>
            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">房號</label>
              <input 
                v-model="form.roomNo" 
                list="room-options" 
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
                placeholder="選擇或輸入房號" 
              />
              <datalist id="room-options">
                <option v-for="item in roomList" :key="item" :value="item" />
              </datalist>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">地址</label>
              <input 
                v-model="form.address" 
                list="address-options" 
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
                placeholder="完整地址" 
              />
              <datalist id="address-options">
                <option v-for="item in addressList" :key="item" :value="item" />
              </datalist>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">月租金</label>
                <input 
                  v-model="form.rentfee" 
                  type="number" 
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
                  placeholder="金額" 
                />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">押金</label>
                <input 
                  :value="form.deposit" 
                  type="text" 
                  readonly 
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-gray-50 text-gray-500 cursor-not-allowed transition-colors" 
                />
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <h3 class="text-lg font-bold text-gray-700 dark:text-gray-200 border-b pb-2">承租人資訊</h3>
            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">真實姓名</label>
              <input 
                v-model="form.tenant" 
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
                placeholder="承租人姓名" 
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">身分證/居留證號</label>
              <input 
                v-model="form.tenantId" 
                @blur="checkTenantId" 
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
                :class="{'border-red-500': tenantIdError}" 
                placeholder="證件號碼" 
              />
              <p v-if="tenantIdError" class="text-xs text-red-500 mt-1">{{ tenantIdError }}</p>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">聯絡電話</label>
              <input 
                v-model="form.tenantPhone" 
                @blur="checkTenantPhone" 
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
                :class="{'border-red-500': tenantPhoneError}" 
                placeholder="09xxxxxxxx" 
              />
              <p v-if="tenantPhoneError" class="text-xs text-red-500 mt-1">{{ tenantPhoneError }}</p>
            </div>
          </div>

          <div class="space-y-4 md:col-span-2">
            <h3 class="text-lg font-bold text-gray-700 dark:text-gray-200 border-b pb-2">租約期限與簽名</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">租期 (年)</label>
                <input 
                  v-model.number="form.duration" 
                  type="number" 
                  step="0.5" 
                  min="0.5" 
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
                />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">起租日</label>
                <input 
                  v-model="form.startDate" 
                  type="date" 
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors" 
                />
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">退租日 (自動計算)</label>
                <input 
                  :value="form.endDate" 
                  type="date" 
                  readonly 
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-gray-50 text-gray-500 transition-colors" 
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">承租人簽名</label>
              <div 
                class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl h-32 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative overflow-hidden"
                @click="showSignModal = true"
              >
                <img v-if="form.signature" :src="form.signature" class="h-full object-contain" />
                <div v-else class="text-center text-gray-400">
                  <span class="material-symbols-outlined text-3xl">draw</span>
                  <p class="text-sm">點擊此處進行簽名</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button 
            @click="showConfirm"
            class="px-6 py-3 bg-primary text-white rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 font-bold transition-all flex items-center"
          >
            下一步：預覽合約
            <span class="material-symbols-outlined ml-2">arrow_forward</span>
          </button>
        </div>
      </div>

      <div v-else-if="step === 2" class="p-6 md:p-8 flex flex-col h-[calc(100vh-200px)]">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">合約條款預覽</h3>
          <div class="text-sm text-gray-500">請仔細閱讀以下條款</div>
        </div>

        <div class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-4 shadow-inner">
          <Preview :form="form" />
        </div>

        <div class="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
          <div class="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <input 
              type="checkbox" 
              id="check" 
              v-model="isChecked" 
              class="w-5 h-5 text-primary rounded focus:ring-primary cursor-pointer"
            >
            <label for="check" class="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer select-none">
              我已詳細閱讀以上合約條款，並確認上述資料無誤。
            </label>
          </div>

          <div class="flex gap-4">
            <button 
              @click="step = 1"
              class="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              返回修改
            </button>
            <button 
              :disabled="!isChecked || loading"
              @click="submitContract"
              class="flex-1 py-3 bg-green-600 text-white rounded-xl shadow-lg shadow-green-500/30 hover:bg-green-700 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              <span v-if="loading" class="material-symbols-outlined animate-spin mr-2">sync</span>
              {{ loading ? '正在生成 PDF...' : '確認簽署並下載合約' }}
            </button>
          </div>
        </div>
      </div>

    </div>

    <Signature 
      v-model:visible="showSignModal" 
      @confirm="setSignature" 
    />

  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import Signature from '../../components/Signature.vue'
import Preview from '../../components/Preview.vue'

// 狀態
const step = ref(1)
const isChecked = ref(false)
const loading = ref(false)
const showSignModal = ref(false)
const tenantIdError = ref('');
const tenantPhoneError = ref('');

// 資料
const form = ref({
  roomNo: '', address: '', tenant: '', tenantId: '', tenantPhone: '',
  landlord: '王子建', landlordId: 'H124054268', landlordPhone: '0929511011', 
  rentfee: '', deposit: '', duration: '1', 
  startDate: getTodayString(), endDate: '', signature: '', 
  today: getTodayRoc()
})

// 選項 (Mock Data)
const roomList = ref([401, 402, 403, 501, 502, 503, 504])
const rentfeeList = ref([7000, 7000, 10000, 5500, 5500, 5000, 4000])
const addressList = ref([
  '基隆市中山區復興路389-3號',
  '桃園市桃園區復興路83號10樓'
])

// --- 邏輯 ---

// 房號連動租金
watch(() => form.value.roomNo, (val) => {
  const idx = roomList.value.findIndex(r => String(r) === String(val))
  if (idx !== -1) {
    form.value.rentfee = rentfeeList.value[idx]
  }
})

// 租金連動押金
watch(() => form.value.rentfee, (fee) => {
  const n = Number(fee)
  form.value.deposit = (!n || isNaN(n)) ? '' : n * 2
})

// 自動計算退租日
watch([() => form.value.startDate, () => form.value.duration], ([start, duration]) => {
  if (!start || !duration) {
    form.value.endDate = ''
    return
  }
  const date = new Date(start)
  const years = Math.floor(Number(duration))
  const months = Math.round((Number(duration) - years) * 12)
  
  date.setFullYear(date.getFullYear() + years)
  date.setMonth(date.getMonth() + months)
  date.setDate(date.getDate() - 1)

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  form.value.endDate = `${yyyy}-${mm}-${dd}`
}, { immediate: true })

const setSignature = (img) => { form.value.signature = img }

function getTodayRoc() {
  const d = new Date()
  return `${d.getFullYear() - 1911} 年 ${String(d.getMonth() + 1).padStart(2, '0')} 月 ${String(d.getDate()).padStart(2, '0')} 日`
}

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

function validateId(id) {
  const idReg = /^[A-Z][12]\d{8}$/i;
  const arcReg = /^[A-Z]{1,2}\d{8,9}$/i; // 簡化版居留證規則
  return idReg.test(id) || arcReg.test(id);
}

function checkTenantId() {
  if (form.value.tenantId && !validateId(form.value.tenantId)) {
    tenantIdError.value = '格式錯誤，請輸入正確身分證或居留證號';
  } else {
    tenantIdError.value = '';
  }
}

function validatePhone(phone) {
  const mobile = /^09\d{8}$/;
  const landline = /^0\d{1,2}-\d{6,8}$/;
  return mobile.test(phone) || landline.test(phone);
}

function checkTenantPhone() {
  if (form.value.tenantPhone && !validatePhone(form.value.tenantPhone)) {
    tenantPhoneError.value = '請輸入正確手機或市話號碼';
  } else {
    tenantPhoneError.value = '';
  }
}

function showConfirm() {
  const required = ['roomNo', 'address', 'tenant', 'rentfee', 'startDate', 'endDate']
  const missing = required.filter(k => !form.value[k])
  
  if (missing.length > 0) {
    alert('請確實填寫所有欄位')
    return
  }
  if (!form.value.signature) {
    alert('請完成簽名')
    return
  }
  step.value = 2
  isChecked.value = false
}

// PDF 生成 (需配合您的後端 API)
const apiBase = import.meta.env.VITE_API_BASE
const submitContract = async () => {
  loading.value = true
  try {
    const url = `${apiBase}/generatePdf`;
    console.log('API URL:', url);
    
    const res = await axios.post(
      url,
      { ...form.value, templateType: 'Contract' },
      { 
        responseType: 'arraybuffer', // 雖然 Mock.js 會無視它，但我們還是留著
        headers: { 'Content-Type': 'application/json' }
      }
    )

    let finalData = res.data;

    // --- [關鍵修復] 檢測並修復被 Mock.js 破壞的資料 ---
    // 如果回傳的不是 ArrayBuffer，而是一個類似 {"0":37, "1":80...} 的物件
    if (finalData && typeof finalData === 'object' && !(finalData instanceof ArrayBuffer)) {
        console.warn('檢測到 Mock.js 干擾，正在修復 PDF 資料...');
        
        // 取得資料長度
        const keys = Object.keys(finalData);
        const len = keys.length;
        
        // 建立一個新的 Uint8Array
        const uint8Arr = new Uint8Array(len);
        
        // 依序填入數據
        for (let i = 0; i < len; i++) {
            uint8Arr[i] = finalData[i];
        }
        
        // 將修復後的資料轉回 ArrayBuffer
        finalData = uint8Arr.buffer;
    }
    // ------------------------------------------------

    // 建立 Blob 物件 (這時候 finalData 才是正確的 ArrayBuffer)
    // 🔴 修正點：這裡原本寫 res.data，現在改為 finalData
    const blob = new Blob([finalData], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `租賃合約_${form.value.tenant}_${new Date().getTime()}.pdf`
    
    // 觸發下載
    document.body.appendChild(link)
    link.click()
    
    // 清理資源
    document.body.removeChild(link)
    window.URL.revokeObjectURL(link.href)

  } catch (e) {
    console.error('PDF 下載失敗:', e)
    
    // 如果後端回傳錯誤
    if (e.response && e.response.data) {
        const textDecoder = new TextDecoder()
        try {
          const errorMsg = textDecoder.decode(e.response.data)
          console.error('後端錯誤詳情:', errorMsg)
        } catch(decodeError) {
          console.error('無法解析錯誤訊息', decodeError)
        }
    }
    
    alert('PDF 下載失敗，請查看 Console')
  } finally {
    loading.value = false
  }
}
</script>