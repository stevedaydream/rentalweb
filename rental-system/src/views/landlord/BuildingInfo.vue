<template>
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">大樓資訊</h1>
        <p class="text-text-secondary-light">設定逃生圖、設施位置與使用規範，讓租客隨時查閱</p>
      </div>
      <div class="flex gap-3">
        <button
          v-if="activeTab === 'map' && buildingInfo.mapType !== 'none' && !showSetupOverlay"
          @click="toggleEditing"
          :class="isEditing ? 'bg-primary text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700' : 'border border-gray-200 dark:border-gray-700 text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800'"
          class="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <span class="material-symbols-outlined text-[18px]">{{ isEditing ? 'check' : 'edit' }}</span>
          {{ isEditing ? '完成編輯' : '編輯地圖' }}
        </button>
        <button
          v-if="hasChanges"
          @click="saveBuildingInfo"
          :disabled="isSaving"
          class="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-[18px]">{{ isSaving ? 'sync' : 'save' }}</span>
          {{ isSaving ? '儲存中...' : '儲存變更' }}
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gray-200 dark:border-gray-700">
      <button
        v-for="tab in tabs" :key="tab.value"
        @click="activeTab = tab.value as 'map' | 'facilities'"
        class="px-5 py-3 text-sm font-medium border-b-2 transition-colors relative top-[1px]"
        :class="activeTab === tab.value ? 'border-primary text-primary' : 'border-transparent text-text-secondary-light hover:text-gray-600 dark:hover:text-gray-300'"
      >
        <span class="material-symbols-outlined text-[16px] align-middle mr-1">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- ===== MAP TAB ===== -->
    <div v-if="activeTab === 'map'">

      <!-- Setup wizard (first time or overlay) -->
      <div v-if="buildingInfo.mapType === 'none' || showSetupOverlay"
        class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">選擇地圖底圖</h2>
            <p class="text-sm text-text-secondary-light mt-0.5">選擇內建樓層模板，或上傳自訂平面圖</p>
          </div>
          <button v-if="showSetupOverlay" @click="showSetupOverlay = false" class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Template grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            v-for="tmpl in templateOptions" :key="tmpl.id"
            @click="selectTemplate(tmpl.id)"
            class="group flex flex-col rounded-xl border-2 overflow-hidden transition-all"
            :class="buildingInfo.templateId === tmpl.id && buildingInfo.mapType === 'template'
              ? 'border-primary shadow-md shadow-blue-500/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'"
          >
            <div class="bg-gray-50 dark:bg-gray-800/50 p-2 overflow-hidden" v-html="tmpl.thumbnail"></div>
            <div class="p-3 text-left bg-white dark:bg-card-dark">
              <p class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{{ tmpl.name }}</p>
              <p class="text-xs text-text-secondary-light mt-0.5">{{ tmpl.desc }}</p>
            </div>
          </button>
        </div>

        <!-- Divider -->
        <div class="flex items-center gap-4">
          <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
          <span class="text-sm text-text-secondary-light">或</span>
          <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        <!-- Upload section -->
        <div
          class="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
          :class="buildingInfo.mapType === 'custom' ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'"
        >
          <span class="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-3">upload_file</span>
          <p class="font-medium text-text-primary-light dark:text-text-primary-dark mb-1">上傳自訂平面圖</p>
          <p class="text-sm text-text-secondary-light mb-4">支援 JPG、PNG、PDF（最大 5MB）</p>
          <label class="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
            <span class="material-symbols-outlined text-[18px]">attach_file</span>
            選擇圖片
            <input type="file" accept="image/*" class="hidden" @change="handleImageUpload">
          </label>
          <div v-if="uploadProgress !== null" class="mt-4">
            <div class="flex items-center justify-between text-xs text-text-secondary-light mb-1">
              <span>上傳中...</span><span>{{ uploadProgress }}%</span>
            </div>
            <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full transition-all" :style="{ width: uploadProgress + '%' }"></div>
            </div>
          </div>
          <p v-if="buildingInfo.mapType === 'custom'" class="text-xs text-primary mt-3 flex items-center justify-center gap-1">
            <span class="material-symbols-outlined text-[14px]">check_circle</span>已使用自訂圖片
          </p>
        </div>
      </div>

      <!-- Map display -->
      <div v-else class="space-y-4">

        <!-- Legend + Toolbar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            <span v-for="(cfg, type) in markerConfig" :key="type"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
              :class="cfg.bg"
            >
              <span class="material-symbols-outlined text-[13px]">{{ cfg.icon }}</span>
              {{ cfg.label }}
            </span>
          </div>
          <div class="flex gap-2">
            <button @click="showSetupOverlay = true" class="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1 transition-colors">
              <span class="material-symbols-outlined text-[15px]">swap_horiz</span>更換底圖
            </button>
          </div>
        </div>

        <!-- Drawing Toolbar (edit mode only) -->
        <div v-if="isEditing" class="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-700">
          <span class="text-xs font-medium text-text-secondary-light shrink-0">繪圖工具：</span>

          <!-- Tool buttons -->
          <div class="flex gap-1">
            <button
              v-for="tool in drawToolList" :key="tool.id"
              @click="drawTool = (drawTool === tool.id ? 'none' : tool.id) as DrawTool"
              :title="tool.label"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              :class="drawTool === tool.id
                ? 'bg-primary text-white shadow-sm'
                : 'border border-gray-200 dark:border-gray-700 text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800'"
            >
              <span class="material-symbols-outlined text-[15px]">{{ tool.icon }}</span>
              {{ tool.label }}
            </button>
          </div>

          <!-- Color presets (rect / line / text) -->
          <template v-if="drawTool === 'rect'">
            <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0"></div>
            <span class="text-xs text-text-secondary-light shrink-0">填色：</span>
            <div class="flex gap-1.5">
              <button
                v-for="c in roomColors" :key="c.stroke"
                @click="drawColorPreset = c"
                :title="c.label"
                class="w-5 h-5 rounded border-2 transition-all hover:scale-110"
                :style="{ background: c.fill === 'transparent' ? 'white' : c.fill, borderColor: drawColorPreset.stroke === c.stroke ? '#3b82f6' : c.stroke }"
              ></button>
            </div>
          </template>

          <template v-if="drawTool === 'line' || drawTool === 'text'">
            <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0"></div>
            <span class="text-xs text-text-secondary-light shrink-0">顏色：</span>
            <div class="flex gap-1.5">
              <button
                v-for="c in lineColors" :key="c.stroke"
                @click="drawColorPreset = c"
                :title="c.label"
                class="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
                :style="{ background: c.stroke, borderColor: drawColorPreset.stroke === c.stroke ? '#3b82f6' : 'transparent' }"
              ></button>
            </div>
          </template>

          <!-- Undo / Clear -->
          <div class="ml-auto flex gap-1.5">
            <button
              @click="undoShape"
              :disabled="!buildingInfo.shapes.length"
              title="復原"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <span class="material-symbols-outlined text-[15px]">undo</span>復原
            </button>
            <button
              @click="clearShapes"
              :disabled="!buildingInfo.shapes.length"
              title="清除全部圖形"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
            >
              <span class="material-symbols-outlined text-[15px]">delete_sweep</span>清除
            </button>
          </div>
        </div>

        <!-- Map container -->
        <div class="relative rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 select-none"
          :class="[
            isEditing ? 'ring-2 ring-primary' : '',
            isEditing && drawTool === 'none' ? 'cursor-crosshair' : '',
            isEditing && drawTool === 'erase' ? 'cursor-cell' : '',
          ]"
          ref="mapEl"
          @click="handleMapClick"
        >
          <!-- Template SVG -->
          <div v-if="buildingInfo.mapType === 'template'" v-html="svgTemplates[buildingInfo.templateId]"></div>
          <!-- Custom image -->
          <img v-else :src="buildingInfo.mapImageUrl!" class="w-full h-auto block" draggable="false">

          <!-- Markers -->
          <template v-for="marker in buildingInfo.markers" :key="marker.id">
            <div
              class="absolute -translate-x-1/2 group/marker"
              :style="{ left: marker.x + '%', top: marker.y + '%' }"
              style="transform: translate(-50%, -100%)"
              @click.stop="handleMarkerClick(marker, $event)"
            >
              <!-- Pin body -->
              <div class="relative flex flex-col items-center cursor-pointer">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover/marker:scale-110"
                  :class="markerConfig[marker.type].bg"
                >
                  <span class="material-symbols-outlined text-[18px]">{{ marker.customIcon || markerConfig[marker.type].icon }}</span>
                </div>
                <!-- Triangle pointer -->
                <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent"
                  :class="markerConfig[marker.type].triangle"></div>
                <!-- Label tooltip -->
                <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none">
                  {{ marker.label }}
                </div>
                <!-- Edit mode delete button -->
                <button
                  v-if="isEditing"
                  @click.stop="deleteMarker(marker.id)"
                  class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/marker:opacity-100 transition-opacity"
                >
                  <span class="material-symbols-outlined text-[10px]">close</span>
                </button>
              </div>
            </div>
          </template>

          <!-- Shapes SVG overlay -->
          <svg
            class="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            :style="{ pointerEvents: drawTool !== 'none' ? 'all' : 'none', cursor: drawTool !== 'none' && drawTool !== 'erase' ? 'crosshair' : 'default' }"
            @mousedown.prevent="handleDrawStart"
            @mousemove="handleDrawMove"
            @mouseup="handleDrawEnd"
            @mouseleave="handleDrawEnd"
          >
            <!-- Saved shapes -->
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
                :style="drawTool === 'erase' ? { cursor: 'pointer', pointerEvents: 'all' } : {}"
                @click.stop="drawTool === 'erase' && eraseShape(shape.id)"
              />
              <line
                v-if="shape.type === 'line'"
                :x1="shape.x1" :y1="shape.y1"
                :x2="shape.x2" :y2="shape.y2"
                :stroke="shape.stroke"
                stroke-width="0.6"
                stroke-linecap="round"
                :style="drawTool === 'erase' ? { cursor: 'pointer', pointerEvents: 'stroke' } : {}"
                @click.stop="drawTool === 'erase' && eraseShape(shape.id)"
              />
              <text
                v-if="shape.type === 'text'"
                :x="shape.x1" :y="shape.y1"
                :fill="shape.stroke"
                font-size="3.5"
                font-family="sans-serif"
                font-weight="600"
                :style="drawTool === 'erase' ? { cursor: 'pointer', pointerEvents: 'all' } : {}"
                @click.stop="drawTool === 'erase' && eraseShape(shape.id)"
              >{{ shape.text }}</text>
              <!-- Erase highlight overlay -->
              <rect
                v-if="shape.type === 'rect' && drawTool === 'erase'"
                :x="Math.min(shape.x1, shape.x2)"
                :y="Math.min(shape.y1, shape.y2)"
                :width="Math.abs(shape.x2 - shape.x1)"
                :height="Math.abs(shape.y2 - shape.y1)"
                fill="transparent"
                stroke="transparent"
                stroke-width="1"
                class="hover:stroke-red-400 hover:fill-red-50/30 transition-colors"
                style="cursor: pointer"
                @click.stop="eraseShape(shape.id)"
              />
            </template>
            <!-- Preview shape while drawing -->
            <rect
              v-if="previewShape?.type === 'rect'"
              :x="Math.min(previewShape.x1, previewShape.x2)"
              :y="Math.min(previewShape.y1, previewShape.y2)"
              :width="Math.abs(previewShape.x2 - previewShape.x1)"
              :height="Math.abs(previewShape.y2 - previewShape.y1)"
              :fill="previewShape.fill"
              :stroke="previewShape.stroke"
              stroke-width="0.5"
              stroke-dasharray="2,1"
              rx="0.5"
              style="pointer-events: none"
            />
            <line
              v-if="previewShape?.type === 'line'"
              :x1="previewShape.x1" :y1="previewShape.y1"
              :x2="previewShape.x2" :y2="previewShape.y2"
              :stroke="previewShape.stroke"
              stroke-width="0.6"
              stroke-dasharray="2,1"
              stroke-linecap="round"
              style="pointer-events: none"
            />
          </svg>

          <!-- Pending marker (while dialog is open) -->
          <div v-if="pendingPos"
            class="absolute animate-pulse pointer-events-none"
            :style="{ left: pendingPos.x + '%', top: pendingPos.y + '%' }"
            style="transform: translate(-50%, -100%)"
          >
            <div class="w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center text-white shadow-lg">
              <span class="material-symbols-outlined text-[18px]">add_location</span>
            </div>
            <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-gray-400 border-l-transparent border-r-transparent mx-auto"></div>
          </div>

          <!-- Edit mode hint -->
          <div v-if="isEditing" class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-primary/90 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none flex items-center gap-1.5 shadow">
            <span class="material-symbols-outlined text-[14px]">add_location_alt</span>
            點擊地圖任意位置新增標記
          </div>
        </div>

        <!-- Marker count -->
        <p class="text-xs text-text-secondary-light">共 {{ buildingInfo.markers.length }} 個標記</p>
      </div>
    </div>

    <!-- ===== FACILITIES TAB ===== -->
    <div v-if="activeTab === 'facilities'" class="space-y-5">
      <div class="flex justify-end">
        <button @click="openFacilityModal()" class="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
          <span class="material-symbols-outlined text-[18px]">add</span>新增設施
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="buildingInfo.facilities.length === 0" class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
        <span class="material-symbols-outlined text-5xl text-gray-300 mb-3">meeting_room</span>
        <p class="font-medium text-text-primary-light dark:text-text-primary-dark">尚未新增任何設施</p>
        <p class="text-sm text-text-secondary-light mt-1">新增滅火器、垃圾間、曬衣場等公共設施資訊</p>
      </div>

      <!-- Cards grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="facility in buildingInfo.facilities" :key="facility.id"
          class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm relative group"
        >
          <button @click="openFacilityModal(facility)"
            class="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all"
          ><span class="material-symbols-outlined text-[18px]">edit</span></button>
          <div class="text-4xl mb-3">{{ facility.icon }}</div>
          <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ facility.name }}</h3>
          <p class="text-xs text-text-secondary-light flex items-center gap-1 mt-1">
            <span class="material-symbols-outlined text-[13px]">location_on</span>{{ facility.location }}
          </p>
          <p v-if="facility.rules" class="text-sm text-text-secondary-light mt-3 line-clamp-3 whitespace-pre-line">{{ facility.rules }}</p>
        </div>
      </div>
    </div>

    <!-- ===== MARKER DIALOG ===== -->
    <div v-if="showMarkerDialog" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cancelMarkerDialog"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ editingMarkerId ? '編輯標記' : '新增標記' }}</h2>
          <button @click="cancelMarkerDialog" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="p-6 space-y-4">
          <!-- Type selector -->
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-2">標記類型</label>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="(cfg, type) in markerConfig" :key="type"
                @click="markerForm.type = (type as MarkerType); if (type !== 'appliance') markerForm.customIcon = ''"
                class="flex items-center gap-2 p-2 rounded-xl border-2 transition-all"
                :class="markerForm.type === type ? `${cfg.bg} border-transparent text-white` : 'border-gray-200 dark:border-gray-700 text-text-secondary-light hover:border-gray-300'"
              >
                <span class="material-symbols-outlined text-[18px] shrink-0">{{ cfg.icon }}</span>
                <span class="text-[11px] font-medium">{{ cfg.label }}</span>
              </button>
            </div>
          </div>

          <!-- Appliance icon picker (only for appliance type) -->
          <div v-if="markerForm.type === 'appliance'">
            <label class="block text-sm font-medium text-text-secondary-light mb-2">選擇家電圖示</label>
            <div class="grid grid-cols-6 gap-1.5 max-h-40 overflow-y-auto">
              <button v-for="item in applianceIcons" :key="item.icon"
                @click="markerForm.customIcon = item.icon"
                :title="item.label"
                class="flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all"
                :class="markerForm.customIcon === item.icon
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                  : 'border-gray-100 dark:border-gray-700 text-text-secondary-light hover:border-purple-300'"
              >
                <span class="material-symbols-outlined text-[20px]">{{ item.icon }}</span>
                <span class="text-[9px] leading-tight text-center">{{ item.label }}</span>
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">名稱</label>
            <input v-model="markerForm.label" type="text" class="form-input" placeholder="例如：B1 安全門、二樓走廊滅火器">
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">說明（選填）</label>
            <textarea v-model="markerForm.description" class="form-input min-h-[80px]" placeholder="使用說明、注意事項..."></textarea>
          </div>
        </div>
        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between">
          <button v-if="editingMarkerId" @click="deleteMarker(editingMarkerId); showMarkerDialog = false" class="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">delete</span>刪除標記
          </button>
          <div v-else></div>
          <div class="flex gap-3">
            <button @click="cancelMarkerDialog" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">取消</button>
            <button @click="saveMarker" :disabled="!markerForm.label" class="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">儲存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== TEXT INPUT DIALOG ===== -->
    <div v-if="showTextInputDialog" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showTextInputDialog = false"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">輸入文字標籤</h3>
        <input
          v-model="pendingTextValue"
          type="text"
          class="form-input"
          placeholder="例如：客廳、臥室、衛浴..."
          autofocus
          @keyup.enter="confirmTextInput"
          @keyup.escape="showTextInputDialog = false"
        />
        <div class="flex gap-3 justify-end">
          <button @click="showTextInputDialog = false" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">取消</button>
          <button @click="confirmTextInput" :disabled="!pendingTextValue.trim()" class="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">確定</button>
        </div>
      </div>
    </div>

    <!-- ===== MARKER INFO POPUP ===== -->
    <div v-if="selectedMarker && !isEditing" class="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-4" @click.self="selectedMarker = null">
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <button @click="selectedMarker = null" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><span class="material-symbols-outlined">close</span></button>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-full flex items-center justify-center text-white" :class="markerConfig[selectedMarker.type].bg">
            <span class="material-symbols-outlined text-[24px]">{{ selectedMarker.customIcon || markerConfig[selectedMarker.type].icon }}</span>
          </div>
          <div>
            <span class="text-xs font-medium px-2 py-0.5 rounded-full text-white" :class="markerConfig[selectedMarker.type].bg">{{ markerConfig[selectedMarker.type].label }}</span>
            <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark mt-1">{{ selectedMarker.label }}</h3>
          </div>
        </div>
        <p v-if="selectedMarker.description" class="text-sm text-text-secondary-light whitespace-pre-line">{{ selectedMarker.description }}</p>
        <p v-else class="text-sm text-gray-400 italic">無說明</p>
      </div>
    </div>

    <!-- ===== FACILITY MODAL ===== -->
    <div v-if="showFacilityModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showFacilityModal = false"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
          <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ editingFacilityId ? '編輯設施' : '新增設施' }}</h2>
          <button @click="showFacilityModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="p-6 space-y-4 overflow-y-auto">
          <!-- Icon picker -->
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-2">圖示</label>
            <div class="grid grid-cols-7 gap-2">
              <button v-for="emoji in facilityIcons" :key="emoji"
                @click="facilityForm.icon = emoji"
                class="text-2xl p-2 rounded-xl border-2 transition-all hover:scale-110"
                :class="facilityForm.icon === emoji ? 'border-primary bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700'"
              >{{ emoji }}</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">名稱</label>
            <input v-model="facilityForm.name" type="text" class="form-input" placeholder="例如：滅火器、垃圾間">
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">位置</label>
            <input v-model="facilityForm.location" type="text" class="form-input" placeholder="例如：一樓走廊、B1 停車場入口">
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">使用規範 / 說明</label>
            <textarea v-model="facilityForm.rules" class="form-input min-h-[100px]" placeholder="開放時間、使用注意事項..."></textarea>
          </div>
        </div>
        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
          <button v-if="editingFacilityId" @click="deleteFacility(editingFacilityId)" class="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">delete</span>刪除
          </button>
          <div v-else></div>
          <div class="flex gap-3">
            <button @click="showFacilityModal = false" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">取消</button>
            <button @click="saveFacility" :disabled="!facilityForm.name" class="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">儲存</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { db } from '../../firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

