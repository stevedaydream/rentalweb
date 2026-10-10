<template>
  <div class="ops-page">
    <ServicePageHeading
      role="admin"
      :title="`${resourceLabels[kind] || '資料'}管理`"
      description="從全平台查詢，或進入個別房東的管理範圍。"
    />
    <RouterLink
      v-if="['properties', 'rooms', 'tenants', 'bills', 'contracts'].includes(kind)"
      class="ops-button justify-self-start"
      :to="{ path: `/admin/create/${kind}`, query: landlordId ? { landlord: landlordId } : {} }"
      >新增{{ resourceLabels[kind] }} ＋</RouterLink
    >
    <div v-if="landlordId" class="ops-context">
      <span>目前房東：{{ landlord?.name || landlordId }}</span
      ><RouterLink :to="`/admin/record/users/${landlordId}`">查看房東詳情 ↗</RouterLink
      ><RouterLink :to="`/admin/manage/${kind}`">回全平台</RouterLink>
    </div>
    <nav v-if="landlordId" class="ops-tabs" aria-label="房東管理分頁">
      <RouterLink
        v-for="(label, k) in resourceLabels"
        v-show="k !== 'users' && k !== 'admin_audit'"
        :key="k"
        :to="{ path: `/admin/manage/${k}`, query: { landlord: landlordId } }"
        >{{ label }}</RouterLink
      >
    </nav>
    <label v-if="kind === 'users'" class="!flex items-center gap-2"
      ><input type="checkbox" v-model="includeArchived" @change="load(false)" />
      顯示已封存房東</label
    >
    <form class="ops-toolbar" @submit.prevent="load(false)">
      <label class="flex-1"
        >搜尋<input v-model="search" placeholder="輸入姓名、電話、房號或帳單說明" /></label
      ><button class="ops-primary" :disabled="loading">{{ loading ? '載入中…' : '搜尋' }}</button
      ><button
        type="button"
        :disabled="loading"
        @click="() => {
          search = ''
          load(false)

}"
      >
        重新整理
      </button>
    </form>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <section class="ops-panel" :aria-busy="loading">
      <div class="ops-toolbar justify-between">
        <h2>{{ landlordId ? '此房東' : '全平台' }}清單</h2>
        <span class="ops-muted"
          >已載入 {{ items.length }} 筆{{ next ? '，尚有更多資料' : '' }}</span
        >
      </div>
      <div v-for="row in items" :key="row.id" class="ops-record">
        <div>
          <strong>{{ rowLabel(row) }}</strong>
          <p class="ops-muted">
            {{ row.phone || row.room || row.roomNumber || row.date || displayDate(row.at) }}
            <span v-if="row.amount !== undefined">
              · NT$ {{ Number(row.amount).toLocaleString() }}</span
            >
          </p>
          <p class="ops-muted break-all">
            {{ row.landlordId || row.landlordUid || row.landlordCode || '' }}
          </p>
          <span v-if="row.serviceState" class="ops-tag">{{
            row.serviceState.archived ? '已封存' : modeLabels[row.serviceState.mode || 'active']
          }}</span
          ><span v-if="row.status" class="ops-tag">{{ row.status }}</span>
        </div>
        <RouterLink
          class="ops-button"
          :to="
            kind === 'admin_audit'
              ? { path: '/admin/audit', query: { record: row.id } }
              : `/admin/record/${kind}/${row.id}`
          "
          >查看 ↗</RouterLink
        >
      </div>
      <p v-if="!loading && !items.length" class="ops-empty">沒有符合條件的資料</p>
      <button v-if="next" :disabled="loading" @click="load(true)">載入更多</button>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ServicePageHeading from '../../components/ServicePageHeading.vue'
import {
  adminCall,
  resourceLabels,
  rowLabel,
  displayDate,
  type AdminRow,
} from '../../services/adminService'
const route = useRoute()
const kind = computed(() => String(route.params.kind || 'users'))
const landlordId = computed(() => String(route.query.landlord || ''))
const landlord = ref<AdminRow>()
const includeArchived = ref(false)
const modeLabels: Record<string, string> = {
  active: '服務正常',
  landlord: '房東已停用',
  all: '整戶暫停',
  deleting: '刪除中',
  deleted: '已刪除',
}
const search = ref('')
const items = ref<AdminRow[]>([])
const next = ref<string | null>(null)
const loading = ref(false)
const error = ref('')
let generation = 0
async function load(more = false) {
  const current = ++generation
  loading.value = true
  error.value = ''
  try {
    const result = await adminCall<{ items: AdminRow[]; next: string | null }>({
      action: 'list',
      kind: kind.value,
      landlordId: landlordId.value,
      after: more ? next.value : undefined,
      search: search.value,
      includeArchived: includeArchived.value,
    })
    if (current !== generation) return
    items.value = more ? [...items.value, ...result.items] : result.items
    next.value = result.next
    if (landlordId.value)
      landlord.value = await adminCall({ action: 'detail', kind: 'users', key: landlordId.value })
  } catch (e: any) {
    if (current === generation) error.value = e.message || '載入失敗'
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(
  () => route.fullPath,
  () => {
    search.value = ''
    items.value = []
    void load()
  },
  { immediate: true }
)
</script>
