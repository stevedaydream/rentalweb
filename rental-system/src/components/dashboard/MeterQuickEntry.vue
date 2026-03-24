<template>
  <div class="lg:col-span-7 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-ink-100 dark:border-ink-800">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-bold text-lg flex items-center">
        <span class="material-symbols-outlined mr-2 text-gold-500">electric_bolt</span>
        電表快速登錄
      </h3>
      <span class="text-xs text-text-secondary-light">顯示前 5 筆</span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-text-secondary-light uppercase bg-surface-light dark:bg-surface-dark">
          <tr>
            <th class="px-4 py-3 rounded-l-lg">房號</th>
            <th class="px-4 py-3">上期度數</th>
            <th class="px-4 py-3">本期度數</th>
            <th class="px-4 py-3 rounded-r-lg">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="room in rooms" :key="room.id" class="border-b border-ink-100 dark:border-ink-800 last:border-0">
            <td class="px-4 py-3 font-medium">{{ room.name }}</td>
            <td class="px-4 py-3 text-text-secondary-light">{{ room.lastReading }}</td>
            <td class="px-4 py-3">
              <input
                v-model.number="room.newReading"
                type="number"
                placeholder="輸入度數"
                class="w-24 px-2 py-1 text-sm border border-ink-200 dark:border-ink-700 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none bg-white dark:bg-ink-800"
                :min="room.lastReading"
              >
            </td>
            <td class="px-4 py-3">
              <button
                @click="emit('save', room)"
                :disabled="!room.newReading || room.newReading < room.lastReading"
                class="text-gold-600 hover:text-gold-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                儲存
              </button>
            </td>
          </tr>
          <tr v-if="rooms.length === 0">
            <td colspan="4" class="px-4 py-4 text-center text-ink-300">暫無房源資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 text-center">
      <button
        class="text-sm text-gold-600 hover:underline flex items-center justify-center w-full"
        @click="router.push({ name: 'MeterReading' })"
      >
        批量輸入與進階設定
        <span class="material-symbols-outlined text-sm ml-1">arrow_forward</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

export interface MeterRoom {
  id: string;
  name: string;
  lastReading: number;
  newReading?: number;
}

defineProps<{
  rooms: MeterRoom[];
}>();

const emit = defineEmits<{
  save: [room: MeterRoom];
}>();

const router = useRouter();
</script>
