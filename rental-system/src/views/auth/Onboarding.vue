<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark">
    <div class="w-full max-w-2xl bg-white dark:bg-card-dark p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
      
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          {{ isLandlord ? '房東資料設定' : '租客資料設定' }}
        </h1>
        <p class="mt-2 text-text-secondary-light">請填寫您的詳細資料以完成設定</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">姓名</label>
            <input v-model="form.name" type="text" required class="form-input" placeholder="您的真實姓名">
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">手機號碼</label>
            <input v-model="form.phone" type="tel" required class="form-input" placeholder="0912345678">
          </div>
        </div>

        <div v-if="!isLandlord" class="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          <h3 class="text-lg font-semibold text-text-primary-light">租屋綁定</h3>
          
          <div class="flex items-start gap-3 mb-4">
            <input 
              v-model="form.noLandlordYet" 
              type="checkbox" 
              id="noLandlord"
              class="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            >
            <label for="noLandlord" class="text-sm text-text-secondary-light select-none">
              我還沒有所屬房東 (稍後再綁定)
            </label>
          </div>

          <div :class="{ 'opacity-50 pointer-events-none': form.noLandlordYet }">
            <label class="block text-sm font-medium text-text-secondary-light mb-1">所屬房東代碼</label>
            <input 
              v-model="form.landlordCode" 
              type="text" 
              :required="!form.noLandlordYet"
              class="form-input" 
              placeholder="請輸入房東提供的隨機碼"
            >
          </div>
        </div>

        <div v-if="isLandlord" class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-800 dark:text-blue-200">
          <p class="flex items-center gap-2">
            <span class="material-symbols-outlined text-lg">info</span>
            系統將自動為您產生一組唯一的房東代碼，供租客綁定使用。
          </p>
        </div>

        <div class="pt-6">
          <button 
            type="submit" 
            :disabled="submitting"
            class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30"
          >
            {{ submitting ? '資料建立中...' : '完成設定並進入系統' }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const authStore = useAuthStore();
const router = useRouter();

const isLandlord = computed(() => authStore.selectedRole === 'landlord');
const submitting = ref(false);

const form = ref({
  name: '',
  phone: '',
  landlordCode: '',
  noLandlordYet: false
});

// 生成隨機代碼 helper
const generateUniqueId = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 填入 Email 預設值
onMounted(() => {
  if (!authStore.user) {
    router.push({ name: 'Login' });
  }
});

const handleSubmit = async () => {
  if (!authStore.user) return;
  submitting.value = true;

  try {
    const uid = authStore.user.uid;
    const email = authStore.user.email;
    const role = authStore.selectedRole;
    
    // 準備要寫入的資料
    const userData: any = {
      uid,
      email,
      name: form.value.name,
      phone: form.value.phone,
      role,
      createdAt: new Date(),
    };

    if (role === 'landlord') {
      // 房東：產生唯一的房東代碼
      userData.landlordCode = generateUniqueId(8); 
    } else {
      // 租客：產生唯一的租客 ID
      userData.tenantId = generateUniqueId(10);
      if (!form.value.noLandlordYet) {
        userData.boundLandlordCode = form.value.landlordCode;
      }
    }

    // 寫入 Firestore
    await setDoc(doc(db, 'users', uid), userData);
    
    // 更新 Store 狀態
    authStore.userProfile = userData;

    // 導向 Dashboard
    router.push({ name: 'Dashboard' });

  } catch (e: any) {
    console.error(e);
    alert('設定失敗: ' + e.message);
  } finally {
    submitting.value = false;
  }
};
</script>