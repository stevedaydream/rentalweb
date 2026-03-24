<template>
  <div class="max-w-5xl mx-auto space-y-6">

    <div class="flex items-center gap-3">
      <span class="material-symbols-outlined text-gold-500">apartment</span>
      <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">大樓資訊</h1>
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
        <div v-if="!buildingInfo.mapType" class="text-center py-16 text-text-secondary-light">
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
            <div v-for="(cfg, type) in markerConfig" :key="type" class="flex items-center gap-1.5 text-xs text-text-secondary-light">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]" :class="cfg.bg">
                <span class="material-symbols-outlined text-[12px]">{{ cfg.icon }}</span>
              </span>
              {{ cfg.label }}
            </div>
          </div>

          <!-- Map -->
          <div class="relative w-full select-none rounded-xl overflow-hidden border border-ink-100 dark:border-ink-700">
            <!-- SVG Template -->
            <div
              v-if="buildingInfo.mapType !== 'custom'"
              ref="mapEl"
              class="w-full"
              v-html="currentSvgTemplate"
            ></div>
            <!-- Custom Image -->
            <img
              v-else-if="buildingInfo.customImageUrl"
              ref="mapEl"
              :src="buildingInfo.customImageUrl"
              class="w-full block"
              draggable="false"
            />

            <!-- Shapes SVG overlay (read-only) -->
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
            <template v-for="marker in buildingInfo.markers" :key="marker.id">
              <div
                class="absolute cursor-pointer group"
                :style="{ left: marker.x + '%', top: marker.y + '%', transform: 'translate(-50%, -100%)' }"
                @click="showMarkerInfo(marker)"
              >
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
                  :class="markerConfig[marker.type]?.bg || 'bg-gray-500'">
                  <span class="material-symbols-outlined text-[16px]">{{ marker.customIcon || markerConfig[marker.type]?.icon }}</span>
                </div>
                <div class="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent mx-auto"
                  :class="markerConfig[marker.type]?.triangle"></div>
              </div>
            </template>
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
                <p v-if="infoMarker.description" class="text-sm text-text-secondary-light mb-4">{{ infoMarker.description }}</p>
                <button @click="infoMarker = null" class="w-full py-2 bg-ink-100 dark:bg-ink-700 rounded-xl text-sm font-medium hover:bg-ink-200 dark:hover:bg-ink-600 transition-colors">
                  關閉
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Tab: 設施規範 -->
      <div v-if="activeTab === 'rules'" class="space-y-4">
        <div v-if="!buildingInfo.facilities?.length" class="text-center py-16 text-text-secondary-light">
          <span class="material-symbols-outlined text-5xl mb-3 block">rule</span>
          <p>房東尚未設定設施規範</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="facility in buildingInfo.facilities"
            :key="facility.id"
            class="bg-white dark:bg-card-dark rounded-2xl p-5 shadow-sm border border-ink-100 dark:border-ink-800"
          >
            <div class="flex items-start gap-3">
              <span class="text-3xl leading-none">{{ facility.icon }}</span>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark mb-1">{{ facility.name }}</h3>
                <p class="text-sm text-text-secondary-light whitespace-pre-wrap">{{ facility.description }}</p>
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
import { doc, getDoc } from 'firebase/firestore'

type MarkerType = 'exit' | 'extinguisher' | 'firstaid' | 'facility' | 'warning' | 'appliance'

interface Marker {
  id: string
  type: MarkerType
  x: number
  y: number
  label: string
  description: string
  customIcon?: string
}

interface Facility {
  id: string
  icon: string
  name: string
  description: string
}

interface Shape {
  id: string
  type: 'rect' | 'line' | 'text'
  x1: number; y1: number
  x2: number; y2: number
  text?: string
  fill: string
  stroke: string
}

interface BuildingInfo {
  mapType: string
  customImageUrl?: string
  markers: Marker[]
  facilities: Facility[]
  shapes: Shape[]
}

