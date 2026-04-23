<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { useServiceStore } from '@/stores/services'

const serviceStore = useServiceStore()

const dates = ref<string[]>([])
const selectedDate = ref('')
const logs = ref<any[]>([])
const isLoadingDates = ref(false)
const isLoadingLogs = ref(false)
const filterUser = ref('')
const filterLevel = ref<'all' | 'error' | 'warning' | 'normal'>('all')
const filterTimeFrom = ref('')
const filterTimeTo = ref('')
const filterOrderNo = ref('')

const API = import.meta.env.VITE_API_BASE_URL

// ─── Level classification ────────────────────────────────────────────────────
const ERROR_ACTIONS = ['FAILED', 'ERROR_']
const WARNING_ACTIONS = ['CANCELLED', 'AWAITING', 'INVALID']

function levelOf(action: string): 'error' | 'warning' | 'normal' {
  if (ERROR_ACTIONS.some((k) => action.includes(k))) return 'error'
  if (WARNING_ACTIONS.some((k) => action.includes(k))) return 'warning'
  return 'normal'
}

function levelColor(level: 'error' | 'warning' | 'normal') {
  if (level === 'error') return 'danger'
  if (level === 'warning') return 'warning'
  return 'info'
}

// ─── Data fetching ───────────────────────────────────────────────────────────
async function fetchDates() {
  const outletId = serviceStore.selectedRest
  if (!outletId) return
  isLoadingDates.value = true
  try {
    const { data } = await axios.get(`${API}/cc/logs/dates?outletId=${outletId}`)
    dates.value = data.dates || []
    if (dates.value.length && !selectedDate.value) {
      selectedDate.value = dates.value[0]
    }
  } catch {
    dates.value = []
  } finally {
    isLoadingDates.value = false
  }
}

async function fetchLogs() {
  const outletId = serviceStore.selectedRest
  if (!outletId || !selectedDate.value) return
  isLoadingLogs.value = true
  try {
    const { data } = await axios.get(`${API}/cc/logs?outletId=${outletId}&date=${selectedDate.value}`)
    logs.value = data.logs || []
  } catch {
    logs.value = []
  } finally {
    isLoadingLogs.value = false
  }
}

function matchesOrderNo(entry: any, q: string) {
  if (!q) return true
  const table = String(entry?.details?.tableNumber ?? '').toLowerCase()
  const oid = String(entry?.details?.orderId ?? '').toLowerCase()
  return table.includes(q) || oid.includes(q)
}

// ─── Filtering ───────────────────────────────────────────────────────────────
const filteredLogs = computed(() => {
  let result = logs.value

  if (filterUser.value.trim()) {
    const q = filterUser.value.trim().toLowerCase()
    result = result.filter((l) => (l.userName || '').toLowerCase().includes(q))
  }

  if (filterLevel.value !== 'all') {
    result = result.filter((l) => levelOf(l.action) === filterLevel.value)
  }

  if (filterTimeFrom.value) {
    const [fh, fm] = filterTimeFrom.value.split(':').map(Number)
    result = result.filter((l) => {
      const d = new Date(l.timestamp)
      return d.getHours() * 60 + d.getMinutes() >= fh * 60 + fm
    })
  }

  if (filterTimeTo.value) {
    const [th, tm] = filterTimeTo.value.split(':').map(Number)
    result = result.filter((l) => {
      const d = new Date(l.timestamp)
      return d.getHours() * 60 + d.getMinutes() <= th * 60 + tm
    })
  }

  if (filterOrderNo.value.trim()) {
    const q = filterOrderNo.value.trim().toLowerCase()
    result = result.filter((l) => matchesOrderNo(l, q))
  }

  return [...result].reverse()
})

// ─── Counts for filter buttons ───────────────────────────────────────────────
const counts = computed(() => {
  const all = logs.value.length
  const error = logs.value.filter((l) => levelOf(l.action) === 'error').length
  const warning = logs.value.filter((l) => levelOf(l.action) === 'warning').length
  const normal = logs.value.filter((l) => levelOf(l.action) === 'normal').length
  return { all, error, warning, normal }
})

// ─── Watchers ────────────────────────────────────────────────────────────────
watch(selectedDate, fetchLogs)

watch(
  () => serviceStore.selectedRest,
  () => {
    selectedDate.value = ''
    dates.value = []
    logs.value = []
    fetchDates()
  },
)

