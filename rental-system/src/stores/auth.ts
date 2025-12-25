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
  const router = useRouter();

  // === 修改開始：更強力的登入後跳轉邏輯 ===
  const handleAuthSuccess = async (firebaseUser: User) => {
    console.log('[Debug] 進入 handleAuthSuccess, UID:', firebaseUser.uid);
    try {
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = docSnap.data();
        userProfile.value = profile;
        console.log('[Debug] 資料讀取成功，角色:', profile.role);
        
        // 定義目標 URL
        const targetPath = profile.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';

        // 嘗試 Vue Router 跳轉
        router.push({ name: 'Dashboard' }).catch(() => {
          console.warn('[Debug] Router 被瀏覽器阻擋，執行強制轉址');
          // [關鍵] 手機版 Redirect 最穩定的跳轉方式
          window.location.replace(targetPath);
        });

        // 如果 1 秒後還在原位，執行強制轉址
        setTimeout(() => {
          if (window.location.pathname.includes('login')) {
            window.location.replace(targetPath);
          }
        }, 1000);

      } else {
        console.log('[Debug] 新使用者，導向 Onboarding');
        userProfile.value = null;
        router.push({ name: 'Onboarding' });
      }
    } catch (error) {
      console.error('[Debug] handleAuthSuccess 失敗:', error);
    }
  };

  const init = () => {
    console.log('[Debug] Init 開始');
    return new Promise<void>((resolve) => {
      // 1. 優先處理轉址結果
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user) {
            console.log('[Debug] 偵測到手機轉址登入成功:', result.user.email);
            await handleAuthSuccess(result.user);
          }
        })
        .catch((err) => {
          console.error('[Debug] Redirect Error:', err);
        })
        .finally(() => {
          // 2. 啟動監聽器
          onAuthStateChanged(auth, async (currentUser) => {
            user.value = currentUser;
            if (currentUser) {
              const docRef = doc(db, 'users', currentUser.uid);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                userProfile.value = docSnap.data();
              }
            } else {
              userProfile.value = null;
            }
            loading.value = false;
            console.log('[Debug] Init 完畢');
            resolve();
          });
        });
    });
  };

  const setRole = (role: string) => {
    selectedRole.value = role;
    localStorage.setItem('selectedRole', role);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    
    try {
      if (isMobile) {
        console.log('[Debug] 手機端：執行轉址登入');
        await signInWithRedirect(auth, provider);
      } else {
        console.log('[Debug] 電腦端：執行彈窗登入');
        const result = await signInWithPopup(auth, provider);
        await handleAuthSuccess(result.user);
      }
    } catch (error) {
      console.error('[Debug] Google Login Error:', error);
      throw error;
    }
  };
  // === 修改結束 ===

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
    router.push({ name: 'Identity' });
  };

  return {
    user,
    userProfile,
    selectedRole,
    loading,
    init,
    setRole,
    loginWithGoogle,
    loginEmail,
    registerEmail,
    logout
  };
});