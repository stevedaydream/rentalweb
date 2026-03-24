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

interface Bill {
  id: string;
  amount: number;
  totalAmount?: number;
  status: 'pending' | 'completed' | 'paid' | 'overdue';
  dueDate?: string;
  date?: string;
  landlordId: string;
  [key: string]: any;
}

export const useBillStore = defineStore('bill', () => {
  const bills = ref<Bill[]>([]);
  const loading = ref(false);
  const subscribedUid = ref('');
  let unsubscribe: Unsubscribe | null = null;

  // 訂閱帳單 (real-time)
  const subscribe = (uid: string) => {
    if (unsubscribe && subscribedUid.value === uid) return;
    if (unsubscribe) unsubscribe();

    subscribedUid.value = uid;
    loading.value = true;

    const q = query(
      collection(db, 'bills'),
      where('landlordId', '==', uid),
      orderBy('date', 'desc'),
      limit(100)
    );

    unsubscribe = onSnapshot(q, (snap) => {
      bills.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill));
      loading.value = false;
    }, () => {
      loading.value = false;
    });
  };

  // 取消訂閱並清空
  const dispose = () => {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    bills.value = [];
    subscribedUid.value = '';
  };

  // --- 統計 computed ---
  const todayStr = new Date().toISOString().split('T')[0];

  const pendingBills = computed(() =>
    bills.value.filter(b => b.status === 'pending' && !(b.dueDate && b.dueDate < todayStr))
  );
  const paidBills = computed(() =>
    bills.value.filter(b => b.status === 'completed' || b.status === 'paid')
  );
  const overdueBills = computed(() =>
    bills.value.filter(b => b.status === 'overdue' || (b.status === 'pending' && b.dueDate && b.dueDate < todayStr))
  );

  const getAmount = (list: Bill[]) =>
    list.reduce((sum, b) => sum + (Number(b.totalAmount) || Number(b.amount) || 0), 0);

  const unpaidCount = computed(() => pendingBills.value.length);
  const unpaidAmount = computed(() => getAmount(pendingBills.value));
  const paidCount = computed(() => paidBills.value.length);
  const paidAmount = computed(() => getAmount(paidBills.value));
  const overdueCount = computed(() => overdueBills.value.length);
  const overdueAmount = computed(() => getAmount(overdueBills.value));

  return {
    bills,
    loading,
    subscribedUid,
    subscribe,
    dispose,
    unpaidCount,
    unpaidAmount,
    paidCount,
    paidAmount,
    overdueCount,
    overdueAmount,
  };
});
