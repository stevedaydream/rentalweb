<template>
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          房源管理
        </h1>
        <p class="text-text-secondary-light">管理您的所有出租物業與房間狀態</p>
      </div>
      <div v-if="activeTab === 'rooms'" class="flex gap-3">
        <button
          @click="showWizard = true"
          class="px-4 py-2 border border-gold-400 text-gold-700 dark:text-gold-300 rounded-lg hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2" aria-hidden="true">add_home</span>
          批量新增
        </button>
        <button
          @click="openModal(undefined, 'create')"
          class="px-4 py-2 bg-gold-500 text-white rounded-lg shadow-sm hover:bg-gold-600 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">add</span>
          新增房源
        </button>
      </div>
    </div>

    <BatchRoomWizard v-model:show="showWizard" :properties="properties" :rooms="sourceRooms" @done="loadBuildings" />

    <!-- 分頁切換 -->
    <div class="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
      <button @click="activeTab = 'rooms'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
        :class="activeTab === 'rooms' ? 'bg-white dark:bg-card-dark shadow text-text-primary-light dark:text-white' : 'text-text-secondary-light hover:text-text-primary-light dark:hover:text-white'">
        <span class="material-symbols-outlined text-[16px]" aria-hidden="true">bedroom_parent</span>房間
      </button>
      <button @click="activeTab = 'properties'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
        :class="activeTab === 'properties' ? 'bg-white dark:bg-card-dark shadow text-text-primary-light dark:text-white' : 'text-text-secondary-light hover:text-text-primary-light dark:hover:text-white'">
        <span class="material-symbols-outlined text-[16px]" aria-hidden="true">apartment</span>建物
        <span v-if="unassignedRoomCount > 0"
          class="ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none"
          :title="`${unassignedRoomCount} 間房尚未指派建物`"
        >{{ unassignedRoomCount }}</span>
      </button>
    </div>

    <PropertyTab v-if="activeTab === 'properties'" :rooms="rooms" />

    <template v-else>
    <div class="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          @click="currentFilter = filter.value"
          class="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          :class="currentFilter === filter.value ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'"
        >
          {{ filter.label }}
        </button>
      </div>
      
      <div class="relative w-full md:w-64">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
        <input
          v-model="rawSearch"
          type="text"
          placeholder="搜尋房號、地址或租客..."
          aria-label="搜尋房源"
          class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <label for="lease-filter" class="text-sm text-text-secondary-light">租約狀態</label>
      <select id="lease-filter" v-model="leaseFilter" class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark px-3 py-2 text-sm">
        <option value="all">全部租約</option>
        <option value="expiring">60 天內到期・未安排續約</option>
        <option value="expired">已過期・未安排續約</option>
        <option value="renewed">已安排續約</option>
        <option value="attention">資料待確認</option>
      </select>
      <span class="text-sm text-text-secondary-light">{{ filteredRooms.length }} 間房源</span>
      <div class="ml-auto flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg" role="group" aria-label="檢視模式">
        <button
          v-for="mode in viewModes"
          :key="mode.value"
          type="button"
          :aria-label="mode.label"
          :aria-pressed="viewMode === mode.value"
          :title="mode.label"
          class="p-1.5 rounded-md flex items-center transition-colors"
          :class="viewMode === mode.value ? 'bg-white dark:bg-card-dark shadow text-text-primary-light dark:text-white' : 'text-text-secondary-light hover:text-text-primary-light dark:hover:text-white'"
          @click="setViewMode(mode.value)"
        >
          <span class="material-symbols-outlined text-[20px]" aria-hidden="true">{{ mode.icon }}</span>
        </button>
      </div>
    </div>
    <p v-if="contractError" role="alert" class="text-sm text-amber-700 dark:text-amber-300">租約資料載入失敗，請重新整理後再確認。</p>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">載入房源資料中...</p>
    </div>

    <div v-else-if="!filteredRooms.length" class="text-center py-12 text-text-secondary-light">沒有符合條件的房源</div>
    <RoomListView
      v-else-if="viewMode === 'list'"
      :rooms="filteredRooms"
      :status-labels="statusLabels"
      :status-colors="statusColors"
      @edit="openModal($event, 'edit')"
      @view="openModal($event, 'view')"
    />
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="room in filteredRooms" 
        :key="room.id"
        class="group bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all overflow-hidden flex flex-col"
      >
        <div class="relative h-48 bg-gray-200 dark:bg-gray-800 overflow-hidden">
           <img
            v-if="getCoverImage(room)"
            :src="getCoverImage(room)"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            :alt="`${room.name} 照片`"
           >
           <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1 text-ink-300 dark:text-ink-500">
             <span class="material-symbols-outlined text-4xl" aria-hidden="true">no_photography</span>
             <span class="text-xs">尚無照片</span>
           </div>
           
           <div class="absolute top-3 right-3 flex flex-col items-end gap-1.5">
             <span
              class="px-2.5 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md border border-white/20"
              :class="statusColors[room.status]"
             >
               {{ statusLabels[room.status] }}
             </span>
             <!-- 即將到期警示徽章 -->
             <span
               v-if="room.status === 'occupied' && room.lease.urgency === 'critical'"
               class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/90 text-white backdrop-blur-sm border border-white/20 flex items-center gap-1 animate-pulse"
             >
               <span class="material-symbols-outlined text-[11px]">alarm</span>
               緊急：{{ room.lease.label }}
             </span>
             <span
               v-else-if="room.status === 'occupied' && room.lease.urgency === 'warning'"
               class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-400/90 text-white backdrop-blur-sm border border-white/20 flex items-center gap-1"
             >
               <span class="material-symbols-outlined text-[11px]">schedule</span>
               {{ room.lease.label }}
             </span>
             <span v-if="room.isPublic" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white backdrop-blur-sm border border-white/20 flex items-center gap-1">
               <span class="material-symbols-outlined text-[11px]">public</span>
               公開刊登
             </span>
           </div>
           
           <div class="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
             <span class="material-symbols-outlined text-[14px]">photo_library</span>
             {{ room.images?.length || 0 }}
           </div>

           <div class="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium">
             {{ room.type }}
           </div>
        </div>

        <div class="p-5 flex-1 flex flex-col">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">{{ room.name }}</h3>
            <span class="text-primary font-bold">NT$ {{ (room.price ?? 0).toLocaleString() }}</span>
          </div>
          
          <a 
            :href="getMapLink(room.address)" 
            target="_blank"
            class="text-sm text-text-secondary-light hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1 mb-4 flex items-center group/addr"
            @click.stop
            title="在 Google 地圖開啟"
          >
            <span class="material-symbols-outlined text-[16px] mr-1 group-hover/addr:text-red-500 transition-colors">location_on</span>
            <span class="underline decoration-transparent group-hover/addr:decoration-current transition-all">{{ room.address }}</span>
          </a>

          <div class="border-t border-gray-100 dark:border-gray-800 my-3"></div>

          <div class="grid grid-cols-2 gap-2 text-sm text-text-secondary-light mb-4">
            <div class="flex items-center">
              <span class="material-symbols-outlined text-[18px] mr-2">bed</span>
              {{ room.layout }}
            </div>
            <div class="flex items-center">
              <span class="material-symbols-outlined text-[18px] mr-2">square_foot</span>
              {{ room.size }} 坪
            </div>
          </div>

          <div
            v-if="room.status === 'occupied'"
            class="rounded-lg p-3 mb-4 flex items-center gap-3"
            :class="{
              'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800': room.lease.urgency === 'critical',
              'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800': room.lease.urgency === 'warning',
              'bg-blue-50 dark:bg-blue-900/20': room.lease.urgency === 'normal'
            }"
          >
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              :class="{
                'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300': room.lease.urgency === 'critical',
                'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300': room.lease.urgency === 'warning',
                'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200': room.lease.urgency === 'normal'
              }"
            >
              {{ room.tenantName?.[0] }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark truncate">{{ room.tenantName }}</p>
              <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                <p class="text-xs text-text-secondary-light">合約至 {{ room.leaseEnd || '待確認' }}</p>
                <span
                  v-if="room.lease.label"
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  :class="{
                    'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300': room.lease.urgency === 'critical',
                    'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300': room.lease.urgency === 'warning'
                  }"
                >
                  {{ room.lease.label }}
                </span>
              </div>
              <p v-if="room.lease.pending" class="text-xs text-emerald-700 dark:text-emerald-300 mt-2">下一期 {{ room.lease.pending.startDate }} ～ {{ room.lease.pending.endDate }}</p>
              <p v-if="room.lease.needsAttention && room.lease.contract" class="text-xs text-amber-700 dark:text-amber-300 mt-2">{{ room.lease.state === 'pending-activation' ? '已到接續日，請確認續約處理狀態' : '資料待確認・目前顯示合約租期' }}</p>
              <RouterLink v-if="room.lease.contract" :to="{ name: 'Contract', query: { contract: room.lease.contract.id } }" class="inline-flex mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300 underline">查看目前合約</RouterLink>
            </div>
          </div>
          <div v-else class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4 text-center text-sm text-text-secondary-light">
             目前無租客
          </div>

          <div class="mt-auto flex gap-2">
            <button 
              @click="openModal(room, 'edit')"
              class="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
            >
              編輯
            </button>
            <button 
              @click="openModal(room, 'view')"
              class="flex-1 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium transition-colors shadow-sm"
            >
              詳情
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && filteredRooms.length === 0" class="text-center py-12 bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-800 border-dashed">
      <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
        <span class="material-symbols-outlined text-3xl">domain_disabled</span>
      </div>
      <h3 class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">找不到相符的房源</h3>
      <p class="text-text-secondary-light mt-1">請嘗試調整搜尋條件或新增房源</p>
    </div>
    </template>

    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ modalTitle }}
          </h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-6">
          
          <div class="space-y-3">
             <div class="flex justify-between items-end">
               <label class="block text-sm font-bold text-text-primary-light">
                 房源照片畫廊 
                 <span class="text-xs font-normal text-text-secondary-light ml-1">(公開刊登至少 1 張，最多 10 張)</span>
               </label>
               <span class="text-xs font-bold" :class="form.images!.length >= 10 ? 'text-red-500' : 'text-blue-500'">
                 {{ form.images!.length }} / 10
               </span>
             </div>
             
             <div v-if="form.images!.length > 0" class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <div 
                  v-for="(img, index) in form.images" 
                  :key="index"
                  class="relative aspect-square rounded-xl overflow-hidden group border-2 transition-all cursor-pointer"
                  :class="form.coverImage === img ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'"
                  @click="!isViewMode && setCoverImage(img)"
                >
                  <img :src="img" class="w-full h-full object-cover">
                  
                  <div v-if="form.coverImage === img" class="absolute top-1 left-1 bg-yellow-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">
                    封面
                  </div>

                  <div v-if="!isViewMode" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                     <span v-if="form.coverImage !== img" class="text-xs text-white font-medium bg-black/50 px-2 py-1 rounded-full">點擊設為封面</span>
                     <button 
                        @click.stop="removeImage(index)"
                        class="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="刪除照片"
                     >
                       <span class="material-symbols-outlined text-[18px]">delete</span>
                     </button>
                  </div>
                </div>
             </div>

             <div 
               v-if="!isViewMode && form.images!.length < 10"
               class="relative w-full h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary transition-colors"
               :class="{ 'border-primary bg-blue-50 dark:bg-blue-900/10': isDragging }"
               @dragover.prevent="isDragging = true"
               @dragleave.prevent="isDragging = false"
               @drop.prevent="handleDrop"
               @click="triggerFileUpload"
             >
                <input 
                  type="file" 
                  ref="fileInput" 
                  class="hidden" 
                  accept="image/*"
                  multiple
                  @change="handleImageUpload"
                >
                
                <div v-if="uploading" class="flex items-center gap-2 text-primary">
                  <div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span class="text-sm font-bold">上傳中...</span>
                </div>
                <div v-else class="flex flex-col items-center">
                   <span class="material-symbols-outlined text-2xl mb-1">add_photo_alternate</span>
                   <p class="text-xs font-medium">點擊或拖曳上傳 (支援批量)</p>
                </div>
             </div>
             
             <p v-if="!isViewMode" class="text-xs text-text-secondary-light">
               * 第一張照片將預設為封面，您也可以點擊圖片手動設定。
             </p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-text-secondary-light mb-1">房源名稱 / 房號</label>
              <input 
                v-model="form.name" 
                type="text" 
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800" 
                placeholder="例如: 幸福公寓 A-201"
                :disabled="isViewMode"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">租金 (月)</label>
              <input 
                v-model="form.price" 
                type="number" 
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800" 
                placeholder="12000"
                :disabled="isViewMode"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">坪數</label>
              <input
                v-model="form.size"
                type="number"
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                placeholder="8"
                :disabled="isViewMode"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">購入成本 (選填，用於投資試算)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">NT$</span>
              <input
                v-model="form.purchaseCost"
                type="number"
                class="form-input pl-10 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                placeholder="例如: 3000000"
                :disabled="isViewMode"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">地址</label>
            <div class="relative">
              <input 
                v-model="form.address" 
                type="text" 
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800 pr-10" 
                placeholder="縣市/區域/街道"
                :disabled="isViewMode"
              >
              <a 
                v-if="form.address"
                :href="getMapLink(form.address)"
                target="_blank"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1"
                title="在 Google 地圖開啟"
              >
                <span class="material-symbols-outlined text-[20px]">map</span>
              </a>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">格局</label>
              <select 
                v-model="form.layout" 
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                :disabled="isViewMode"
              >
                <option>獨立套房</option>
                <option>分租套房</option>
                <option>雅房</option>
                <option>整層住家</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">狀態</label>
              <select 
                v-model="form.status" 
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                :disabled="isViewMode"
              >
                <option value="vacant">待租 (Vacant)</option>
                <option value="occupied">已租 (Occupied)</option>
                <option value="maintenance">維護中 (Maintenance)</option>
              </select>
            </div>
          </div>

          <!-- 所屬建物與樓層：樓層即該建物電表總表的子群組，選好電表歸屬就跟著帶好 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="room-property" class="block text-sm font-medium text-text-secondary-light mb-1">
                所屬建物{{ isEditing ? '' : ' *' }}
              </label>
              <select id="room-property" v-model="form.propertyId" @change="onPropertyChange"
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                :disabled="isViewMode">
                <option value="" :disabled="!isEditing">{{ isEditing ? '未指派' : '請選擇建物' }}</option>
                <option v-for="p in properties" :key="p.id" :value="p.id">{{ p.name }}</option>
                <option value="__new__">＋ 新增建物…</option>
              </select>
              <p v-if="isEditing && !form.propertyId && !isViewMode" class="text-xs text-amber-600 mt-1">
                此房間尚未指派建物，建議選擇，稅費與合約附件才歸得到棟。
              </p>
            </div>
            <div>
              <label for="room-floor" class="block text-sm font-medium text-text-secondary-light mb-1">樓層</label>
              <select id="room-floor" v-model="form.subGroupId"
                class="form-input disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                :disabled="isViewMode || !form.propertyId">
                <option value="">未指定</option>
                <option v-for="sg in floorOptions" :key="sg.id" :value="sg.id">{{ sg.name }}</option>
                <option value="__new__">＋ 新增樓層…</option>
              </select>
            </div>
            <div v-if="form.propertyId === '__new__'" class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-surface-light dark:bg-surface-dark">
              <div>
                <label for="room-new-property" class="block text-xs font-medium text-text-secondary-light mb-1">新建物名稱</label>
                <input id="room-new-property" v-model="newPropertyName" class="form-input" placeholder="例如：桃園中正路">
              </div>
              <div>
                <label for="room-new-property-address" class="block text-xs font-medium text-text-secondary-light mb-1">門牌地址</label>
                <input id="room-new-property-address" v-model="newPropertyAddress" class="form-input">
              </div>
              <p class="sm:col-span-2 text-xs text-text-secondary-light">存檔時會建立建物與同名電表總表。</p>
            </div>
            <div v-if="form.subGroupId === '__new__'" class="sm:col-span-2">
              <label for="room-new-floor" class="block text-xs font-medium text-text-secondary-light mb-1">新樓層名稱</label>
              <input id="room-new-floor" v-model="newFloorName" class="form-input" placeholder="例如：4F">
            </div>
          </div>

          <label v-if="!isViewMode" class="flex items-center gap-2 text-sm text-text-secondary-light">
            <input id="room-is-test" v-model="form.isTest" type="checkbox" class="rounded">
            這是測試資料（可由租客列表的「清除測試資料」一次移除）
          </label>

          <!-- 公開找房頁 toggle（僅空置時可用） -->
          <div
            v-if="!isViewMode"
            class="flex items-center justify-between p-4 rounded-xl border transition-colors"
            :class="form.status === 'vacant'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              : 'bg-gray-50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-700 opacity-50'"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[22px]">public</span>
              <div>
                <p class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">公開至找房頁</p>
                <p class="text-xs text-text-secondary-light">讓未綁定的租客在找房頁看到此房間</p>
              </div>
            </div>
            <button
              type="button"
              :disabled="form.status !== 'vacant'"
              @click="form.isPublic = !form.isPublic"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:cursor-not-allowed"
              :class="form.isPublic ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
                :class="form.isPublic ? 'translate-x-5' : 'translate-x-0'"
              ></span>
            </button>
          </div>
          <div v-else-if="isViewMode && form.isPublic" class="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span class="material-symbols-outlined text-[18px]">public</span>
            此房間目前公開顯示於找房頁
          </div>

          <div v-if="form.status === 'occupied'">

            <!-- 詳情模式：到期 Banner -->
            <div
              v-if="isViewMode && leaseUrgency(selectedLease?.endDate) !== 'normal'"
              class="mb-3 flex items-start gap-3 p-4 rounded-xl border"
              :class="{
                'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700': leaseUrgency(selectedLease?.endDate) === 'critical',
                'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700': leaseUrgency(selectedLease?.endDate) === 'warning'
              }"
            >
              <span
                class="material-symbols-outlined text-[22px] mt-0.5 shrink-0"
                :class="{
                  'text-red-500': leaseUrgency(selectedLease?.endDate) === 'critical',
                  'text-orange-500': leaseUrgency(selectedLease?.endDate) === 'warning'
                }"
              >{{ leaseUrgency(selectedLease?.endDate) === 'critical' ? 'crisis_alert' : 'schedule' }}</span>
              <div class="flex-1">
                <p
                  class="font-bold text-sm"
                  :class="{
                    'text-red-700 dark:text-red-300': leaseUrgency(selectedLease?.endDate) === 'critical',
                    'text-orange-700 dark:text-orange-300': leaseUrgency(selectedLease?.endDate) === 'warning'
                  }"
                >
                  {{ selectedLease?.label }}
                </p>
                <p class="text-xs mt-0.5"
                  :class="{
                    'text-red-600 dark:text-red-400': leaseUrgency(selectedLease?.endDate) === 'critical',
                    'text-orange-600 dark:text-orange-400': leaseUrgency(selectedLease?.endDate) === 'warning'
                  }"
                >
                  {{ selectedLease?.endDate }} 到期，{{ (selectedLease?.days ?? 0) < 0 ? `已過期 ${Math.abs(selectedLease?.days ?? 0)} 天` : `剩餘 ${selectedLease?.days} 天` }}，請與租客確認是否續約。
                </p>
              </div>
              <router-link
                :to="{ name: 'TenantList' }"
                class="shrink-0 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors"
                :class="{
                  'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300': leaseUrgency(selectedLease?.endDate) === 'critical',
                  'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300': leaseUrgency(selectedLease?.endDate) === 'warning'
                }"
                @click="showModal = false"
              >
                前往租客管理
              </router-link>
            </div>

            <div v-if="selectedLease" class="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm space-y-1">
              <p>{{ selectedLease.label }}・{{ selectedLease.startDate || '待確認' }} ～ {{ selectedLease.endDate || '待確認' }}</p>
              <p v-if="selectedLease.pending">下一期 {{ selectedLease.pending.startDate }} ～ {{ selectedLease.pending.endDate }}</p>
              <RouterLink v-if="selectedLease.contract" :to="{ name: 'Contract', query: { contract: selectedLease.contract.id } }" class="inline-flex text-blue-700 dark:text-blue-300 underline">查看目前合約</RouterLink>
            </div>
            <!-- 詳情模式：租客資訊卡 -->
            <div v-if="isViewMode" class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
              <h4 class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-blue-500">person</span>
                租客資訊
              </h4>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold text-base">
                  {{ form.tenantName?.[0] || '?' }}
                </div>
                <div>
                  <p class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ form.tenantName || '未設定' }}</p>
                  <p class="text-xs text-text-secondary-light">現任租客</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3 pt-1">
                <div class="bg-white dark:bg-card-dark rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                  <p class="text-xs text-text-secondary-light mb-1">合約到期日</p>
                  <p class="font-semibold text-sm text-text-primary-light dark:text-text-primary-dark">{{ selectedLease?.endDate || '未設定' }}</p>
                </div>
                <div
                  class="rounded-lg p-3 border"
                  :class="{
                    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800': leaseUrgency(selectedLease?.endDate) === 'critical',
                    'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800': leaseUrgency(selectedLease?.endDate) === 'warning',
                    'bg-white dark:bg-card-dark border-gray-100 dark:border-gray-700': leaseUrgency(selectedLease?.endDate) === 'normal'
                  }"
                >
                  <p class="text-xs text-text-secondary-light mb-1">剩餘天數</p>
                  <p
                    class="font-bold text-sm"
                    :class="{
                      'text-red-600 dark:text-red-400': leaseUrgency(selectedLease?.endDate) === 'critical',
                      'text-orange-600 dark:text-orange-400': leaseUrgency(selectedLease?.endDate) === 'warning',
                      'text-text-primary-light dark:text-text-primary-dark': leaseUrgency(selectedLease?.endDate) === 'normal'
                    }"
                  >
                    {{ getDaysRemaining(selectedLease?.endDate) === Infinity ? '—' : getDaysRemaining(selectedLease?.endDate) + ' 天' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 編輯模式：租客資訊唯讀 -->
            <div v-else class="rounded-xl border overflow-hidden"
              :class="{
                'border-red-200 dark:border-red-800': leaseUrgency(selectedLease?.endDate) === 'critical',
                'border-orange-200 dark:border-orange-800': leaseUrgency(selectedLease?.endDate) === 'warning',
                'border-gray-100 dark:border-gray-700': leaseUrgency(selectedLease?.endDate) === 'normal'
              }"
            >
              <!-- 到期警示（編輯模式也顯示） -->
              <div
                v-if="leaseUrgency(selectedLease?.endDate) !== 'normal'"
                class="flex items-center gap-2 px-4 py-2.5 text-xs font-bold"
                :class="{
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300': leaseUrgency(selectedLease?.endDate) === 'critical',
                  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300': leaseUrgency(selectedLease?.endDate) === 'warning'
                }"
              >
                <span class="material-symbols-outlined text-[15px]">{{ leaseUrgency(selectedLease?.endDate) === 'critical' ? 'crisis_alert' : 'schedule' }}</span>
                {{ leaseUrgency(selectedLease?.endDate) === 'critical' ? '租約即將到期！' : '租約將於近期到期' }}
                {{ (selectedLease?.days ?? -1) >= 0 ? `— 剩餘 ${selectedLease?.days} 天` : '' }}
              </div>

              <div class="p-4 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px] text-blue-500">person</span>
                    租客資訊
                  </h4>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">
                    唯讀
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-xs text-text-secondary-light mb-1">租客姓名</p>
                    <p class="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
                      {{ form.tenantName || '—' }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-text-secondary-light mb-1">合約到期日</p>
                    <p class="text-sm font-semibold"
                      :class="{
                        'text-red-600 dark:text-red-400': leaseUrgency(selectedLease?.endDate) === 'critical',
                        'text-orange-600 dark:text-orange-400': leaseUrgency(selectedLease?.endDate) === 'warning',
                        'text-text-primary-light dark:text-text-primary-dark': leaseUrgency(selectedLease?.endDate) === 'normal'
                      }"
                    >
                      {{ selectedLease?.endDate || '—' }}
                    </p>
                  </div>
                </div>

                <router-link
                  :to="{ name: 'TenantList' }"
                  class="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  @click="showModal = false"
                >
                  <span class="material-symbols-outlined text-[14px]">open_in_new</span>
                  前往租客名單修改租約資訊
                </router-link>
              </div>
            </div>

          </div>
        </div>

        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex items-center">
          <template v-if="isViewMode">
            <button 
              @click="switchToEdit"
              class="mr-auto px-4 py-2 rounded-xl text-gold-600 hover:bg-gold-50 dark:hover:bg-gold-900/20 font-medium transition-colors flex items-center"
            >
              <span class="material-symbols-outlined mr-1 text-[20px]">edit</span>
              前往編輯
            </button>
            <button 
              @click="showModal = false"
              class="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 font-bold transition-colors"
            >
              關閉
            </button>
          </template>

          <template v-else>
            <template v-if="isEditing">
              <template v-if="confirmDeleteRoom">
                <span class="mr-auto flex items-center gap-2">
                  <span class="text-xs text-red-600">確定刪除？</span>
                  <button @click="deleteRoom" class="text-xs text-red-600 hover:underline">確定</button>
                  <button @click="confirmDeleteRoom = false" class="text-xs text-gray-500 hover:underline">取消</button>
                </span>
              </template>
              <button
                v-else
                @click="confirmDeleteRoom = true"
                class="mr-auto px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 font-medium transition-colors flex items-center"
              >
                <span class="material-symbols-outlined mr-1 text-[20px]">delete</span>
                刪除房源
              </button>
            </template>

            <div class="ml-auto flex gap-3">
              <button 
                @click="showModal = false"
                class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors"
              >
                取消
              </button>
              <button 
                @click="saveRoom"
                :disabled="uploading || savingRoom"
                class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold shadow-lg shadow-gold-500/30 hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ uploading ? '上傳中...' : savingRoom ? '儲存中…' : '儲存' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { storage } from '../../firebase/config';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { useRoute } from 'vue-router';