const authStore = useAuthStore()
const toast = useToastStore()
const storage = getStorage()

// --- Types ---
type MarkerType = 'exit' | 'extinguisher' | 'firstaid' | 'facility' | 'warning' | 'appliance'
interface Marker { id: string; x: number; y: number; type: MarkerType; label: string; description: string; customIcon?: string }
interface Facility { id: string; icon: string; name: string; location: string; rules: string }

type DrawTool = 'none' | 'rect' | 'line' | 'text' | 'erase'
interface Shape {
  id: string
  type: 'rect' | 'line' | 'text'
  x1: number; y1: number  // percentage 0-100
  x2: number; y2: number
  text?: string
  fill: string
  stroke: string
}
interface DrawColorPreset { fill: string; stroke: string; label: string }

interface BuildingInfo {
  mapType: 'none' | 'template' | 'custom'
  templateId: 'blank' | 'studio' | 'onebedroom' | 'twobedroom'
  mapImageUrl: string | null
  markers: Marker[]
  facilities: Facility[]
  shapes: Shape[]
}

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

// --- State ---
const buildingInfo = reactive<BuildingInfo>({
  mapType: 'none', templateId: 'blank', mapImageUrl: null, markers: [], facilities: [], shapes: []
})
const isLoading = ref(true)
const isSaving = ref(false)
const hasChanges = ref(false)
const activeTab = ref<'map' | 'facilities'>('map')
const isEditing = ref(false)
const showSetupOverlay = ref(false)
const uploadProgress = ref<number | null>(null)
const mapEl = ref<HTMLElement | null>(null)

