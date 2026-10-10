<template>
  <section class="ops-panel">
    <h2>租客登入帳號</h2>
    <p class="ops-muted mb-4">
      {{ labels[status.status] || '查詢中'
      }}{{ status.lastSignIn ? ' · 最後登入：' + status.lastSignIn : '' }}
    </p>
    <p v-if="error" class="ops-error">{{ error }}</p>
    <p v-if="success" class="ops-tag">{{ success }}</p>
    <form class="grid gap-4" @submit.prevent="run">
      <label
        >帳號操作<select
          v-model="operation"
          :disabled="!!status.pending"
          @change="operationId = ''"
        >
          <template v-if="['missing', 'deleted'].includes(status.status)"
            ><option value="create">建立登入帳號</option>
            <option v-if="status.status === 'missing'" value="pair">
              配對既有租客帳號
            </option></template
          ><template v-else
            ><option value="activation">產生一次性啟用連結</option>
            <option value="reset">重設密碼</option>
            <option value="disabled">停用或恢復租客登入</option></template
          >
        </select></label
      ><label v-if="operation === 'pair'"
        >選擇未配對的登入帳號<select v-model="uid" required>
          <option value="">請選擇</option>
          <option v-for="c in candidates" :key="c.id" :value="c.id">
            {{ c.name }} · {{ c.email || c.id }}
          </option>
        </select></label
      >
      <p v-if="status.pending" class="ops-context">
        有未完成操作，請重試。密碼重設須重新輸入原先密碼。
      </p>
      <label v-if="operation === 'reset'"
        >新密碼（留空使用租客證件號碼）<input
          type="password"
          v-model="password"
          autocomplete="new-password"
          minlength="6" /></label
      ><label v-if="operation === 'disabled'"
        >帳號狀態<select v-model="disabled">
          <option :value="true">停用登入</option>
          <option :value="false">恢復登入</option>
        </select></label
      ><label>操作原因（必填）<textarea v-model="reason" required maxlength="1000" /></label
      ><button class="ops-primary" :disabled="busy">
        {{ busy ? '處理中…' : operationId ? '重試原操作' : '確認操作' }}
      </button>
    </form>
    <p v-if="url" class="ops-context mt-4 break-all">
      啟用連結（7 天內有效、限用一次）：<a :href="url" target="_blank" rel="noopener">{{ url }}</a>
    </p>
  </section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase/config'
const props = defineProps<{ tenantId: string; version: string }>()
const emit = defineEmits<{ changed: [] }>()
const uid = ref('')
const candidates = ref<any[]>([])
const status = ref<any>({})
const operation = ref('activation')
const operationId = ref('')
const reason = ref('')
const password = ref('')
const disabled = ref(true)
const busy = ref(false)
const error = ref('')
const success = ref('')
const url = ref('')
const labels: Record<string, string> = {
  missing: '未建立登入帳號',
  deleted: '登入帳號已不存在',
  active: '已啟用',
  unused: '已建立，尚未登入',
  disabled: '已停用',
}
const call = async (data: any) =>
  (await httpsCallable<any, any>(functions, 'adminTenantAccount')(data)).data
async function load() {
  try {
    status.value = await call({ key: props.tenantId, operation: 'status' })
    operation.value = ['missing', 'deleted'].includes(status.value.status) ? 'create' : 'activation'
    if (status.value.pending) {
      operation.value = status.value.pending.operation
      operationId.value = status.value.pending.operationId
      reason.value = status.value.pending.reason
      disabled.value = status.value.pending.disabled
    }
    if (status.value.status === 'missing')
      candidates.value = (await call({ key: props.tenantId, operation: 'candidates' })).items
  } catch (e: any) {
    error.value = e.message
  }
}
async function run() {
  busy.value = true
  error.value = ''
  try {
    if (!operationId.value) operationId.value = crypto.randomUUID()
    const r = await call({
      key: props.tenantId,
      version: status.value.pending?.version || props.version,
      uid: uid.value,
      operation: operation.value,
      operationId: operationId.value,
      reason: reason.value,
      password: password.value,
      disabled: disabled.value,
      origin: location.origin,
    })
    url.value = r.url || ''
    operationId.value = ''
    password.value = ''
    success.value = '帳號操作已完成並留下紀錄'
    await load()
    emit('changed')
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>
