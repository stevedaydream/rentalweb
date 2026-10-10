<template>
  <section class="ops-panel">
    <div class="ops-toolbar justify-between">
      <h2>預覽與補開帳單</h2>
      <button :disabled="busy" @click="$emit('close')">關閉</button>
    </div>
    <p class="ops-muted mb-4">
      選擇暫停期間的月份逐月預覽。沿用正式出帳規則，已出帳或已涵蓋的期間不重複收費。
    </p>
    <form class="ops-toolbar" @submit.prevent="preview">
      <label
        >補開月份<input
          type="month"
          v-model="month"
          :disabled="busy"
          @change="() => {
            plan = undefined
            batches = []
            done = ''

}"
          required /></label
      ><button :disabled="busy">預覽缺漏帳單</button>
    </form>
    <p v-if="error" class="ops-error mt-4" role="alert">{{ error }}</p>
    <p v-if="done" class="ops-tag mt-4" role="status">{{ done }}</p>
    <div v-if="plan" class="grid gap-4 mt-5">
      <p v-for="w in plan.warnings" :key="w" class="ops-error">{{ w }}</p>
      <label v-for="p in plan.plans" :key="p.tenantKey" class="ops-record !flex"
        ><input type="checkbox" v-model="selected" :value="p.tenantKey" />
        <div>
          <strong>{{ p.target }}</strong>
          <p v-for="(b, i) in p.items" :key="i" class="ops-muted">
            {{ b.category }} · {{ b.description }} · NT$ {{ b.amount.toLocaleString() }}
          </p>
        </div></label
      >
      <p v-if="!plan.plans.length" class="ops-empty">此月份沒有可補開的帳單</p>
      <details v-if="plan.skipped.length">
        <summary>已略過項目</summary>
        <p v-for="s in plan.skipped" :key="s" class="ops-muted">{{ s }}</p>
      </details>
      <label>補開原因（必填）<textarea v-model="reason" required maxlength="1000" /></label
      ><label class="!flex items-center"
        ><input type="checkbox" v-model="notify" /> 通知租客本次補開帳單</label
      ><button
        class="ops-primary"
        :disabled="busy || !selected.length || !reason.trim()"
        @click="commit"
      >
        確認補開 {{ selected.length }} 位租客帳單
      </button>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { lifecycleCall } from '../../services/adminService'
import type { BillingPreview } from '../../services/billingGenerationService'
import { billingBatches } from '../../utils/financials/billingBatches'
const props = defineProps<{ landlordId: string }>()
defineEmits<{ close: [] }>()
const month = ref(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }).slice(0, 7))
const plan = ref<BillingPreview>()
const selected = ref<string[]>([])
const reason = ref('')
const notify = ref(false)
const busy = ref(false)
const error = ref('')
const done = ref('')
const batches = ref<any[]>([])
async function preview() {
  busy.value = true
  error.value = ''
  done.value = ''
  try {
    plan.value = await lifecycleCall({
      action: 'billingPreview',
      landlordId: props.landlordId,
      month: month.value,
    })
    selected.value = plan.value!.plans.map((p) => p.tenantKey)
    batches.value = []
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function commit() {
  if (!plan.value) return
  busy.value = true
  error.value = ''
  try {
    if (!batches.value.length)
      batches.value = billingBatches(
        plan.value.plans.filter((p) => selected.value.includes(p.tenantKey)),
        undefined,
        { reservedWrites: 4, perTenantWrites: 2 }
      )
    for (const b of batches.value) {
      if (b.done) continue
      await lifecycleCall({
        action: 'billingCommit',
        landlordId: props.landlordId,
        month: plan.value.month,
        ...b,
        reason: reason.value,
        notify: notify.value,
      })
      b.done = true
    }
    done.value = '補開完成；舊通知不補發。'
    plan.value = undefined
  } catch (e: any) {
    error.value = e.message + '；成功批次已保留，可重試未完成批次。'
  } finally {
    busy.value = false
  }
}
</script>