// Marker dialog
const showMarkerDialog = ref(false)
const editingMarkerId = ref<string | null>(null)
const pendingPos = ref<{ x: number; y: number } | null>(null)
const markerForm = reactive<{ type: MarkerType; label: string; description: string; customIcon: string }>({ type: 'exit', label: '', description: '', customIcon: '' })

// Marker info popup
const selectedMarker = ref<Marker | null>(null)

// Drawing state
const drawTool = ref<DrawTool>('none')
const isDrawingShape = ref(false)
const drawStart = ref<{ x: number; y: number } | null>(null)
const previewShape = ref<Omit<Shape, 'id'> | null>(null)
const drawColorPreset = ref<DrawColorPreset>({ fill: '#dbeafe99', stroke: '#3b82f6', label: '藍色' })
const showTextInputDialog = ref(false)
const pendingTextPos = ref<{ x: number; y: number } | null>(null)
const pendingTextValue = ref('')

// Facility modal
const showFacilityModal = ref(false)
const editingFacilityId = ref<string | null>(null)
const facilityForm = reactive({ icon: '⚙️', name: '', location: '', rules: '' })

// --- Config ---
const markerConfig: Record<MarkerType, { icon: string; bg: string; triangle: string; label: string }> = {
  exit:         { icon: 'door_open',              bg: 'bg-green-500',   triangle: 'border-t-green-500',   label: '逃生出口' },
  extinguisher: { icon: 'fire_extinguisher',      bg: 'bg-red-500',     triangle: 'border-t-red-500',     label: '滅火器'   },
  firstaid:     { icon: 'medical_services',       bg: 'bg-blue-500',    triangle: 'border-t-blue-500',    label: '急救箱'   },
  facility:     { icon: 'meeting_room',           bg: 'bg-amber-500',   triangle: 'border-t-amber-500',   label: '公共設施' },
  warning:      { icon: 'warning',                bg: 'bg-orange-500',  triangle: 'border-t-orange-500',  label: '注意事項' },
  appliance:    { icon: 'local_laundry_service',  bg: 'bg-purple-500',  triangle: 'border-t-purple-500',  label: '家電設備' },
}

