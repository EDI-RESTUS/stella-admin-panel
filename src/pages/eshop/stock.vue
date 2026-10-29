<script setup lang="ts">
// E-shop stock of the navbar outlet: the state of the Winmax stock and weight
// reads (GET /eshop/sync/:outletId), buttons to read now (admins — the backend
// refuses the others), and one article looked up by code: the stock mirror
// next to a live Winmax read, per shop, with its web status (the live view
// next to what is saved on the menu item) and weight.
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { useToast, useModal, defineVaDataTableColumns } from 'vuestic-ui'
import { useEshopOutlet } from '@/composables/useEshopOutlet'
import {
  eshopApiError,
  formatDateTime,
  formatNumber,
  formatPrice,
  idleReasonText,
  plainName,
  webStatusView,
  weightReasonText,
} from './eshopHelpers'

const { t, locale } = useI18n()
const { init } = useToast()
const { confirm } = useModal()
const url = import.meta.env.VITE_API_BASE_URL
const { outletId, outlet, hasEshop, isAdmin } = useEshopOutlet()

type SyncView = { state: any; running: boolean; reason: string }

const syncLoading = ref(false)
const syncError = ref('')
const sync = ref<SyncView | null>(null)
const busy = ref<'' | 'incremental' | 'full' | 'weights'>('')
// One line about the last read started from this page.
const lastRun = ref('')
const lastRunFailed = ref(false)

const code = ref('')
const lookupLoading = ref(false)
const lookupError = ref('')
const lookup = ref<any>(null)

const state = computed(() => sync.value?.state || null)

/* ---------------- Sync state ---------------- */
async function loadSync() {
  const id = outletId.value
  if (!id || !hasEshop.value) return
  syncLoading.value = true
  syncError.value = ''
  try {
    const { data } = await axios.get(`${url}/eshop/sync/${id}`)
    if (id !== outletId.value) return
    sync.value = data?.data || null
  } catch (err: any) {
    if (id !== outletId.value) return
    sync.value = null
    syncError.value = eshopApiError(err, t('eshop.stock.toast.syncLoadFailed'), t)
  } finally {
    if (id === outletId.value) syncLoading.value = false
  }
}

watch(
  [outletId, hasEshop],
  () => {
    sync.value = null
    syncError.value = ''
    lastRun.value = ''
    lookup.value = null
    lookupError.value = ''
    loadSync()
  },
  { immediate: true },
)

/* ---------------- Read now (admins) ---------------- */
function summaryLine(kind: 'incremental' | 'full' | 'weights', s: any): string {
  if (s?.skipped) return t('eshop.stock.runSkipped', { reason: idleReasonText(s.skipped, t) })
  if (kind === 'weights') {
    return t('eshop.stock.weightsDone', {
      ok: s?.ok ?? 0,
      invalid: s?.invalid ?? 0,
      removed: s?.removed ?? 0,
      ms: s?.ms ?? 0,
    })
  }
  return t(s?.mode === 'full' ? 'eshop.stock.fullDone' : 'eshop.stock.incrementalDone', {
    rows: s?.rows ?? 0,
    changes: s?.statusChanges ?? 0,
    zeroed: s?.zeroed ?? 0,
    ms: s?.ms ?? 0,
  })
}

async function run(kind: 'incremental' | 'full' | 'weights') {
  const id = outletId.value
  if (!id || !isAdmin.value || busy.value) return
  if (kind === 'full') {
    const ok = await confirm({
      title: t('eshop.stock.fullConfirmTitle'),
      message: t('eshop.stock.fullConfirmMessage'),
      okText: t('eshop.stock.fullConfirmOk'),
      cancelText: t('eshop.common.cancel'),
      size: 'medium',
    })
    if (!ok || id !== outletId.value) return
  }
  busy.value = kind
  try {
    const { data } =
      kind === 'weights'
        ? await axios.post(`${url}/eshop/weights/${id}/resync`)
        : await axios.post(`${url}/eshop/stock/${id}/resync`, { mode: kind })
    const line = summaryLine(kind, data?.data)
    if (id === outletId.value) {
      lastRun.value = line
      lastRunFailed.value = false
    }
    init({ message: line, color: data?.data?.skipped ? 'warning' : 'success' })
  } catch (err: any) {
    const message = eshopApiError(err, t('eshop.stock.toast.runFailed'), t)
    if (id === outletId.value) {
      lastRun.value = message
      lastRunFailed.value = true
    }
    init({ message, color: 'danger' })
  } finally {
    busy.value = ''
    if (id === outletId.value) loadSync()
  }
}

