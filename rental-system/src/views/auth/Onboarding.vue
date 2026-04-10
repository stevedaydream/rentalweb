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
            <input
              v-model="form.name"
              type="text"
              required
              @blur="validateName"
              :class="['form-input', nameError ? '!border-red-400 dark:!border-red-500' : '']"
              placeholder="您的真實姓名"
            >
            <p v-if="nameError" class="mt-1 text-xs text-red-500">{{ nameError }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">手機號碼</label>
            <input
              v-model="form.phone"
              type="tel"
              required
              @blur="validatePhone"
              :class="['form-input', phoneError ? '!border-red-400 dark:!border-red-500' : '']"
              placeholder="0912345678"
            >
            <p v-if="phoneError" class="mt-1 text-xs text-red-500">{{ phoneError }}</p>
          </div>
        </div>

        <!-- 租客：房東代碼（必填，有即時驗證） -->
        <div v-if="!isLandlord" class="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          <div>
            <h3 class="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">綁定房東</h3>
            <p class="text-sm text-text-secondary-light mt-0.5">請輸入房東提供給您的專屬代碼</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">房東代碼</label>
            <div class="relative">
              <input
                v-model="form.landlordCode"
                type="text"
                required
                @input="onLandlordCodeInput"
                @blur="validateLandlordCode"
                :class="[
                  'form-input pr-10',
                  landlordCodeError ? '!border-red-400 dark:!border-red-500' : '',
                  landlordFound ? '!border-green-400 dark:!border-green-500' : ''
                ]"
                placeholder="例如：AB1C2D3E"
                maxlength="8"
                style="text-transform: uppercase"
              >
              <!-- 驗證狀態 icon -->
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <div v-if="landlordChecking" class="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span v-else-if="landlordFound" class="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                <span v-else-if="landlordCodeError" class="material-symbols-outlined text-red-400 text-[20px]">error</span>
              </div>
            </div>

            <!-- 找到房東的確認訊息 -->
            <div v-if="landlordFound" class="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <span class="material-symbols-outlined text-[16px]">person_check</span>
              找到房東：<span class="font-bold">{{ landlordName }}</span>
            </div>
            <p v-else-if="landlordCodeError" class="mt-1 text-xs text-red-500">{{ landlordCodeError }}</p>
            <p v-else class="mt-1 text-xs text-text-secondary-light">代碼由房東提供，輸入後會自動驗證</p>
          </div>

          <!-- 找房提示 -->
          <div class="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            <span class="material-symbols-outlined text-[18px] mt-0.5 shrink-0">info</span>
            <span>還沒確定要租哪間？可以先<router-link to="/explore" class="font-bold underline">瀏覽空置房間</router-link>，和房東聯繫後再來完成設定。</span>
          </div>
        </div>

        <!-- 房東：說明 -->
        <div v-if="isLandlord" class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-800 dark:text-blue-200">
          <p class="flex items-center gap-2">
            <span class="material-symbols-outlined text-lg">info</span>
            系統將自動為您產生一組唯一的房東代碼，供租客綁定使用。
          </p>
        </div>

        <div class="pt-6">
          <button
            type="submit"
            :disabled="submitting || (!isLandlord && !landlordFound)"
            class="w-full py-3 px-4 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-gold-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ submitting ? '資料建立中...' : '完成設定並進入系統' }}
          </button>
          <p v-if="!isLandlord && !landlordFound" class="text-center text-xs text-text-secondary-light mt-2">
            請先輸入並驗證房東代碼
          </p>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { useRouter } from 'vue-router';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

const authStore = useAuthStore();
const router = useRouter();
const toast = useToastStore();

const isLandlord = computed(() => authStore.selectedRole === 'landlord');
const submitting = ref(false);

const nameError = ref('');
const phoneError = ref('');
const landlordCodeError = ref('');
const landlordChecking = ref(false);
const landlordFound = ref(false);
const landlordName = ref('');
const landlordUid = ref('');
let codeCheckTimer: ReturnType<typeof setTimeout> | null = null;

const validateName = () => {
  if (!form.value.name.trim()) { nameError.value = '姓名為必填'; return false; }
  if (form.value.name.trim().length < 2) { nameError.value = '姓名至少需要 2 個字元'; return false; }
  nameError.value = '';
  return true;
};

const validatePhone = () => {
  if (!form.value.phone) { phoneError.value = '手機號碼為必填'; return false; }
  if (!/^09\d{8}$/.test(form.value.phone)) { phoneError.value = '請輸入有效的手機號碼（格式：09XXXXXXXX）'; return false; }
  phoneError.value = '';
  return true;
};

const checkLandlordCode = async (code: string) => {
  if (!code || code.length < 6) {
    landlordFound.value = false;
    landlordName.value = '';
    landlordCodeError.value = '';
    return;
  }

  landlordChecking.value = true;
  landlordFound.value = false;
  landlordCodeError.value = '';

  try {
    const q = query(
      collection(db, 'users'),
      where('landlordCode', '==', code.toUpperCase()),
      where('role', '==', 'landlord')
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      landlordFound.value = true;
      landlordUid.value = snap.docs[0]!.id;
      landlordName.value = snap.docs[0]!.data().name || '（未知）';
      landlordCodeError.value = '';
    } else {
      landlordFound.value = false;
      landlordUid.value = '';
      landlordName.value = '';
      landlordCodeError.value = '找不到此房東代碼，請確認代碼是否正確';
    }
  } catch {
    landlordCodeError.value = '驗證時發生錯誤，請稍後再試';
  } finally {
    landlordChecking.value = false;
  }
};

const onLandlordCodeInput = () => {
  landlordFound.value = false;
  landlordCodeError.value = '';
  if (codeCheckTimer) clearTimeout(codeCheckTimer);
  codeCheckTimer = setTimeout(() => {
    checkLandlordCode(form.value.landlordCode);
  }, 500);
};

const validateLandlordCode = () => {
  if (!isLandlord.value) {
    if (!form.value.landlordCode.trim()) {
      landlordCodeError.value = '請輸入房東代碼';
      return false;
    }
    if (!landlordFound.value) {
      if (!landlordChecking.value) {
        checkLandlordCode(form.value.landlordCode);
      }
      return false;
    }
  }
  return true;
};

const form = ref({
  name: '',
  phone: '',
  landlordCode: '',
});

const generateUniqueId = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

onMounted(() => {
  if (!authStore.user) {
    router.push({ name: 'Login' });
  }
});

const handleSubmit = async () => {
  if (!authStore.user) return;
  const valid = validateName() && validatePhone();
  if (!valid) return;

  // 租客必須通過房東代碼驗證
  if (!isLandlord.value && !landlordFound.value) {
    await checkLandlordCode(form.value.landlordCode);
    if (!landlordFound.value) return;
  }

  submitting.value = true;

  try {
    const uid = authStore.user.uid;
    const email = authStore.user.email;
    const role = authStore.selectedRole;

    const userData: any = {
      uid,
      email,
      name: form.value.name,
      phone: form.value.phone,
      role,
      createdAt: new Date(),
    };

    if (role === 'landlord') {
      userData.landlordCode = generateUniqueId(8);
    } else {
      userData.tenantId = generateUniqueId(10);
      userData.boundLandlordCode = form.value.landlordCode.toUpperCase();
      userData.landlordId = landlordUid.value;
    }

    await setDoc(doc(db, 'users', uid), userData);
    authStore.userProfile = userData;
    router.push({ name: 'Dashboard' });

  } catch (e: any) {
    console.error(e);
    toast.error('設定失敗: ' + e.message);
  } finally {
    submitting.value = false;
  }
};
</script>
