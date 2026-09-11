<template>
  <div class="max-w-7xl mx-auto space-y-6" @click="closeDropdown">

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">帳務管理</h1>
        <p class="text-text-secondary-light">收支紀錄、帳單生成與電費盈虧</p>
      </div>
      <div v-if="activeTab === 'month'" class="flex gap-2 flex-wrap items-center">
        <MonthPicker v-model="currentMonth" />
        <div class="flex items-center gap-1">
          <button @click="prepareGenerateBills" :disabled="loading || preparingBills || generatingBills"
            class="px-3 py-2 bg-ink-700 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-ink-800 disabled:opacity-50 transition-colors">
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">magic_button</span>
            一鍵生成帳單
            <span v-if="generateLogs.length > 0"
              class="ml-1 bg-white/20 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none"
              :title="`本月已生成 ${generateLogs.length} 次`"
            >{{ generateLogs.length }}</span>
          </button>
          <button
            v-if="generateLogs.length > 0"
            @click="showLogsModal = true"
            aria-label="查看本月生成紀錄"
            class="p-2 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-500 hover:text-gold-600 hover:border-gold-400 transition-colors"
            title="查看本月生成紀錄"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">history</span>
          </button>
        </div>
        <!-- 更多操作下拉 -->
        <div class="relative">
          <button @click.stop="showMoreMenu = !showMoreMenu"
            class="px-3 py-2 border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
            <span class="material-symbols-outlined text-[18px]">more_horiz</span>更多
          </button>
          <div v-if="showMoreMenu"
            class="absolute right-0 top-10 w-44 bg-white dark:bg-ink-800 rounded-xl shadow-xl border border-ink-100 dark:border-ink-700 z-50 overflow-hidden">
            <button @click="sendLineNotifications(); showMoreMenu = false" :disabled="sendingLine || loading"
              class="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50 transition-colors text-[#06C755]">
              <span v-if="sendingLine" class="material-symbols-outlined text-[16px] animate-spin">sync</span>
              <svg v-else class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              {{ sendingLine ? '發送中...' : 'LINE 通知租客' }}
            </button>
            <div class="border-t border-ink-100 dark:border-ink-700"></div>
            <button @click="openTaipowerModal(); showMoreMenu = false"
              class="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-ink-600 dark:text-ink-200">
              <span class="material-symbols-outlined text-[18px] text-yellow-500">electric_bolt</span>台電帳單
            </button>
            <div class="border-t border-ink-100 dark:border-ink-700"></div>
            <button @click="showPropertyCostsModal = true; showMoreMenu = false"
              class="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-ink-600 dark:text-ink-200">
              <span class="material-symbols-outlined text-[18px] text-rose-500" aria-hidden="true">receipt_long</span>稅費與保險
            </button>
            <div class="border-t border-ink-100 dark:border-ink-700"></div>
            <button @click="showPrintBillsModal = true; showMoreMenu = false"
              class="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-ink-600 dark:text-ink-200">
              <span class="material-symbols-outlined text-[18px] text-blue-500">print</span>列印帳單
            </button>
          </div>
        </div>
        <button @click="openModal()"
          class="px-3 py-2 bg-gold-500 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gold-600 transition-colors">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>記一筆
        </button>
      </div>
    </div>

    <!-- 分頁切換 -->
    <div class="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
      <button @click="activeTab = 'month'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
        :class="activeTab === 'month' ? 'bg-white dark:bg-card-dark shadow text-text-primary-light dark:text-white' : 'text-text-secondary-light hover:text-text-primary-light dark:hover:text-white'">
        <span class="material-symbols-outlined text-[16px]" aria-hidden="true">calendar_month</span>月度
      </button>
      <button @click="activeTab = 'annual'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
        :class="activeTab === 'annual' ? 'bg-white dark:bg-card-dark shadow text-text-primary-light dark:text-white' : 'text-text-secondary-light hover:text-text-primary-light dark:hover:text-white'">
        <span class="material-symbols-outlined text-[16px]" aria-hidden="true">calculate</span>年度
      </button>
    </div>

    <AnnualSummary
      v-if="activeTab === 'annual'"
      :properties="propertiesList" :rooms="roomsList" :tenants="tenantsList"
    />

    <template v-else>
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500"></div>
    </div>

    <template v-else>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
          <p class="text-xs text-text-secondary-light mb-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px] text-green-500">payments</span>本月已收
          </p>
          <p class="text-2xl font-bold text-green-600">NT$ {{ stats.income.toLocaleString() }}</p>
          <p class="text-xs text-text-secondary-light mt-1">{{ stats.incomeCount }} 筆</p>
        </div>
        <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
          <p class="text-xs text-text-secondary-light mb-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px] text-orange-500">pending_actions</span>待收 / 逾期
          </p>
          <p class="text-2xl font-bold text-orange-500">NT$ {{ stats.pending.toLocaleString() }}</p>
          <p class="text-xs text-text-secondary-light mt-1">{{ stats.pendingCount }} 筆</p>
        </div>
        <div class="p-5 bg-white dark:bg-card-dark rounded-xl border border-ink-100 dark:border-ink-800 shadow-sm">
          <p class="text-xs text-text-secondary-light mb-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px] text-red-400">arrow_upward</span>本月支出
          </p>
          <p class="text-2xl font-bold text-red-500">NT$ {{ stats.expense.toLocaleString() }}</p>
          <p class="text-xs text-text-secondary-light mt-1">{{ stats.expenseCount }} 筆</p>
        </div>
        <div class="p-5 rounded-xl border shadow-sm"
          :class="stats.net >= 0
            ? 'bg-gold-50 dark:bg-gold-900/10 border-gold-100 dark:border-gold-900/30'
            : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'">
          <p class="text-xs mb-1 flex items-center gap-1"
            :class="stats.net >= 0 ? 'text-gold-700 dark:text-gold-300' : 'text-red-600'">
            <span class="material-symbols-outlined text-[16px]">account_balance</span>本月淨利
          </p>
          <p class="text-2xl font-bold" :class="stats.net >= 0 ? 'text-gold-600' : 'text-red-500'">
            NT$ {{ stats.net.toLocaleString() }}
          </p>
          <p class="text-xs mt-1" :class="stats.net >= 0 ? 'text-gold-500' : 'text-red-400'">
            已收 - 支出
          </p>
        </div>
      </div>

      <!-- 前期未繳：不切月份也看得到 -->
      <div v-if="priorSummary.groups.length > 0"
        class="flex flex-wrap items-center gap-x-3 gap-y-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40 rounded-2xl px-5 py-3.5">
        <span class="material-symbols-outlined text-[20px] text-red-500 shrink-0" aria-hidden="true">error</span>
        <p class="text-sm text-red-700 dark:text-red-300 flex-1 min-w-0">
          <strong>{{ currentMonth }} 以前還有 {{ priorSummary.groups.length }} 位租客沒繳清，共 NT$ {{ priorSummary.total.toLocaleString() }}</strong>
          <span class="block sm:inline sm:ml-1 text-xs">
            {{ priorSummary.groups.slice(0, 4).map(g => g.label).join('、') }}{{ priorSummary.groups.length > 4 ? ' 等' : '' }}
          </span>
        </p>
        <button @click="showPriorArrears"
          class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200 transition-colors">
          查看並收款
        </button>
      </div>

      <!-- Generated Bills Summary -->
      <!-- 生成警告（公共電表缺抄表等） -->
      <div v-if="generatedWarnings.length > 0"
        class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-3.5">
        <div class="flex items-start gap-2">
          <span class="material-symbols-outlined text-[20px] text-amber-500 shrink-0" aria-hidden="true">warning</span>
          <div class="text-sm text-amber-800 dark:text-amber-300 space-y-0.5">
            <p v-for="(w, idx) in generatedWarnings" :key="idx">{{ w }}</p>
          </div>
          <button @click="generatedWarnings = []" aria-label="關閉警告"
            class="ml-auto text-amber-500 hover:text-amber-700 p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
          </button>
        </div>
      </div>

      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        leave-active-class="transition-all duration-200 ease-in"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="showGeneratedSummary && generatedSummary.length > 0"
          class="bg-white dark:bg-card-dark rounded-2xl border border-green-200 dark:border-green-800 shadow-sm overflow-hidden"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-3.5 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-green-600" aria-hidden="true">check_circle</span>
              <span class="font-bold text-green-800 dark:text-green-300 text-sm">
                本次生成 {{ generatedSummary.length }} 筆帳單
              </span>
              <span class="text-xs text-green-600 dark:text-green-400">{{ currentMonth }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-green-700 dark:text-green-400 font-medium">
                合計 NT$ {{ generatedSummary.reduce((s, i) => s + i.amount, 0).toLocaleString() }}
              </span>
              <button
                @click="showGeneratedSummary = false"
                aria-label="收起摘要"
                class="text-green-500 hover:text-green-700 dark:hover:text-green-300 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
              >
                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
              </button>
            </div>
          </div>

          <!-- List -->
          <div class="divide-y divide-ink-50 dark:divide-ink-800">
            <div
              v-for="(item, idx) in generatedSummary"
              :key="idx"
              class="flex items-center gap-3 px-5 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
            >
              <!-- Category badge -->
              <span
                class="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
                :class="item.category === '租金收入'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'"
              >
                {{ item.category }}
              </span>

              <!-- Target + description -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-text-primary-light dark:text-text-primary-dark truncate">{{ item.target }}</p>
                <p class="text-xs text-text-secondary-light truncate">{{ item.description }}</p>
              </div>

              <!-- Amount -->
              <span class="shrink-0 text-sm font-bold text-green-600 dark:text-green-400">
                +{{ item.amount.toLocaleString() }}
              </span>
            </div>
          </div>

          <!-- Per-tenant totals -->
          <div class="border-t border-ink-100 dark:border-ink-800 bg-surface-light dark:bg-surface-dark px-5 py-3 space-y-2">
            <p class="text-[11px] font-bold text-text-secondary-light uppercase tracking-wide mb-2">各租客本次應收</p>
            <div
              v-for="t in generatedTenantTotals"
              :key="t.target"
              class="space-y-0.5"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-text-primary-light dark:text-text-primary-dark min-w-0 flex-shrink-0 w-32 truncate">{{ t.target }}</span>
                <span class="text-xs text-text-secondary-light flex-1 truncate">
                  {{ t.categories.map(c => `${c.name} ${c.amount.toLocaleString()}`).join(' + ') }}
                </span>
                <span class="shrink-0 font-extrabold text-sm text-text-primary-light dark:text-text-primary-dark">
                  = NT$ {{ t.total.toLocaleString() }}
                </span>
              </div>
              <p v-if="t.credit > 0 || t.prior > 0" class="text-xs text-right text-text-secondary-light">
                <span v-if="t.credit > 0" class="text-blue-600 dark:text-blue-300">預收沖抵 −{{ t.credit.toLocaleString() }}</span>
                <span v-if="t.credit > 0 && t.prior > 0">・</span>
                <span v-if="t.prior > 0" class="text-red-600 dark:text-red-400">前期未繳 +{{ t.prior.toLocaleString() }}</span>
                → 應繳 <strong class="text-text-primary-light dark:text-text-primary-dark">NT$ {{ t.due.toLocaleString() }}</strong>
              </p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Category Summary -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          v-for="cat in categoryStats" :key="cat.key"
          @click="currentTab = cat.key"
          class="p-4 rounded-xl border text-left transition-all hover:shadow-md"
          :class="currentTab === cat.key
            ? `${cat.activeBg} border-transparent shadow-md`
            : 'bg-white dark:bg-card-dark border-ink-100 dark:border-ink-800'"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="material-symbols-outlined text-[20px]" :class="cat.iconColor">{{ cat.icon }}</span>
            <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="cat.badgeClass">{{ cat.count }} 筆</span>
          </div>
          <p class="text-xs text-text-secondary-light">{{ cat.label }}</p>
          <p class="text-lg font-bold mt-0.5" :class="cat.amountColor">NT$ {{ cat.amount.toLocaleString() }}</p>
        </button>
      </div>

      <!-- 電費盈虧分析：逐台電總表（棟）各一張，期間錨定該棟台電帳單迄月 -->
      <ElectricityStatsCard
        v-for="es in electricityStatsList" :key="es.groupId"
        :stats="es" @open-taipower="openTaipowerModal"
      />

      <!-- Transaction Table -->
      <div class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-800 shadow-sm overflow-visible">

        <!-- Tabs -->
        <div class="flex items-center border-b border-ink-100 dark:border-ink-800 px-6 pt-2 overflow-x-auto">
          <button
            v-for="tab in tabs" :key="tab.value"
            @click="currentTab = tab.value"
            class="px-4 py-3 text-sm font-medium border-b-2 transition-colors relative top-[1px] whitespace-nowrap"
            :class="currentTab === tab.value
              ? 'border-gold-500 text-gold-600'
              : 'border-transparent text-text-secondary-light hover:text-ink-600 dark:hover:text-ink-300'"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" class="ml-1 text-xs bg-ink-100 dark:bg-ink-700 px-1.5 py-0.5 rounded-full">{{ tab.count }}</span>
          </button>

          <button
            @click="groupByTenant = !groupByTenant"
            class="ml-auto shrink-0 my-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1"
            :class="groupByTenant
              ? 'border-gold-400 bg-gold-50 text-gold-700 dark:bg-gold-900/20 dark:text-gold-300'
              : 'border-ink-200 dark:border-ink-700 text-text-secondary-light hover:bg-surface-light dark:hover:bg-surface-dark'"
            :aria-pressed="groupByTenant"
          >
            <span class="material-symbols-outlined text-[15px]" aria-hidden="true">
              {{ groupByTenant ? 'check_circle' : 'group' }}
            </span>
            依租客
          </button>
        </div>

        <!-- 依租客分組檢視 -->
        <div v-if="groupByTenant" class="min-h-[300px] divide-y divide-ink-100 dark:divide-ink-800">
          <div v-for="g in tenantGroups" :key="g.key">
            <div
              class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-6 py-3.5 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors cursor-pointer"
              role="button" tabindex="0" :aria-expanded="expandedGroups.has(g.key)"
              @click="toggleGroup(g.key)" @keydown.enter="toggleGroup(g.key)" @keydown.space.prevent="toggleGroup(g.key)"
            >
              <span class="material-symbols-outlined text-[18px] text-ink-400 shrink-0" aria-hidden="true">
                {{ expandedGroups.has(g.key) ? 'expand_more' : 'chevron_right' }}
              </span>
              <span class="font-bold text-sm truncate flex-1 min-w-0">{{ g.label }}</span>
              <!-- 收合時也要看得到租客傳了截圖在等你，否則等於沒通知 -->
              <span v-if="waitingCount(g.items)"
                class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 whitespace-nowrap">
                <span class="material-symbols-outlined text-[13px]" aria-hidden="true">hourglass_top</span>
                待確認 {{ waitingCount(g.items) }}
              </span>
              <span v-if="g.priorOutstanding > 0"
                class="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 whitespace-nowrap">
                前期欠 {{ g.priorOutstanding.toLocaleString() }}
              </span>
              <span v-if="creditOf(g.key) > 0"
                class="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 whitespace-nowrap">
                預收 {{ creditOf(g.key).toLocaleString() }}
              </span>
              <span class="text-xs text-text-secondary-light shrink-0 whitespace-nowrap">{{ g.items.length }} 筆</span>
              <span class="text-sm font-bold shrink-0 sm:w-24 text-right whitespace-nowrap"
                :class="g.total >= 0 ? 'text-green-600' : 'text-red-500'">
                {{ g.total.toLocaleString() }}
              </span>
              <div class="flex items-center justify-end gap-2 w-full sm:w-auto">
                <span class="shrink-0 sm:w-32 text-right whitespace-nowrap">
                  <span v-if="g.key === OTHER_GROUP" class="text-xs text-ink-300">—</span>
                  <span v-else-if="g.owed === 0" class="text-xs font-bold text-green-600 inline-flex items-center gap-0.5">
                    <span class="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>已收
                  </span>
                  <span v-else class="text-xs font-bold text-orange-600">待收 {{ g.owed.toLocaleString() }}</span>
                </span>
                <button
                  v-if="g.owed > 0 && g.key !== OTHER_GROUP"
                  @click.stop="markGroupPaid(g)"
                  class="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 hover:bg-green-100 hover:text-green-700 transition-colors whitespace-nowrap"
                  :title="`由最舊的開始沖銷 ${g.unpaidCount + g.prior.length} 筆`"
                >
                  <span class="material-symbols-outlined text-[14px] align-middle" aria-hidden="true">payments</span>
                  收款 ({{ g.unpaidCount + g.prior.length }})
                </button>
                <span v-else class="hidden sm:block shrink-0 w-[86px]"></span>
              </div>
            </div>

            <div v-if="expandedGroups.has(g.key)" class="bg-surface-light/50 dark:bg-surface-dark/30 px-4 sm:px-6 pb-3">
              <template v-if="g.prior.length > 0">
                <p class="pt-2 pb-1 sm:pl-7 text-[11px] font-bold text-red-600 dark:text-red-400">前期未繳</p>
                <div v-for="item in g.prior" :key="item.id"
                  class="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 sm:pl-7 border-t border-ink-100/60 dark:border-ink-800/60">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium shrink-0"
                    :class="categoryBadge(item.category)">{{ item.category }}</span>
                  <span class="text-xs text-text-secondary-light shrink-0 font-mono">{{ item.date }}</span>
                  <span class="text-xs text-text-secondary-light truncate flex-1 min-w-0">{{ item.description }}</span>
                  <div class="flex items-center justify-end gap-3 w-full sm:w-auto">
                    <span class="text-sm font-bold shrink-0 sm:w-24 text-right whitespace-nowrap text-red-600">
                      欠 {{ outstandingOf(item).toLocaleString() }}
                      <span v-if="isPartial(item)" class="block text-[11px] font-medium text-text-secondary-light">
                        共 {{ item.amount.toLocaleString() }}
                      </span>
                    </span>
                    <span class="shrink-0 sm:w-32 text-right whitespace-nowrap">
                      <button @click="markPaid(item)"
                        class="px-2 py-1 rounded text-[11px] font-medium bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700 transition-colors">
                        {{ item.status === 'waiting_confirmation' ? '確認收款' : '收款' }}
                      </button>
                    </span>
                  </div>
                </div>
                <p v-if="g.items.length > 0" class="pt-3 pb-1 sm:pl-7 text-[11px] font-bold text-text-secondary-light">本月</p>
              </template>
              <div v-for="item in g.items" :key="item.id"
                class="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 sm:pl-7 border-t border-ink-100/60 dark:border-ink-800/60">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium shrink-0"
                  :class="categoryBadge(item.category)">{{ item.category }}</span>
                <span class="text-xs text-text-secondary-light shrink-0 font-mono">{{ item.date }}</span>
                <span class="text-xs text-text-secondary-light truncate flex-1 min-w-0">{{ item.description }}</span>
                <div class="flex items-center justify-end gap-3 w-full sm:w-auto">
                  <span class="text-sm font-bold shrink-0 sm:w-24 text-right whitespace-nowrap"
                    :class="item.type === 'income' ? 'text-green-600' : 'text-red-500'">
                    {{ item.type === 'income' ? '+' : '-' }} {{ item.amount.toLocaleString() }}
                    <span v-if="isPartial(item)" class="block text-[11px] font-medium text-orange-600">
                      已收 {{ collectedOf(item).toLocaleString() }}
                    </span>
                  </span>
                  <span class="shrink-0 sm:w-32 text-right whitespace-nowrap">
                    <!-- 待確認：租客已上傳截圖，先給你看圖再確認 -->
                    <span v-if="item.status === 'waiting_confirmation'" class="inline-flex items-center gap-1.5">
                      <a v-if="item.paymentProofUrl" :href="item.paymentProofUrl" target="_blank" rel="noopener"
                        @click.stop
                        class="block w-9 h-7 rounded overflow-hidden border border-amber-300 hover:border-amber-500 transition-colors"
                        title="查看匯款截圖">
                        <img :src="item.paymentProofUrl" class="w-full h-full object-cover" alt="匯款截圖" width="36" height="28">
                      </a>
                      <button @click="markPaid(item)"
                        class="px-2 py-1 rounded text-[11px] font-medium bg-amber-100 text-amber-700 hover:bg-green-100 hover:text-green-700 transition-colors">
                        確認收款
                      </button>
                    </span>
                    <button v-else-if="item.type === 'income' && !isCollected(item)"
                      @click="markPaid(item)"
                      class="px-2 py-1 rounded text-[11px] font-medium bg-orange-100 text-orange-700 hover:bg-green-100 hover:text-green-700 transition-colors">
                      {{ isPartial(item) ? '收餘款' : '收款' }}
                    </button>
                    <span v-else-if="item.type === 'income'" class="text-[11px] text-green-600 font-bold">已收 ✓</span>
                    <span v-else class="text-[11px] text-ink-300">支出</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="tenantGroups.length === 0" class="py-16 text-center text-sm text-ink-300">本月尚無紀錄</div>
        </div>

        <div v-else class="overflow-x-auto min-h-[300px]">
          <table class="w-full min-w-[880px] text-sm text-left whitespace-nowrap">
            <thead class="text-xs text-text-secondary-light uppercase bg-surface-light dark:bg-surface-dark">
              <tr>
                <th class="px-6 py-3">日期</th>
                <th class="px-6 py-3">類別</th>
                <th class="px-6 py-3">對象 / 房號</th>
                <th class="px-6 py-3">摘要</th>
                <th class="px-6 py-3 text-right">金額</th>
                <th class="px-6 py-3 text-center">狀態</th>
                <th class="px-6 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100 dark:divide-ink-800">
              <tr v-for="item in filteredTransactions" :key="item.id"
                class="hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-text-secondary-light text-xs">{{ item.date }}</td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium" :class="categoryBadge(item.category)">
                    {{ item.category }}
                  </span>
                </td>
                <td class="px-6 py-4 font-medium text-sm">{{ item.target }}</td>
                <td class="px-6 py-4 text-text-secondary-light text-xs max-w-[180px] truncate">{{ item.description }}</td>
                <td class="px-6 py-4 text-right font-bold" :class="item.type === 'income' ? 'text-green-600' : 'text-red-500'">
                  {{ item.type === 'income' ? '+' : '-' }} {{ item.amount.toLocaleString() }}
                </td>
                <td class="px-6 py-4 text-center">
                  <!-- 待收：顯示快速收款按鈕 -->
                  <template v-if="item.status === 'pending' || item.status === 'overdue'">
                    <div class="flex flex-col items-center gap-1">
                      <span v-if="isPartial(item)" class="text-[11px] font-medium text-orange-600">
                        已收 {{ collectedOf(item).toLocaleString() }}・剩 {{ outstandingOf(item).toLocaleString() }}
                      </span>
                      <button
                        @click="markPaid(item)"
                        class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 hover:bg-green-100 hover:text-green-700 transition-colors"
                      >
                        <span class="material-symbols-outlined text-[14px]" aria-hidden="true">payments</span>
                        {{ item.status === 'overdue' ? '逾期－收款' : '收款' }}
                      </button>
                    </div>
                  </template>
                  <!-- 待確認：顯示截圖預覽 + 確認按鈕 -->
                  <template v-else-if="item.status === 'waiting_confirmation'">
                    <div class="flex flex-col items-center gap-1.5">
                      <a v-if="item.paymentProofUrl" :href="item.paymentProofUrl" target="_blank" rel="noopener"
                        class="block w-12 h-10 rounded overflow-hidden border border-amber-300 hover:border-amber-500 transition-colors"
                        title="查看匯款截圖">
                        <img :src="item.paymentProofUrl" class="w-full h-full object-cover" alt="付款截圖" width="48" height="40" />
                      </a>
                      <button
                        @click="markPaid(item)"
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-green-100 hover:text-green-700 transition-colors"
                      >
                        <span class="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>
                        確認收款
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="inline-flex items-center gap-1.5 flex-wrap justify-center">
                      <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                        :class="statusStyles[item.status] || 'text-green-600 bg-green-50'">
                        <span class="material-symbols-outlined text-[14px]">{{ statusIcons[item.status] || 'check_circle' }}</span>
                        {{ statusLabels[item.status] || '已結清' }}
                      </span>
                      <span v-if="item.status === 'completed' && billLateDays(item) > 0"
                        class="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-medium">
                        <span class="material-symbols-outlined text-[13px]" aria-hidden="true">schedule</span>遲繳 {{ billLateDays(item) }} 天
                      </span>
                    </div>
                  </template>
                </td>
                <td class="px-6 py-4 text-center relative">
                  <button @click.stop="toggleMenu(item.id)"
                    aria-label="更多選項"
                    class="text-ink-300 hover:text-gold-600 p-1 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                    :class="{ 'bg-gold-50 text-gold-600': activeMenuId === item.id }">
                    <span class="material-symbols-outlined text-[20px]" aria-hidden="true">more_vert</span>
                  </button>
                  <div v-if="activeMenuId === item.id"
                    class="absolute right-8 top-8 w-36 bg-white dark:bg-ink-800 rounded-xl shadow-xl border border-ink-100 dark:border-ink-700 z-50 overflow-hidden text-left animation-fade-in"
                    @click.stop>
                    <button @click="handleEdit(item)" aria-label="編輯" class="w-full px-4 py-2 text-sm hover:bg-surface-light dark:hover:bg-surface-dark text-ink-600 dark:text-ink-200 flex items-center gap-2">
                      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>編輯
                    </button>
                    <button @click="openHistory(item)" aria-label="修改紀錄" class="w-full px-4 py-2 text-sm hover:bg-surface-light dark:hover:bg-surface-dark text-ink-600 dark:text-ink-200 flex items-center gap-2">
                      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">history</span>修改紀錄
                    </button>
                    <div class="border-t border-ink-100 dark:border-ink-700 my-1"></div>
                    <button @click="handleDelete(item.id)" aria-label="刪除" class="w-full px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2">
                      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>刪除
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredTransactions.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-text-secondary-light">
                  <span class="material-symbols-outlined text-4xl block mb-2 text-ink-200">receipt_long</span>
                  本月 ({{ currentMonth }}) 無相關紀錄
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    </template>

    <BillTransactionModal v-model:show="showModal" v-model="form" :is-editing="isEditing" :tenants="tenantsList"
      :open-bills="openBills" @save="saveTransaction" @receive="onManualReceive" />
    <ReceivePaymentModal
      :show="!!receiveTarget" @update:show="closeReceive"
      :label="receiveTarget?.label || ''" :bills="receiveTarget?.bills || []"
      :default-amount="receiveTarget?.defaultAmount" :default-date="receiveTarget?.defaultDate"
      :credit="receiveTarget ? creditOf(receiveTarget.tenantDocId) : 0"
      :can-hold-credit="!!receiveTarget?.tenantDocId" :busy="receiving"
      @confirm="confirmReceive" />
    <TaipowerModal v-model:show="showTaipowerModal" v-model="taipowerForm" :groups="taipowerGroupOptions" @save="saveTaipowerBill" />
    <PrintBillsModal v-model:show="showPrintBillsModal" :month="currentMonth" />
    <PropertyCostsModal v-model:show="showPropertyCostsModal" :properties="propertiesList" />
    <BillHistoryModal v-model:show="showHistoryModal" :history="selectedHistory" />

    <!-- 出帳前取得伺服端完整預覽 -->
    <div v-if="showGenerateConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeBillingPreview"></div>
      <div role="dialog" aria-modal="true" aria-labelledby="billing-preview-title"
        :aria-busy="preparingBills || generatingBills"
        class="relative bg-white dark:bg-ink-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col">
        <div class="p-6 pb-3 shrink-0">
          <h3 id="billing-preview-title" class="font-bold text-text-primary-light dark:text-text-primary-dark">出帳預覽</h3>
          <p class="text-xs text-text-secondary-light mt-1">{{ billingPreview?.month || currentMonth }} 月份</p>
        </div>
        <div class="px-6 overflow-y-auto space-y-4 text-sm">
          <p v-if="preparingBills" role="status">正在核對租約、既有帳單與抄表資料…</p>
          <p v-if="billingError" role="alert" class="text-red-600 dark:text-red-300">{{ billingError }}</p>
          <template v-if="billingPreview">
            <div class="rounded-xl bg-surface-light dark:bg-surface-dark p-3 space-y-1">
              <p>預計 {{ previewItems.length }} 筆，應收 NT$ {{ previewAmount.toLocaleString() }}</p>
              <p>預收沖抵 NT$ {{ previewCredit.toLocaleString() }}，尚需繳款 NT$ {{ (previewAmount - previewCredit).toLocaleString() }}</p>
              <p class="text-xs text-text-secondary-light">首末月沿用整月計收。確認時若資料變更，會要求重新預覽。</p>
            </div>
            <ul class="divide-y divide-ink-100 dark:divide-ink-700">
              <li v-for="(item, idx) in previewItems" :key="idx" class="py-3 space-y-1">
                <div class="flex justify-between gap-3 font-bold"><span>{{ item.target }} · {{ item.category }}</span><span class="shrink-0">NT$ {{ item.amount.toLocaleString() }}</span></div>
                <p class="text-xs text-text-secondary-light">{{ item.description }}</p>
                <p class="text-xs text-text-secondary-light">截止 {{ item.dueDate }}<span v-if="item.creditApplied"> · 預收沖抵 NT$ {{ item.creditApplied.toLocaleString() }}</span></p>
              </li>
            </ul>
            <p v-if="!previewItems.length" class="text-text-secondary-light">本次沒有可新增的帳單，請查看下方略過原因。</p>
            <div v-if="billingPreview.allocations.length" class="text-xs space-y-1">
              <p class="font-bold">公共電費核對</p>
              <p v-for="a in billingPreview.allocations" :key="a.readingId">
                {{ a.name }}：每房 {{ a.share }} 元，房東負擔尾差 {{ a.roundingRemainder }} 元、空房 {{ a.vacantAmount }} 元<span v-if="a.unresolvedAmount">，另有 {{ a.unresolvedAmount }} 元待確認歸屬</span>。
              </p>
            </div>
            <div v-if="billingPreview.warnings.length" class="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-amber-800 dark:text-amber-200">
              <p class="font-bold mb-1">需注意</p>
              <ul class="space-y-1 text-xs"><li v-for="w in billingPreview.warnings" :key="w">{{ w }}</li></ul>
            </div>
            <details v-if="billingPreview.skipped.length" class="text-xs text-text-secondary-light">
              <summary class="cursor-pointer">略過原因（{{ billingPreview.skipped.length }}）</summary>
              <ul class="space-y-1 mt-2"><li v-for="w in billingPreview.skipped" :key="w">{{ w }}</li></ul>
            </details>
            <p v-if="priorSummary.total > 0" class="text-xs text-red-600 dark:text-red-300">前期尚欠 NT$ {{ priorSummary.total.toLocaleString() }}，維持原帳單，不併入本次金額。</p>
          </template>
        </div>
        <div class="p-6 shrink-0 flex flex-wrap gap-3">
          <p v-if="generatingBills" role="status" class="w-full text-xs">已確認完成 {{ completedBillingBatches }} 批，處理中…</p>
          <button @click="closeBillingPreview" :disabled="generatingBills || preparingBills"
            class="flex-1 py-2.5 rounded-xl border border-ink-200 dark:border-ink-600 text-sm disabled:opacity-50">關閉</button>
          <button v-if="billingError && !pendingBillingBatches.length" @click="prepareGenerateBills" :disabled="preparingBills || generatingBills"
            class="flex-1 py-2.5 rounded-xl bg-ink-700 text-white text-sm disabled:opacity-50">重新預覽</button>
          <button v-else @click="confirmGenerateBills" :disabled="preparingBills || generatingBills || !pendingBillingBatches.length"
            class="flex-1 py-2.5 rounded-xl bg-ink-700 text-white text-sm font-bold disabled:opacity-50">
            {{ generatingBills ? '出帳中…' : billingError ? '重試未完成批次' : '確認出帳' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 刪除確認 Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteConfirm = false"></div>
      <div class="relative bg-white dark:bg-ink-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-red-600">delete</span>
          </div>
          <div>
            <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">確認刪除</h3>
            <p class="text-xs text-text-secondary-light">此操作無法復原</p>
          </div>
        </div>
        <p class="text-sm text-text-secondary-light">確定要刪除此筆紀錄嗎？刪除後將無法還原。</p>
        <div class="flex gap-3 pt-2">
          <button @click="showDeleteConfirm = false"
            class="flex-1 py-2.5 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-ink-600 dark:text-ink-300 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
            取消
          </button>
          <button @click="confirmDelete"
            class="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
            確認刪除
          </button>
        </div>
      </div>
    </div>

    <!-- 生成紀錄 Modal -->
    <div v-if="showLogsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showLogsModal = false"></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logs-modal-title"
        class="relative bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-ink-100 dark:border-ink-800 shrink-0">
          <div>
            <h2 id="logs-modal-title" class="font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-gold-500" aria-hidden="true">history</span>
              帳單生成紀錄
            </h2>
            <p class="text-xs text-text-secondary-light mt-0.5">{{ currentMonth }}・共 {{ generateLogs.length }} 次</p>
          </div>
          <button @click="showLogsModal = false" aria-label="關閉" class="text-ink-300 hover:text-ink-600 p-1 rounded-full hover:bg-surface-light transition-colors">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <!-- Log list -->
        <div class="overflow-y-auto flex-1 divide-y divide-ink-50 dark:divide-ink-800">
          <details
            v-for="(log, idx) in generateLogs"
            :key="log.id"
            class="group"
            :open="idx === 0"
          >
            <summary class="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-surface-light dark:hover:bg-surface-dark list-none select-none">
              <span class="w-6 h-6 rounded-full bg-ink-100 dark:bg-ink-700 text-xs font-bold flex items-center justify-center text-text-secondary-light shrink-0">
                {{ generateLogs.length - idx }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                  第 {{ generateLogs.length - idx }} 次生成
                  <span class="ml-2 text-xs text-text-secondary-light font-normal">
                    {{ log.generatedAt?.toDate ? log.generatedAt.toDate().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' }}
                  </span>
                </p>
                <p class="text-xs text-text-secondary-light">{{ log.billCount }} 筆・合計 NT$ {{ (log.items || []).reduce((s, i) => s + i.amount, 0).toLocaleString() }}</p>
              </div>
              <span class="material-symbols-outlined text-[18px] text-ink-300 group-open:rotate-180 transition-transform" aria-hidden="true">expand_more</span>
            </summary>

            <!-- Detail items -->
            <div class="px-6 pb-4 space-y-1">
              <div
                v-for="(item, i) in log.items"
                :key="i"
                class="flex items-center gap-2 text-sm py-1.5 border-b border-ink-50 dark:border-ink-800 last:border-0"
              >
                <span
                  class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  :class="item.category === '租金收入'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'"
                >{{ item.category }}</span>
                <span class="flex-1 text-text-primary-light dark:text-text-primary-dark truncate">{{ item.target }}</span>
                <span class="text-xs text-text-secondary-light truncate max-w-[120px]">{{ item.description }}</span>
                <span class="shrink-0 font-bold text-green-600 dark:text-green-400">+{{ item.amount.toLocaleString() }}</span>
              </div>

              <!-- Per-tenant subtotals -->
              <div class="mt-2 pt-2 border-t border-ink-100 dark:border-ink-700 space-y-1">
                <p class="text-[10px] font-bold text-text-secondary-light uppercase tracking-wide mb-1.5">各租客應收</p>
                <div
                  v-for="t in (() => {
                    const m = new Map()
                    for (const it of (log.items || [])) {
                      if (!m.has(it.target)) m.set(it.target, 0)
                      m.set(it.target, m.get(it.target) + it.amount)
                    }
                    return Array.from(m.entries()).map(([target, total]) => ({ target, total }))
                  })()"
                  :key="t.target"
                  class="flex justify-between text-xs"
                >
                  <span class="text-text-secondary-light truncate">{{ t.target }}</span>
                  <span class="font-bold text-text-primary-light dark:text-text-primary-dark shrink-0 ml-2">NT$ {{ t.total.toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </details>

          <div v-if="generateLogs.length === 0" class="px-6 py-12 text-center text-text-secondary-light text-sm">
            本月尚無生成紀錄
          </div>
        </div>
      </div>
    </div>

    <!-- 點擊外部關閉更多選單 overlay -->
    <div v-if="showMoreMenu" class="fixed inset-0 z-40" @click="showMoreMenu = false"></div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { db } from '../../firebase/config'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, getDocs, query, orderBy, where, limit,
  writeBatch, arrayUnion, increment,
  type Unsubscribe,
} from 'firebase/firestore'
import MonthPicker from '../../components/financials/MonthPicker.vue'
import BillTransactionModal from '../../components/financials/BillTransactionModal.vue'
import TaipowerModal from '../../components/financials/TaipowerModal.vue'
import PrintBillsModal from '../../components/financials/PrintBillsModal.vue'
import BillHistoryModal from '../../components/financials/BillHistoryModal.vue'
import ElectricityStatsCard from '../../components/financials/ElectricityStatsCard.vue'
import PropertyCostsModal from '../../components/financials/PropertyCostsModal.vue'
import AnnualSummary from '../../components/financials/AnnualSummary.vue'
import ReceivePaymentModal from '../../components/financials/ReceivePaymentModal.vue'
import { previewBills, commitBills, type BillingPreview, type BillingBatch, type GeneratedBillItem } from '../../services/billingGenerationService'
import { billingBatches } from '../../utils/financials/billingBatches'
import {
  collectedOf, outstandingOf, isPartial, allocatePayment, paymentUpdate, paymentEntry,
} from '../../utils/financials/payments'
import {
  buildTenantGroups, uncollectedIncome, isCollected, OTHER_GROUP,
  type TenantGroup,
} from '../../utils/financials/tenantGroups'
import {
  statusLabels, statusStyles, statusIcons,
  type TransactionHistory, type TransactionForm, type TaipowerForm, type TaipowerBill,
  type ElectricityStats,
} from '../../components/financials/types'
import { getMeterGroups } from '../../services/meterGroupService'
import { getRooms } from '../../services/roomService'
import { getProperties } from '../../services/propertyService'
import type { Property } from '../../types/index'
import { buildSubGroupIndex } from '../../utils/meter/groups'
import { buildElectricityStatsList } from '../../utils/financials/electricity'
import { UNGROUPED_ID, type MeterGroupDoc } from '../../components/meter/types'
import type { Room } from '../../types/index'

interface Transaction {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  target: string
  description: string
  amount: number
  status: 'completed' | 'pending' | 'overdue' | 'waiting_confirmation'
  history?: TransactionHistory[]
  tenantId?: string
  landlordId?: string
  paymentProofUrl?: string
  relatedUsageId?: string
  relatedTenantDocId?: string
  /** 所屬台電總表（棟）；電費／公共電費帳單於生成時寫入，舊資料沒有 */
  groupId?: string
  relatedContractId?: string
  dueDate?: string
  paidAt?: string
  paymentDate?: string
  createdAt?: any
  /** 部分付款的已收金額 */
  paidAmount?: number
  /** 租金單涵蓋的起訖月 */
  coverFrom?: string
  coverTo?: string
}

const authStore = useAuthStore()
const toast = useToastStore()
const transactions = ref<Transaction[]>([])
/** 所有月份的未繳帳單；月度監聽有 limit(200)，舊欠款可能根本不在裡面 */
const openBills = ref<Transaction[]>([])
const taipowerBills = ref<TaipowerBill[]>([])
const tenantsList = ref<{ id: string; name: string; room: string; uid?: string | null; credit?: number }[]>([])
const meterGroups = ref<MeterGroupDoc[]>([])
const roomsList = ref<Room[]>([])
const propertiesList = ref<Property[]>([])
const loading = ref(true)
const sendingLine = ref(false)

const currentMonth = ref(new Date().toISOString().slice(0, 7))
const activeTab = ref<'month' | 'annual'>('month')
const currentTab = ref('all')
const showModal = ref(false)
const showTaipowerModal = ref(false)
const showPrintBillsModal = ref(false)
const showPropertyCostsModal = ref(false)
const showHistoryModal = ref(false)
const showGenerateConfirm = ref(false)
const showMoreMenu = ref(false)
const showDeleteConfirm = ref(false)
const deletingId = ref<string | null>(null)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const activeMenuId = ref<string | null>(null)
const selectedHistory = ref<TransactionHistory[]>([])

interface GenerateLog {
  id: string
  landlordId: string
  month: string
  generatedAt: any
  billCount: number
  items: GeneratedBillItem[]
}

const generatedSummary = ref<GeneratedBillItem[]>([])
const showGeneratedSummary = ref(false)
const generatedWarnings = ref<string[]>([])
const generateLogs = ref<GenerateLog[]>([])
const showLogsModal = ref(false)
let unsubscribeLogs: Unsubscribe | null = null

const initLogsListener = (uid: string, month: string) => {
  unsubscribeLogs?.()
  unsubscribeLogs = onSnapshot(
    query(
      collection(db, 'bill_generate_logs'),
      where('landlordId', '==', uid),
      where('month', '==', month),
      orderBy('generatedAt', 'desc')
    ),
    (snap) => {
      generateLogs.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as GenerateLog))
    },
    (err) => console.error('讀取生成紀錄失敗:', err)
  )
}

// 各租客本次應收：新帳單 − 預收沖抵 + 前期未繳 = 這次實際要跟租客收的錢
const generatedTenantTotals = computed(() => {
  const map = new Map<string, {
    target: string; tenantKey?: string
    categories: { name: string; amount: number }[]; total: number; credit: number
  }>()
  for (const item of generatedSummary.value) {
    const key = item.tenantKey || item.target
    if (!map.has(key)) map.set(key, { target: item.target, tenantKey: item.tenantKey, categories: [], total: 0, credit: 0 })
    const entry = map.get(key)!
    entry.categories.push({ name: item.category, amount: item.amount })
    entry.total += item.amount
    entry.credit += item.creditApplied || 0
  }
  return Array.from(map.values()).map(e => {
    const prior = e.tenantKey
      ? (priorSummary.value.groups.find(g => g.key === e.tenantKey)?.priorOutstanding ?? 0)
      : 0
    return { ...e, prior, due: e.total - e.credit + prior }
  })
})

let unsubscribeBills: Unsubscribe | null = null
let unsubscribeOpenBills: Unsubscribe | null = null
let unsubscribeTaipower: Unsubscribe | null = null
let unsubscribeTenants: Unsubscribe | null = null

const form = ref<TransactionForm>({
  type: 'income', amount: undefined, date: '',
  category: '租金收入', target: '', description: '', status: 'pending',
})
const taipowerForm = ref<TaipowerForm>({ month: currentMonth.value, amount: undefined, usage: undefined, groupId: '' })

// --- Firestore ---
const initDataListeners = (uid: string) => {
  if (unsubscribeBills) unsubscribeBills()
  if (unsubscribeTaipower) unsubscribeTaipower()
  unsubscribeOpenBills?.()
  unsubscribeTenants?.()
  loading.value = true

  // 出帳與收款由交易更新餘額，畫面訂閱實際數值，避免保留舊預收款。
  unsubscribeTenants = onSnapshot(query(collection(db, 'tenants'), where('landlordId', '==', uid)), snap => {
    tenantsList.value = snap.docs.map(d => {
      const data = d.data()
      return { id: d.id, name: data.name || '', room: data.room || '', uid: data.uid || null, credit: Number(data.credit) || 0 }
    })
  }, err => { console.error('讀取租客餘額失敗:', err) })

  // 一次性讀取總表與房間：電費盈虧須逐台電總表（棟）各自結算，
  // 且舊帳單沒有 groupId，需靠 房號 → subGroupId → 總表 回溯歸屬
  getMeterGroups(uid)
    .then(gs => { meterGroups.value = gs })
    .catch(e => console.error('讀取電表群組失敗:', e))
  getRooms(uid)
    .then(rs => { roomsList.value = rs })
    .catch(e => console.error('讀取房間失敗:', e))
  getProperties(uid)
    .then(ps => { propertiesList.value = ps })
    .catch(e => console.error('讀取建物失敗:', e))

  unsubscribeBills = onSnapshot(
    query(collection(db, 'bills'), where('landlordId', '==', uid), orderBy('date', 'desc'), limit(200)),
    (snap) => {
      const today = new Date().toISOString().split('T')[0]
      const overdueUpdates: Promise<any>[] = []
      transactions.value = snap.docs.map(d => {
        const data = d.data()
        // 自動標記逾期：待收且已超過截止日
        if (data.status === 'pending' && data.dueDate && data.dueDate < today!) {
          overdueUpdates.push(updateDoc(doc(db, 'bills', d.id), { status: 'overdue', updatedAt: serverTimestamp() }))
          return { id: d.id, ...data, status: 'overdue' } as Transaction
        }
        return { id: d.id, ...data } as Transaction
      })
      if (overdueUpdates.length) Promise.all(overdueUpdates).catch(console.error)
      loading.value = false
    },
    (err: any) => { console.error('讀取帳務失敗:', err); loading.value = false }
  )

  // 前期欠款：不分月份撈所有未繳，切到哪個月都看得到
  unsubscribeOpenBills = onSnapshot(
    query(collection(db, 'bills'),
      where('landlordId', '==', uid),
      where('status', 'in', ['pending', 'overdue', 'waiting_confirmation'])),
    (snap) => { openBills.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)) },
    (err: any) => console.error('讀取未繳帳單失敗:', err)
  )

  unsubscribeTaipower = onSnapshot(
    query(collection(db, 'taipower_bills'), where('landlordId', '==', uid), orderBy('month', 'desc')),
    (snap) => { taipowerBills.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaipowerBill)) },
    (err: any) => console.error('讀取台電帳單失敗:', err)
  )
}