const applianceIcons: { icon: string; label: string }[] = [
  { icon: 'local_laundry_service', label: '洗衣機' },
  { icon: 'dry_cleaning',          label: '烘乾機' },
  { icon: 'kitchen',               label: '冰箱'   },
  { icon: 'microwave',             label: '微波爐' },
  { icon: 'water_heater',          label: '熱水器' },
  { icon: 'ac_unit',               label: '冷氣'   },
  { icon: 'wifi',                  label: 'Wi-Fi'  },
  { icon: 'elevator',              label: '電梯'   },
  { icon: 'fitness_center',        label: '健身房' },
  { icon: 'pool',                  label: '游泳池' },
  { icon: 'local_parking',         label: '停車場' },
  { icon: 'pedal_bike',            label: '停車格' },
  { icon: 'package_2',             label: '倉庫'   },
  { icon: 'security_camera',       label: '監視器' },
  { icon: 'electrical_services',   label: '電箱'   },
  { icon: 'plumbing',              label: '水管'   },
  { icon: 'solar_power',           label: '太陽能' },
  { icon: 'trash',                 label: '垃圾間' },
]

const facilityIcons = ['🧯', '🗑️', '🚿', '🔌', '🚰', '🏊', '🅿️', '🚲', '📦', '🔑', '💡', '♻️', '⚙️', '🧹', '📮', '🛗', '🏋️', '🌿']