import type { ManagedRoom as Room, RoomLeaseContract, Property } from '../../types';
import { subscribeRooms, saveManagedRoom, deleteRoom as deleteRoomRecord } from '../../services/roomService';
import { subscribeLeaseContracts } from '../../services/leaseService';
import { resolveRoomLease, taipeiToday, leaseDaysRemaining } from '../../utils/roomLease';
import { getMeterGroups } from '../../services/meterGroupService';
import { getProperties } from '../../services/propertyService';
import { createPropertyWithMeterGroup, ensurePropertyMeterGroup, ensureNamedSubGroup } from '../../services/buildingService';
import { isDuplicateRoomName } from '../../utils/roomBatch';
import { roomCoverImage } from '../../utils/room';
import type { MeterGroupDoc } from '../../components/meter/types';
import PropertyTab from '../../components/rooms/PropertyTab.vue';
import BatchRoomWizard from '../../components/rooms/BatchRoomWizard.vue';
import RoomListView from '../../components/rooms/RoomListView.vue';

import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- State ---
const authStore = useAuthStore();
const toast = useToastStore();
const route = useRoute();
const sourceRooms = ref<Room[]>([]);
const contracts = ref<RoomLeaseContract[]>([]);
const contractsReady = ref(false);
const contractError = ref(false);
const today = ref(taipeiToday());
const rooms = computed(() => sourceRooms.value.map(room => {
  const lease = resolveRoomLease(room, sourceRooms.value, contracts.value, today.value, contractsReady.value);
  return { ...room, lease, leaseEnd: lease.endDate,
    tenantName: lease.contract?.tenantName || room.tenantName };
}));
const leaseFilter = ref('all');
const loading = ref(true);
const activeTab = ref<'rooms' | 'properties'>('rooms');
const unassignedRoomCount = computed(() => rooms.value.filter(r => !r.propertyId).length);