const authStore = useAuthStore()
const isLoading = ref(true)
const buildingInfo = ref<BuildingInfo>({ mapType: '', markers: [], facilities: [], shapes: [] })
const infoMarker = ref<Marker | null>(null)
const activeTab = ref<'map' | 'rules'>('map')

const tabs = [
  { id: 'map', label: '互動地圖' },
  { id: 'rules', label: '設施規範' },
]

const markerConfig: Record<MarkerType, { icon: string; bg: string; triangle: string; label: string }> = {
  exit:         { icon: 'door_open',             bg: 'bg-green-500',  triangle: 'border-t-green-500',  label: '逃生出口' },
  extinguisher: { icon: 'fire_extinguisher',     bg: 'bg-red-500',    triangle: 'border-t-red-500',    label: '滅火器'   },
  firstaid:     { icon: 'medical_services',      bg: 'bg-blue-500',   triangle: 'border-t-blue-500',   label: '急救箱'   },
  facility:     { icon: 'meeting_room',          bg: 'bg-amber-500',  triangle: 'border-t-amber-500',  label: '公共設施' },
  warning:      { icon: 'warning',               bg: 'bg-orange-500', triangle: 'border-t-orange-500', label: '注意事項' },
  appliance:    { icon: 'local_laundry_service', bg: 'bg-purple-500', triangle: 'border-t-purple-500', label: '家電設備' },
}