const roomColors: DrawColorPreset[] = [
  { fill: '#dbeafe99', stroke: '#3b82f6', label: '藍（臥室）' },
  { fill: '#dcfce799', stroke: '#22c55e', label: '綠（衛浴）' },
  { fill: '#fefce899', stroke: '#eab308', label: '黃（客廳）' },
  { fill: '#fce7f399', stroke: '#ec4899', label: '粉（廚房）' },
  { fill: '#ede9fe99', stroke: '#8b5cf6', label: '紫（書房）' },
  { fill: '#f1f5f999', stroke: '#64748b', label: '灰（其他）' },
  { fill: 'transparent', stroke: '#374151', label: '透明' },
]

const lineColors: DrawColorPreset[] = [
  { fill: 'transparent', stroke: '#1f2937', label: '黑' },
  { fill: 'transparent', stroke: '#6b7280', label: '灰' },
  { fill: 'transparent', stroke: '#3b82f6', label: '藍' },
  { fill: 'transparent', stroke: '#ef4444', label: '紅' },
]

const drawToolList = [
  { id: 'rect',  icon: 'rectangle',        label: '矩形' },
  { id: 'line',  icon: 'horizontal_rule',  label: '線段' },
  { id: 'text',  icon: 'title',            label: '文字' },
  { id: 'erase', icon: 'ink_eraser',       label: '橡皮擦' },
]

