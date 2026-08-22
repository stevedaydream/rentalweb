<template>
  <div
    v-if="reminders.length > 0"
    class="md:col-span-2 lg:col-span-12 bg-white dark:bg-card-dark rounded-2xl border shadow-sm overflow-hidden"
    :class="hasDanger
      ? 'border-red-200 dark:border-red-800'
      : 'border-amber-200 dark:border-amber-800'"
  >
    <div
      class="px-5 py-3.5 border-b flex items-center gap-2 flex-wrap"
      :class="hasDanger
        ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'"
    >
      <span class="material-symbols-outlined text-[20px]"
        :class="hasDanger ? 'text-red-500' : 'text-amber-500'" aria-hidden="true">event_upcoming</span>
      <h3 class="font-bold text-sm" :class="hasDanger ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'">
        稅費與保險待辦（{{ reminders.length }}）
      </h3>
      <RouterLink
        :to="{ name: 'Financials' }"
        class="ml-auto text-xs font-medium hover:underline"
        :class="hasDanger ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'"
      >前往帳務管理</RouterLink>
    </div>

    <ul class="divide-y divide-ink-50 dark:divide-ink-800">
      <li v-for="r in reminders" :key="r.id" class="flex items-start gap-3 px-5 py-3">
        <span class="material-symbols-outlined text-[18px] shrink-0 mt-0.5" :class="iconClass(r.severity)" aria-hidden="true">
          {{ icon(r.kind) }}
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{{ r.title }}</p>
          <p class="text-xs text-text-secondary-light">{{ r.detail }}</p>
        </div>
        <span
          v-if="r.kind !== 'welfare_unclaimed' && r.kind !== 'welfare_stale'"
          class="text-xs font-bold shrink-0 whitespace-nowrap" :class="iconClass(r.severity)"
        >
          {{ dayLabel(r.days) }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { dayLabel, type Reminder, type ReminderKind, type ReminderSeverity } from '../../utils/financials/reminders'

const props = defineProps<{ reminders: Reminder[] }>()

const hasDanger = computed(() => props.reminders.some(r => r.severity === 'danger'))

const ICONS: Record<ReminderKind, string> = {
  cost_missing: 'assignment_late',
  cost_due: 'schedule',
  cost_overdue: 'warning',
  fire_expiring: 'local_fire_department',
  fire_expired: 'local_fire_department',
  subsidy_expiring: 'volunteer_activism',
  welfare_unclaimed: 'lightbulb',
  welfare_stale: 'help',
}

const icon = (kind: ReminderKind) => ICONS[kind] ?? 'info'

const iconClass = (severity: ReminderSeverity) =>
  severity === 'danger' ? 'text-red-500' : severity === 'warning' ? 'text-amber-500' : 'text-ink-400'
</script>
