<template>
  <div class="ops-page">
    <ServicePageHeading
      role="admin"
      title="今天需要處理的事"
      description="掌握異常與求助，從這裡開始平台營運。"
    />
    <form class="ops-toolbar" @submit.prevent="find">
      <label class="flex-1"
        >快速尋找房東或租客<input
          v-model="search"
          placeholder="姓名、電話、電子郵件或房號" /></label
      ><button class="ops-primary">搜尋</button
      ><button type="button" :disabled="loading" @click="load">重新檢查</button>
    </form>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <section v-if="results.length" class="ops-panel">
      <h2>搜尋結果</h2>
      <RouterLink
        v-for="r in results"
        :key="r.kind + r.id"
        class="ops-record"
        :to="`/admin/record/${r.kind}/${r.id}`"
        ><div>
          <strong>{{ rowLabel(r) }}</strong>
          <p class="ops-muted">{{ resourceLabels[r.kind] }} · {{ r.phone || r.room || '' }}</p>
        </div>
        <span>查看 ↗</span></RouterLink
      >
    </section>
    <section class="ops-summary">
      <p class="text-xs tracking-widest mb-3">平台工作清單</p>
      <h2>
        {{
          loading
            ? '正在檢查平台狀況…'
            : issues.length + pending.length
              ? '有需要你介入的事項'
              : '目前沒有待處理事項'
        }}
      </h2>
      <div class="flex gap-10 mt-6">
        <div>
          <p class="ops-count">{{ issues.length }}</p>
          <p class="text-sm mt-2">資料異常</p>
        </div>
        <div>
          <p class="ops-count">{{ pending.length }}</p>
          <p class="text-sm mt-2">待處理案件</p>
        </div>
      </div>
    </section>
    <div class="ops-grid">
      <section class="ops-panel">
        <div class="ops-toolbar justify-between">
          <h2>房東求助</h2>
          <RouterLink to="/admin/support">全部案件 ↗</RouterLink>
        </div>
        <RouterLink
          v-for="t in pending.slice(0, 8)"
          :key="t.id"
          class="ops-record"
          :to="{ path: '/admin/support', query: { ticket: t.id } }"
          ><div>
            <strong>{{ t.title }}</strong>
            <p class="ops-muted">{{ t.landlordName }} · {{ statuses[t.status] }}</p>
          </div>
          <span>↗</span></RouterLink
        >
        <p v-if="!pending.length" class="ops-empty">目前沒有待處理案件</p>
      </section>
      <section class="ops-panel">
        <h2>資料異常</h2>
        <RouterLink
          v-for="i in issues.slice(0, 30)"
          :key="i.key"
          class="ops-record"
          :to="i.id ? `/admin/record/${i.kind}/${i.id}` : '/admin/manage/tenants'"
          ><div>
            <strong>{{ i.label }}</strong>
            <p class="ops-muted">{{ i.message }}</p>
          </div>
          <span>檢查 ↗</span></RouterLink
        >
        <p v-if="!issues.length" class="ops-empty">本次檢查未發現異常</p>
      </section>
    </div>
    <section class="ops-panel">
      <h2>平台概況</h2>
      <div class="ops-grid">
        <RouterLink
          v-for="k in ['users', 'properties', 'rooms', 'tenants']"
          :key="k"
          :to="`/admin/manage/${k}`"
          ><p class="ops-muted">{{ resourceLabels[k] }}</p>
          <strong class="text-2xl">{{ counts[k] || 0 }}</strong></RouterLink
        >
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ServicePageHeading from '../../components/ServicePageHeading.vue'
import {
  adminCall,
  supportCall,
  resourceLabels,
  rowLabel,
  type AdminRow,
} from '../../services/adminService'
const counts = ref<Record<string, number>>({})
const issues = ref<any[]>([])
const tickets = ref<AdminRow[]>([])
const error = ref('')
const loading = ref(false)
const search = ref('')
const results = ref<AdminRow[]>([])
const statuses: Record<string, string> = {
  open: '待處理',
  working: '處理中',
  waiting: '待房東回覆',
  closed: '已結案',
}
const pending = computed(() => tickets.value.filter((t) => ['open', 'working'].includes(t.status)))
async function load() {
  loading.value = true
  error.value = ''
  try {
    const [o, t] = await Promise.all([
      adminCall({ action: 'overview' }),
      supportCall({ action: 'list' }),
    ])
    counts.value = o.counts
    issues.value = o.issues
    tickets.value = t.items
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
async function find() {
  error.value = ''
  try {
    results.value = (await adminCall({ action: 'search', search: search.value })).items
    if (!results.value.length) error.value = '沒有符合條件的資料'
  } catch (e: any) {
    error.value = e.message
  }
}
onMounted(load)
</script>