const tabs = [
  { value: 'map', label: '互動地圖', icon: 'map' },
  { value: 'facilities', label: '設施規範', icon: 'list_alt' },
]

// --- SVG Templates ---
const svgTemplates: Record<string, string> = {
  blank: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" class="w-full h-auto block"><rect width="480" height="300" fill="#f9f9f7"/><rect x="8" y="8" width="464" height="284" fill="#fafaf8" stroke="#ccc" stroke-width="2" stroke-dasharray="8,4" rx="4"/><text x="240" y="158" text-anchor="middle" fill="#bbb" font-size="13" font-family="sans-serif">空白模板，點擊新增標記</text></svg>`,
  studio: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" class="w-full h-auto block"><rect width="480" height="300" fill="#f9f9f7"/><rect x="8" y="8" width="464" height="284" fill="none" stroke="#777" stroke-width="3"/><line x1="320" y1="8" x2="320" y2="190" stroke="#777" stroke-width="2"/><line x1="8" y1="218" x2="472" y2="218" stroke="#777" stroke-width="2"/><rect x="60" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="200" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="474" y="50" width="6" height="50" fill="#a0c8f0" rx="1"/><path d="M318 140 A28 28 0 0 0 290 112" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="318" y1="140" x2="318" y2="112" stroke="#aaa" stroke-width="1.5"/><path d="M160 218 A28 28 0 0 0 188 190" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="160" y1="218" x2="160" y2="190" stroke="#aaa" stroke-width="1.5"/><text x="164" y="118" text-anchor="middle" fill="#555" font-size="15" font-family="sans-serif" font-weight="500">居室 / 臥室</text><text x="396" y="105" text-anchor="middle" fill="#555" font-size="13" font-family="sans-serif">衛浴間</text><text x="240" y="262" text-anchor="middle" fill="#555" font-size="13" font-family="sans-serif">廚房 / 玄關</text></svg>`,
  onebedroom: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" class="w-full h-auto block"><rect width="480" height="300" fill="#f9f9f7"/><rect x="8" y="8" width="464" height="284" fill="none" stroke="#777" stroke-width="3"/><line x1="255" y1="8" x2="255" y2="210" stroke="#777" stroke-width="2"/><line x1="8" y1="210" x2="472" y2="210" stroke="#777" stroke-width="2"/><line x1="155" y1="210" x2="155" y2="292" stroke="#777" stroke-width="2"/><rect x="50" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="290" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="474" y="60" width="6" height="50" fill="#a0c8f0" rx="1"/><path d="M253 100 A28 28 0 0 0 225 72" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="253" y1="100" x2="253" y2="72" stroke="#aaa" stroke-width="1.5"/><path d="M95 210 A28 28 0 0 0 123 182" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="95" y1="210" x2="95" y2="182" stroke="#aaa" stroke-width="1.5"/><text x="131" y="118" text-anchor="middle" fill="#555" font-size="15" font-family="sans-serif" font-weight="500">客廳</text><text x="363" y="118" text-anchor="middle" fill="#555" font-size="15" font-family="sans-serif" font-weight="500">臥室</text><text x="81" y="258" text-anchor="middle" fill="#555" font-size="12" font-family="sans-serif">衛浴</text><text x="313" y="258" text-anchor="middle" fill="#555" font-size="12" font-family="sans-serif">廚房 / 玄關</text></svg>`,
  twobedroom: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" class="w-full h-auto block"><rect width="480" height="300" fill="#f9f9f7"/><rect x="8" y="8" width="464" height="284" fill="none" stroke="#777" stroke-width="3"/><line x1="8" y1="195" x2="472" y2="195" stroke="#777" stroke-width="2"/><line x1="255" y1="8" x2="255" y2="195" stroke="#777" stroke-width="2"/><line x1="175" y1="195" x2="175" y2="292" stroke="#777" stroke-width="2"/><rect x="50" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="290" y="5" width="50" height="6" fill="#a0c8f0" rx="1"/><rect x="474" y="60" width="6" height="50" fill="#a0c8f0" rx="1"/><path d="M200 193 A28 28 0 0 0 228 165" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="200" y1="193" x2="200" y2="165" stroke="#aaa" stroke-width="1.5"/><path d="M340 193 A28 28 0 0 0 368 165" fill="none" stroke="#aaa" stroke-width="1.5"/><line x1="340" y1="193" x2="340" y2="165" stroke="#aaa" stroke-width="1.5"/><text x="131" y="108" text-anchor="middle" fill="#555" font-size="14" font-family="sans-serif" font-weight="500">臥室 1</text><text x="363" y="108" text-anchor="middle" fill="#555" font-size="14" font-family="sans-serif" font-weight="500">臥室 2</text><text x="323" y="252" text-anchor="middle" fill="#555" font-size="13" font-family="sans-serif">客廳 / 餐廳</text><text x="91" y="250" text-anchor="middle" fill="#555" font-size="11" font-family="sans-serif">衛浴</text><text x="420" y="250" text-anchor="middle" fill="#555" font-size="11" font-family="sans-serif">廚房</text></svg>`,
}

