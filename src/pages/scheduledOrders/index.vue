<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { useToast, defineVaDataTableColumns } from 'vuestic-ui'
import { useServiceStore } from '@/stores/services'

const { init } = useToast()
const servicesStore = useServiceStore()
const url = import.meta.env.VITE_API_BASE_URL

// Outlet comes from the top-navbar selection (servicesStore.selectedRest),
// exactly like the rest of the admin panel — no per-page outlet picker.
const outletId = computed(() => servicesStore.selectedRest || '')

const orders = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const limit = ref(50)
const total = ref(0)
const pages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

const columns = defineVaDataTableColumns([
  { label: 'Scheduled for', key: 'orderDateTime', sortable: false },
  { label: 'Customer', key: 'customerName', sortable: false },
  { label: 'Phone', key: 'customerPhoneNo', sortable: false },
  { label: 'Type', key: 'orderType', sortable: false },
  { label: 'Total', key: 'total', sortable: false, thAlign: 'right' },
  { label: 'Payment', key: 'paymentMode', sortable: false },
  { label: 'POS', key: 'pos', sortable: false, thAlign: 'center' },
  { label: 'Actions', key: 'actions', sortable: false, thAlign: 'center' },
])

// The endpoint returns rows ascending by scheduled time (orderDateTime).
function formatDateTime(v: string | undefined) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

const isSent = (o: any) => !!(o?.isSaveWinmax || o?.orderDispatchToWinmaxTime)

async function loadOrders() {
  if (!outletId.value) {
    orders.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const { data } = await axios.get(`${url}/orders/scheduled`, {
      params: { outletId: outletId.value, page: page.value, limit: limit.value },
    })
    orders.value = data?.data?.items || []
    total.value = data?.data?.total || 0
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to load scheduled orders', color: 'danger' })
  } finally {
    loading.value = false
  }
}

watch(outletId, () => {
  page.value = 1
  loadOrders()
})
watch(page, loadOrders)

onMounted(async () => {
  if (!servicesStore.items.length) {
    try {
      await servicesStore.getAll()
    } catch {
      /* navbar usually loads these; ignore if it fails here */
    }
  }
  loadOrders()
})

/* ---------------- View modal ---------------- */
const viewOrder = ref<any>(null)

/* ---------------- Edit (reschedule) modal ---------------- */
const editOrder = ref<any>(null)
const editDateTime = ref('') // datetime-local value
const editSaving = ref(false)