onMounted(() => {
  if (authStore.user) {
    initDataListeners(authStore.effectiveUid)
    initLogsListener(authStore.effectiveUid, currentMonth.value)
  }
})
watch(() => authStore.effectiveUid, (uid) => {
  if (uid) {
    initDataListeners(uid)
    initLogsListener(uid, currentMonth.value)
  } else {
    unsubscribeBills?.(); unsubscribeTaipower?.(); unsubscribeLogs?.(); unsubscribeOpenBills?.()
    unsubscribeTenants?.(); tenantsList.value = []
    transactions.value = []; openBills.value = []; generateLogs.value = []; loading.value = false
  }
})
watch(currentMonth, (month) => {
  if (authStore.user) initLogsListener(authStore.effectiveUid, month)
  showGeneratedSummary.value = false
  generatedWarnings.value = []
})
onUnmounted(() => { unsubscribeBills?.(); unsubscribeTaipower?.(); unsubscribeLogs?.(); unsubscribeOpenBills?.(); unsubscribeTenants?.() })

// --- Computed ---
const monthlyTransactions = computed(() =>
  transactions.value.filter(t => t.date?.startsWith(currentMonth.value))
)

/** 檢視月份以前還沒繳清的帳單 */
const priorOpenBills = computed(() => {
  const start = `${currentMonth.value}-01`
  return openBills.value.filter(b => b.type === 'income' && (b.date || '') < start && outstandingOf(b) > 0)
})

