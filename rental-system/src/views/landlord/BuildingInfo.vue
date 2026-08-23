<template>
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">大樓資訊</h1>
        <p class="text-text-secondary-light">標出逃生出口、滅火器與公共設施位置，租客隨時可查閱</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <!-- 建物切換 -->
        <select
          v-if="properties.length"
          v-model="activePropertyId"
          @change="switchProperty"
          aria-label="選擇建物"
          class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          <option v-for="p in properties" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>

        <button
          v-if="buildingInfo.mapType !== 'none' && !showSetupOverlay"
          @click="toggleLock"
          :class="locked
            ? 'border border-gray-200 dark:border-gray-700 text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800'
            : 'bg-gold-500 text-white shadow-lg shadow-gold-500/30 hover:bg-gold-600'"
          class="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <span class="material-symbols-outlined text-[18px]">{{ locked ? 'lock' : 'lock_open' }}</span>
          {{ locked ? '解鎖編輯' : '鎖定' }}
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

    <!-- 尚未建立建物：沿用共用一份 -->
    <div v-if="!isLoading && !properties.length"
      class="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3 text-sm">
      <span class="material-symbols-outlined text-blue-500 text-[20px]">info</span>
      <p class="text-blue-800 dark:text-blue-200">
        尚未建立任何建物，目前這張圖由名下所有租客共用。到「房源管理 → 建物」建立後，即可一棟一張圖。
      </p>
    </div>

    <!-- 舊版大樓資訊帶入提示 -->
    <div v-if="legacyDraft"
      class="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm">
      <span class="material-symbols-outlined text-amber-500 text-[20px]">move_up</span>
      <p class="text-amber-800 dark:text-amber-300">
        這棟還沒有自己的大樓資訊，已帶入舊版共用的設定。確認無誤後按「儲存變更」即歸入
        <strong>{{ activePropertyName }}</strong>。
      </p>
    </div>

    <!-- 舊「設施規範」待轉換 -->
    <div v-if="buildingInfo.facilities.length"
      class="flex flex-col sm:flex-row sm:items-center gap-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl px-4 py-3 text-sm">
      <span class="material-symbols-outlined text-purple-500 text-[20px] shrink-0">playlist_add</span>
      <p class="flex-1 text-purple-800 dark:text-purple-300">
        舊版的「設施規範」有 {{ buildingInfo.facilities.length }} 筆。設施說明已整合進地圖標記，轉換後請把它們拖到正確位置。
      </p>
      <button @click="convertFacilities"
        class="shrink-0 px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors">
        轉為地圖標記
      </button>
    </div>

    <div v-if="isLoading" class="flex justify-center py-16">
      <span class="material-symbols-outlined animate-spin text-4xl text-ink-200">progress_activity</span>
    </div>

    <template v-else>
      <!-- 選擇底圖 -->
      <div v-if="buildingInfo.mapType === 'none' || showSetupOverlay"
        class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark">選擇地圖底圖</h2>
            <p class="text-sm text-text-secondary-light mt-0.5">上傳現成的平面圖或消防逃生圖，或先用內建樣板</p>
          </div>
          <button v-if="showSetupOverlay" @click="showSetupOverlay = false" aria-label="關閉"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- 上傳 -->
        <div
          class="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
          :class="buildingInfo.mapType === 'custom' ? 'border-gold-500 bg-gold-50/50 dark:bg-gold-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gold-500/50'"
        >
          <span class="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-3">upload_file</span>
          <p class="font-medium text-text-primary-light dark:text-text-primary-dark mb-1">上傳平面圖</p>
          <p class="text-sm text-text-secondary-light mb-4">支援 JPG、PNG（最大 5MB）</p>
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
              <div class="h-full bg-gold-500 rounded-full transition-all" :style="{ width: uploadProgress + '%' }"></div>
            </div>
          </div>
          <p v-if="buildingInfo.mapType === 'custom'" class="text-xs text-gold-600 mt-3 flex items-center justify-center gap-1">
            <span class="material-symbols-outlined text-[14px]">check_circle</span>已使用自訂圖片
          </p>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
          <span class="text-sm text-text-secondary-light">或使用內建樣板</span>
          <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
        </div>

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
      </div>

      <!-- 地圖 -->
      <div v-else class="space-y-4">

        <!-- 圖例 + 更換底圖 -->
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
          <button @click="showSetupOverlay = true"
            class="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1 transition-colors self-start">
            <span class="material-symbols-outlined text-[15px]">swap_horiz</span>更換底圖
          </button>
        </div>

        <!-- 編輯提示 -->
        <div v-if="!locked" class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold-50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-800 text-xs text-gold-800 dark:text-gold-300">
          <span class="material-symbols-outlined text-[16px]">touch_app</span>
          點地圖任一處挑選要放的標記；標記可直接拖曳，選取後用方向鍵微調（按住 Shift 移動較大格）。
        </div>

        <!-- 進階：繪圖工具 -->
        <div class="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-700">
          <button
            @click="showAdvanced = !showAdvanced"
            class="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-text-secondary-light uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <span class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">draw</span>
              進階：在底圖上加畫格局
            </span>
            <span class="material-symbols-outlined text-[16px] transition-transform" :class="showAdvanced ? 'rotate-180' : ''">expand_more</span>
          </button>

          <div v-show="showAdvanced" class="px-4 pb-3">
            <p v-if="locked" class="text-xs text-text-secondary-light py-2">先按右上角「解鎖編輯」才能繪圖。</p>
            <div v-else class="flex flex-wrap items-center gap-2 pt-1">
              <div class="flex gap-1">
                <button
                  v-for="tool in drawToolList" :key="tool.id"
                  @click="drawTool = (drawTool === tool.id ? 'none' : tool.id) as DrawTool"
                  :title="tool.label"
                  class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  :class="drawTool === tool.id
                    ? 'bg-gold-500 text-white shadow-sm'
                    : 'border border-gray-200 dark:border-gray-700 text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800'"
                >
                  <span class="material-symbols-outlined text-[15px]">{{ tool.icon }}</span>
                  {{ tool.label }}
                </button>
              </div>

              <template v-if="drawTool === 'rect'">
                <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0"></div>
                <span class="text-xs text-text-secondary-light shrink-0">填色：</span>
                <div class="flex gap-1.5">
                  <button
                    v-for="c in roomColors" :key="c.stroke"
                    @click="drawColorPreset = c"
                    :title="c.label"
                    :aria-label="c.label"
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
                    :aria-label="c.label"
                    class="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
                    :style="{ background: c.stroke, borderColor: drawColorPreset.stroke === c.stroke ? '#3b82f6' : 'transparent' }"
                  ></button>
                </div>
              </template>

              <div class="ml-auto flex items-center gap-1.5">
                <button
                  @click="undoShape"
                  :disabled="!buildingInfo.shapes.length"
                  class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  <span class="material-symbols-outlined text-[15px]">undo</span>復原
                </button>
                <template v-if="confirmClearShapes">
                  <span class="text-xs text-red-600">確定清除？</span>
                  <button @click="clearShapes" class="text-xs text-red-600 hover:underline">確定</button>
                  <button @click="confirmClearShapes = false" class="text-xs text-gray-500 hover:underline">取消</button>
                </template>
                <button
                  v-else
                  @click="confirmClearShapes = true"
                  :disabled="!buildingInfo.shapes.length"
                  class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                >
                  <span class="material-symbols-outlined text-[15px]">delete_sweep</span>清除
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 地圖容器（外層不裁切，供選單浮出） -->
        <div class="relative">
          <div class="relative rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 select-none"
            :class="[
              !locked ? 'ring-2 ring-gold-400' : '',
              !locked && drawTool === 'none' ? 'cursor-crosshair' : '',
              !locked && drawTool === 'erase' ? 'cursor-cell' : '',
            ]"
            ref="mapEl"
            @click="handleMapClick"
          >
            <div v-if="buildingInfo.mapType === 'template'" v-html="svgTemplates[buildingInfo.templateId]"></div>
            <img v-else :src="buildingInfo.mapImageUrl!" alt="大樓平面圖" class="w-full h-auto block" draggable="false">

            <!-- 圖形 -->
            <svg
              class="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              :style="{ pointerEvents: !locked && drawTool !== 'none' ? 'all' : 'none', cursor: drawTool !== 'none' && drawTool !== 'erase' ? 'crosshair' : 'default' }"
              @mousedown.prevent="handleDrawStart"
              @mousemove="handleDrawMove"
              @mouseup="handleDrawEnd"
              @mouseleave="handleDrawEnd"
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
              </template>

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

            <!-- 標記 -->
            <div
              v-for="marker in buildingInfo.markers" :key="marker.id"
              class="absolute group/marker"
              :class="locked ? '' : 'touch-none'"
              :style="{ left: marker.x + '%', top: marker.y + '%', transform: 'translate(-50%, -100%)' }"
              @pointerdown="startDrag(marker, $event)"
              @click.stop="handleMarkerClick(marker)"
            >
              <div class="relative flex flex-col items-center"
                :class="locked ? 'cursor-pointer' : (dragId === marker.id ? 'cursor-grabbing' : 'cursor-grab')">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover/marker:scale-110"
                  :class="[markerConfig[marker.type].bg, selectedMarkerId === marker.id && !locked ? 'ring-4 ring-gold-300 dark:ring-gold-600' : '']"
                >
                  <span class="material-symbols-outlined text-[18px]">{{ marker.customIcon || markerConfig[marker.type].icon }}</span>
                </div>
                <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent"
                  :class="markerConfig[marker.type].triangle"></div>
                <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none">
                  {{ marker.label }}
                </div>
              </div>
            </div>
          </div>

          <!-- 放置選單：點地圖後就地挑圖示 -->
          <div v-if="placePos"
            class="absolute z-30 w-60 bg-white dark:bg-card-dark rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2"
            :style="pickerStyle"
            @click.stop
          >
            <div class="flex items-center justify-between px-1 pb-1.5">
              <span class="text-xs font-bold text-text-secondary-light">{{ pickerAppliance ? '選擇家電' : '要放什麼？' }}</span>
              <button @click="pickerAppliance ? (pickerAppliance = false) : cancelPlace()" aria-label="返回"
                class="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <span class="material-symbols-outlined text-[16px]">{{ pickerAppliance ? 'arrow_back' : 'close' }}</span>
              </button>
            </div>

            <div v-if="!pickerAppliance" class="grid grid-cols-2 gap-1">
              <button
                v-for="(cfg, type) in markerConfig" :key="type"
                @click="type === 'appliance' ? (pickerAppliance = true) : placeMarker(type as MarkerType)"
                class="flex items-center gap-1.5 px-2 py-2 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span class="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0" :class="cfg.bg">
                  <span class="material-symbols-outlined text-[14px]">{{ cfg.icon }}</span>
                </span>
                <span class="text-xs font-medium text-text-primary-light dark:text-text-primary-dark">{{ cfg.label }}</span>
              </button>
            </div>

            <div v-else class="grid grid-cols-4 gap-1 max-h-52 overflow-y-auto">
              <button
                v-for="item in applianceIcons" :key="item.icon"
                @click="placeMarker('appliance', item)"
                :title="item.label"
                class="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-text-secondary-light transition-colors"
              >
                <span class="material-symbols-outlined text-[18px]">{{ item.icon }}</span>
                <span class="text-[9px] leading-tight text-center">{{ item.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <p class="text-xs text-text-secondary-light">共 {{ buildingInfo.markers.length }} 個標記</p>
      </div>
    </template>

    <!-- 標記編輯面板（解鎖時點標記） -->
    <div v-if="editingMarker" class="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-4" @click.self="closeMarkerEditor">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeMarkerEditor"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-sm shadow-2xl">
        <div class="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <span class="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" :class="markerConfig[editingMarker.type].bg">
            <span class="material-symbols-outlined text-[20px]">{{ editingMarker.customIcon || markerConfig[editingMarker.type].icon }}</span>
          </span>
          <div class="flex-1 min-w-0">
            <span class="text-xs text-text-secondary-light">{{ markerConfig[editingMarker.type].label }}</span>
            <h2 class="font-bold text-text-primary-light dark:text-text-primary-dark truncate">{{ editingMarker.label }}</h2>
          </div>
          <button @click="closeMarkerEditor" aria-label="關閉" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label for="marker-label" class="block text-sm font-medium text-text-secondary-light mb-1">名稱</label>
            <input id="marker-label" v-model="editingMarker.label" type="text" class="form-input" @input="hasChanges = true">
          </div>
          <div>
            <label for="marker-desc" class="block text-sm font-medium text-text-secondary-light mb-1">備註（選填）</label>
            <textarea id="marker-desc" v-model="editingMarker.description" class="form-input min-h-[90px]"
              placeholder="使用時段、注意事項…租客點這個標記就會看到" @input="hasChanges = true"></textarea>
          </div>
          <p class="text-xs text-text-secondary-light flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">open_with</span>
            關掉此視窗後可直接拖曳，或用方向鍵微調位置。
          </p>
        </div>
        <div class="p-5 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <button @click="deleteMarker(editingMarker.id)" class="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">delete</span>刪除標記
          </button>
          <button @click="closeMarkerEditor" class="px-4 py-2 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors">完成</button>
        </div>
      </div>
    </div>

    <!-- 文字標籤輸入（繪圖工具） -->
    <div v-if="showTextInputDialog" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showTextInputDialog = false"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">輸入文字標籤</h3>
        <input
          v-model="pendingTextValue"
          type="text"
          class="form-input"
          placeholder="例如：客廳、臥室、衛浴…"
          @keyup.enter="confirmTextInput"
          @keyup.escape="showTextInputDialog = false"
        />
        <div class="flex gap-3 justify-end">
          <button @click="showTextInputDialog = false" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">取消</button>
          <button @click="confirmTextInput" :disabled="!pendingTextValue.trim()" class="px-4 py-2 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 disabled:opacity-50 transition-colors">確定</button>
        </div>
      </div>
    </div>

    <!-- 標記資訊（鎖定時點標記，與租客看到的一致） -->
    <div v-if="selectedMarker" class="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-4" @click.self="selectedMarker = null">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="selectedMarker = null"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <button @click="selectedMarker = null" aria-label="關閉" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined">close</span>
        </button>
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

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import { db } from '../../firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { getProperties } from '../../services/propertyService'
import type { Property } from '../../types/index'
import {
  MARKER_CONFIG as markerConfig,
  APPLIANCE_ICONS as applianceIcons,
  SVG_TEMPLATES as svgTemplates,
  TEMPLATE_OPTIONS as templateOptions,
  emptyBuildingInfo, normalizeBuildingInfo,
  type MarkerType, type Marker, type BuildingInfoData,
} from '../../utils/buildingMap'

const authStore = useAuthStore()
const toast = useToastStore()
const storage = getStorage()

type DrawTool = 'none' | 'rect' | 'line' | 'text' | 'erase'
interface DrawColorPreset { fill: string; stroke: string; label: string }

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const clampPct = (n: number) => Math.max(0, Math.min(100, n))

// --- State ---
const buildingInfo = reactive<BuildingInfoData>(emptyBuildingInfo())
const isLoading = ref(true)
const isSaving = ref(false)
const hasChanges = ref(false)
const showSetupOverlay = ref(false)
const showAdvanced = ref(false)
const uploadProgress = ref<number | null>(null)
const mapEl = ref<HTMLElement | null>(null)

// 一棟一張圖；沒有任何建物時 activePropertyId 為空字串，退回舊的共用一份（users.buildingInfo）
const properties = ref<Property[]>([])
const activePropertyId = ref('')
const legacyDraft = ref(false)
const activePropertyName = computed(() => properties.value.find(p => p.id === activePropertyId.value)?.name || '')

// 鎖定：預設鎖住，避免瀏覽時誤觸產生標記
const locked = ref(true)
const selectedMarkerId = ref<string | null>(null)
const editingMarker = ref<Marker | null>(null)
const selectedMarker = ref<Marker | null>(null)

// 放置選單
const placePos = ref<{ x: number; y: number } | null>(null)
const pickerAppliance = ref(false)
const pickerStyle = computed(() => {
  const p = placePos.value
  if (!p) return {}
  // 靠右／靠下時往回翻，選單才不會超出地圖
  const flipX = p.x > 60
  const flipY = p.y > 55
  return {
    left: p.x + '%',
    top: p.y + '%',
    transform: `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`,
  }
})

// 拖曳
const dragId = ref<string | null>(null)
const dragMoved = ref(false)

// 繪圖
const drawTool = ref<DrawTool>('none')
const isDrawingShape = ref(false)
const drawStart = ref<{ x: number; y: number } | null>(null)
const previewShape = ref<any>(null)
const drawColorPreset = ref<DrawColorPreset>({ fill: '#dbeafe99', stroke: '#3b82f6', label: '藍色' })
const showTextInputDialog = ref(false)
const pendingTextPos = ref<{ x: number; y: number } | null>(null)
const pendingTextValue = ref('')
const confirmClearShapes = ref(false)

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

// --- 載入 / 儲存 ---
const legacyInfo = ref<any>(null)

const loadBuildingInfo = async () => {
  const uid = authStore.effectiveUid
  if (!uid) return
  isLoading.value = true
  try {
    const [userSnap, props] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getProperties(uid).catch(() => [] as Property[]),
    ])
    legacyInfo.value = userSnap.exists() ? userSnap.data().buildingInfo ?? null : null
    properties.value = props
    activePropertyId.value = props[0]?.id || ''
    applyActiveSource()
  } catch (e) {
    console.error('BuildingInfo load error:', e)
    toast.error('載入失敗，請重新整理')
  } finally {
    isLoading.value = false
  }
}

