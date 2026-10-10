<template>
  <div class="ops-page">
    <ServicePageHeading
      :role="isAdmin ? 'admin' : 'landlord'"
      title="平台求助"
      description="問題、補充資料與處理結果，都留在同一份案件。"
    />
    <section class="ops-panel">
      <div class="ops-toolbar justify-between">
        <div>
          <h2>LINE 客服通知</h2>
          <p class="ops-muted">
            {{ bound ? '已綁定平台客服通知' : '綁定獨立平台客服 Bot，接收案件回覆提醒。' }}
          </p>
        </div>
        <div class="ops-toolbar">
          <button v-if="!bound" :disabled="busy" @click="bind">取得綁定碼</button
          ><button v-else :disabled="busy" @click="unbind">解除綁定</button
          ><a
            v-if="botId"
            class="ops-button"
            :href="`https://line.me/R/ti/p/${encodeURIComponent(botId)}`"
            target="_blank"
            rel="noopener"
            >加入平台客服 ↗</a
          >
        </div>
      </div>
      <p v-if="code" class="ops-context mt-4 break-all">
        請在平台客服 LINE 傳送：{{ code }}（10 分鐘內有效）
      </p>
    </section>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
    <div class="ops-grid" style="align-items: start">
      <section class="ops-panel">
        <div class="ops-toolbar justify-between">
          <h2>{{ isAdmin ? '全部求助案件' : '我的求助案件' }}</h2>
          <button
            v-if="!isAdmin"
            @click="() => {
              newTicket = true
              selected = null
              $router.replace({ query: {} })

}"
          >
            新增案件
          </button>
        </div>
        <label
          >案件狀態<select v-model="filter">
            <option value="">全部</option>
            <option v-for="(label, s) in statuses" :key="s" :value="s">{{ label }}</option>
          </select></label
        ><RouterLink
          v-for="t in filtered"
          :key="t.id"
          class="ops-record"
          :to="{ query: { ticket: t.id } }"
          ><div>
            <strong>{{ t.title }}</strong>
            <p class="ops-muted">{{ t.landlordName }} · {{ displayDate(t.updatedAt) }}</p>
            <span class="ops-tag">{{ statuses[t.status] }}</span>
          </div>
          <span v-if="isAdmin ? t.unreadAdmin : t.unreadLandlord" class="ops-tag">新訊息</span
          ><span v-else>↗</span></RouterLink
        >
        <p v-if="!filtered.length" class="ops-empty">目前沒有案件</p>
      </section>
      <section v-if="newTicket || selected" class="ops-panel">
        <form v-if="newTicket && !selected" class="grid gap-4" @submit.prevent="send(true)">
          <h2>建立求助案件</h2>
          <label>問題標題<input v-model="title" required maxlength="100" /></label
          ><label
            >問題內容<textarea
              v-model="text"
              rows="7"
              required
              maxlength="5000"
              placeholder="描述發生的情況、操作步驟，以及你希望協助處理的事項。"
            /></label
          ><label
            >截圖（最多 5 張，每張小於 5 MB）<input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              @change="chooseFiles"
          /></label>
          <p class="ops-muted">{{ files.map((f) => f.name).join('、') }}</p>
          <button class="ops-primary" :disabled="busy">{{ busy ? '送出中…' : '送出案件' }}</button>
        </form>
        <div v-if="selected" class="grid gap-5">
          <div>
            <h2>{{ selected.title }}</h2>
            <p class="ops-muted">{{ selected.landlordName }} · {{ statuses[selected.status] }}</p>
            <RouterLink v-if="isAdmin" :to="`/admin/record/users/${selected.landlordId}`"
              >查看房東 ↗</RouterLink
            >
          </div>
          <form v-if="isAdmin" class="ops-toolbar" @submit.prevent="changeStatus">
            <label class="flex-1"
              >處理狀態<select v-model="nextStatus">
                <option v-for="(label, s) in statuses" :key="s" :value="s">{{ label }}</option>
              </select></label
            ><button :disabled="busy">更新</button>
          </form>
          <article v-for="m in selected.messages" :key="m.id" class="border-t pt-5">
            <p class="ops-muted mb-2">
              {{ m.actorRole === 'admin' ? '平台管理員' : '房東' }} · {{ displayDate(m.createdAt) }}
            </p>
            <p class="whitespace-pre-wrap break-words leading-relaxed">{{ m.text }}</p>
            <div class="ops-grid mt-3">
              <a
                v-for="p in m.attachments"
                :key="p"
                :href="attachmentUrls[p]"
                target="_blank"
                rel="noopener"
                ><img
                  v-if="attachmentUrls[p]"
                  :src="attachmentUrls[p]"
                  alt="案件截圖，點擊放大"
                  class="rounded-lg max-h-60 object-contain"
                /><span v-else class="ops-muted">附件載入中…</span></a
              >
            </div>
          </article>
          <form
            v-if="selected.status !== 'closed'"
            class="grid gap-4 border-t pt-5"
            @submit.prevent="send(false)"
          >
            <label>回覆內容<textarea v-model="text" required rows="5" maxlength="5000" /></label
            ><label
              >補充截圖<input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                @change="chooseFiles"
            /></label>
            <p class="ops-muted">{{ files.map((f) => f.name).join('、') }}</p>
            <button class="ops-primary" :disabled="busy">
              {{ busy ? '送出中…' : '送出回覆' }}
            </button>
          </form>
          <p v-else class="ops-muted">案件已結案。如有其他問題，請建立新案件。</p>
        </div>
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { getBlob, ref as storageRef, uploadBytes } from 'firebase/storage'
import { db, storage } from '../firebase/config'
import { useAuthStore } from '../stores/auth'
import { supportCall, displayDate, type AdminRow } from '../services/adminService'
import ServicePageHeading from '../components/ServicePageHeading.vue'
import '../assets/admin.css'
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const isAdmin = computed(() => auth.userProfile?.role === 'admin')
const tickets = ref<AdminRow[]>([])
const selected = ref<AdminRow | null>(null)
const newTicket = ref(false)
const filter = ref('')
const title = ref('')
const text = ref('')
const files = ref<File[]>([])
const busy = ref(false)
const error = ref('')
const nextStatus = ref('open')
const code = ref('')
const bound = ref(false)
const botId = ref('')
const attachmentUrls = ref<Record<string, string>>({})
const statuses: Record<string, string> = {
  open: '待處理',
  working: '處理中',
  waiting: '待房東回覆',
  closed: '已結案',
}
const filtered = computed(() =>
  tickets.value
    .filter((t) => !filter.value || t.status === filter.value)
    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
)
let currentGeneration = 0
const source = isAdmin.value
  ? collection(db, 'platform_tickets')
  : query(collection(db, 'platform_tickets'), where('landlordId', '==', auth.user!.uid))
