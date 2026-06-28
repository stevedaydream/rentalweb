<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="movein-modal-title"
        class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 id="movein-modal-title" class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-gold-500" aria-hidden="true">checklist</span>
            入住點交
          </h2>
          <button @click="$emit('close')" aria-label="關閉" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span class="material-symbols-outlined text-gray-500" aria-hidden="true">close</span>
          </button>
        </div>

        <!-- Tenant summary -->
        <div class="px-6 pt-4 shrink-0">
          <div class="p-3 bg-surface-light dark:bg-surface-dark rounded-xl text-sm flex justify-between">
            <span class="text-text-secondary-light">{{ tenant.name }}</span>
            <span class="font-semibold">{{ tenant.room || '未設定房間' }}</span>
          </div>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-3">
          <div v-if="loading" class="flex items-center gap-2 text-sm text-text-secondary-light py-6 justify-center">
            <span class="material-symbols-outlined animate-spin text-[18px]">sync</span>載入物品主檔中…
          </div>

          <template v-else>
            <p class="text-xs text-text-secondary-light">勾選房間實際配備之物品，記錄入住當下狀況；退租時將依此清單逐項點交、計算賠償。</p>

            <div v-for="(item, i) in items" :key="i"
              class="p-3 rounded-xl border transition-colors"
              :class="item.present ? 'border-gold-200 dark:border-gold-800 bg-gold-50/40 dark:bg-gold-900/10' : 'border-gray-100 dark:border-gray-800 opacity-60'">
              <div class="flex items-center gap-2">
                <label class="flex items-center gap-2 flex-1 cursor-pointer">
                  <input type="checkbox" v-model="item.present" class="rounded w-4 h-4" />
                  <input v-model="item.name" type="text" class="form-input flex-1 text-sm font-medium" placeholder="品項名稱" />
                </label>
                <button @click="items.splice(i, 1)" class="text-red-400 hover:text-red-600 shrink-0" aria-label="移除">
                  <span class="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div v-if="item.present" class="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <label class="block text-[10px] text-text-secondary-light mb-0.5">數量</label>
                  <input v-model.number="item.quantity" type="number" min="1" class="form-input text-sm" />
                </div>
                <div>
                  <label class="block text-[10px] text-text-secondary-light mb-0.5">單價 NT$（賠償基準）</label>
                  <input v-model.number="item.unitPrice" type="number" min="0" class="form-input text-sm" />
                </div>
                <div>
                  <label class="block text-[10px] text-text-secondary-light mb-0.5">入住狀況</label>
                  <select v-model="item.condition" class="form-input text-sm">
                    <option value="normal">正常</option>
                    <option value="minor">既有輕微瑕疵</option>
                    <option value="total">既有嚴重瑕疵</option>
                  </select>
                </div>
                <input v-if="item.condition !== 'normal'" v-model="item.note" type="text"
                  class="form-input text-sm col-span-3" placeholder="瑕疵說明（如：左下角刮痕）" />
              </div>
            </div>

            <button @click="addItem"
              class="w-full py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-sm text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-1.5 transition-colors">
              <span class="material-symbols-outlined text-[16px]">add</span>新增品項
            </button>

            <label class="flex items-center gap-2 text-xs text-text-secondary-light cursor-pointer pt-1">
              <input type="checkbox" v-model="saveAsDefault" class="rounded" />
              一併將此品項與單價存為日後預設（房東主檔）
            </label>
          </template>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 shrink-0">
          <button @click="$emit('close')" :disabled="saving"
            class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
            取消
          </button>
          <button @click="save" :disabled="saving || loading"
            class="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors disabled:opacity-50 shadow-md flex items-center justify-center gap-2">
            <span v-if="saving" class="material-symbols-outlined animate-spin text-[16px]">sync</span>
            {{ saving ? '儲存中…' : '儲存入住點交' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { db } from '../firebase/config';
import { useToastStore } from '../stores/toast';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_CATALOG, type InspectionItem, type CatalogItem } from '../utils/inventory';

interface Tenant {
  id: string;
  name: string;
  room?: string;
  moveInInspection?: { inspectedAt?: any; items?: InspectionItem[] };
}

const props = defineProps<{ tenant: Tenant; landlordId: string }>();
const emit = defineEmits<{ close: []; saved: [InspectionItem[]] }>();
const toast = useToastStore();

const loading = ref(true);
const saving = ref(false);
const saveAsDefault = ref(false);
const items = ref<InspectionItem[]>([]);

const fromCatalog = (c: CatalogItem): InspectionItem => ({
  name: c.name, quantity: 1, unitPrice: c.unitPrice, present: true, condition: 'normal', note: '',
});

const addItem = () => items.value.push({ name: '', quantity: 1, unitPrice: 0, present: true, condition: 'normal', note: '' });

onMounted(async () => {
  try {
    // 既有入住點交 → 載入續編；否則以房東主檔（無則預設）建立清單
    const existing = props.tenant.moveInInspection?.items;
    if (existing && existing.length > 0) {
      items.value = existing.map(it => ({ note: '', ...it }));
    } else {
      let catalog: CatalogItem[] = DEFAULT_CATALOG;
      try {
        const snap = await getDoc(doc(db, 'settings', props.landlordId));
        const saved = snap.exists() ? (snap.data().inventoryCatalog as CatalogItem[]) : null;
        if (Array.isArray(saved) && saved.length > 0) catalog = saved;
      } catch { /* settings 可能不存在，用預設 */ }
      items.value = catalog.map(fromCatalog);
    }
  } finally {
    loading.value = false;
  }
});

const save = async () => {
  const cleaned = items.value
    .map(it => ({ ...it, name: (it.name || '').trim() }))
    .filter(it => it.name);
  if (cleaned.length === 0) { toast.warning('請至少保留一項物品'); return; }

  saving.value = true;
  try {
    await updateDoc(doc(db, 'tenants', props.tenant.id), {
      moveInInspection: { inspectedAt: serverTimestamp(), items: cleaned },
      updatedAt: serverTimestamp(),
    });

    if (saveAsDefault.value) {
      const catalog: CatalogItem[] = cleaned
        .filter(it => it.present)
        .map(it => ({ name: it.name, unitPrice: Number(it.unitPrice) || 0 }));
      await setDoc(doc(db, 'settings', props.landlordId), { inventoryCatalog: catalog }, { merge: true });
    }

    toast.success('入住點交已儲存');
    emit('saved', cleaned);
    emit('close');
  } catch (e) {
    console.error('MoveInInspection save error:', e);
    toast.error('儲存失敗，請稍後再試');
  } finally {
    saving.value = false;
  }
};
</script>
