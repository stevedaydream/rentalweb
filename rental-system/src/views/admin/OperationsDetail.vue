<template>
  <div class="ops-page" v-if="row">
    <div class="ops-toolbar">
      <RouterLink :to="`/admin/manage/${kind}`">← 返回{{ resourceLabels[kind] }}清單</RouterLink
      ><button :disabled="busy" @click="load">重新載入</button>
    </div>
    <ServicePageHeading
      role="admin"
      :title="rowLabel(row)"
      :description="`${resourceLabels[kind]}詳情與管理操作`"
    />
    <div class="ops-context">
      <span>所屬房東：{{ landlord?.name || landlordId }}</span
      ><RouterLink v-if="kind !== 'users'" :to="`/admin/record/users/${landlordId}`"
        >房東詳情 ↗</RouterLink
      ><span v-if="row.status" class="ops-tag">{{ row.status }}</span>
    </div>
    <nav class="ops-tabs" aria-label="此房東的資料">
      <RouterLink
        v-for="k in ['properties', 'rooms', 'tenants', 'bills', 'contracts', 'signed_contracts']"
        :key="k"
        :to="{ path: `/admin/manage/${k}`, query: { landlord: landlordId } }"
        >{{ resourceLabels[k] }}</RouterLink
      >
    </nav>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <p v-if="success" role="status" class="ops-tag">{{ success }}</p>
    <form v-if="Object.keys(fields).length" class="ops-panel" @submit.prevent="save('edit')">
      <h2>基本資料</h2>
      <div class="ops-grid">
        <label v-for="(label, key) in fields" :key="key"
          >{{ label
          }}<select v-if="key === 'propertyId'" v-model="form[key]">
            <option v-for="p in properties" :key="p.id" :value="p.id">{{ p.name }}</option></select
          ><input
            v-else
            v-model="form[key]"
            :type="fieldType(key)"
            :step="key === 'size' ? 'any' : '1'"
        /></label>
      </div>
      <label class="mt-5"
        >操作原因{{ important ? '（必填）' : '（選填）'
        }}<textarea v-model="reason" :required="important" maxlength="1000" rows="2" /></label
      ><button class="ops-primary mt-5" :disabled="busy">
        {{ busy ? '處理中…' : '儲存修改' }}
      </button>
    </form>
    <section v-if="kind === 'tenants'" class="ops-panel">
      <h2>收款與預收</h2>
      <p class="ops-muted mb-4">
        目前預收餘額 NT$
        {{ Number(row.credit || 0).toLocaleString() }}。收款依帳齡沖銷，溢繳轉為預收。
      </p>
      <form class="grid gap-4" @submit.prevent="save(moneyAction)">
        <label
          >處理方式<select v-model="moneyAction">
            <option value="collect">登錄收款</option>
            <option value="credit">預收餘額調整</option>
          </select></label
        >
        <div class="ops-grid">
          <label
            >金額{{ moneyAction === 'credit' ? '（增加填正數，減少填負數）' : ''
            }}<input type="number" step="1" v-model.number="input.amount" required /></label
          ><label v-if="moneyAction === 'collect'"
            >收款日期<input type="date" v-model="input.date" required
          /></label>
        </div>
        <label>操作原因（必填）<textarea v-model="reason" required maxlength="1000" /></label
        ><button class="ops-primary" :disabled="busy">
          確認{{ moneyAction === 'collect' ? '收款' : '調整' }}
        </button>
      </form>
      <button class="mt-5" :disabled="busy || row.isHistorical" @click="moveout = true">
        辦理退租
      </button>
    </section>
    <section v-if="kind === 'bills'" class="ops-panel">
      <h2>收款紀錄與修正</h2>
      <div class="ops-record" v-for="(p, index) in row.payments || []" :key="index">
        <div>
          <strong>NT$ {{ Number(p.amount).toLocaleString() }}</strong>
          <p class="ops-muted">
            {{ p.date }} · {{ p.source === 'credit' ? '預收沖抵' : '登錄收款'
            }}{{ p.reversedAt ? ' · 已撤銷' : '' }}
          </p>
        </div>
        <button
          :disabled="busy || !!p.reversedAt"
          @click="() => {
            input.paymentIndex = index
            save('reverse')

}"
        >
          撤銷此筆
        </button>
      </div>
      <label>修正原因（必填）<textarea v-model="reason" maxlength="1000" /></label
      ><button class="ops-danger mt-4" :disabled="busy" @click="save('void')">
        作廢未收款帳單
      </button>
      <p class="ops-muted mt-3">作廢保留原紀錄；已有收款須先撤銷，預收沖抵撤銷後會退回租客餘額。</p>
    </section>
    <section v-if="kind === 'signed_contracts'" class="ops-panel">
      <h2>簽署合約處理</h2>
      <p class="ops-muted mb-4">已簽內容保留原始快照。需要修正時先作廢，再建立新合約重新簽署。</p>
      <label>操作原因（必填）<textarea v-model="reason" maxlength="1000" /></label>
      <div class="ops-toolbar mt-4">
        <button
          class="ops-danger"
          :disabled="busy || row.status === 'voided'"
          @click="save('void')"
        >
          作廢此合約</button
        ><button :disabled="busy" @click="newContract = true">建立新合約</button>
      </div>
    </section>
    <section v-if="kind === 'users'" class="ops-panel">
      <h2>帳戶與服務</h2>
      <p class="ops-muted mb-4">
        目前：{{
          state.archived ? '已封存' : modeLabels[state.mode || 'active']
        }}。只停用房東時，自動作業照常；整戶暫停會停止新出帳與主動通知。
      </p>
      <form class="grid gap-4" @submit.prevent="updateAccount">
        <label
          >服務狀態<select v-model="accountMode">
            <option value="active">恢復服務</option>
            <option value="landlord">只停用房東</option>
            <option value="all">暫停整戶（含租客）</option>
          </select></label
        ><label class="!flex items-center"
          ><input type="checkbox" v-model="archived" /> 封存並從預設清單隱藏</label
        ><label>操作原因（必填）<textarea v-model="reason" required maxlength="1000" /></label
        ><button class="ops-primary" :disabled="busy">更新服務狀態</button>
      </form>
      <div class="ops-toolbar mt-5">
        <button @click="billing = true" :disabled="busy || (state.mode && state.mode !== 'active')">
          預覽與補開帳單</button
        ><button @click="newContract = true">建立簽署合約</button
        ><button class="ops-danger" @click="previewDelete" :disabled="busy">
          預覽整戶永久刪除
        </button>
      </div>
    </section>
    <section v-if="deletePlan" class="ops-panel">
      <h2>永久刪除預覽</h2>
      <p class="ops-error">
        將刪除 {{ deletePlan.total }} 份文件與 {{ deletePlan.fileCount }} 個附件；保留
        {{ deletePlan.preservedAccounts }} 個租客登入帳號，解除房東關聯。此操作無法復原。
      </p>
      <dl class="ops-grid my-5">
        <div v-for="(count, key) in deletePlan.summary" :key="key">
          <dt>{{ resourceLabels[key] || key }}</dt>
          <dd>{{ count }} 筆</dd>
        </div>
      </dl>
      <form class="grid gap-4" @submit.prevent="executeDelete">
        <label>操作原因（必填）<textarea v-model="reason" required maxlength="1000" /></label
        ><label
          >請輸入「{{ deletePlan.confirmation }}」<input
            v-model="confirmation"
            required
            autocomplete="off"
        /></label>
        <div class="ops-toolbar">
          <button class="ops-danger" :disabled="busy || confirmation !== deletePlan.confirmation">
            永久刪除</button
          ><button type="button" :disabled="busy" @click="deletePlan = null">取消</button>
        </div>
      </form>
    </section>
    <BillingRecovery v-if="billing" :landlord-id="landlordId" @close="billing = false" />
    <section v-if="kind === 'contracts'" class="ops-panel">
      <h2>續約排程</h2>
      <p v-if="row.pendingRenewal" class="ops-context">
        下一期：{{ row.pendingRenewal.startDate }}～{{ row.pendingRenewal.endDate }} · NT$
        {{ row.pendingRenewal.rent }}
      </p>
      <p class="ops-muted mb-4">
        目前租期維持到期，下一期到期後自動接續；簽署合約請另至此房東的簽署合約建立。
      </p>
      <form class="grid gap-4" @submit.prevent="save('renew')">
        <div class="ops-grid">
          <label>下一期起租日<input type="date" v-model="input.startDate" required /></label
          ><label>下一期到期日<input type="date" v-model="input.endDate" required /></label
          ><label
            >下一期租金<input type="number" min="0" step="1" v-model.number="input.rent" required
          /></label>
        </div>
        <label>操作原因（必填）<textarea v-model="reason" required maxlength="1000" /></label>
        <div class="ops-toolbar">
          <button class="ops-primary" :disabled="busy">儲存續約排程</button
          ><button
            v-if="row.pendingRenewal"
            type="button"
            :disabled="busy"
            @click="save('cancelRenewal')"
          >
            取消排程續約
          </button>
        </div>
      </form>
    </section>
    <AdminTenantAccount
      v-if="kind === 'tenants'"
      :tenant-id="key"
      :version="row.version"
      @changed="load"
    />
    <AdminSignedActions v-if="kind === 'signed_contracts'" :contract="row" @changed="load" />
    <section v-if="newContract" class="ops-panel">
      <div class="ops-toolbar justify-between">
        <h2>建立簽署合約</h2>
        <button @click="newContract = false">關閉</button>
      </div>
      <label>建立原因（必填）<textarea v-model="reason" required /></label
      ><ContractForm
        :landlord-id="landlordId"
        :admin-reason="reason"
        :show-selectors="true"
        :allow-remote="true"
        @saved="() => {
          newContract = false
          load()

}"
      />
    </section>
    <MoveOutWizard
      v-if="moveout"
      :tenant="row as any"
      :landlord-id="landlordId"
      :admin-reason="reason"
      @close="moveout = false"
      @completed="() => {
        moveout = false
        load()

}"
    />
    <section class="ops-panel">
      <h2>完整資料與操作紀錄</h2>
      <details>
        <summary>檢視資料快照</summary>
        <pre>{{ safeSnapshot }}</pre>
      </details>
      <RouterLink
        class="ops-button mt-3"
        :to="{ path: '/admin/audit', query: { landlord: landlordId } }"
        >查看此房東的操作紀錄 ↗</RouterLink
      >
    </section>
  </div>
  <div v-else class="ops-page">
    <p v-if="error" class="ops-error">{{ error }}</p>
    <p v-else class="ops-empty">載入詳情中…</p>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ServicePageHeading from '../../components/ServicePageHeading.vue'
