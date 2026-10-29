<script setup lang="ts">
// A shop's own opening hours, Monday to Sunday (v-model: the week, or null =
// no own hours). Display only: the apps and websites show them on their
// Locations page; orders follow the outlet's hours. Emits fresh objects only.
import { computed, ref, watch } from 'vue'
import {
  WEEKDAYS,
  emptyByDay,
  problems,
  summary,
  type OpeningWindow,
  type WeekdayKey,
  type ZoneOpeningTimes,
} from '@/services/openingTimes'

// remembered: the week to give back when the switch goes on again (kept by
// the parent, because this editor is re-created around loading states).
const props = defineProps<{
  modelValue: ZoneOpeningTimes | null
  disabled?: boolean
  remembered?: Record<WeekdayKey, OpeningWindow> | null
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: ZoneOpeningTimes | null): void }>()

const copy = (byDay: Record<WeekdayKey, OpeningWindow>) => JSON.parse(JSON.stringify(byDay))

// The rows last held, so switching off and on again gives them back.
const lastRows = ref<Record<WeekdayKey, OpeningWindow>>(
  props.modelValue ? copy(props.modelValue.byDay) : props.remembered ? copy(props.remembered) : emptyByDay(),
)
watch(
  () => props.modelValue,
  (v) => {
    if (v) lastRows.value = copy(v.byDay)
  },
)

const on = computed({
  get: () => props.modelValue !== null,
  set: (val: boolean) => emit('update:modelValue', val ? { selected: 'byDay', byDay: copy(lastRows.value) } : null),
})
const rows = computed(() => props.modelValue?.byDay ?? lastRows.value)
const issues = computed(() => problems(props.modelValue))
const preview = computed(() => summary(props.modelValue))

function setTime(day: WeekdayKey, field: 'opens' | 'closes', value: string) {
  if (!props.modelValue) return
  const byDay = copy(props.modelValue.byDay)
  byDay[day] = { ...byDay[day], [field]: value }
  emit('update:modelValue', { selected: 'byDay', byDay })
}

const isClosed = (day: WeekdayKey) => !rows.value[day]?.opens && !rows.value[day]?.closes

function setClosed(day: WeekdayKey, closed: boolean) {
  if (!props.modelValue) return
  const byDay = copy(props.modelValue.byDay)
  if (closed) {
    byDay[day] = { opens: '', closes: '' }
  } else {
    // Reopen with the nearest earlier open day's times.
    const idx = WEEKDAYS.findIndex((d) => d.key === day)
    let source: OpeningWindow | null = null
    for (let i = idx - 1; i >= 0 && !source; i--) {
      const w = byDay[WEEKDAYS[i].key]
      if (w.opens && w.closes) source = w
    }
    byDay[day] = source ? { ...source } : { opens: '09:00', closes: '17:00' }
  }
  emit('update:modelValue', { selected: 'byDay', byDay })
}
</script>

<template>
  <div>
    <VaSwitch v-model="on" size="small" left-label label="This shop has its own opening hours" :disabled="disabled" />
    <p class="va-text-secondary text-xs mt-1">
      Cyprus time. Shown on the Locations page of the app and website. A day without times is closed; a closing time of
      00:00 means midnight. Orders follow the outlet's opening hours.
    </p>
    <div v-if="modelValue" class="flex flex-col gap-2 mt-3">
      <div v-for="d in WEEKDAYS" :key="d.key" class="flex items-center gap-2 flex-wrap">
        <span class="w-24 day">{{ d.label }}</span>
        <input
          type="time"
          class="border border-1 h-8 min-w-[120px] px-2 rounded"
          :value="rows[d.key].opens"
          :disabled="disabled || isClosed(d.key)"
          @input="setTime(d.key, 'opens', ($event.target as HTMLInputElement).value)"
        />
        <span>–</span>
        <input
          type="time"
          class="border border-1 h-8 min-w-[120px] px-2 rounded"
          :value="rows[d.key].closes"
          :disabled="disabled || isClosed(d.key)"
          @input="setTime(d.key, 'closes', ($event.target as HTMLInputElement).value)"
        />
        <VaCheckbox
          :model-value="isClosed(d.key)"
          label="Closed"
          :disabled="disabled"
          @update:modelValue="(v: boolean) => setClosed(d.key, v)"
        />
        <span v-if="issues.days[d.key]" class="text-danger text-xs">{{ issues.days[d.key] }}</span>
      </div>
      <p v-if="issues.week" class="text-danger text-xs">{{ issues.week }}</p>
      <p v-if="preview" class="text-sm mt-1"><strong>Customers see:</strong> {{ preview }}</p>
    </div>
  </div>
</template>

<style scoped>
.day {
  font-size: 12px;
}
</style>
