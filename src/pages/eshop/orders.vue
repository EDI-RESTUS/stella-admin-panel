<script setup lang="ts">
// E-shop orders of the navbar outlet (GET /eshop/orders/:outletId), newest
// first, filtered by status, shop, "needs a hand", dates and order number.
// An order opens to its fulfilments — one per shop that supplies it — each
// with the steps the server allows (its `next` list: POST …/fulfilments/
// :key/status {to, note}; "Exception" needs a reason). An order in Exception
// shows what went wrong and the ways out the server offers
// (`eshop.resolutions`: POST …/resolve {action, note}, admins only). After
// every step or resolution, done or refused, the order is read again.
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { useToast, defineVaDataTableColumns } from 'vuestic-ui'
import { useEshopOutlet } from '@/composables/useEshopOutlet'
import { useEshopShops } from './useEshopShops'
import {
  ESHOP_STATUSES,
  dayStart,
  eshopApiError,
  eshopStatusColor,
  eshopStatusText,
  exceptionCodeText,
  formatDateTime,
  formatKg,
  formatMoney,
  formatPrice,
  fulfilmentMethodText,
  methodText,
  paymentStatusColor,
  paymentStatusText,
  providerText,
  stepHelp,
  stepLabel,
  winmaxStateColor,
  winmaxStateText,
} from './eshopHelpers'

type Notice = { color: string; text: string }
type Dialog =
  | { kind: 'step'; order: any; fulfilment: any; to: string }
  | { kind: 'resolve'; order: any; action: 'retry-stock' | 'refunded' }

const { t } = useI18n()
const { init } = useToast()
const route = useRoute()
const url = import.meta.env.VITE_API_BASE_URL
const { outletId, outlet, hasEshop, isAdmin } = useEshopOutlet()
const { shops } = useEshopShops()

/** Select value for "no filter" (a real '' renders the VaSelect blank). */
const ALL = '__all__'
const LIMIT = 25

const status = ref(ALL)
const zoneId = ref(ALL)
const attention = ref(false)
const from = ref('')
const to = ref('')
// ?search= (e.g. from the stock holds page) opens the page on that order number.
const search = ref(typeof route.query.search === 'string' ? route.query.search.slice(0, 40) : '')
const page = ref(1)
const loading = ref(false)
const error = ref('')
const rows = ref<any[]>([])
const total = ref(0)
/** Bumped on every list load: the table is drawn again with every order closed (open rows are kept by position). */
const listKey = ref(0)
/** Lines shown in an order after a step or a resolution (refusals, "not e-mailed"), until the list is loaded again. */
const notices = ref<Record<string, Notice[]>>({})
const pages = computed(() => Math.max(1, Math.ceil(total.value / LIMIT)))

const badRange = computed(() => {
  const a = dayStart(from.value)
  const b = dayStart(to.value)
  return !!a && !!b && b < a
})

const statusOptions = computed(() => [
  { text: t('eshop.orders.filters.allStatuses'), value: ALL },
  ...ESHOP_STATUSES.map((s) => ({ text: eshopStatusText(s, t), value: s })),
])

const shopOptions = computed(() => [
  { text: t('eshop.orders.filters.allShops'), value: ALL },
  ...shops.value.map((s) => ({
    text: s.active ? s.name : `${s.name} (${t('eshop.orders.filters.inactiveShop')})`,
    value: s.zoneId,
  })),
])

/* ---------------- Loading ---------------- */
// Only the answer to the latest request is shown (typing fires several).
let requestSeq = 0

function params(): Record<string, string | number> {
  const p: Record<string, string | number> = { page: page.value, limit: LIMIT }
  if (status.value !== ALL) p.status = status.value
  if (zoneId.value !== ALL) p.zoneId = zoneId.value
  if (attention.value) p.attention = '1'
  const start = dayStart(from.value)
  if (start) p.from = start.toISOString()
  // the server's "to" is exclusive: the midnight after the day picked
  const end = dayStart(to.value, 1)
  if (end) p.to = end.toISOString()
  const s = search.value.trim()
  if (s) p.search = s
  return p
}

