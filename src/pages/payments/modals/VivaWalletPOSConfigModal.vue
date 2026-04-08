<template>
  <VaModal
    :model-value="true"
    class="vivawalletpos-config-modal"
    title="Configure VivaWalletPOS"
    hide-default-actions
    close-button
    @update:modelValue="emits('cancel')"
  >
    <div class="p-2 space-y-6">
      <section class="border rounded-lg p-4">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 class="text-base font-bold">Device Terminal Mappings</h3>
            <p class="text-sm text-gray-500">
              Each kiosk device can use its own Viva POS terminal under the same payment type.
            </p>
          </div>
          <div class="text-sm text-gray-500">Payment Type ID: {{ paymentTypeIdText }}</div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <VaInput v-model="mappingForm.name" label="Name" placeholder="e.g. Kiosk YF_021B Viva POS" />
          <VaInput v-model="mappingForm.deviceGuid" label="Device GUID" placeholder="e.g. YF_021B" />
          <VaInput v-model="mappingForm.apiUrl" label="API URL" placeholder="https://demo-api.vivapayments.com" />
          <VaInput v-model="mappingForm.accountsUrl" label="Accounts URL" placeholder="Optional" />
          <VaInput v-model="mappingForm.clientId" label="Client ID" placeholder="POS APIs Client ID" />
          <VaInput v-model="mappingForm.clientSecret" label="Client Secret" placeholder="POS APIs Client Secret" />
          <VaInput v-model="mappingForm.terminalId" label="Terminal ID" type="number" />
          <VaInput v-model="mappingForm.cashRegisterId" label="Cash Register ID" placeholder="Optional" />
          <VaInput v-model="mappingForm.currencyCode" label="Currency Code" type="number" />
        </div>

        <div class="flex justify-end mb-4">
          <VaButton size="small" :loading="isCreatingMapping" @click="createMapping">Add Mapping</VaButton>
        </div>

        <div v-if="isLoadingMappings" class="text-center py-4 text-sm text-gray-400">Loading mappings...</div>
        <div v-else-if="!mappings.length" class="text-center py-4 text-sm text-gray-400">
          No VivaWalletPOS mappings yet.
        </div>
        <table v-else class="w-full text-sm border-collapse">
          <thead>
            <tr class="text-left bg-gray-100">
              <th class="p-2 border">Name</th>
              <th class="p-2 border">Device GUID</th>
              <th class="p-2 border">API URL</th>
              <th class="p-2 border">Client ID</th>
              <th class="p-2 border">Terminal ID</th>
              <th class="p-2 border">Cash Register ID</th>
              <th class="p-2 border">Currency</th>
              <th class="p-2 border text-center">Active</th>
              <th class="p-2 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mapping in mappings" :key="mapping._id" class="hover:bg-gray-50 align-top">
              <td class="p-2 border">
                <input
                  v-if="mapping._editing"
                  v-model="mapping._editData.name"
                  class="border rounded px-1 py-0.5 w-full text-sm"
                />
                <span v-else>{{ mapping.name }}</span>
              </td>
              <td class="p-2 border">
                <input
                  v-if="mapping._editing"
                  v-model="mapping._editData.deviceGuid"
                  class="border rounded px-1 py-0.5 w-full text-sm"
                />
                <span v-else>{{ mapping.deviceGuid }}</span>
              </td>
              <td class="p-2 border">
                <div v-if="mapping._editing" class="space-y-1">
                  <input
                    v-model="mapping._editData.apiUrl"
                    class="border rounded px-1 py-0.5 w-full text-sm"
                    placeholder="API URL"
                  />
                  <input
                    v-model="mapping._editData.accountsUrl"
                    class="border rounded px-1 py-0.5 w-full text-sm"
                    placeholder="Accounts URL"
                  />
                </div>
                <div v-else>
                  <div>{{ mapping.config?.API_URL }}</div>
                  <div v-if="mapping.config?.ACCOUNTS_URL" class="text-xs text-gray-500">
                    {{ mapping.config.ACCOUNTS_URL }}
                  </div>
                </div>
              </td>
              <td class="p-2 border">
                <div v-if="mapping._editing" class="space-y-1">
                  <input
                    v-model="mapping._editData.clientId"
                    class="border rounded px-1 py-0.5 w-full text-sm"
                    placeholder="Client ID"
                  />
                  <input
                    v-model="mapping._editData.clientSecret"
                    class="border rounded px-1 py-0.5 w-full text-sm"
                    placeholder="Client Secret"
                  />
                </div>
                <div v-else>
                  <div>{{ mapping.config?.CLIENT_ID }}</div>
                  <div class="text-xs text-gray-500">{{ redactSecret(mapping.config?.CLIENT_SECRET) }}</div>
                </div>
              </td>
              <td class="p-2 border">
                <input
                  v-if="mapping._editing"
                  v-model="mapping._editData.terminalId"
                  type="number"
                  class="border rounded px-1 py-0.5 w-24 text-sm"
                />
                <span v-else>{{ mapping.config?.TERMINAL_ID }}</span>
              </td>
              <td class="p-2 border">
                <input
                  v-if="mapping._editing"
                  v-model="mapping._editData.cashRegisterId"
                  class="border rounded px-1 py-0.5 w-full text-sm"
                />
                <span v-else>{{ mapping.config?.CASH_REGISTER_ID || '-' }}</span>
              </td>
              <td class="p-2 border">
                <input
                  v-if="mapping._editing"
                  v-model="mapping._editData.currencyCode"
                  type="number"
                  class="border rounded px-1 py-0.5 w-20 text-sm"
                />
                <span v-else>{{ mapping.config?.CURRENCY_CODE || 978 }}</span>
              </td>
              <td class="p-2 border text-center">
                <VaCheckbox
                  :model-value="mapping.isActive"
                  size="small"
                  @update:modelValue="(val) => toggleMappingActive(mapping, val)"
                />
              </td>
              <td class="p-2 border">
                <div class="flex gap-1 justify-center">
                  <template v-if="mapping._editing">
                    <VaButton
                      size="small"
                      color="success"
                      icon="mso-check"
                      :loading="mapping._saving"
                      @click="saveMapping(mapping)"
                    />
                    <VaButton size="small" color="secondary" icon="mso-close" @click="cancelEditMapping(mapping)" />
                  </template>
                  <template v-else>
                    <VaButton size="small" preset="primary" icon="mso-edit" @click="startEditMapping(mapping)" />
                    <VaButton
                      size="small"
                      preset="primary"
                      color="danger"
                      icon="mso-delete"
                      :loading="mapping._deleting"
                      @click="deleteMapping(mapping)"
                    />
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </VaModal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { useModal, useToast } from 'vuestic-ui'