// "2026-08-25T14:30" in the browser's local time, for <input type="datetime-local">
function toLocalInputValue(v: string | undefined) {
  const d = v ? new Date(v) : new Date()
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openEdit(order: any) {
  editOrder.value = order
  editDateTime.value = toLocalInputValue(order.orderDateTime)
}

async function saveSchedule() {
  if (!editOrder.value || !editDateTime.value) return
  const newDate = new Date(editDateTime.value)
  if (isNaN(newDate.getTime())) {
    init({ message: 'Please pick a valid date and time', color: 'danger' })
    return
  }
  editSaving.value = true
  try {
    await axios.patch(`${url}/orders/${editOrder.value._id}/schedule`, {
      orderDateTime: newDate.toISOString(),
    })
    init({ message: 'Order rescheduled', color: 'success' })
    editOrder.value = null
    loadOrders()
  } catch (err: any) {
    init({
      message: err?.response?.data?.message || err?.response?.data?.error || 'Failed to reschedule the order',
      color: 'danger',
    })
  } finally {
    editSaving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 class="va-h5">Scheduled Orders</h1>
            <p class="text-sm text-slate-500 mt-1">
              Future orders from today onward, earliest first. "Sent" means the order has already gone to the POS.
            </p>
          </div>
          <VaButton preset="secondary" size="small" icon="refresh" :loading="loading" @click="loadOrders">
            Refresh
          </VaButton>
        </div>

        <VaDataTable
          :columns="columns"
          :items="orders"
          :loading="loading"
          :style="{
            '--va-data-table-thead-background': 'var(--va-background-element)',
            '--va-data-table-thead-color': '#2C82E0',
          }"
          sticky-header
        >
          <template #cell(orderDateTime)="{ rowData }">
            <span class="font-semibold tabular-nums">{{ formatDateTime(rowData.orderDateTime) }}</span>
          </template>
          <template #cell(customerName)="{ rowData }">
            <span>{{ rowData.customerName || '—' }}</span>
            <span v-if="rowData.customerWinmaxId" class="text-slate-500 text-xs ml-1">
              ({{ rowData.customerWinmaxId }})
            </span>
          </template>
          <template #cell(customerPhoneNo)="{ rowData }">
            {{ rowData.customerPhoneNo || '—' }}
          </template>
          <template #cell(orderType)="{ rowData }">
            {{ rowData.orderType || '—' }}
          </template>
          <template #cell(total)="{ rowData }">
            <div class="text-right tabular-nums">€{{ Number(rowData.total || 0).toFixed(2) }}</div>
          </template>
          <template #cell(paymentMode)="{ rowData }">
            {{ rowData.paymentMode || '—' }}
          </template>
          <template #cell(pos)="{ rowData }">
            <div class="flex justify-center">
              <VaBadge
                v-if="isSent(rowData)"
                :text="`Sent ${rowData.orderDispatchToWinmaxTime ? formatDateTime(rowData.orderDispatchToWinmaxTime) : ''}`.trim()"
                color="success"
              />
              <VaBadge v-else text="Scheduled" color="info" />
            </div>
          </template>
          <template #cell(actions)="{ rowData }">
            <div class="flex justify-center gap-1">
              <VaButton preset="plain" size="small" icon="visibility" title="View order" @click="viewOrder = rowData" />
              <VaButton
                preset="plain"
                size="small"
                icon="edit"
                :title="isSent(rowData) ? 'Already sent to the POS — cannot reschedule' : 'Change scheduled time'"
                :disabled="isSent(rowData)"
                @click="openEdit(rowData)"
              />
            </div>
          </template>
          <template #bodyAppend>
            <tr v-if="!loading && orders.length === 0">
              <td :colspan="columns.length" class="text-center text-slate-500 py-4">
                {{ outletId ? 'No scheduled orders.' : 'Select an outlet from the top bar.' }}
              </td>
            </tr>
          </template>
        </VaDataTable>

        <div v-if="pages > 1" class="flex justify-center mt-4">
          <VaPagination v-model="page" :pages="pages" :visible-pages="5" buttons-preset="secondary" />
        </div>
      </VaCardContent>
    </VaCard>

    <!-- View order -->
    <VaModal
      :model-value="!!viewOrder"
      size="medium"
      :mobile-fullscreen="false"
      hide-default-actions
      close-button
      @update:modelValue="viewOrder = null"
    >
      <template #header>
        <h2 class="va-h6 mb-2">
          Order — {{ formatDateTime(viewOrder?.orderDateTime) }}
        </h2>
      </template>

      <div v-if="viewOrder" class="flex flex-col gap-2 text-sm">
        <div class="grid grid-cols-2 gap-x-6 gap-y-1">
          <div><span class="text-slate-500">Customer:</span> {{ viewOrder.customerName || '—' }}
            <span v-if="viewOrder.customerWinmaxId" class="text-slate-500">({{ viewOrder.customerWinmaxId }})</span>
          </div>
          <div><span class="text-slate-500">Phone:</span> {{ viewOrder.customerPhoneNo || '—' }}</div>
          <div><span class="text-slate-500">Type:</span> {{ viewOrder.orderType || '—' }}</div>
          <div><span class="text-slate-500">Zone:</span> {{ viewOrder.deliveryZoneName || '—' }}</div>
          <div><span class="text-slate-500">Payment:</span> {{ viewOrder.paymentMode || '—' }}</div>
          <div>
            <span class="text-slate-500">POS:</span>
            {{ isSent(viewOrder) ? `Sent ${formatDateTime(viewOrder.orderDispatchToWinmaxTime)}` : 'Scheduled' }}
          </div>
        </div>

        <div class="mt-3 border rounded-lg divide-y">
          <!-- Offers (GoC/web orders often store their lines here) -->
          <div
            v-for="(offer, oi) in viewOrder.offerDetails || []"
            :key="`offer-${oi}`"
            class="flex justify-between items-start px-3 py-2"
          >
            <div>
              <span class="font-semibold">{{ offer.offerName || 'Offer' }}</span>
              <div v-for="(item, i) in offer.offerItems || []" :key="i" class="text-xs text-slate-600 pl-4 pt-0.5">
                {{ item.quantity || 1 }}× {{ item.name || '(item)' }}
                <div v-if="item.options?.length" class="text-slate-500 pl-4">
                  <div v-for="(opt, j) in item.options" :key="j">
                    {{ opt.quantity > 1 ? `${opt.quantity}× ` : '' }}{{ opt.name }}
                  </div>
                </div>
              </div>
            </div>
            <div class="tabular-nums whitespace-nowrap pl-4">
              €{{ Number(offer.totalPrice ?? offer.basePrice ?? 0).toFixed(2) }}
            </div>
          </div>

          <div
            v-for="(item, i) in viewOrder.menuItems || []"
            :key="i"
            class="flex justify-between items-start px-3 py-2"
          >
            <div>
              <span class="font-semibold">{{ item.quantity || 1 }}×</span> {{ item.name || '(item)' }}
              <div v-if="item.options?.length" class="text-xs text-slate-500 pl-5">
                <div v-for="(opt, j) in item.options" :key="j">
                  {{ opt.quantity > 1 ? `${opt.quantity}× ` : '' }}{{ opt.name }}
                </div>
              </div>
            </div>
            <div class="tabular-nums whitespace-nowrap pl-4">
              €{{ Number(item.price || 0).toFixed(2) }}
            </div>
          </div>
          <div
            v-if="!(viewOrder.menuItems || []).length && !(viewOrder.offerDetails || []).length"
            class="px-3 py-2 text-slate-500"
          >
            No items.
          </div>
        </div>

        <div v-if="viewOrder.orderNotes" class="text-slate-600">
          <span class="text-slate-500">Notes:</span> {{ viewOrder.orderNotes }}
        </div>

        <div class="flex justify-between font-semibold mt-1">
          <span v-if="Number(viewOrder.deliveryFee || 0) > 0" class="text-slate-500 font-normal">
            Delivery fee €{{ Number(viewOrder.deliveryFee).toFixed(2) }}
          </span>
          <span class="ml-auto">Total €{{ Number(viewOrder.total || 0).toFixed(2) }}</span>
        </div>
      </div>
    </VaModal>

    <!-- Edit (reschedule) -->
    <VaModal
      :model-value="!!editOrder"
      size="small"
      :mobile-fullscreen="false"
      hide-default-actions
      close-button
      @update:modelValue="editOrder = null"
    >
      <template #header>
        <h2 class="va-h6 mb-2">Reschedule order</h2>
      </template>

      <p class="mb-3 text-sm text-slate-600">
        {{ editOrder?.customerName || 'Customer' }} — currently scheduled for
        <strong>{{ formatDateTime(editOrder?.orderDateTime) }}</strong>
      </p>
      <label class="text-sm font-semibold text-slate-700 block mb-1">New date &amp; time</label>
      <input
        v-model="editDateTime"
        type="datetime-local"
        class="w-full border rounded-lg px-3 py-2"
      />

      <template #footer>
        <div class="flex justify-end gap-2 mt-4">
          <VaButton preset="secondary" @click="editOrder = null">Cancel</VaButton>
          <VaButton :loading="editSaving" @click="saveSchedule">Save</VaButton>
        </div>
      </template>
    </VaModal>
  </div>
</template>
