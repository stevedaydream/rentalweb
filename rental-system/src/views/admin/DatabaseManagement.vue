<template>
  <div class="max-w-7xl mx-auto space-y-8">
    
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">資料庫與測試數據管理</h1>
      <p class="text-gray-500">快速生成測試資料、模擬各種情境與系統維護</p>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span class="material-symbols-outlined text-purple-500">science</span>
          全域測試資料 (Global Test Data)
        </h3>
      </div>
      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 border border-gray-100 dark:border-gray-700 rounded-xl space-y-3">
          <h4 class="font-bold text-gray-800 dark:text-white">生成測試使用者</h4>
          <p class="text-xs text-gray-500">建立未綁定的全新房東或租客帳號 (Users Collection)</p>
          <div class="flex gap-3">
            <button 
              @click="generateGlobalUser('landlord')"
              :disabled="loading"
              class="flex-1 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors"
            >
              + 測試房東
            </button>
            <button 
              @click="generateGlobalUser('tenant')"
              :disabled="loading"
              class="flex-1 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm font-bold transition-colors"
            >
              + 測試租客
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 class="font-bold text-lg flex items-center gap-2 text-blue-800 dark:text-blue-200">
          <span class="material-symbols-outlined">person_pin</span>
          指定房東情境模擬
        </h3>
        
        <div class="flex items-center gap-2 w-full md:w-auto">
          <span class="text-sm text-gray-500 whitespace-nowrap">選擇目標房東:</span>
          <select v-model="selectedLandlordId" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm w-full md:w-64">
            <option value="" disabled>-- 請選擇 --</option>
            <option v-for="l in landlords" :key="l.id" :value="l.id">
              {{ l.name }} ({{ l.landlordCode }})
            </option>
          </select>
        </div>
      </div>
      
      <div v-if="selectedLandlordId" class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="space-y-3">
          <h4 class="font-bold text-sm text-gray-500 uppercase">基礎資料</h4>
          <button 
            @click="genRooms" 
            :disabled="loading" 
            class="flex items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm text-gray-700 dark:text-gray-300 gap-2 w-full"
          >
            <span class="material-symbols-outlined">meeting_room</span>
            生成 3~5 間測試房源
          </button>
          <button 
            @click="genTenants" 
            :disabled="loading" 
            class="flex items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm text-gray-700 dark:text-gray-300 gap-2 w-full"
          >
            <span class="material-symbols-outlined">group_add</span>
            生成測試租客 (綁定此房東)
          </button>
        </div>

        <div class="space-y-3">
           <h4 class="font-bold text-sm text-gray-500 uppercase">財務數據</h4>
           <button 
            @click="genMeterReadings" 
            :disabled="loading" 
            class="flex items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm text-gray-700 dark:text-gray-300 gap-2 w-full"
          >
            <span class="material-symbols-outlined">electric_meter</span>
            生成電表紀錄 (近 4 個月)
          </button>
           <button 
            @click="genBills" 
            :disabled="loading" 
            class="flex items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm text-gray-700 dark:text-gray-300 gap-2 w-full"
          >
            <span class="material-symbols-outlined">receipt_long</span>
            生成帳單 (3個月: 逾期/已繳/未繳)
          </button>
        </div>

        <div class="space-y-3">
           <h4 class="font-bold text-sm text-gray-500 uppercase">日常營運</h4>
           <button 
            @click="genRepairs" 
            :disabled="loading" 
            class="flex items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm text-gray-700 dark:text-gray-300 gap-2 w-full"
          >
            <span class="material-symbols-outlined">home_repair_service</span>
            生成隨機報修申請
          </button>
           <button 
            @click="genAnnouncements" 
            :disabled="loading" 
            class="flex items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm text-gray-700 dark:text-gray-300 gap-2 w-full"
          >
            <span class="material-symbols-outlined">campaign</span>
            生成測試公告
          </button>
        </div>
      </div>
      <div v-else class="p-12 text-center text-gray-400">
        <span class="material-symbols-outlined text-4xl mb-2">touch_app</span>
        <p>請先從上方選單選擇一位房東，以執行細部資料生成。</p>
      </div>
    </div>

    <div class="border-2 border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden bg-red-50/50 dark:bg-red-900/10">
      <div class="p-4 bg-red-100 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex items-center gap-2 text-red-800 dark:text-red-200">
        <span class="material-symbols-outlined">gpp_maybe</span>
        <h3 class="font-bold">危險操作區域 (Dangerous Zone)</h3>
      </div>
      
      <div class="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <button 
          class="flex flex-col items-center justify-center p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors font-bold text-sm"
          @click="refreshData"
        >
          <span class="material-symbols-outlined mb-1">sync</span>
          強制重新整理數據
        </button>
        
        <button 
          class="flex flex-col items-center justify-center p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors font-bold text-sm"
          @click="clearSystemLogs"
        >
           <span class="material-symbols-outlined mb-1">delete_history</span>
           清除系統日誌
        </button>

        <button 
          class="flex flex-col items-center justify-center p-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold text-sm"
          @click="deleteTestData"
        >
           <span class="material-symbols-outlined mb-1">delete_forever</span>
           刪除測試資料 (isTestData=true)
        </button>
        
         <button 
           class="flex flex-col items-center justify-center p-4 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors font-bold text-sm border-2 border-red-500"
           @click="nukeDatabase"
         >
           <span class="material-symbols-outlined mb-1 text-red-500 animate-pulse">dangerous</span>
           重置系統 (保留 Admin)
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { db } from '../../firebase/config';
import { 
  collection, getDocs, query, where, addDoc, 
  serverTimestamp, doc, setDoc, writeBatch
} from 'firebase/firestore';