const templateOptions = [
  { id: 'blank',      name: '空白模板', desc: '自由配置',   thumbnail: svgTemplates['blank']!.replace('class="w-full h-auto block"', 'style="width:100%;height:auto"') },
  { id: 'studio',     name: '套房型',   desc: '一室一廳',   thumbnail: svgTemplates['studio']!.replace('class="w-full h-auto block"', 'style="width:100%;height:auto"') },
  { id: 'onebedroom', name: '一房一廳', desc: '兩室一廳',   thumbnail: svgTemplates['onebedroom']!.replace('class="w-full h-auto block"', 'style="width:100%;height:auto"') },
  { id: 'twobedroom', name: '兩房一廳', desc: '三室一廳',   thumbnail: svgTemplates['twobedroom']!.replace('class="w-full h-auto block"', 'style="width:100%;height:auto"') },
]

// --- Load & Save ---
const loadBuildingInfo = async () => {
  const uid = authStore.effectiveUid
  if (!uid) return
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) {
      const data = snap.data().buildingInfo
      if (data) {
        buildingInfo.mapType = data.mapType ?? 'none'
        buildingInfo.templateId = data.templateId ?? 'blank'
        buildingInfo.mapImageUrl = data.mapImageUrl ?? null
        buildingInfo.markers = data.markers ?? []
        buildingInfo.facilities = data.facilities ?? []
        buildingInfo.shapes = data.shapes ?? []
      }
    }
  } catch (e) {
    console.error('BuildingInfo load error:', e)
  } finally {
    isLoading.value = false
  }
}

// Strip undefined values (Firestore rejects undefined)
const toPlain = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null))

const saveBuildingInfo = async () => {
  const uid = authStore.effectiveUid
  if (!uid) return
  isSaving.value = true
  try {
    await updateDoc(doc(db, 'users', uid), {
      buildingInfo: {
        mapType: buildingInfo.mapType,
        templateId: buildingInfo.templateId,
        mapImageUrl: buildingInfo.mapImageUrl ?? null,
        markers: toPlain(buildingInfo.markers),
        facilities: toPlain(buildingInfo.facilities),
        shapes: toPlain(buildingInfo.shapes),
      }
    })
    hasChanges.value = false
    toast.success('大樓資訊已儲存')
  } catch (e) {
    console.error('BuildingInfo save error:', e)
    toast.error('儲存失敗，請稍後再試')
  } finally {
    isSaving.value = false
  }
}

// --- Map interactions ---
const handleMapClick = (event: MouseEvent) => {
  if (!isEditing.value) return
  if (showMarkerDialog.value) return
  if (drawTool.value !== 'none') return  // drawing tool active, skip marker placement
  const el = mapEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100
  pendingPos.value = { x, y }
  editingMarkerId.value = null
  Object.assign(markerForm, { type: 'exit', label: '', description: '', customIcon: '' })
  showMarkerDialog.value = true
}

const handleMarkerClick = (marker: Marker, event: MouseEvent) => {
  event.stopPropagation()
  if (isEditing.value) {
    editingMarkerId.value = marker.id
    Object.assign(markerForm, { type: marker.type, label: marker.label, description: marker.description, customIcon: marker.customIcon || '' })
    pendingPos.value = null
    showMarkerDialog.value = true
  } else {
    selectedMarker.value = marker
  }
}

const saveMarker = () => {
  if (!markerForm.label) return
  const base = {
    type: markerForm.type,
    label: markerForm.label,
    description: markerForm.description,
    // Only include customIcon for appliance type; omit (not null/undefined) otherwise
    ...(markerForm.type === 'appliance'
      ? { customIcon: markerForm.customIcon || markerConfig.appliance.icon }
      : {}),
  }
  if (editingMarkerId.value) {
    const idx = buildingInfo.markers.findIndex(m => m.id === editingMarkerId.value)
    if (idx !== -1) {
      const existing = buildingInfo.markers[idx]!
      // Remove customIcon from existing when switching away from appliance
      const { customIcon: _removed, ...rest } = existing as any
      buildingInfo.markers[idx] = { ...rest, ...base }
    }
  } else if (pendingPos.value) {
    buildingInfo.markers.push({ id: genId(), x: pendingPos.value.x, y: pendingPos.value.y, ...base })
  }
  hasChanges.value = true
  cancelMarkerDialog()
}

const cancelMarkerDialog = () => {
  showMarkerDialog.value = false
  pendingPos.value = null
  editingMarkerId.value = null
}

const deleteMarker = (id: string) => {
  const idx = buildingInfo.markers.findIndex(m => m.id === id)
  if (idx !== -1) { buildingInfo.markers.splice(idx, 1); hasChanges.value = true }
  showMarkerDialog.value = false
}

const toggleEditing = () => {
  isEditing.value = !isEditing.value
  if (!isEditing.value) {
    drawTool.value = 'none'
    previewShape.value = null
    isDrawingShape.value = false
  }
}

