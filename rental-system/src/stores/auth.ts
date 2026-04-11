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
  linkWithPopup,
  type User
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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

  const loadProfile = async (currentUser: User) => {
    try {
      const userStore = useUserStore();
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
      console.warn('讀取用戶資料受阻:', e);
    }
  };

  const init = async () => {
    if (isInitialized.value) return;

    // authStateReady() 等待 Firebase Auth 確定初始狀態（避免手機上先 fire null 的問題）
    await auth.authStateReady();

    const currentUser = auth.currentUser;
    user.value = currentUser;
    if (currentUser) {
      await loadProfile(currentUser);
    }

    loading.value = false;
    isInitialized.value = true;

    // 監聽後續 auth 狀態變化（登出等）
    onAuthStateChanged(auth, async (currentUser) => {
      user.value = currentUser;
      if (!currentUser) {
        userProfile.value = null;
        return;
      }
      if (!userProfile.value) {
        await loadProfile(currentUser);
      }
    });
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    await handleAuthSuccess(result.user);
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

  // 是否為房東建立的帳號（用手機+身分證登入的租客）
  const isLandlordCreated = computed(() => userProfile.value?.isLandlordCreated === true);

  // 是否已綁定 Google
  const hasGoogleLinked = computed(() =>
    user.value?.providerData.some(p => p.providerId === 'google.com') ?? false
  );

  // 綁定 Google 帳號（linkWithPopup）
  const linkWithGoogle = async () => {
    if (!user.value) throw new Error('尚未登入');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await linkWithPopup(user.value, provider);
    // 同步更新 Firestore，標記已綁定
    await updateDoc(doc(db, 'users', user.value.uid), { googleLinked: true });
    return result;
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
    isLandlordCreated,
    hasGoogleLinked,
    linkWithGoogle,
  };
});