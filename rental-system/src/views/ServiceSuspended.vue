<template>
  <div class="ops-page max-w-xl mx-auto p-6 pt-20">
    <ServicePageHeading
      :role="auth.userProfile?.role === 'landlord' ? 'landlord' : 'tenant'"
      title="服務目前暫停"
      description="平台已暫停此帳戶或所屬房東的服務，既有資料仍保留。"
    /><PlatformNotifications /><RouterLink
      v-if="auth.userProfile?.role === 'landlord'"
      class="ops-button"
      to="/landlord/support"
      >聯繫平台客服 ↗</RouterLink
    >
    <p v-else class="ops-muted">請聯繫房東了解恢復服務的安排。</p>
    <button class="ops-button" @click="$router.push('/dashboard')">重新檢查服務狀態</button
    ><button class="ops-button" @click="auth.logout()">登出</button>
  </div>
</template>
<script setup lang="ts">
import ServicePageHeading from '../components/ServicePageHeading.vue'
import PlatformNotifications from '../components/PlatformNotifications.vue'
import { useAuthStore } from '../stores/auth'
import '../assets/admin.css'
const auth = useAuthStore()
</script>