async function load() {
  const id = outletId.value
  if (!id || !hasEshop.value) return
  const seq = ++requestSeq
  error.value = ''
  if (badRange.value) {
    rows.value = []
    total.value = 0
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data } = await axios.get(`${url}/eshop/orders/${id}`, { params: params() })
    if (seq !== requestSeq) return
    const d = data?.data || {}
    rows.value = Array.isArray(d.rows) ? d.rows : []
    total.value = Number(d.total) || 0
    notices.value = {}
    listKey.value++
  } catch (err: any) {
    if (seq !== requestSeq) return
    rows.value = []
    total.value = 0
    error.value = eshopApiError(err, t('eshop.orders.toast.loadFailed'), t)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

/** Back to page 1 (its watcher loads) or, already there, load. */
function reloadFromFirstPage() {
  if (page.value !== 1) page.value = 1
  else load()
}

/**
 * One order read again, in its place (its row stays open): the list filtered
 * by its number, then the order by id; the whole page when it is not found.
 */
async function reloadOrder(order: any) {
  const id = outletId.value
  if (!id) return
  try {
    const { data } = await axios.get(`${url}/eshop/orders/${id}`, {
      params: { search: String(order.orderRef || '').slice(0, 40), limit: 100 },
    })
    if (id !== outletId.value) return
    const fresh = (Array.isArray(data?.data?.rows) ? data.data.rows : []).find((r: any) => r?._id === order._id)
    const i = rows.value.findIndex((r) => r._id === order._id)
    if (fresh && i >= 0) {
      rows.value[i] = fresh
      return
    }
  } catch {
    /* the whole page below */
  }
  await load()
}

watch(
  [outletId, hasEshop],
  () => {
    rows.value = []
    total.value = 0
    error.value = ''
    notices.value = {}
    reloadFromFirstPage()
  },
  { immediate: true },
)
watch([status, zoneId, attention, from, to], reloadFromFirstPage)
watch(page, load)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reloadFromFirstPage, 400)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

const columns = computed(() =>
  defineVaDataTableColumns([
    { label: t('eshop.orders.columns.order'), key: 'order' },
    { label: t('eshop.orders.columns.date'), key: 'createdAt' },
    { label: t('eshop.orders.columns.status'), key: 'status' },
    { label: t('eshop.orders.columns.payment'), key: 'payment' },
    { label: t('eshop.orders.columns.method'), key: 'method' },
    { label: t('eshop.orders.columns.courier'), key: 'courier' },
    { label: t('eshop.orders.columns.shipping'), key: 'shipping', thAlign: 'right' },
    { label: t('eshop.orders.columns.total'), key: 'total', thAlign: 'right' },
    { label: t('eshop.orders.columns.winmax'), key: 'winmax' },
  ]),
)

/* ---------------- Views ---------------- */
/** A part (fulfilment) in Exception while the order itself is not. */
function partInException(o: any): boolean {
  return o?.eshop?.status !== 'Exception' && (o?.fulfilments || []).some((f: any) => f?.status === 'Exception')
}

function shopsOfOrder(o: any): string {
  return Array.from(new Set((o?.fulfilments || []).map((f: any) => f?.shopName).filter(Boolean))).join(', ')
}

function addressLine(d: any): string {
  if (!d) return ''
  const street = [d.streetName, d.streetNo].filter(Boolean).join(' ')
  const flat = [
    d.aptNo && t('eshop.orders.detail.apt', { n: d.aptNo }),
    d.floor && t('eshop.orders.detail.floor', { n: d.floor }),
  ]
    .filter(Boolean)
    .join(', ')
  return [street, flat, d.city, d.district, d.postalCode].filter(Boolean).join(', ')
}

/** A region's name from the settings on the navbar's outlet document, else its key. */
function regionLabel(key: unknown): string {
  const regions = outlet.value?.eshopFulfilment?.regions
  const region = Array.isArray(regions) ? regions.find((g: any) => g?.key === key) : null
  return String(region?.label || key || '')
}

/** What the chosen courier costs POW for this order (the allocation's internal costs). */
function costOf(o: any): any | null {
  const provider = o?.eshop?.provider
  if (!provider) return null
  const c = (o?.eshop?.costs || []).find((x: any) => x?.provider === provider)
  return c && c.costTotal !== null && c.costTotal !== undefined ? c : null
}

function lineKind(kind: string): string {
  return ['stock', 'nonstock', 'digital'].includes(kind) ? t(`eshop.orders.fulfilment.kinds.${kind}`) : kind || ''
}

