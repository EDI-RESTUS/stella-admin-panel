<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { useForm, useToast, defineVaDataTableColumns } from 'vuestic-ui'
import { validators } from '@/services/utils'
import { useServiceStore } from '@/stores/services'

const { validate } = useForm('form')
const { init } = useToast()
const servicesStore = useServiceStore()

const url = import.meta.env.VITE_API_BASE_URL

const countryPrefixes = [
  { text: '+357 (CY)', value: '357' },
  { text: '+30 (GR)', value: '30' },
  { text: '+44 (UK)', value: '44' },
  { text: '+1 (US)', value: '1' },
  { text: '+7 (RU)', value: '7' },
  { text: '+971 (AE)', value: '971' },
  { text: '+961 (LB)', value: '961' },
]

// Pre-select the outlet currently chosen in the top navbar; the admin can change it.
const outletId = ref<string>(servicesStore.selectedRest || '')
const winmaxId = ref('')
const firstName = ref('')
const surname = ref('')
const phonePrefix = ref('357')
const phoneLocal = ref('')
const password = ref('')
const officeNo = ref('')
const saving = ref(false)

// List of existing office customers for the selected outlet.
const tableItems = ref<any[]>([])
const loadingList = ref(false)
const search = ref('')

// Winmax balances, loaded separately so the table renders immediately and a slow
// or unavailable Winmax never blocks the list. Keyed by winmaxId.
const balances = ref<Record<string, number | null>>({})
const balancesLoading = ref(false)

const columns = defineVaDataTableColumns([
  { label: 'Winmax ID', key: 'winmaxId', sortable: true },
  { label: 'Name', key: 'customerName', sortable: true },
  { label: 'Office No', key: 'officeNo', sortable: true },
  { label: 'Phone', key: 'phone', sortable: false },
  { label: 'Balance', key: 'balance', sortable: false, thAlign: 'right' },
  { label: 'Active', key: 'isActive', sortable: false, thAlign: 'center' },
])

function formatBalance(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return `€${Number(v).toFixed(2)}`
}

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return tableItems.value
  return tableItems.value.filter((c) =>
    [c.customerName, c.officeNo, c.phone, String(c.winmaxId)].some((f) =>
      String(f || '')
        .toLowerCase()
        .includes(q),
    ),
  )
})

async function getOfficeCustomers() {
  if (!outletId.value) {
    tableItems.value = []
    return
  }
  loadingList.value = true
  try {
    const { data } = await axios.get(`${url}/customers/office`, { params: { outletId: outletId.value } })
    tableItems.value = data?.data || []
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to load office customers', color: 'danger' })
  } finally {
    loadingList.value = false
  }
}

async function getBalances() {
  if (!outletId.value) {
    balances.value = {}
    return
  }
  balancesLoading.value = true
  try {
    const { data } = await axios.get(`${url}/customers/office/balances`, { params: { outletId: outletId.value } })
    const map: Record<string, number | null> = {}
    for (const b of data?.data || []) map[String(b.winmaxId)] = b.balance
    balances.value = map
  } catch {
    // Balances are best-effort; never block the list on a Winmax hiccup.
    balances.value = {}
  } finally {
    balancesLoading.value = false
  }
}

// List renders right away; balances populate as soon as Winmax responds.
function refresh() {
  getOfficeCustomers()
  getBalances()
}

onMounted(async () => {
  if (!servicesStore.items.length) {
    try {
      await servicesStore.getAll()
    } catch {
      /* navbar usually loads these; ignore if it fails here */
    }
  }
  if (!outletId.value && servicesStore.selectedRest) outletId.value = servicesStore.selectedRest
  refresh()
})

// Reload whenever the chosen outlet changes.
watch(outletId, () => refresh())

const numberRule = (v: any) => /^[0-9]+$/.test(String(v ?? '').trim()) || 'Must be a number'
const minPwd = (v: any) => String(v ?? '').length >= 6 || 'At least 6 characters'

const canSave = computed(
  () =>
    !!outletId.value &&
    /^[0-9]+$/.test(String(winmaxId.value).trim()) &&
    !!firstName.value.trim() &&
    !!surname.value.trim() &&
    !!phoneLocal.value.trim() &&
    String(password.value).length >= 6 &&
    !!officeNo.value.trim(),
)

function resetForm() {
  winmaxId.value = ''
  firstName.value = ''
  surname.value = ''
  phoneLocal.value = ''
  password.value = ''
  officeNo.value = ''
}

