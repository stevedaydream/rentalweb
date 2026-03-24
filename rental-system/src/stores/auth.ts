import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { auth, db } from '../firebase/config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'vue-router';
import { useUserStore } from './user';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const userProfile = ref<any>(null);
  const selectedRole = ref<string | null>(localStorage.getItem('selectedRole'));
  const loading = ref(true);
  const isInitialized = ref(false);
  const router = useRouter();

  // 模擬房東身份（僅 admin 使用）
  const impersonatingLandlord = ref<{ uid: string; name: string; landlordCode: string } | null>(null);
  // 有效 UID：模擬中時回傳被模擬房東的 UID，否則回傳自己的 UID
  const effectiveUid = computed<string>(() => impersonatingLandlord.value?.uid ?? user.value?.uid ?? '');

  const setRole = (role: string) => {
    selectedRole.value = role;
    localStorage.setItem('selectedRole', role);
  };

  const handleAuthSuccess = async (firebaseUser: User) => {
    try {
      const userStore = useUserStore();
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = docSnap.data();
        userProfile.value = profile;
        userStore.setProfile(firebaseUser.uid, profile); // 填入快取
        let targetPath = '/tenant/dashboard';
        if (profile.role === 'landlord') targetPath = '/landlord/dashboard';
        else if (profile.role === 'admin') targetPath = '/admin/dashboard';
        router.replace(targetPath).catch(() => {
          window.location.replace(targetPath);
        });
      } else {
        router.push({ name: 'Onboarding' });
      }
    } catch (error) {
      console.error('handleAuthSuccess 讀取 Profile 失敗:', error);
      router.push({ name: 'Onboarding' });
    }
  };

  const init = () => {
    if (isInitialized.value) return Promise.resolve();
    
    return new Promise<void>((resolve) => {
      // 處理手機版 Redirect 回來的結果
      getRedirectResult(auth).then(async (result) => {
        if (result?.user) await handleAuthSuccess(result.user);
      }).catch(console.error);

      // 監聽登入狀態改變
      onAuthStateChanged(auth, async (currentUser) => {
        user.value = currentUser;
        if (currentUser) {
          try {
            const userStore = useUserStore();
            // 優先從快取取得，避免重複 Firestore 讀取
            // 注意：Pinia setup store 在外部存取時 ref 會自動 unwrap，不需要 .value
            const cached = userStore.cache[currentUser.uid];
            if (cached) {
              userProfile.value = cached;
            } else {
              const docRef = doc(db, 'users', currentUser.uid);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                userProfile.value = docSnap.data();
                userStore.setProfile(currentUser.uid, docSnap.data());
              }
            }
          } catch (e) {
            console.warn('初始化時讀取用戶資料受阻:', e);
          }
        }
        loading.value = false;
        isInitialized.value = true;
        resolve();
      });
    });
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    
    if (isMobile) {
      await signInWithRedirect(auth, provider);
    } else {
      const result = await signInWithPopup(auth, provider);
      await handleAuthSuccess(result.user);
    }
  };

  const loginEmail = async (email: string, pass: string) => {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    await handleAuthSuccess(result.user);
  };

  const registerEmail = async (email: string, pass: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await handleAuthSuccess(result.user);
  };

  const logout = async () => {
    impersonatingLandlord.value = null;
    await signOut(auth);
    user.value = null;
    userProfile.value = null;
    localStorage.removeItem('selectedRole');
    // 清除 user store 快取
    try { useUserStore().clear(); } catch { /* store 可能已銷毀 */ }
    router.replace({ name: 'Identity' });
  };

  const startImpersonation = (landlord: { uid: string; name: string; landlordCode: string }) => {
    impersonatingLandlord.value = landlord;
    router.push({ name: 'LandlordDashboard' });
  };

  const stopImpersonation = () => {
    impersonatingLandlord.value = null;
    router.push({ name: 'AdminDashboard' });
  };

  return {
    user,
    userProfile,
    selectedRole,
    loading,
    isInitialized,
    impersonatingLandlord,
    effectiveUid,
    init,
    setRole,
    loginWithGoogle,
    loginEmail,
    registerEmail,
    logout,
    startImpersonation,
    stopImpersonation,
  };
});