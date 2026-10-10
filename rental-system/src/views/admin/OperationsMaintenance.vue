<template>
  <div class="ops-page">
    <ServicePageHeading
      role="admin"
      title="平台維護"
      description="管理服務開關、平台客服通知與本機測試工具。"
    />
    <p v-if="error" class="ops-error">{{ error }}</p>
    <p v-if="success" role="status" class="ops-tag">{{ success }}</p>
    <section v-if="deletionJobs.length" class="ops-panel">
      <h2>未完成的整戶刪除</h2>
      <p class="ops-muted mb-4">中斷的工作保留原刪除範圍，可接續執行。</p>
      <form
        v-for="job in deletionJobs"
        :key="job.id"
        class="grid gap-4 border-t py-5"
        @submit.prevent="resumeDelete(job)"
      >
        <strong>{{ job.landlordId }}</strong>
        <p>{{ job.reason }}</p>
        <label
          >請輸入「刪除 {{ job.landlordId }}」<input
            v-model="confirmations[job.id]"
            required
            autocomplete="off" /></label
        ><button
          class="ops-danger justify-self-start"
          :disabled="busy || confirmations[job.id] !== '刪除 ' + job.landlordId"
        >
          接續永久刪除
        </button>
      </form>
    </section>
    <section class="ops-panel">
      <h2>功能維護開關</h2>
      <p class="ops-muted mb-4">逐項設定房東與租客可使用的功能。</p>
      <RouterLink class="ops-button" to="/admin/features">管理功能開關 ↗</RouterLink>
    </section>
    <form class="ops-panel grid gap-5" @submit.prevent="save">
      <h2>獨立平台客服 LINE Bot</h2>
      <p class="ops-muted">
        {{
          configured
            ? '已設定；金鑰不回傳瀏覽器。更新時請重新填寫完整資料。'
            : '尚未設定；站內求助與通知可先正常使用。'
        }}
      </p>
      <label
        >Bot ID<input
          v-model="botId"
          placeholder="@平台客服帳號"
          required
          autocomplete="off" /></label
      ><label
        >Channel Secret<input
          v-model="secret"
          type="password"
          required
          autocomplete="new-password" /></label
      ><label
        >Channel Access Token<textarea
          v-model="token"
          required
          autocomplete="off"
          rows="3"
        /></label
      ><label>設定原因（必填）<textarea v-model="reason" required maxlength="1000" /></label
      ><button class="ops-primary justify-self-start" :disabled="busy">儲存客服 Bot 設定</button>
      <p class="ops-muted">
        將下方 Webhook URL 填入 LINE Developers，開啟
        Webhook；房東與管理員再到「平台求助」取得綁定碼。
      </p>
      <code class="break-all text-xs">{{ webhook }}</code>
    </form>
    <section v-if="local" class="ops-panel">
      <h2>本機開發工具</h2>
      <div class="ops-toolbar">
        <RouterLink class="ops-button" to="/admin/database">測試資料管理 ↗</RouterLink
        ><RouterLink class="ops-button" to="/admin/simulator">系統模擬器 ↗</RouterLink>
      </div>
      <p class="ops-muted mt-4">測試工具僅連線本機 Firebase 模擬器。</p>
    </section>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getApp } from 'firebase/app'
import ServicePageHeading from '../../components/ServicePageHeading.vue'
import { adminCall, lifecycleCall } from '../../services/adminService'
const deletionJobs = ref<any[]>([])
const confirmations = ref<Record<string, string>>({})
async function resumeDelete(job: any) {
  busy.value = true
  error.value = ''
  try {
    await lifecycleCall({
      action: 'deleteExecute',
      landlordId: job.landlordId,
      operationId: job.id,
      version: job.version,
      reason: job.reason,
      confirmation: confirmations.value[job.id],
    })
    deletionJobs.value = deletionJobs.value.filter((j) => j.id !== job.id)
    success.value = '整戶刪除已完成'
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
const botId = ref('')
const secret = ref('')
const token = ref('')
const reason = ref('')
const configured = ref(false)
const busy = ref(false)
const error = ref('')
const success = ref('')
const local = import.meta.env.DEV
const webhook = `https://asia-east1-${getApp().options.projectId}.cloudfunctions.net/platformLineWebhook`
async function save() {
  busy.value = true
  error.value = ''
  try {
    await adminCall({
      action: 'saveLineConfig',
      botId: botId.value,
      channelSecret: secret.value,
      channelAccessToken: token.value,
      operationId: crypto.randomUUID(),
      reason: reason.value,
    })
    secret.value = ''
    token.value = ''
    configured.value = true
    success.value = '平台客服 Bot 設定已儲存'
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  try {
    const c = await adminCall({ action: 'lineConfig' })
    botId.value = c.botId
    configured.value = c.configured
    deletionJobs.value = (await adminCall({ action: 'deletionJobs' })).items
  } catch (e: any) {
    error.value = e.message
  }
})
</script>