// --- Firestore Integration ---

let unsubRooms: (() => void) | null = null;
let unsubContracts: (() => void) | null = null;
let clockTimer: ReturnType<typeof setInterval> | undefined;
const refreshDay = () => { today.value = taipeiToday(); };
watch(() => authStore.userProfile ? authStore.effectiveUid : '', uid => {
  unsubRooms?.();
  unsubContracts?.();
  sourceRooms.value = [];
  contracts.value = [];
  contractsReady.value = false;
  contractError.value = false;
  loading.value = !!uid;
  if (!uid) return;
  unsubRooms = subscribeRooms(uid, data => {
    sourceRooms.value = data as Room[];
    loading.value = false;
  }, () => { loading.value = false; toast.error('房源載入失敗，請稍後再試'); });
  unsubContracts = subscribeLeaseContracts(uid, data => {
    contracts.value = data;
    contractsReady.value = true;
    contractError.value = false;
  }, () => {
    contracts.value = [];
    contractsReady.value = true;
    contractError.value = true;
  });
}, { immediate: true });
onMounted(() => {
  clockTimer = setInterval(refreshDay, 60000);
  window.addEventListener('focus', refreshDay);
  if (route.query.action === 'new') openModal(undefined, 'create');
});
onUnmounted(() => {
  unsubRooms?.();
  unsubContracts?.();
  clearInterval(clockTimer);
  if (searchTimer) clearTimeout(searchTimer);
  window.removeEventListener('focus', refreshDay);
});

