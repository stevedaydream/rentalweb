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
            <select
              v-model="form.roomNo"
              @change="onRoomSelect(form.roomNo)"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors"
              required
            >
              <option value="" disabled>選擇房號</option>
              <option v-for="r in rooms" :key="r.id" :value="r.name">{{ r.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">地址</label>
            <input
              v-model="form.address"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 transition-colors"
              placeholder="地址（選擇房號後自動帶入）"
              required
            />
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
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, auth } from '../../firebase/config'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { downloadPdfFromBlob } from '../pdfHelper.js'

const toast = useToastStore()
const authStore = useAuthStore()
const downloading = ref(false)

// rooms loaded from Firestore: { id, name, address, tenantName }
const rooms = ref([])

async function loadRooms(uid) {
  if (!uid) return
  try {
    const q = query(collection(db, 'rooms'), where('landlordId', '==', uid))
    const snap = await getDocs(q)
    rooms.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('載入房間失敗', e)
  }
}

const form = ref({
  roomNo: '',
  tenant: '',
  landlord: '',
  deposit: 1000,
  address: '',
  startDate: new Date().toISOString().split('T')[0]
})

watch(() => authStore.effectiveUid, uid => {
  if (uid) loadRooms(uid)
}, { immediate: true })

// When landlord profile loads, fill landlord name
watch(() => authStore.userProfile, profile => {
  if (profile?.name) form.value.landlord = profile.name
}, { immediate: true })

// When room is selected, auto-fill address and tenant
function onRoomSelect(roomName) {
  const r = rooms.value.find(x => x.name === roomName)
  if (!r) return
  form.value.address = r.address || ''
  form.value.tenant = r.tenantName || ''
}

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
  try {
    const token = await auth.currentUser?.getIdToken()
    const res = await axios.post(
      `${apiBase}/generatePdf`,
      {
        ...form.value,
        endDate: computedEndDate.value,
        today: formatROCDate(new Date()),
        templateType: 'Deposit',
      },
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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
    toast.error(errorMsg);
    console.error('[PDF Helper Error]', err);
  } finally {
    downloading.value = false
  }
  // [修改結束]
}
</script>