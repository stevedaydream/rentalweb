import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db } from '../firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';

export const useNotificationStore = defineStore('notification', () => {
  // badge 計數
  const messages = ref(0);    // 未讀訊息數
  const tenants = ref(0);     // 即將到期合約數（90 天內）
  const financials = ref(false); // 台電帳單未登錄提示

  const totalBadge = computed(() => messages.value + tenants.value);

  let unsubMessages: Unsubscribe | null = null;
  let unsubTenants: Unsubscribe | null = null;
  let unsubBills: Unsubscribe | null = null;

  /**
   * 啟動三個 Firestore 監聽器（在 LandlordLayout onMounted 呼叫）
   */
  const startListeners = (uid: string) => {
    stopListeners();

    // 1. 未讀訊息
    const qMessages = query(
      collection(db, 'messages'),
      where('landlordId', '==', uid),
      where('isRead', '==', false)
    );
    unsubMessages = onSnapshot(qMessages, (snap) => {
      messages.value = snap.size;
    });

    // 2. 即將到期租約（90 天內）
    const qTenants = query(
      collection(db, 'tenants'),
      where('landlordId', '==', uid)
    );
    unsubTenants = onSnapshot(qTenants, (snap) => {
      const today = new Date();
      const deadline = new Date();
      deadline.setDate(today.getDate() + 90);
      let count = 0;
      snap.forEach(d => {
        const { leaseEnd } = d.data();
        if (leaseEnd) {
          const end = new Date(leaseEnd);
          if (end >= today && end <= deadline) count++;
        }
      });
      tenants.value = count;
    });

    // 3. 台電帳單是否已登錄本月
    const qBills = query(
      collection(db, 'taipower_bills'),
      where('landlordId', '==', uid),
      orderBy('month', 'desc'),
      limit(5)
    );
    unsubBills = onSnapshot(qBills, (snap) => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      financials.value = !snap.docs.some(d => d.data().month === currentMonth);
    });
  };

  /**
   * 取消所有監聽器（在 LandlordLayout onUnmounted 呼叫）
   */
  const stopListeners = () => {
    unsubMessages?.(); unsubMessages = null;
    unsubTenants?.(); unsubTenants = null;
    unsubBills?.(); unsubBills = null;
  };

  /**
   * 供 sidebar menu 項目取得 badge 數字
   */
  const getBadgeCount = (id: string): number => {
    if (id === 'messages') return messages.value;
    if (id === 'tenants') return tenants.value;
    return 0;
  };

  /**
   * 供 sidebar menu 項目取得 dot 提示（boolean）
   */
  const getBadgeDot = (id: string): boolean => {
    if (id === 'financials') return financials.value;
    return false;
  };

  return {
    messages,
    tenants,
    financials,
    totalBadge,
    startListeners,
    stopListeners,
    getBadgeCount,
    getBadgeDot,
  };
});
