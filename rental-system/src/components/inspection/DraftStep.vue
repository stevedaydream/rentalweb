<template>
  <div class="space-y-5">
    <div v-if="sourceLabel"
      class="flex items-start gap-2 p-3 rounded-xl bg-gold-50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-800/40">
      <span class="material-symbols-outlined text-[18px] text-gold-600 shrink-0" aria-hidden="true">history</span>
      <p class="text-xs text-gold-800 dark:text-gold-200">{{ sourceLabel }}；狀況與照片一律重新確認。</p>
    </div>

    <section v-for="group in groups" :key="group.kind">
      <div class="flex items-baseline gap-2 mb-2">
        <h3 class="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">{{ group.title }}</h3>
        <span class="text-[11px] text-text-secondary-light">{{ group.hint }}</span>
        <span class="ml-auto text-xs text-text-secondary-light">{{ group.rows.length }} 項</span>
      </div>

      <div class="space-y-2">
        <div v-for="row in group.rows" :key="row.key"
          class="p-2 rounded-xl border border-ink-100 dark:border-ink-700">
          <div class="flex gap-2 items-center">
          <input
            :value="row.name"
            @input="patch(row.key, { name: ($event.target as HTMLInputElement).value })"
            type="text" class="form-input flex-1 text-sm" :placeholder="group.placeholder"
            :aria-label="group.title + '名稱'"
          >
          <template v-if="group.kind === 'asset'">
            <input
              :value="row.quantity"
              @input="patch(row.key, { quantity: Math.max(1, Number(($event.target as HTMLInputElement).value) || 1) })"
              type="number" min="1" class="form-input w-16 text-sm shrink-0" aria-label="數量"
            >
            <div class="relative w-36 shrink-0">
              <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">NT$</span>
              <input
                :value="row.unitPrice"
                @input="patch(row.key, { unitPrice: Math.max(0, Number(($event.target as HTMLInputElement).value) || 0) })"
                type="number" min="0" class="form-input w-full pl-9 pr-8 text-sm" aria-label="賠償基準單價（每件）"
              >
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">/件</span>
            </div>
          </template>
          <button @click="remove(row.key)" class="text-red-400 hover:text-red-600 shrink-0 p-1"
            :aria-label="`移除 ${row.name || '此項'}`">
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
          </button>
        </div>
        <p v-if="group.kind === 'asset' && row.quantity > 1"
          class="mt-1 pl-1 text-[11px] text-text-secondary-light tabular-nums">
          全損上限 {{ row.quantity }} × NT$ {{ row.unitPrice.toLocaleString('en-US') }}
          = NT$ {{ (row.quantity * row.unitPrice).toLocaleString('en-US') }}
        </p>
        </div>

        <p v-if="!group.rows.length" class="px-2 py-3 text-xs text-text-secondary-light">
          目前沒有{{ group.title }}項目。
        </p>
      </div>

      <button @click="add(group.kind)"
        class="w-full mt-2 py-2 rounded-xl border border-dashed border-ink-200 dark:border-ink-600 text-sm text-text-secondary-light hover:bg-surface-light dark:hover:bg-ink-800 flex items-center justify-center gap-1.5 transition-colors">
        <span class="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
        新增{{ group.title }}項目
      </button>
    </section>

    <p v-if="!canHand" class="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
      <span class="material-symbols-outlined text-[16px]" aria-hidden="true">info</span>
      {{ items.length ? '有項目尚未填寫名稱' : '請至少保留一個項目' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { v4 as uuid } from 'uuid'
import { makeEntry, canHandToTenant, type InspectionEntry, type EntryKind } from '../../utils/inspection'

const props = defineProps<{ items: InspectionEntry[]; sourceLabel?: string }>()
const emit = defineEmits<{ 'update:items': [InspectionEntry[]] }>()

const canHand = computed(() => canHandToTenant(props.items))

const groups = computed(() => ([
  {
    kind: 'asset' as EntryKind,
    title: '物品',
    hint: '退租時依此計算賠償',
    placeholder: '例如：冷氣',
    rows: props.items.filter(e => e.kind === 'asset'),
  },
  {
    kind: 'condition' as EntryKind,
    title: '屋況',
    hint: '僅記錄狀況與照片，不計賠償',
    placeholder: '例如：牆面與天花板',
    rows: props.items.filter(e => e.kind === 'condition'),
  },
]))

const patch = (key: string, part: Partial<InspectionEntry>) => {
  emit('update:items', props.items.map(e => (e.key === key ? { ...e, ...part } : e)))
}

const remove = (key: string) => {
  emit('update:items', props.items.filter(e => e.key !== key))
}

/** 新項目附加在同類最後一項之後，避免物品與屋況混在一起 */
const add = (kind: EntryKind) => {
  const entry = makeEntry(uuid(), { kind, quantity: 1, unitPrice: 0 })
  const next = [...props.items]
  let at = -1
  next.forEach((e, i) => { if (e.kind === kind) at = i })
  // 該類還沒有任何項目時附加在最後，否則屋況項會被插到物品之前
  if (at < 0) next.push(entry)
  else next.splice(at + 1, 0, entry)
  emit('update:items', next)
}
</script>