/** 前期欠款依租客彙總，供頁首提示與生成帳單確認 */
const priorSummary = computed(() => {
  const groups = buildTenantGroups([], priorOpenBills.value).filter(g => g.key !== OTHER_GROUP)
  return { groups, total: groups.reduce((s, g) => s + g.priorOutstanding, 0) }
})

const creditOf = (tenantDocId: string) => tenantsList.value.find(t => t.id === tenantDocId)?.credit || 0

const stats = computed(() => {
  let income = 0, incomeCount = 0, pending = 0, pendingCount = 0, expense = 0, expenseCount = 0
  monthlyTransactions.value.forEach(t => {
    if (t.type === 'income') {
      // 部分付款：已收的部分算已收，剩下的算待收
      const got = collectedOf(t), owe = outstandingOf(t)
      if (got > 0) { income += got; incomeCount++ }
      if (owe > 0) { pending += owe; pendingCount++ }
    } else {
      expense += t.amount; expenseCount++
    }
  })
  return { income, incomeCount, pending, pendingCount, expense, expenseCount, net: income - expense }
})

const categoryStats = computed(() => {
  const mt = monthlyTransactions.value
  const sum = (cat: string, typeFilter?: 'income' | 'expense') =>
    mt.filter(t => t.category === cat && (!typeFilter || t.type === typeFilter))

  const rent = sum('租金收入')
  const deposit = sum('入住款項')
  const elec = sum('電費')
  const publicElec = sum('公共電費')
  const taipower = sum('台電帳單')

  return [
    {
      key: '租金收入', label: '租金收入', icon: 'home',
      count: rent.length, amount: rent.reduce((s, t) => s + t.amount, 0),
      iconColor: 'text-blue-500', amountColor: 'text-blue-700 dark:text-blue-300',
      badgeClass: 'bg-blue-100 text-blue-700', activeBg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200',
    },
    {
      key: '入住款項', label: '入住款項', icon: 'key',
      count: deposit.length, amount: deposit.reduce((s, t) => s + t.amount, 0),
      iconColor: 'text-purple-500', amountColor: 'text-purple-700 dark:text-purple-300',
      badgeClass: 'bg-purple-100 text-purple-700', activeBg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200',
    },
    {
      key: '電費', label: '電費（分攤）', icon: 'bolt',
      count: elec.length, amount: elec.reduce((s, t) => s + t.amount, 0),
      iconColor: 'text-yellow-500', amountColor: 'text-yellow-700 dark:text-yellow-300',
      badgeClass: 'bg-yellow-100 text-yellow-700', activeBg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200',
    },
    {
      key: '公共電費', label: '公共電費（分攤）', icon: 'electrical_services',
      count: publicElec.length, amount: publicElec.reduce((s, t) => s + t.amount, 0),
      iconColor: 'text-indigo-500', amountColor: 'text-indigo-700 dark:text-indigo-300',
      badgeClass: 'bg-indigo-100 text-indigo-700', activeBg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200',
    },
    {
      key: '台電帳單', label: '台電帳單（支出）', icon: 'electric_bolt',
      count: taipower.length, amount: taipower.reduce((s, t) => s + t.amount, 0),
      iconColor: 'text-red-400', amountColor: 'text-red-600 dark:text-red-400',
      badgeClass: 'bg-red-100 text-red-600', activeBg: 'bg-red-50 dark:bg-red-900/20 border-red-200',
    },
  ]
})

