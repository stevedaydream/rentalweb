<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close"></div>

    <div role="dialog" aria-modal="true" aria-labelledby="terms-modal-title"
      class="relative bg-white dark:bg-card-dark rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
      <div class="p-6 border-b border-ink-100 dark:border-ink-700 flex justify-between items-start gap-3 shrink-0">
        <div>
          <h2 id="terms-modal-title" class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">合約附件設定</h2>
          <p class="text-xs text-text-secondary-light mt-0.5">{{ property?.name }}：之後在這棟簽的合約會帶入以下內容，已簽的合約不受影響。</p>
        </div>
        <button @click="close" aria-label="關閉" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="p-6 space-y-8 overflow-y-auto">
        <div class="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-surface-light dark:bg-surface-dark text-xs">
          <span class="flex-1 text-text-secondary-light">可一鍵帶入復興路版本（頂樓增建、1室1衛、修繕明細與賠償價目表），再依本棟狀況調整。</span>
          <button type="button" @click="applyPreset"
            class="px-3 py-1.5 rounded-lg border border-gold-400 text-gold-700 dark:text-gold-300 font-bold hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors">
            套用復興路版本
          </button>
        </div>

        <!-- 第一條 -->
        <section class="space-y-2">
          <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">租賃範圍（第一條）</h3>
          <div class="flex gap-4 text-sm">
            <label class="flex items-center gap-2"><input type="radio" value="whole" v-model="local.leaseScope"> 整棟／整層出租（全部）</label>
            <label class="flex items-center gap-2"><input type="radio" value="partial" v-model="local.leaseScope"> 分租房間（部分）</label>
          </div>
        </section>

        <!-- 附件一 -->
        <section class="space-y-4">
          <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">附件一　租賃標的現況確認書</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="terms-addition" class="block text-sm font-medium text-text-secondary-light mb-1">未登記之改建、增建、違建位置</label>
              <input id="terms-addition" v-model="local.unregisteredAddition" class="form-input" placeholder="沒有請留空，例如：頂樓">
            </div>
            <div>
              <label for="terms-layout" class="block text-sm font-medium text-text-secondary-light mb-1">現況格局</label>
              <input id="terms-layout" v-model="local.layout" class="form-input" placeholder="例如：1室1衛">
            </div>
            <div>
              <label for="terms-leak" class="block text-sm font-medium text-text-secondary-light mb-1">滲漏水處</label>
              <input id="terms-leak" v-model="local.leak" class="form-input" placeholder="沒有請留空">
            </div>
            <div>
              <label for="terms-death" class="block text-sm font-medium text-text-secondary-light mb-1">產權持有前是否發生非自然死亡</label>
              <select id="terms-death" v-model="local.deathBeforeOwnership" class="form-input">
                <option value="none">無上列情事</option>
                <option value="known">知道曾發生</option>
                <option value="unknown">不知道曾否發生</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <label v-for="f in flags" :key="f.key" class="flex items-center gap-2">
              <input type="checkbox" v-model="(local as any)[f.key]" class="w-4 h-4 rounded"> {{ f.label }}
            </label>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="terms-equipment" class="block text-sm font-medium text-text-secondary-light mb-1">附屬設備</label>
              <textarea id="terms-equipment" v-model="local.equipment" rows="2" class="form-input resize-none" placeholder="例如：冷氣1臺、冰箱1臺、洗衣機1臺"></textarea>
            </div>
            <div>
              <label for="terms-keys" class="block text-sm font-medium text-text-secondary-light mb-1">鑰匙與門卡</label>
              <textarea id="terms-keys" v-model="local.keys" rows="2" class="form-input resize-none"></textarea>
            </div>
          </div>
        </section>

        <!-- 附件三 -->
        <section class="space-y-3">
          <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">附件三　承租人負責修繕項目</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm min-w-[520px]">
              <thead>
                <tr class="text-left text-xs text-text-secondary-light">
                  <th class="pb-1 font-medium">範圍</th><th class="pb-1 font-medium">設備或設施</th>
                  <th class="pb-1 font-medium w-20">數量</th><th class="pb-1 font-medium">備註</th><th class="w-8"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in local.repairItems" :key="i">
                  <td class="pr-2 py-1"><input v-model="r.area" class="form-input text-sm" aria-label="範圍"></td>
                  <td class="pr-2 py-1"><input v-model="r.item" class="form-input text-sm" aria-label="設備或設施"></td>
                  <td class="pr-2 py-1"><input v-model="r.quantity" class="form-input text-sm" aria-label="數量"></td>
                  <td class="pr-2 py-1"><input v-model="r.note" class="form-input text-sm" aria-label="備註"></td>
                  <td class="py-1">
                    <button type="button" @click="local.repairItems.splice(i, 1)" aria-label="刪除此列"
                      class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button type="button" @click="local.repairItems.push({ area: lastArea, item: '', quantity: '1', note: '' })"
            class="text-sm text-gold-600 hover:underline">＋ 新增一列</button>
        </section>

        <!-- 附件四 -->
        <section class="space-y-3">
          <h3 class="font-bold text-text-primary-light dark:text-text-primary-dark">附件四　退租毀損賠償價目表</h3>
          <div v-for="(c, i) in local.compensationItems" :key="i" class="flex gap-2 items-start">
            <input v-model="c.item" class="form-input text-sm w-32 shrink-0" aria-label="項目" placeholder="項目">
            <textarea v-model="c.standard" rows="2" class="form-input text-sm flex-1 resize-y" aria-label="賠償標準" placeholder="賠償標準"></textarea>
            <button type="button" @click="local.compensationItems.splice(i, 1)" aria-label="刪除此項"
              class="p-1 mt-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
            </button>
          </div>
          <button type="button" @click="local.compensationItems.push({ item: '', standard: '' })"
            class="text-sm text-gold-600 hover:underline">＋ 新增一項</button>
        </section>
      </div>

      <div class="p-6 border-t border-ink-100 dark:border-ink-700 flex justify-end gap-3 shrink-0">
        <button @click="close" class="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">取消</button>
        <button @click="save" :disabled="saving"
          class="px-5 py-2 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 disabled:opacity-50 transition-colors">
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Property } from '../../types/index'
import { normalizeContractTerms, fuxingPresetTerms, type ContractTerms } from '../../utils/contractTerms'

