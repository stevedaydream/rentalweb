<template>
  <div class="ops-page">
    <ServicePageHeading
      role="admin"
      :title="`新增${resourceLabels[kind] || '資料'}`"
      description="先確認所屬房東，再建立資料與關聯。"
    />
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <form class="ops-panel grid gap-5" @submit.prevent="save">
      <label
        >所屬房東<select v-model="landlordId" required @change="loadRelated">
          <option value="">請選擇</option>
          <option v-for="l in landlords" :key="l.id" :value="l.id">
            {{ l.name }} · {{ l.landlordCode }}
          </option>
        </select></label
      >
      <div class="ops-context" v-if="landlordId">
        目前操作房東：{{ landlords.find((l) => l.id === landlordId)?.name || landlordId }}
      </div>
      <div class="ops-grid">
        <label v-for="(label, k) in fields" :key="k"
          >{{ label
          }}<select
            v-if="['propertyId', 'tenantDocId', 'relatedTenantDocId', 'roomId'].includes(k)"
            v-model="form[k]"
            :required="k !== 'relatedTenantDocId'"
          >
            <option value="">請選擇</option>
            <option v-for="r in options(k)" :key="r.id" :value="r.id">
              {{ rowLabel(r) }}
            </option></select
          ><select v-else-if="k === 'type'" v-model="form[k]">
            <option value="income">收入</option>
            <option value="expense">支出</option></select
          ><select v-else-if="k === 'category'" v-model="form[k]">
            <option v-for="c in categories" :key="c">{{ c }}</option></select
          ><input
            v-else
            v-model="form[k]"
            :type="fieldType(k)"
            :step="k === 'size' ? 'any' : '1'"
            :required="
              ['name', 'amount', 'date', 'dueDate', 'startDate', 'endDate', 'rent'].includes(k)
            "
        /></label>
      </div>
      <label>建立原因（必填）<textarea v-model="reason" required maxlength="1000" /></label>
      <div class="ops-toolbar">
        <button class="ops-primary" :disabled="busy || !landlordId">
          {{ busy ? '建立中…' : '確認建立' }}</button
        ><RouterLink
          :to="{ path: `/admin/manage/${kind}`, query: landlordId ? { landlord: landlordId } : {} }"
          >取消</RouterLink
        >
      </div>
      <p v-if="kind === 'contracts'" class="ops-muted">
        建立有效租約會同步租客與房間狀態。簽署合約另由房東詳情的「建立簽署合約」處理；押金與首月租金依實際收款登記。
      </p>
    </form>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ServicePageHeading from '../../components/ServicePageHeading.vue'
import {
  adminCall,
  editableFields,
  resourceLabels,
  fieldType,
  rowLabel,
  type AdminRow,
} from '../../services/adminService'
const route = useRoute()
const router = useRouter()
const kind = String(route.params.kind)
const landlordId = ref(String(route.query.landlord || ''))
const landlords = ref<AdminRow[]>([])
const related = ref<Record<string, AdminRow[]>>({})
const reason = ref('')
const error = ref('')
const busy = ref(false)
const form = ref<Record<string, any>>({ type: 'income', category: '租金收入', occupants: 1 })
const operationId = crypto.randomUUID()
const fields = computed(() =>
  kind === 'bills'
    ? {
        relatedTenantDocId: '租客',
        type: '收支類型',
        category: '類別',
        amount: '金額',
        date: '帳單日期',
        dueDate: '截止日',
        description: '說明',
      }
    : kind === 'contracts'
      ? {
          tenantDocId: '租客',
          roomId: '房間',
          startDate: '起租日',
          endDate: '到期日',
          rent: '月租金',
        }
      : editableFields[kind] || {}
)
const categories = [
  '租金收入',
  '電費',
  '水費',
  '公共電費',
  '押金收入',
  '押金退還',
  '修繕費',
  '其他收入',
  '其他支出',
]
async function all(k: string, lid = '') {
  const items: AdminRow[] = []
  let after: string | null = null
  do {
    const r: any = await adminCall({ action: 'list', kind: k, landlordId: lid, after })
    items.push(...r.items)
    after = r.next
  } while (after)
  return items
}
async function loadRelated() {
  error.value = ''
  try {
    const values = await Promise.all(
      ['properties', 'tenants', 'rooms'].map(async (k) => [k, await all(k, landlordId.value)])
    )
    related.value = Object.fromEntries(values)
    for (const k of ['propertyId', 'tenantDocId', 'relatedTenantDocId', 'roomId'])
      form.value[k] = ''
  } catch (e: any) {
    error.value = e.message
  }
}
const options = (k: string) =>
  related.value[k === 'propertyId' ? 'properties' : k === 'roomId' ? 'rooms' : 'tenants'] || []
async function save() {
  busy.value = true
  error.value = ''
  try {
    const patch = Object.fromEntries(
      Object.keys(fields.value)
        .filter((k) => form.value[k] !== undefined && form.value[k] !== '')
        .map((k) => [k, fieldType(k) === 'number' ? Number(form.value[k]) : form.value[k]])
    )
    const r: any = await adminCall({
      action: 'domain',
      operation: 'create',
      operationId,
      kind,
      landlordId: landlordId.value,
      reason: reason.value,
      patch,
    })
    await router.push(`/admin/record/${kind}/${r.id}`)
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  try {
    landlords.value = await all('users')
    if (landlordId.value) await loadRelated()
  } catch (e: any) {
    error.value = e.message
  }
})
</script>
