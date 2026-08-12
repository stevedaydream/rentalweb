<template>
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- 頁面標題列 -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">智慧電表登錄</h1>
        <div class="flex items-center gap-2 text-text-secondary-light mt-1 flex-wrap">
          <span>目前模式：</span>
          <span class="font-bold text-blue-600 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
            {{ currentModeLabel }}
          </span>
          <span class="text-gray-300">|</span>
          <span>抄表月份：</span>
          <input type="date" :value="monthAsDate" @change="onMonthDateChange" :max="todayStr"
            aria-label="抄表日期"
            class="px-2 py-0.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm font-mono outline-none focus:ring-1 focus:ring-primary">
          <span v-if="isBackfillMode" class="font-bold text-orange-600 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded text-sm flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]" aria-hidden="true">history</span>補登模式
          </span>
          <span v-if="loading" class="text-xs animate-pulse ml-2">資料載入中...</span>
        </div>
      </div>
      <div class="flex gap-3 flex-wrap">
        <button
          @click="showSettingsModal = true"
          class="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2" aria-hidden="true">tune</span>
          計算參數設定
        </button>

        <!-- 匯入元件（內含觸發按鈕 + modal） -->
        <MeterReadingImport />

        <button
          ref="saveBtnRef"
          @click="saveAllReadings"
          :disabled="saving || !hasValidChanges"
          class="px-4 py-2 bg-gold-500 text-white rounded-lg shadow-sm hover:bg-gold-600 transition-colors text-sm font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="saving" class="material-symbols-outlined text-[18px] mr-2 animate-spin" aria-hidden="true">progress_activity</span>
          <span v-else class="material-symbols-outlined text-[18px] mr-2" aria-hidden="true">save</span>
          {{ saving ? '儲存中…' : '儲存紀錄' }}
        </button>
      </div>
    </div>

    <!-- 帳單分攤：步驟引導 + 主建物總表輸入 -->
    <div v-if="activeSettings.mode === 'bill_share'" class="space-y-3">
      <div class="flex items-center gap-3 text-sm text-gray-500">
        <span class="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
        <span>輸入本棟總表本期讀數與台電總帳單金額</span>
        <span class="text-gray-300 mx-1">→</span>
        <span class="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold shrink-0"
          :class="meterGroups[0] && calculateGroupAvgRate(meterGroups[0]) > 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'">2</span>
        <span :class="meterGroups[0] && calculateGroupAvgRate(meterGroups[0]) > 0 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'">填寫各房間本期讀數</span>
        <span class="text-gray-300 mx-1">→</span>
        <span class="w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center font-bold shrink-0">3</span>
        <span class="text-gray-400">儲存紀錄</span>
      </div>
      <div v-for="group in (activeGroup ? [activeGroup] : [])" :key="group.id" class="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-5 shadow-sm">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 class="font-bold text-lg text-blue-900 dark:text-blue-100">{{ group.name || '主建物總表' }}</h3>
            <p class="text-xs text-blue-700">
              用於計算平均分攤單價
              <span v-if="savingMaster" class="ml-1 animate-pulse">儲存中…</span>
              <span v-else-if="group.masterBillAmount" class="ml-1 text-green-600">已存至台電帳單</span>
            </p>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <label class="text-xs font-bold text-gray-500 block">本期總度數</label>
              <input type="number" v-model.number="group.masterCurrentReading" @change="persistMasterBill(group)" class="w-24 text-right font-bold border-b border-blue-500 bg-transparent focus:outline-none" placeholder="輸入">
            </div>
            <div class="text-right">
              <label class="text-xs font-bold text-gray-500 block">本期總帳單($)</label>
              <input type="number" v-model.number="group.masterBillAmount" @change="persistMasterBill(group)" class="w-24 text-right font-bold border-b border-blue-500 bg-transparent focus:outline-none" placeholder="輸入金額">
            </div>
          </div>
          <div class="text-right">
            <p class="text-xs font-bold text-blue-800 uppercase">換算平均單價</p>
            <p class="text-2xl font-bold text-blue-600">
              {{ calculateGroupAvgRate(group).toFixed(2) }} <span class="text-sm">元/度</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 台電總表頁籤（多顆總表時才顯示） -->
    <div v-if="!loading && meterGroups.length > 1" class="flex gap-1 flex-wrap border-b border-gray-200 dark:border-gray-700">
      <button v-for="g in meterGroups" :key="g.id" @click="activeGroupId = g.id"
        class="px-4 py-2.5 text-sm font-bold rounded-t-lg border-b-2 -mb-px transition-colors flex items-center gap-2"
        :class="activeGroupId === g.id
          ? 'border-primary text-primary bg-blue-50/60 dark:bg-blue-900/10'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'">
        {{ g.name }}
        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          :class="groupPending(g.id).filled >= groupPending(g.id).total
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'">
          {{ groupPending(g.id).filled }}/{{ groupPending(g.id).total }}
        </span>
      </button>
    </div>

    <!-- 統計資訊列 (固定費率 / 獨立累進) -->
    <div v-if="activeSettings.mode !== 'bill_share'" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500 uppercase font-bold">計費模式</p>
        <p class="text-base font-bold text-primary mt-1">
          <template v-if="activeSettings.mode === 'fixed'">固定 {{ activeSettings.fixedRate }} 元/度</template>
          <template v-else>{{ activeSettings.tieredConfig.strategy === 'split' ? '拆分制' : '標準台電' }}</template>
        </p>
        <p class="text-[11px] text-gray-400 mt-1">
          電表數 {{ activeGroup?.roomCount ?? 0 }}
          <span v-if="groupSettingsMap.has(activeGroupId)" class="text-gold-600 font-bold ml-1">· 專屬方案</span>
        </p>
      </div>
      <div v-if="activeSettings.mode === 'tiered'" class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500 uppercase font-bold">季節判定</p>
        <div class="flex items-center gap-1.5 mt-1">
          <span class="material-symbols-outlined text-[18px] text-orange-500" v-if="activeSettings.tieredConfig.season === 'summer'" aria-hidden="true">sunny</span>
          <span class="material-symbols-outlined text-[18px] text-blue-500" v-if="activeSettings.tieredConfig.season === 'non-summer'" aria-hidden="true">ac_unit</span>
          <span class="material-symbols-outlined text-[18px] text-purple-500" v-if="activeSettings.tieredConfig.season === 'average'" aria-hidden="true">balance</span>
          <span class="material-symbols-outlined text-[18px] text-green-500" v-if="activeSettings.tieredConfig.season === 'auto'" aria-hidden="true">event_repeat</span>
          <p class="text-base font-bold">{{ seasonLabel }}</p>
        </div>
        <p class="text-xs font-bold mt-2"
          :class="billableEntries.length > 0 && filledCount === billableEntries.length ? 'text-green-600' : 'text-orange-500'">
          已填寫 {{ filledCount }} / {{ billableEntries.length }} 表
        </p>
      </div>
      <div v-else class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500 uppercase font-bold">已填寫</p>
        <p class="text-base font-bold text-green-600 mt-1">{{ filledCount }} / {{ billableEntries.length }} 表</p>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500 uppercase font-bold">{{ isBackfillMode ? '本期電費合計' : '本月電費合計' }}</p>
        <p class="text-base font-bold mt-1">NT$ {{ totalEstimatedCost.toLocaleString() }}</p>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div class="min-w-0">
          <p class="text-xs text-gray-500 uppercase font-bold whitespace-nowrap">統一抄表日</p>
          <p class="text-xs text-gray-400 mt-0.5 whitespace-nowrap">套用至所有未填房間</p>
        </div>
        <input type="date" v-model="unifiedDate" @change="applyUnifiedDate"
          class="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-xs focus:ring-2 focus:ring-primary outline-none font-mono">
      </div>
    </div>

    <!-- 未納入電表群組提醒 -->
    <div v-if="!loading && ungroupedMeters.length > 0"
      class="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
      <span class="material-symbols-outlined text-red-500 text-[20px] shrink-0" aria-hidden="true">error</span>
      <div class="min-w-0">
        <p class="text-sm font-bold text-red-800 dark:text-red-200">
          {{ ungroupedMeters.length }} 個電表未納入任何台電總表
        </p>
        <p class="text-xs text-red-700 dark:text-red-300 mt-0.5">
          {{ ungroupedMeters.map(m => m.name).join('、') }}
          —— 它們自成一組計算級距（分母 {{ meterGroups.find(g => g.id === UNGROUPED)?.roomCount ?? 0 }}），並非依所屬棟別的級距。
          請到設定將其綁定至某顆台電總表的子群組，或改為「固定費率」個別方案。
        </p>
      </div>
    </div>

    <!-- 個別方案與全域不一致提醒 -->
    <div v-if="!loading && staleRooms.length > 0"
      class="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <span class="material-symbols-outlined text-amber-500 text-[20px] shrink-0" aria-hidden="true">warning</span>
      <div class="min-w-0">
        <p class="text-sm font-bold text-amber-800 dark:text-amber-200">
          {{ staleRooms.length }} 間房的個別電費方案與全域設定不同
        </p>
        <p class="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
          {{ staleRooms.map(r => r.name).join('、') }}
          —— 全域費率更新後不會自動套用，請點該列的電費方案按鈕選「帶入全域設定」，或改用全域設定。
        </p>
      </div>
    </div>

    <!-- 主抄表表格 -->
    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div class="overflow-x-auto relative min-h-[300px]">
        <div v-if="loading" class="absolute inset-0 z-10 bg-white/50 dark:bg-card-dark/50 flex items-center justify-center">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
        <table class="w-full min-w-[820px] text-sm text-left whitespace-nowrap">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="px-6 py-4">房號 / 租客</th>
              <th class="px-6 py-4">{{ activeSettings.mode === 'fixed' ? '抄表日' : '計費期間' }}</th>
              <th class="px-6 py-4 text-right">上期讀數</th>
              <th class="px-6 py-4 text-center w-40">本期讀數</th>
              <th class="px-6 py-4 text-right">用量</th>
              <th class="px-6 py-4 text-right">{{ activeSettings.mode === 'fixed' ? '電費金額' : '預估費用' }}</th>
              <th class="px-6 py-4 text-center w-20">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">

            <!-- 依子群組分區塊（含公共電表） -->
            <template v-for="section in sections" :key="section.id">
              <tr v-if="section.name">
                <td colspan="7" class="px-6 py-2 bg-blue-50/60 dark:bg-blue-900/10">
                  <div class="flex items-center justify-between gap-4 flex-wrap">
                    <span class="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]" aria-hidden="true">layers</span>{{ section.name }}
                    </span>
                    <span class="text-[11px] text-blue-600/80 dark:text-blue-300/80 flex items-center gap-3">
                      <span>用量 {{ section.totalUsage }} 度</span>
                      <span>電費 NT$ {{ section.totalCost.toLocaleString() }}</span>
                      <span v-if="section.publicShare > 0" class="font-bold">公共分攤預覽 NT$ {{ section.publicShare.toLocaleString() }}/房</span>
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-for="room in section.entries" :key="room.roomId"
                class="transition-colors"
                :class="room.isLocked ? 'bg-green-50/50 dark:bg-green-900/5'
                  : room.meterType === 'public' ? 'bg-purple-50/40 dark:bg-purple-900/5 hover:bg-purple-50/70 dark:hover:bg-purple-900/10'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'">

                <td class="px-6 py-4">
                  <div class="flex items-center gap-1.5">
                    <p class="font-bold text-base">{{ room.name }}</p>
                    <span v-if="room.meterType === 'public'"
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 whitespace-nowrap"
                    >公共</span>
                    <span v-if="room.meterType === 'public' && room.landlordPays"
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 whitespace-nowrap"
                      title="此表電費由房東負擔，不分攤給租客"
                    >房東負擔</span>
                    <span v-if="room.electricitySettings"
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-0.5"
                      :class="isRoomSettingsStale(room)
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-300'"
                      :title="isRoomSettingsStale(room)
                        ? '個別電費方案與全域設定不同（全域更新後未同步），可在此房間設定中按「帶入全域設定」'
                        : `個別電費方案：${room.electricitySettings.mode}`"
                    >
                      <span v-if="isRoomSettingsStale(room)" class="material-symbols-outlined text-[11px]" aria-hidden="true">warning</span>
                      個別方案
                    </span>
                  </div>
                  <p class="text-xs text-text-secondary-light">{{ room.meterType === 'public' ? '公共電表' : room.tenantName }}</p>
                </td>

                <td class="px-6 py-4">
                  <div v-if="activeSettings.mode === 'fixed'">
                    <input type="date" v-model="room.currentReadingDate" :disabled="room.isLocked"
                      class="px-2 py-1 border rounded-lg text-xs font-mono outline-none transition-colors"
                      :class="room.isLocked ? 'border-transparent bg-transparent text-gray-500 cursor-default' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary'">
                  </div>
                  <div v-else class="flex flex-col gap-1.5">
                    <div class="flex items-center gap-1.5 text-xs text-gray-500">
                      <span class="text-[10px] font-bold text-gray-400 w-4">起</span>
                      <span class="font-mono">{{ formatShortDate(room.lastReadingDate) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs">
                      <span class="text-[10px] font-bold text-primary w-4">迄</span>
                      <input type="date" v-model="room.currentReadingDate" :disabled="room.isLocked"
                        class="px-1.5 py-0.5 border rounded text-xs font-mono outline-none transition-colors"
                        :class="room.isLocked ? 'border-transparent bg-transparent text-gray-500 cursor-default' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-primary'">
                    </div>
                  </div>
                </td>

                <td class="px-6 py-4 text-right">
                  <span class="font-mono font-bold text-gray-700 dark:text-gray-300">{{ room.lastReading }}</span>
                  <p v-if="room.lastReadingDate" class="text-[11px] text-gray-400 mt-0.5">{{ formatShortDate(room.lastReadingDate) }}</p>
                </td>

                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      v-model.number="room.currentReading"
                      :disabled="room.isLocked"
                      :aria-label="`${room.name} 本期度數`"
                      data-reading-input
                      @keydown="onReadingKeydown"
                      @focus="onReadingFocus"
                      class="flex-1 px-3 py-2 text-center font-bold border rounded-lg outline-none transition-colors"
                      :class="room.isLocked
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 cursor-default'
                        : validateReading(room) ? 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary' : 'border-red-300 bg-red-50 text-red-600'"
                      placeholder="輸入"
                    >
                    <!-- 已抄表 badge -->
                    <span v-if="room.isLocked"
                      class="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      <span class="material-symbols-outlined text-[12px]" aria-hidden="true">check_circle</span>已抄
                    </span>
                  </div>
                </td>

                <td class="px-6 py-4 text-right font-mono font-bold">
                  <span :class="{'text-red-500': calculateUsage(room) < 0}">{{ room.currentReading ? calculateUsage(room) : '—' }}</span>
                </td>

                <td class="px-6 py-4 text-right font-bold text-primary">
                  <span v-if="room.currentReading">NT$ {{ calculateResult(room).cost.toLocaleString() }}</span>
                  <span v-else class="text-gray-300">—</span>
                </td>

                <td class="px-6 py-4 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button v-if="room.isLocked"
                      @click="unlockRoom(room)"
                      class="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                      title="修改本月抄表數值"
                      aria-label="修改本月抄表數值">
                      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
                    </button>
                    <button v-else
                      @click="showDetails(room)"
                      class="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
                      :disabled="!room.currentReading"
                      title="查看計算詳情"
                      aria-label="查看計算詳情">
                      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">calculate</span>
                    </button>
                    <button
                      v-if="room.meterType !== 'public'"
                      @click="openRoomSettings(room)"
                      class="p-1.5 rounded-lg transition-colors"
                      :class="!room.electricitySettings
                        ? 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        : isRoomSettingsStale(room)
                          ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100'
                          : 'text-gold-600 bg-gold-50 dark:bg-gold-900/20 hover:bg-gold-100'"
                      :title="!room.electricitySettings ? '設定電費方案（目前使用全域）'
                        : isRoomSettingsStale(room) ? '個別電費方案與全域設定不同，點此可帶入全域設定'
                        : `個別電費方案：${room.electricitySettings.mode}`"
                      :aria-label="`${room.name} 電費方案設定`">
                      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">electric_bolt</span>
                    </button>
                  </div>
                </td>
              </tr>
            </template>

            <!-- 空房分隔區 -->
            <template v-if="vacantRooms.length > 0">
              <tr>
                <td colspan="7" class="px-6 py-2 bg-gray-50 dark:bg-gray-800/30">
                  <span class="text-xs font-bold text-gray-400 uppercase">空房 ({{ vacantRooms.length }} 間，不計費)</span>
                </td>
              </tr>
              <tr v-for="room in vacantRooms" :key="room.roomId"
                class="opacity-50 hover:opacity-70 transition-opacity">
                <td class="px-6 py-3">
                  <p class="font-medium text-sm text-gray-500">{{ room.name }}</p>
                  <p class="text-xs text-gray-400">空房</p>
                </td>
                <td class="px-6 py-3 text-xs text-gray-400">—</td>
                <td class="px-6 py-3 text-right font-mono text-xs text-gray-400">{{ room.lastReading }}</td>
                <td class="px-6 py-3">
                  <input type="number" v-model.number="room.currentReading"
                    :aria-label="`${room.name} 本期度數`"
                    data-reading-input
                    @keydown="onReadingKeydown"
                    @focus="onReadingFocus"
                    class="w-full px-2 py-1.5 text-center text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-primary outline-none bg-white dark:bg-gray-800"
                    placeholder="可選填">
                </td>
                <td class="px-6 py-3 text-right text-xs text-gray-400">{{ room.currentReading ? calculateUsage(room) : '—' }}</td>
                <td class="px-6 py-3 text-right text-xs text-gray-400">—</td>
                <td class="px-6 py-3"></td>
              </tr>
            </template>

          </tbody>
        </table>
      </div>

      <!-- 儲存前摘要 -->
      <div v-if="!loading && hasValidChanges" class="px-6 py-4 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-800 flex items-center justify-between gap-4">
        <div class="text-sm text-blue-800 dark:text-blue-200">
          <span class="font-bold">準備儲存 {{ pendingSaveCount }} 筆：</span>
          <span class="text-blue-600 dark:text-blue-300">
            {{ pendingSaveRooms.map(r => r.name).join('、') }}
          </span>
        </div>
        <button @click="saveAllReadings" :disabled="saving"
          class="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0">
          <span v-if="saving" class="material-symbols-outlined text-[16px] animate-spin" aria-hidden="true">sync</span>
          <span v-else class="material-symbols-outlined text-[16px]" aria-hidden="true">save</span>
          {{ saving ? '儲存中…' : '確認儲存' }}
        </button>
      </div>

      <!-- 儲存成功 Banner -->
      <div v-if="showSaveBanner" class="px-6 py-4 bg-green-50 dark:bg-green-900/10 border-t border-green-200 dark:border-green-800 flex items-center justify-between">
        <div class="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm font-medium">
          <span class="material-symbols-outlined text-[20px]" aria-hidden="true">check_circle</span>
          已成功儲存 {{ savedCount }} 筆電表紀錄
        </div>
        <router-link v-if="!isBackfillMode" :to="{ name: 'Financials' }"
          class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">receipt_long</span>
          前往帳務管理，生成帳單
        </router-link>
      </div>

      <div v-if="!loading && meterData.length === 0" class="p-12 text-center text-text-secondary-light">
        <p>目前沒有房源資料，請先至「房源管理」新增房源。</p>
      </div>
    </div>

    <!-- 全域設定 Modal -->
    <MeterSettingsModal
      v-model:show="showSettingsModal"
      v-model="settings"
      :landlord-id="authStore.effectiveUid"
      @groups-updated="reloadData"
      @edit-group-settings="openGroupSettings"
    />

    <!-- 單一總表電費方案 Modal -->
    <MeterSettingsModal
      v-if="groupSettingsTarget"
      v-model:show="showGroupSettingsModal"
      :model-value="groupSettingsTarget.settings"
      :landlord-id="authStore.effectiveUid"
      :group-id="groupSettingsTarget.id"
      :group-name="groupSettingsTarget.name"
      :global-settings="settings"
      @groups-updated="reloadData"
    />

    <!-- 逐房間電費方案 Modal -->
    <MeterSettingsModal
      v-if="roomSettingsTarget"
      v-model:show="showRoomSettingsModal"
      :model-value="roomSettingsTarget.electricitySettings ?? settings"
      @update:model-value="onRoomSettingsSaved"
      @reset-room="onRoomSettingsReset"
      :landlord-id="authStore.effectiveUid"
      :room-id="roomSettingsTarget.roomId"
      :room-name="roomSettingsTarget.name"
      :global-settings="settings"
    />

    <!-- 計算詳情 Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showDetailModal = false"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col animate-scale-in">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold dark:text-gray-100">計算詳情</h2>
          <button @click="showDetailModal = false" class="dark:text-gray-300" aria-label="關閉"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <pre class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">{{ detailLog }}</pre>
        </div>
        <div class="p-6 border-t border-gray-100 dark:border-gray-700 text-right">
          <p class="text-lg font-bold dark:text-white">總計: NT$ {{ detailTotal }}</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { db } from '../../firebase/config';
import { useToastStore } from '../../stores/toast';
import { useAuthStore } from '../../stores/auth';
import {
  collection, doc, getDoc, setDoc, getDocs, addDoc,
  query, where, orderBy, updateDoc, serverTimestamp,
} from 'firebase/firestore';

import MeterSettingsModal from '../../components/meter/MeterSettingsModal.vue';
import MeterReadingImport from '../../components/meter/MeterReadingImport.vue';
import { defaultSettings, normalizeSettings, settingsFingerprint, UNGROUPED_ID, type Settings, type MeterGroup, type MeterEntry, type MeterGroupDoc, type PublicMeterDoc } from '../../components/meter/types';
import { getMeterGroups } from '../../services/meterGroupService';
import { getPublicMeters, updatePublicMeter } from '../../services/publicMeterService';
import {
  calculateUsage, calculateElectricity as calcElectricity,
  calculateGroupAvgRate, getCycleIndex as calcCycleIndex,
} from '../../utils/meter/calc';
import {
  buildSubGroupIndex, resolveGroupId as resolveGroupIdOf, buildMeterGroups,
  buildGroupSettingsMap, resolveRoomSettings, resolveRoomGroup, applyMasterBills,
} from '../../utils/meter/groups';
import { getTaipowerBillsByMonth, upsertTaipowerBill } from '../../services/billService';
import {
  buildSections, groupProgress, pendingSaveRooms as pendingSaveRoomsOf,
  validateReading, isOccupied, isVacant, isPublic, isBillable,
  type DisplaySection,
} from '../../utils/meter/sections';

const toast = useToastStore();
const authStore = useAuthStore();
const loading = ref(true);
const saving = ref(false);
const settings = ref<Settings>(JSON.parse(JSON.stringify(defaultSettings)));
const meterGroups = ref<MeterGroup[]>([]);
const meterData = ref<MeterEntry[]>([]);
const meterGroupDocs = ref<MeterGroupDoc[]>([]);
const publicMeterDocs = ref<PublicMeterDoc[]>([]);
const saveBtnRef = ref<HTMLButtonElement | null>(null);

const showSettingsModal = ref(false);
const UNGROUPED = UNGROUPED_ID; // 供 template 判斷未分組頁籤
const showDetailModal = ref(false);

// 逐房間電費方案
const roomSettingsTarget = ref<MeterEntry | null>(null)
const showRoomSettingsModal = ref(false)

const openRoomSettings = (room: MeterEntry) => {
  roomSettingsTarget.value = room
  showRoomSettingsModal.value = true
}

const onRoomSettingsSaved = (newSettings: Settings) => {
  if (roomSettingsTarget.value) {
    roomSettingsTarget.value.electricitySettings = newSettings
  }
}

// 單一總表的電費方案（由全域設定 Modal 的群組卡片觸發）
const showGroupSettingsModal = ref(false)
const groupSettingsTarget = ref<{ id: string; name: string; settings: Settings } | null>(null)

const openGroupSettings = (groupId: string, groupName: string) => {
  const doc = meterGroupDocs.value.find(g => g.id === groupId)
  groupSettingsTarget.value = {
    id: groupId,
    name: groupName,
    // 未設過專屬方案時以全域為起點
    settings: normalizeSettings(doc?.electricitySettings ?? settings.value, defaultSettings),
  }
  showGroupSettingsModal.value = true
}

const onRoomSettingsReset = () => {
  if (roomSettingsTarget.value) {
    roomSettingsTarget.value.electricitySettings = undefined
  }
}

// 個別方案與全域內容不一致 → 全域更新後未同步，列表上以琥珀色標示
const globalFingerprint = computed(() => settingsFingerprint(settings.value))
const isRoomSettingsStale = (room: MeterEntry) =>
  !!room.electricitySettings && settingsFingerprint(room.electricitySettings) !== globalFingerprint.value
const staleRooms = computed(() => meterData.value.filter(isRoomSettingsStale))
const detailLog = ref('');
const detailTotal = ref(0);
const unifiedDate = ref(new Date().toISOString().split('T')[0] || '');
const showSaveBanner = ref(false);
const savedCount = ref(0);
const todayStr = new Date().toISOString().split('T')[0]!;
const currentMonthStr = todayStr.slice(0, 7);
const selectedMonth = ref(currentMonthStr);
const monthAsDate = computed(() => `${selectedMonth.value}-01`);
const onMonthDateChange = (e: Event) => {
  const val = (e.target as HTMLInputElement).value;
  if (val) selectedMonth.value = val.slice(0, 7);
};

const isBackfillMode = computed(() => selectedMonth.value !== currentMonthStr);
const getMonthEndDate = (monthStr: string) => {
  const [y, m] = monthStr.split('-').map(Number) as [number, number];
  return `${monthStr}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};
const getMonthOffset = (monthStr: string, offset: number) => {
  const [y, m] = monthStr.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// --- 初始化 ---
onMounted(async () => {
  try {
    await Promise.all([loadSettings(), loadData()]);
  } catch (e) {
    console.error('Init Error', e);
    toast.error('資料載入失敗，請檢查網路連線');
  } finally {
    loading.value = false;
  }
});

const loadSettings = async () => {
  const uid = authStore.effectiveUid;
  const docRef = doc(db, 'settings', uid);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    settings.value = normalizeSettings(snap.data() as Partial<Settings>, defaultSettings);
  } else {
    await setDoc(docRef, defaultSettings);
  }
};

const loadData = async () => {
  const uid = authStore.effectiveUid;
  const today = new Date().toISOString().split('T')[0] || '';
  const targetMonth = selectedMonth.value;
  const prevMonth = getMonthOffset(targetMonth, -1);
  const defaultStartDate = isBackfillMode.value ? `${targetMonth}-01` : today;
  const defaultEndDate = isBackfillMode.value ? getMonthEndDate(targetMonth) : today;

  const [roomsSnap, readingsSnap, prevReadingsSnap, groups, pubMeters, taipowerBills] = await Promise.all([
    getDocs(query(
      collection(db, 'rooms'),
      where('landlordId', '==', uid),
      orderBy('name', 'asc')
    )),
    getDocs(query(
      collection(db, 'meter_readings'),
      where('landlordId', '==', uid),
      where('periodEnd', '>=', `${targetMonth}-01`),
      where('periodEnd', '<=', `${targetMonth}-31`)
    )),
    getDocs(query(
      collection(db, 'meter_readings'),
      where('landlordId', '==', uid),
      where('periodEnd', '>=', `${prevMonth}-01`),
      where('periodEnd', '<=', `${prevMonth}-31`)
    )),
    getMeterGroups(uid),
    getPublicMeters(uid),
    getTaipowerBillsByMonth(uid, targetMonth).catch(() => []),
  ]);

  meterGroupDocs.value = groups;
  publicMeterDocs.value = pubMeters;

  // subGroupId → groupId 反查表。rooms 只存 subGroupId，靠這張表回推所屬總表，
  // 因此不需要為 rooms 新增 groupId 欄位、也不需要資料遷移。
  const subGroupIndex = buildSubGroupIndex(groups);
  const resolveGroupId = (subGroupId?: string, explicitGroupId?: string) =>
    resolveGroupIdOf(groups, subGroupIndex, subGroupId, explicitGroupId);

  // 本月最新抄表紀錄 (by roomId)
  const thisMonthMap = new Map<string, any>();
  readingsSnap.docs.forEach(d => {
    const data = d.data();
    const existing = thisMonthMap.get(data.roomId);
    if (!existing || (data.createdAt?.seconds ?? 0) > (existing.createdAt?.seconds ?? 0)) {
      thisMonthMap.set(data.roomId, { id: d.id, ...data });
    }
  });

  // 上月抄表紀錄，作為無本月紀錄時的上期讀數備用
  const prevMonthMap = new Map<string, any>();
  prevReadingsSnap.docs.forEach(d => {
    const data = d.data();
    const existing = prevMonthMap.get(data.roomId);
    if (!existing || data.periodEnd > existing.periodEnd) {
      prevMonthMap.set(data.roomId, { id: d.id, ...data });
    }
  });

  const roomEntries: MeterEntry[] = roomsSnap.docs.map(d => {
    const data = d.data();
    const existing = thisMonthMap.get(d.id);
    const prev = prevMonthMap.get(d.id);
    return {
      roomId: d.id,
      name: data.name || '未命名',
      tenantName: data.tenantName || '',
      status: data.status || 'vacant',
      lastReading: existing ? existing.lastReading : (prev ? prev.currentReading : (data.lastMeterReading || 0)),
      lastReadingDate: existing ? existing.periodStart : (prev ? prev.periodEnd : (data.lastMeterDate || defaultStartDate)),
      currentReading: existing ? existing.currentReading : undefined,
      currentReadingDate: existing ? existing.periodEnd : defaultEndDate,
      existingReadingId: existing ? existing.id : null,
      isLocked: !!existing,
      roomLastMeterDate: data.lastMeterDate || '',
      electricitySettings: data.electricitySettings
        ? normalizeSettings(data.electricitySettings, defaultSettings)
        : undefined,
      subGroupId: data.subGroupId || '',
      cycleFirstUsage: prev?.usage,
      cycleFirstCost: prev?.cost,
      groupId: resolveGroupId(data.subGroupId || ''),
    };
  });

  // 公共電表列：讀數歷史與房間共用 meter_readings（roomId = 公共表文件 id）
  const publicEntries: MeterEntry[] = pubMeters.map(pm => {
    const existing = thisMonthMap.get(pm.id);
    const prev = prevMonthMap.get(pm.id);
    return {
      roomId: pm.id,
      name: pm.name,
      tenantName: '',
      status: 'public',
      lastReading: existing ? existing.lastReading : (prev ? prev.currentReading : (pm.lastMeterReading || 0)),
      lastReadingDate: existing ? existing.periodStart : (prev ? prev.periodEnd : (pm.lastMeterDate || defaultStartDate)),
      currentReading: existing ? existing.currentReading : undefined,
      currentReadingDate: existing ? existing.periodEnd : defaultEndDate,
      existingReadingId: existing ? existing.id : null,
      isLocked: !!existing,
      roomLastMeterDate: pm.lastMeterDate || '',
      meterType: 'public',
      subGroupId: pm.subGroupId,
      landlordPays: pm.landlordPays,
      cycleFirstUsage: prev?.usage,
      cycleFirstCost: prev?.cost,
      groupId: resolveGroupId(pm.subGroupId, pm.groupId),
    };
  });

  meterData.value = [...roomEntries, ...publicEntries];

  // 帳單分攤制的總表度數與金額改由 taipower_bills 持久化，避免重載後被清空、
  // 進而在重新儲存時把電費靜默歸零
  meterGroups.value = applyMasterBills(buildMeterGroups(groups, meterData.value), taipowerBills);
};

const reloadData = async () => {
  loading.value = true;
  try {
    await loadData();
  } finally {
    loading.value = false;
  }
};

watch(selectedMonth, async () => {
  unifiedDate.value = isBackfillMode.value
    ? getMonthEndDate(selectedMonth.value)
    : new Date().toISOString().split('T')[0] || '';
  loading.value = true;
  meterData.value = [];
  try {
    await loadData();
  } finally {
    loading.value = false;
  }
});

// --- 計算邏輯（實作於 src/utils/meter/*，此處僅注入元件狀態） ---
// 群組層設定（已補齊新欄位），未設則不入 map
const groupSettingsMap = computed(() => buildGroupSettingsMap(meterGroupDocs.value));

// 設定優先序：房間個別 > 所屬總表 > 全域
const getRoomSettings = (room: MeterEntry): Settings =>
  resolveRoomSettings(room, groupSettingsMap.value, settings.value);

// 取得此電表所屬的總表；找不到時退回第一組，避免計算中斷
const getRoomGroup = (room: MeterEntry): MeterGroup | undefined =>
  resolveRoomGroup(room, meterGroups.value);

const getCycleIndex = (s: Settings) => calcCycleIndex(s, selectedMonth.value);

const calculateElectricity = (room: MeterEntry) =>
  calcElectricity(room, getRoomSettings(room), getRoomGroup(room), selectedMonth.value);

// --- Computed ---
const currentModeLabel = computed(() => {
  const map: Record<string, string> = { fixed: '固定費率', tiered: '獨立累進費率', tiered_avg: '平均費率（累進）', bill_share: '帳單分攤制' };
  return map[activeSettings.value.mode] || activeSettings.value.mode;
});
const seasonLabel = computed(() => {
  const map: Record<string, string> = { auto: '自動判斷', average: '平均費率', summer: '強制夏月', 'non-summer': '強制非夏月' };
  return map[activeSettings.value.tieredConfig.season];
});
// --- 群組頁籤：以下顯示用的清單皆限縮在目前選取的總表 ---
const activeGroupId = ref('');
const activeGroup = computed(() => meterGroups.value.find(g => g.id === activeGroupId.value));
const activeGroupDoc = computed(() => meterGroupDocs.value.find(g => g.id === activeGroupId.value));
// 目前總表採用的設定（群組層 > 全域），供統計卡顯示
const activeSettings = computed(() =>
  groupSettingsMap.value.get(activeGroupId.value) ?? settings.value);

const scopedData = computed(() => meterData.value.filter(r => r.groupId === activeGroupId.value));
const occupiedRooms = computed(() => scopedData.value.filter(isOccupied));
const vacantRooms = computed(() => scopedData.value.filter(isVacant));
const publicEntries = computed(() => scopedData.value.filter(isPublic));
const billableEntries = computed(() => [...occupiedRooms.value, ...publicEntries.value]);
const filledCount = computed(() => billableEntries.value.filter(r => r.currentReading !== undefined).length);

// 警示橫幅需跨所有總表，不受頁籤限縮
const allBillableEntries = computed(() => meterData.value.filter(isBillable));

// 各頁籤的未填筆數，讓使用者不必逐頁點開才知道哪裡還沒抄
const groupPending = (groupId: string) => groupProgress(meterData.value, groupId);

// 群組載入或異動後，確保選取的頁籤仍然存在
watch(meterGroups, (gs) => {
  if (!gs.some(g => g.id === activeGroupId.value)) activeGroupId.value = gs[0]?.id ?? '';
}, { immediate: true });

// 未綁定子群組、且實際會出帳的電表：不計入級距分母，卻仍套用此群組的累進參數計算，等同用別棟的級距。
// 排除三種不會出錯的情況：空房（不計費）、已改固定費率（calculateElectricity 提前返回）、尚未建立子群組（走 fallback）。
const ungroupedMeters = computed(() => {
  if (meterGroupDocs.value.length === 0) return [];
  return allBillableEntries.value.filter(m =>
    m.groupId === UNGROUPED_ID && getRoomSettings(m).mode !== 'fixed'
  );
});

const sections = computed<DisplaySection[]>(() =>
  buildSections(scopedData.value, activeGroupDoc.value?.subGroups ?? [], r => calculateResult(r).cost));

const pendingSaveRooms = computed(() => pendingSaveRoomsOf(meterData.value));
const pendingSaveCount = computed(() => pendingSaveRooms.value.length);

const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  return `${Number(parts[1])}/${Number(parts[2])}`;
};
const applyUnifiedDate = () => {
  meterData.value.forEach(r => {
    if (!r.isLocked) r.currentReadingDate = unifiedDate.value;
  });
};
// 帳單分攤制：總表度數／金額一經修改即寫回 taipower_bills，
// 不依賴「儲存紀錄」按鈕（使用者可能只改總表數字而未動任何房間讀數）
const savingMaster = ref(false);
const persistMasterBill = async (group: MeterGroup) => {
  const usage = Number(group.masterCurrentReading) || 0;
  const amount = Number(group.masterBillAmount) || 0;
  if (usage <= 0 || amount <= 0) return;
  savingMaster.value = true;
  try {
    await upsertTaipowerBill(authStore.effectiveUid, selectedMonth.value, group.id, { usage, amount });
  } catch (e) {
    console.error('儲存台電帳單失敗', e);
    toast.error('台電總表資料儲存失敗');
  } finally {
    savingMaster.value = false;
  }
};

const unlockRoom = (room: MeterEntry) => {
  room.isLocked = false;
};

// --- 鍵盤動線：度數欄 Tab/Enter 跳下一個度數欄、Shift 跳回、最後一欄跳儲存按鈕 ---
const onReadingFocus = (e: FocusEvent) => (e.target as HTMLInputElement).select();
const onReadingKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Tab' && e.key !== 'Enter') return;
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-reading-input]'))
    .filter(el => !el.disabled);
  const idx = inputs.indexOf(e.target as HTMLInputElement);
  if (idx === -1) return;
  e.preventDefault();
  const next = e.shiftKey ? idx - 1 : idx + 1;
  if (next < 0) return;
  if (next >= inputs.length) {
    saveBtnRef.value?.focus();
    return;
  }
  const el = inputs[next]!;
  el.focus();
  el.select();
};
const calculateResult = (room: MeterEntry) => calculateElectricity(room);
const totalEstimatedCost = computed(() => scopedData.value.reduce((sum, r) => sum + calculateResult(r).cost, 0));

const hasValidChanges = computed(() => pendingSaveCount.value > 0);

// --- 操作 ---
const showDetails = (room: MeterEntry) => {
  const res = calculateElectricity(room);
  detailLog.value = res.log;
  detailTotal.value = res.cost;
  showDetailModal.value = true;
};

const saveAllReadings = async () => {
  const validEntries = pendingSaveRooms.value;
  if (validEntries.length === 0) return;

  saving.value = true;
  showSaveBanner.value = false;
  try {
    const uid = authStore.effectiveUid;
    const promises: Promise<any>[] = [];

    for (const entry of validEntries) {
      const usage = (entry.currentReading || 0) - entry.lastReading;
      const { cost, log } = calculateElectricity(entry);
      // 記錄「這筆實際採用的」設定，而非全域設定（房間或群組可能有各自方案）
      const used = getRoomSettings(entry);
      const readingData = {
        landlordId: uid,
        roomId: entry.roomId,
        roomName: entry.name,
        lastReading: entry.lastReading,
        currentReading: entry.currentReading,
        usage, cost,
        periodStart: entry.lastReadingDate,
        periodEnd: entry.currentReadingDate,
        calcLog: log,
        mode: used.mode,
        cycle: used.tieredConfig.cycle,
        cycleIndex: getCycleIndex(used),
        groupId: entry.groupId || UNGROUPED_ID,
        ...(entry.meterType === 'public' ? { meterType: 'public', subGroupId: entry.subGroupId || '' } : {}),
        createdAt: serverTimestamp(),
      };

      if (entry.existingReadingId) {
        // 更新既有紀錄
        promises.push(updateDoc(doc(db, 'meter_readings', entry.existingReadingId), readingData));
      } else {
        // 新增紀錄
        promises.push(addDoc(collection(db, 'meter_readings'), readingData));
      }
      if (!entry.roomLastMeterDate || entry.currentReadingDate >= entry.roomLastMeterDate) {
        if (entry.meterType === 'public') {
          promises.push(updatePublicMeter(entry.roomId, {
            lastMeterReading: Number(entry.currentReading) || 0,
            lastMeterDate: entry.currentReadingDate,
          }));
        } else {
          promises.push(updateDoc(doc(db, 'rooms', entry.roomId), {
            lastMeterReading: entry.currentReading,
            lastMeterDate: entry.currentReadingDate,
          }));
        }
      }
    }

    await Promise.all(promises);
    savedCount.value = validEntries.length;
    showSaveBanner.value = true;
    await loadData();
  } catch (e) {
    console.error(e);
    toast.error('儲存失敗，請重試');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.animate-scale-in { animation: scaleIn 0.2s ease-out; }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