const pendingCount = computed(() => monthlyTransactions.value.filter(t => !isCollected(t) && t.type === 'income').length)

// --- 電費盈虧分析（規則實作於 src/utils/financials/electricity.ts）---
const subGroupIndex = computed(() => buildSubGroupIndex(meterGroups.value))
const tenantRoomIndex = computed(() =>
  new Map(tenantsList.value.map(t => [t.id, t.room]))
)
const roomSubGroupIndex = computed(() =>
  new Map(roomsList.value.map(r => [r.name, r.subGroupId ?? '']))
)

/** 台電帳單登錄用的總表選項；為空時 Modal 隱藏選擇器，視同單棟 */
const taipowerGroupOptions = computed(() =>
  meterGroups.value.map(g => ({ id: g.id, name: g.name }))
)

const electricityStatsList = computed<ElectricityStats[]>(() =>
  buildElectricityStatsList({
    viewMonth: currentMonth.value,
    groups: taipowerGroupOptions.value,
    taipowerBills: taipowerBills.value,
    bills: transactions.value,
    tenantRoom: tenantRoomIndex.value,
    roomSubGroup: roomSubGroupIndex.value,
    subGroupToGroup: subGroupIndex.value,
  })
)

/** 這群帳單裡有幾筆租客已上傳截圖、等著你確認 */
const waitingCount = (items: { status?: string }[]) =>
  items.filter(i => i.status === 'waiting_confirmation').length

