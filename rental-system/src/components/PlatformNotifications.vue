<template>
  <details v-if="items.length || error" class="ops-panel mb-5">
    <summary class="cursor-pointer font-semibold">
      平台通知 <span v-if="unread" class="ops-tag">{{ unread }} 則未讀</span>
    </summary>
    <p v-if="error" class="ops-error">{{ error }}</p>
    <div v-for="n in items.slice(0, 30)" :key="n.id" class="ops-record">
      <div>
        <p>{{ n.message }}</p>
        <p class="ops-muted">
          {{ displayDate(n.createdAt) }}{{ n.isRead ? ' · 已讀' : ''
          }}{{ n.lineStatus === 'failed' ? ' · LINE 發送失敗，通知已保留' : '' }}
        </p>
      </div>
      <button @click="open(n)">查看 ↗</button>
    </div>
  </details>
</template>
<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { db } from '../firebase/config'
import { useAuthStore } from '../stores/auth'
import { supportCall, displayDate, type AdminRow } from '../services/adminService'
const auth = useAuthStore()
const router = useRouter()
const items = ref<AdminRow[]>([])
const error = ref('')
const unread = computed(() => items.value.filter((n) => !n.isRead).length)
const unsub = auth.user
  ? onSnapshot(
      query(collection(db, 'platform_notifications'), where('recipientId', '==', auth.user.uid)),
      (s) => {
        items.value = s.docs
          .map((d) => ({ ...d.data(), id: d.id, version: '' }) as AdminRow)
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      },
      (e) => (error.value = e.message)
    )
  : () => {}
async function open(n: AdminRow) {
  try {
    await supportCall({ action: 'readNotification', key: n.id })
    if (typeof n.path === 'string' && /^\/(admin|landlord|tenant)\//.test(n.path))
      await router.push(n.path)
  } catch (e: any) {
    error.value = e.message
  }
}
onUnmounted(unsub)
</script>