/** 把目前選到的來源（某棟建物，或無建物時的共用一份）填進編輯器 */
const applyActiveSource = (raw?: any) => {
  legacyDraft.value = false
  if (!activePropertyId.value) {
    Object.assign(buildingInfo, normalizeBuildingInfo(legacyInfo.value))
    return
  }
  if (raw) {
    Object.assign(buildingInfo, normalizeBuildingInfo(raw))
    return
  }
  // 這棟還沒有自己的資料：帶入舊的共用設定當草稿，存檔後才真正歸入這棟
  if (legacyInfo.value) {
    Object.assign(buildingInfo, normalizeBuildingInfo(legacyInfo.value))
    legacyDraft.value = true
    hasChanges.value = true
  } else {
    Object.assign(buildingInfo, emptyBuildingInfo())
  }
}

const switchProperty = async () => {
  locked.value = true
  selectedMarkerId.value = null
  drawTool.value = 'none'
  if (!activePropertyId.value) { applyActiveSource(); return }
  isLoading.value = true
  try {
    const snap = await getDoc(doc(db, 'properties', activePropertyId.value))
    const info = snap.exists() ? snap.data().buildingInfo : null
    hasChanges.value = false
    applyActiveSource(info || undefined)
  } catch (e) {
    console.error('切換建物失敗:', e)
    toast.error('讀取此棟資料失敗')
  } finally {
    isLoading.value = false
  }
}