// 2. 儲存與更新
const saveRoom = async () => {
  if (!authStore.user) return; // [新增] 安全檢查
  if (!form.value.name?.trim()) { toast.warning('請輸入房源名稱'); return; }
  form.value.name = form.value.name.trim();
  // 系統多處以房號文字對應房間，同一房東底下不可重名
  if (isDuplicateRoomName(form.value.name, sourceRooms.value, form.value.id)) {
    toast.warning(`已有房號「${form.value.name}」的房間，多棟時可加前綴區分（例如：桃園-401）`); return;
  }
  const imgCount = form.value.images?.length || 0;
  // 照片只在公開刊登時必填；批量建立與一般編輯可以先沒有照片
  if (form.value.isPublic && imgCount < 1) { toast.warning('公開到找房頁需至少上傳 1 張照片'); return; }
  if (imgCount > 10) { toast.warning('照片數量不能超過 10 張'); return; }
  if (!isEditing.value && !form.value.propertyId) { toast.warning('請選擇所屬建物'); return; }
  if (form.value.propertyId === '__new__' && !newPropertyName.value.trim()) { toast.warning('請填寫新建物名稱'); return; }
  if (form.value.subGroupId === '__new__' && !newFloorName.value.trim()) { toast.warning('請填寫新樓層名稱'); return; }

  savingRoom.value = true;
  try {
    const uid = authStore.effectiveUid;
    // 新建物：建立建物與同名總表
    if (form.value.propertyId === '__new__') {
      const created = await createPropertyWithMeterGroup(uid, { name: newPropertyName.value, address: newPropertyAddress.value });
      properties.value.push(created);
      form.value.propertyId = created.id;
      if (!form.value.address) form.value.address = created.address || '';
    }
    // 新樓層：加到該建物總表的子群組
    if (form.value.subGroupId === '__new__') {
      const property = properties.value.find(p => p.id === form.value.propertyId);
      if (!property) throw new Error('找不到所屬建物');
      const group = await ensurePropertyMeterGroup(uid, property);
      form.value.subGroupId = await ensureNamedSubGroup(group, newFloorName.value);
      await loadBuildings();
    }

    const photos = form.value.images ?? [];
    const finalCover = form.value.coverImage && photos.includes(form.value.coverImage) ? form.value.coverImage : (photos[0] ?? '');
    const propertyChanged = (form.value.propertyId || '') !== originalPropertyId.value;

    await saveManagedRoom(uid, { ...form.value, coverImage: finalCover,
      landlordName: authStore.userProfile?.name || '', landlordPhone: authStore.userProfile?.phone || '' },
      originalStatus.value, propertyChanged ? { propertyId: form.value.propertyId || '' } : undefined);
    toast.success('房源已儲存');
    showModal.value = false;
  } catch (err) {
    console.error(err);
    toast.error(err instanceof Error ? err.message : '儲存失敗');
  } finally {
    savingRoom.value = false;
  }
};