// --- State ---
const loading = ref(false);
const landlords = ref<any[]>([]);
const selectedLandlordId = ref('');

// --- Init ---
onMounted(() => {
  fetchLandlords();
});

const fetchLandlords = async () => {
  const q = query(collection(db, 'users'), where('role', '==', 'landlord'));
  const snap = await getDocs(q);
  landlords.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// --- 1. Global Helpers ---
const generateGlobalUser = async (role: 'landlord' | 'tenant') => {
  loading.value = true;
  try {
    const fakeUid = `test_${role}_${Date.now()}`;
    const fakeCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    await setDoc(doc(db, 'users', fakeUid), {
      email: `${fakeUid}@example.com`,
      role: role,
      name: `測試${role === 'landlord' ? '房東' : '租客'} (Auto)`,
      landlordCode: role === 'landlord' ? fakeCode : null,
      boundLandlordCode: null,
      createdAt: serverTimestamp(),
      isTestData: true
    });
    alert(`已建立測試${role}，UID: ${fakeUid}`);
    if(role === 'landlord') fetchLandlords(); // Refresh dropdown
  } catch(e) { console.error(e); alert('失敗'); } 
  finally { loading.value = false; }
};

// --- 2. Targeted Generators ---

// 生成房間
const genRooms = async () => {
  if(!selectedLandlordId.value) return;
  loading.value = true;
  try {
    const batch = writeBatch(db);
    const roomsRef = collection(db, 'rooms');
    const floors = ['2', '3', '5'];
    
    for(let i=0; i<3; i++) {
        const newRef = doc(roomsRef);
        batch.set(newRef, {
            landlordId: selectedLandlordId.value,
            name: `測試公寓 ${floors[i]}0${i+1}`,
            address: `測試市中正路 ${100+i} 號`,
            price: 10000 + (i*500),
            status: 'vacant',
            layout: '獨立套房',
            size: 8 + i,
            createdAt: serverTimestamp(),
            isTestData: true
        });
    }
    await batch.commit();
    alert('已生成 3 間測試房間');
  } catch(e) { console.error(e); alert('失敗'); }
  finally { loading.value = false; }
};

// 生成租客 (手動管理名單)
const genTenants = async () => {
   if(!selectedLandlordId.value) return;
   loading.value = true;
   try {
     const batch = writeBatch(db);
     const ref = collection(db, 'tenants');
     
     for(let i=1; i<=3; i++) {
         batch.set(doc(ref), {
             landlordId: selectedLandlordId.value,
             name: `測試房客 No.${i}`,
             phone: `090000000${i}`,
             room: `測試房-${i}`,
             paymentStatus: 'normal',
             leaseStart: '2025-01-01',
             leaseEnd: '2025-12-31',
             createdAt: serverTimestamp(),
             isTestData: true
         });
     }
     await batch.commit();
     alert('已生成 3 位測試房客');
   } catch(e) { console.error(e); alert('失敗'); }
   finally { loading.value = false; }
};

// 生成電表紀錄 (4個月份)
const genMeterReadings = async () => {
  if(!selectedLandlordId.value) return;
  loading.value = true;
  try {
    // 先抓取該房東的房間
    const roomsQ = query(collection(db, 'rooms'), where('landlordId', '==', selectedLandlordId.value));
    const roomsSnap = await getDocs(roomsQ);
    if(roomsSnap.empty) return alert('此房東無房間，請先生成房間');

    const batch = writeBatch(db);
    const readingsRef = collection(db, 'meter_readings');
    const months = ['2025-01', '2025-02', '2025-03', '2025-04'];

    roomsSnap.forEach(room => {
        let lastReading = 1000;
        months.forEach(month => {
            const currentReading = lastReading + Math.floor(Math.random() * 200) + 50; 
            const usage = currentReading - lastReading;
            const cost = usage * 5; // [新增] 簡易計算費用：假設每度 5 元

            const docRef = doc(readingsRef);
            batch.set(docRef, {
                landlordId: selectedLandlordId.value,
                roomId: room.id,
                roomName: room.data().name,
                yearMonth: month,
                previousReading: lastReading,
                currentReading: currentReading,
                usage: usage,
                cost: cost,       // [新增] 寫入費用欄位，避免前端報錯
                status: 'completed',
                createdAt: serverTimestamp(), // 確保這裡是 createdAt
                isTestData: true
            });
            lastReading = currentReading;
        });
    });
    
    await batch.commit();
    alert(`已為 ${roomsSnap.size} 間房間生成 4 個月份電表紀錄`);
  } catch(e) { console.error(e); alert('失敗'); }
  finally { loading.value = false; }
};

// 生成帳單 (3個月不同狀況)
const genBills = async () => {
  if(!selectedLandlordId.value) return;
  loading.value = true;
  try {
    // 找 tenants
    const tenantsQ = query(collection(db, 'tenants'), where('landlordId', '==', selectedLandlordId.value));
    const tenantsSnap = await getDocs(tenantsQ);
    if(tenantsSnap.empty) return alert('請先生成租客');

    const batch = writeBatch(db);
    const billsRef = collection(db, 'bills');
    const scenarios = [
        { month: '2025-02', status: 'paid', label: '已繳清' },
        { month: '2025-03', status: 'unpaid', label: '本期未繳' },
        { month: '2025-04', status: 'overdue', label: '逾期欠費' }
    ];

    tenantsSnap.forEach(tenant => {
        scenarios.forEach(s => {
            const docRef = doc(billsRef);
            batch.set(docRef, {
                landlordId: selectedLandlordId.value,
                tenantId: tenant.id,
                tenantName: tenant.data().name,
                yearMonth: s.month,
                amount: 3000 + Math.floor(Math.random()*1000),
                status: s.status, // paid, unpaid, overdue
                dueDate: '2025-04-10',
                createdAt: serverTimestamp(),
                isTestData: true
            });
        });
    });

    await batch.commit();
    alert('已生成帳單測試資料 (3個月份)');
  } catch(e) { console.error(e); alert('失敗'); }
  finally { loading.value = false; }
};

// 生成報修
const genRepairs = async () => {
   if(!selectedLandlordId.value) return;
   loading.value = true;
   try {
     const issues = ['冷氣不冷', '馬桶堵塞', '燈泡壞了', '網路連不上'];
     const statuses = ['pending', 'processing', 'completed', 'rejected'];
     
     await addDoc(collection(db, 'repair_requests'), {
         landlordId: selectedLandlordId.value,
         tenantName: '測試租客 (Auto)',
         roomName: '測試房-Auto',
         issue: issues[Math.floor(Math.random() * issues.length)],
         description: '這是一個由系統生成的測試報修單。',
         status: statuses[Math.floor(Math.random() * statuses.length)],
         priority: 'normal',
         createdAt: serverTimestamp(),
         isTestData: true
     });
     alert('已生成一筆測試報修單');
   } catch(e) { console.error(e); alert('失敗'); }
   finally { loading.value = false; }
};

// 生成公告
const genAnnouncements = async () => {
    if(!selectedLandlordId.value) return;
    loading.value = true;
    try {
        await addDoc(collection(db, 'announcements'), {
            landlordId: selectedLandlordId.value,
            title: '【系統測試】停水通知',
            content: '這是測試公告：本週五將進行水塔清洗，請儲水備用。',
            target: 'all',
            createdAt: serverTimestamp(),
            isTestData: true
        });
        alert('已發布測試公告');
    } catch(e) { console.error(e); alert('失敗'); }
    finally { loading.value = false; }
};


// --- 3. Dangerous Actions ---
const refreshData = () => {
  window.location.reload();
};

const clearSystemLogs = () => {
  alert('模擬：系統日誌已清除 (需對接後端 Log 服務)');
};

const deleteTestData = async () => {
  const code = prompt('警告：這將刪除所有標記為 isTestData=true 的資料。\n包含：User, Room, Tenant, Bill, Meter, Repair...\n\n請輸入 "DELETE" 確認：');
  if(code !== 'DELETE') return;

  loading.value = true;
  try {
    const collectionsToCheck = ['users', 'rooms', 'tenants', 'bills', 'meter_readings', 'repair_requests', 'repairs', 'announcements'];
    let totalDeleted = 0;

    for (const colName of collectionsToCheck) {
        const q = query(collection(db, colName), where('isTestData', '==', true));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        totalDeleted += snap.size;
    }
    
    alert(`清理完成，共刪除 ${totalDeleted} 筆測試資料。`);
    fetchLandlords(); // Refresh UI
  } catch(e) {
    console.error(e);
    alert('刪除過程發生錯誤');
  } finally {
    loading.value = false;
  }
};

const clearLocalCache = () => {
  if(confirm('這將清除 localStorage 並登出，確定嗎？')) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  }
};

