<script setup lang="ts">
// Delivery costs of the navbar outlet's e-shop (GET /eshop/reports/:outletId/
// shipping?from=&to=): for the paid e-shop orders that are not cancelled,
// what customers paid for delivery against what the parcels cost POW by the
// fee tables when each order was placed. A split order pays one parcel per
// shop while the customer pays one: the difference is the split extra.
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { defineVaDataTableColumns } from 'vuestic-ui'
import { useEshopOutlet } from '@/composables/useEshopOutlet'
import {
  dateFieldValue,
  dayStart,
  eshopApiError,
  formatDateTime,
  formatMoney,
  methodText,
  providerText,
} from './eshopHelpers'

const { t } = useI18n()
const url = import.meta.env.VITE_API_BASE_URL
const { outletId, outlet, hasEshop } = useEshopOutlet()

/** The server counts at most this many orders (eshopOrders.service shippingReport). */
const ROW_CAP = 5000
/** The server refuses a longer period ("At most about a year"). */
const MAX_DAYS = 400

const now = new Date()
const from = ref(dateFieldValue(new Date(now.getFullYear(), now.getMonth(), 1)))
const to = ref(dateFieldValue(now))
const loading = ref(false)
const error = ref('')
const report = ref<any>(null)

/** The period on the server's terms (from inclusive, to exclusive: the midnight after the last day), or why not. */
const period = computed<{ from: Date; to: Date } | string>(() => {
  const a = dayStart(from.value)
  const b = dayStart(to.value, 1)
  if (!a || !b) return t('eshop.shipping.pickDates')
  if (b <= a) return t('eshop.shipping.badRange')
  if (b.getTime() - a.getTime() > MAX_DAYS * 86400000) return t('eshop.shipping.tooLong')
  return { from: a, to: b }
})
const periodProblem = computed(() => (typeof period.value === 'string' ? period.value : ''))

let requestSeq = 0