import ContractForm from '../../components/ContractForm.vue'
import MoveOutWizard from '../../components/MoveOutWizard.vue'
import BillingRecovery from './BillingRecovery.vue'
import AdminTenantAccount from '../../components/AdminTenantAccount.vue'
import AdminSignedActions from '../../components/AdminSignedActions.vue'
import {
  adminCall,
  lifecycleCall,
  resourceLabels,
  editableFields,
  fieldType,
  rowLabel,
  type AdminRow,
} from '../../services/adminService'
const route = useRoute()
const router = useRouter()
const kind = computed(() => String(route.params.kind))
const key = computed(() => String(route.params.key))
const row = ref<AdminRow>()
const landlord = ref<AdminRow>()
const state = ref<any>({})
const properties = ref<AdminRow[]>([])
const form = ref<Record<string, any>>({})
const reason = ref('')
const busy = ref(false)
const error = ref('')
const success = ref('')
const input = ref<any>({
  amount: 0,
  date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
})
const moneyAction = ref('collect')
const moveout = ref(false)
const billing = ref(false)
const newContract = ref(false)
const deletePlan = ref<any>(null)
const confirmation = ref('')
const deletionOperation = ref('')
const accountMode = ref('active')
const archived = ref(false)
const modeLabels: Record<string, string> = {
  active: '服務正常',
  landlord: '房東已停用',
  all: '整戶暫停',
  deleting: '正在刪除',
  deleted: '已刪除',
}
const fields = computed(() => editableFields[kind.value] || {})
const important = computed(() => ['bills', 'contracts'].includes(kind.value))
const landlordId = computed(() =>
  kind.value === 'users' ? key.value : row.value?.landlordUid || row.value?.landlordId || ''
)
const safeSnapshot = computed(() =>
  JSON.stringify(
    row.value,
    (k, v) => (/signature|templateHtml|photo|image|token|secret/i.test(k) ? '[內容略]' : v),
    2
  )
)
let generation = 0
async function load() {
  const gen = ++generation
  error.value = ''
  try {
    const r = await adminCall<AdminRow>({ action: 'detail', kind: kind.value, key: key.value })
    if (gen !== generation) return
    if (!r.exists) throw new Error('資料不存在')
    row.value = r
    form.value = Object.fromEntries(
      Object.keys(fields.value).map((k) => [k, r[k] ?? (fieldType(k) === 'number' ? 0 : '')])
    )
    const lid = landlordId.value
    const [l, s, p] = await Promise.all([
      adminCall({ action: 'detail', kind: 'users', key: lid }),
      adminCall({ action: 'detail', kind: 'platform_accounts', key: lid }),
      adminCall({ action: 'list', kind: 'properties', landlordId: lid }),
    ])
    if (gen !== generation) return
    landlord.value = l
    state.value = s
    properties.value = p.items
    accountMode.value = s.mode || 'active'
    archived.value = !!s.archived
  } catch (e: any) {
    error.value = e.message
  }
}
async function perform(fn: () => Promise<any>) {
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    await fn()
    success.value = '操作已完成並留下紀錄'
    await load()
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function save(operation: string) {
  if (!row.value) return
  if ((operation !== 'edit' || important.value) && !reason.value.trim()) {
    error.value = '請先填寫操作原因'
    return
  }
  const patch = Object.fromEntries(
    Object.entries(form.value)
      .filter(([k, v]) => v !== (row.value![k] ?? (fieldType(k) === 'number' ? 0 : '')))
      .map(([k, v]) => [k, fieldType(k) === 'number' ? Number(v) : v])
  )
  if (operation === 'edit' && !Object.keys(patch).length) {
    error.value = '尚未修改資料'
    return
  }
  const operationId = crypto.randomUUID()
  await perform(() =>
    adminCall({
      action: 'mutate',
      kind: kind.value,
      key: key.value,
      operation,
      patch,
      version: row.value!.version,
      operationId,
      reason: reason.value,
      input: input.value,
    })
  )
}
async function updateAccount() {
  await perform(() =>
    adminCall({
      action: 'account',
      landlordId: landlordId.value,
      mode: accountMode.value,
      archived: archived.value,
      version: state.value.version,
      operationId: crypto.randomUUID(),
      reason: reason.value,
    })
  )
}
async function previewDelete() {
  busy.value = true
  error.value = ''
  try {
    deletePlan.value = await lifecycleCall({
      action: 'deletePreview',
      landlordId: landlordId.value,
    })
    deletionOperation.value = crypto.randomUUID()
    confirmation.value = ''
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function executeDelete() {
  busy.value = true
  error.value = ''
  try {
    await lifecycleCall({
      action: 'deleteExecute',
      landlordId: landlordId.value,
      operationId: deletionOperation.value,
      version: deletePlan.value.version,
      confirmation: confirmation.value,
      reason: reason.value,
    })
    await router.push('/admin/manage/users')
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
watch(
  () => route.fullPath,
  () => {
    row.value = undefined
    reason.value = ''
    deletePlan.value = null
    billing.value = false
    newContract.value = false
    void load()
  },
  { immediate: true }
)
</script>
