<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import axios from 'axios'
import { useForm, useToast, defineVaDataTableColumns } from 'vuestic-ui'
import { validators } from '@/services/utils'
import { useServiceStore } from '@/stores/services'
import EditOfficeCustomerModal from './modals/EditOfficeCustomerModal.vue'

const { validate, resetValidation } = useForm('form')
const { init } = useToast()
const servicesStore = useServiceStore()

const url = import.meta.env.VITE_API_BASE_URL

// Outlet comes from login / the top navbar selection (servicesStore.selectedRest),
// exactly like the rest of the admin panel — there is no per-form outlet picker.
const outletId = computed(() => servicesStore.selectedRest || '')

const winmaxId = ref('')
const firstName = ref('')
const surname = ref('')
const email = ref('')
const password = ref('')
const officeNo = ref('')
const officePhone = ref('')
const saving = ref(false)

// List of existing office customers for the selected outlet.
const tableItems = ref<any[]>([])
const loadingList = ref(false)
const search = ref('')

// Row-action state.
const editTarget = ref<any>(null)
const resendTarget = ref<any>(null)
const resendLoading = ref(false)
const resetTarget = ref<any>(null)
const resetPassword = ref('')
const resetLoading = ref(false)

// Winmax balances, loaded separately so the table renders immediately and a slow
// or unavailable Winmax never blocks the list. Keyed by winmaxId.
const balances = ref<Record<string, number | null>>({})
const balancesLoading = ref(false)

const columns = defineVaDataTableColumns([
  { label: 'Employee ID', key: 'winmaxId', sortable: true },
  { label: 'Name', key: 'customerName', sortable: true },
  { label: 'Email', key: 'email', sortable: true },
  { label: 'Office No', key: 'officeNo', sortable: true },
  { label: 'Office Phone', key: 'officePhone', sortable: false },
  { label: 'Balance', key: 'balance', sortable: false, thAlign: 'right' },
  { label: 'Status', key: 'isActive', sortable: false, thAlign: 'center' },
  { label: 'Actions', key: 'actions', sortable: false, thAlign: 'center' },
])

function formatBalance(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return `€${Number(v).toFixed(2)}`
}

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return tableItems.value
  return tableItems.value.filter((c) =>
    [c.customerName, c.email, c.officeNo, c.officePhone, c.phone, String(c.winmaxId)].some((f) =>
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
  // Belt-and-braces: never show validation errors on a pristine form.
  void nextTick(() => resetValidation())
  if (!servicesStore.items.length) {
    try {
      await servicesStore.getAll()
    } catch {
      /* navbar usually loads these; ignore if it fails here */
    }
  }
  refresh()
})

// Reload whenever the chosen outlet (login / top navbar) changes.
watch(outletId, () => refresh())

const numberRule = (v: any) => /^[0-9]+$/.test(String(v ?? '').trim()) || 'Must be a number'
const minPwd = (v: any) => String(v ?? '').length >= 6 || 'At least 6 characters'

const canSave = computed(
  () =>
    !!outletId.value &&
    /^[0-9]+$/.test(String(winmaxId.value).trim()) &&
    !!firstName.value.trim() &&
    !!surname.value.trim() &&
    validators.email(email.value.trim()) === true &&
    String(password.value).length >= 6,
)

function resetForm() {
  winmaxId.value = ''
  firstName.value = ''
  surname.value = ''
  email.value = ''
  password.value = ''
  officeNo.value = ''
  officePhone.value = ''
  // Emptying the values re-triggers every field's `required` rule — clear the
  // validation state on the next tick so a fresh form never shows errors.
  void nextTick(() => resetValidation())
}