const props = defineProps<{
  outletId: string
  paymentTypeId: string | number
}>()

const emits = defineEmits(['cancel'])
const { init } = useToast()
const { confirm } = useModal()
const BASE_URL = import.meta.env.VITE_API_BASE_URL

const mappings = ref<any[]>([])
const isLoadingMappings = ref(false)
const isCreatingMapping = ref(false)

const paymentTypeIdText = computed(() => String(props.paymentTypeId || '').trim())

const mappingForm = ref({
  name: '',
  deviceGuid: '',
  apiUrl: 'https://demo-api.vivapayments.com',
  accountsUrl: '',
  clientId: '',
  clientSecret: '',
  terminalId: '',
  cashRegisterId: '',
  currencyCode: 978,
})

const redactSecret = (value?: string) => {
  const text = String(value || '')
  if (!text) return ''
  if (text.length <= 4) return '****'
  return `${text.slice(0, 2)}****${text.slice(-2)}`
}

const buildConfig = (source: Record<string, any>) => ({
  API_URL: String(source.apiUrl || '').trim(),
  ...(String(source.accountsUrl || '').trim() && { ACCOUNTS_URL: String(source.accountsUrl).trim() }),
  CLIENT_ID: String(source.clientId || '').trim(),
  CLIENT_SECRET: String(source.clientSecret || '').trim(),
  TERMINAL_ID: Number(source.terminalId),
  ...(String(source.cashRegisterId || '').trim() && { CASH_REGISTER_ID: String(source.cashRegisterId).trim() }),
  CURRENCY_CODE: Number(source.currencyCode || 978),
})

const normalizeMappingState = (list: any[]) =>
  list.map((mapping: any) => ({
    ...mapping,
    _editing: false,
    _saving: false,
    _deleting: false,
    _editData: {},
  }))

const fetchMappings = async () => {
  if (!props.outletId || !paymentTypeIdText.value) {
    mappings.value = []
    return
  }

  isLoadingMappings.value = true
  try {
    const res = await axios.get(`${BASE_URL}/vivawalletpos/terminals`, {
      params: {
        outletId: props.outletId,
        paymentTypeId: paymentTypeIdText.value,
      },
    })
    mappings.value = normalizeMappingState(res.data?.data || [])
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to load VivaWalletPOS mappings', color: 'danger' })
  } finally {
    isLoadingMappings.value = false
  }
}

