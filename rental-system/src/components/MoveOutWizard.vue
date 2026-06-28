<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-out-modal-title"
        class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]"
      >

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 id="move-out-modal-title" class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-red-500" aria-hidden="true">exit_to_app</span>
            辦理退租
          </h2>
          <button @click="$emit('close')" aria-label="關閉" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span class="material-symbols-outlined text-gray-500" aria-hidden="true">close</span>
          </button>
        </div>

        <!-- Step indicator -->
        <div class="px-6 py-3 flex items-center border-b border-gray-50 dark:border-gray-800 shrink-0">
          <template v-for="(s, i) in steps" :key="s.id">
            <div class="flex items-center gap-1.5 shrink-0">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                :class="step > s.id ? 'bg-green-500 text-white' : step === s.id ? 'bg-gold-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'">
                <span v-if="step > s.id" class="material-symbols-outlined text-[14px]">check</span>
                <span v-else>{{ s.id }}</span>
              </div>
              <span class="text-xs font-medium hidden sm:block"
                :class="step === s.id ? 'text-gold-600 dark:text-gold-400' : 'text-text-secondary-light'">{{ s.label }}</span>
            </div>
            <div v-if="i < steps.length - 1" class="flex-1 h-0.5 mx-2"
              :class="step > s.id ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'"></div>
          </template>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-5">

          <!-- ── STEP 1: 退租資訊 ── -->
          <template v-if="step === 1">
            <div class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl space-y-2.5 text-sm">
              <div class="flex justify-between">
                <span class="text-text-secondary-light">租客</span>
                <span class="font-semibold">{{ tenant.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-secondary-light">房間</span>
                <span class="font-semibold">{{ tenant.room }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-secondary-light">租約期間</span>
                <span class="font-semibold text-right">{{ tenant.leaseStart || '—' }} ~ {{ tenant.leaseEnd || '—' }}</span>
              </div>
            </div>

            <div>
              <label for="moveout-date" class="block text-sm font-medium text-text-secondary-light mb-1">實際退租日</label>
              <input id="moveout-date" v-model="moveOutDate" type="date" class="form-input" />
            </div>

            <div>
              <label for="moveout-reason" class="block text-sm font-medium text-text-secondary-light mb-1">退租原因</label>
              <select id="moveout-reason" v-model="moveOutReason" class="form-input">
                <option value="expired">到期退租</option>
                <option value="early">提前退租</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div v-if="loadingData" class="flex items-center gap-2 text-sm text-text-secondary-light py-2">
              <span class="material-symbols-outlined animate-spin text-[18px]">sync</span>
              載入資料中...
            </div>

            <div v-else-if="unpaidBillCount > 0"
              class="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm">
              <span class="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5">warning</span>
              <p class="text-amber-700 dark:text-amber-300">
                尚有 <strong>{{ unpaidBillCount }} 筆</strong>未收帳單，合計
                <strong>NT$ {{ unpaidBillAmount.toLocaleString() }}</strong>，退租後仍可手動結清。
              </p>
            </div>
          </template>

          <!-- ── STEP 2: 物品點交 ── -->
          <template v-if="step === 2">
            <div v-if="moveOutItems.length === 0"
              class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl text-sm text-text-secondary-light text-center space-y-1">
              <p>此租客無入住點交清單，可略過本步驟。</p>
              <p class="text-xs">提示：日後可於租客抽屜先建立「入住點交」，退租時即自動帶入逐項點交。</p>
            </div>
            <template v-else>
              <p class="text-xs text-text-secondary-light">依入住清單逐項點交，標記退租狀況；賠償＝單價 × 數量 × 比例，將自動併入押金扣款。</p>

              <div v-for="(item, i) in moveOutItems" :key="i"
                class="p-3 rounded-xl border transition-colors"
                :class="item.moveOutCondition === 'normal'
                  ? 'border-gray-100 dark:border-gray-800'
                  : item.moveOutCondition === 'minor'
                    ? 'border-gold-200 dark:border-gold-800 bg-gold-50/40 dark:bg-gold-900/10'
                    : 'border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-900/10'">
                <div class="flex justify-between items-center">
                  <span class="font-medium text-sm">{{ item.name }}
                    <span class="text-text-secondary-light text-xs">×{{ item.quantity }}</span>
                  </span>
                  <span class="text-xs text-text-secondary-light">單價 NT$ {{ (item.unitPrice || 0).toLocaleString() }}</span>
                </div>
                <p v-if="item.moveInCondition !== 'normal'" class="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                  入住既有狀況：{{ CONDITION_LABELS[item.moveInCondition] }}<span v-if="item.moveInNote">（{{ item.moveInNote }}）</span>
                </p>
                <div class="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label class="block text-[10px] text-text-secondary-light mb-0.5">退租狀況</label>
                    <select v-model="item.moveOutCondition" @change="onConditionChange(item)" class="form-input text-sm">
                      <option value="normal">正常</option>
                      <option value="minor">輕微毀損</option>
                      <option value="total">完全毀損</option>
                    </select>
                  </div>
                  <div v-if="item.moveOutCondition !== 'normal'">
                    <label class="block text-[10px] text-text-secondary-light mb-0.5">賠償比例 %</label>
                    <input type="number" min="0" max="100"
                      :value="Math.round(item.ratio * 100)"
                      @input="item.ratio = (Number(($event.target as HTMLInputElement).value) || 0) / 100"
                      class="form-input text-sm" />
                  </div>
                </div>
                <div v-if="item.moveOutCondition !== 'normal'" class="flex justify-between mt-1.5 text-sm">
                  <span class="text-text-secondary-light">賠償金額</span>
                  <span class="font-semibold text-red-600 dark:text-red-400">NT$ {{ rowComp(item).toLocaleString() }}</span>
                </div>
              </div>

              <div class="flex justify-between items-center p-3 bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700 rounded-xl text-sm font-bold">
                <span class="text-gold-700 dark:text-gold-300">物品賠償合計（{{ damagedCount }} 項毀損）</span>
                <span class="text-red-600 dark:text-red-400">NT$ {{ damageTotal.toLocaleString() }}</span>
              </div>
              <p class="text-[11px] text-text-secondary-light text-center">完成點交與費用結清後，可於最後一步「確認執行」簽名並下載含簽名的點交清單。</p>
            </template>
          </template>

          <!-- ── STEP 3: 費用結清 ── -->
          <template v-if="step === 3">

            <!-- Paid deposits -->
            <div class="space-y-2">
              <p class="text-xs font-bold text-text-secondary-light uppercase tracking-wide">已收押金</p>
              <div class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl text-sm space-y-2">
                <div v-if="paidDeposits.length === 0" class="text-text-secondary-light text-xs">無已收押金記錄</div>
                <div v-for="dep in paidDeposits" :key="dep.label" class="flex justify-between">
                  <span class="text-text-secondary-light">{{ dep.label }}</span>
                  <span class="font-medium text-green-600 dark:text-green-400">NT$ {{ dep.amount.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-semibold">
                  <span>押金合計</span>
                  <span>NT$ {{ totalDepositPaid.toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- Electricity settlement -->
            <div class="space-y-2">
              <p class="text-xs font-bold text-text-secondary-light uppercase tracking-wide">電費結清</p>
              <div class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl text-sm space-y-3">
                <div class="flex justify-between">
                  <span class="text-text-secondary-light">基準度數（上次）</span>
                  <span class="font-medium">{{ lastMeterReading !== null ? lastMeterReading + ' 度' : '無資料' }}</span>
                </div>
                <div>
                  <label for="moveout-meter-reading" class="block text-text-secondary-light mb-1">退租時電表度數</label>
                  <input id="moveout-meter-reading" v-model.number="finalMeterReading" type="number" min="0" class="form-input"
                    placeholder="請輸入電表讀數（可留空）" />
                </div>
                <template v-if="electricityUsage !== null && finalMeterReading !== null">
                  <div class="flex justify-between text-text-secondary-light">
                    <span>本期用電</span>
                    <span class="font-medium text-text-primary-light dark:text-text-primary-dark">{{ electricityUsage }} 度</span>
                  </div>
                  <!-- Fixed mode: auto calc -->
                  <template v-if="elecMode === 'fixed'">
                    <div class="flex justify-between font-medium">
                      <span class="text-text-secondary-light">電費（固定 {{ fixedRate }} 元/度）</span>
                      <span class="text-orange-600">NT$ {{ autoElecAmount.toLocaleString() }}</span>
                    </div>
                    <label class="flex items-center gap-2 text-xs text-text-secondary-light cursor-pointer">
                      <input type="checkbox" v-model="overrideElec" class="rounded" />
                      手動調整電費金額
                    </label>
                    <input v-if="overrideElec" v-model.number="electricityAmount" type="number" min="0" class="form-input"
                      placeholder="手動輸入電費" />
                  </template>
                  <!-- Non-fixed: manual only -->
                  <template v-else>
                    <div class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                      計費模式：{{ elecModeLabel }}，請手動輸入電費金額
                    </div>
                    <input v-model.number="electricityAmount" type="number" min="0" class="form-input"
                      placeholder="電費金額（NT$）" />
                  </template>
                </template>
                <div v-else class="text-xs text-text-secondary-light">
                  輸入電表度數後自動計算，或留空不計電費
                </div>
              </div>
            </div>

            <!-- Water settlement -->
            <div class="space-y-2">
              <p class="text-xs font-bold text-text-secondary-light uppercase tracking-wide">水費結清（選填）</p>
              <div class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl">
                <input v-model.number="waterAmount" type="number" min="0" class="form-input"
                  placeholder="若無水費欠款請留空" />
              </div>
            </div>

            <!-- Deductions -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-bold text-text-secondary-light uppercase tracking-wide">損壞扣款（選填）</p>
                <button @click="addDeduction"
                  class="text-xs text-gold-600 hover:text-gold-700 font-medium flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">add</span>新增
                </button>
              </div>
              <div v-if="deductions.length > 0" class="space-y-2">
                <div v-for="(d, i) in deductions" :key="i" class="flex gap-2 items-center">
                  <input v-model="d.label" type="text" class="form-input flex-1 text-sm" placeholder="說明（如：牆壁修繕）" />
                  <input v-model.number="d.amount" type="number" min="0" class="form-input w-28 text-sm" placeholder="金額" />
                  <button @click="deductions.splice(i, 1)" class="text-red-400 hover:text-red-600 shrink-0">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Refund calculation -->
            <div class="p-4 bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700 rounded-xl space-y-2 text-sm">
              <p class="text-xs font-bold text-gold-700 dark:text-gold-300 uppercase tracking-wide mb-2">應退押金計算</p>
              <div class="flex justify-between text-text-secondary-light">
                <span>押金合計</span>
                <span>NT$ {{ totalDepositPaid.toLocaleString() }}</span>
              </div>
              <div v-if="effectiveElecAmount > 0" class="flex justify-between text-orange-600 dark:text-orange-400">
                <span>－ 電費</span>
                <span>NT$ {{ effectiveElecAmount.toLocaleString() }}</span>
              </div>
              <div v-if="(waterAmount || 0) > 0" class="flex justify-between text-orange-600 dark:text-orange-400">
                <span>－ 水費</span>
                <span>NT$ {{ (waterAmount || 0).toLocaleString() }}</span>
              </div>
              <div v-for="(d, di) in effectiveDeductions" :key="di"
                class="flex justify-between text-red-600 dark:text-red-400">
                <span>－ {{ d.label || '扣款' }}</span>
                <span>NT$ {{ d.amount.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between font-bold text-base pt-2 border-t border-gold-200 dark:border-gold-700">
                <span>應退金額</span>
                <span class="text-gold-700 dark:text-gold-300">NT$ {{ computedRefund.toLocaleString() }}</span>
              </div>
              <label class="flex items-center gap-2 text-xs text-text-secondary-light cursor-pointer pt-1">
                <input type="checkbox" v-model="overrideRefund" class="rounded" />
                手動調整退還金額
              </label>
              <input v-if="overrideRefund" v-model.number="depositRefundOverride" type="number" min="0" class="form-input" />
            </div>
          </template>

          <!-- ── STEP 4: 確認執行 ── -->
          <template v-if="step === 4">
            <div class="space-y-4 text-sm">
              <p class="text-xs font-bold text-text-secondary-light uppercase tracking-wide">退租摘要</p>
              <div class="p-4 bg-surface-light dark:bg-surface-dark rounded-xl space-y-2.5">
                <div class="flex justify-between">
                  <span class="text-text-secondary-light">租客</span>
                  <span class="font-semibold">{{ tenant.name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary-light">退租房間</span>
                  <span class="font-semibold">{{ tenant.room }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary-light">退租日期</span>
                  <span class="font-semibold">{{ moveOutDate }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary-light">退租原因</span>
                  <span>{{ moveOutReasonLabel }}</span>
                </div>
                <template v-if="effectiveElecAmount > 0">
                  <div class="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>電費結清</span>
                    <span>NT$ {{ effectiveElecAmount.toLocaleString() }}</span>
                  </div>
                </template>
                <template v-if="(waterAmount || 0) > 0">
                  <div class="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>水費結清</span>
                    <span>NT$ {{ (waterAmount || 0).toLocaleString() }}</span>
                  </div>
                </template>
                <div v-for="(d, di) in effectiveDeductions" :key="di"
                  class="flex justify-between text-red-600 dark:text-red-400">
                  <span>{{ d.label }}</span>
                  <span>NT$ {{ d.amount.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>應退押金</span>
                  <span class="text-gold-700 dark:text-gold-400">NT$ {{ finalRefundAmount.toLocaleString() }}</span>
                </div>
                <div v-if="unpaidBillCount > 0" class="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>未收帳單</span>
                  <span>{{ unpaidBillCount }} 筆（NT$ {{ unpaidBillAmount.toLocaleString() }}）</span>
                </div>
              </div>

              <div class="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl">
                <p class="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2">確認後將自動執行：</p>
                <ul class="space-y-1.5 text-xs text-blue-700 dark:text-blue-300">
                  <li class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                    合約標記為「已終止」
                  </li>
                  <li class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                    房間改回「空房」，最終度數設為下個租客電費基準
                  </li>
                  <li class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                    新增押金退還帳務記錄
                  </li>
                  <li class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                    清除租客租約資料（保留歷史檔案）
                  </li>
                  <li class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                    建立退租紀錄存檔
                  </li>
                </ul>
              </div>

              <div>
                <label for="moveout-notes" class="block text-sm font-medium text-text-secondary-light mb-1">備註（選填）</label>
                <textarea id="moveout-notes" v-model="notes" class="form-input min-h-[60px]"
                  placeholder="點交說明、特殊事項等..."></textarea>
              </div>

              <!-- 雙方簽名 -->
              <div class="space-y-2">
                <p class="text-xs font-bold text-text-secondary-light uppercase tracking-wide">雙方簽名</p>
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p class="text-[11px] text-text-secondary-light mb-1">出租人（房東）</p>
                    <div class="h-14 flex items-end">
                      <img v-if="landlordSignature" :src="landlordSignature" alt="房東簽名" class="max-h-14 max-w-full object-contain" />
                      <span v-else class="text-[11px] text-text-secondary-light">未設定，將留白<br>（可至設定 → 我的簽名）</span>
                    </div>
                  </div>
                  <div class="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p class="text-[11px] text-text-secondary-light mb-1">承租人（租客）</p>
                    <div class="h-14 flex items-end justify-between gap-2">
                      <img v-if="tenantSignature" :src="tenantSignature" alt="租客簽名" class="max-h-14 max-w-[60%] object-contain" />
                      <span v-else class="text-[11px] text-text-secondary-light">尚未簽名</span>
                      <button @click="showSignPad = true"
                        class="shrink-0 px-2.5 py-1.5 rounded-lg bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition-colors">
                        {{ tenantSignature ? '重簽' : '請租客簽名' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button @click="previewHandover" :disabled="isPreviewingHandover"
                class="w-full py-2.5 rounded-xl border border-gold-300 dark:border-gold-700 text-gold-700 dark:text-gold-300 text-sm font-bold hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-[18px]" :class="{ 'animate-spin': isPreviewingHandover }">{{ isPreviewingHandover ? 'sync' : 'print' }}</span>
                下載退租點交清單（含簽名）
              </button>
            </div>
          </template>

        </div>

        <!-- 結清單預覽 / 下載（確認退租前） -->
        <div v-if="step === lastStep" class="px-6 pt-1 shrink-0">
          <button @click="previewSettlement" :disabled="isPreviewingSettlement"
            class="w-full py-2.5 rounded-xl border border-gold-300 dark:border-gold-700 text-gold-700 dark:text-gold-300 text-sm font-bold hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]" :class="{ 'animate-spin': isPreviewingSettlement }">{{ isPreviewingSettlement ? 'sync' : 'preview' }}</span>
            預覽 / 下載退租結清單
          </button>
          <p class="mt-1.5 text-[11px] text-text-secondary-light text-center">確認退租前可先預覽，於列印視窗選「另存為 PDF」下載交付租客</p>
        </div>

        <!-- Footer actions -->
        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 shrink-0">
          <button v-if="step > 1" @click="step--" :disabled="isExecuting"
            class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-text-secondary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
            ← 上一步
          </button>
          <button v-if="step < lastStep" @click="nextStep" :disabled="loadingData"
            class="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors disabled:opacity-50 shadow-md">
            下一步 →
          </button>
          <button v-if="step === lastStep" @click="execute" :disabled="isExecuting"
            class="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50 shadow-md flex items-center justify-center gap-2">
            <span v-if="isExecuting" class="material-symbols-outlined animate-spin text-[16px]">sync</span>
            {{ isExecuting ? '處理中...' : '確認退租' }}
          </button>
        </div>

      </div>
    </div>

    <Signature v-model:visible="showSignPad" @confirm="onTenantSignConfirm" />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { db } from '../firebase/config';
import { useToastStore } from '../stores/toast';
import {
  collection, query, where, getDocs, getDoc, addDoc, updateDoc,
  doc, serverTimestamp, orderBy, limit,
} from 'firebase/firestore';
import { printHtmlPdf } from '../utils/contractRender';
import { amountToChineseCapital } from '../utils/chineseAmount';
import moveoutSummaryTemplate from '../templates/moveoutSummary.html?raw';
import handoverChecklistTemplate from '../templates/handoverChecklist.html?raw';
import {
  CONDITION_LABELS, defaultRatioFor, calcCompensation,
  type Condition, type InspectionItem,
} from '../utils/inventory';
import Signature from './Signature.vue';
import { loadLandlordSignature, BLANK_PIXEL } from '../utils/signature';

interface Tenant {
  id: string;
  name: string;
  room: string;
  phone?: string;
  leaseStart?: string;
  leaseEnd?: string;
  rent?: number;
  contractId?: string;
  uid?: string;
  moveInInspection?: { inspectedAt?: any; items?: InspectionItem[] };
}

interface DepositItem {
  label: string;
  amount: number;
  status: 'paid' | 'unpaid';
}

const props = defineProps<{ tenant: Tenant; landlordId: string }>();
const emit = defineEmits<{ close: []; completed: [] }>();
const toast = useToastStore();

// ── Steps ──
const steps = [
  { id: 1, label: '退租資訊' },
  { id: 2, label: '物品點交' },
  { id: 3, label: '費用結清' },
  { id: 4, label: '確認執行' },
];
const step = ref(1);
const lastStep = steps.length;

// ── Step 1 ──
const moveOutDate = ref(new Date().toISOString().split('T')[0] as string);
const moveOutReason = ref<'expired' | 'early' | 'other'>('expired');
const moveOutReasonLabel = computed(() =>
  ({ expired: '到期退租', early: '提前退租', other: '其他' }[moveOutReason.value])
);
const loadingData = ref(true);
const unpaidBillCount = ref(0);
const unpaidBillAmount = ref(0);

// ── Step 2: Deposits ──
const paidDeposits = ref<DepositItem[]>([]);
const totalDepositPaid = computed(() => paidDeposits.value.reduce((s, d) => s + d.amount, 0));

// ── Step 2: Electricity ──
const lastMeterReading = ref<number | null>(null);
const finalMeterReading = ref<number | null>(null);
const electricityUsage = computed(() => {
  if (finalMeterReading.value === null || lastMeterReading.value === null) return null;
  return Math.max(0, finalMeterReading.value - lastMeterReading.value);
});
const elecMode = ref('fixed');
const elecModeLabel = computed(() =>
  ({ fixed: '固定費率', tiered: '獨立累進費率', bill_share: '帳單分攤制' }[elecMode.value] ?? elecMode.value)
);
const fixedRate = ref(5);
const autoElecAmount = computed(() => {
  if (elecMode.value === 'fixed' && electricityUsage.value !== null)
    return Math.round(electricityUsage.value * fixedRate.value);
  return 0;
});
const overrideElec = ref(false);
const electricityAmount = ref(0);
const effectiveElecAmount = computed(() => {
  if (elecMode.value === 'fixed' && !overrideElec.value) return autoElecAmount.value;
  return electricityAmount.value || 0;
});

// ── Step 2: 物品點交 ──
interface MoveOutItem {
  name: string;
  quantity: number;
  unitPrice: number;
  moveInCondition: Condition;
  moveInNote: string;
  moveOutCondition: Condition;
  ratio: number;
}
const moveOutItems = ref<MoveOutItem[]>([]);
const loadInspection = () => {
  const src = props.tenant.moveInInspection?.items || [];
  moveOutItems.value = src
    .filter(it => it.present)
    .map(it => ({
      name: it.name,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      moveInCondition: it.condition || 'normal',
      moveInNote: it.note || '',
      moveOutCondition: 'normal' as Condition,
      ratio: 0,
    }));
};
const onConditionChange = (item: MoveOutItem) => { item.ratio = defaultRatioFor(item.moveOutCondition); };
const rowComp = (item: MoveOutItem) => calcCompensation(item.unitPrice, item.quantity, item.ratio);
const damageTotal = computed(() => moveOutItems.value.reduce((s, it) => s + rowComp(it), 0));
const damagedCount = computed(() => moveOutItems.value.filter(it => it.moveOutCondition !== 'normal').length);

// ── Step 3: Water & Deductions ──
const waterAmount = ref(0);
const deductions = ref<{ label: string; amount: number }[]>([]);
const addDeduction = () => deductions.value.push({ label: '', amount: 0 });
// 手動扣款 + 物品賠償（自動一筆），供結算、結清單、存檔共用
const effectiveDeductions = computed(() => {
  const base = deductions.value.filter(d => (d.amount || 0) > 0);
  return damageTotal.value > 0 ? [...base, { label: '物品賠償', amount: damageTotal.value }] : base;
});
const totalDeductions = computed(() => effectiveDeductions.value.reduce((s, d) => s + (d.amount || 0), 0));

// ── Step 2: Refund ──
const computedRefund = computed(() =>
  Math.max(0, totalDepositPaid.value - effectiveElecAmount.value - (waterAmount.value || 0) - totalDeductions.value)
);
const overrideRefund = ref(false);
const depositRefundOverride = ref(0);
const finalRefundAmount = computed(() =>
  overrideRefund.value ? (depositRefundOverride.value || 0) : computedRefund.value
);

// ── Step 4 ──
const notes = ref('');
const isExecuting = ref(false);

// ── 雙方簽名（房東自設定帶入、租客當場簽） ──
const landlordSignature = ref('');
const tenantSignature = ref('');
const showSignPad = ref(false);
const onTenantSignConfirm = (img: string) => { tenantSignature.value = img; };

// ── Data loading ──
onMounted(async () => {
  try {
    loadInspection();
    await Promise.all([
      loadSettings(), loadUnpaidBills(), loadDeposits(), loadLastMeterReading(),
      loadLandlordSignature(props.landlordId).then(img => { landlordSignature.value = img; }),
    ]);
  } catch (e) {
    console.warn('MoveOutWizard load error:', e);
  } finally {
    loadingData.value = false;
  }
});

const loadSettings = async () => {
  try {
    const snap = await getDoc(doc(db, 'settings', props.landlordId));
    if (snap.exists()) {
      const s = snap.data();
      elecMode.value = s.mode || 'fixed';
      fixedRate.value = s.fixedRate || 5;
    }
  } catch { /* settings may not exist */ }
};

const loadUnpaidBills = async () => {
  const snap = await getDocs(query(
    collection(db, 'bills'),
    where('landlordId', '==', props.landlordId),
    where('relatedTenantDocId', '==', props.tenant.id),
    where('status', 'in', ['pending', 'overdue']),
    where('type', '==', 'income'),
  ));
  unpaidBillCount.value = snap.size;
  unpaidBillAmount.value = snap.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0);
};

const loadDeposits = async () => {
  if (!props.tenant.contractId) return;
  const snap = await getDoc(doc(db, 'contracts', props.tenant.contractId));
  if (!snap.exists()) return;
  const deps = (snap.data().deposits || []) as DepositItem[];
  paidDeposits.value = deps.filter(d => d.status === 'paid');
};

const loadLastMeterReading = async () => {
  // Try rooms document first (fastest path)
  const roomSnap = await getDocs(query(
    collection(db, 'rooms'),
    where('landlordId', '==', props.landlordId),
    where('name', '==', props.tenant.room),
  ));
  if (!roomSnap.empty) {
    const rd = roomSnap.docs[0]!.data();
    if (rd.lastMeterReading !== undefined) {
      lastMeterReading.value = rd.lastMeterReading;
      return;
    }
  }
  // Fallback: latest meter_readings record
  const readSnap = await getDocs(query(
    collection(db, 'meter_readings'),
    where('landlordId', '==', props.landlordId),
    where('roomName', '==', props.tenant.room),
    orderBy('yearMonth', 'desc'),
    limit(1),
  ));
  if (!readSnap.empty) {
    lastMeterReading.value = readSnap.docs[0]!.data().currentReading ?? null;
  }
};

// ── Navigation ──
const nextStep = () => {
  if (step.value === 1 && !moveOutDate.value) {
    toast.warning('請選擇退租日期');
    return;
  }
  step.value++;
};

// ── 退租結清單預覽 / 下載 ──
const fmtAmt = (v: any) => (v != null && v !== '') ? `NT$ ${Number(v).toLocaleString()}` : '—';
const buildSettlementData = () => {
  const deductionsHtml = effectiveDeductions.value
    .map(d => `<tr><td class="k neg">扣款：${d.label || '其他'}</td><td class="v neg">－ ${fmtAmt(d.amount)}</td></tr>`)
    .join('');
  const refund = Number(finalRefundAmount.value) || 0;
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    tenantName: props.tenant.name,
    phone: props.tenant.phone || '',
    room: props.tenant.room || '',
    leaseStart: props.tenant.leaseStart || '',
    leaseEnd: props.tenant.leaseEnd || '',
    moveOutDate: moveOutDate.value || '',
    moveOutReason: moveOutReasonLabel.value || '',
    depositPaid: fmtAmt(totalDepositPaid.value),
    electricitySettlement: fmtAmt(effectiveElecAmount.value),
    waterSettlement: fmtAmt(waterAmount.value),
    deductionsHtml,
    depositRefund: fmtAmt(finalRefundAmount.value),
    refundWords: refund > 0 ? amountToChineseCapital(refund) : '',
    notes: notes.value || '',
    today: now.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    settlementNo: `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`,
    landlordSignature: landlordSignature.value || BLANK_PIXEL,
    tenantSignature: tenantSignature.value || BLANK_PIXEL,
  };
};

const isPreviewingSettlement = ref(false);
const previewSettlement = async () => {
  isPreviewingSettlement.value = true;
  try {
    await printHtmlPdf(moveoutSummaryTemplate, buildSettlementData(), `退租結清單_${props.tenant.name}`);
  } catch (e) {
    console.error('預覽退租結清單失敗:', e);
    toast.error('預覽結清單失敗，請稍後再試');
  } finally {
    isPreviewingSettlement.value = false;
  }
};

// ── 退租點交清單 PDF（本地組裝） ──
const condTag = (c: Condition) => {
  const cls = c === 'normal' ? 'ok' : c === 'minor' ? 'minor' : 'total';
  return `<span class="tag ${cls}">${CONDITION_LABELS[c]}</span>`;
};
const buildHandoverData = () => {
  const itemRows = moveOutItems.value.map(it => {
    const comp = rowComp(it);
    return `<tr>
      <td>${it.name}</td>
      <td class="num">${it.quantity}</td>
      <td class="ctr">${condTag(it.moveInCondition)}</td>
      <td class="ctr">${condTag(it.moveOutCondition)}</td>
      <td class="num">NT$ ${(Number(it.unitPrice) || 0).toLocaleString()}</td>
      <td class="num comp ${comp > 0 ? '' : 'zero'}">${comp > 0 ? `NT$ ${comp.toLocaleString()}` : '—'}</td>
    </tr>`;
  }).join('');
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    tenantName: props.tenant.name,
    room: props.tenant.room || '',
    leaseStart: props.tenant.leaseStart || '',
    leaseEnd: props.tenant.leaseEnd || '',
    moveOutDate: moveOutDate.value || '',
    itemRows: itemRows || '<tr><td colspan="6" style="text-align:center;color:#6F6049;padding:14px">無入住點交清單，本次無物品點交</td></tr>',
    compensationTotal: `NT$ ${damageTotal.value.toLocaleString()}`,
    totalZeroClass: damageTotal.value > 0 ? '' : 'zero',
    notes: notes.value || '',
    today: now.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    handoverNo: `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`,
    landlordSignature: landlordSignature.value || BLANK_PIXEL,
    tenantSignature: tenantSignature.value || BLANK_PIXEL,
  };
};

const isPreviewingHandover = ref(false);
const previewHandover = async () => {
  isPreviewingHandover.value = true;
  try {
    await printHtmlPdf(handoverChecklistTemplate, buildHandoverData(), `退租點交清單_${props.tenant.name}`);
  } catch (e) {
    console.error('預覽退租點交清單失敗:', e);
    toast.error('預覽點交清單失敗，請稍後再試');
  } finally {
    isPreviewingHandover.value = false;
  }
};

// ── Execute ──
const execute = async () => {
  isExecuting.value = true;
  try {
    const today = new Date().toISOString().split('T')[0] as string;

    const moveOutPayload = {
      moveOutDate: moveOutDate.value,
      moveOutReason: moveOutReason.value,
      finalMeterReading: finalMeterReading.value,
      electricitySettlement: effectiveElecAmount.value,
      waterSettlement: waterAmount.value || 0,
      deductions: effectiveDeductions.value,
      depositPaid: totalDepositPaid.value,
      depositRefund: finalRefundAmount.value,
      notes: notes.value,
      moveOutInspection: {
        total: damageTotal.value,
        items: moveOutItems.value.map(it => ({
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          moveInCondition: it.moveInCondition,
          moveOutCondition: it.moveOutCondition,
          ratio: it.ratio,
          compensation: rowComp(it),
        })),
      },
      signatures: {
        landlord: landlordSignature.value || '',
        tenant: tenantSignature.value || '',
        signedAt: today,
      },
    };

    // 1. Terminate contract
    if (props.tenant.contractId) {
      await updateDoc(doc(db, 'contracts', props.tenant.contractId), {
        status: 'terminated',
        ...moveOutPayload,
        terminatedAt: serverTimestamp(),
      });
    }

    // 2. Update tenant doc: clear lease, mark historical
    await updateDoc(doc(db, 'tenants', props.tenant.id), {
      isHistorical: true,
      room: '',
      leaseStart: '',
      leaseEnd: '',
      rent: 0,
      contractId: '',
      moveOutSummary: {
        room: props.tenant.room,
        leaseStart: props.tenant.leaseStart || '',
        leaseEnd: props.tenant.leaseEnd || '',
        moveOutDate: moveOutDate.value,
        moveOutReason: moveOutReason.value,
        depositRefund: finalRefundAmount.value,
        contractId: props.tenant.contractId || '',
      },
      updatedAt: serverTimestamp(),
    });

    // 3. Reset room to vacant, store final meter reading as baseline
    const roomSnap = await getDocs(query(
      collection(db, 'rooms'),
      where('landlordId', '==', props.landlordId),
      where('name', '==', props.tenant.room),
    ));
    if (!roomSnap.empty) {
      const roomUpdate: Record<string, any> = {
        status: 'vacant',
        tenantName: '',
        leaseEnd: '',
      };
      if (finalMeterReading.value !== null) {
        roomUpdate.lastMeterReading = finalMeterReading.value;
        roomUpdate.lastMeterDate = moveOutDate.value;
      }
      await updateDoc(roomSnap.docs[0]!.ref, roomUpdate);
    }

    // 4. Create deposit refund bill (expense)
    if (finalRefundAmount.value > 0) {
      await addDoc(collection(db, 'bills'), {
        landlordId: props.landlordId,
        tenantId: props.tenant.uid || null,
        relatedTenantDocId: props.tenant.id,
        relatedContractId: props.tenant.contractId || null,
        date: today,
        type: 'expense',
        category: '押金退還',
        description: `${props.tenant.name} 退租押金退還`,
        amount: finalRefundAmount.value,
        status: 'completed',
        createdAt: serverTimestamp(),
      });
    }

    // 5. Create moveOutRecord (permanent summary)
    await addDoc(collection(db, 'moveOutRecords'), {
      landlordId: props.landlordId,
      tenantDocId: props.tenant.id,
      contractId: props.tenant.contractId || null,
      tenantName: props.tenant.name,
      room: props.tenant.room,
      leaseStart: props.tenant.leaseStart || '',
      leaseEnd: props.tenant.leaseEnd || '',
      ...moveOutPayload,
      createdAt: serverTimestamp(),
    });

    toast.success(`${props.tenant.name} 退租手續已完成`);
    emit('completed');
  } catch (e) {
    console.error('MoveOutWizard execute error:', e);
    toast.error('退租處理失敗，請稍後再試');
  } finally {
    isExecuting.value = false;
  }
};
</script>
