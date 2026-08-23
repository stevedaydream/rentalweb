<template>
  <div class="max-w-5xl mx-auto space-y-6">

    <div class="flex items-center gap-3">
      <span class="material-symbols-outlined text-gold-500">apartment</span>
      <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">大樓資訊</h1>
      <span v-if="propertyName" class="text-sm text-text-secondary-light">{{ propertyName }}</span>
    </div>

    <div v-if="isLoading" class="flex justify-center py-16">
      <span class="material-symbols-outlined animate-spin text-4xl text-ink-200">progress_activity</span>
    </div>

    <div v-else-if="!hasData" class="text-center py-16 text-text-secondary-light">
      <span class="material-symbols-outlined text-5xl mb-3 block">apartment</span>
      <p>房東尚未設定大樓資訊</p>
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="flex gap-1 bg-surface-light dark:bg-surface-dark rounded-xl p-1 w-fit">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id as 'map' | 'rules'"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === tab.id
            ? 'bg-white dark:bg-card-dark text-gold-600 shadow-sm'
            : 'text-text-secondary-light hover:text-text-primary-light'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab: 互動地圖 -->
      <div v-if="activeTab === 'map'">
        <div v-if="buildingInfo.mapType === 'none'" class="text-center py-16 text-text-secondary-light">
          <span class="material-symbols-outlined text-5xl mb-3 block">map</span>
          <p>房東尚未設定互動地圖</p>
        </div>

        <div v-else class="bg-white dark:bg-card-dark rounded-2xl p-5 shadow-sm border border-ink-100 dark:border-ink-800 space-y-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-gold-500">map</span>
            <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">逃生與設施地圖</h2>
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap gap-3">
            <div v-for="type in usedMarkerTypes" :key="type" class="flex items-center gap-1.5 text-xs text-text-secondary-light">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]" :class="markerConfig[type].bg">
                <span class="material-symbols-outlined text-[12px]">{{ markerConfig[type].icon }}</span>
              </span>
              {{ markerConfig[type].label }}
            </div>
          </div>

          <!-- Map -->
          <div class="relative w-full select-none rounded-xl overflow-hidden border border-ink-100 dark:border-ink-700">
            <!-- 內建樣板 -->
            <div
              v-if="buildingInfo.mapType === 'template'"
              class="w-full"
              v-html="currentSvgTemplate"
            ></div>
            <!-- 房東上傳的平面圖 -->
            <img
              v-else-if="buildingInfo.mapImageUrl"
              :src="buildingInfo.mapImageUrl"
              alt="大樓平面圖"
              class="w-full block"
              draggable="false"
            />

            <!-- Shapes overlay (read-only) -->
            <svg
              v-if="buildingInfo.shapes?.length"
              class="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <template v-for="shape in buildingInfo.shapes" :key="shape.id">
                <rect
                  v-if="shape.type === 'rect'"
                  :x="Math.min(shape.x1, shape.x2)"
                  :y="Math.min(shape.y1, shape.y2)"
                  :width="Math.abs(shape.x2 - shape.x1)"
                  :height="Math.abs(shape.y2 - shape.y1)"
                  :fill="shape.fill"
                  :stroke="shape.stroke"
                  stroke-width="0.5"
                  rx="0.5"
                />
                <line
                  v-if="shape.type === 'line'"
                  :x1="shape.x1" :y1="shape.y1"
                  :x2="shape.x2" :y2="shape.y2"
                  :stroke="shape.stroke"
                  stroke-width="0.6"
                  stroke-linecap="round"
                />
                <text
                  v-if="shape.type === 'text'"
                  :x="shape.x1" :y="shape.y1"
                  :fill="shape.stroke"
                  font-size="3.5"
                  font-family="sans-serif"
                  font-weight="600"
                >{{ shape.text }}</text>
              </template>
            </svg>

            <!-- Markers -->
            <div
              v-for="marker in buildingInfo.markers" :key="marker.id"
              class="absolute cursor-pointer group"
              :style="{ left: marker.x + '%', top: marker.y + '%', transform: 'translate(-50%, -100%)' }"
              @click="infoMarker = marker"
            >
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
                :class="markerConfig[marker.type]?.bg || 'bg-gray-500'">
                <span class="material-symbols-outlined text-[16px]">{{ marker.customIcon || markerConfig[marker.type]?.icon }}</span>
              </div>
              <div class="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent mx-auto"
                :class="markerConfig[marker.type]?.triangle"></div>
            </div>
          </div>

          <!-- Info Popup -->
          <Transition name="fade">
            <div v-if="infoMarker" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="infoMarker = null">
              <div class="bg-white dark:bg-card-dark rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-ink-100 dark:border-ink-800">
                <div class="flex items-start gap-3 mb-3">
                  <span class="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                    :class="markerConfig[infoMarker.type]?.bg || 'bg-gray-500'">
                    <span class="material-symbols-outlined text-[20px]">{{ infoMarker.customIcon || markerConfig[infoMarker.type]?.icon }}</span>
                  </span>
                  <div>
                    <div class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ infoMarker.label || markerConfig[infoMarker.type]?.label }}</div>
                    <div class="text-xs text-text-secondary-light">{{ markerConfig[infoMarker.type]?.label }}</div>
                  </div>
                </div>
                <p v-if="infoMarker.description" class="text-sm text-text-secondary-light whitespace-pre-wrap mb-4">{{ infoMarker.description }}</p>
                <button @click="infoMarker = null" class="w-full py-2 bg-ink-100 dark:bg-ink-700 rounded-xl text-sm font-medium hover:bg-ink-200 dark:hover:bg-ink-600 transition-colors">
                  關閉
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Tab: 設施說明（由地圖上有備註的標記彙整） -->
      <div v-if="activeTab === 'rules'" class="space-y-4">
        <div v-if="!facilityNotes.length" class="text-center py-16 text-text-secondary-light">
          <span class="material-symbols-outlined text-5xl mb-3 block">rule</span>
          <p>房東尚未填寫設施說明</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="note in facilityNotes"
            :key="note.id"
            class="bg-white dark:bg-card-dark rounded-2xl p-5 shadow-sm border border-ink-100 dark:border-ink-800"
          >
            <div class="flex items-start gap-3">
              <span class="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" :class="note.bg">
                <span class="material-symbols-outlined text-[20px]">{{ note.icon }}</span>
              </span>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark mb-1">{{ note.name }}</h3>
                <p class="text-sm text-text-secondary-light whitespace-pre-wrap">{{ note.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { db } from '../../firebase/config'
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore'
import {
  MARKER_CONFIG as markerConfig,
  SVG_TEMPLATES as svgTemplates,
  emptyBuildingInfo, normalizeBuildingInfo,
  type Marker, type MarkerType,
} from '../../utils/buildingMap'

const authStore = useAuthStore()
const isLoading = ref(true)
const buildingInfo = ref(emptyBuildingInfo())
const infoMarker = ref<Marker | null>(null)
const activeTab = ref<'map' | 'rules'>('map')
const propertyName = ref('')

const tabs = [
  { id: 'map', label: '互動地圖' },
  { id: 'rules', label: '設施說明' },
]

const currentSvgTemplate = computed(() =>
  svgTemplates[buildingInfo.value.templateId] || svgTemplates['blank']!)

const usedMarkerTypes = computed(() => {
  const seen = new Set<MarkerType>()
  buildingInfo.value.markers.forEach(m => { if (markerConfig[m.type]) seen.add(m.type) })
  return [...seen]
})

/** 設施說明＝地圖上有備註的標記；房東只要維護一處 */
const facilityNotes = computed(() => [
  ...buildingInfo.value.markers
    .filter(m => (m.description || '').trim())
    .map(m => ({
      id: m.id,
      name: m.label || markerConfig[m.type]?.label || '設施',
      description: m.description,
      icon: m.customIcon || markerConfig[m.type]?.icon || 'info',
      bg: markerConfig[m.type]?.bg || 'bg-gray-500',
    })),
  // 尚未轉換的舊「設施規範」仍照常顯示，房東轉換後自然消失
  ...buildingInfo.value.facilities.map(f => ({
    id: f.id,
    name: f.name,
    description: [f.location, f.rules].filter(Boolean).join('\n'),
    icon: 'meeting_room',
    bg: 'bg-amber-500',
  })),
])

const hasData = computed(() =>
  buildingInfo.value.mapType !== 'none' || facilityNotes.value.length > 0)

/** 找出自己住的那一棟；找不到就退回房東的共用一份 */
const resolvePropertyId = async (uid: string, landlordId: string): Promise<string> => {
  try {
    const tenantSnap = await getDocs(
      query(collection(db, 'tenants'), where('uid', '==', uid), limit(1)))
    const tenant: any = tenantSnap.docs[0]?.data()
    const roomName = tenant?.room || tenant?.roomNumber || ''
    if (!roomName) return ''
    const roomsSnap = await getDocs(
      query(collection(db, 'rooms'), where('landlordId', '==', landlordId)))
    const room: any = roomsSnap.docs
      .map(d => d.data())
      .find(r => (r.name || r.roomName) === roomName)
    return room?.propertyId || ''
  } catch (e) {
    console.warn('查詢所屬建物失敗，改用共用大樓資訊:', e)
    return ''
  }
}

const loadBuildingInfo = async () => {
  isLoading.value = true
  try {
    const uid = authStore.user?.uid
    const landlordId = (authStore.userProfile as any)?.landlordId
    if (!uid || !landlordId) return

    const propertyId = await resolvePropertyId(uid, landlordId)
    if (propertyId) {
      const snap = await getDoc(doc(db, 'properties', propertyId))
      if (snap.exists() && snap.data().buildingInfo) {
        propertyName.value = snap.data().name || ''
        buildingInfo.value = normalizeBuildingInfo(snap.data().buildingInfo)
        return
      }
    }
    // 這棟還沒設定（或房東還沒建立建物）→ 房東層級的共用一份
    const landlordDoc = await getDoc(doc(db, 'users', landlordId))
    if (landlordDoc.exists()) {
      buildingInfo.value = normalizeBuildingInfo(landlordDoc.data().buildingInfo)
    }
  } catch (e) {
    console.error('Load building info error:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (authStore.user) {
    loadBuildingInfo()
  } else {
    setTimeout(() => {
      if (authStore.user) loadBuildingInfo()
      else isLoading.value = false
    }, 1000)
  }
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