/** Why a part offers no step. */
function noStepText(o: any, f: any): string {
  const s = o?.eshop?.status
  if (s === 'PendingPayment') return t('eshop.orders.noStep.PendingPayment')
  if (s === 'Exception') return t('eshop.orders.noStep.Exception')
  if (s === 'Cancelled' || f?.status === 'Cancelled') return t('eshop.orders.noStep.Cancelled')
  if (f?.status === 'Completed') return t('eshop.orders.noStep.Completed')
  return ''
}

function addNotice(orderId: string, notice: Notice) {
  notices.value = { ...notices.value, [orderId]: [...(notices.value[orderId] || []), notice] }
}

/* ---------------- Steps and resolutions ---------------- */
const dialog = ref<Dialog | null>(null)
const dialogNote = ref('')
const dialogBusy = ref(false)

const noteRequired = computed(() => dialog.value?.kind === 'step' && dialog.value.to === 'Exception')
const noteMissing = computed(() => noteRequired.value && !dialogNote.value.trim())

const dialogTitle = computed(() => {
  const d = dialog.value
  if (!d) return ''
  if (d.kind === 'resolve') {
    return d.action === 'retry-stock' ? t('eshop.orders.exception.retryTitle') : t('eshop.orders.exception.refundTitle')
  }
  return t('eshop.orders.dialog.stepTitle', {
    ref: d.order.orderRef,
    key: d.fulfilment.key,
    shop: d.fulfilment.shopName,
    step: stepLabel(d.to, d.fulfilment.status, t),
  })
})

const dialogText = computed(() => {
  const d = dialog.value
  if (!d) return ''
  if (d.kind === 'resolve') {
    if (d.action !== 'retry-stock') return t('eshop.orders.exception.refundText')
    // marked paid without a verified PBT payment: the money is checked first
    const unverified = d.order?.eshop?.exception?.code === 'UNVERIFIED_PAYMENT'
    return `${unverified ? `${t('eshop.orders.exception.retryCheckPbt')} ` : ''}${t(
      'eshop.orders.exception.retryText',
    )}`
  }
  return stepHelp(d.to, d.fulfilment.status, d.fulfilment.method, t)
})

const dialogOk = computed(() => {
  const d = dialog.value
  if (!d) return ''
  if (d.kind === 'resolve') {
    return d.action === 'retry-stock' ? t('eshop.orders.exception.retryOk') : t('eshop.orders.exception.refundOk')
  }
  return stepLabel(d.to, d.fulfilment.status, t)
})

const dialogDanger = computed(() => {
  const d = dialog.value
  return (d?.kind === 'step' && d.to === 'Exception') || (d?.kind === 'resolve' && d.action === 'refunded')
})

function openStep(order: any, fulfilment: any, to: string) {
  dialogNote.value = ''
  dialog.value = { kind: 'step', order, fulfilment, to }
}

function openResolve(order: any, action: 'retry-stock' | 'refunded') {
  dialogNote.value = ''
  dialog.value = { kind: 'resolve', order, action }
}

function closeDialog() {
  if (!dialogBusy.value) dialog.value = null
}

async function confirmDialog() {
  const d = dialog.value
  const id = outletId.value
  if (!d || !id || dialogBusy.value || noteMissing.value) return
  const note = dialogNote.value.trim()
  dialogBusy.value = true
  try {
    if (d.kind === 'step') await sendStep(id, d.order, d.fulfilment, d.to, note)
    else await sendResolve(id, d.order, d.action, note)
  } finally {
    dialogBusy.value = false
    dialog.value = null
  }
}

