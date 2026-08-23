<template>
  <!--
    全螢幕、不掛 LandlordLayout：租客那一輪要把裝置實體交出去，
    留著側邊選單等於讓租客一點就看到其他租客的身分證號與租金。
  -->
  <div class="fixed inset-0 z-[80] flex flex-col bg-surface-light dark:bg-ink-900">
    <header class="shrink-0 px-4 py-3 bg-white dark:bg-card-dark border-b border-ink-100 dark:border-ink-700">
      <div class="max-w-3xl mx-auto flex items-center gap-3">
        <span class="material-symbols-outlined text-[22px] text-gold-500 shrink-0" aria-hidden="true">checklist</span>
        <div class="min-w-0 flex-1">
          <h1 class="font-bold text-text-primary-light dark:text-text-primary-dark truncate">
            {{ typeLabel }}
          </h1>
          <p class="text-xs text-text-secondary-light truncate">
            {{ inspection?.tenantName || '—' }}<span v-if="inspection?.roomName"> · {{ inspection.roomName }}</span>
          </p>
        </div>
        <span class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold" :class="stageBadge.cls">
          {{ stageBadge.label }}
        </span>
      </div>

      <div class="max-w-3xl mx-auto mt-3 flex items-center gap-1">
        <template v-for="(s, i) in STAGES" :key="s.key">
          <div class="flex items-center gap-1.5 shrink-0">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
              :class="stageIndex >= i
                ? 'bg-gold-500 text-white'
                : 'bg-ink-100 dark:bg-ink-700 text-text-secondary-light'">
              {{ i + 1 }}
            </div>
            <span class="text-[11px] hidden sm:inline"
              :class="stageIndex >= i ? 'text-text-primary-light dark:text-text-primary-dark font-medium' : 'text-text-secondary-light'">
              {{ s.label }}
            </span>
          </div>
          <div v-if="i < STAGES.length - 1" class="flex-1 h-px"
            :class="stageIndex > i ? 'bg-gold-400' : 'bg-ink-100 dark:bg-ink-700'"></div>
        </template>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto">
      <div class="max-w-3xl mx-auto p-4 sm:p-6">
        <div v-if="loading" class="py-20 text-center text-sm text-text-secondary-light">
          <span class="material-symbols-outlined animate-spin motion-reduce:animate-none text-3xl text-ink-300" aria-hidden="true">progress_activity</span>
          <p class="mt-3">載入點交資料…</p>
        </div>

        <div v-else-if="error" class="py-20 text-center">
          <span class="material-symbols-outlined text-4xl text-ink-200 block mb-3" aria-hidden="true">error</span>
          <p class="text-sm text-text-secondary-light">{{ error }}</p>
          <button @click="leave" class="mt-4 px-5 py-2 rounded-xl bg-ink-700 text-white text-sm font-bold">返回</button>
        </div>

        <DraftStep
          v-else-if="inspection?.status === 'draft'"
          :items="items"
          :source-label="sourceLabel"
          @update:items="items = $event"
        />

        <TenantConfirmStep
          v-else-if="inspection?.status === 'tenant'"
          :items="items"
          :previews="photos.previews.value"
          :busy-key="compressingKey"
          @set-condition="setCondition"
          @set-note="setNote"
          @add-photo="addPhoto"
          @remove-photo="removePhoto"
        />

        <LandlordReviewStep
          v-else-if="inspection?.status === 'review'"
          :items="items"
          :previews="photos.previews.value"
          @mark-dispute="onMarkDispute"
          @resolve="onResolve"
          @clear="onClearDispute"
        />

        <SignStep
          v-else-if="inspection?.status === 'signing'"
          :items="items"
          :landlord-id="inspection.landlordId"
          :tenant-sig="tenantSig"
          :landlord-sig="landlordSig"
          @update:tenant-sig="tenantSig = $event"
          @update:landlord-sig="landlordSig = $event"
        />

        <div v-else-if="inspection?.status === 'signed'" class="py-12 text-center">
          <span class="material-symbols-outlined text-5xl text-green-500 block mb-3" aria-hidden="true">task_alt</span>
          <p class="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">點交完成</p>
          <p class="mt-1 text-sm text-text-secondary-light">
            共 {{ items.length }} 項<span v-if="contestedCount">，其中 {{ contestedCount }} 項經雙方協調</span>
          </p>
          <div class="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button @click="printPdf" :disabled="printing"
              class="px-6 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">print</span>
              {{ printing ? '準備中…' : '列印／另存 PDF' }}
            </button>
            <button @click="leave"
              class="px-6 py-2.5 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-text-secondary-light">
              回租客清單
            </button>
          </div>
          <p class="mt-4 text-xs text-text-secondary-light">
            租客登入後也能在自己的頁面查閱這份清單。
          </p>
        </div>

        <div v-else class="py-16 text-center">
          <span class="material-symbols-outlined text-4xl text-ink-200 block mb-3" aria-hidden="true">construction</span>
          <p class="text-sm text-text-secondary-light">未知的點交狀態</p>
          <button @click="backToDraft" :disabled="saving"
            class="mt-4 px-5 py-2 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-text-secondary-light disabled:opacity-50">
            退回草稿
          </button>
        </div>
      </div>
    </main>

    <footer v-if="!loading && !error && inspection?.status === 'signing'"
      class="shrink-0 px-4 py-3 bg-white dark:bg-card-dark border-t border-ink-100 dark:border-ink-700">
      <div class="max-w-3xl mx-auto flex items-center gap-3">
        <button @click="backToReview" :disabled="saving"
          class="px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-text-secondary-light disabled:opacity-50">
          回二次確認
        </button>
        <button @click="complete" :disabled="saving || !bothSigned"
          class="ml-auto px-6 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">task_alt</span>
          {{ saving ? '完成中…' : '完成點交' }}
        </button>
      </div>
    </footer>

    <footer v-if="!loading && !error && inspection?.status === 'review'"
      class="shrink-0 px-4 py-3 bg-white dark:bg-card-dark border-t border-ink-100 dark:border-ink-700">
      <div class="max-w-3xl mx-auto flex items-center gap-3">
        <p v-if="photos.pendingCount.value" class="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]" aria-hidden="true">cloud_upload</span>
          {{ photos.pendingCount.value }} 張照片待上傳，傳完才能簽名
        </p>
        <button @click="backToTenant" :disabled="saving"
          class="px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-text-secondary-light disabled:opacity-50">
          退回租客確認
        </button>
        <button @click="goSign" :disabled="saving || !readyToSign"
          class="ml-auto px-6 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">draw</span>
          確認無誤，進入簽名
        </button>
      </div>
    </footer>

    <footer v-if="!loading && !error && inspection?.status === 'tenant'"
      class="shrink-0 px-4 py-3 bg-white dark:bg-card-dark border-t border-ink-100 dark:border-ink-700">
      <div class="max-w-3xl mx-auto flex items-center gap-3">
        <p v-if="photos.pendingCount.value" class="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]" aria-hidden="true">cloud_upload</span>
          {{ photos.pendingCount.value }} 張待上傳
        </p>
        <button @click="handBackOpen = true"
          class="ml-auto px-6 py-2.5 rounded-xl bg-ink-700 text-white text-sm font-bold hover:bg-ink-800 transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">swipe_left</span>
          交還房東
        </button>
      </div>
    </footer>

    <footer v-if="!loading && !error && inspection?.status === 'draft'"
      class="shrink-0 px-4 py-3 bg-white dark:bg-card-dark border-t border-ink-100 dark:border-ink-700">
      <div class="max-w-3xl mx-auto flex gap-3">
        <button @click="saveAndLeave" :disabled="saving"
          class="flex-1 py-2.5 rounded-xl border border-ink-200 dark:border-ink-600 text-sm font-medium text-text-secondary-light hover:bg-surface-light dark:hover:bg-ink-800 transition-colors disabled:opacity-50">
          存草稿離開
        </button>
        <button @click="handOver" :disabled="saving || !canHand"
          class="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold hover:bg-gold-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">swipe_right</span>
          {{ saving ? '處理中…' : '遞給租客' }}
        </button>
      </div>
    </footer>
    <HandBackModal
      v-if="handBackOpen && inspection"
      :landlord-id="inspection.landlordId"
      :complete="tenantDone"
      :remaining="remainingCount"
      @close="handBackOpen = false"
      @verified="onHandBack"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '../../stores/toast'
