import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export const useUserStore = defineStore('user', () => {
  // uid → profile 的本地快取，避免重複 Firestore 讀取
  const cache = ref<Record<string, any>>({});

  /**
   * 取得用戶資料，優先從快取讀取。
   * 若快取不存在則從 Firestore 抓取並存入快取。
   */
  const getProfile = async (uid: string): Promise<any | null> => {
    if (cache.value[uid]) return cache.value[uid];

    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        cache.value[uid] = { id: snap.id, ...snap.data() };
        return cache.value[uid];
      }
    } catch (e) {
      console.warn('[useUserStore] getProfile 失敗:', uid, e);
    }
    return null;
  };

  /**
   * 手動寫入快取（例如 auth.ts 登入後直接填入）
   */
  const setProfile = (uid: string, data: any) => {
    cache.value[uid] = data;
  };

  /**
   * 登出時清空全部快取
   */
  const clear = () => {
    cache.value = {};
  };

  return { cache, getProfile, setProfile, clear };
});