/* ---------------- Article lookup ---------------- */
async function lookUp() {
  const id = outletId.value
  const articleCode = code.value.trim()
  if (!id || !articleCode) return
  lookupLoading.value = true
  lookupError.value = ''
  try {
    const { data } = await axios.get(`${url}/eshop/stock/${id}`, { params: { code: articleCode } })
    if (id !== outletId.value) return
    lookup.value = data?.data || null
  } catch (err: any) {
    if (id !== outletId.value) return
    lookup.value = null
    lookupError.value = eshopApiError(err, t('eshop.stock.toast.lookupFailed'), t)
  } finally {
    if (id === outletId.value) lookupLoading.value = false
  }
}

/** A ContentCard voucher: sold as a digital code, no stock behind it. */
const isVoucher = computed(() => lookup.value?.menuItem?.voucherProvider === 'contentcard')

/** The web-status badge: the live view the lookup worked out (data.web) when it has one, else the saved field. */
const itemStatus = computed(() => {
  if (isVoucher.value) return webStatusView('digital')
  return webStatusView(lookup.value?.web?.status ?? lookup.value?.menuItem?.eshopStock?.status)
})

/**
 * "Saved in Stella: …" — menuitems.eshopStock in words: the free-to-sell total of the active shops
 * that keep a stock number and the Low Stock threshold (the highest of their minimums); both null =
 * sold without a limit; no field at all = the stock reads have not reached the article yet.
 */
const savedText = computed(() => {
  const saved = lookup.value?.menuItem?.eshopStock
  if (!saved) return t('eshop.stock.savedNone')
  const when = formatDateTime(saved.updatedAt) || '—'
  if (saved.total === null || saved.total === undefined) return t('eshop.stock.savedUnlimited', { when })
  return t('eshop.stock.savedTotals', {
    total: formatNumber(saved.total) || '0',
    minimum: formatNumber(saved.minimum) || '0',
    when,
  })
})

const weightText = computed(() => {
  const w = lookup.value?.weight
  if (!w) return t('eshop.stock.weightMissing')
  if (w.weightStatus === 'ok')
    return t('eshop.stock.weightOk', { raw: formatNumber(w.weightRaw), grams: w.weightGrams })
  return t('eshop.stock.weightInvalid', {
    raw: formatNumber(w.weightRaw),
    reason: weightReasonText(w.weightReason, t),
  })
})

const shopColumns = computed(() =>
  defineVaDataTableColumns([
    { label: t('eshop.stock.columns.shop'), key: 'shop' },
    { label: t('eshop.stock.columns.warehouse'), key: 'warehouseCode' },
    { label: t('eshop.stock.columns.active'), key: 'active', thAlign: 'center' },
    { label: t('eshop.stock.columns.live'), key: 'live', thAlign: 'right' },
    { label: t('eshop.stock.columns.mirror'), key: 'mirror', thAlign: 'right' },
    { label: t('eshop.stock.columns.ordered'), key: 'ordered', thAlign: 'right' },
    { label: t('eshop.stock.columns.minimum'), key: 'minimum', thAlign: 'right' },
    { label: t('eshop.stock.columns.free'), key: 'free', thAlign: 'right' },
    { label: t('eshop.stock.columns.readAt'), key: 'readAt' },
  ]),
)

/** Live and mirror both read and different: the mirror has not caught up yet. */
function mirrorBehind(row: any): boolean {
  return !!row.live && !!row.mirror && Number(row.live.current) !== Number(row.mirror.current)
}