// 3. 刪除
const deleteRoom = async () => {
  if (!form.value.id || !form.value.name) return;
  try {
    await deleteRoomRecord(form.value.id);
    confirmDeleteRoom.value = false;
    showModal.value = false;
  } catch (err) {
    console.error(err);
    toast.error('刪除失敗');
  }
};

// --- Filters & Search ---
const currentFilter = ref('all');
const rawSearch = ref('');
const searchQuery = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(rawSearch, (val) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery.value = val; }, 300);
});

const filters = [
  { label: '全部', value: 'all' },
  { label: '出租中', value: 'occupied' },
  { label: '待租', value: 'vacant' },
  { label: '維修中', value: 'maintenance' }
];

type ViewMode = 'grid' | 'list';
const VIEW_MODE_KEY = 'roomManagementViewMode';
const viewModes = [
  { value: 'grid', label: '卡片檢視', icon: 'grid_view' },
  { value: 'list', label: '列表檢視', icon: 'view_list' },
] as const;
const readViewMode = (): ViewMode => {
  try { return localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
};
const viewMode = ref<ViewMode>(readViewMode());
const setViewMode = (mode: ViewMode) => {
  viewMode.value = mode;
  try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch { /* 無痕模式等無法寫入時僅本次有效 */ }
};

const statusLabels = { occupied: '出租中', vacant: '待租', maintenance: '維護中' };
const statusColors = {
  occupied: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  vacant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
};

const filteredRooms = computed(() => {
  return rooms.value.filter(room => {
    if (currentFilter.value !== 'all' && room.status !== currentFilter.value) return false;
    if (leaseFilter.value === 'expiring' && room.lease.state !== 'expiring') return false;
    if (leaseFilter.value === 'expired' && room.lease.state !== 'expired') return false;
    if (leaseFilter.value === 'renewed' && !['renewed', 'pending-activation'].includes(room.lease.state)) return false;
    if (leaseFilter.value === 'attention' && !room.lease.needsAttention) return false;
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      return [room.name, room.address, room.tenantName].some(value => value?.toLowerCase().includes(q));
    }
    return true;
  });
});

