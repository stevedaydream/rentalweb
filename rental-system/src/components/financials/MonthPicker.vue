<template>
  <div class="relative" ref="pickerRef">
    <!-- Trigger Button -->
    <button
      @click="open = !open"
      class="flex items-center gap-2 px-3 py-2 border border-ink-100 dark:border-ink-700 rounded-lg text-sm bg-white dark:bg-ink-800 hover:border-gold-500 transition-colors font-medium"
    >
      <span class="material-symbols-outlined text-[18px] text-gold-500">calendar_month</span>
      {{ displayLabel }}
      <span class="material-symbols-outlined text-[16px] text-ink-300 transition-transform" :class="open ? 'rotate-180' : ''">expand_more</span>
    </button>

    <!-- Dropdown -->
    <Transition name="picker">
      <div
        v-if="open"
        class="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-ink-800 rounded-2xl shadow-xl border border-ink-100 dark:border-ink-700 p-4 w-72"
      >
        <!-- Year navigation -->
        <div class="flex items-center justify-between mb-4">
          <button @click="year--" class="p-1.5 rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
            <span class="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ year }} 年</span>
          <button @click="year++" :disabled="year >= maxYear" class="p-1.5 rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors disabled:opacity-30">
            <span class="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>

        <!-- Month Grid -->
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="(label, idx) in monthLabels"
            :key="idx"
            @click="selectMonth(idx + 1)"
            class="py-2 rounded-xl text-sm font-medium transition-all"
            :class="buttonClass(idx + 1)"
          >
            {{ label }}
          </button>
        </div>

        <!-- Quick shortcuts -->
        <div class="mt-4 pt-3 border-t border-ink-100 dark:border-ink-700 flex gap-2">
          <button @click="selectToday" class="flex-1 py-1.5 text-xs rounded-lg bg-surface-light dark:bg-surface-dark hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors text-text-secondary-light">
            本月
          </button>
          <button @click="selectPrev" class="flex-1 py-1.5 text-xs rounded-lg bg-surface-light dark:bg-surface-dark hover:bg-ink-100 dark:hover:bg-ink-700 transition-colors text-text-secondary-light">
            上個月
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const open = ref(false);
const pickerRef = ref<HTMLElement | null>(null);

const today = new Date();
const maxYear = today.getFullYear();

const year = ref(parseInt(props.modelValue.split('-')[0] ?? String(today.getFullYear())));
const selectedMonth = computed(() => parseInt(props.modelValue.split('-')[1] ?? '1'));
const selectedYear = computed(() => parseInt(props.modelValue.split('-')[0] ?? String(today.getFullYear())));

const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const displayLabel = computed(() => {
  const [y, m] = props.modelValue.split('-');
  return `${y} 年 ${parseInt(m ?? '1')} 月`;
});

const buttonClass = (month: number) => {
  const isSelected = year.value === selectedYear.value && month === selectedMonth.value;
  const isToday = year.value === today.getFullYear() && month === today.getMonth() + 1;
  const isFuture = year.value > maxYear || (year.value === maxYear && month > today.getMonth() + 1);

  if (isSelected) return 'bg-gold-500 text-white shadow-md shadow-gold-500/30';
  if (isFuture) return 'text-ink-200 dark:text-ink-600 cursor-not-allowed';
  if (isToday) return 'ring-2 ring-gold-400 text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/20';
  return 'text-text-primary-light dark:text-text-primary-dark hover:bg-surface-light dark:hover:bg-surface-dark';
};

const selectMonth = (month: number) => {
  const isFuture = year.value > maxYear || (year.value === maxYear && month > today.getMonth() + 1);
  if (isFuture) return;
  const m = String(month).padStart(2, '0');
  emit('update:modelValue', `${year.value}-${m}`);
  open.value = false;
};

const selectToday = () => {
  year.value = today.getFullYear();
  selectMonth(today.getMonth() + 1);
};

const selectPrev = () => {
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  year.value = prev.getFullYear();
  selectMonth(prev.getMonth() + 1);
};

// Close on outside click
const handleOutsideClick = (e: MouseEvent) => {
  if (pickerRef.value && !pickerRef.value.contains(e.target as Node)) {
    open.value = false;
  }
};
onMounted(() => document.addEventListener('mousedown', handleOutsideClick));
onUnmounted(() => document.removeEventListener('mousedown', handleOutsideClick));
</script>

<style scoped>
.picker-enter-active, .picker-leave-active { transition: opacity 0.15s, transform 0.15s; }
.picker-enter-from, .picker-leave-to { opacity: 0; transform: translateY(-6px) scale(0.97); }
</style>
