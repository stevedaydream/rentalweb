<template>
  <div class="mt-3 rounded-lg border border-green-100 dark:border-green-900/30 bg-green-50/60 dark:bg-green-900/10 px-3 py-3">
    <label class="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200">
      <input :id="`${idPrefix}-subsidy`" v-model="local.hasSubsidy" type="checkbox" class="rounded">
      本租客領有政府租金補貼
    </label>
    <p class="text-xs text-green-700/70 dark:text-green-300/70 mt-1">
      該門牌只要有一位租客領有補貼，房東即為此門牌的公益出租人。
    </p>

    <div v-if="local.hasSubsidy" class="grid grid-cols-2 gap-3 mt-3">
      <div>
        <label :for="`${idPrefix}-subsidy-from`" class="block text-xs font-medium text-text-secondary-light mb-1">補貼起日</label>
        <input :id="`${idPrefix}-subsidy-from`" v-model="local.from" type="date" class="form-input">
      </div>
      <div>
        <label :for="`${idPrefix}-subsidy-to`" class="block text-xs font-medium text-text-secondary-light mb-1">補貼迄日</label>
        <input :id="`${idPrefix}-subsidy-to`" v-model="local.to" type="date" class="form-input">
      </div>
      <div class="col-span-2">
        <label :for="`${idPrefix}-subsidy-doc`" class="block text-xs font-medium text-text-secondary-light mb-1">核定函字號（選填）</label>
        <input :id="`${idPrefix}-subsidy-doc`" v-model="local.docNo" type="text" class="form-input">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { RentSubsidy } from '../../types/index'

const props = defineProps<{
  modelValue?: RentSubsidy
  /** 同一頁有桌機與抽屜兩份表單，用來避免 id 撞號 */
  idPrefix: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: RentSubsidy] }>()

/** 一律補成字串，Firestore 不接受 undefined */
const normalize = (v?: RentSubsidy): RentSubsidy => ({
  hasSubsidy: v?.hasSubsidy ?? false,
  from: v?.from ?? '',
  to: v?.to ?? '',
  docNo: v?.docNo ?? '',
})

const local = reactive<RentSubsidy>(normalize(props.modelValue))

watch(() => props.modelValue, (v) => {
  const n = normalize(v)
  if (JSON.stringify(n) === JSON.stringify({ ...local })) return
  Object.assign(local, n)
})

watch(local, () => emit('update:modelValue', { ...local }), { deep: true })
</script>
