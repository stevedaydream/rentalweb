<template>
  <div class="ops-page">
    <ServicePageHeading
      role="admin"
      title="操作紀錄"
      description="查看處理原因、修改前後資料，以及同次操作影響的關聯文件。"
    />
    <p v-if="error" class="ops-error">{{ error }}</p>
    <form class="ops-toolbar" @submit.prevent="load(false)">
      <label class="flex-1">房東識別碼（留空查看全部）<input v-model="landlord" /></label
      ><button :disabled="busy">查詢</button>
    </form>
    <section class="ops-panel">
      <article v-for="r in items" :key="r.id" class="border-b py-5">
        <div class="ops-toolbar justify-between">
          <strong
            >{{ actionLabels[r.action] || r.action }} ·
            {{ resourceLabels[r.kind] || r.kind }}</strong
          ><span class="ops-muted">{{ displayDate(r.at) }}</span>
        </div>
        <p class="mt-3">{{ r.reason || '一般資料編輯，未填寫原因' }}</p>
        <p class="ops-muted">房東：{{ r.landlordId }} · 操作者：{{ r.actorId }}</p>
        <details :open="route.query.record === r.id">
          <summary>檢視修改內容</summary>
          <div class="ops-grid">
            <div>
              <h3>修改前</h3>
              <pre>{{ snapshot(r.before) }}</pre>
            </div>
            <div>
              <h3>修改後</h3>
              <pre>{{ snapshot(r.after || r.summary) }}</pre>
            </div>
          </div>
          <details v-if="r.related?.length">
            <summary>關聯異動（{{ r.related.length }} 筆）</summary>
            <pre>{{ snapshot(r.related) }}</pre>
          </details>
        </details>
      </article>
      <p v-if="!items.length && !busy" class="ops-empty">目前沒有操作紀錄</p>
      <button v-if="next" :disabled="busy" @click="load(true)">載入更多</button>
    </section>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ServicePageHeading from '../../components/ServicePageHeading.vue'
import { adminCall, displayDate, resourceLabels, type AdminRow } from '../../services/adminService'
const route = useRoute()
const landlord = ref(String(route.query.landlord || ''))
const items = ref<AdminRow[]>([])
const next = ref<string | null>(null)
const error = ref('')
const busy = ref(false)
const actionLabels: Record<string, string> = {
  edit: '編輯',
  collect: '登錄收款',
  credit: '預收調整',
  reverse: '撤銷收款',
  void: '作廢',
  account: '帳戶狀態',
  delete: '永久刪除',
  generate: '補開帳單',
  create: '新增',
  signedCreate: '建立簽署合約',
  moveout: '退租',
}
const snapshot = (value: any) =>
  JSON.stringify(
    value,
    (k, v) => (/signature|templateHtml|token|secret/i.test(k) ? '[內容略]' : v),
    2
  ) || '無'
async function load(more = false) {
  busy.value = true
  error.value = ''
  try {
    const r = await adminCall({
      action: 'list',
      kind: 'admin_audit',
      landlordId: landlord.value,
      after: more ? next.value : undefined,
    })
    items.value = (more ? [...items.value, ...r.items] : r.items).sort(
      (a: AdminRow, b: AdminRow) => (b.at?._seconds || 0) - (a.at?._seconds || 0)
    )
    next.value = r.next
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  await load()
  if (route.query.record && !items.value.some((r) => r.id === route.query.record)) {
    try {
      const r = await adminCall<AdminRow>({
        action: 'detail',
        kind: 'admin_audit',
        key: String(route.query.record),
      })
      if (r.exists) items.value.unshift(r)
    } catch (e: any) {
      error.value = e.message
    }
  }
})
</script>
