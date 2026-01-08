// [修改開始]：src/stores/auth.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
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

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const userProfile = ref<any>(null);
  const selectedRole = ref<string | null>(localStorage.getItem('selectedRole'));
  const loading = ref(true);
  const isInitialized = ref(false);
  const router = useRouter();

  const setRole = (role: string) => {
    selectedRole.value = role;
    localStorage.setItem('selectedRole', role);
  };

  const handleAuthSuccess = async (firebaseUser: User) => {
    console.log('[Debug] 登入成功:', firebaseUser.uid);
    try {
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = docSnap.data();
        userProfile.value = profile;
        const targetPath = profile.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
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
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              userProfile.value = docSnap.data();
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
    await signOut(auth);
    user.value = null;
    userProfile.value = null;
    localStorage.removeItem('selectedRole');
    router.replace({ name: 'Identity' });
  };

  return { 
    user, 
    userProfile, 
    selectedRole, 
    loading, 
    isInitialized, 
    init, 
    setRole, 
    loginWithGoogle, 
    loginEmail, 
    registerEmail, 
    logout 
  };
});
// [修改結束]