async function submit() {
  if (!validate() || !canSave.value) return
  saving.value = true
  // Canonical 00<cc><number> form (the backend re-normalizes anyway).
  const phone = '00' + (phonePrefix.value + phoneLocal.value).replace(/\D+/g, '')
  try {
    const { data } = await axios.post(`${url}/customers/office`, {
      winmaxId: String(winmaxId.value).trim(),
      name: firstName.value.trim(),
      surname: surname.value.trim(),
      phone,
      password: password.value,
      officeNo: officeNo.value.trim(),
      outletId: outletId.value,
    })
    init({ message: data?.message || 'Office customer registered successfully', color: 'success' })
    resetForm()
    refresh()
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to register office customer', color: 'danger' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <h1 class="va-h5 mb-1">Register Office Customer</h1>
        <p class="text-sm text-slate-500 mb-4">
          Office customers log in with their <strong>Winmax ID</strong> and <strong>password</strong>. The phone number
          is for your reference only.
        </p>

        <VaForm ref="form" class="max-w-[680px]" @submit.prevent="submit">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <VaSelect
              v-model="outletId"
              label="Outlet"
              :options="servicesStore.items"
              text-by="name"
              value-by="_id"
              :rules="[validators.required]"
              placeholder="Select outlet"
            />
            <VaInput
              v-model="winmaxId"
              label="Winmax ID"
              :rules="[validators.required, numberRule]"
              placeholder="e.g. 12345"
            />
            <VaInput v-model="firstName" label="Name" :rules="[validators.required]" placeholder="First name" />
            <VaInput v-model="surname" label="Surname" :rules="[validators.required]" placeholder="Surname" />

            <div class="flex gap-2 items-end">
              <VaSelect
                v-model="phonePrefix"
                label="Country"
                :options="countryPrefixes"
                value-by="value"
                class="w-[130px] shrink-0"
              />
              <VaInput
                :model-value="phoneLocal"
                label="Phone"
                class="flex-1"
                :rules="[validators.required]"
                placeholder="Phone number"
                @update:modelValue="(v: string) => (phoneLocal = String(v || '').replace(/\D/g, ''))"
              />
            </div>

            <VaInput
              v-model="password"
              label="Password"
              type="password"
              :rules="[validators.required, minPwd]"
              placeholder="Min 6 characters"
            />
            <VaInput v-model="officeNo" label="Office No" :rules="[validators.required]" placeholder="Office number" />
          </div>

          <div class="flex justify-end mt-6">
            <VaButton :disabled="!canSave || saving" :loading="saving" @click="submit">Register</VaButton>
          </div>
        </VaForm>
      </VaCardContent>
    </VaCard>

    <VaCard>
      <VaCardContent>
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h1 class="va-h5">Office Customers</h1>
          <div class="flex items-center gap-2">
            <VaInput v-model="search" placeholder="Search name, office, phone, ID" clearable size="small">
              <template #prependInner>
                <VaIcon name="search" color="secondary" />
              </template>
            </VaInput>
            <VaButton
              preset="secondary"
              size="small"
              icon="refresh"
              :loading="loadingList || balancesLoading"
              @click="refresh"
            >
              Refresh
            </VaButton>
          </div>
        </div>

        <VaDataTable
          :columns="columns"
          :items="filteredItems"
          :loading="loadingList"
          :style="{
            '--va-data-table-thead-background': 'var(--va-background-element)',
            '--va-data-table-thead-color': '#2C82E0',
          }"
          sticky-header
        >
          <template #cell(balance)="{ rowData }">
            <div class="text-right tabular-nums">
              <span v-if="balancesLoading" class="text-slate-400">…</span>
              <span
                v-else
                :class="
                  (balances[String(rowData.winmaxId)] ?? 0) < 0 ? 'text-red-600 font-semibold' : 'text-slate-800'
                "
              >
                {{ formatBalance(balances[String(rowData.winmaxId)]) }}
              </span>
            </div>
          </template>
          <template #cell(isActive)="{ rowData }">
            <div class="flex justify-center">
              <VaBadge :text="rowData.isActive ? 'Active' : 'Inactive'" :color="rowData.isActive ? 'success' : 'danger'" />
            </div>
          </template>
          <template #bodyAppend>
            <tr v-if="!loadingList && filteredItems.length === 0">
              <td :colspan="columns.length" class="text-center text-slate-500 py-4">No office customers found.</td>
            </tr>
          </template>
        </VaDataTable>
      </VaCardContent>
    </VaCard>
  </div>
</template>
