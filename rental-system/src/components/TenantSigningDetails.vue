<template>
  <section class="rounded-xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-card-dark p-4 space-y-4">
    <div>
      <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ readonly ? '租客補填資料' : '確認您的聯絡資料' }}</h2>
      <p v-if="!readonly" class="mt-1 text-xs text-text-secondary-light">電話與戶籍地址必填，其餘選填。資料會隨本次合約送交房東核對。</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div v-for="field in SIGNING_DETAIL_FIELDS" :key="field.key" class="min-w-0">
        <template v-if="readonly">
          <p class="text-xs text-text-secondary-light">{{ field.label }}</p>
          <p class="mt-1 text-sm break-words whitespace-pre-wrap text-text-primary-light dark:text-text-primary-dark">{{ displayValue(field.key) }}</p>
        </template>
        <template v-else>
          <label :for="`sign-detail-${field.key}`" class="block text-sm font-medium text-text-secondary-light mb-1">{{ field.label }}{{ field.required ? '（必填）' : '（選填）' }}</label>
          <input :id="`sign-detail-${field.key}`" :value="modelValue[field.key] || ''" :type="field.type"
            :maxlength="field.maxLength" :required="field.required" :placeholder="field.placeholder"
            class="form-input" @input="update(field.key, ($event.target as HTMLInputElement).value)" />
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { SIGNING_DETAIL_FIELDS, type SigningDetailKey } from '../../functions/signing/details.mjs'

const props = defineProps<{ modelValue: Record<string, any>; readonly?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, any>] }>()
const update = (key: SigningDetailKey, value: string) => emit('update:modelValue', { ...props.modelValue, [key]: value })
const displayValue = (key: SigningDetailKey) => {
  if (key === 'tenantMailAddress') return props.modelValue[key] || props.modelValue.tenantAddress || '未提供'
  if (key === 'guarantorMailAddress') return props.modelValue[key] || props.modelValue.guarantorAddress || '未提供'
  return props.modelValue[key] || '未提供'
}
</script>