// [修改] 重置整個資料庫 (但保留 Admin)
const nukeDatabase = async () => {
  const code = prompt('【嚴重警告】此操作將刪除資料庫中「除了 Admin 以外」的所有資料！\n\n執行後：\n1. 所有房東、租客、房源、帳單等將被清空。\n2. 您 (Admin) 的帳號會被保留，無需重新登入。\n\n請輸入 "NUKE" 以確認執行：');
  
  if(code !== 'NUKE') {
    if(code !== null) alert('驗證碼錯誤，取消操作。');
    return;
  }

  if(!confirm('最後確認：您真的要重置系統嗎？')) return;

  loading.value = true;
  try {
    // 1. 定義要完全清空的集合 (不含 users)
    const collectionsToClear = [
      'rooms', 
      'tenants', 
      'bills', 
      'meter_readings', 
      'repair_requests', 
      'repairs', 
      'announcements', 
      'contracts'
    ];
    
    let totalDeleted = 0;
    const batchSize = 400; 
    
    // 2. 清空非 User 集合
    for (const colName of collectionsToClear) {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        
        let batch = writeBatch(db);
        let count = 0;

        for (const doc of snap.docs) {
           batch.delete(doc.ref);
           count++;
           totalDeleted++;

           if (count >= batchSize) {
             await batch.commit();
             batch = writeBatch(db);
             count = 0;
           }
        }
        if (count > 0) await batch.commit();
    }

    // 3. 處理 Users 集合 (保留 Admin)
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    let uBatch = writeBatch(db);
    let uCount = 0;
    
    for (const doc of usersSnap.docs) {
      const userData = doc.data();
      // [關鍵] 跳過 admin 角色
      if (userData.role === 'admin') {
        console.log(`Skipped admin: ${userData.name || doc.id}`);
        continue;
      }

      uBatch.delete(doc.ref);
      uCount++;
      totalDeleted++;

      if (uCount >= batchSize) {
        await uBatch.commit();
        uBatch = writeBatch(db);
        uCount = 0;
      }
    }
    if (uCount > 0) await uBatch.commit();
    
    alert(`系統重置成功！\n\n保留了管理員帳號，並刪除了 ${totalDeleted} 筆其他資料。\n請重新整理頁面以更新狀態。`);
    
    // 不執行登出，僅重新整理
    fetchLandlords();
    window.location.reload();

  } catch(e) {
    console.error(e);
    alert('重置過程發生錯誤，請檢查 Console。');
  } finally {
    loading.value = false;
  }
};
</script>