<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
    <header>
      <h1 class="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">入住點交</h1>
      <p class="text-sm text-text-secondary-light mt-1">
        入住時與房東共同確認的房間現況。退租時以此為比對基準，建議留著。
      </p>
    </header>

    <div v-if="loading" class="py-16 text-center text-sm text-text-secondary-light">
      <span class="material-symbols-outlined animate-spin motion-reduce:animate-none text-3xl text-ink-300" aria-hidden="true">progress_activity</span>
      <p class="mt-3">載入中…</p>
    </div>

    <div v-else-if="error" class="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 text-sm text-red-700 dark:text-red-300">
      {{ error }}
    </div>

    <div v-else-if="!records.length" class="py-16 text-center">
      <span class="material-symbols-outlined text-4xl text-ink-200 block mb-3" aria-hidden="true">checklist</span>
      <p class="text-sm text-text-secondary-light">目前沒有已完成的點交紀錄。</p>
      <p class="mt-1 text-xs text-text-secondary-light">房東完成點交並雙方簽名後，這裡就會出現。</p>
    </div>

    <article v-for="insp in records" :key="insp.id"
      class="bg-white dark:bg-card-dark rounded-2xl border border-ink-100 dark:border-ink-700 overflow-hidden">
      <div class="p-4 border-b border-ink-100 dark:border-ink-700 flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="font-bold text-text-primary-light dark:text-text-primary-dark">
            {{ insp.roomName || '房間' }}
          </p>
          <p class="text-xs text-text-secondary-light">
            {{ dateOf(insp) }} · 共 {{ insp.items.length }} 項<span v-if="contestedOf(insp).length">，{{ contestedOf(insp).length }} 項經協調</span>
          </p>
        </div>
        <button @click="printOne(insp)" :disabled="printingId === insp.id"
          class="shrink-0 px-4 py-2 rounded-xl border border-gold-200 dark:border-gold-700 text-sm font-bold text-gold-700 dark:text-gold-300 hover:bg-gold-50 dark:hover:bg-gold-900/20 disabled:opacity-50 transition-colors flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">print</span>
          {{ printingId === insp.id ? '準備中…' : 'PDF' }}
        </button>
      </div>

      <div v-if="contestedOf(insp).length" class="p-4 bg-red-50/40 dark:bg-red-900/10 border-b border-ink-100 dark:border-ink-700">
        <h2 class="text-xs font-bold text-red-700 dark:text-red-300 mb-2">經雙方協調的項目</h2>
        <div v-for="e in contestedOf(insp)" :key="e.key" class="text-xs text-text-secondary-light py-1">
          <strong class="text-text-primary-light dark:text-text-primary-dark">{{ e.name }}</strong>：
          你判定 {{ label(e.tenantCondition) }} · 房東 {{ label(e.landlordCondition) }} →
          共識 <strong class="text-text-primary-light dark:text-text-primary-dark">{{ label(e.finalCondition) }}</strong>
          <span v-if="e.landlordNote">（{{ e.landlordNote }}）</span>
        </div>
      </div>

      <ul class="divide-y divide-ink-50 dark:divide-ink-800">
        <li v-for="e in insp.items" :key="e.key" class="p-4">
          <div class="flex items-center gap-2">
            <span class="text-[11px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-700 text-text-secondary-light shrink-0">
              {{ e.kind === 'asset' ? '物品' : '屋況' }}
            </span>
            <span class="flex-1 min-w-0 truncate text-sm text-text-primary-light dark:text-text-primary-dark">
              {{ e.name }}
            </span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0" :class="badge(finalOf(e))">
              {{ label(finalOf(e)) }}
            </span>
          </div>
          <p v-if="composeNote(e)" class="mt-1 text-xs text-text-secondary-light">「{{ composeNote(e) }}」</p>
          <div v-if="thumbsOf(e).length" class="flex flex-wrap gap-2 mt-2">
            <button v-for="p in thumbsOf(e)" :key="p.id"
              @click="lightbox = { src: p.origUrl || p.thumbUrl, alt: e.name }"
              class="w-16 h-16 rounded-lg overflow-hidden border border-ink-100 dark:border-ink-700">
              <img :src="p.thumbUrl" :alt="`${e.name} 照片`" class="w-full h-full object-cover">
            </button>
          </div>
        </li>
      </ul>

      <div class="p-4 bg-surface-light dark:bg-ink-800/50 flex gap-6">
        <div v-for="sig in signaturesOf(insp)" :key="sig.who" class="flex-1 min-w-0">
          <p class="text-[11px] text-text-secondary-light mb-1">{{ sig.who }}</p>
          <img v-if="sig.image" :src="sig.image" :alt="sig.who"
            class="h-12 bg-white rounded border border-ink-100 dark:border-ink-700 object-contain px-1">
          <p v-else class="text-xs text-text-secondary-light">—</p>
        </div>
      </div>
    </article>

    <PhotoLightbox v-if="lightbox" :src="lightbox.src" :alt="lightbox.alt" @close="lightbox = null" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db } from '../../firebase/config'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useAuthStore } from '../../stores/auth'