const waitingTotal = computed(() => waitingCount(monthlyTransactions.value))

const tabs = computed(() => [
  { label: '全部', value: 'all', count: 0 },
  { label: '租金收入', value: '租金收入', count: 0 },
  { label: '入住款項', value: '入住款項', count: 0 },
  { label: '電費', value: '電費', count: 0 },
  { label: '公共電費', value: '公共電費', count: 0 },
  { label: '支出', value: 'expense', count: 0 },
  { label: '待收', value: 'pending', count: pendingCount.value },
  { label: '待確認', value: 'waiting', count: waitingTotal.value },
])

const matchesTab = (t: Transaction) => {
  if (currentTab.value === 'all') return true
  if (currentTab.value === 'expense') return t.type === 'expense'
  if (currentTab.value === 'pending') return !isCollected(t) && t.type === 'income'
  if (currentTab.value === 'waiting') return t.status === 'waiting_confirmation'
  return t.category === currentTab.value
}

const filteredTransactions = computed(() => monthlyTransactions.value.filter(matchesTab))

// --- 依租客分組檢視（實作於 src/utils/financials/tenantGroups.ts） ---
// 預設依租客：收款是最常見的操作，逐筆清單留給稽核時手動切換
const groupByTenant = ref(true)
const expandedGroups = ref<Set<string>>(new Set())