onMounted(fetchDates)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const expandedIndex = ref<number | null>(null)
function toggleExpand(i: number) {
  expandedIndex.value = expandedIndex.value === i ? null : i
}

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── View mode ───────────────────────────────────────────────────────────────
const viewMode = ref<'logs' | 'sessions'>('logs')

// ─── Session grouping ────────────────────────────────────────────────────────
const SESSION_GAP_MS = 30 * 60 * 1000

type Session = {
  user: string
  startTimestamp: string
  lastTimestamp: string
  logs: any[]
  outcome: 'completed' | 'failed' | 'refreshed' | 'dismissed' | 'incomplete'
}

function sessionOutcome(sessionLogs: any[]): Session['outcome'] {
  const actions = sessionLogs.map((l) => l.action)
  if (actions.some((a) => a === 'ORDER_PLACED')) return 'completed'
  if (actions.some((a) => a.includes('FAILED') || a.includes('ERROR_'))) return 'failed'
  if (actions.some((a) => a === 'PAGE_REFRESHED')) return 'refreshed'
  if (actions.some((a) => a === 'CHECKOUT_DISMISSED')) return 'dismissed'
  return 'incomplete'
}

const sessions = computed((): Session[] => {
  // Apply user + time filters but not level filter (sessions show full picture)
  let source = logs.value

  if (filterUser.value.trim()) {
    const q = filterUser.value.trim().toLowerCase()
    source = source.filter((l) => (l.userName || '').toLowerCase().includes(q))
  }

  if (filterTimeFrom.value) {
    const [fh, fm] = filterTimeFrom.value.split(':').map(Number)
    source = source.filter((l) => {
      const d = new Date(l.timestamp)
      return d.getHours() * 60 + d.getMinutes() >= fh * 60 + fm
    })
  }

  if (filterTimeTo.value) {
    const [th, tm] = filterTimeTo.value.split(':').map(Number)
    source = source.filter((l) => {
      const d = new Date(l.timestamp)
      return d.getHours() * 60 + d.getMinutes() <= th * 60 + tm
    })
  }

  const sorted = [...source].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const result: Session[] = []
  for (const entry of sorted) {
    const last = [...result].reverse().find(
      (s) =>
        s.user === (entry.userName || 'unknown') &&
        new Date(entry.timestamp).getTime() - new Date(s.lastTimestamp).getTime() < SESSION_GAP_MS,
    )
    if (last) {
      last.logs.push(entry)
      last.lastTimestamp = entry.timestamp
    } else {
      result.push({
        user: entry.userName || 'unknown',
        startTimestamp: entry.timestamp,
        lastTimestamp: entry.timestamp,
        logs: [entry],
        outcome: 'incomplete',
      })
    }
  }

  for (const s of result) s.outcome = sessionOutcome(s.logs)

  let final = result
  if (filterOrderNo.value.trim()) {
    const q = filterOrderNo.value.trim().toLowerCase()
    final = final.filter((s) => s.logs.some((l) => matchesOrderNo(l, q)))
  }

  return final.reverse()
})

const expandedSession = ref<number | null>(null)
function toggleSession(i: number) {
  expandedSession.value = expandedSession.value === i ? null : i
}

const outcomeLabel: Record<Session['outcome'], string> = {
  completed: 'Order Placed',
  failed: 'Failed',
  refreshed: 'Page Refreshed',
  dismissed: 'Dismissed',
  incomplete: 'Incomplete',
}

const outcomeBg: Record<Session['outcome'], string> = {
  completed: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  refreshed: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  dismissed: 'bg-orange-100 text-orange-800 border-orange-300',
  incomplete: 'bg-slate-100 text-slate-600 border-slate-300',
}

const sessionBorder: Record<Session['outcome'], string> = {
  completed: 'border-green-200',
  failed: 'border-red-200',
  refreshed: 'border-yellow-200',
  dismissed: 'border-orange-200',
  incomplete: 'border-slate-200',
}
</script>

