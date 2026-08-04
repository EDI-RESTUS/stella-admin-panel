<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useToast, defineVaDataTableColumns } from 'vuestic-ui'

const { init } = useToast()
const url = import.meta.env.VITE_API_BASE_URL

const rows = ref<any[]>([])
const loading = ref(false)
const savingId = ref<string | null>(null)
// Snapshot taken at load so Save only lights up on real changes.
const snapshots = ref<Record<string, string>>({})

const triggerOptions = [
  { text: 'On order (Winmax dispatch)', value: 'order' },
  { text: 'On delivery (delivery-system callback)', value: 'delivered' },
]

const columns = defineVaDataTableColumns([
  { label: 'Outlet', key: 'name', sortable: true },
  { label: 'Loyalty Enabled', key: 'enabled', sortable: false, thAlign: 'center' },
  { label: 'Points per €', key: 'pointsPerEuro', sortable: false },
  { label: 'Allocation', key: 'allocationTrigger', sortable: false },
  { label: 'Welcome Points', key: 'welcomePoints', sortable: false },
  { label: '', key: 'actions', sortable: false, thAlign: 'right' },
])

function snapshotKey(row: any) {
  return JSON.stringify(row.loyaltySettings)
}

function isDirty(row: any) {
  return snapshots.value[row._id] !== snapshotKey(row)
}

async function loadSettings() {
  loading.value = true
  try {
    const { data } = await axios.get(`${url}/loyalty/admin/settings`)
    rows.value = data?.data || []
    const snap: Record<string, string> = {}
    for (const r of rows.value) snap[r._id] = snapshotKey(r)
    snapshots.value = snap
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to load loyalty settings', color: 'danger' })
  } finally {
    loading.value = false
  }
}

async function saveRow(row: any) {
  savingId.value = row._id
  try {
    const payload = {
      enabled: !!row.loyaltySettings.enabled,
      pointsPerEuro: Number(row.loyaltySettings.pointsPerEuro),
      allocationTrigger: row.loyaltySettings.allocationTrigger,
      welcomePoints: Number(row.loyaltySettings.welcomePoints),
    }
    if (!Number.isFinite(payload.pointsPerEuro) || payload.pointsPerEuro < 0) {
      init({ message: 'Points per € must be a number ≥ 0', color: 'danger' })
      return
    }
    if (!Number.isInteger(payload.welcomePoints) || payload.welcomePoints < 0) {
      init({ message: 'Welcome points must be a whole number ≥ 0', color: 'danger' })
      return
    }
    const { data } = await axios.patch(`${url}/loyalty/admin/settings/${row._id}`, payload)
    if (data?.data?.loyaltySettings) {
      row.loyaltySettings = data.data.loyaltySettings
    }
    snapshots.value[row._id] = snapshotKey(row)
    init({ message: `Loyalty settings saved for ${row.name}`, color: 'success' })
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to save loyalty settings', color: 'danger' })
  } finally {
    savingId.value = null
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 class="va-h5">Loyalty Settings</h1>
            <p class="text-sm text-slate-500 mt-1">
              Per-outlet loyalty program. When enabled, registered customers earn points on their orders — either as
              soon as the order is sent to the POS, or when the delivery system confirms delivery.
            </p>
          </div>
          <VaButton preset="secondary" size="small" icon="refresh" :loading="loading" @click="loadSettings">
            Refresh
          </VaButton>
        </div>

        <VaDataTable
          :columns="columns"
          :items="rows"
          :loading="loading"
          :style="{
            '--va-data-table-thead-background': 'var(--va-background-element)',
            '--va-data-table-thead-color': '#2C82E0',
          }"
          sticky-header
        >
          <template #cell(name)="{ rowData }">
            <div class="flex items-center gap-2">
              <span class="font-semibold">{{ rowData.name }}</span>
              <VaBadge v-if="!rowData.active" text="Inactive outlet" color="warning" />
            </div>
          </template>

          <template #cell(enabled)="{ rowData }">
            <div class="flex justify-center">
              <VaSwitch v-model="rowData.loyaltySettings.enabled" size="small" />
            </div>
          </template>

          <template #cell(pointsPerEuro)="{ rowData }">
            <VaInput
              v-model="rowData.loyaltySettings.pointsPerEuro"
              type="number"
              min="0"
              step="0.5"
              class="w-24"
              :disabled="!rowData.loyaltySettings.enabled"
            />
          </template>

          <template #cell(allocationTrigger)="{ rowData }">
            <VaSelect
              v-model="rowData.loyaltySettings.allocationTrigger"
              :options="triggerOptions"
              value-by="value"
              text-by="text"
              class="w-72"
              :disabled="!rowData.loyaltySettings.enabled"
            />
          </template>

          <template #cell(welcomePoints)="{ rowData }">
            <VaInput
              v-model="rowData.loyaltySettings.welcomePoints"
              type="number"
              min="0"
              step="1"
              class="w-24"
              :disabled="!rowData.loyaltySettings.enabled"
            />
          </template>

          <template #cell(actions)="{ rowData }">
            <div class="flex justify-end">
              <VaButton
                size="small"
                :disabled="!isDirty(rowData) || savingId === rowData._id"
                :loading="savingId === rowData._id"
                @click="saveRow(rowData)"
              >
                Save
              </VaButton>
            </div>
          </template>

          <template #bodyAppend>
            <tr v-if="!loading && rows.length === 0">
              <td :colspan="columns.length" class="text-center text-slate-500 py-4">No outlets found.</td>
            </tr>
          </template>
        </VaDataTable>
      </VaCardContent>
    </VaCard>
  </div>
</template>