// --- Modal Logic ---
const showModal = ref(false);
const isEditing = ref(false);
const isViewMode = ref(false);
const confirmDeleteRoom = ref(false);

const originalStatus = ref<Room['status']>();
const form = ref<Partial<Room>>({
  name: '', price: 0, size: 0, address: '', layout: '獨立套房', status: 'vacant',
  tenantName: '', leaseEnd: '', images: [], coverImage: '', isPublic: false, purchaseCost: undefined,
  subGroupId: '', isTest: false
});

// 建物與電表總表：房間選「建物＋樓層」，樓層＝該建物總表的子群組
const properties = ref<Property[]>([]);
const meterGroups = ref<MeterGroupDoc[]>([]);
const loadBuildings = async () => {
  try {
    const [ps, gs] = await Promise.all([getProperties(authStore.effectiveUid), getMeterGroups(authStore.effectiveUid)]);
    properties.value = ps;
    meterGroups.value = gs;
  } catch (e) {
    console.error('load buildings error:', e);
  }
};
onMounted(loadBuildings);
watch(activeTab, loadBuildings);

const showWizard = ref(false);
const savingRoom = ref(false);
const originalPropertyId = ref('');
const newPropertyName = ref('');
const newPropertyAddress = ref('');
const newFloorName = ref('');

