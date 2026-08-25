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
  { label: 'Zone', key: 'deliveryZoneName', sortable: false },
  { label: 'Total', key: 'total', sortable: false, thAlign: 'right' },
  { label: 'Payment', key: 'paymentMode', sortable: false },
  { label: 'Status', key: 'status', sortable: false, thAlign: 'center' },
  { label: 'POS', key: 'pos', sortable: false, thAlign: 'center' },
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

function statusColor(status: string) {
  if (status === 'Completed') return 'success'
  if (status === 'Cancelled') return 'danger'
  return 'warning' // In Progress
}

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
          <template #cell(deliveryZoneName)="{ rowData }">
            {{ rowData.deliveryZoneName || '—' }}
          </template>
          <template #cell(total)="{ rowData }">
            <div class="text-right tabular-nums">€{{ Number(rowData.total || 0).toFixed(2) }}</div>
          </template>
          <template #cell(paymentMode)="{ rowData }">
            {{ rowData.paymentMode || '—' }}
          </template>
          <template #cell(status)="{ rowData }">
            <div class="flex justify-center">
              <VaBadge :text="rowData.status || '—'" :color="statusColor(rowData.status)" />
            </div>
          </template>
          <template #cell(pos)="{ rowData }">
            <div class="flex justify-center">
              <VaBadge
                v-if="rowData.isSaveWinmax || rowData.orderDispatchToWinmaxTime"
                :text="`Sent ${rowData.orderDispatchToWinmaxTime ? formatDateTime(rowData.orderDispatchToWinmaxTime) : ''}`.trim()"
                color="success"
              />
              <VaBadge v-else text="Scheduled" color="info" />
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
  </div>
</template>
