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
    <div v-if="settings.mode === 'bill_share'" class="space-y-3">
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
      <div v-for="group in meterGroups" :key="group.id" class="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-5 shadow-sm">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 class="font-bold text-lg text-blue-900 dark:text-blue-100">{{ group.name || '主建物總表' }}</h3>
            <p class="text-xs text-blue-700">用於計算平均分攤單價</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <label class="text-xs font-bold text-gray-500 block">本期總度數</label>
              <input type="number" v-model.number="group.masterCurrentReading" class="w-24 text-right font-bold border-b border-blue-500 bg-transparent focus:outline-none" placeholder="輸入">
            </div>
            <div class="text-right">
              <label class="text-xs font-bold text-gray-500 block">本期總帳單($)</label>
              <input type="number" v-model.number="group.masterBillAmount" class="w-24 text-right font-bold border-b border-blue-500 bg-transparent focus:outline-none" placeholder="輸入金額">
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

    <!-- 統計資訊列 (固定費率 / 獨立累進) -->
    <div v-if="settings.mode !== 'bill_share'" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500 uppercase font-bold">計費模式</p>
        <p class="text-base font-bold text-primary mt-1">
          <template v-if="settings.mode === 'fixed'">固定 {{ settings.fixedRate }} 元/度</template>
          <template v-else>{{ settings.tieredConfig.strategy === 'split' ? '拆分制' : '標準台電' }}</template>
        </p>
      </div>
      <div v-if="settings.mode === 'tiered'" class="p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500 uppercase font-bold">季節判定</p>
        <div class="flex items-center gap-1.5 mt-1">
          <span class="material-symbols-outlined text-[18px] text-orange-500" v-if="settings.tieredConfig.season === 'summer'" aria-hidden="true">sunny</span>
          <span class="material-symbols-outlined text-[18px] text-blue-500" v-if="settings.tieredConfig.season === 'non-summer'" aria-hidden="true">ac_unit</span>
          <span class="material-symbols-outlined text-[18px] text-purple-500" v-if="settings.tieredConfig.season === 'average'" aria-hidden="true">balance</span>
          <span class="material-symbols-outlined text-[18px] text-green-500" v-if="settings.tieredConfig.season === 'auto'" aria-hidden="true">event_repeat</span>
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
          {{ ungroupedMeters.length }} 個電表未納入「{{ meterGroup?.name || '電表群組' }}」
        </p>
        <p class="text-xs text-red-700 dark:text-red-300 mt-0.5">
          {{ ungroupedMeters.map(m => m.name).join('、') }}
          —— 這些電表不計入級距分母（目前分母 {{ meterGroups[0]?.roomCount ?? 0 }}），但仍會套用此群組的累進參數計算，等同用別棟的級距出帳。
          請到設定將其綁定子群組，或改為「固定費率」個別方案。
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
              <th class="px-6 py-4">{{ settings.mode === 'fixed' ? '抄表日' : '計費期間' }}</th>
              <th class="px-6 py-4 text-right">上期讀數</th>
              <th class="px-6 py-4 text-center w-40">本期讀數</th>
              <th class="px-6 py-4 text-right">用量</th>
              <th class="px-6 py-4 text-right">{{ settings.mode === 'fixed' ? '電費金額' : '預估費用' }}</th>
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
                  <div v-if="settings.mode === 'fixed'">
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
import { defaultSettings, normalizeSettings, settingsFingerprint, type Settings, type MeterGroup, type MeterEntry, type MeterGroupDoc, type PublicMeterDoc } from '../../components/meter/types';
import { getMeterGroups } from '../../services/meterGroupService';
import { getPublicMeters, updatePublicMeter } from '../../services/publicMeterService';

const toast = useToastStore();
const authStore = useAuthStore();
const loading = ref(true);
const saving = ref(false);
const settings = ref<Settings>(JSON.parse(JSON.stringify(defaultSettings)));
const meterGroups = ref<MeterGroup[]>([]);
const meterData = ref<MeterEntry[]>([]);
const meterGroup = ref<MeterGroupDoc | null>(null);
const publicMeterDocs = ref<PublicMeterDoc[]>([]);
const saveBtnRef = ref<HTMLButtonElement | null>(null);

