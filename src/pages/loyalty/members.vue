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

const members = ref<any[]>([])
const loading = ref(false)
const search = ref('')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const pages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

const columns = defineVaDataTableColumns([
  { label: 'Name', key: 'customerName', sortable: false },
  { label: 'Phone', key: 'phoneNo', sortable: false },
  { label: 'Email', key: 'email', sortable: false },
  { label: 'Points', key: 'totalPoints', sortable: false, thAlign: 'right' },
  { label: 'Joined', key: 'createdAt', sortable: false },
  { label: '', key: 'actions', sortable: false, thAlign: 'right' },
])

function formatDate(v: string | undefined) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function loadMembers() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit: limit.value }
    if (outletId.value) params.outletId = outletId.value
    if (search.value.trim()) params.search = search.value.trim()
    const { data } = await axios.get(`${url}/loyalty/admin/members`, { params })
    members.value = data?.data?.members || []
    total.value = data?.data?.meta?.total || 0
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to load loyalty members', color: 'danger' })
  } finally {
    loading.value = false
  }
}

// Server-side search with debounce; new search resets to page 1.
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadMembers()
  }, 400)
})

watch(outletId, () => {
  page.value = 1
  loadMembers()
})
watch(page, loadMembers)

onMounted(async () => {
  if (!servicesStore.items.length) {
    try {
      await servicesStore.getAll()
    } catch {
      /* navbar usually loads these; ignore if it fails here */
    }
  }
  loadMembers()
})

/* ---------------- Ledger history modal ---------------- */
const historyOpen = ref(false)
const historyMember = ref<any>(null)
const historyEntries = ref<any[]>([])
const historyLoading = ref(false)
const historyPage = ref(1)
const historyTotalPoints = ref(0)
const historyPages = ref(1)

const historyColumns = defineVaDataTableColumns([
  { label: 'Date', key: 'date', sortable: false },
  { label: 'Type', key: 'type', sortable: false },
  { label: 'Source', key: 'source', sortable: false },
  { label: 'Points', key: 'points', sortable: false, thAlign: 'right' },
  { label: '€', key: 'amount', sortable: false, thAlign: 'right' },
  { label: 'Remaining', key: 'pointsRemaining', sortable: false, thAlign: 'right' },
  { label: 'Expires', key: 'expiresAt', sortable: false },
  { label: 'Order', key: 'orderId', sortable: false },
])

async function loadHistory() {
  if (!historyMember.value) return
  historyLoading.value = true
  try {
    const { data } = await axios.get(`${url}/loyalty/admin/members/${historyMember.value._id}/ledger`, {
      params: { page: historyPage.value, limit: 20 },
    })
    historyEntries.value = data?.data?.entries || []
    historyTotalPoints.value = data?.data?.totalPoints ?? 0
    historyPages.value = data?.data?.meta?.pages || 1
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to load member history', color: 'danger' })
  } finally {
    historyLoading.value = false
  }
}

function openHistory(member: any) {
  historyMember.value = member
  historyEntries.value = []
  historyPage.value = 1
  historyOpen.value = true
  loadHistory()
}

watch(historyPage, loadHistory)
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 class="va-h5">Loyalty Members</h1>
            <p class="text-sm text-slate-500 mt-1">Registered customers (with an account password) and their points.</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <VaInput v-model="search" placeholder="Search name, phone, email" clearable size="small">
              <template #prependInner>
                <VaIcon name="search" color="secondary" />
              </template>
            </VaInput>
            <VaButton preset="secondary" size="small" icon="refresh" :loading="loading" @click="loadMembers">
              Refresh
            </VaButton>
          </div>
        </div>

        <VaDataTable
          :columns="columns"
          :items="members"
          :loading="loading"
          :style="{
            '--va-data-table-thead-background': 'var(--va-background-element)',
            '--va-data-table-thead-color': '#2C82E0',
          }"
          sticky-header
        >
          <template #cell(customerName)="{ rowData }">
            <span class="font-semibold">{{ rowData.customerName || rowData.firstName || '—' }}</span>
          </template>
          <template #cell(email)="{ rowData }">
            {{ rowData.email || '—' }}
          </template>
          <template #cell(totalPoints)="{ rowData }">
            <div class="text-right tabular-nums font-semibold">{{ rowData.totalPoints ?? 0 }}</div>
          </template>
          <template #cell(createdAt)="{ rowData }">
            {{ formatDate(rowData.createdAt) }}
          </template>
          <template #cell(actions)="{ rowData }">
            <div class="flex justify-end">
              <VaButton preset="secondary" size="small" icon="history" @click="openHistory(rowData)">History</VaButton>
            </div>
          </template>
          <template #bodyAppend>
            <tr v-if="!loading && members.length === 0">
              <td :colspan="columns.length" class="text-center text-slate-500 py-4">No members found.</td>
            </tr>
          </template>
        </VaDataTable>

        <div v-if="pages > 1" class="flex justify-center mt-4">
          <VaPagination v-model="page" :pages="pages" :visible-pages="5" buttons-preset="secondary" />
        </div>
      </VaCardContent>
    </VaCard>

    <VaModal v-model="historyOpen" hide-default-actions close-button size="large">
      <template #header>
        <div class="flex items-center justify-between gap-4 pr-8">
          <h2 class="va-h6">
            {{ historyMember?.customerName || historyMember?.firstName || 'Member' }} — Points History
          </h2>
          <VaBadge :text="`${historyTotalPoints} points available`" color="success" />
        </div>
      </template>

      <VaDataTable
        :columns="historyColumns"
        :items="historyEntries"
        :loading="historyLoading"
        :style="{
          '--va-data-table-thead-background': 'var(--va-background-element)',
          '--va-data-table-thead-color': '#2C82E0',
        }"
      >
        <template #cell(date)="{ rowData }">
          {{ formatDate(rowData.date) }}
        </template>
        <template #cell(type)="{ rowData }">
          <VaBadge :text="rowData.type" :color="rowData.type === 'EARN' ? 'success' : 'warning'" />
        </template>
        <template #cell(source)="{ rowData }">
          {{ rowData.source || '—' }}
        </template>
        <template #cell(points)="{ rowData }">
          <div class="text-right tabular-nums" :class="rowData.type === 'EARN' ? 'text-green-700' : 'text-amber-700'">
            {{ rowData.type === 'EARN' ? `+${rowData.points}` : `-${rowData.redeemed}` }}
          </div>
        </template>
        <template #cell(amount)="{ rowData }">
          <div class="text-right tabular-nums">€{{ Number(rowData.amount || 0).toFixed(2) }}</div>
        </template>
        <template #cell(pointsRemaining)="{ rowData }">
          <div class="text-right tabular-nums">
            {{ rowData.type === 'EARN' ? rowData.pointsRemaining ?? 0 : '—' }}
          </div>
        </template>
        <template #cell(expiresAt)="{ rowData }">
          {{ rowData.type === 'EARN' ? formatDate(rowData.expiresAt) : '—' }}
        </template>
        <template #cell(orderId)="{ rowData }">
          {{ rowData.orderId?.tableNumber ?? '—' }}
        </template>
        <template #bodyAppend>
          <tr v-if="!historyLoading && historyEntries.length === 0">
            <td :colspan="historyColumns.length" class="text-center text-slate-500 py-4">No ledger entries yet.</td>
          </tr>
        </template>
      </VaDataTable>

      <div v-if="historyPages > 1" class="flex justify-center mt-4">
        <VaPagination v-model="historyPage" :pages="historyPages" :visible-pages="5" buttons-preset="secondary" />
      </div>
    </VaModal>
  </div>
</template>