// Firestore 不吃 undefined
const toPlain = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null))

const saveBuildingInfo = async () => {
  const uid = authStore.effectiveUid
  if (!uid) return
  isSaving.value = true
  try {
    const payload = {
      mapType: buildingInfo.mapType,
      templateId: buildingInfo.templateId,
      mapImageUrl: buildingInfo.mapImageUrl ?? null,
      markers: toPlain(buildingInfo.markers),
      facilities: toPlain(buildingInfo.facilities),
      shapes: toPlain(buildingInfo.shapes),
    }
    if (activePropertyId.value) {
      await updateDoc(doc(db, 'properties', activePropertyId.value), { buildingInfo: payload })
    } else {
      await updateDoc(doc(db, 'users', uid), { buildingInfo: payload })
      legacyInfo.value = payload
    }
    legacyDraft.value = false
    hasChanges.value = false
    toast.success('大樓資訊已儲存')
  } catch (e) {
    console.error('BuildingInfo save error:', e)
    toast.error('儲存失敗，請稍後再試')
  } finally {
    isSaving.value = false
  }
}

// --- 標記 ---
const toggleLock = () => {
  locked.value = !locked.value
  if (locked.value) {
    drawTool.value = 'none'
    previewShape.value = null
    isDrawingShape.value = false
    confirmClearShapes.value = false
    selectedMarkerId.value = null
    cancelPlace()
  }
  selectedMarker.value = null
}