const floorOptions = computed(() => {
  const property = properties.value.find(p => p.id === form.value.propertyId);
  const groupId = property?.meterGroupId || property?.seededFromGroupId;
  const own = meterGroups.value.find(g => g.id === groupId)?.subGroups ?? [];
  const options = own.map(sg => ({ id: sg.id, name: sg.name }));
  // 舊房間掛在其他總表的子群組時仍顯示，避免開啟編輯就被清掉
  const current = form.value.subGroupId;
  if (current && current !== '__new__' && !options.some(o => o.id === current)) {
    for (const g of meterGroups.value) {
      const sg = (g.subGroups ?? []).find(s => s.id === current);
      if (sg) { options.push({ id: sg.id, name: `${g.name}／${sg.name}` }); break; }
    }
  }
  return options;
});

// 換建物：樓層清空；新房間的地址帶入建物地址
const onPropertyChange = () => {
  form.value.subGroupId = '';
  const property = properties.value.find(p => p.id === form.value.propertyId);
  if (property?.address && (!isEditing.value || !form.value.address)) form.value.address = property.address;
};

// 非空置時自動取消公開
watch(() => form.value.status, (val) => {
  if (val !== 'vacant') form.value.isPublic = false;
});

// --- Upload Logic ---
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const isDragging = ref(false);