const toggleGroup = (key: string) => {
  const next = new Set(expandedGroups.value)
  if (next.has(key)) next.delete(key); else next.add(key)
  expandedGroups.value = next
}

// 前期未繳一併掛在各租客底下，本月已繳清但上個月還欠的人才不會被漏掉
const tenantGroups = computed(() =>
  buildTenantGroups(filteredTransactions.value, priorOpenBills.value.filter(matchesTab)))

/** 頁首「查看並收款」：切到依租客並展開所有有前期欠款的人 */
const showPriorArrears = () => {
  groupByTenant.value = true
  currentTab.value = 'all'
  expandedGroups.value = new Set(priorSummary.value.groups.map(g => g.key))
}

// --- 收款（實作於 src/utils/financials/payments.ts） ---
interface ReceiveTarget {
  label: string
  tenantDocId: string
  bills: Transaction[]
  defaultAmount?: number
  defaultDate?: string
}
const receiveTarget = ref<ReceiveTarget | null>(null)
const receiving = ref(false)

const closeReceive = (open: boolean) => { if (!open) receiveTarget.value = null }

/** 單筆收款（含確認租客截圖）：只沖這一張，多收的轉預收 */
const markPaid = (item: Transaction) => {
  receiveTarget.value = {
    label: `${item.target}｜${item.category}`,
    tenantDocId: item.relatedTenantDocId || '',
    bills: [item],
    defaultAmount: outstandingOf(item),
    defaultDate: item.paymentDate,
  }
}

