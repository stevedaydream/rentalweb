<template>
  <div class="max-w-7xl mx-auto space-y-6" @click="closeDropdown">

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">租客列表</h1>
        <p class="text-text-secondary-light">管理所有租客資料、租約期限與聯繫方式</p>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center">
          <span class="material-symbols-outlined text-[18px] mr-2">download</span>匯出清單
        </button>
        <button
          @click="openNewTenantModal()"
          class="px-4 py-2 bg-gold-500 text-white rounded-lg shadow-sm hover:bg-gold-600 transition-colors text-sm font-medium flex items-center"
        >
          <span class="material-symbols-outlined text-[18px] mr-2">person_add</span>手動新增租客
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">在租人數</p>
          <p class="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mt-1">{{ stats.total }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
          <span class="material-symbols-outlined">group</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">即將到期 (60天內)</p>
          <p class="text-2xl font-bold text-orange-600 mt-1">{{ stats.expiring }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
          <span class="material-symbols-outlined">alarm</span>
        </div>
      </div>
      <div class="p-4 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-text-secondary-light">逾期欠費</p>
          <p class="text-2xl font-bold text-red-600 mt-1">{{ stats.overdue }} 人</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600">
          <span class="material-symbols-outlined">gpp_bad</span>
        </div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
        <button
          v-for="filter in filters"
          :key="filter.value"
          @click="currentFilter = filter.value"
          class="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          :class="currentFilter === filter.value ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'"
        >{{ filter.label }}</button>
      </div>
      <div class="relative w-full md:w-64">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
        <input
          v-model="rawSearch"
          type="text"
          placeholder="搜尋姓名、房號或電話..."
          class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-visible">
      <div class="overflow-x-auto min-h-[400px]">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-text-secondary-light uppercase bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th class="px-6 py-4 font-semibold">租客資訊</th>
              <th class="px-6 py-4 font-semibold">承租房源</th>
              <th class="px-6 py-4 font-semibold">租賃期間</th>
              <th class="px-6 py-4 font-semibold">繳費狀態</th>
              <th class="px-6 py-4 font-semibold">入住款項</th>
              <th class="px-6 py-4 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="tenant in pagedTenants"
              :key="tenant.id"
              class="hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
              :class="{ 'opacity-55': tenant.isHistorical }"
              @click="openDrawer(tenant)"
            >
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div
                    class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold mr-3"
                    :class="tenant.isOnlineUser ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200'"
                  >{{ tenant.name[0] }}</div>
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ tenant.name }}</p>
                      <span v-if="tenant.isHistorical" class="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">已退租</span>
                      <span v-else-if="tenant.isOnlineUser" class="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">已綁定帳號</span>
                    </div>
                    <p class="text-xs text-text-secondary-light mt-0.5">{{ tenant.phone }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <span class="material-symbols-outlined text-gray-400 mr-2 text-[18px]">meeting_room</span>
                  <span :class="{'text-gray-400 italic': !tenant.moveOutSummary?.room && (!tenant.room || tenant.room === '尚未設定')}">
                    {{ tenant.isHistorical ? (tenant.moveOutSummary?.room || '—') : (tenant.room || '尚未設定') }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4">
                <template v-if="tenant.isHistorical">
                  <div class="text-xs text-gray-400 space-y-1">
                    <p>{{ tenant.moveOutSummary?.leaseStart || '—' }} ~ {{ tenant.moveOutSummary?.leaseEnd || '—' }}</p>
                    <p class="text-gray-500">退租：{{ tenant.moveOutSummary?.moveOutDate || '—' }}</p>
                  </div>
                </template>
                <template v-else>
                  <div v-if="tenant.leaseStart && tenant.leaseEnd" class="text-xs space-y-1">
                    <p><span class="text-text-secondary-light w-6 inline-block">起:</span> {{ tenant.leaseStart }}</p>
                    <p><span class="text-text-secondary-light w-6 inline-block">迄:</span> {{ tenant.leaseEnd }}</p>
                  </div>
                  <div v-else class="text-xs text-gray-400 italic">租約未設定</div>
                  <span v-if="isExpiringSoon(tenant.leaseEnd)" class="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">即將到期</span>
                </template>
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="paymentStatusStyles[tenant.paymentStatus]"
                >
                  <span class="w-1.5 h-1.5 rounded-full mr-2" :class="paymentDotStyles[tenant.paymentStatus]"></span>
                  {{ paymentStatusLabels[tenant.paymentStatus] }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span
                  v-if="tenant.contractId"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                  :class="getDepositBadgeClass(tenant)"
                >
                  <span class="material-symbols-outlined text-[14px]">payments</span>
                  {{ getDepositLabel(tenant) }}
                </span>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
              <!-- 操作：阻止 row click，只保留 ⋮ 更多選單 -->
              <td class="px-6 py-4" @click.stop>
                <div class="relative flex items-center">
                  <button
                    @click.stop="toggleMenu(tenant.id)"
                    class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <span class="material-symbols-outlined text-[22px]">more_vert</span>
                  </button>
                  <div
                    v-if="activeMenuId === tenant.id"
                    class="absolute right-0 top-10 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1 w-40 overflow-hidden"
                  >
                    <button
                      @click.stop="openDrawerTab(tenant, 'info'); closeDropdown()"
                      class="w-full text-left px-4 py-2.5 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <span class="material-symbols-outlined text-[16px]">edit</span>編輯資料
                    </button>
                    <button
                      @click.stop="openDrawerTab(tenant, 'bills'); closeDropdown()"
                      class="w-full text-left px-4 py-2.5 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <span class="material-symbols-outlined text-[16px]">receipt_long</span>帳單紀錄
                    </button>
                    <button
                      v-if="tenant.contractId"
                      @click.stop="openDrawerTab(tenant, 'deposits'); closeDropdown()"
                      class="w-full text-left px-4 py-2.5 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <span class="material-symbols-outlined text-[16px]">payments</span>入住押金
                    </button>
                    <button
                      @click.stop="sendBillReminder(tenant); closeDropdown()"
                      :disabled="sendingReminderId === tenant.id"
                      class="w-full text-left px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      <span class="material-symbols-outlined text-[16px]">send</span>
                      {{ sendingReminderId === tenant.id ? '發送中...' : '傳送帳單提醒' }}
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="loading" class="p-12 text-center text-text-secondary-light"><p>載入中...</p></div>
      <div v-else-if="filteredTenants.length === 0" class="p-12 text-center text-text-secondary-light">
        <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">person_off</span>
        <p>找不到符合條件的租客</p>
      </div>

      <div v-if="totalTenantPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <span class="text-xs text-gray-500">第 {{ tenantPage }} / {{ totalTenantPages }} 頁，共 {{ filteredTenants.length }} 筆</span>
        <div class="flex gap-1">
          <button @click="tenantPage--" :disabled="tenantPage === 1"
            class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">上一頁</button>
          <button v-for="p in totalTenantPages" :key="p" @click="tenantPage = p"
            class="px-2.5 py-1 text-xs rounded-lg border transition-colors"
            :class="p === tenantPage ? 'bg-gold-500 text-white border-gold-500' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'">{{ p }}</button>
          <button @click="tenantPage++" :disabled="tenantPage === totalTenantPages"
            class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">下一頁</button>
        </div>
      </div>
    </div>

    <!-- ===== 建立帳號成功 — 憑證提示 Modal ===== -->
    <div v-if="showCredentialModal" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-green-600">check_circle</span>
          </div>
          <div>
            <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">租客帳號已建立</h3>
            <p class="text-xs text-text-secondary-light">請將以下資訊告知租客</p>
          </div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3 font-mono text-sm">
          <div class="flex justify-between items-center">
            <span class="text-text-secondary-light text-xs">手機號碼（帳號）</span>
            <span class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ createdCredential?.phone }}</span>
          </div>
          <div class="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-3">
            <span class="text-text-secondary-light text-xs">身分證號（密碼）</span>
            <span class="font-bold text-text-primary-light dark:text-text-primary-dark">{{ createdCredential?.idNumber }}</span>
          </div>
        </div>
        <p class="text-xs text-text-secondary-light text-center">租客在登入頁選擇「租客身分證登入」即可使用上述帳密</p>
        <button
          @click="showCredentialModal = false; createdCredential = null"
          class="w-full py-2.5 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 transition-colors"
        >知道了</button>
      </div>
    </div>

    <!-- ===== 新增租客 Modal (只用於手動新增) ===== -->
    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
      <div class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">新增租客</h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="p-6 overflow-y-auto space-y-4">
          <div v-if="!authStore.user" class="p-3 bg-red-100 text-red-700 text-sm rounded-lg mb-4">系統錯誤：無法識別房東身分，請重新登入。</div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">姓名</label>
              <input v-model="form.name" type="text" class="form-input" placeholder="租客姓名">
            </div>
            <div>
              <label class="block text-sm font-medium text-text-secondary-light mb-1">承租房源</label>
              <select v-model="form.room" @change="onRoomSelect" class="form-input">
                <option value="" disabled>請選擇房源</option>
                <option v-for="room in vacantRooms" :key="room.id" :value="room.name">{{ room.name }} ({{ room.price }}元)</option>
                <option v-if="form.room && !isRoomInList(form.room)" :value="form.room">{{ form.room }} (未知房源)</option>
              </select>
              <p v-if="vacantRooms.length === 0" class="text-xs text-orange-500 mt-1">目前沒有閒置房源</p>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">聯絡電話</label>
            <input v-model="form.phone" type="tel" class="form-input" placeholder="0912-345-678">
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">電子郵件 (選填)</label>
            <input v-model="form.email" type="email" class="form-input" placeholder="tenant@example.com">
          </div>
          <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p class="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">key</span>
              租客登入帳號（選填）
            </p>
            <label class="block text-sm font-medium text-text-secondary-light mb-1">身分證號碼</label>
            <input v-model="form.idNumber" type="text" class="form-input font-mono uppercase" placeholder="A123456789"
              @input="form.idNumber = (form.idNumber || '').toUpperCase()">
            <p class="text-xs text-blue-600 dark:text-blue-400 mt-2">填寫後系統將自動建立帳號，租客可用「手機號碼 + 身分證號」登入</p>
          </div>
          <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
            <p class="text-xs font-bold text-text-secondary-light uppercase mb-3">租約設定</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">起租日</label>
                <input v-model="form.leaseStart" type="date" class="form-input">
              </div>
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">租期（年）</label>
                <select v-model.number="form.leaseDuration" class="form-input">
                  <option :value="0.5">0.5 年（6 個月）</option>
                  <option :value="1">1 年</option>
                  <option :value="1.5">1.5 年</option>
                  <option :value="2">2 年</option>
                  <option :value="3">3 年</option>
                </select>
              </div>
            </div>
            <div class="mt-3 flex items-center gap-2 text-sm text-text-secondary-light bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
              <span class="material-symbols-outlined text-[16px]">event</span>
              到期日：<span class="font-semibold text-text-primary-light dark:text-text-primary-dark">{{ form.leaseEnd || '—' }}</span>
              <span class="ml-auto text-xs">(住滿 {{ Math.round((form.leaseDuration || 1) * 365) }} 天)</span>
            </div>
            <div class="mt-3 flex items-center gap-2 text-sm text-text-secondary-light bg-blue-50 dark:bg-blue-900/10 rounded-lg px-3 py-2 border border-blue-100 dark:border-blue-900/30">
              <span class="material-symbols-outlined text-[16px] text-blue-400">event_available</span>
              繳費截止日：每月 <span class="font-semibold text-blue-700 dark:text-blue-300">{{ authStore.userProfile?.settings?.paymentDay ?? 5 }}</span> 號（依房東設定）
            </div>
            <div class="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">每月租金 (NT$)</label>
                <input v-model.number="form.rent" type="number" class="form-input" placeholder="自動帶入房源價格">
              </div>
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">押金月數</label>
                <select v-model.number="form.depositMonths" class="form-input">
                  <option :value="1">1 個月</option>
                  <option :value="2">2 個月（慣例）</option>
                  <option :value="3">3 個月</option>
                </select>
              </div>
            </div>
            <div v-if="form.rent && form.rent > 0" class="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700 text-sm">
              <p class="font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">payments</span>入住應收款項
              </p>
              <div class="space-y-1 text-amber-700 dark:text-amber-400">
                <div class="flex justify-between" v-for="n in (form.depositMonths || 2)" :key="n">
                  <span>押金（第 {{ n }} 個月）</span>
                  <span class="font-medium">NT$ {{ (form.rent || 0).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between border-t border-amber-200 dark:border-amber-700 pt-1 mt-1">
                  <span>首月租金</span>
                  <span class="font-medium">NT$ {{ (form.rent || 0).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between font-bold text-amber-900 dark:text-amber-200 pt-1">
                  <span>合計應收</span>
                  <span>NT$ {{ (((form.depositMonths || 2) + 1) * (form.rent || 0)).toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
            <p class="text-xs font-bold text-text-secondary-light uppercase mb-3">其他資訊</p>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">緊急聯絡人</label>
                <input v-model="form.emergencyContact" type="text" class="form-input" placeholder="姓名 - 關係 - 電話">
              </div>
              <div>
                <label class="block text-sm font-medium text-text-secondary-light mb-1">備註</label>
                <textarea v-model="form.note" class="form-input min-h-[80px]" placeholder="例如：養一隻貓、習慣晚歸..."></textarea>
              </div>
            </div>
          </div>
        </div>
        <div class="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button @click="showModal = false" class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors">取消</button>
          <button @click="saveTenant" :disabled="isSaving" class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold shadow-lg shadow-gold-500/30 hover:bg-gold-600 transition-colors disabled:opacity-50">
            {{ isSaving ? '處理中...' : '新增租客' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 租客詳情 Drawer ===== -->
    <Transition name="drawer-slide">
      <div v-if="showDrawer" class="fixed inset-0 z-[150] flex justify-end">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeDrawer"></div>

        <div class="drawer-panel relative bg-white dark:bg-card-dark w-full max-w-[500px] flex flex-col h-full shadow-2xl">

          <!-- Drawer Header -->
          <div class="flex items-center gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div
              class="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg"
              :class="drawerTenant?.isOnlineUser ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200'"
            >{{ drawerTenant?.name?.[0] }}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="font-bold text-lg text-text-primary-light dark:text-text-primary-dark truncate">{{ drawerTenant?.name }}</h2>
                <span v-if="drawerTenant?.isHistorical" class="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0">歷史租客</span>
                <span v-else-if="drawerTenant?.isOnlineUser" class="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0">已綁定帳號</span>
                <span v-if="!drawerTenant?.isHistorical"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                  :class="paymentStatusStyles[drawerTenant?.paymentStatus || 'pending']"
                >{{ paymentStatusLabels[drawerTenant?.paymentStatus || 'pending'] }}</span>
              </div>
              <p class="text-sm text-text-secondary-light truncate">
                {{ drawerTenant?.isHistorical ? (drawerTenant.moveOutSummary?.room || '已退租') : (drawerTenant?.room || '未設定房源') }}
                · {{ drawerTenant?.phone }}
              </p>
            </div>
            <button @click="closeDrawer" class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Tabs -->
          <div class="flex border-b border-gray-100 dark:border-gray-800 px-2 shrink-0">
            <button
              v-for="tab in drawerTabs"
              :key="tab.value"
              @click="switchDrawerTab(tab.value)"
              class="px-4 py-3 text-sm font-medium border-b-2 transition-colors relative top-[1px]"
              :class="drawerTab === tab.value ? 'border-primary text-primary' : 'border-transparent text-text-secondary-light hover:text-gray-600 dark:hover:text-gray-300'"
            >{{ tab.label }}</button>
          </div>

          <!-- Tab Content -->
          <div class="flex-1 overflow-y-auto">

            <!-- Tab: 基本資料 -->
            <div v-if="drawerTab === 'info'" class="p-6 space-y-5">

              <!-- View mode -->
              <template v-if="!drawerEditing">
                <!-- 租客資訊 -->
                <div class="space-y-3">
                  <p class="text-xs font-bold text-text-secondary-light uppercase">租客資訊</p>
                  <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="bg-surface-light dark:bg-surface-dark rounded-xl p-3">
                      <p class="text-text-secondary-light text-xs mb-1">聯絡電話</p>
                      <p class="font-medium">{{ drawerTenant?.phone || '—' }}</p>
                    </div>
                    <div class="bg-surface-light dark:bg-surface-dark rounded-xl p-3">
                      <p class="text-text-secondary-light text-xs mb-1">電子郵件</p>
                      <p class="font-medium truncate">{{ drawerTenant?.email || '—' }}</p>
                    </div>
                    <div class="bg-surface-light dark:bg-surface-dark rounded-xl p-3 col-span-2">
                      <p class="text-text-secondary-light text-xs mb-1">緊急聯絡人</p>
                      <p class="font-medium">{{ drawerTenant?.emergencyContact || '—' }}</p>
                    </div>
                  </div>
                </div>

                <!-- 歷史租客：退租摘要 -->
                <div v-if="drawerTenant?.isHistorical" class="space-y-3">
                  <p class="text-xs font-bold text-text-secondary-light uppercase">退租摘要</p>
                  <div class="bg-surface-light dark:bg-surface-dark rounded-xl p-4 space-y-3 text-sm">
                    <div class="flex justify-between">
                      <span class="text-text-secondary-light">承租房間</span>
                      <span class="font-medium">{{ drawerTenant.moveOutSummary?.room || '—' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-text-secondary-light">租約期間</span>
                      <span class="font-medium text-right">{{ drawerTenant.moveOutSummary?.leaseStart || '—' }} ~ {{ drawerTenant.moveOutSummary?.leaseEnd || '—' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-text-secondary-light">退租日期</span>
                      <span class="font-semibold">{{ drawerTenant.moveOutSummary?.moveOutDate || '—' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-text-secondary-light">退租原因</span>
                      <span>{{
                        drawerTenant.moveOutSummary?.moveOutReason === 'expired' ? '到期退租'
                        : drawerTenant.moveOutSummary?.moveOutReason === 'early' ? '提前退租' : '其他'
                      }}</span>
                    </div>
                    <div class="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-semibold">
                      <span>退還押金</span>
                      <span class="text-gold-700 dark:text-gold-400">
                        NT$ {{ (drawerTenant.moveOutSummary?.depositRefund ?? 0).toLocaleString() }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 在租租客：合約資訊 -->
                <div v-else class="space-y-3">
                  <p class="text-xs font-bold text-text-secondary-light uppercase">租約資訊</p>
                  <div class="bg-surface-light dark:bg-surface-dark rounded-xl p-4 space-y-3 text-sm">
                    <div class="flex justify-between">
                      <span class="text-text-secondary-light">承租房源</span>
                      <span class="font-medium">{{ drawerTenant?.room || '未設定' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-text-secondary-light">租期</span>
                      <span class="font-medium">{{ drawerTenant?.leaseStart || '—' }} ~ {{ drawerTenant?.leaseEnd || '—' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-text-secondary-light">每月租金</span>
                      <span class="font-semibold text-text-primary-light dark:text-text-primary-dark">NT$ {{ (drawerTenant?.rent || 0).toLocaleString() }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-text-secondary-light">繳費截止日</span>
                      <span class="font-medium">每月 {{ authStore.userProfile?.settings?.paymentDay ?? 5 }} 號</span>
                    </div>
                  </div>
                  <span v-if="isExpiringSoon(drawerTenant?.leaseEnd || '')" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-xs font-medium">
                    <span class="material-symbols-outlined text-[14px]">alarm</span>租約即將到期（60天內）
                  </span>

                  <!-- 續約回覆狀態 -->
                  <div v-if="drawerTenant?.renewalStatus" class="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium"
                    :class="{
                      'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300': drawerTenant.renewalStatus === 'pending',
                      'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300': drawerTenant.renewalStatus === 'confirmed',
                      'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300': drawerTenant.renewalStatus === 'declined',
                    }">
                    <span class="material-symbols-outlined text-[14px]">
                      {{ drawerTenant.renewalStatus === 'confirmed' ? 'check_circle' : drawerTenant.renewalStatus === 'declined' ? 'cancel' : 'schedule' }}
                    </span>
                    {{
                      drawerTenant.renewalStatus === 'confirmed' ? '租客已確認續租'
                      : drawerTenant.renewalStatus === 'declined' ? '租客表示不續租'
                      : '待租客回覆是否續租'
                    }}
                  </div>
                </div>

                <!-- 備註 -->
                <div v-if="drawerTenant?.note" class="space-y-2">
                  <p class="text-xs font-bold text-text-secondary-light uppercase">備註</p>
                  <p class="text-sm text-text-secondary-light bg-surface-light dark:bg-surface-dark rounded-xl p-3">{{ drawerTenant.note }}</p>
                </div>

                <!-- ── 歷史租客操作 ── -->
                <template v-if="drawerTenant?.isHistorical">
                  <button
                    @click="downloadTenantArchive(drawerTenant!)"
                    :disabled="isDownloading"
                    class="w-full py-2.5 border border-blue-200 dark:border-blue-700 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <span class="material-symbols-outlined text-[18px]">{{ isDownloading ? 'sync' : 'download' }}</span>
                    {{ isDownloading ? '產生中...' : '打包下載備份（Excel + PDF）' }}
                  </button>
                  <button
                    @click="deleteTenant(drawerTenant!)"
                    :disabled="isDeleting"
                    class="w-full py-2.5 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <span class="material-symbols-outlined text-[18px]">person_remove</span>
                    {{ isDeleting ? '刪除中...' : '永久刪除租客資料' }}
                  </button>
                </template>

                <!-- ── 在租租客操作 ── -->
                <template v-else>
                  <button
                    @click="enterDrawerEdit"
                    class="w-full py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2 transition-colors"
                  >
                    <span class="material-symbols-outlined text-[18px]">edit</span>編輯租客資料與合約
                  </button>
                  <button
                    v-if="drawerTenant?.room"
                    @click="openMoveOutWizard"
                    class="w-full py-2.5 border border-red-200 dark:border-red-700 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-colors"
                  >
                    <span class="material-symbols-outlined text-[18px]">exit_to_app</span>辦理退租
                  </button>
                  <button
                    v-if="drawerTenant?.room"
                    @click="unbindRoom(drawerTenant!)"
                    :disabled="isUnbinding"
                    class="w-full py-2 rounded-xl text-xs font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <span class="material-symbols-outlined text-[15px]">link_off</span>
                    {{ isUnbinding ? '處理中...' : '緊急解除房間綁定（不走退租流程）' }}
                  </button>
                  <button
                    @click="deleteTenant(drawerTenant!)"
                    :disabled="isDeleting || !!drawerTenant?.room"
                    class="w-full py-2.5 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    :title="drawerTenant?.room ? '請先辦理退租或解除房間綁定' : ''"
                  >
                    <span class="material-symbols-outlined text-[18px]">person_remove</span>
                    {{ isDeleting ? '刪除中...' : '刪除租客資料' }}
                  </button>
                </template>
              </template>

              <!-- Edit mode -->
              <template v-else>
                <div class="flex items-center justify-between mb-2">
                  <p class="font-semibold text-text-primary-light dark:text-text-primary-dark">編輯租客與合約</p>
                  <button @click="drawerEditing = false" class="text-sm text-text-secondary-light hover:text-gray-700 dark:hover:text-gray-300">取消</button>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-text-secondary-light mb-1">姓名</label>
                    <input v-model="form.name" type="text" class="form-input">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-text-secondary-light mb-1">承租房源</label>
                    <select v-model="form.room" @change="onRoomSelect" class="form-input">
                      <option value="" disabled>請選擇房源</option>
                      <option v-if="currentEditingRoom" :value="currentEditingRoom.name">{{ currentEditingRoom.name }} (目前承租)</option>
                      <option v-for="room in vacantRooms" :key="room.id" :value="room.name">{{ room.name }} ({{ room.price }}元)</option>
                      <option v-if="form.room && !isRoomInList(form.room)" :value="form.room">{{ form.room }} (未知房源)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">聯絡電話</label>
                  <input v-model="form.phone" type="tel" class="form-input">
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-secondary-light mb-1">電子郵件 (選填)</label>
                  <input v-model="form.email" type="email" class="form-input">
                </div>
                <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
                  <p class="text-xs font-bold text-text-secondary-light uppercase mb-3">租約設定</p>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-text-secondary-light mb-1">起租日</label>
                      <input v-model="form.leaseStart" type="date" class="form-input">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-text-secondary-light mb-1">租期（年）</label>
                      <select v-model.number="form.leaseDuration" class="form-input">
                        <option :value="0.5">0.5 年</option>
                        <option :value="1">1 年</option>
                        <option :value="1.5">1.5 年</option>
                        <option :value="2">2 年</option>
                        <option :value="3">3 年</option>
                      </select>
                    </div>
                  </div>
                  <div class="mt-3 flex items-center gap-2 text-sm text-text-secondary-light bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                    <span class="material-symbols-outlined text-[16px]">event</span>
                    到期日：<span class="font-semibold text-text-primary-light dark:text-text-primary-dark">{{ form.leaseEnd || '—' }}</span>
                  </div>
                  <div class="mt-3 flex items-center gap-2 text-sm text-text-secondary-light bg-blue-50 dark:bg-blue-900/10 rounded-lg px-3 py-2 border border-blue-100 dark:border-blue-900/30">
                    <span class="material-symbols-outlined text-[16px] text-blue-400">event_available</span>
                    繳費截止日：每月 <span class="font-semibold text-blue-700 dark:text-blue-300">{{ authStore.userProfile?.settings?.paymentDay ?? 5 }}</span> 號（依房東設定）
                  </div>
                  <div class="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label class="block text-sm font-medium text-text-secondary-light mb-1">每月租金 (NT$)</label>
                      <input v-model.number="form.rent" type="number" class="form-input">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-text-secondary-light mb-1">押金月數</label>
                      <select v-model.number="form.depositMonths" class="form-input">
                        <option :value="1">1 個月</option>
                        <option :value="2">2 個月（慣例）</option>
                        <option :value="3">3 個月</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
                  <p class="text-xs font-bold text-text-secondary-light uppercase mb-3">其他資訊</p>
                  <div class="space-y-3">
                    <div>
                      <label class="block text-sm font-medium text-text-secondary-light mb-1">緊急聯絡人</label>
                      <input v-model="form.emergencyContact" type="text" class="form-input" placeholder="姓名 - 關係 - 電話">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-text-secondary-light mb-1">備註</label>
                      <textarea v-model="form.note" class="form-input min-h-[80px]"></textarea>
                    </div>
                  </div>
                </div>

                <div class="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-card-dark pb-2">
                  <button @click="drawerEditing = false" class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">取消</button>
                  <button @click="saveTenant" :disabled="isSaving" class="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold shadow-md hover:bg-gold-600 transition-colors disabled:opacity-50">
                    {{ isSaving ? '處理中...' : '儲存並同步合約' }}
                  </button>
                </div>
              </template>
            </div>

            <!-- Tab: 帳單紀錄 -->
            <div v-if="drawerTab === 'bills'" class="p-4 space-y-3">
              <div v-if="drawerBillsLoading" class="py-12 text-center text-text-secondary-light">
                <span class="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
                <p class="text-sm">載入帳單中...</p>
              </div>
              <div v-else-if="drawerBills.length === 0" class="py-12 text-center text-text-secondary-light">
                <span class="material-symbols-outlined text-4xl text-gray-300 mb-2">receipt_long</span>
                <p class="text-sm">目前沒有帳單記錄</p>
              </div>
              <div v-else>
                <div
                  v-for="bill in drawerBills"
                  :key="bill.id"
                  class="flex items-center justify-between p-4 rounded-xl border transition-colors"
                  :class="bill.status === 'completed' ? 'border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10' : bill.status === 'overdue' ? 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-800 bg-surface-light dark:bg-surface-dark'"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-sm text-text-primary-light dark:text-text-primary-dark">{{ bill.monthStr }}</span>
                      <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{{ bill.category }}</span>
                    </div>
                    <div class="flex items-center gap-3 mt-1">
                      <span class="text-xs text-text-secondary-light">NT$ {{ bill.amount.toLocaleString() }}</span>
                      <span v-if="bill.dueDate" class="text-xs text-text-secondary-light">截止 {{ bill.dueDate }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span
                      class="text-xs px-2 py-1 rounded-full font-medium"
                      :class="bill.status === 'completed' ? 'bg-green-100 text-green-700' : bill.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'"
                    >{{ bill.status === 'completed' ? '已收款' : bill.status === 'overdue' ? '已逾期' : '待收款' }}</span>
                    <button
                      v-if="bill.status !== 'completed'"
                      @click="markDrawerBillPaid(bill)"
                      :disabled="markingBillId === bill.id"
                      class="text-xs px-3 py-1.5 bg-gold-500 text-white rounded-lg hover:bg-gold-600 disabled:opacity-50 transition-colors font-medium"
                    >{{ markingBillId === bill.id ? '處理中' : '標記已收' }}</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab: 入住押金 -->
            <div v-if="drawerTab === 'deposits'" class="p-6 space-y-3">
              <div v-if="!drawerTenant?.contractId" class="py-12 text-center text-text-secondary-light">
                <span class="material-symbols-outlined text-4xl text-gray-300 mb-2">description</span>
                <p class="text-sm">尚未建立合約</p>
              </div>
              <div v-else-if="depositItems.length === 0" class="py-12 text-center text-text-secondary-light">
                <span class="material-symbols-outlined text-4xl text-gray-300 mb-2">payments</span>
                <p class="text-sm">無押金/入住款項記錄</p>
              </div>
              <template v-else>
                <div
                  v-for="(item, idx) in depositItems"
                  :key="idx"
                  class="flex items-center justify-between p-4 rounded-xl border transition-colors"
                  :class="item.status === 'paid' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'"
                >
                  <div>
                    <p class="font-semibold text-sm text-text-primary-light dark:text-text-primary-dark">{{ item.label }}</p>
                    <p class="text-xs text-text-secondary-light">NT$ {{ item.amount.toLocaleString() }}</p>
                    <p v-if="item.paidAt" class="text-xs text-green-600 dark:text-green-400 mt-0.5">{{ item.paidAt }}</p>
                  </div>
                  <div>
                    <span v-if="item.status === 'paid'" class="flex items-center gap-1 text-green-700 dark:text-green-400 text-sm font-bold">
                      <span class="material-symbols-outlined text-[18px]">check_circle</span>已收款
                    </span>
                    <button
                      v-else
                      @click="markDepositPaid(idx)"
                      :disabled="isMarkingPaid"
                      class="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <span class="material-symbols-outlined text-[14px]">payments</span>標記已收
                    </button>
                  </div>
                </div>
                <div class="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between text-sm font-bold">
                  <span class="text-text-secondary-light">應收總計</span>
                  <span>NT$ {{ depositItems.reduce((s, i) => s + i.amount, 0).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between text-sm font-bold text-green-600">
                  <span>已收金額</span>
                  <span>NT$ {{ depositItems.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0).toLocaleString() }}</span>
                </div>
              </template>
            </div>

          </div>
        </div>
      </div>
    </Transition>

    <!-- Move-out Wizard -->
    <MoveOutWizard
      v-if="showMoveOutWizard && drawerTenant"
      :tenant="drawerTenant"
      :landlord-id="authStore.effectiveUid"
      @close="showMoveOutWizard = false"
      @completed="onMoveOutCompleted"
    />

    <!-- 清除電表歷史確認 Modal -->
    <Teleport to="body">
      <div v-if="showClearMeterModal" class="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-card-dark rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-amber-500 text-2xl shrink-0 mt-0.5">cloud_off</span>
            <div>
              <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">清除雲端電表歷史？</h3>
              <p class="text-sm text-text-secondary-light mt-1">
                備份已下載。是否清除 <strong>{{ pendingClearTenant?.moveOutSummary?.room }}</strong> 在租期間的電表紀錄？
              </p>
              <p class="text-xs text-blue-600 dark:text-blue-400 mt-2">
                最後度數（{{ pendingClearTenant?.moveOutSummary?.moveOutDate?.slice(0,7) }}）已儲存為下個租客電費基準，不受影響。
              </p>
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button @click="showClearMeterModal = false; pendingClearTenant = null"
              class="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              保留雲端資料
            </button>
            <button @click="clearMeterReadings" :disabled="isClearingMeter"
              class="flex-1 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              <span v-if="isClearingMeter" class="material-symbols-outlined animate-spin text-[15px]">sync</span>
              {{ isClearingMeter ? '清除中...' : '清除電表歷史' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { auth, db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import MoveOutWizard from '../../components/MoveOutWizard.vue';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';

// --- Type Definitions ---
interface DepositItem {
  label: string;
  amount: number;
  status: 'unpaid' | 'paid';
  paidAt?: string;
}

interface Tenant {
  id: string;
  name: string;
  room: string;
  phone: string;
  email?: string;
  leaseStart: string;
  leaseEnd: string;
  leaseDuration?: number;
  rent?: number;
  depositMonths?: number;
  paymentStatus: 'normal' | 'overdue' | 'unpaid' | 'pending';
  emergencyContact?: string;
  note?: string;
  idNumber?: string;
  landlordId?: string;
  isOnlineUser?: boolean;
  isHistorical?: boolean;
  uid?: string;
  contractId?: string;
  deposits?: DepositItem[];
  renewalStatus?: 'pending' | 'confirmed' | 'declined' | null;
  moveOutSummary?: any;
  createdAt?: any;
}

interface Room {
  id: string;
  name: string;
  status: string;
  price: number;
}

interface DrawerBill {
  id: string;
  date: string;
  monthStr: string;
  category: string;
  amount: number;
  status: 'completed' | 'pending' | 'overdue';
  dueDate?: string;
}

// --- State ---
const authStore = useAuthStore();
const toast = useToastStore();
const tenants = ref<Tenant[]>([]);
const availableRooms = ref<Room[]>([]);
const loading = ref(true);
const isSaving = ref(false);
const billStatusMap = ref<Record<string, 'normal' | 'unpaid' | 'overdue'>>({});
const sendingReminderId = ref<string | null>(null);

// --- Subscription Handlers ---
let unsubscribeTenants: any = null;
let unsubscribeUsers: any = null;

// --- Date Helpers ---
const todayStr = () => new Date().toISOString().split('T')[0] as string;

const calcLeaseEnd = (start: string, durationYears: number): string => {
  if (!start || !durationYears) return '';
  const d = new Date(start);
  const totalDays = Math.round(durationYears * 365);
  d.setDate(d.getDate() + totalDays - 1);
  return d.toISOString().split('T')[0] as string;
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
  { label: '全部租客', value: 'all' },
  { label: '繳費正常', value: 'normal' },
  { label: '逾期/欠費', value: 'issue' },
  { label: '待確認續約', value: 'renewal' },
  { label: '歷史租客', value: 'historical' },
];

const paymentStatusLabels: any = {
  normal: '繳費正常',
  unpaid: '本期未繳',
  overdue: '逾期欠費',
  pending: '未設定租約'
};

const paymentStatusStyles: any = {
  normal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  unpaid: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  pending: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
};

const paymentDotStyles: any = {
  normal: 'bg-green-500',
  unpaid: 'bg-yellow-500',
  overdue: 'bg-red-500',
  pending: 'bg-gray-400'
};

// --- Firestore Integration ---

// --- 單一租客帳單 LINE 提醒 ---
const sendBillReminder = async (tenant: Tenant) => {
  if (!tenant.uid) {
    toast.warning('此租客尚未綁定系統帳號，無法發送 LINE 通知');
    return;
  }
  sendingReminderId.value = tenant.id;
  try {
    const fn = httpsCallable(functions, 'sendLineBillNotifications');
    const result: any = await fn({ tenantId: tenant.uid });
    if (result.data?.sent > 0) {
      toast.success(`已發送帳單提醒給 ${tenant.name}`);
    } else {
      toast.info(result.data?.message || `${tenant.name} 目前沒有未繳帳單`);
    }
  } catch (e: any) {
    toast.error(e.message || '發送失敗，請確認 LINE Bot 設定');
  } finally {
    sendingReminderId.value = null;
  }
};

// 讀取本月帳單狀態，建立 tenantDocId -> status 對照表
const refreshBillStatuses = async () => {
  const uid = authStore.effectiveUid;
  const today = new Date().toISOString().split('T')[0] as string;
  const currentMonth = today.slice(0, 7);
  try {
    const snap = await getDocs(query(
      collection(db, 'bills'),
      where('landlordId', '==', uid),
      where('date', '>=', `${currentMonth}-01`),
      where('date', '<=', `${currentMonth}-31`),
      where('type', '==', 'income')
    ));
    const map: Record<string, 'normal' | 'unpaid' | 'overdue'> = {};
    snap.forEach(d => {
      const data = d.data();
      const tid = data.relatedTenantDocId as string;
      if (!tid) return;
      const cur = map[tid];
      if (data.status === 'overdue' || (data.dueDate && data.dueDate < today)) {
        map[tid] = 'overdue';
      } else if (data.status === 'completed') {
        if (!cur) map[tid] = 'normal';
      } else {
        if (cur !== 'overdue') map[tid] = 'unpaid';
      }
    });
    billStatusMap.value = map;
  } catch (e) {
    console.warn('Bill status fetch error:', e);
  }
};

// 讀取房源列表 (用於下拉選單)
const fetchRooms = async () => {
  if (!authStore.user) return;
  const q = query(collection(db, 'rooms'), where('landlordId', '==', authStore.effectiveUid));
  const snap = await getDocs(q);
  availableRooms.value = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Room));
};

const startListeners = () => {
  if (unsubscribeTenants) return;

  const uid = authStore.effectiveUid;
  const myCode = authStore.userProfile?.landlordCode;

  fetchRooms();

  const qTenants = query(collection(db, 'tenants'), where('landlordId', '==', uid));
  unsubscribeTenants = onSnapshot(qTenants, async (snapshot) => {
    const manualTenants = await Promise.all(snapshot.docs.map(async (d) => {
      const tenantData = { id: d.id, ...d.data() } as Tenant;
      if (tenantData.contractId) {
        const contractSnap = await getDoc(doc(db, 'contracts', tenantData.contractId));
        if (contractSnap.exists()) {
          const cd = contractSnap.data();
          tenantData.deposits = cd.deposits || [];
          tenantData.renewalStatus = cd.renewalStatus || null;
        }
      }
      return tenantData;
    }));
    updateCombinedList(manualTenants, onlineUsers.value);
  });

  if (myCode) {
    const qUsers = query(collection(db, 'users'), where('boundLandlordCode', '==', myCode));
    unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const users = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          uid: d.id,
          name: data.name || '未命名用戶',
          phone: data.phone || '',
          email: data.email || '',
          room: '尚未設定',
          leaseStart: '',
          leaseEnd: '',
          paymentStatus: 'pending',
          isOnlineUser: true
        } as Tenant;
      });
      onlineUsers.value = users;
    });
  }
};

onMounted(() => {
  if (!authStore.user) return;
  if (authStore.userProfile) {
    startListeners();
  } else {
    const stop = watch(() => authStore.userProfile, (profile) => {
      if (profile) { stop(); startListeners(); }
    });
  }
});

const manualTenantsList = ref<Tenant[]>([]);
const onlineUsers = ref<Tenant[]>([]);

const updateCombinedList = (manual: Tenant[], online: Tenant[]) => {
  manualTenantsList.value = manual;
  const manualPhones = new Set(manual.map(t => t.phone).filter(Boolean));
  const manualUids = new Set(manual.map(t => t.uid).filter(Boolean));
  const uniqueOnline = online.filter(u => !manualPhones.has(u.phone) && !manualUids.has(u.uid));
  tenants.value = [...manual, ...uniqueOnline];
  loading.value = false;
  refreshBillStatuses();
};

watch([manualTenantsList, onlineUsers], ([newManual, newOnline]) => {
  const manualPhones = new Set(newManual.map(t => t.phone));
  const uniqueOnline = newOnline.filter(u => !manualPhones.has(u.phone));
  tenants.value = [...newManual, ...uniqueOnline];
  refreshBillStatuses();
});

onUnmounted(() => {
  if (unsubscribeTenants) unsubscribeTenants();
  if (unsubscribeUsers) unsubscribeUsers();
});

// --- Save Tenant (handles both new & edit) ---
const saveTenant = async () => {
  if (!authStore.user) return;
  if (!form.value.name) { toast.warning('請填寫完整資料'); return; }
  if (!form.value.room) { toast.warning('請選擇房源'); return; }

  isSaving.value = true;

  try {
    const tenantData: any = {
      ...form.value,
      landlordId: authStore.effectiveUid,
      updatedAt: serverTimestamp()
    };

    const isOnlineProfile = tenantData.isOnlineUser;
    const targetUid = tenantData.uid;

    delete tenantData.isOnlineUser;
    delete tenantData.id;
    delete tenantData.uid;

    // 1. 處理 Tenants Collection
    if (isEditing.value && form.value.id) {
      if (isOnlineProfile) {
        const existQ = query(
          collection(db, 'tenants'),
          where('uid', '==', targetUid),
          where('landlordId', '==', authStore.effectiveUid)
        );
        const existSnap = await getDocs(existQ);
        if (existSnap.empty) {
          const newDoc = await addDoc(collection(db, 'tenants'), {
            ...tenantData, uid: targetUid, createdAt: serverTimestamp(), paymentStatus: 'normal',
          });
          form.value.id = newDoc.id;
          toast.success('已建立租客檔案');
        } else {
          const existId = existSnap.docs[0]!.id;
          form.value.id = existId;
          await updateDoc(doc(db, 'tenants', existId), tenantData);
        }
      } else {
        await updateDoc(doc(db, 'tenants', form.value.id), tenantData);
      }
    } else {
      const dupQ = query(
        collection(db, 'tenants'),
        where('phone', '==', form.value.phone),
        where('landlordId', '==', authStore.effectiveUid)
      );
      const dupSnap = await getDocs(dupQ);
      if (!dupSnap.empty) {
        toast.warning('此電話號碼的租客已存在，請直接編輯該筆資料');
        isSaving.value = false;
        return;
      }
      const newDoc = await addDoc(collection(db, 'tenants'), {
        ...tenantData, createdAt: serverTimestamp(), paymentStatus: 'normal',
      });
      form.value.id = newDoc.id;
    }

    // 2. 處理 Rooms Collection
    const selectedRoom = availableRooms.value.find(r => r.name === form.value.room);
    if (selectedRoom) {
      await updateDoc(doc(db, 'rooms', selectedRoom.id), {
        status: 'occupied',
        tenantName: form.value.name,
        leaseEnd: form.value.leaseEnd,
      });
    }

    // 3. 處理 Contracts Collection
    {
      const tenantDocId = form.value.id!;
      const contractsRef = collection(db, 'contracts');

      const qContract = targetUid
        ? query(contractsRef, where('landlordId', '==', authStore.effectiveUid), where('tenantId', '==', targetUid), where('status', '==', 'active'))
        : query(contractsRef, where('landlordId', '==', authStore.effectiveUid), where('tenantDocId', '==', tenantDocId), where('status', '==', 'active'));
      const contractSnap = await getDocs(qContract);

      const rent = form.value.rent || 0;
      const depositMonths = form.value.depositMonths || 2;

      const buildDeposits = (existingDeposits?: DepositItem[]): DepositItem[] => {
        const items: DepositItem[] = [];
        for (let n = 1; n <= depositMonths; n++) {
          const existing = existingDeposits?.find(d => d.label === `押金（第 ${n} 個月）`);
          items.push(existing ?? { label: `押金（第 ${n} 個月）`, amount: rent, status: 'unpaid' });
        }
        const firstRent = existingDeposits?.find(d => d.label === '首月租金');
        items.push(firstRent ?? { label: '首月租金', amount: rent, status: 'unpaid' });
        return items;
      };

      const contractData: any = {
        landlordId: authStore.effectiveUid,
        tenantDocId,
        tenantName: form.value.name,
        roomNumber: form.value.room,
        rent,
        depositMonths,
        startDate: form.value.leaseStart,
        endDate: form.value.leaseEnd,
        paymentDay: authStore.userProfile?.settings?.paymentDay ?? 5,
        status: 'active',
        updatedAt: serverTimestamp()
      };
      if (targetUid) contractData.tenantId = targetUid;

      let contractId: string;
      if (!contractSnap.empty) {
        const contractDoc = contractSnap.docs[0]!;
        contractId = contractDoc.id;
        contractData.deposits = buildDeposits(contractDoc.data().deposits as DepositItem[] | undefined);
        await updateDoc(doc(db, 'contracts', contractId), contractData);
      } else {
        contractData.deposits = buildDeposits();
        contractData.createdAt = serverTimestamp();
        const newContract = await addDoc(contractsRef, contractData);
        contractId = newContract.id;
      }

      await updateDoc(doc(db, 'tenants', tenantDocId), { contractId });
    }

    await fetchRooms();

    // 新增租客且有填身分證號 → 建立登入帳號
    if (!isEditing.value && form.value.idNumber && form.value.phone && form.value.id) {
      try {
        const createAccount = httpsCallable(functions, 'createTenantAccount');
        await createAccount({
          phone: form.value.phone,
          idNumber: form.value.idNumber,
          tenantDocId: form.value.id,
          name: form.value.name,
        });
        createdCredential.value = { phone: form.value.phone, idNumber: form.value.idNumber };
        showCredentialModal.value = true;
      } catch (e: any) {
        toast.warning('租客已新增，但建立登入帳號失敗：' + (e.message || '請稍後重試'));
      }
    } else {
      toast.success(isEditing.value ? '租客資料已更新' : '租客已新增');
    }

    showModal.value = false;
    drawerEditing.value = false;

    // 若在 drawer 編輯模式，回到 view 模式並刷新 drawer tenant
    if (showDrawer.value && drawerTenant.value) {
      // onSnapshot 會自動更新 tenants.value，drawer tenant 會在下一 tick 反映
    }

  } catch (error) {
    console.error('Error saving tenant:', error);
    toast.error('儲存失敗: ' + error);
  } finally {
    isSaving.value = false;
  }
};

// --- Computed & Helpers ---
const tenantsWithStatus = computed(() => {
  const map = billStatusMap.value;
  return tenants.value.map(t => {
    const billStatus = map[t.id];
    return billStatus ? { ...t, paymentStatus: billStatus } : t;
  });
});

const stats = computed(() => {
  const today = new Date();
  const sixtyDaysLater = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const activeTenants = tenantsWithStatus.value.filter(t => t.paymentStatus !== 'pending');
  return {
    total: activeTenants.length,
    expiring: activeTenants.filter(t => {
      if (!t.leaseEnd) return false;
      const endDate = new Date(t.leaseEnd);
      return endDate >= today && endDate <= sixtyDaysLater;
    }).length,
    overdue: activeTenants.filter(t => t.paymentStatus === 'overdue').length
  };
});

const filteredTenants = computed(() => {
  return tenantsWithStatus.value.filter(t => {
    const q = searchQuery.value.toLowerCase();
    const matchSearch = t.name.toLowerCase().includes(q) ||
                        t.room.toLowerCase().includes(q) ||
                        t.phone.includes(q);
    if (!matchSearch) return false;
    if (currentFilter.value === 'historical') return !!t.isHistorical;
    if (t.isHistorical) return false; // 歷史租客只在 historical 分頁顯示
    if (currentFilter.value === 'all') return true;
    if (currentFilter.value === 'normal') return t.paymentStatus === 'normal';
    if (currentFilter.value === 'issue') return ['overdue', 'unpaid', 'pending'].includes(t.paymentStatus);
    if (currentFilter.value === 'renewal') return t.renewalStatus === 'pending';
    return true;
  });
});

// --- 分頁 ---
const TENANT_PAGE_SIZE = 15;
const tenantPage = ref(1);
watch([searchQuery, currentFilter], () => { tenantPage.value = 1; });
const totalTenantPages = computed(() => Math.ceil(filteredTenants.value.length / TENANT_PAGE_SIZE));
const pagedTenants = computed(() => {
  const start = (tenantPage.value - 1) * TENANT_PAGE_SIZE;
  return filteredTenants.value.slice(start, start + TENANT_PAGE_SIZE);
});

const isExpiringSoon = (dateStr: string) => {
  if (!dateStr) return false;
  const today = new Date();
  const targetDate = new Date(dateStr);
  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 60;
};

// --- New Tenant Modal ---
const showModal = ref(false);
const isEditing = ref(false);
const form = ref<Partial<Tenant>>({
  name: '', room: '', phone: '', email: '', idNumber: '',
  leaseStart: todayStr(), leaseEnd: calcLeaseEnd(todayStr(), 1),
  leaseDuration: 1, rent: 0, depositMonths: 2,
  paymentStatus: 'normal', emergencyContact: '', note: ''
});

// 建立帳號後顯示給房東的登入憑證
const showCredentialModal = ref(false);
const createdCredential = ref<{ phone: string; idNumber: string } | null>(null);

watch(
  [() => form.value.leaseStart, () => form.value.leaseDuration],
  ([start, duration]) => {
    if (start && duration) form.value.leaseEnd = calcLeaseEnd(start, duration);
  }
);

const vacantRooms = computed(() => availableRooms.value.filter(r => r.status === 'vacant'));
const currentEditingRoom = computed(() => {
  if (!form.value.room) return null;
  return availableRooms.value.find(r => r.name === form.value.room);
});
const isRoomInList = (roomName: string) => availableRooms.value.some(r => r.name === roomName);
const onRoomSelect = () => {
  const r = availableRooms.value.find(room => room.name === form.value.room);
  if (r) form.value.rent = Number(r.price);
};

const openNewTenantModal = () => {
  fetchRooms();
  isEditing.value = false;
  const today = todayStr();
  form.value = {
    name: '', room: '', phone: '', email: '',
    leaseStart: today, leaseEnd: calcLeaseEnd(today, 1),
    leaseDuration: 1, rent: 0, depositMonths: 2,
    paymentStatus: 'normal', emergencyContact: '', note: ''
  };
  showModal.value = true;
};

// --- Drawer State ---
const showDrawer = ref(false);
const drawerTenant = ref<Tenant | null>(null);
const drawerTab = ref<'info' | 'bills' | 'deposits'>('info');
const drawerEditing = ref(false);
const drawerBills = ref<DrawerBill[]>([]);
const drawerBillsLoading = ref(false);
const markingBillId = ref<string | null>(null);

const drawerTabs = [
  { label: '基本資料', value: 'info' },
  { label: '帳單紀錄', value: 'bills' },
  { label: '入住押金', value: 'deposits' },
];

const openDrawer = (tenant: Tenant) => {
  drawerTenant.value = { ...tenant };
  drawerTab.value = 'info';
  drawerEditing.value = false;
  showDrawer.value = true;
  fetchRooms();
};

const openDrawerTab = (tenant: Tenant, tab: 'info' | 'bills' | 'deposits') => {
  drawerTenant.value = { ...tenant };
  drawerTab.value = tab;
  drawerEditing.value = false;
  showDrawer.value = true;
  fetchRooms();
  if (tab === 'bills') fetchDrawerBills();
  if (tab === 'deposits') loadDepositItems(tenant);
};

const switchDrawerTab = (tab: string) => {
  drawerTab.value = tab as any;
  if (tab === 'bills' && drawerBills.value.length === 0) fetchDrawerBills();
  if (tab === 'deposits' && drawerTenant.value) loadDepositItems(drawerTenant.value);
};

const closeDrawer = () => {
  showDrawer.value = false;
  drawerEditing.value = false;
};

const enterDrawerEdit = () => {
  if (!drawerTenant.value) return;
  isEditing.value = true;
  form.value = JSON.parse(JSON.stringify(drawerTenant.value));
  if (!form.value.rent && form.value.room) {
    const r = availableRooms.value.find(room => room.name === form.value.room);
    if (r) form.value.rent = r.price;
  }
  drawerEditing.value = true;
};

// --- Drawer Bills ---
const fetchDrawerBills = async () => {
  if (!drawerTenant.value) return;
  drawerBillsLoading.value = true;
  drawerBills.value = [];
  try {
    const tid = drawerTenant.value.id;
    const uid = authStore.effectiveUid;
    // 必須帶 landlordId 條件，否則 Firestore 安全規則 list 評估會失敗
    const snap = await getDocs(query(
      collection(db, 'bills'),
      where('landlordId', '==', uid),
      where('relatedTenantDocId', '==', tid),
      where('type', '==', 'income'),
      orderBy('date', 'desc'),
      limit(20)
    ));
    drawerBills.value = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        date: data.date,
        monthStr: data.date ? data.date.slice(0, 7).replace('-', '年 ') + '月' : '—',
        category: data.category || '—',
        amount: Number(data.amount) || 0,
        status: data.status || 'pending',
        dueDate: data.dueDate || ''
      } as DrawerBill;
    });
  } catch (e) {
    console.warn('Drawer bills fetch error:', e);
  } finally {
    drawerBillsLoading.value = false;
  }
};

const markDrawerBillPaid = async (bill: DrawerBill) => {
  markingBillId.value = bill.id;
  try {
    const today = new Date().toISOString().split('T')[0]!;
    await updateDoc(doc(db, 'bills', bill.id), {
      status: 'completed',
      paymentDate: today,
      updatedAt: serverTimestamp()
    });
    bill.status = 'completed';
    toast.success('已標記收款完成');
    refreshBillStatuses();
  } catch {
    toast.error('更新失敗，請稍後再試');
  } finally {
    markingBillId.value = null;
  }
};

// --- Dropdown ---
const activeMenuId = ref<string | null>(null);
const toggleMenu = (id: string) => {
  activeMenuId.value = activeMenuId.value === id ? null : id;
};
const closeDropdown = () => { activeMenuId.value = null; };

// --- Deposit Logic (used in drawer deposits tab) ---
const depositItems = ref<DepositItem[]>([]);
const isMarkingPaid = ref(false);

const loadDepositItems = async (tenant: Tenant) => {
  depositItems.value = [];
  if (tenant.contractId) {
    const snap = await getDoc(doc(db, 'contracts', tenant.contractId));
    if (snap.exists()) depositItems.value = (snap.data().deposits as DepositItem[]) || [];
  } else {
    depositItems.value = tenant.deposits || [];
  }
};

const markDepositPaid = async (idx: number) => {
  if (!drawerTenant.value?.contractId) return;
  isMarkingPaid.value = true;
  try {
    const tenant = drawerTenant.value;
    const item = depositItems.value[idx]!;
    const todayDate = new Date().toISOString().split('T')[0]!;
    const nowLabel = new Date().toLocaleDateString('zh-TW');
    depositItems.value[idx] = { ...item, status: 'paid', paidAt: nowLabel };
    await updateDoc(doc(db, 'contracts', tenant.contractId!), { deposits: depositItems.value });
    await addDoc(collection(db, 'bills'), {
      landlordId: authStore.effectiveUid,
      tenantId: tenant.uid || null,
      relatedTenantDocId: tenant.id,
      relatedContractId: tenant.contractId,
      date: todayDate,
      type: 'income',
      category: '入住款項',
      target: `${tenant.room} ${tenant.name}`,
      description: item.label,
      amount: item.amount,
      status: 'completed',
      dueDate: todayDate,
      history: [],
      createdAt: serverTimestamp(),
    });
    toast.success(`已標記「${item.label}」收款完成`);
  } catch {
    toast.error('更新失敗，請稍後再試');
  } finally {
    isMarkingPaid.value = false;
  }
};

// --- Phase C: 打包下載 & 清除電表 ---
const isDownloading = ref(false);
const showClearMeterModal = ref(false);
const isClearingMeter = ref(false);
const pendingClearTenant = ref<Tenant | null>(null);

const apiBase = import.meta.env.VITE_API_BASE;

/** 呼叫 generatePdf Cloud Function 並觸發瀏覽器下載 */
const callGeneratePdf = async (payload: Record<string, any>, filename: string) => {
  const token = await auth.currentUser?.getIdToken();
  if (!token || !apiBase) throw new Error('無法取得 token 或 API base');
  const res = await fetch(`${apiBase}/generatePdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PDF 產生失敗 (${res.status}): ${text}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadTenantArchive = async (tenant: Tenant) => {
  isDownloading.value = true;
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const summary = tenant.moveOutSummary || {};
    const room: string = summary.room || tenant.room || '';
    const leaseStartMonth: string = (summary.leaseStart || tenant.leaseStart || '').slice(0, 7);
    const moveOutMonth: string = (summary.moveOutDate || new Date().toISOString().slice(0, 10)).slice(0, 7);
    const moveOutDateStr = (summary.moveOutDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '');

    // ── Sheet 1: 基本資料 ──
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['項目', '內容'],
      ['姓名', tenant.name],
      ['電話', tenant.phone || ''],
      ['電子郵件', tenant.email || ''],
      ['緊急聯絡人', (tenant as any).emergencyContact || ''],
      ['備註', (tenant as any).note || ''],
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, '基本資料');

    // ── Sheet 2: 退租摘要（從 moveOutRecords 抓完整版）──
    const moveOutSnap = await getDocs(query(
      collection(db, 'moveOutRecords'),
      where('tenantDocId', '==', tenant.id),
      orderBy('createdAt', 'desc'),
      limit(1),
    ));
    const reasonLabel: Record<string, string> = { expired: '到期退租', early: '提前退租', other: '其他' };
    const summaryRows: any[][] = [['項目', '內容']];
    summaryRows.push(['承租房間', summary.room || '']);
    summaryRows.push(['起租日', summary.leaseStart || '']);
    summaryRows.push(['合約到期日', summary.leaseEnd || '']);
    summaryRows.push(['實際退租日', summary.moveOutDate || '']);
    summaryRows.push(['退租原因', reasonLabel[summary.moveOutReason] || summary.moveOutReason || '']);
    let moveOutData: any = null;
    if (!moveOutSnap.empty) {
      moveOutData = moveOutSnap.docs[0]!.data();
      summaryRows.push(['押金合計', moveOutData.depositPaid ?? '']);
      summaryRows.push(['電費結清', moveOutData.electricitySettlement ?? '']);
      summaryRows.push(['水費結清', moveOutData.waterSettlement ?? '']);
      if (Array.isArray(moveOutData.deductions) && moveOutData.deductions.length > 0) {
        moveOutData.deductions.forEach((d: any) => summaryRows.push([`扣款：${d.label}`, d.amount]));
      }
      summaryRows.push(['退還押金', moveOutData.depositRefund ?? '']);
      summaryRows.push(['備註', moveOutData.notes || '']);
    } else {
      summaryRows.push(['退還押金', summary.depositRefund ?? '']);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), '退租摘要');

    // ── Sheet 3: 帳單紀錄 ──
    const billsSnap = await getDocs(query(
      collection(db, 'bills'),
      where('landlordId', '==', authStore.effectiveUid),
      where('relatedTenantDocId', '==', tenant.id),
      orderBy('date', 'asc'),
    ));
    const billRows = billsSnap.docs.map(d => {
      const b = d.data();
      const statusMap: any = { completed: '已收款', pending: '待收款', overdue: '已逾期' };
      return [b.date || '', b.category || '', b.description || '', b.amount || 0, statusMap[b.status] || b.status || ''];
    });
    XLSX.utils.book_append_sheet(wb,
      XLSX.utils.aoa_to_sheet([['日期', '類別', '說明', '金額', '狀態'], ...billRows]),
      '帳單紀錄');

    // ── Sheet 4: 電表歷史 ──
    if (room && leaseStartMonth) {
      const meterSnap = await getDocs(query(
        collection(db, 'meter_readings'),
        where('landlordId', '==', authStore.effectiveUid),
        where('roomName', '==', room),
        where('yearMonth', '>=', leaseStartMonth),
        where('yearMonth', '<=', moveOutMonth),
        orderBy('yearMonth', 'asc'),
      ));
      const meterRows = meterSnap.docs.map(d => {
        const m = d.data();
        const modeLabel: any = { fixed: '固定費率', tiered: '累進費率', bill_share: '帳單分攤' };
        return [m.yearMonth || '', m.lastReading ?? '', m.currentReading ?? '', m.usage ?? '', m.cost ?? '', modeLabel[m.mode] || m.mode || ''];
      });
      XLSX.utils.book_append_sheet(wb,
        XLSX.utils.aoa_to_sheet([['計費年月', '上期度數', '本期度數', '用電度數', '電費', '計費模式'], ...meterRows]),
        '電表歷史');
    }

    // ── 下載 Excel ──
    XLSX.writeFile(wb, `${tenant.name}_退租紀錄_${moveOutDateStr}.xlsx`);
    toast.success('Excel 備份已下載，正在產生 PDF…');

    // ── 退租結清單 PDF ──
    const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const fmtAmt = (v: any) => (v != null && v !== '') ? `NT$ ${Number(v).toLocaleString()}` : '—';
    const deductionsHtml = (Array.isArray(moveOutData?.deductions) && moveOutData.deductions.length > 0)
      ? moveOutData.deductions.map((d: any) =>
          `<tr><td class="label deduct" style="padding:9px 12px;border-bottom:1px solid #e8edf5;color:#c0392b;">扣款：${d.label}</td><td class="amount deduct" style="text-align:right;padding:9px 12px;border-bottom:1px solid #e8edf5;font-weight:700;color:#c0392b;">－ ${fmtAmt(d.amount)}</td></tr>`
        ).join('')
      : '';

    await callGeneratePdf({
      templateType: 'MoveOutSummary',
      tenantName: tenant.name,
      phone: tenant.phone || '',
      room: summary.room || '',
      leaseStart: summary.leaseStart || '',
      leaseEnd: summary.leaseEnd || '',
      moveOutDate: summary.moveOutDate || '',
      moveOutReason: reasonLabel[summary.moveOutReason] || summary.moveOutReason || '',
      depositPaid: fmtAmt(moveOutData?.depositPaid ?? summary.depositPaid),
      electricitySettlement: fmtAmt(moveOutData?.electricitySettlement),
      waterSettlement: fmtAmt(moveOutData?.waterSettlement),
      deductionsHtml,
      depositRefund: fmtAmt(moveOutData?.depositRefund ?? summary.depositRefund),
      notes: moveOutData?.notes || '',
      today,
    }, `${tenant.name}_退租結清單_${moveOutDateStr}.pdf`);
    toast.success('退租結清單 PDF 已下載');

    // ── 合約 PDF（從 signed_contracts 撈原始表單資料重新產生）──
    try {
      const contractQ = query(
        collection(db, 'signed_contracts'),
        where('landlordUid', '==', authStore.effectiveUid),
        where('tenant', '==', tenant.name),
        orderBy('signedAt', 'desc'),
        limit(1),
      );
      const contractSnap = await getDocs(contractQ);
      if (!contractSnap.empty) {
        const cd = contractSnap.docs[0]!.data();
        function pText(val: string) {
          if (!val || val === 'none') return '無';
          if (val === 'landlord') return '由出租人負擔';
          if (val === 'tenant') return '由承租人負擔';
          return val;
        }
        const elec = pText(cd.feeElectricity);
        await callGeneratePdf({
          ...cd,
          feeWaterDisplay: pText(cd.feeWater),
          feeElectricityDisplay: cd.feeElectricityNote ? `${elec}（備註：${cd.feeElectricityNote}）` : elec,
          feeGasDisplay: pText(cd.feeGas),
          feeInternetDisplay: pText(cd.feeInternet),
          feeManagementDisplay: pText(cd.feeManagement),
          customArticle21Display: cd.customArticle21 || '',
          templateType: 'Contract',
        }, `${tenant.name}_租賃合約_${moveOutDateStr}.pdf`);
        toast.success('合約 PDF 已下載');
      }
    } catch (e) {
      console.warn('合約 PDF 下載失敗（非致命）:', e);
    }

    // 提示是否清除電表
    if (room && leaseStartMonth) {
      pendingClearTenant.value = tenant;
      showClearMeterModal.value = true;
    }
  } catch (e) {
    console.error('downloadTenantArchive error:', e);
    toast.error('下載失敗，請稍後再試');
  } finally {
    isDownloading.value = false;
  }
};

const clearMeterReadings = async () => {
  const tenant = pendingClearTenant.value;
  if (!tenant) return;
  isClearingMeter.value = true;
  try {
    const { writeBatch: wb } = await import('firebase/firestore');
    const summary = tenant.moveOutSummary || {};
    const room: string = summary.room || tenant.room || '';
    const leaseStartMonth: string = (summary.leaseStart || tenant.leaseStart || '').slice(0, 7);
    const moveOutMonth: string = (summary.moveOutDate || '').slice(0, 7);

    const meterSnap = await getDocs(query(
      collection(db, 'meter_readings'),
      where('landlordId', '==', authStore.effectiveUid),
      where('roomName', '==', room),
      where('yearMonth', '>=', leaseStartMonth),
      where('yearMonth', '<=', moveOutMonth),
    ));

    const BATCH_LIMIT = 400;
    let batch = wb(db);
    let count = 0;
    for (const d of meterSnap.docs) {
      batch.delete(d.ref);
      count++;
      if (count >= BATCH_LIMIT) { await batch.commit(); batch = wb(db); count = 0; }
    }
    if (count > 0) await batch.commit();

    toast.success(`已清除 ${meterSnap.size} 筆電表歷史（房間最終度數保留為下個租客基準）`);
    showClearMeterModal.value = false;
    pendingClearTenant.value = null;
  } catch (e) {
    console.error('clearMeterReadings error:', e);
    toast.error('清除失敗，請稍後再試');
  } finally {
    isClearingMeter.value = false;
  }
};

// --- Move-out Wizard ---
const showMoveOutWizard = ref(false);
const openMoveOutWizard = () => { showMoveOutWizard.value = true; };
const onMoveOutCompleted = () => {
  showMoveOutWizard.value = false;
  closeDrawer();
};

// --- Unbind Room ---
const isUnbinding = ref(false);
const unbindRoom = async (tenant: Tenant) => {
  if (!tenant.room) return;
  if (!confirm(`確定要解除「${tenant.name}」與房間「${tenant.room}」的綁定嗎？\n此操作將把房間狀態改回空房，並停用目前合約。`)) return;
  isUnbinding.value = true;
  try {
    // 清除租客文件的房間資訊
    await updateDoc(doc(db, 'tenants', tenant.id), {
      room: '',
      leaseStart: '',
      leaseEnd: '',
      leaseDuration: 0,
      rent: 0,
      updatedAt: serverTimestamp(),
    });

    // 將房間狀態改回空房
    const boundRoom = availableRooms.value.find(r => r.name === tenant.room);
    if (boundRoom) {
      await updateDoc(doc(db, 'rooms', boundRoom.id), {
        status: 'vacant',
        tenantName: '',
        leaseEnd: '',
      });
    }

    // 將合約標記為 inactive
    if (tenant.contractId) {
      await updateDoc(doc(db, 'contracts', tenant.contractId), {
        status: 'inactive',
        updatedAt: serverTimestamp(),
      });
    }

    toast.success('已解除房間綁定');
    drawerEditing.value = false;
    // drawerTenant 會透過 onSnapshot 自動更新
    await fetchRooms();
  } catch (e) {
    console.error('unbindRoom error:', e);
    toast.error('解除綁定失敗，請稍後再試');
  } finally {
    isUnbinding.value = false;
  }
};

// --- Delete Tenant ---
const isDeleting = ref(false);
const deleteTenant = async (tenant: Tenant) => {
  if (tenant.room) {
    toast.warning('請先解除房間綁定，再刪除租客');
    return;
  }
  if (!confirm(`確定要刪除租客「${tenant.name}」的所有資料嗎？\n此操作無法復原。`)) return;
  isDeleting.value = true;
  try {
    await deleteDoc(doc(db, 'tenants', tenant.id));
    toast.success('已刪除租客資料');
    closeDrawer();
  } catch (e) {
    console.error('deleteTenant error:', e);
    toast.error('刪除失敗，請稍後再試');
  } finally {
    isDeleting.value = false;
  }
};

const getDepositLabel = (tenant: Tenant): string => {
  const deps = tenant.deposits || [];
  const paid = deps.filter(d => d.status === 'paid').length;
  if (paid === deps.length && deps.length > 0) return '全部已收';
  if (paid === 0) return '待收款';
  return `${paid}/${deps.length} 已收`;
};

const getDepositBadgeClass = (tenant: Tenant): string => {
  const deps = tenant.deposits || [];
  const paid = deps.filter(d => d.status === 'paid').length;
  if (paid === deps.length && deps.length > 0) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (paid === 0) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
};
</script>

<style scoped>
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-slide-enter-active .drawer-panel,
.drawer-slide-leave-active .drawer-panel {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
}
.drawer-slide-enter-from .drawer-panel,
.drawer-slide-leave-to .drawer-panel {
  transform: translateX(100%);
}
</style>