import PhotoLightbox from '../../components/inspection/PhotoLightbox.vue'
import inspectionTemplate from '../../templates/moveInInspection.html?raw'
import { printHtmlPdf } from '../../utils/contractRender'
import { buildPdfData, pdfFileName } from '../../utils/inspectionPdf'
import {
  contestedItems, effectiveCondition, CONDITION_LABELS, composeNote,
  type Inspection, type InspectionEntry,
} from '../../utils/inspection'
import type { Condition } from '../../utils/inventory'

const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const records = ref<Inspection[]>([])
const printingId = ref('')
const lightbox = ref<{ src: string; alt: string } | null>(null)

const label = (c?: Condition) => (c ? CONDITION_LABELS[c] : '—')
const finalOf = (e: InspectionEntry) => effectiveCondition(e)
const contestedOf = (i: Inspection) => contestedItems(i.items || [])
/** 只顯示已上傳的照片；純本地待傳的檔案在租客自己的裝置上並不存在 */
const thumbsOf = (e: InspectionEntry) => (e.photos || []).filter(p => p.thumbUrl)

const badge = (c: Condition) => {
  if (c === 'total') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  if (c === 'minor') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
  return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
}

const dateOf = (i: Inspection) => {
  const t = i.completedAt?.toDate?.() || (i.createdAt?.toDate?.() ?? null)
  if (!t) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`
}

const signaturesOf = (i: Inspection) => ([
  { who: '承租人簽名', image: i.signatures?.tenant?.image || '' },
  { who: '出租人簽章', image: i.signatures?.landlord?.image || '' },
])

onMounted(async () => {
  const uid = authStore.user?.uid
  if (!uid) { error.value = '請先登入'; loading.value = false; return }
  try {
    // 先找自己的租客檔，再以 tenantDocId 查點交：
    // 點交當下租客未必已有帳號，inspections.tenantId 可能是空的
    const mine = await getDocs(query(collection(db, 'tenants'), where('uid', '==', uid)))
    const docIds = mine.docs.map(d => d.id)
    if (!docIds.length) { loading.value = false; return }

    const lists = await Promise.all(docIds.map(id =>
      getDocs(query(collection(db, 'inspections'), where('tenantDocId', '==', id)))))

    records.value = lists
      .flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() } as Inspection)))
      .filter(i => i.status === 'signed')
      .sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0))
  } catch (e: any) {
    error.value = e?.message || '載入失敗'
  } finally {
    loading.value = false
  }
})

const printOne = async (insp: Inspection) => {
  printingId.value = insp.id
  try {
    const today = dateOf(insp)
    await printHtmlPdf(
      inspectionTemplate,
      buildPdfData(insp, {
        today,
        landlordSignature: insp.signatures?.landlord?.image || '',
        tenantSignature: insp.signatures?.tenant?.image || '',
      }),
      pdfFileName(insp, today),
    )
  } catch (e: any) {
    error.value = e?.message || '列印失敗'
  } finally {
    printingId.value = ''
  }
}
</script>