<template>
  <div class="p-4">
    <div class="flex items-center gap-3 justify-between mb-4">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-bold">Call Center Logs</h2>
        <VaButton
          icon="refresh"
          size="small"
          :loading="isLoadingLogs"
          @click="fetchDates().then(fetchLogs)"
        >Refresh</VaButton>
      </div>
      <!-- View toggle -->
      <div class="flex rounded overflow-hidden border border-slate-300 text-sm">
        <button
          class="px-4 py-1.5 font-medium transition"
          :class="viewMode === 'logs' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
          @click="viewMode = 'logs'"
        >Logs</button>
        <button
          class="px-4 py-1.5 font-medium transition"
          :class="viewMode === 'sessions' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
          @click="viewMode = 'sessions'"
        >Sessions</button>
      </div>
    </div>

    <!-- Top filters row -->
    <div class="flex flex-wrap gap-4 mb-4">
      <VaSelect
        v-model="selectedDate"
        :options="dates"
        placeholder="Select date"
        :loading="isLoadingDates"
        style="min-width: 180px"
        label="Date"
      />

      <VaInput
        v-model="filterUser"
        placeholder="Filter by user..."
        label="User"
        style="min-width: 180px"
        clearable
      />

      <VaInput
        v-model="filterOrderNo"
        placeholder="Filter by order no..."
        label="Order No"
        style="min-width: 180px"
        clearable
      />

      <div class="flex items-end gap-2">
        <VaInput
          v-model="filterTimeFrom"
          type="time"
          label="From"
          style="min-width: 130px"
        />
        <VaInput
          v-model="filterTimeTo"
          type="time"
          label="To"
          style="min-width: 130px"
        />
      </div>

    </div>

    <!-- Level filter pills -->
    <div class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="lvl in (['all', 'error', 'warning', 'normal'] as const)"
        :key="lvl"
        class="px-3 py-1 rounded-full text-xs font-semibold border transition"
        :class="{
          'bg-slate-800 text-white border-slate-800': filterLevel === lvl,
          'bg-red-100 text-red-700 border-red-300 hover:bg-red-200': lvl === 'error' && filterLevel !== lvl,
          'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200': lvl === 'warning' && filterLevel !== lvl,
          'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200': lvl === 'normal' && filterLevel !== lvl,
          'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200': lvl === 'all' && filterLevel !== lvl,
        }"
        @click="filterLevel = lvl"
      >
        {{ lvl.charAt(0).toUpperCase() + lvl.slice(1) }}
        <span class="ml-1 opacity-70">({{ counts[lvl] }})</span>
      </button>
    </div>

    <!-- States -->
    <div v-if="!serviceStore.selectedRest" class="text-slate-400 text-sm">
      Please select an outlet from the top navigation bar.
    </div>

    <div v-else-if="isLoadingLogs" class="flex justify-center py-10">
      <VaProgressCircle indeterminate />
    </div>

    <div v-else-if="!selectedDate" class="text-slate-400 text-sm">
      Select a date to view logs.
    </div>

    <!-- ── LOGS VIEW ───────────────────────────────────────────────────────── -->
    <template v-else-if="viewMode === 'logs'">
      <div v-if="filteredLogs.length === 0" class="text-slate-400 text-sm">
        No logs found for this date/filter.
      </div>

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="(entry, i) in filteredLogs"
          :key="i"
          class="border rounded-lg bg-white shadow-sm overflow-hidden"
          :class="{
            'border-red-200': levelOf(entry.action) === 'error',
            'border-yellow-200': levelOf(entry.action) === 'warning',
            'border-blue-100': levelOf(entry.action) === 'normal',
          }"
        >
          <div
            class="flex items-center gap-3 px-4 py-2 cursor-pointer transition"
            :class="{
              'bg-red-50 hover:bg-red-100': levelOf(entry.action) === 'error',
              'bg-yellow-50 hover:bg-yellow-100': levelOf(entry.action) === 'warning',
              'bg-blue-50 hover:bg-blue-100': levelOf(entry.action) === 'normal',
            }"
            @click="toggleExpand(i)"
          >
            <VaBadge :text="entry.action" :color="levelColor(levelOf(entry.action))" class="shrink-0 text-xs" />
            <span class="text-slate-700 font-medium text-sm">{{ entry.userName || 'unknown' }}</span>

            <!-- Inline detail for ORDER_TIMING_SELECTED -->
            <template v-if="entry.action === 'ORDER_TIMING_SELECTED'">
              <div class="flex rounded overflow-hidden border border-slate-300 text-xs ml-2 shrink-0">
                <span
                  class="px-2 py-0.5 font-semibold"
                  :class="entry.details?.mode === 'current' ? 'bg-green-700 text-white' : 'bg-slate-100 text-slate-500'"
                >Order Now</span>
                <span
                  class="px-2 py-0.5 font-semibold"
                  :class="entry.details?.mode === 'future' ? 'bg-green-700 text-white' : 'bg-slate-100 text-slate-500'"
                >Future Order</span>
              </div>
            </template>

            <!-- Inline detail for FUTURE_ORDER_DATETIME_SET -->
            <template v-else-if="entry.action === 'FUTURE_ORDER_DATETIME_SET' && entry.details?.datetime">
              <span class="ml-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-slate-700 shrink-0">
                {{ formatDatetime(entry.details.datetime) }}
              </span>
            </template>

            <span class="text-slate-400 text-xs ml-auto">{{ formatTime(entry.timestamp) }}</span>
            <VaIcon :name="expandedIndex === i ? 'expand_less' : 'expand_more'" size="small" class="text-slate-400" />
          </div>

          <div v-if="expandedIndex === i" class="border-t px-4 py-3 bg-white">
            <pre class="text-xs text-slate-600 whitespace-pre-wrap break-all">{{ JSON.stringify(entry.details, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </template>

    <!-- ── SESSIONS VIEW ──────────────────────────────────────────────────── -->
    <template v-else>
      <div v-if="sessions.length === 0" class="text-slate-400 text-sm">
        No sessions found for this date/filter.
      </div>

      <div v-else class="flex flex-col gap-3">
        <div
          v-for="(session, si) in sessions"
          :key="si"
          class="border rounded-lg bg-white shadow-sm overflow-hidden"
          :class="sessionBorder[session.outcome]"
        >
          <!-- Session header -->
          <div
            class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition"
            @click="toggleSession(si)"
          >
            <!-- Outcome badge -->
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded border shrink-0"
              :class="outcomeBg[session.outcome]"
            >{{ outcomeLabel[session.outcome] }}</span>

            <span class="text-slate-700 font-medium text-sm">{{ session.user }}</span>

            <span class="text-slate-500 text-xs">
              {{ formatTime(session.startTimestamp) }} – {{ formatTime(session.lastTimestamp) }}
            </span>

            <!-- Order No (tableNumber) if completed -->
            <span
              v-if="session.outcome === 'completed'"
              class="text-xs font-mono bg-green-50 border border-green-200 text-green-800 rounded px-2 py-0.5 shrink-0"
            >
              #{{ session.logs.find((l) => l.action === 'ORDER_PLACED')?.details?.tableNumber ?? '—' }}
            </span>

            <span class="ml-auto text-xs text-slate-400">{{ session.logs.length }} events</span>
            <VaIcon :name="expandedSession === si ? 'expand_less' : 'expand_more'" size="small" class="text-slate-400" />
          </div>

          <!-- Session timeline -->
          <div v-if="expandedSession === si" class="border-t px-4 py-3 bg-slate-50">
            <div class="flex flex-col gap-1">
              <div
                v-for="(entry, ei) in session.logs"
                :key="ei"
                class="flex items-center gap-2 text-xs py-1 border-b border-slate-100 last:border-0"
              >
                <span class="text-slate-400 font-mono w-20 shrink-0">{{ formatTime(entry.timestamp) }}</span>
                <VaBadge :text="entry.action" :color="levelColor(levelOf(entry.action))" class="shrink-0" />

                <!-- Inline extras -->
                <template v-if="entry.action === 'ORDER_TIMING_SELECTED'">
                  <span class="text-slate-500">→ {{ entry.details?.mode === 'future' ? 'Future Order' : 'Order Now' }}</span>
                </template>
                <template v-else-if="entry.action === 'FUTURE_ORDER_DATETIME_SET' && entry.details?.datetime">
                  <span class="text-slate-500">→ {{ formatDatetime(entry.details.datetime) }}</span>
                </template>
                <template v-else-if="entry.action === 'ORDER_PLACED'">
                  <span class="text-slate-500">order #{{ entry.details?.tableNumber ?? '—' }} | {{ entry.details?.orderType }}</span>
                </template>
                <template v-else-if="entry.details && Object.keys(entry.details).length">
                  <span class="text-slate-400 truncate max-w-xs">{{ JSON.stringify(entry.details) }}</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