async function load() {
  const id = outletId.value
  if (!id || !hasEshop.value) return
  const seq = ++requestSeq
  error.value = ''
  const p = period.value
  if (typeof p === 'string') {
    report.value = null
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data } = await axios.get(`${url}/eshop/reports/${id}/shipping`, {
      params: { from: p.from.toISOString(), to: p.to.toISOString() },
    })
    if (seq !== requestSeq) return
    report.value = data?.data || null
  } catch (err: any) {
    if (seq !== requestSeq) return
    report.value = null
    error.value = eshopApiError(err, t('eshop.shipping.toast.loadFailed'), t)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

watch(
  [outletId, hasEshop],
  () => {
    report.value = null
    error.value = ''
    load()
  },
  { immediate: true },
)
watch([from, to], load)

const rows = computed<any[]>(() => (Array.isArray(report.value?.rows) ? report.value.rows : []))

const columns = computed(() =>
  defineVaDataTableColumns([
    { label: t('eshop.shipping.columns.order'), key: 'orderRef' },
    { label: t('eshop.shipping.columns.date'), key: 'createdAt' },
    { label: t('eshop.shipping.columns.method'), key: 'method' },
    { label: t('eshop.shipping.columns.courier'), key: 'provider' },
    { label: t('eshop.shipping.columns.parcels'), key: 'parcels', thAlign: 'right' },
    { label: t('eshop.shipping.columns.charged'), key: 'customerCharge', thAlign: 'right' },
    { label: t('eshop.shipping.columns.cost'), key: 'costTotal', thAlign: 'right' },
    { label: t('eshop.shipping.columns.splitExtra'), key: 'splitExtra', thAlign: 'right' },
    { label: t('eshop.shipping.columns.margin'), key: 'margin', thAlign: 'right' },
  ]),
)

/** A courier order whose cost is not known: left out of the cost and the margin. */
const unknownCost = (r: any) => (r?.costTotal === null || r?.costTotal === undefined) && Number(r?.parcels) > 0
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div class="flex-1 min-w-[16rem]">
            <h1 class="va-h5">{{ t('eshop.shipping.title') }}</h1>
            <p class="text-sm text-slate-500 mt-1">{{ t('eshop.shipping.intro') }}</p>
          </div>
          <VaButton
            v-if="outletId && hasEshop"
            preset="secondary"
            size="small"
            icon="refresh"
            :loading="loading"
            @click="load"
          >
            {{ t('eshop.common.refresh') }}
          </VaButton>
        </div>

        <div v-if="!outletId" class="text-center text-slate-500 py-4">{{ t('eshop.common.selectOutlet') }}</div>
        <div v-else-if="!outlet" class="text-center text-slate-500 py-4">{{ t('eshop.common.loadingOutlet') }}</div>
        <VaAlert v-else-if="!hasEshop" color="info" border="left">{{ t('eshop.common.noEshop') }}</VaAlert>
        <template v-else>
          <div class="flex items-end gap-4 flex-wrap">
            <div class="w-44">
              <VaInput v-model="from" type="date" :label="t('eshop.shipping.from')" />
            </div>
            <div class="w-44">
              <VaInput v-model="to" type="date" :label="t('eshop.shipping.to')" />
            </div>
          </div>

          <VaAlert v-if="periodProblem" color="warning" border="left" class="mt-3">{{ periodProblem }}</VaAlert>
          <VaAlert v-if="error" color="danger" border="left" class="mt-3">{{ error }}</VaAlert>

          <template v-if="report">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              <div class="rounded-lg border border-slate-200 p-3">
                <div class="text-xs text-slate-500">{{ t('eshop.shipping.counts.orders') }}</div>
                <div class="text-xl font-semibold">{{ report.orders ?? 0 }}</div>
              </div>
              <div class="rounded-lg border border-slate-200 p-3">
                <div class="text-xs text-slate-500">{{ t('eshop.shipping.counts.charged') }}</div>
                <div class="text-xl font-semibold">{{ formatMoney(report.totals?.customerCharge ?? 0) }}</div>
              </div>
              <div class="rounded-lg border border-slate-200 p-3">
                <div class="text-xs text-slate-500">{{ t('eshop.shipping.counts.cost') }}</div>
                <div class="text-xl font-semibold">{{ formatMoney(report.totals?.costTotal ?? 0) }}</div>
              </div>
              <div class="rounded-lg border border-slate-200 p-3">
                <div class="text-xs text-slate-500">{{ t('eshop.shipping.counts.splitExtra') }}</div>
                <div class="text-xl font-semibold text-warning">{{ formatMoney(report.totals?.splitExtra ?? 0) }}</div>
              </div>
              <div class="rounded-lg border border-slate-200 p-3">
                <div class="text-xs text-slate-500">{{ t('eshop.shipping.counts.margin') }}</div>
                <div
                  class="text-xl font-semibold"
                  :class="Number(report.totals?.margin) < 0 ? 'text-danger' : 'text-success'"
                >
                  {{ formatMoney(report.totals?.margin ?? 0) }}
                </div>
              </div>
            </div>

            <VaAlert v-if="Number(report.unknownCosts) > 0" color="warning" border="left" class="mt-3">
              {{ t('eshop.shipping.unknownCosts', { n: report.unknownCosts }) }}
            </VaAlert>
            <VaAlert v-if="rows.length >= ROW_CAP" color="warning" border="left" class="mt-3">
              {{ t('eshop.shipping.capped', { n: ROW_CAP }) }}
            </VaAlert>
            <p class="va-text-secondary text-xs mt-2">{{ t('eshop.shipping.costHelp') }}</p>

            <VaDataTable
              class="mt-3"
              :columns="columns"
              :items="rows"
              :loading="loading"
              :style="{
                '--va-data-table-thead-background': 'var(--va-background-element)',
                '--va-data-table-thead-color': '#2C82E0',
              }"
              sticky-header
            >
              <template #cell(orderRef)="{ rowData }">
                <RouterLink
                  v-if="rowData.orderRef"
                  class="font-semibold text-primary hover:underline"
                  :to="{ name: 'eshopOrders', query: { search: rowData.orderRef } }"
                >
                  {{ rowData.orderRef }}
                </RouterLink>
              </template>
              <template #cell(createdAt)="{ rowData }">
                <span class="text-xs">{{ formatDateTime(rowData.createdAt) }}</span>
              </template>
              <template #cell(method)="{ rowData }">{{ methodText(rowData.method, t) }}</template>
              <template #cell(provider)="{ rowData }">{{ providerText(rowData.provider, t) }}</template>
              <template #cell(parcels)="{ rowData }">
                <div class="text-right">{{ rowData.parcels }}</div>
              </template>
              <template #cell(customerCharge)="{ rowData }">
                <div class="text-right">{{ formatMoney(rowData.customerCharge) }}</div>
              </template>
              <template #cell(costTotal)="{ rowData }">
                <div class="text-right" :class="{ 'text-warning': unknownCost(rowData) }">
                  {{ unknownCost(rowData) ? t('eshop.shipping.notKnown') : formatMoney(rowData.costTotal) || '—' }}
                </div>
              </template>
              <template #cell(splitExtra)="{ rowData }">
                <div class="text-right">{{ formatMoney(rowData.splitExtra) || '—' }}</div>
              </template>
              <template #cell(margin)="{ rowData }">
                <div class="text-right" :class="{ 'text-danger': Number(rowData.margin) < 0 }">
                  {{ formatMoney(rowData.margin) || '—' }}
                </div>
              </template>
              <template #bodyAppend>
                <tr v-if="!loading && !rows.length">
                  <td :colspan="columns.length" class="text-center text-slate-500 py-4">
                    {{ t('eshop.shipping.empty') }}
                  </td>
                </tr>
              </template>
            </VaDataTable>
          </template>
        </template>
      </VaCardContent>
    </VaCard>
  </div>
</template>