async function submit() {
  if (!validate() || !canSave.value) return
  saving.value = true
  try {
    const { data } = await axios.post(`${url}/customers/office`, {
      winmaxId: String(winmaxId.value).trim(),
      name: firstName.value.trim(),
      surname: surname.value.trim(),
      email: email.value.trim(),
      password: password.value,
      officeNo: officeNo.value.trim(),
      officePhone: officePhone.value.trim(),
      outletId: outletId.value,
    })
    init({ message: data?.message || 'Employee registered — welcome email sent', color: 'success' })
    resetForm()
    refresh()
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to register employee', color: 'danger' })
  } finally {
    saving.value = false
  }
}

async function confirmResend() {
  if (!resendTarget.value) return
  resendLoading.value = true
  try {
    const { data } = await axios.post(`${url}/customers/office/${resendTarget.value.id}/resend-welcome`)
    init({ message: data?.message || 'Welcome email sent', color: 'success' })
    resendTarget.value = null
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to send the welcome email', color: 'danger' })
  } finally {
    resendLoading.value = false
  }
}

async function confirmResetPassword() {
  if (!resetTarget.value || String(resetPassword.value).length < 6) return
  resetLoading.value = true
  try {
    const { data } = await axios.post(`${url}/customers/office/${resetTarget.value.id}/reset-password`, {
      password: resetPassword.value,
    })
    init({
      message: data?.message || 'Password reset — the employee will set a new one at next login',
      color: 'success',
    })
    resetTarget.value = null
    resetPassword.value = ''
    refresh()
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to reset the password', color: 'danger' })
  } finally {
    resetLoading.value = false
  }
}