import DraftStep from '../../components/inspection/DraftStep.vue'
import TenantConfirmStep from '../../components/inspection/TenantConfirmStep.vue'
import HandBackModal from '../../components/inspection/HandBackModal.vue'
import LandlordReviewStep from '../../components/inspection/LandlordReviewStep.vue'
import SignStep from '../../components/inspection/SignStep.vue'
import inspectionTemplate from '../../templates/moveInInspection.html?raw'
import { printHtmlPdf } from '../../utils/contractRender'
import { buildPdfData, pdfFileName } from '../../utils/inspectionPdf'
import { useInspectionPhotos } from '../../composables/useInspectionPhotos'
import { useSignatureVault } from '../../composables/useSignatureVault'
import {
  getInspection, saveItems, handToTenant, setStatus, completeInspection,
} from '../../services/inspectionService'
import {
  canHandToTenant, canReturnToLandlord, tenantProgress, canSign, contestedItems,
  markDispute, resolveDispute, clearDispute,
  type Inspection, type InspectionEntry,
} from '../../utils/inspection'
import type { Condition } from '../../utils/inventory'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const STAGES = [
  { key: 'draft', label: '選項目' },
  { key: 'tenant', label: '租客確認' },
  { key: 'review', label: '二次確認' },
  { key: 'signing', label: '雙方簽名' },
  { key: 'signed', label: '完成' },
] as const

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const inspection = ref<Inspection | null>(null)
const items = ref<InspectionEntry[]>([])
const sourceLabel = ref('')