/** 依租客收款：前期欠款與本月帳單一起，由最舊的開始扣 */
const markGroupPaid = (group: TenantGroup<Transaction>) => {
  receiveTarget.value = {
    label: group.label,
    tenantDocId: [...group.items, ...group.prior].find(b => b.relatedTenantDocId)?.relatedTenantDocId || '',
    bills: uncollectedIncome(group),
    defaultAmount: group.owed,
  }
}

/**
 * 把一筆收款沖到帳單上，溢繳轉入租客的預收餘額。
 * 帳單與餘額同一批寫入，不會出現「帳單標了已收、餘額卻沒加」的半套狀態。
 */
const applyReceipt = async (opts: {
  bills: Transaction[]; tenantDocId: string; amount: number; date: string; note?: string; preferCategory?: string
}) => {
  const { allocations, leftover } = allocatePayment(opts.bills, opts.amount, { preferCategory: opts.preferCategory })
  if (leftover > 0 && !opts.tenantDocId) throw new Error('溢繳金額沒有租客可以存入')
  const today = new Date().toISOString().split('T')[0]!
  const batch = writeBatch(db)
  for (const a of allocations) {
    const b = opts.bills.find(x => x.id === a.billId)!
    batch.update(doc(db, 'bills', b.id), {
      ...paymentUpdate(b, a.apply, opts.date, today),
      payments: arrayUnion(paymentEntry(a.apply, opts.date, 'manual', opts.note)),
      updatedAt: serverTimestamp(),
    })
  }
  if (leftover > 0) {
    batch.update(doc(db, 'tenants', opts.tenantDocId), {
      credit: increment(leftover),
      creditLog: arrayUnion(paymentEntry(leftover, opts.date, 'manual', opts.note || '溢繳轉預收')),
    })
  }
  await batch.commit()
  return leftover
}

const receiptToast = (label: string, amount: number, leftover: number) =>
  toast.success(`已收「${label}」NT$ ${amount.toLocaleString()}`
    + (leftover > 0 ? `，其中 NT$ ${leftover.toLocaleString()} 存為預收餘額` : ''))

const confirmReceive = async (p: { amount: number; date: string; note: string }) => {
  const t = receiveTarget.value
  if (!t) return
  receiving.value = true
  try {
    const leftover = await applyReceipt({ ...t, ...p })
    receiptToast(t.label, p.amount, leftover)
    receiveTarget.value = null
  } catch (e) {
    console.error('收款失敗:', e)
    toast.error('收款失敗，請稍後再試')
  } finally {
    receiving.value = false
  }
}

/** 「記一筆」選了租客並標為收款：沖銷該租客的未繳，而不是另開一張新帳單 */
const onManualReceive = async (p: {
  tenantDocId: string; label: string; amount: number; date: string; category: string; note: string
}) => {
  const uid = tenantsList.value.find(t => t.id === p.tenantDocId)?.uid
  const bills = openBills.value.filter(b =>
    b.type === 'income' && (b.relatedTenantDocId === p.tenantDocId || (!!uid && b.tenantId === uid)))
  try {
    const leftover = await applyReceipt({
      bills, tenantDocId: p.tenantDocId, amount: p.amount, date: p.date, note: p.note, preferCategory: p.category,
    })
    showModal.value = false
    receiptToast(p.label, p.amount, leftover)
  } catch (e) {
    console.error('收款失敗:', e)
    toast.error('收款失敗，請稍後再試')
  }
}

// --- Category badge style ---
const categoryBadge = (cat: string) => {
  const map: Record<string, string> = {
    '租金收入': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    '入住款項': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    '電費': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    '公共電費': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    '台電帳單': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
    '房屋稅': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    '地價稅': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    '火災險': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  }
  return map[cat] || 'bg-surface-light dark:bg-surface-dark text-ink-500 dark:text-ink-300'
}