const posFromEvent = (event: { clientX: number; clientY: number }) => {
  const el = mapEl.value
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  return {
    x: clampPct(((event.clientX - rect.left) / rect.width) * 100),
    y: clampPct(((event.clientY - rect.top) / rect.height) * 100),
  }
}

const handleMapClick = (event: MouseEvent) => {
  if (locked.value) return
  if (drawTool.value !== 'none') return
  if (dragMoved.value) { dragMoved.value = false; return }
  if (placePos.value) { cancelPlace(); return }
  selectedMarkerId.value = null
  placePos.value = posFromEvent(event)
  pickerAppliance.value = false
}

const cancelPlace = () => {
  placePos.value = null
  pickerAppliance.value = false
}

/** 選了圖示就直接放上去，名稱自動帶入該類型／該家電的名稱 */
const placeMarker = (type: MarkerType, appliance?: { icon: string; label: string }) => {
  if (!placePos.value) return
  const marker: Marker = {
    id: genId(),
    x: placePos.value.x,
    y: placePos.value.y,
    type,
    label: appliance?.label ?? markerConfig[type].label,
    description: '',
    ...(type === 'appliance' ? { customIcon: appliance?.icon ?? markerConfig.appliance.icon } : {}),
  }
  buildingInfo.markers.push(marker)
  selectedMarkerId.value = marker.id
  hasChanges.value = true
  cancelPlace()
}