const unsub = onSnapshot(
  source,
  (s) => {
    tickets.value = s.docs.map((d) => ({ ...d.data(), id: d.id, version: '' }))
    if (route.query.ticket) void detail()
  },
  (e) => (error.value = e.message)
)
async function detail() {
  const gen = ++currentGeneration
  if (!route.query.ticket) {
    selected.value = null
    return
  }
  try {
    const d = await supportCall({ action: 'detail', key: String(route.query.ticket) })
    if (gen !== currentGeneration) return
    selected.value = d
    newTicket.value = false
    nextStatus.value = d.status
    for (const m of d.messages)
      for (const p of m.attachments || []) {
        if (attachmentUrls.value[p]) continue
        const blob = await getBlob(storageRef(storage, p), 5 * 1024 * 1024)
        if (gen !== currentGeneration) return
        attachmentUrls.value[p] = URL.createObjectURL(blob)
      }
  } catch (e: any) {
    error.value = e.message
  }
}
function chooseFiles(event: Event) {
  const picked = Array.from((event.target as HTMLInputElement).files || [])
  if (
    picked.length > 5 ||
    picked.some(
      (f) =>
        f.size >= 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
  ) {
    error.value = '最多 5 張截圖，每張小於 5 MB，格式為 JPG、PNG 或 WebP'
    files.value = []
    return
  }
  files.value = picked
}
async function send(create: boolean) {
  busy.value = true
  error.value = ''
  try {
    const operationId = crypto.randomUUID()
    const attachments = []
    for (let i = 0; i < files.value.length; i++) {
      const f = files.value[i]!
      const p = `platform_support/${auth.user!.uid}/${operationId}/${i}`
      await uploadBytes(storageRef(storage, p), f, { contentType: f.type })
      attachments.push(p)
    }
    const result = await supportCall({
      action: create ? 'create' : 'reply',
      key: selected.value?.id,
      operationId,
      title: title.value,
      text: text.value,
      attachments,
    })
    text.value = ''
    files.value = []
    newTicket.value = false
    await router.replace({ query: { ticket: result.id } })
    await detail()
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function changeStatus() {
  busy.value = true
  error.value = ''
  try {
    await supportCall({
      action: 'status',
      key: selected.value!.id,
      status: nextStatus.value,
      operationId: crypto.randomUUID(),
    })
    await detail()
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function bind() {
  busy.value = true
  try {
    code.value = (await supportCall({ action: 'bindCode' })).code
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function unbind() {
  busy.value = true
  try {
    await supportCall({ action: 'unbind' })
    bound.value = false
    code.value = ''
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
void supportCall({ action: 'binding' })
  .then((b) => {
    bound.value = b.bound
    botId.value = b.botId
  })
  .catch((e) => (error.value = e.message))
watch(
  () => route.query.ticket,
  () => {
    text.value = ''
    files.value = []
    void detail()
  },
  { immediate: true }
)
onUnmounted(() => {
  unsub()
  currentGeneration++
  Object.values(attachmentUrls.value).forEach(URL.revokeObjectURL)
})
</script>