const showSettingsModal = ref(false);
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

  const [roomsSnap, readingsSnap, prevReadingsSnap, groups, pubMeters] = await Promise.all([
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
  ]);

  meterGroup.value = groups[0] ?? null;
  publicMeterDocs.value = pubMeters;

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
    };
  });

  meterData.value = [...roomEntries, ...publicEntries];

  // 級距分母 = 群組內電表總數（房間 + 公共表，含空房）
  // 已建立子群組時，只計入有綁定子群組的電表；未分組的房源不屬於這顆台電表，不該撐大分母。
  // 尚未建立子群組（或全部都沒綁）時 fallback 為全部電表，維持舊行為。
  const subGroupIds = new Set((meterGroup.value?.subGroups ?? []).map(sg => sg.id));
  const groupedMeters = subGroupIds.size > 0
    ? meterData.value.filter(m => !!m.subGroupId && subGroupIds.has(m.subGroupId))
    : meterData.value;
  const meterCount = Math.max(1, groupedMeters.length || meterData.value.length);

  meterGroups.value = [{
    id: meterGroup.value?.id || 'default_group',
    name: meterGroup.value?.name || '本棟總表',
    officialMetersCount: 1,
    roomCount: meterCount,
    masterLastReading: 0,
    masterCurrentReading: undefined,
    masterBillAmount: undefined,
  }];
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