const handleMarkerClick = (marker: Marker) => {
  if (dragMoved.value) { dragMoved.value = false; return }
  if (locked.value) { selectedMarker.value = marker; return }
  cancelPlace()
  selectedMarkerId.value = marker.id
  editingMarker.value = marker
}

const closeMarkerEditor = () => { editingMarker.value = null }

const deleteMarker = (id: string) => {
  const idx = buildingInfo.markers.findIndex(m => m.id === id)
  if (idx !== -1) { buildingInfo.markers.splice(idx, 1); hasChanges.value = true }
  editingMarker.value = null
  if (selectedMarkerId.value === id) selectedMarkerId.value = null
}

// --- 拖曳（滑鼠與觸控共用 pointer events）---
const onDragMove = (e: PointerEvent) => {
  const marker = buildingInfo.markers.find(m => m.id === dragId.value)
  if (!marker) return
  const pos = posFromEvent(e)
  if (Math.abs(pos.x - marker.x) > 0.3 || Math.abs(pos.y - marker.y) > 0.3) dragMoved.value = true
  marker.x = pos.x
  marker.y = pos.y
}

const onDragEnd = () => {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  if (dragMoved.value) hasChanges.value = true
  dragId.value = null
}

const startDrag = (marker: Marker, e: PointerEvent) => {
  if (locked.value || drawTool.value !== 'none') return
  e.preventDefault()
  e.stopPropagation()
  selectedMarkerId.value = marker.id
  dragId.value = marker.id
  dragMoved.value = false
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
}