async function sendStep(id: string, order: any, f: any, to: string, note: string) {
  try {
    const { data } = await axios.post(`${url}/eshop/orders/${id}/${order._id}/fulfilments/${f.key}/status`, {
      to,
      note,
    })
    const r = data?.data || {}
    if (to === 'ReadyForPickup' && r.emailed === false) {
      addNotice(order._id, { color: 'warning', text: t('eshop.orders.notEmailed', { key: f.key, shop: f.shopName }) })
      init({ message: t('eshop.orders.toast.notEmailed', { ref: order.orderRef }), color: 'warning', duration: 10000 })
    } else if (to === 'ReadyForPickup' && r.emailed === true) {
      init({ message: t('eshop.orders.toast.readyEmailed', { ref: order.orderRef, key: f.key }), color: 'success' })
    } else {
      init({
        message: t('eshop.orders.toast.stepDone', { ref: order.orderRef, key: f.key, status: eshopStatusText(to, t) }),
        color: 'success',
      })
    }
  } catch (err: any) {
    const message = eshopApiError(err, t('eshop.orders.toast.stepFailed'), t)
    addNotice(order._id, { color: 'danger', text: t('eshop.orders.refused', { message }) })
    init({ message, color: 'danger' })
  }
  if (id === outletId.value) await reloadOrder(order)
}