const validateCreateForm = () => {
  if (!paymentTypeIdText.value) {
    init({ message: 'Payment Type ID is required before adding VivaWalletPOS mappings', color: 'warning' })
    return false
  }

  const requiredFields = [
    ['Name', mappingForm.value.name],
    ['Device GUID', mappingForm.value.deviceGuid],
    ['API URL', mappingForm.value.apiUrl],
    ['Client ID', mappingForm.value.clientId],
    ['Client Secret', mappingForm.value.clientSecret],
    ['Terminal ID', mappingForm.value.terminalId],
  ]

  const missing = requiredFields.find(([, value]) => !String(value || '').trim())
  if (missing) {
    init({ message: `${missing[0]} is required`, color: 'warning' })
    return false
  }

  return true
}

const createMapping = async () => {
  if (!validateCreateForm()) return

  isCreatingMapping.value = true
  try {
    await axios.post(`${BASE_URL}/vivawalletpos/terminals`, {
      outletId: props.outletId,
      paymentTypeId: paymentTypeIdText.value,
      deviceGuid: String(mappingForm.value.deviceGuid).trim(),
      name: String(mappingForm.value.name).trim(),
      config: buildConfig(mappingForm.value),
    })
    init({ message: 'VivaWalletPOS mapping created', color: 'success' })
    mappingForm.value = {
      name: '',
      deviceGuid: '',
      apiUrl: mappingForm.value.apiUrl || 'https://demo-api.vivapayments.com',
      accountsUrl: '',
      clientId: '',
      clientSecret: '',
      terminalId: '',
      cashRegisterId: '',
      currencyCode: 978,
    }
    await fetchMappings()
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to create VivaWalletPOS mapping', color: 'danger' })
  } finally {
    isCreatingMapping.value = false
  }
}

const startEditMapping = (mapping: any) => {
  mapping._editData = {
    name: mapping.name || '',
    deviceGuid: mapping.deviceGuid || '',
    apiUrl: mapping.config?.API_URL || '',
    accountsUrl: mapping.config?.ACCOUNTS_URL || '',
    clientId: mapping.config?.CLIENT_ID || '',
    clientSecret: mapping.config?.CLIENT_SECRET || '',
    terminalId: mapping.config?.TERMINAL_ID || '',
    cashRegisterId: mapping.config?.CASH_REGISTER_ID || '',
    currencyCode: mapping.config?.CURRENCY_CODE || 978,
  }
  mapping._editing = true
}

const cancelEditMapping = (mapping: any) => {
  mapping._editing = false
  mapping._editData = {}
}

const saveMapping = async (mapping: any) => {
  const requiredFields = [
    ['Name', mapping._editData.name],
    ['Device GUID', mapping._editData.deviceGuid],
    ['API URL', mapping._editData.apiUrl],
    ['Client ID', mapping._editData.clientId],
    ['Client Secret', mapping._editData.clientSecret],
    ['Terminal ID', mapping._editData.terminalId],
  ]

  const missing = requiredFields.find(([, value]) => !String(value || '').trim())
  if (missing) {
    init({ message: `${missing[0]} is required`, color: 'warning' })
    return
  }

  mapping._saving = true
  try {
    await axios.patch(`${BASE_URL}/vivawalletpos/terminals/${mapping._id}`, {
      name: String(mapping._editData.name).trim(),
      deviceGuid: String(mapping._editData.deviceGuid).trim(),
      config: buildConfig(mapping._editData),
    })
    init({ message: 'VivaWalletPOS mapping updated', color: 'success' })
    await fetchMappings()
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to update VivaWalletPOS mapping', color: 'danger' })
  } finally {
    mapping._saving = false
    mapping._editing = false
  }
}

const toggleMappingActive = async (mapping: any, value: boolean) => {
  try {
    await axios.patch(`${BASE_URL}/vivawalletpos/terminals/${mapping._id}`, { isActive: value })
    mapping.isActive = value
    init({ message: `VivaWalletPOS mapping ${value ? 'activated' : 'deactivated'}`, color: 'success' })
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to update VivaWalletPOS mapping', color: 'danger' })
  }
}

const deleteMapping = async (mapping: any) => {
  const ok = await confirm({
    title: 'Delete Mapping',
    message: `Delete VivaWalletPOS mapping "${mapping.name}" for device "${mapping.deviceGuid}"?`,
    okText: 'Delete',
    cancelText: 'Cancel',
  })
  if (!ok) return

  mapping._deleting = true
  try {
    await axios.delete(`${BASE_URL}/vivawalletpos/terminals/${mapping._id}`)
    init({ message: 'VivaWalletPOS mapping deleted', color: 'success' })
    await fetchMappings()
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to delete VivaWalletPOS mapping', color: 'danger' })
  } finally {
    mapping._deleting = false
  }
}

onMounted(() => {
  fetchMappings()
})
</script>

<style scoped>
.vivawalletpos-config-modal {
  --va-modal-width: 1200px;
}
</style>