// --- 方向鍵微調 ---
const ARROW_STEP = 0.5
const onKeyDown = (e: KeyboardEvent) => {
  if (locked.value || !selectedMarkerId.value || editingMarker.value) return
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  const delta: Record<string, [number, number]> = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  }
  const d = delta[e.key]
  if (!d) return
  const marker = buildingInfo.markers.find(m => m.id === selectedMarkerId.value)
  if (!marker) return
  e.preventDefault()
  const step = ARROW_STEP * (e.shiftKey ? 4 : 1)
  marker.x = clampPct(marker.x + d[0] * step)
  marker.y = clampPct(marker.y + d[1] * step)
  hasChanges.value = true
}

// --- 舊「設施規範」轉為標記 ---
const convertFacilities = () => {
  buildingInfo.facilities.forEach((f, i) => {
    buildingInfo.markers.push({
      id: genId(),
      // 沒有座標可用，先在左上排成網格，房東再拖到正確位置
      x: 8 + (i % 6) * 14,
      y: 12 + Math.floor(i / 6) * 16,
      type: 'facility',
      label: f.name,
      description: [f.location, f.rules].filter(Boolean).join('\n'),
    })
  })
  buildingInfo.facilities = []
  hasChanges.value = true
  locked.value = false
  toast.success('已轉為地圖標記，請拖曳到正確位置')
}

