<script setup lang="ts">
// Stock holds of the navbar outlet's e-shop orders (GET /eshop/reservations/
// :outletId?status=&limit=), newest first. A hold keeps an order's items in
// its shops while the customer pays (active); once paid it stays (confirmed)
// until the order's Winmax documents take the stock (consumed); otherwise it
// goes back (released, expired). A late payment takes the items again under
// a new try (attempt). Read-only.
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { defineVaDataTableColumns } from 'vuestic-ui'
import { useEshopOutlet } from '@/composables/useEshopOutlet'
import { useEshopShops } from './useEshopShops'
import {
  HOLD_STATUSES,
  eshopApiError,
  eshopStatusColor,
  eshopStatusText,
  formatDateTime,
  holdReasonText,
  holdStatusColor,
  holdStatusText,
  paymentStatusColor,
  paymentStatusText,
} from './eshopHelpers'

const { t } = useI18n()
const url = import.meta.env.VITE_API_BASE_URL
const { outletId, outlet, hasEshop } = useEshopOutlet()
const { shopOfWarehouse } = useEshopShops()

/** Select value for "every status" (a real '' renders the VaSelect blank). */
const ALL = '__all__'
const LIMITS = [50, 100, 200, 500]

const status = ref(ALL)
const limit = ref(100)
const loading = ref(false)
const error = ref('')
const rows = ref<any[]>([])

const statusOptions = computed(() => [
  { text: t('eshop.holds.allStatuses'), value: ALL },
  ...HOLD_STATUSES.map((s) => ({ text: holdStatusText(s, t), value: s })),
])
const limitOptions = computed(() => LIMITS.map((n) => ({ text: t('eshop.holds.limitOption', { n }), value: n })))

// Only the answer to the latest request is shown.
let requestSeq = 0

async function load() {
  const id = outletId.value
  if (!id || !hasEshop.value) return
  const seq = ++requestSeq
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, string | number> = { limit: limit.value }
    if (status.value !== ALL) params.status = status.value
    const { data } = await axios.get(`${url}/eshop/reservations/${id}`, { params })
    if (seq !== requestSeq) return
    rows.value = Array.isArray(data?.data?.rows) ? data.data.rows : []
  } catch (err: any) {
    if (seq !== requestSeq) return
    rows.value = []
    error.value = eshopApiError(err, t('eshop.holds.toast.loadFailed'), t)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

watch(
  [outletId, hasEshop],
  () => {
    rows.value = []
    error.value = ''
    load()
  },
  { immediate: true },
)
watch([status, limit], load)

/** "NICOSIA MALL (warehouse 5)", or "warehouse 5" when no shop sells from it. */
function warehouseLabel(code: unknown): string {
  const shop = shopOfWarehouse(code)
  const wh = t('eshop.holds.warehouse', { n: String(code ?? '?') })
  return shop ? `${shop.name} (${wh})` : wh
}

const columns = computed(() =>
  defineVaDataTableColumns([
    { label: t('eshop.holds.columns.order'), key: 'order' },
    { label: t('eshop.holds.columns.orderStatus'), key: 'orderStatus' },
    { label: t('eshop.holds.columns.attempt'), key: 'attempt', thAlign: 'center' },
    { label: t('eshop.holds.columns.status'), key: 'status' },
    { label: t('eshop.holds.columns.reason'), key: 'reason' },
    { label: t('eshop.holds.columns.expires'), key: 'expiresAt' },
    { label: t('eshop.holds.columns.created'), key: 'createdAt' },
    { label: t('eshop.holds.columns.lines'), key: 'lines' },
  ]),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div class="flex-1 min-w-[16rem]">
            <h1 class="va-h5">{{ t('eshop.holds.title') }}</h1>
            <p class="text-sm text-slate-500 mt-1">{{ t('eshop.holds.intro') }}</p>
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
            <div class="w-64">
              <VaSelect
                v-model="status"
                :options="statusOptions"
                value-by="value"
                text-by="text"
                :label="t('eshop.holds.status')"
              />
            </div>
            <div class="w-40">
              <VaSelect
                v-model="limit"
                :options="limitOptions"
                value-by="value"
                text-by="text"
                :label="t('eshop.holds.limit')"
              />
            </div>
          </div>

          <VaAlert v-if="error" color="danger" border="left" class="mt-3">{{ error }}</VaAlert>

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
            <template #cell(order)="{ rowData }">
              <RouterLink
                v-if="rowData.orderRef"
                class="font-semibold text-primary hover:underline"
                :to="{ name: 'eshopOrders', query: { search: rowData.orderRef } }"
              >
                {{ rowData.orderRef }}
              </RouterLink>
              <span v-else class="text-slate-400">—</span>
            </template>
            <template #cell(orderStatus)="{ rowData }">
              <div class="flex flex-col gap-1 items-start">
                <span class="text-xs">{{ rowData.orderStatus || '—' }}</span>
                <VaBadge
                  v-if="rowData.eshopStatus"
                  :text="eshopStatusText(rowData.eshopStatus, t)"
                  :color="eshopStatusColor(rowData.eshopStatus)"
                />
                <VaBadge
                  v-if="rowData.paymentStatus"
                  :text="paymentStatusText(rowData.paymentStatus, t)"
                  :color="paymentStatusColor(rowData.paymentStatus)"
                />
              </div>
            </template>
            <template #cell(attempt)="{ rowData }">
              <div class="text-center">{{ rowData.attempt }}</div>
            </template>
            <template #cell(status)="{ rowData }">
              <VaBadge :text="holdStatusText(rowData.status, t)" :color="holdStatusColor(rowData.status)" />
            </template>
            <template #cell(reason)="{ rowData }">
              <div class="whitespace-normal min-w-[10rem] max-w-[14rem]">
                {{ holdReasonText(rowData.reason, t) || '—' }}
              </div>
              <div v-if="rowData.reason" class="text-xs text-slate-400 font-mono">{{ rowData.reason }}</div>
            </template>
            <template #cell(expiresAt)="{ rowData }">
              <span class="text-xs">{{ formatDateTime(rowData.expiresAt) || '—' }}</span>
            </template>
            <template #cell(createdAt)="{ rowData }">
              <span class="text-xs">{{ formatDateTime(rowData.createdAt) || '—' }}</span>
            </template>
            <template #cell(lines)="{ rowData }">
              <div v-for="(l, i) in rowData.lines || []" :key="i" class="text-xs whitespace-normal min-w-[12rem]">
                {{ l.fulfilmentKey }} · {{ warehouseLabel(l.warehouseCode) }} ·
                <span class="font-mono">{{ l.articleCode }}</span> × {{ l.qty }}
              </div>
            </template>
            <template #bodyAppend>
              <tr v-if="!loading && !rows.length && !error">
                <td :colspan="columns.length" class="text-center text-slate-500 py-4">{{ t('eshop.holds.empty') }}</td>
              </tr>
            </template>
          </VaDataTable>

          <div class="text-xs text-slate-500 mt-4">{{ t('eshop.holds.shown', { n: rows.length }) }}</div>
        </template>
      </VaCardContent>
    </VaCard>
  </div>
</template>