// --- 計算邏輯 ---
const getDaysDiff = (start: string, end: string) => {
  const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// 一個「完整計費月」的天數：自 start 起算滿一個月（含頭尾）
// 例：8/1 起算 → 31 天（8/1~8/31）；2/1 起算 → 28 天
const getFullMonthDays = (start: string) => {
  const [y, m, d] = start.split('-').map(Number);
  if (!y || !m || !d) return 30;
  const diff = new Date(y, m, d).getTime() - new Date(y, m - 1, d).getTime();
  return Math.round(diff / 86400000);
};

const countSummerDays = (start: string, end: string) => {
  let count = 0;
  let current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    const m = current.getMonth();
    if (m >= 5 && m <= 8) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const calculateGroupAvgRate = (group: MeterGroup) => {
  if (!group.masterCurrentReading || !group.masterBillAmount) return 0;
  const usage = Math.max(0, group.masterCurrentReading - (group.masterLastReading || 0));
  return usage === 0 ? 0 : group.masterBillAmount / usage;
};

// 取得此房間實際使用的設定（個別 > 全域）
const getRoomSettings = (room: MeterEntry): Settings =>
  room.electricitySettings ?? settings.value

// 選定月份在台電雙月帳期中的序位（1 = 單月/預估，2 = 雙月/結算）
const cycleIndex = computed<1 | 2>(() => {
  const cfg = settings.value.tieredConfig;
  if (cfg.cycle !== 'bimonthly') return 1;
  const month = Number(selectedMonth.value.split('-')[1]);
  const isFirst = cfg.cycleAnchor === 'even' ? month % 2 === 0 : month % 2 === 1;
  return isFirst ? 1 : 2;
});

const calculateTieredLogic = (usage: number, room: MeterEntry, group: MeterGroup, s?: Settings) => {
  const activeSettings = s ?? getRoomSettings(room)
  let totalCost = 0;
  let log = '';
  const days = getDaysDiff(room.lastReadingDate, room.currentReadingDate);
  const summerDays = countSummerDays(room.lastReadingDate, room.currentReadingDate);

  let usageSummer = 0;
  let usageNonSummer = 0;
  let useAverageRate = false;
  // 各季節段分到的級距額度比例：跨季期間須依天數拆分，否則兩段都拿到整期額度
  let summerShare = 1;
  let nonSummerShare = 1;

  // tiered_avg 模式：不分夏/非夏，直接用平均費率
  const isAvgMode = activeSettings.mode === 'tiered_avg'

  if (isAvgMode || activeSettings.tieredConfig.season === 'average') {
    useAverageRate = true;
    log += isAvgMode ? `模式: 平均費率（不分夏/非夏）\n` : `季節判定: 採用平均費率 (夏月+非夏月)/2\n`;
  } else if (activeSettings.tieredConfig.season === 'summer') {
    usageSummer = usage;
  } else if (activeSettings.tieredConfig.season === 'non-summer') {
    usageNonSummer = usage;
  } else {
    const summerRatio = summerDays / days;
    usageSummer = usage * summerRatio;
    usageNonSummer = usage * (1 - summerRatio);
    summerShare = summerRatio;
    nonSummerShare = 1 - summerRatio;
    log += `季節判定 (共${days}天): 夏月${summerDays}天 / 非夏月${days - summerDays}天\n`;
    log += `用量拆分: 夏月 ${usageSummer.toFixed(1)}度 / 非夏月 ${usageNonSummer.toFixed(1)}度\n`;
    if (summerDays > 0 && summerDays < days) {
      log += `級距額度亦依天數拆分: 夏月 ${(summerShare * 100).toFixed(1)}% / 非夏月 ${(nonSummerShare * 100).toFixed(1)}%\n`;
    }
    log += `\n`;
  }

  const dayScaling = activeSettings.tieredConfig.dayScaling ?? 'full-month';
  let scaleFactor = 1;
  if (dayScaling === 'legacy') {
    scaleFactor = days / 30;
    log += `天數比例: ${days}天 / 30 = ${scaleFactor.toFixed(3)}\n`;
  } else if (dayScaling === 'full-month') {
    const fullDays = getFullMonthDays(room.lastReadingDate);
    scaleFactor = days / fullDays;
    log += scaleFactor === 1
      ? `天數比例: 完整月 (${days}天)，不縮放\n`
      : `天數比例: ${days}天 / 完整月${fullDays}天 = ${scaleFactor.toFixed(3)}\n`;
  }
  if (activeSettings.tieredConfig.strategy === 'split') {
    scaleFactor *= (group.officialMetersCount / group.roomCount);
    log += `級距策略: 資本拆分 (總表${group.officialMetersCount} / 電表數${group.roomCount})\n`;
  } else {
    scaleFactor *= group.officialMetersCount;
    log += `級距策略: 標準台電 (總表${group.officialMetersCount})\n`;
  }
  log += `級距調整係數: ${scaleFactor.toFixed(4)}\n`;

  const calcPart = (amount: number, type: 'summer' | 'non-summer' | 'average', share = 1) => {
    const partScale = scaleFactor * share;
    let remaining = amount;
    let cost = 0;
    let prevLimit = 0;
    let partLog = type === 'summer' ? '--- [夏月計算] ---\n' : type === 'non-summer' ? '--- [非夏月計算] ---\n' : '--- [平均費率計算] ---\n';
    if (share !== 1) partLog += `本段級距係數: ${partScale.toFixed(4)}\n`;
    for (const tier of activeSettings.tiers) {
      if (remaining <= 0) break;
      const scaledLimit = (tier.limit === 99999) ? 99999 : tier.limit * partScale;
      const gap = scaledLimit - (prevLimit * partScale);
      const inTier = Math.min(remaining, gap);
      if (inTier > 0) {
        const rate = type === 'summer' ? tier.summerRate : type === 'non-summer' ? tier.nonSummerRate : (tier.summerRate + tier.nonSummerRate) / 2;
        const tierCost = inTier * rate;
        cost += tierCost;
        partLog += `級距${tier.limit}: ${inTier.toFixed(1)}度 x $${rate.toFixed(3)} = $${tierCost.toFixed(1)}\n`;
        remaining -= inTier;
      }
      prevLimit = tier.limit;
    }
    return { cost, log: partLog };
  };

  if (useAverageRate) {
    const res = calcPart(usage, 'average');
    totalCost += res.cost;
    log += res.log;
  } else {
    if (usageSummer > 0) { const res = calcPart(usageSummer, 'summer', summerShare); totalCost += res.cost; log += res.log; }
    if (usageNonSummer > 0) { const res = calcPart(usageNonSummer, 'non-summer', nonSummerShare); totalCost += res.cost; log += res.log; }
  }
  return { cost: Math.round(totalCost), raw: totalCost, log };
};

// 保底單價：算出的平均單價低於 minRate 時，改用 minRate 計費
const applyMinRate = (
  res: { cost: number; raw: number; log: string },
  usage: number,
  minRate: number,
) => {
  if (!(minRate > 0) || usage <= 0) return res;
  const avg = res.raw / usage;
  if (avg >= minRate) return res;
  const cost = Math.round(usage * minRate);
  return {
    cost,
    raw: usage * minRate,
    log: `${res.log}\n平均單價 $${avg.toFixed(3)} < 保底 $${minRate} → 改用保底: ${usage}度 x $${minRate} = $${cost}`,
  };
};

const calculateElectricity = (room: MeterEntry) => {
  const s = getRoomSettings(room)
  const usage = Math.max(0, (room.currentReading || 0) - room.lastReading);
  if (usage === 0) return { cost: 0, log: '無用量' };
  if (s.mode === 'fixed') {
    const cost = Math.round(usage * s.fixedRate);
    return { cost, log: `固定費率: ${usage}度 x $${s.fixedRate} = $${cost}` };
  }
  const group = meterGroups.value[0];
  if (!group) return { cost: 0, log: '錯誤: 無群組設定' };
  if (s.mode === 'bill_share') {
    const rate = calculateGroupAvgRate(group);
    const cost = Math.round(usage * rate);
    return { cost, log: `帳單分攤: ${usage}度 x 平均單價$${rate.toFixed(4)} = $${cost}` };
  }

  // 'tiered' 和 'tiered_avg' 皆走此路徑
  const minRate = s.tieredConfig.minRate ?? 0;
  const isCycleSecond = s.tieredConfig.cycle === 'bimonthly'
    && cycleIndex.value === 2
    && room.cycleFirstUsage != null
    && room.cycleFirstCost != null;

  if (!isCycleSecond) {
    return applyMinRate(calculateTieredLogic(usage, room, group, s), usage, minRate);
  }

  // 雙月帳期第 2 月：以「帳期累積度數」跑累進，再扣掉第 1 月已收金額
  const firstUsage = room.cycleFirstUsage!;
  const firstCost = room.cycleFirstCost!;
  const cumUsage = firstUsage + usage;
  const res = calculateTieredLogic(cumUsage, room, group, s);
  const header = `【雙月帳期第 2 月】\n帳期累積: 第1月 ${firstUsage}度 + 本期 ${usage}度 = ${cumUsage}度\n`;
  const cumAvg = res.raw / cumUsage;

  if (minRate > 0 && cumAvg < minRate) {
    const cost = Math.round(usage * minRate);
    return {
      cost,
      log: `${header}${res.log}\n累積平均單價 $${cumAvg.toFixed(3)} < 保底 $${minRate}`
        + `\n→ 本期 = ${usage}度 x $${minRate} = $${cost}`,
    };
  }

  const diff = res.raw - firstCost;
  const cost = Math.round(Math.max(0, diff));
  return {
    cost,
    log: `${header}${res.log}\n累積金額 $${res.raw.toFixed(2)} − 第1月已收 $${firstCost.toFixed(2)} = $${cost}`
      + (diff < 0 ? `\n※ 第1月已收超過累積金額（第1月觸發保底），本期歸零` : ''),
  };
};

// --- Computed ---
const currentModeLabel = computed(() => {
  const map: Record<string, string> = { fixed: '固定費率', tiered: '獨立累進費率', bill_share: '帳單分攤制' };
  return map[settings.value.mode] || settings.value.mode;
});
const seasonLabel = computed(() => {
  const map: Record<string, string> = { auto: '自動判斷', average: '平均費率', summer: '強制夏月', 'non-summer': '強制非夏月' };
  return map[settings.value.tieredConfig.season];
});
const occupiedRooms = computed(() => meterData.value.filter(r => r.meterType !== 'public' && (r.tenantName || r.status === 'occupied')));
const vacantRooms = computed(() => meterData.value.filter(r => r.meterType !== 'public' && !r.tenantName && r.status !== 'occupied'));
const publicEntries = computed(() => meterData.value.filter(r => r.meterType === 'public'));
const billableEntries = computed(() => [...occupiedRooms.value, ...publicEntries.value]);
const filledCount = computed(() => billableEntries.value.filter(r => r.currentReading !== undefined).length);

// 未綁定子群組、且實際會出帳的電表：不計入級距分母，卻仍套用此群組的累進參數計算，等同用別棟的級距。
// 排除三種不會出錯的情況：空房（不計費）、已改固定費率（calculateElectricity 提前返回）、尚未建立子群組（走 fallback）。
const ungroupedMeters = computed(() => {
  const subGroupIds = new Set((meterGroup.value?.subGroups ?? []).map(sg => sg.id));
  if (subGroupIds.size === 0) return [];
  return billableEntries.value.filter(m =>
    (!m.subGroupId || !subGroupIds.has(m.subGroupId)) &&
    (m.electricitySettings ?? settings.value).mode !== 'fixed'
  );
});

// 依子群組分區塊：房間在前、公共表在後；未分組房間歸入最後一個 section
interface DisplaySection {
  id: string;
  name: string;
  entries: MeterEntry[];
  totalUsage: number;
  totalCost: number;
  publicShare: number; // 公共電費 ÷ 群組房數（不含房東負擔的表）
}
const sections = computed<DisplaySection[]>(() => {
  const sgs = meterGroup.value?.subGroups ?? [];
  const result: DisplaySection[] = [];
  const usedIds = new Set<string>();

  const buildSection = (id: string, name: string, rooms: MeterEntry[], pubs: MeterEntry[], allRoomCount: number): DisplaySection => {
    const entries = [...rooms, ...pubs];
    entries.forEach(e => usedIds.add(e.roomId));
    const totalUsage = entries.reduce((sum, r) => sum + (r.currentReading ? calculateUsage(r) : 0), 0);
    const totalCost = entries.reduce((sum, r) => sum + (r.currentReading ? calculateResult(r).cost : 0), 0);
    const publicCost = pubs.filter(p => !p.landlordPays)
      .reduce((sum, p) => sum + (p.currentReading ? calculateResult(p).cost : 0), 0);
    const publicShare = allRoomCount > 0 ? Math.round(publicCost / allRoomCount) : 0;
    return { id, name, entries, totalUsage: Math.round(totalUsage), totalCost, publicShare };
  };

  for (const sg of sgs) {
    const rooms = occupiedRooms.value.filter(r => r.subGroupId === sg.id);
    const pubs = publicEntries.value.filter(r => r.subGroupId === sg.id);
    // 分攤基數 = 群組內全部房間數（含空房），空房份額房東吸收
    const allRoomCount = meterData.value.filter(r => r.meterType !== 'public' && r.subGroupId === sg.id).length;
    if (rooms.length || pubs.length) result.push(buildSection(sg.id, sg.name, rooms, pubs, allRoomCount));
  }

  const sgIds = new Set(sgs.map(sg => sg.id));
  const restRooms = occupiedRooms.value.filter(r => !usedIds.has(r.roomId));
  const restPubs = publicEntries.value.filter(r => !usedIds.has(r.roomId));
  if (restRooms.length || restPubs.length) {
    const ungroupedRoomCount = meterData.value.filter(r => r.meterType !== 'public' && !sgIds.has(r.subGroupId || '')).length;
    result.push(buildSection('ungrouped', result.length > 0 ? '未分組' : '', restRooms, restPubs, ungroupedRoomCount));
  }
  return result;
});
const pendingSaveRooms = computed(() => meterData.value.filter(r => !r.isLocked && r.currentReading !== undefined && r.currentReading >= r.lastReading));
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
const calculateUsage = (room: MeterEntry) => Math.max(0, (room.currentReading || 0) - room.lastReading);
const calculateResult = (room: MeterEntry) => calculateElectricity(room);
const validateReading = (room: MeterEntry) => !((room.currentReading || 0) < room.lastReading && room.currentReading !== undefined);
const totalEstimatedCost = computed(() => meterData.value.reduce((sum, r) => sum + calculateResult(r).cost, 0));

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
        mode: settings.value.mode,
        cycle: settings.value.tieredConfig.cycle,
        cycleIndex: cycleIndex.value,
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