const svgTemplates: Record<string, string> = {
  blank: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" class="w-full h-auto bg-gray-50 dark:bg-ink-900">
    <rect width="800" height="500" fill="#f9fafb"/>
    <rect x="20" y="20" width="760" height="460" fill="none" stroke="#d1d5db" stroke-width="2" stroke-dasharray="8,4"/>
    <text x="400" y="255" text-anchor="middle" fill="#9ca3af" font-size="16" font-family="sans-serif">（空白地圖）</text>
  </svg>`,

  studio: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" class="w-full h-auto">
    <rect width="800" height="500" fill="#f0f4f8"/>
    <rect x="40" y="40" width="720" height="420" fill="#fff" stroke="#64748b" stroke-width="3"/>
    <rect x="40" y="40" width="720" height="60" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
    <text x="400" y="78" text-anchor="middle" fill="#475569" font-size="14" font-weight="bold" font-family="sans-serif">套房平面圖</text>
    <rect x="60" y="130" width="200" height="160" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/>
    <text x="160" y="218" text-anchor="middle" fill="#1d4ed8" font-size="13" font-family="sans-serif">主臥室</text>
    <rect x="60" y="310" width="200" height="130" fill="#dcfce7" stroke="#22c55e" stroke-width="1.5"/>
    <text x="160" y="382" text-anchor="middle" fill="#15803d" font-size="13" font-family="sans-serif">衛浴</text>
    <rect x="280" y="130" width="460" height="310" fill="#fefce8" stroke="#eab308" stroke-width="1.5"/>
    <text x="510" y="292" text-anchor="middle" fill="#854d0e" font-size="13" font-family="sans-serif">客廳 / 餐廳 / 廚房</text>
    <rect x="340" y="420" width="80" height="40" fill="#fff" stroke="#64748b" stroke-width="2"/>
    <text x="380" y="446" text-anchor="middle" fill="#475569" font-size="11" font-family="sans-serif">入口</text>
  </svg>`,

  onebedroom: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" class="w-full h-auto">
    <rect width="800" height="550" fill="#f0f4f8"/>
    <rect x="40" y="40" width="720" height="470" fill="#fff" stroke="#64748b" stroke-width="3"/>
    <rect x="40" y="40" width="720" height="60" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
    <text x="400" y="78" text-anchor="middle" fill="#475569" font-size="14" font-weight="bold" font-family="sans-serif">一房一廳平面圖</text>
    <rect x="60" y="130" width="280" height="200" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/>
    <text x="200" y="237" text-anchor="middle" fill="#1d4ed8" font-size="13" font-family="sans-serif">主臥室</text>
    <rect x="60" y="350" width="140" height="140" fill="#dcfce7" stroke="#22c55e" stroke-width="1.5"/>
    <text x="130" y="427" text-anchor="middle" fill="#15803d" font-size="13" font-family="sans-serif">衛浴</text>
    <rect x="220" y="350" width="120" height="140" fill="#fce7f3" stroke="#ec4899" stroke-width="1.5"/>
    <text x="280" y="427" text-anchor="middle" fill="#be185d" font-size="13" font-family="sans-serif">廚房</text>
    <rect x="360" y="130" width="360" height="360" fill="#fefce8" stroke="#eab308" stroke-width="1.5"/>
    <text x="540" y="317" text-anchor="middle" fill="#854d0e" font-size="13" font-family="sans-serif">客廳 / 餐廳</text>
    <rect x="380" y="470" width="80" height="40" fill="#fff" stroke="#64748b" stroke-width="2"/>
    <text x="420" y="496" text-anchor="middle" fill="#475569" font-size="11" font-family="sans-serif">入口</text>
  </svg>`,

  twobedroom: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" class="w-full h-auto">
    <rect width="800" height="600" fill="#f0f4f8"/>
    <rect x="40" y="40" width="720" height="520" fill="#fff" stroke="#64748b" stroke-width="3"/>
    <rect x="40" y="40" width="720" height="60" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
    <text x="400" y="78" text-anchor="middle" fill="#475569" font-size="14" font-weight="bold" font-family="sans-serif">兩房一廳平面圖</text>
    <rect x="60" y="130" width="260" height="180" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/>
    <text x="190" y="227" text-anchor="middle" fill="#1d4ed8" font-size="13" font-family="sans-serif">主臥室</text>
    <rect x="60" y="330" width="260" height="180" fill="#ede9fe" stroke="#8b5cf6" stroke-width="1.5"/>
    <text x="190" y="427" text-anchor="middle" fill="#6d28d9" font-size="13" font-family="sans-serif">次臥室</text>
    <rect x="340" y="130" width="380" height="260" fill="#fefce8" stroke="#eab308" stroke-width="1.5"/>
    <text x="530" y="267" text-anchor="middle" fill="#854d0e" font-size="13" font-family="sans-serif">客廳 / 餐廳</text>
    <rect x="340" y="410" width="180" height="100" fill="#fce7f3" stroke="#ec4899" stroke-width="1.5"/>
    <text x="430" y="467" text-anchor="middle" fill="#be185d" font-size="13" font-family="sans-serif">廚房</text>
    <rect x="540" y="410" width="180" height="100" fill="#dcfce7" stroke="#22c55e" stroke-width="1.5"/>
    <text x="630" y="467" text-anchor="middle" fill="#15803d" font-size="13" font-family="sans-serif">衛浴</text>
    <rect x="350" y="510" width="80" height="40" fill="#fff" stroke="#64748b" stroke-width="2"/>
    <text x="390" y="536" text-anchor="middle" fill="#475569" font-size="11" font-family="sans-serif">入口</text>
  </svg>`,
}

const currentSvgTemplate = computed(() => {
  const t = buildingInfo.value.mapType
  return svgTemplates[t] || svgTemplates.blank
})

const hasData = computed(() =>
  buildingInfo.value.mapType || (buildingInfo.value.facilities?.length > 0)
)

const showMarkerInfo = (marker: Marker) => {
  infoMarker.value = marker
}

const loadBuildingInfo = async () => {
  isLoading.value = true
  try {
    // Get the landlord ID from the tenant's user document
    const tenantProfile = authStore.userProfile as any
    const landlordId = tenantProfile?.landlordId

    if (!landlordId) {
      isLoading.value = false
      return
    }

    const landlordDoc = await getDoc(doc(db, 'users', landlordId))
    if (landlordDoc.exists()) {
      const data = landlordDoc.data()
      if (data.buildingInfo) {
        buildingInfo.value = data.buildingInfo
      }
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
    }, 1000)
  }
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