const handBackOpen = ref(false)
const compressingKey = ref('')

const photos = useInspectionPhotos(String(route.params.inspectionId || ''))
const vault = useSignatureVault()

const canHand = computed(() => canHandToTenant(items.value))
const tenantDone = computed(() => canReturnToLandlord(items.value))
const remainingCount = computed(() => {
  const p = tenantProgress(items.value)
  return p.total - p.done
})
const readyToSign = computed(() =>
  canSign({ status: 'review', items: items.value }) && photos.pendingCount.value === 0)

const tenantSig = ref('')
const landlordSig = ref('')
const printing = ref(false)
const bothSigned = computed(() => !!tenantSig.value && !!landlordSig.value)
const contestedCount = computed(() => contestedItems(items.value).length)
const stageIndex = computed(() => STAGES.findIndex(s => s.key === inspection.value?.status))
const typeLabel = computed(() => (inspection.value?.type === 'moveout' ? '退租點交' : '入住點交'))

const stageBadge = computed(() => {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: '草稿', cls: 'bg-ink-100 dark:bg-ink-700 text-text-secondary-light' },
    tenant: { label: '租客確認中', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    review: { label: '二次確認', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
    signing: { label: '待簽名', cls: 'bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300' },
    signed: { label: '已完成', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  }
  return map[inspection.value?.status || 'draft'] || map.draft!
})

onMounted(async () => {
  const id = String(route.params.inspectionId || '')
  if (!id) { error.value = '缺少點交編號'; loading.value = false; return }
  try {
    const found = await getInspection(id)
    if (!found) { error.value = '找不到這筆點交紀錄'; return }
    inspection.value = found
    items.value = (found.items || []).map(e => ({ ...e }))
    sourceLabel.value = String(route.query.from || '')
    tenantSig.value = found.signatures?.tenant?.image || ''
    landlordSig.value = found.signatures?.landlord?.image || ''
    await photos.init()
    void photos.drain(applyPhotoPatch)
  } catch (e: any) {
    error.value = e?.message || '載入失敗'
  } finally {
    loading.value = false
  }
})

const leave = () => router.push({ name: 'TenantList' })

/**
 * 租客每動一次就存，中途沒電或誤觸重整都不會整輪重來。
 * 用防抖是因為連點三個按鈕不該打三次 Firestore。
 */
let saveTimer: ReturnType<typeof setTimeout> | null = null
const queueSave = () => {
  if (!inspection.value) return
  if (saveTimer) clearTimeout(saveTimer)
  const id = inspection.value.id
  saveTimer = setTimeout(() => { void saveItems(id, items.value) }, 800)
}

const patchEntry = (key: string, part: Partial<InspectionEntry>) => {
  items.value = items.value.map(e => (e.key === key ? { ...e, ...part } : e))
  queueSave()
}

// 改回正常時保留說明與照片：租客改來改去不必重拍
const setCondition = (key: string, condition: Condition) =>
  patchEntry(key, { tenantCondition: condition })

const setNote = (key: string, note: string) => patchEntry(key, { note })

/** 上傳完成後把真正的 URL 寫回對應照片 */
const applyPhotoPatch = (photoId: string, patch: Record<string, any>) => {
  items.value = items.value.map(e => ({
    ...e,
    photos: e.photos.map(p => (p.id === photoId ? { ...p, ...patch } : p)),
  }))
  queueSave()
}

const addPhoto = async (key: string, file: File) => {
  compressingKey.value = key
  try {
    const photo = await photos.capture(key, file)
    const entry = items.value.find(e => e.key === key)
    patchEntry(key, { photos: [...(entry?.photos || []), photo] })
    void photos.drain(applyPhotoPatch)
  } catch (e: any) {
    toast.error(e?.message || '照片處理失敗')
  } finally {
    compressingKey.value = ''
  }
}

const removePhoto = async (key: string, photoId: string) => {
  const entry = items.value.find(e => e.key === key)
  const photo = entry?.photos.find(p => p.id === photoId)
  if (photo) await photos.discard(photo, key)
  // 讀刪除後的最新狀態再過濾：等待期間背景補傳可能已經回填了其他照片的 URL
  items.value = items.value.map(e =>
    (e.key === key ? { ...e, photos: e.photos.filter(p => p.id !== photoId) } : e))
  queueSave()
}

// 房東標記不同意，記下自己的主張；租客原本的判定與說明不動
const onMarkDispute = (key: string, condition: any, note: string) => {
  const e = items.value.find(x => x.key === key)
  if (e) replaceEntry(markDispute(e, condition, note))
}

// 協調後收斂；最終判定可以是雙方都沒主張過的第三個結果
const onResolve = (key: string, condition: any, note: string) => {
  const e = items.value.find(x => x.key === key)
  if (e) replaceEntry(resolveDispute(e, condition, note))
}

const onClearDispute = (key: string) => {
  const e = items.value.find(x => x.key === key)
  if (e) replaceEntry(clearDispute(e))
}

const replaceEntry = (next: InspectionEntry) => {
  items.value = items.value.map(e => (e.key === next.key ? next : e))
  queueSave()
}

/** 租客有東西漏填或想改，退回去讓他自己改，不要房東代填 */
const backToTenant = async () => {
  if (!inspection.value) return
  saving.value = true
  try {
    await saveItems(inspection.value.id, items.value)
    await setStatus(inspection.value.id, 'tenant')
    inspection.value = { ...inspection.value, status: 'tenant', items: items.value }
  } catch (e: any) {
    toast.error(e?.message || '操作失敗')
  } finally {
    saving.value = false
  }
}

const goSign = async () => {
  if (!readyToSign.value || !inspection.value) return
  saving.value = true
  try {
    await saveItems(inspection.value.id, items.value)
    await setStatus(inspection.value.id, 'signing')
    inspection.value = { ...inspection.value, status: 'signing', items: items.value }
  } catch (e: any) {
    toast.error(e?.message || '操作失敗')
  } finally {
    saving.value = false
  }
}

const backToReview = async () => {
  if (!inspection.value) return
  saving.value = true
  try {
    await setStatus(inspection.value.id, 'review')
    inspection.value = { ...inspection.value, status: 'review' }
  } catch (e: any) {
    toast.error(e?.message || '操作失敗')
  } finally {
    saving.value = false
  }
}

const complete = async () => {
  if (!inspection.value || !bothSigned.value) return
  saving.value = true
  try {
    await completeInspection(inspection.value, items.value, {
      tenant: tenantSig.value,
      landlord: landlordSig.value,
    })
    inspection.value = { ...inspection.value, status: 'signed', items: items.value }
    toast.success('點交完成')
  } catch (e: any) {
    toast.error(e?.message || '完成失敗')
  } finally {
    saving.value = false
  }
}

const todayStr = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const printPdf = async () => {
  if (!inspection.value) return
  printing.value = true
  try {
    const today = todayStr()
    const data = buildPdfData(
      { ...inspection.value, items: items.value },
      {
        today,
        landlordSignature: landlordSig.value,
        tenantSignature: tenantSig.value,
      },
    )
    await printHtmlPdf(inspectionTemplate, data, pdfFileName(inspection.value, today))
  } catch (e: any) {
    toast.error(e?.message || '列印失敗')
  } finally {
    printing.value = false
  }
}

/**
 * 房東以 PIN 取回裝置。
 * 全部確認完才進二次確認；沒做完就先離開，狀態留在租客輪，之後接得回來。
 */
const onHandBack = async () => {
  handBackOpen.value = false
  if (!inspection.value) return
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  saving.value = true
  try {
    await saveItems(inspection.value.id, items.value)
    if (!tenantDone.value) {
      toast.info('已保留 ' + tenantProgress(items.value).done + ' 項，稍後可從租客抽屜接回')
      leave()
      return
    }
    await setStatus(inspection.value.id, 'review')
    inspection.value = { ...inspection.value, status: 'review', items: items.value }
  } catch (e: any) {
    toast.error(e?.message || '操作失敗')
  } finally {
    saving.value = false
  }
}

const saveAndLeave = async () => {
  if (!inspection.value) return
  saving.value = true
  try {
    await saveItems(inspection.value.id, items.value)
    toast.success('已存為草稿，稍後可從租客抽屜接回')
    leave()
  } catch (e: any) {
    toast.error(e?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

const handOver = async () => {
  if (!inspection.value || !canHand.value) return
  saving.value = true
  try {
    await handToTenant(inspection.value.id, items.value)
    // 裝置要交到租客手上，先把工作階段裡的明文簽名鎖回去
    vault.lock()
    inspection.value = { ...inspection.value, status: 'tenant', items: items.value }
  } catch (e: any) {
    toast.error(e?.message || '操作失敗')
  } finally {
    saving.value = false
  }
}

/** 開發期用：租客那一輪還沒做完，讓誤入後續階段的點交可以退回來繼續編輯 */
const backToDraft = async () => {
  if (!inspection.value) return
  saving.value = true
  try {
    await setStatus(inspection.value.id, 'draft')
    inspection.value = { ...inspection.value, status: 'draft' }
  } catch (e: any) {
    toast.error(e?.message || '操作失敗')
  } finally {
    saving.value = false
  }
}
</script>