const props = defineProps<{ show: boolean; property: Property | null; saving?: boolean }>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [terms: ContractTerms]
}>()

const local = ref<ContractTerms>(normalizeContractTerms())

watch(() => props.show, (v) => {
  if (v) local.value = normalizeContractTerms(JSON.parse(JSON.stringify(props.property?.contractTerms ?? null)))
})

const flags: { key: keyof ContractTerms; label: string }[] = [
  { key: 'hasPartition', label: '有隔間' },
  { key: 'radiationTested', label: '做過輻射屋檢測' },
  { key: 'chlorideTested', label: '做過海砂屋（氯離子）檢測' },
  { key: 'deathDuringOwnership', label: '產權持有期間曾發生非自然死亡' },
  { key: 'waterNormal', label: '供水及排水正常' },
  { key: 'hasCommunityRules', label: '有公寓大廈規約' },
  { key: 'hasManagementCommittee', label: '有管理委員會統一管理' },
]

const lastArea = computed(() => local.value.repairItems[local.value.repairItems.length - 1]?.area ?? '')

const applyPreset = () => { local.value = fuxingPresetTerms() }

const close = () => emit('update:show', false)

// 空白列不存
const save = () => emit('save', {
  ...local.value,
  repairItems: local.value.repairItems.filter(r => r.item.trim()),
  compensationItems: local.value.compensationItems.filter(c => c.item.trim()),
})
</script>