function onEdited() {
  editTarget.value = null
  refresh()
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <VaCard class="mt-4">
      <VaCardContent>
        <h1 class="va-h5 mb-4">Register Employee</h1>

        <VaForm ref="form" @submit.prevent="submit">
          <!-- Compact responsive grid, laid out like the design mockup:
               row 1 = Employee ID / Name / Surname / Password,
               row 2 = Email (the widest cell) / Office No / Office Phone.
               Collapses to two columns on tablets, one on mobile. -->
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
            <VaInput
              v-model="winmaxId"
              class="xl:col-span-3"
              label="Employee ID"
              autocomplete="off"
              required-mark
              :rules="[validators.required, numberRule]"
              placeholder="e.g. 100001"
            />
            <VaInput
              v-model="firstName"
              class="xl:col-span-3"
              label="Name"
              autocomplete="off"
              required-mark
              :rules="[validators.required]"
              placeholder="First name"
            />
            <VaInput
              v-model="surname"
              class="xl:col-span-3"
              label="Surname"
              autocomplete="off"
              required-mark
              :rules="[validators.required]"
              placeholder="Surname"
            />

            <VaValue v-slot="isPasswordVisible" :default-value="false">
              <VaInput
                v-model="password"
                class="xl:col-span-3"
                :type="isPasswordVisible.value ? 'text' : 'password'"
                label="Password"
                autocomplete="new-password"
                required-mark
                :rules="[validators.required, minPwd]"
                placeholder="Min 6 characters (temporary)"
                messages="Temporary — the employee sets their own password at first login."
                @clickAppendInner="isPasswordVisible.value = !isPasswordVisible.value"
              >
                <template #appendInner>
                  <VaIcon
                    class="cursor-pointer"
                    :name="isPasswordVisible.value ? 'visibility_off' : 'visibility'"
                    size="small"
                    color="primary"
                  />
                </template>
              </VaInput>
            </VaValue>

            <VaInput
              v-model="email"
              class="md:col-span-2 xl:col-span-6"
              label="Email"
              autocomplete="off"
              required-mark
              type="email"
              :rules="[validators.required, validators.email]"
              placeholder="name@company.com"
            />
            <VaInput
              v-model="officeNo"
              class="xl:col-span-3"
              label="Office No"
              autocomplete="off"
              placeholder="Office number (optional)"
            />
            <VaInput
              v-model="officePhone"
              class="xl:col-span-3"
              label="Office Phone"
              autocomplete="off"
              placeholder="Office phone number (optional)"
            />
          </div>

          <div class="flex justify-end mt-4">
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
            <VaInput v-model="search" placeholder="Search name, email, office, ID" clearable size="small">
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
          <template #cell(email)="{ rowData }">
            <span v-if="rowData.email">{{ rowData.email }}</span>
            <VaBadge v-else text="No email" color="warning" />
          </template>
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
            <div class="flex justify-center items-center gap-1 flex-wrap">
              <VaBadge :text="rowData.isActive ? 'Active' : 'Inactive'" :color="rowData.isActive ? 'success' : 'danger'" />
              <VaBadge v-if="rowData.mustChangePassword" text="Temp password" color="info" />
            </div>
          </template>
          <template #cell(actions)="{ rowData }">
            <div class="flex justify-center gap-1">
              <VaButton preset="plain" size="small" icon="edit" title="Edit" @click="editTarget = rowData" />
              <VaButton
                preset="plain"
                size="small"
                icon="forward_to_inbox"
                title="Re-send welcome email"
                :disabled="!rowData.email"
                @click="resendTarget = rowData"
              />
              <VaButton
                preset="plain"
                size="small"
                icon="lock_reset"
                title="Reset password"
                @click="((resetTarget = rowData), (resetPassword = ''))"
              />
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

    <EditOfficeCustomerModal v-if="editTarget" :customer="editTarget" @cancel="editTarget = null" @saved="onEdited" />

    <VaModal
      :model-value="!!resendTarget"
      size="small"
      :mobile-fullscreen="false"
      hide-default-actions
      close-button
      @update:modelValue="resendTarget = null"
    >
      <template #header>
        <h1 class="va-h6 mb-2">Re-send welcome email</h1>
      </template>
      <p>
        Send the welcome email to <strong>{{ resendTarget?.email }}</strong> ({{ resendTarget?.customerName }})?
      </p>
      <template #footer>
        <div class="flex justify-end gap-2 mt-4">
          <VaButton preset="secondary" @click="resendTarget = null">Cancel</VaButton>
          <VaButton :loading="resendLoading" @click="confirmResend">Send</VaButton>
        </div>
      </template>
    </VaModal>

    <VaModal
      :model-value="!!resetTarget"
      size="small"
      :mobile-fullscreen="false"
      hide-default-actions
      close-button
      @update:modelValue="((resetTarget = null), (resetPassword = ''))"
    >
      <template #header>
        <h1 class="va-h6 mb-2">Reset password</h1>
      </template>
      <p class="mb-3">
        Set a new temporary password for <strong>{{ resetTarget?.customerName }}</strong> (Employee ID
        {{ resetTarget?.winmaxId }}). They will be asked to set their own password at next login.
      </p>
      <VaValue v-slot="isResetPwdVisible" :default-value="false">
        <VaInput
          v-model="resetPassword"
          :type="isResetPwdVisible.value ? 'text' : 'password'"
          label="New temporary password"
          autocomplete="new-password"
          required-mark
          :rules="[validators.required, minPwd]"
          placeholder="Min 6 characters"
          class="w-full"
          @clickAppendInner="isResetPwdVisible.value = !isResetPwdVisible.value"
        >
          <template #appendInner>
            <VaIcon
              class="cursor-pointer"
              :name="isResetPwdVisible.value ? 'visibility_off' : 'visibility'"
              size="small"
              color="primary"
            />
          </template>
        </VaInput>
      </VaValue>
      <template #footer>
        <div class="flex justify-end gap-2 mt-4">
          <VaButton preset="secondary" @click="((resetTarget = null), (resetPassword = ''))">Cancel</VaButton>
          <VaButton
            :disabled="String(resetPassword).length < 6"
            :loading="resetLoading"
            @click="confirmResetPassword"
          >
            Reset password
          </VaButton>
        </div>
      </template>
    </VaModal>
  </div>
</template>