// --- Mark as Paid (quick action) ---
// 遲繳天數：實際收款日（paidAt 優先，相容舊資料 paymentDate）晚於截止日的天數
const billLateDays = (item: Transaction): number => {
  const paid = item.paidAt || item.paymentDate
  if (!paid || !item.dueDate) return 0
  const diff = Math.floor((new Date(paid).getTime() - new Date(item.dueDate).getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

// --- Generate Monthly Bills: server preview + atomic commits ---
const preparingBills = ref(false)
const generatingBills = ref(false)
const billingPreview = ref<BillingPreview | null>(null)
const previewOwner = ref('')
const pendingBillingBatches = ref<BillingBatch[]>([])
const completedBillingBatches = ref(0)
const billingError = ref('')
const previewItems = computed(() => billingPreview.value?.plans.flatMap(p => p.items) ?? [])
const previewAmount = computed(() => previewItems.value.reduce((sum, i) => sum + i.amount, 0))
const previewCredit = computed(() => billingPreview.value?.plans.reduce((sum, p) => sum + p.creditUsed, 0) ?? 0)

const closeBillingPreview = () => {
  if (!generatingBills.value && !preparingBills.value) showGenerateConfirm.value = false
}
const prepareGenerateBills = async () => {
  if (preparingBills.value || generatingBills.value || !authStore.user) return
  preparingBills.value = true
  billingError.value = ''
  billingPreview.value = null
  pendingBillingBatches.value = []
  completedBillingBatches.value = 0
  showGenerateConfirm.value = true
  const uid = authStore.effectiveUid
  const month = currentMonth.value
  previewOwner.value = uid
  try {
    const preview = await previewBills(uid, month)
    if (uid !== authStore.effectiveUid || month !== currentMonth.value) {
      billingError.value = '房東或月份已變更，請重新預覽'
      return
    }
    billingPreview.value = preview
    pendingBillingBatches.value = billingBatches(preview.plans)
  } catch (e) {
    billingError.value = e instanceof Error ? e.message : '無法取得出帳預覽，請稍後重試'
  } finally {
    preparingBills.value = false
  }
}

const confirmGenerateBills = async () => {
  if (generatingBills.value || !billingPreview.value || !pendingBillingBatches.value.length) return
  const preview = billingPreview.value
  if (previewOwner.value !== authStore.effectiveUid || preview.month !== currentMonth.value) {
    billingError.value = '房東或月份已變更，請重新預覽'
    pendingBillingBatches.value = []
    return
  }
  generatingBills.value = true
  billingError.value = ''
  if (completedBillingBatches.value === 0) generatedSummary.value = []
  generatedWarnings.value = [...preview.warnings, ...preview.skipped]
  try {
    while (pendingBillingBatches.value.length) {
      const batch = pendingBillingBatches.value[0]!
      // Keep this operationId on an uncertain network response; the server replays its receipt.
      const result = await commitBills(previewOwner.value, preview.month, batch)
      generatedSummary.value.push(...result.items)
      pendingBillingBatches.value.shift()
      completedBillingBatches.value++
      showGeneratedSummary.value = generatedSummary.value.length > 0
    }
    showGenerateConfirm.value = false
    toast.success('成功產生 ' + generatedSummary.value.length + ' 筆帳單')
  } catch (e) {
    const code = (e as { code?: string }).code
    billingError.value = (e instanceof Error ? e.message : '出帳連線中斷，請重試未完成批次')
      + '。已確認完成 ' + generatedSummary.value.length + ' 筆；不確定是否完成的批次可安全重試。'
    if (code === 'functions/failed-precondition' || code === 'functions/permission-denied'
      || code === 'functions/invalid-argument' || code === 'functions/resource-exhausted') {
      pendingBillingBatches.value = []
    }
  } finally {
    generatingBills.value = false
  }
}

// --- LINE 通知租客 ---
const sendLineNotifications = async () => {
  if (!authStore.user) return
  // 找本月待收帳單中有 lineUserId 的租客
  const uid = authStore.effectiveUid
  const pendingBills = transactions.value.filter(t =>
    t.date?.startsWith(currentMonth.value) && t.status === 'pending' && t.type === 'income'
  )
  if (pendingBills.length === 0) {
    toast.info('本月沒有待收帳單')
    return
  }
  // 取得有 LINE 的租客 lineUserId
  const tenantsSnap = await getDocs(query(collection(db, 'users'), where('boundLandlordCode', '==', authStore.userProfile?.landlordCode || '')))
  const lineUsers = tenantsSnap.docs
    .map(d => d.data())
    .filter((u: any) => u.lineUserId)
  if (lineUsers.length === 0) {
    toast.warning('目前沒有租客綁定 LINE，請請租客先在系統中取得綁定碼')
    return
  }
  sendingLine.value = true
  try {
    const fn = httpsCallable(getFunctions(undefined, 'asia-east1'), 'sendLineBillNotifications')
    const result: any = await fn({ month: currentMonth.value, landlordId: uid })
    toast.success(`已發送 LINE 通知給 ${result.data?.sent ?? 0} 位租客`)
  } catch (e: any) {
    toast.error(e.message || 'LINE 通知發送失敗')
  } finally {
    sendingLine.value = false
  }
}

// --- CRUD ---
const saveTransaction = async () => {
  if (!authStore.user) return
  if (!form.value.amount && form.value.amount !== 0) { toast.warning('請填寫金額'); return }
  if (!form.value.target || !form.value.date) { toast.warning('請填寫完整資訊'); return }
  try {
    const payload = { ...form.value, landlordId: authStore.effectiveUid, updatedAt: serverTimestamp() }
    // 手動新增的電費也要知道屬於哪一棟，否則電費盈虧會把它歸到「未分組電表」
    if ((payload.category === '電費' || payload.category === '公共電費') && payload.relatedTenantDocId && !payload.groupId) {
      const room = tenantRoomIndex.value.get(payload.relatedTenantDocId)
      const subGroupId = room ? roomSubGroupIndex.value.get(room) : undefined
      const groupId = subGroupId ? subGroupIndex.value.get(subGroupId) : undefined
      if (groupId) payload.groupId = groupId
    }
    if (isEditing.value && editingId.value) {
      const old = transactions.value.find(t => t.id === editingId.value)
      const rec: any = { modifiedAt: new Date().toISOString(), data: { ...old } }
      delete rec.data.history; delete rec.data.id
      await updateDoc(doc(db, 'bills', editingId.value), { ...payload, history: [rec, ...(old?.history || [])] })
    } else {
      await addDoc(collection(db, 'bills'), { ...payload, history: [], createdAt: serverTimestamp() })
    }
    showModal.value = false
    toast.success(isEditing.value ? '紀錄已更新' : '紀錄已新增')
  } catch { toast.error('儲存失敗，請稍後再試') }
}

const handleDelete = (id: string) => {
  closeDropdown()
  deletingId.value = id
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!deletingId.value) return
  showDeleteConfirm.value = false
  try { await deleteDoc(doc(db, 'bills', deletingId.value)); toast.success('紀錄已刪除') }
  catch { toast.error('刪除失敗') }
  finally { deletingId.value = null }
}

const saveTaipowerBill = async () => {
  if (!authStore.user) return
  if (!taipowerForm.value.amount) { toast.warning('請輸入金額'); return }
  try {
    const groupId = taipowerForm.value.groupId || meterGroups.value[0]?.id || ''
    const groupName = meterGroups.value.find(g => g.id === groupId)?.name
    const suffix = meterGroups.value.length > 1 && groupName ? `（${groupName}）` : ''
    await addDoc(collection(db, 'taipower_bills'), { ...taipowerForm.value, groupId, landlordId: authStore.effectiveUid, createdAt: serverTimestamp() })
    await addDoc(collection(db, 'bills'), {
      date: `${taipowerForm.value.month}-15`, type: 'expense', category: '台電帳單',
      target: '台灣電力公司', description: `${taipowerForm.value.month} 電費帳單${suffix}`,
      groupId,
      amount: taipowerForm.value.amount, landlordId: authStore.effectiveUid,
      status: 'completed', history: [], createdAt: serverTimestamp(),
    })
    showTaipowerModal.value = false
    toast.success('台電帳單已登錄')
  } catch { toast.error('登錄失敗，請稍後再試') }
}

// --- UI helpers ---
const toggleMenu = (id: string) => { activeMenuId.value = activeMenuId.value === id ? null : id }
const closeDropdown = () => { activeMenuId.value = null; showMoreMenu.value = false }

const openModal = () => {
  isEditing.value = false; editingId.value = null
  form.value = { type: 'income', amount: undefined, date: `${currentMonth.value}-01`, category: '租金收入', target: '', description: '', status: 'pending' }
  showModal.value = true
}
const handleEdit = (item: Transaction) => {
  closeDropdown(); isEditing.value = true; editingId.value = item.id
  form.value = { ...item } as TransactionForm; showModal.value = true
}
const openHistory = (item: Transaction) => { closeDropdown(); selectedHistory.value = item.history || []; showHistoryModal.value = true }
const openTaipowerModal = (groupId?: string) => {
  taipowerForm.value.month = currentMonth.value
  taipowerForm.value.groupId =
    (groupId && groupId !== UNGROUPED_ID ? groupId : '') || meterGroups.value[0]?.id || ''
  showTaipowerModal.value = true
}
</script>

<style scoped>
.animation-fade-in { animation: fadeIn 0.15s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