// --- 繪圖 ---
const handleDrawStart = (event: MouseEvent) => {
  if (locked.value || drawTool.value === 'none' || drawTool.value === 'erase') return
  if (drawTool.value === 'text') {
    pendingTextPos.value = posFromEvent(event)
    pendingTextValue.value = ''
    showTextInputDialog.value = true
    return
  }
  isDrawingShape.value = true
  drawStart.value = posFromEvent(event)
}

const handleDrawMove = (event: MouseEvent) => {
  if (!isDrawingShape.value || !drawStart.value) return
  const pos = posFromEvent(event)
  previewShape.value = {
    type: drawTool.value,
    x1: drawStart.value.x, y1: drawStart.value.y,
    x2: pos.x, y2: pos.y,
    fill: drawColorPreset.value.fill,
    stroke: drawColorPreset.value.stroke,
  }
}

const handleDrawEnd = (event: MouseEvent) => {
  if (!isDrawingShape.value || !drawStart.value) { isDrawingShape.value = false; return }
  const pos = posFromEvent(event)
  if (Math.abs(pos.x - drawStart.value.x) > 0.5 || Math.abs(pos.y - drawStart.value.y) > 0.5) {
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
  buildingInfo.shapes = []
  hasChanges.value = true
  confirmClearShapes.value = false
}

// --- 底圖 ---
const selectTemplate = (id: string) => {
  buildingInfo.mapType = 'template'
  buildingInfo.templateId = id as BuildingInfoData['templateId']
  hasChanges.value = true
  showSetupOverlay.value = false
}

const handleImageUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { toast.warning('檔案大小不可超過 5MB'); return }
  const uid = authStore.effectiveUid
  const fileRef = storageRef(storage, `building-maps/${uid}/${Date.now()}_${file.name}`)
  uploadProgress.value = 0
  const task = uploadBytesResumable(fileRef, file)
  task.on('state_changed',
    snap => { uploadProgress.value = Math.round((snap.bytesTransferred / snap.totalBytes) * 100) },
    () => { toast.error('圖片上傳失敗'); uploadProgress.value = null },
    async () => {
      buildingInfo.mapImageUrl = await getDownloadURL(task.snapshot.ref)
      buildingInfo.mapType = 'custom'
      hasChanges.value = true
      uploadProgress.value = null
      showSetupOverlay.value = false
      toast.success('圖片已上傳，記得按「儲存變更」')
    }
  )
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  loadBuildingInfo()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
})
</script>