async function sendResolve(id: string, order: any, action: 'retry-stock' | 'refunded', note: string) {
  try {
    const { data } = await axios.post(`${url}/eshop/orders/${id}/${order._id}/resolve`, { action, note })
    const r = data?.data || {}
    if (action === 'retry-stock' && r.queued === false) {
      addNotice(order._id, { color: 'warning', text: t('eshop.orders.retryNotQueued') })
      init({ message: t('eshop.orders.retryNotQueued'), color: 'warning', duration: 10000 })
    } else {
      init({
        message:
          action === 'retry-stock'
            ? t('eshop.orders.toast.retried', { ref: order.orderRef })
            : t('eshop.orders.toast.refunded', { ref: order.orderRef }),
        color: 'success',
      })
    }
  } catch (err: any) {
    const message = eshopApiError(err, t('eshop.orders.toast.resolveFailed'), t)
    addNotice(order._id, { color: 'danger', text: t('eshop.orders.refused', { message }) })
    init({ message, color: 'danger' })
  }
  if (id === outletId.value) await reloadOrder(order)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div class="flex-1 min-w-[16rem]">
            <h1 class="va-h5">{{ t('eshop.orders.title') }}</h1>
            <p class="text-sm text-slate-500 mt-1">{{ t('eshop.orders.intro') }}</p>
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
            <div class="w-52">
              <VaSelect
                v-model="status"
                :options="statusOptions"
                value-by="value"
                text-by="text"
                :label="t('eshop.orders.filters.status')"
              />
            </div>
            <div class="w-64">
              <VaSelect
                v-model="zoneId"
                :options="shopOptions"
                value-by="value"
                text-by="text"
                :label="t('eshop.orders.filters.shop')"
              />
            </div>
            <div class="w-40">
              <VaInput v-model="from" type="date" :label="t('eshop.orders.filters.from')" />
            </div>
            <div class="w-40">
              <VaInput v-model="to" type="date" :label="t('eshop.orders.filters.to')" />
            </div>
            <div class="w-48">
              <VaInput
                v-model="search"
                maxlength="40"
                clearable
                :label="t('eshop.orders.filters.search')"
                :placeholder="t('eshop.orders.filters.searchPlaceholder')"
              />
            </div>
            <VaCheckbox v-model="attention" :label="t('eshop.orders.filters.attention')" class="mb-2" />
          </div>
          <p class="va-text-secondary text-xs mt-1">{{ t('eshop.orders.filters.attentionHelp') }}</p>

          <VaAlert v-if="badRange" color="warning" border="left" class="mt-3">
            {{ t('eshop.orders.filters.badRange') }}
          </VaAlert>
          <VaAlert v-if="error" color="danger" border="left" class="mt-3">{{ error }}</VaAlert>

          <VaDataTable
            :key="listKey"
            class="mt-3"
            :columns="columns"
            :items="rows"
            :loading="loading"
            :style="{
              '--va-data-table-thead-background': 'var(--va-background-element)',
              '--va-data-table-thead-color': '#2C82E0',
            }"
          >
            <template #cell(order)="{ row, rowData, isExpanded }">
              <div class="flex items-center gap-1 whitespace-nowrap">
                <VaButton
                  preset="plain"
                  size="small"
                  :icon="isExpanded ? 'expand_less' : 'expand_more'"
                  :aria-label="t('eshop.orders.details')"
                  @click="row.toggleRowDetails()"
                />
                <span class="font-semibold">{{ rowData.orderRef || '—' }}</span>
              </div>
            </template>
            <template #cell(createdAt)="{ rowData }">
              <span class="text-xs">{{ formatDateTime(rowData.createdAt) }}</span>
            </template>
            <template #cell(status)="{ rowData }">
              <VaBadge
                :text="eshopStatusText(rowData.eshop?.status, t)"
                :color="eshopStatusColor(rowData.eshop?.status)"
              />
              <div v-if="partInException(rowData)" class="text-xs text-danger mt-1">
                {{ t('eshop.orders.partInException') }}
              </div>
            </template>
            <template #cell(payment)="{ rowData }">
              <VaBadge
                :text="paymentStatusText(rowData.eshop?.paymentStatus, t)"
                :color="paymentStatusColor(rowData.eshop?.paymentStatus)"
              />
            </template>
            <template #cell(method)="{ rowData }">
              <div>{{ methodText(rowData.eshop?.method, t) }}</div>
              <div class="text-xs text-slate-500">{{ shopsOfOrder(rowData) }}</div>
            </template>
            <template #cell(courier)="{ rowData }">{{ providerText(rowData.eshop?.provider, t) }}</template>
            <template #cell(shipping)="{ rowData }">
              <div class="text-right">{{ formatPrice(rowData.eshop?.customerShippingCharge ?? 0) }}</div>
            </template>
            <template #cell(total)="{ rowData }">
              <div class="text-right font-semibold">{{ formatPrice(rowData.total) || '—' }}</div>
            </template>
            <template #cell(winmax)="{ rowData }">
              <VaBadge
                :text="winmaxStateText(rowData.winmaxSendState, t)"
                :color="winmaxStateColor(rowData.winmaxSendState)"
              />
              <div v-if="rowData.winmaxLastError" class="text-xs text-danger mt-1 max-w-[16rem] break-words">
                {{ rowData.winmaxLastError }}
              </div>
            </template>

            <template #expandableRow="{ rowData: o }">
              <div class="eshop-order-detail p-4 bg-slate-50 rounded flex flex-col gap-3 text-sm">
                <VaAlert v-for="(n, i) in notices[o._id] || []" :key="`notice-${i}`" :color="n.color" border="left">
                  {{ n.text }}
                </VaAlert>

                <!-- The order's own Exception: set by the payment path; it waits for an admin -->
                <div v-if="o.eshop?.status === 'Exception'" class="rounded-lg border border-red-300 bg-white p-3">
                  <div class="font-semibold text-danger">{{ t('eshop.orders.exception.title') }}</div>
                  <div v-if="o.eshop.exception" class="mt-1">
                    <span class="font-mono text-xs">{{ o.eshop.exception.code }}</span>
                    <span v-if="exceptionCodeText(o.eshop.exception.code, t)">
                      — {{ exceptionCodeText(o.eshop.exception.code, t) }}
                    </span>
                  </div>
                  <div v-if="o.eshop.exception?.message" class="text-slate-600 mt-1">
                    {{ o.eshop.exception.message }}
                  </div>
                  <div v-if="o.eshop.exception?.at" class="text-xs text-slate-500 mt-1">
                    {{ t('eshop.orders.exception.since', { when: formatDateTime(o.eshop.exception.at) }) }}
                  </div>
                  <div v-if="isAdmin" class="flex items-center gap-2 flex-wrap mt-3">
                    <VaButton
                      v-if="(o.eshop.resolutions || []).includes('retry-stock')"
                      size="small"
                      icon="mso-inventory"
                      @click="openResolve(o, 'retry-stock')"
                    >
                      {{ t('eshop.orders.exception.retry') }}
                    </VaButton>
                    <VaButton
                      v-if="(o.eshop.resolutions || []).includes('refunded')"
                      size="small"
                      preset="secondary"
                      color="danger"
                      icon="mso-currency_exchange"
                      @click="openResolve(o, 'refunded')"
                    >
                      {{ t('eshop.orders.exception.refunded') }}
                    </VaButton>
                    <span v-if="!(o.eshop.resolutions || []).length" class="text-xs text-slate-500">
                      {{ t('eshop.orders.exception.none') }}
                    </span>
                  </div>
                  <div v-else class="text-xs text-slate-500 mt-2">{{ t('eshop.orders.exception.adminOnly') }}</div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div class="text-xs text-slate-500">{{ t('eshop.orders.detail.customer') }}</div>
                    <template v-if="o.eshop?.destination">
                      <div>{{ o.eshop.destination.recipientName || '—' }}</div>
                      <div v-if="o.eshop.destination.phone">{{ o.eshop.destination.phone }}</div>
                      <div v-if="o.eshop.destination.email">{{ o.eshop.destination.email }}</div>
                      <div v-if="addressLine(o.eshop.destination)">{{ addressLine(o.eshop.destination) }}</div>
                      <div v-if="o.eshop.destination.boxnowLockerId">
                        {{
                          t('eshop.orders.detail.locker', {
                            name: o.eshop.destination.boxnowLockerName || '—',
                            id: o.eshop.destination.boxnowLockerId,
                          })
                        }}
                      </div>
                      <div v-if="o.eshop.destination.notes" class="text-xs text-slate-500">
                        {{ o.eshop.destination.notes }}
                      </div>
                    </template>
                    <div v-else class="text-slate-500">{{ t('eshop.orders.detail.noDestination') }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-slate-500">{{ t('eshop.orders.detail.facts') }}</div>
                    <div v-if="o.eshop?.region || o.eshop?.postalCode">
                      {{
                        t('eshop.orders.detail.region', {
                          region: regionLabel(o.eshop.region) || '—',
                          postcode: o.eshop.postalCode || '—',
                        })
                      }}
                    </div>
                    <div v-if="o.paymentMode">{{ t('eshop.orders.detail.paymentMode', { mode: o.paymentMode }) }}</div>
                    <div v-if="o.eshop?.status === 'PendingPayment' && o.eshop?.reservationExpiresAt">
                      {{ t('eshop.orders.detail.holdUntil', { when: formatDateTime(o.eshop.reservationExpiresAt) }) }}
                    </div>
                    <div v-if="costOf(o)">
                      {{
                        t('eshop.orders.detail.cost', {
                          courier: providerText(o.eshop.provider, t),
                          cost: formatMoney(costOf(o).costTotal),
                          margin: formatMoney(costOf(o).margin) || '—',
                        })
                      }}
                    </div>
                  </div>
                </div>

                <!-- One part per supplying shop -->
                <div
                  v-for="f in o.fulfilments || []"
                  :key="f.key"
                  class="eshop-fulfilment rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold">{{ f.key }} · {{ f.shopName }}</span>
                    <span class="text-slate-500">
                      {{ fulfilmentMethodText(f.method, t) }}
                      <template v-if="f.provider"> · {{ providerText(f.provider, t) }}</template>
                    </span>
                    <VaBadge :text="eshopStatusText(f.status, t)" :color="eshopStatusColor(f.status)" />
                  </div>
                  <div class="flex gap-x-6 gap-y-1 flex-wrap text-xs text-slate-600 mt-2">
                    <span v-if="f.method === 'courier'">
                      {{
                        f.weightGrams
                          ? t('eshop.orders.fulfilment.weight', { kg: formatKg(f.weightGrams) })
                          : t('eshop.orders.fulfilment.noWeight')
                      }}
                    </span>
                    <span v-if="f.chargesCustomer">
                      {{ t('eshop.orders.fulfilment.carriesFee', { amount: formatPrice(f.customerCharge) }) }}
                    </span>
                    <span>
                      {{
                        f.winmaxDocument
                          ? t('eshop.orders.fulfilment.winmaxDoc', { doc: f.winmaxDocument })
                          : t('eshop.orders.fulfilment.noWinmaxDoc')
                      }}
                    </span>
                  </div>

                  <table class="mt-2 text-xs">
                    <thead>
                      <tr class="text-left text-slate-500">
                        <th class="pr-6 font-normal">{{ t('eshop.orders.fulfilment.code') }}</th>
                        <th class="pr-6 font-normal text-right">{{ t('eshop.orders.fulfilment.qty') }}</th>
                        <th class="pr-6 font-normal text-right">{{ t('eshop.orders.fulfilment.unitWeight') }}</th>
                        <th class="font-normal">{{ t('eshop.orders.fulfilment.kind') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(l, li) in f.lines || []" :key="li">
                        <td class="pr-6 font-mono">{{ l.articleCode }}</td>
                        <td class="pr-6 text-right">{{ l.qty }}</td>
                        <td class="pr-6 text-right">{{ formatKg(l.weightGrams) || '—' }}</td>
                        <td>{{ lineKind(l.kind) }}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="flex items-center gap-2 flex-wrap mt-3">
                    <VaButton
                      v-for="next in f.next || []"
                      :key="next"
                      size="small"
                      :preset="next === 'Exception' ? 'secondary' : undefined"
                      :color="next === 'Exception' ? 'danger' : 'primary'"
                      @click="openStep(o, f, next)"
                    >
                      {{ stepLabel(next, f.status, t) }}
                    </VaButton>
                    <span v-if="!(f.next || []).length && noStepText(o, f)" class="text-xs text-slate-500">
                      {{ noStepText(o, f) }}
                    </span>
                  </div>

                  <div v-if="(f.statusHistory || []).length" class="mt-3">
                    <div class="text-xs text-slate-500">{{ t('eshop.orders.fulfilment.history') }}</div>
                    <ul class="text-xs mt-1">
                      <li v-for="(h, hi) in f.statusHistory" :key="hi">
                        {{ formatDateTime(h.at) }} · {{ eshopStatusText(h.status, t) }}
                        <template v-if="h.by"> · {{ h.by }}</template>
                        <template v-if="h.note"> · {{ h.note }}</template>
                      </li>
                    </ul>
                  </div>
                </div>
                <div v-if="!(o.fulfilments || []).length" class="text-slate-500">
                  {{ t('eshop.orders.noFulfilments') }}
                </div>

                <details v-if="(o.eshop?.statusHistory || []).length">
                  <summary class="text-xs text-slate-500 cursor-pointer">
                    {{ t('eshop.orders.orderHistory', { n: o.eshop.statusHistory.length }) }}
                  </summary>
                  <ul class="text-xs mt-1">
                    <li v-for="(h, hi) in o.eshop.statusHistory" :key="hi">
                      {{ formatDateTime(h.at) }} · {{ eshopStatusText(h.status, t) }}
                      <template v-if="h.by"> · {{ h.by }}</template>
                      <template v-if="h.note"> · {{ h.note }}</template>
                    </li>
                  </ul>
                </details>
              </div>
            </template>

            <template #bodyAppend>
              <tr v-if="!loading && !rows.length && !error && !badRange">
                <td :colspan="columns.length" class="text-center text-slate-500 py-4">
                  {{ t('eshop.orders.empty') }}
                </td>
              </tr>
            </template>
          </VaDataTable>

          <div class="flex items-center justify-between gap-3 flex-wrap mt-4">
            <span class="text-xs text-slate-500">{{ t('eshop.orders.total', { n: total }) }}</span>
            <VaPagination
              v-if="pages > 1"
              v-model="page"
              :pages="pages"
              :visible-pages="5"
              buttons-preset="secondary"
            />
          </div>
        </template>
      </VaCardContent>
    </VaCard>

    <VaModal
      :model-value="!!dialog"
      size="small"
      max-width="520px"
      :mobile-fullscreen="false"
      hide-default-actions
      :no-dismiss="dialogBusy"
      @update:modelValue="(open: boolean) => !open && closeDialog()"
    >
      <div v-if="dialog" class="eshop-dialog">
        <h2 class="va-h6 mb-2">{{ dialogTitle }}</h2>
        <p class="text-sm mb-3">{{ dialogText }}</p>
        <VaTextarea
          v-model="dialogNote"
          class="w-full"
          maxlength="300"
          autosize
          :min-rows="2"
          :max-rows="5"
          :label="noteRequired ? t('eshop.orders.dialog.reason') : t('eshop.orders.dialog.note')"
        />
        <div v-if="noteMissing" class="text-xs text-danger mt-1">{{ t('eshop.orders.dialog.reasonNeeded') }}</div>
        <div class="flex justify-end gap-2 mt-4">
          <VaButton preset="secondary" :disabled="dialogBusy" @click="closeDialog">
            {{ t('eshop.common.cancel') }}
          </VaButton>
          <VaButton
            :color="dialogDanger ? 'danger' : 'primary'"
            :loading="dialogBusy"
            :disabled="noteMissing"
            @click="confirmDialog"
          >
            {{ dialogOk }}
          </VaButton>
        </div>
      </div>
    </VaModal>
  </div>
</template>
