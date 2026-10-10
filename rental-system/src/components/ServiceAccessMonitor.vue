<template><span hidden aria-hidden="true"></span></template>
<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase/config'
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
let unsubscribe: Unsubscribe | undefined
watch(
  () => [auth.user?.uid, auth.userProfile?.role, auth.userProfile?.landlordId],
  () => {
    unsubscribe?.()
    unsubscribe = undefined
    if (!auth.user || !auth.userProfile || auth.userProfile.role === 'admin') return
    const lid = auth.userProfile.role === 'landlord' ? auth.user.uid : auth.userProfile.landlordId
    if (!lid) return
    unsubscribe = onSnapshot(
      doc(db, 'platform_accounts', lid),
      (snap) => {
        const s = snap.data()
        if (
          s?.archived ||
          ['all', 'deleting', 'deleted'].includes(s?.mode) ||
          (auth.userProfile.role === 'landlord' && s?.mode === 'landlord')
        ) {
          if (
            route.meta.requiresAuth &&
            !['ServiceSuspended', 'LandlordSupport'].includes(String(route.name))
          )
            void router.replace('/service-suspended')
        }
      },
      () => {
        if (
          route.meta.requiresAuth &&
          !['ServiceSuspended', 'LandlordSupport'].includes(String(route.name))
        )
          void router.replace('/service-suspended')
      }
    )
  },
  { immediate: true }
)
onUnmounted(() => unsubscribe?.())
</script>