// --- Drawing ---
const getSvgPos = (event: MouseEvent): { x: number; y: number } => {
  const el = mapEl.value
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
  }
}

const handleDrawStart = (event: MouseEvent) => {
  if (drawTool.value === 'none' || drawTool.value === 'erase') return
  if (drawTool.value === 'text') {
    const pos = getSvgPos(event)
    pendingTextPos.value = pos
    pendingTextValue.value = ''
    showTextInputDialog.value = true
    return
  }
  isDrawingShape.value = true
  drawStart.value = getSvgPos(event)
}

const handleDrawMove = (event: MouseEvent) => {
  if (!isDrawingShape.value || !drawStart.value) return
  const pos = getSvgPos(event)
  previewShape.value = {
    type: drawTool.value as 'rect' | 'line',
    x1: drawStart.value.x, y1: drawStart.value.y,
    x2: pos.x, y2: pos.y,
    fill: drawColorPreset.value.fill,
    stroke: drawColorPreset.value.stroke,
  }
}

const handleDrawEnd = (event: MouseEvent) => {
  if (!isDrawingShape.value || !drawStart.value) {
    isDrawingShape.value = false
    return
  }
  const pos = getSvgPos(event)
  const dx = Math.abs(pos.x - drawStart.value.x)
  const dy = Math.abs(pos.y - drawStart.value.y)
  if (dx > 0.5 || dy > 0.5) {
    buildingInfo.shapes.push({
      id: genId(),
      type: drawTool.value as 'rect' | 'line',
      x1: drawStart.value.x, y1: drawStart.value.y,
      x2: pos.x, y2: pos.y,
      fill: drawColorPreset.value.fill,
      stroke: drawColorPreset.value.stroke,
    })
    hasChanges.value = true
  }
  isDrawingShape.value = false
  drawStart.value = null
  previewShape.value = null
}

const confirmTextInput = () => {
  if (pendingTextValue.value.trim() && pendingTextPos.value) {
    buildingInfo.shapes.push({
      id: genId(), type: 'text',
      x1: pendingTextPos.value.x, y1: pendingTextPos.value.y,
      x2: pendingTextPos.value.x, y2: pendingTextPos.value.y,
      text: pendingTextValue.value.trim(),
      fill: 'transparent',
      stroke: drawColorPreset.value.stroke,
    })
    hasChanges.value = true
  }
  showTextInputDialog.value = false
  pendingTextPos.value = null
}

const eraseShape = (id: string) => {
  const idx = buildingInfo.shapes.findIndex(s => s.id === id)
  if (idx !== -1) { buildingInfo.shapes.splice(idx, 1); hasChanges.value = true }
}

const undoShape = () => {
  if (buildingInfo.shapes.length) { buildingInfo.shapes.pop(); hasChanges.value = true }
}

const clearShapes = () => {
  if (!buildingInfo.shapes.length) return
  if (confirm('確定要清除所有繪製的圖形嗎？')) {
    buildingInfo.shapes = []
    hasChanges.value = true
  }
}

// --- Template selection ---
const selectTemplate = (id: string) => {
  buildingInfo.mapType = 'template'
  buildingInfo.templateId = id as any
  hasChanges.value = true
  showSetupOverlay.value = false
}

// --- Image upload ---
const handleImageUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const uid = authStore.effectiveUid
  const fileRef = storageRef(storage, `building-maps/${uid}/${Date.now()}_${file.name}`)
  uploadProgress.value = 0
  const task = uploadBytesResumable(fileRef, file)
  task.on('state_changed',
    snap => { uploadProgress.value = Math.round((snap.bytesTransferred / snap.totalBytes) * 100) },
    () => { toast.error('圖片上傳失敗'); uploadProgress.value = null },
    async () => {
      const url = await getDownloadURL(task.snapshot.ref)
      buildingInfo.mapImageUrl = url
      buildingInfo.mapType = 'custom'
      hasChanges.value = true
      uploadProgress.value = null
      showSetupOverlay.value = false
      toast.success('圖片已上傳')
    }
  )
}

// --- Facility CRUD ---
const openFacilityModal = (facility?: Facility) => {
  if (facility) {
    editingFacilityId.value = facility.id
    Object.assign(facilityForm, { icon: facility.icon, name: facility.name, location: facility.location, rules: facility.rules })
  } else {
    editingFacilityId.value = null
    Object.assign(facilityForm, { icon: '⚙️', name: '', location: '', rules: '' })
  }
  showFacilityModal.value = true
}

const saveFacility = () => {
  if (!facilityForm.name) return
  if (editingFacilityId.value) {
    const idx = buildingInfo.facilities.findIndex(f => f.id === editingFacilityId.value)
    if (idx !== -1) buildingInfo.facilities[idx] = { id: editingFacilityId.value, ...facilityForm }
  } else {
    buildingInfo.facilities.push({ id: genId(), ...facilityForm })
  }
  hasChanges.value = true
  showFacilityModal.value = false
}

const deleteFacility = (id: string) => {
  const idx = buildingInfo.facilities.findIndex(f => f.id === id)
  if (idx !== -1) { buildingInfo.facilities.splice(idx, 1); hasChanges.value = true }
  showFacilityModal.value = false
}

onMounted(loadBuildingInfo)
</script>