/** Ordered by customers / minimum: the live Winmax value when there is one, else the mirror's. */
function liveOrMirror(row: any, field: 'orderedFromCustomers' | 'minimum'): string {
  const v = row.live ? row.live[field] : row.mirror ? row.mirror[field] : null
  return formatNumber(v) || '0'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div class="flex-1 min-w-[16rem]">
            <h1 class="va-h5">{{ t('eshop.stock.title') }}</h1>
            <p class="text-sm text-slate-500 mt-1">{{ t('eshop.stock.intro') }}</p>
          </div>
          <VaButton
            v-if="outletId && hasEshop"
            preset="secondary"
            size="small"
            icon="refresh"
            :loading="syncLoading"
            @click="loadSync"
          >
            {{ t('eshop.common.refresh') }}
          </VaButton>
        </div>

        <div v-if="!outletId" class="text-center text-slate-500 py-4">{{ t('eshop.common.selectOutlet') }}</div>
        <div v-else-if="!outlet" class="text-center text-slate-500 py-4">{{ t('eshop.common.loadingOutlet') }}</div>
        <VaAlert v-else-if="!hasEshop" color="info" border="left">{{ t('eshop.common.noEshop') }}</VaAlert>
        <template v-else>
          <VaAlert v-if="syncError" color="danger" border="left" class="mb-3">{{ syncError }}</VaAlert>
          <div v-if="syncLoading && !sync" class="text-center text-slate-500 py-4">{{ t('eshop.common.loading') }}</div>

          <template v-if="sync">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-sm">{{ t('eshop.stock.syncStatus') }}</span>
              <VaBadge
                :text="sync.running ? t('eshop.stock.running') : t('eshop.stock.idle')"
                :color="sync.running ? 'success' : 'warning'"
              />
              <span v-if="!sync.running" class="text-sm">{{ idleReasonText(sync.reason, t) }}</span>
            </div>

            <div v-if="!state" class="text-sm text-slate-500 mt-3">{{ t('eshop.stock.neverRead') }}</div>
            <dl v-else class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-3 text-sm">
              <div>
                <dt class="text-xs text-slate-500">{{ t('eshop.stock.lastIncremental') }}</dt>
                <dd>{{ formatDateTime(state.lastIncrementalAt) || t('eshop.common.never') }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">{{ t('eshop.stock.lastFull') }}</dt>
                <dd>{{ formatDateTime(state.lastFullAt) || t('eshop.common.never') }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">{{ t('eshop.stock.lastSummary') }}</dt>
                <dd>{{ state.lastSummary || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">{{ t('eshop.stock.lastWeights') }}</dt>
                <dd>
                  {{ formatDateTime(state.lastWeightsAt) || t('eshop.common.never') }}
                  <span v-if="state.lastWeightsSummary"> — {{ state.lastWeightsSummary }}</span>
                </dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">{{ t('eshop.stock.warehouses') }}</dt>
                <dd>{{ (state.warehouses || []).join(', ') || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">{{ t('eshop.stock.watermark') }}</dt>
                <dd>{{ formatNumber(state.rowVerWatermark) || '—' }}</dd>
              </div>
            </dl>
            <VaAlert v-if="state && state.lastError" color="danger" border="left" class="mt-3">
              {{
                t('eshop.stock.lastError', { when: formatDateTime(state.lastErrorAt) || '—', error: state.lastError })
              }}
            </VaAlert>
          </template>

          <div v-if="isAdmin" class="flex items-center gap-2 flex-wrap mt-4">
            <VaButton
              size="small"
              icon="sync"
              :loading="busy === 'incremental'"
              :disabled="!!busy || !sync?.running"
              @click="run('incremental')"
            >
              {{ t('eshop.stock.readChanges') }}
            </VaButton>
            <VaButton
              preset="secondary"
              size="small"
              icon="mso-database"
              :loading="busy === 'full'"
              :disabled="!!busy || !sync?.running"
              @click="run('full')"
            >
              {{ t('eshop.stock.readAll') }}
            </VaButton>
            <VaButton
              preset="secondary"
              size="small"
              icon="mso-weight"
              :loading="busy === 'weights'"
              :disabled="!!busy || !sync?.running"
              @click="run('weights')"
            >
              {{ t('eshop.stock.readWeights') }}
            </VaButton>
          </div>
          <div v-else class="text-xs text-slate-500 mt-4">{{ t('eshop.stock.adminOnly') }}</div>
          <div v-if="lastRun" class="text-sm mt-2" :class="lastRunFailed ? 'text-danger' : 'text-slate-600'">
            {{ lastRun }}
          </div>
        </template>
      </VaCardContent>
    </VaCard>

    <VaCard v-if="outletId && hasEshop">
      <VaCardContent>
        <h2 class="va-h6">{{ t('eshop.stock.lookupTitle') }}</h2>
        <p class="va-text-secondary text-xs mt-1">{{ t('eshop.stock.lookupHelp') }}</p>
        <form class="flex items-end gap-2 mt-3 flex-wrap" @submit.prevent="lookUp">
          <div class="w-64">
            <VaInput v-model="code" maxlength="40" :label="t('eshop.stock.code')" />
          </div>
          <VaButton type="submit" size="small" icon="search" :loading="lookupLoading" :disabled="!code.trim()">
            {{ t('eshop.stock.lookUp') }}
          </VaButton>
        </form>
        <VaAlert v-if="lookupError" color="danger" border="left" class="mt-3">{{ lookupError }}</VaAlert>

        <template v-if="lookup">
          <div class="mt-4 flex flex-col gap-1 text-sm">
            <div v-if="lookup.menuItem" class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold">{{ plainName(lookup.menuItem.name, locale) || '—' }}</span>
              <span class="text-slate-500">{{ lookup.menuItem.code }}</span>
              <span v-if="formatPrice(lookup.menuItem.price)">{{ formatPrice(lookup.menuItem.price) }}</span>
              <span class="text-slate-500">{{ t('eshop.stock.webStatus') }}</span>
              <VaBadge :text="t(itemStatus.key)" :color="itemStatus.color" />
            </div>
            <div v-else class="text-warning">{{ t('eshop.stock.noMenuItem', { code: lookup.code }) }}</div>
            <div v-if="lookup.menuItem && !isVoucher">
              <span class="text-slate-500">{{ t('eshop.stock.saved') }}</span>
              {{ savedText }}
            </div>
            <div>
              <span class="text-slate-500">{{ t('eshop.stock.weight') }}</span>
              {{ weightText }}
            </div>
          </div>
          <VaAlert v-if="lookup.liveError" color="warning" border="left" class="mt-3">
            {{ t('eshop.stock.liveError', { error: lookup.liveError }) }}
          </VaAlert>

          <VaDataTable
            class="mt-3"
            :columns="shopColumns"
            :items="lookup.shops || []"
            :style="{
              '--va-data-table-thead-background': 'var(--va-background-element)',
              '--va-data-table-thead-color': '#2C82E0',
            }"
          >
            <template #cell(shop)="{ rowData }">
              <span class="font-semibold">{{ rowData.shop?.name || t('eshop.stock.noShop') }}</span>
            </template>
            <template #cell(active)="{ rowData }">
              <div class="flex justify-center">
                <VaBadge
                  :text="rowData.shop?.active ? t('eshop.common.yes') : t('eshop.common.no')"
                  :color="rowData.shop?.active ? 'success' : 'secondary'"
                />
              </div>
            </template>
            <template #cell(live)="{ rowData }">
              <div class="text-right">
                <template v-if="rowData.live">{{ formatNumber(rowData.live.current) }}</template>
                <span v-else-if="lookup.liveError" class="text-slate-400">?</span>
                <template v-else>
                  0 <span class="text-xs text-slate-400">{{ t('eshop.stock.noRow') }}</span>
                </template>
              </div>
            </template>
            <template #cell(mirror)="{ rowData }">
              <div class="text-right" :class="{ 'text-warning font-semibold': mirrorBehind(rowData) }">
                <template v-if="rowData.mirror">{{ formatNumber(rowData.mirror.current) }}</template>
                <template v-else>
                  0 <span class="text-xs text-slate-400">{{ t('eshop.stock.noRow') }}</span>
                </template>
              </div>
            </template>
            <template #cell(ordered)="{ rowData }">
              <div class="text-right">{{ liveOrMirror(rowData, 'orderedFromCustomers') }}</div>
            </template>
            <template #cell(minimum)="{ rowData }">
              <div class="text-right">{{ liveOrMirror(rowData, 'minimum') }}</div>
            </template>
            <template #cell(free)="{ rowData }">
              <div class="text-right font-semibold">{{ formatNumber(rowData.mirror?.free) || '0' }}</div>
            </template>
            <template #cell(readAt)="{ rowData }">
              <span class="text-xs">{{ formatDateTime(rowData.mirror?.readAt) || '—' }}</span>
            </template>
            <template #bodyAppend>
              <tr v-if="!(lookup.shops || []).length">
                <td :colspan="shopColumns.length" class="text-center text-slate-500 py-4">
                  {{ t('eshop.stock.noShops') }}
                </td>
              </tr>
            </template>
          </VaDataTable>
          <p class="va-text-secondary text-xs mt-2">{{ t('eshop.stock.columnsHelp') }}</p>
        </template>
      </VaCardContent>
    </VaCard>
  </div>
</template>