const triggerFileUpload = () => fileInput.value?.click();

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  if (!isViewMode.value && e.dataTransfer?.files.length) {
    processFiles(e.dataTransfer.files);
  }
};

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processFiles(target.files);
  }
};

const processFiles = async (fileList: FileList) => {
  const currentCount = form.value.images?.length || 0;
  const newCount = fileList.length;

  if (currentCount + newCount > 10) {
    toast.warning(`圖片數量上限為 10 張，您目前已有 ${currentCount} 張，只能再上傳 ${10 - currentCount} 張。`);
    return;
  }

  uploading.value = true;
  const uploadPromises: Promise<string>[] = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (file && file.type.startsWith('image/')) {
      uploadPromises.push(uploadSingleFile(file));
    }
  }
  
  try {
    const newUrls = await Promise.all(uploadPromises);
    if (!form.value.images) form.value.images = [];
    form.value.images.push(...newUrls);
    
    // Auto-set cover if it's the first image
    if (!form.value.coverImage && form.value.images.length > 0) {
        form.value.coverImage = form.value.images[0];
    }
  } catch (e: any) {
    console.error(e);
    toast.error('部分圖片上傳失敗');
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
};

const uploadSingleFile = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
    const fileRef = storageRef(storage, `rooms/${fileName}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
};

const removeImage = (index: number) => {
    if (!form.value.images) return;
    const removedUrl = form.value.images[index];
    form.value.images.splice(index, 1);
    if (form.value.coverImage === removedUrl) {
        form.value.coverImage = form.value.images.length > 0 ? form.value.images[0] : '';
    }
};

const setCoverImage = (url: string) => { form.value.coverImage = url; };

const getCoverImage = (room: Room) => roomCoverImage(room);

// --- Lease Expiry Helpers ---
const selectedRoom = computed(() => rooms.value.find(r => r.id === form.value.id));
const selectedLease = computed(() => selectedRoom.value?.lease);
const getDaysRemaining = (dateStr?: string) => leaseDaysRemaining(dateStr, today.value);
const leaseUrgency = (_dateStr?: string) => selectedLease.value?.urgency || 'normal';

// --- Modal Core Logic ---
const getMapLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const openModal = (room?: Room, mode: 'create' | 'edit' | 'view' = 'create') => {
  originalStatus.value = room?.status;
  if (room) {
    form.value = JSON.parse(JSON.stringify(room));
    if (!form.value.images) form.value.images = [];
    if (form.value.subGroupId === undefined) form.value.subGroupId = '';
    if (form.value.propertyId === undefined) form.value.propertyId = '';
  } else {
    form.value = {
      name: '', price: 0, size: 0, address: '', layout: '獨立套房', status: 'vacant',
      type: '公寓', tenantName: '', leaseEnd: '', images: [], coverImage: '', isPublic: false, purchaseCost: undefined,
      subGroupId: '', propertyId: properties.value.length === 1 ? properties.value[0]!.id : '', isTest: false
    };
    const only = properties.value.length === 1 ? properties.value[0] : undefined;
    if (only?.address) form.value.address = only.address;
  }
  originalPropertyId.value = room?.propertyId || '';
  newPropertyName.value = '';
  newPropertyAddress.value = '';
  newFloorName.value = '';
  isEditing.value = !!room;
  isViewMode.value = mode === 'view';
  confirmDeleteRoom.value = false;
  showModal.value = true;
};

const switchToEdit = () => {
  isViewMode.value = false;
  isEditing.value = true;
};

const modalTitle = computed(() => {
  if (isViewMode.value) return '房源詳情';
  return isEditing.value ? '編輯房源' : '新增房源';
});
</script>
