<template>
  <VaModal
    :model-value="true"
    class="wallee-config-modal"
    title="Configure Wallee"
    hide-default-actions
    close-button
    @update:modelValue="emits('cancel')"
  >
    <div class="p-2 space-y-6">
      <!-- ============================================================ -->
      <!-- SECTION 1: TERMINALS -->
      <!-- ============================================================ -->
      <section class="border rounded-lg p-4">
        <h3 class="text-base font-bold mb-3">Terminals</h3>

        <!-- Create Terminal Form -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <VaInput v-model="terminalForm.name" label="Name" placeholder="e.g. Front Counter #1" />
          <VaInput v-model="terminalForm.ip" label="IP Address" placeholder="192.168.x.x" />
          <VaInput v-model="terminalForm.port" label="Port" type="number" />
          <VaInput v-model="terminalForm.posId" label="POS ID" placeholder="TILL01" />
          <VaInput v-model="terminalForm.currency" label="Currency" />
        </div>
        <div class="flex justify-end mb-4">
          <VaButton size="small" :loading="isCreatingTerminal" @click="createTerminal">Add Terminal</VaButton>
        </div>

        <!-- Terminals Table -->
        <div v-if="isLoadingTerminals" class="text-center py-4 text-sm text-gray-400">Loading terminals…</div>
        <div v-else-if="!terminals.length" class="text-center py-4 text-sm text-gray-400">No terminals yet.</div>
        <table v-else class="w-full text-sm border-collapse">
          <thead>
            <tr class="text-left bg-gray-100">
              <th class="p-2 border">Name</th>
              <th class="p-2 border">IP</th>
              <th class="p-2 border">Port</th>
              <th class="p-2 border">POS ID</th>
              <th class="p-2 border">Currency</th>
              <th class="p-2 border text-center">Active</th>
              <th class="p-2 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in terminals" :key="t._id" class="hover:bg-gray-50">
              <!-- Name -->
              <td class="p-2 border">
                <input v-if="t._editing" v-model="t._editData.name" class="border rounded px-1 py-0.5 w-full text-sm" />
                <span v-else>{{ t.name }}</span>
              </td>
              <!-- IP -->
              <td class="p-2 border">
                <input v-if="t._editing" v-model="t._editData.ip" class="border rounded px-1 py-0.5 w-full text-sm" />
                <span v-else>{{ t.config?.TERMINAL_IP }}</span>
              </td>
              <!-- Port -->
              <td class="p-2 border">
                <input
                  v-if="t._editing"
                  v-model="t._editData.port"
                  type="number"
                  class="border rounded px-1 py-0.5 w-20 text-sm"
                />
                <span v-else>{{ t.config?.TERMINAL_PORT }}</span>
              </td>
              <!-- POS ID -->
              <td class="p-2 border">
                <input
                  v-if="t._editing"
                  v-model="t._editData.posId"
                  class="border rounded px-1 py-0.5 w-full text-sm"
                />
                <span v-else>{{ t.config?.POS_ID }}</span>
              </td>
              <!-- Currency -->
              <td class="p-2 border">
                <input
                  v-if="t._editing"
                  v-model="t._editData.currency"
                  class="border rounded px-1 py-0.5 w-20 text-sm"
                />
                <span v-else>{{ t.config?.CURRENCY }}</span>
              </td>
              <!-- Active toggle -->
              <td class="p-2 border text-center">
                <VaCheckbox
                  :model-value="t.isActive"
                  size="small"
                  @update:modelValue="(val) => toggleTerminalActive(t, val)"
                />
              </td>
              <!-- Actions -->
              <td class="p-2 border">
                <div class="flex gap-1 justify-center">
                  <template v-if="t._editing">
                    <VaButton
                      size="small"
                      color="success"
                      icon="mso-check"
                      :loading="t._saving"
                      @click="saveTerminal(t)"
                    />
                    <VaButton size="small" color="secondary" icon="mso-close" @click="cancelEditTerminal(t)" />
                  </template>
                  <template v-else>
                    <VaButton size="small" preset="primary" icon="mso-edit" @click="startEditTerminal(t)" />
                    <VaButton
                      size="small"
                      preset="primary"
                      color="danger"
                      icon="mso-delete"
                      :loading="t._deleting"
                      @click="deleteTerminal(t)"
                    />
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ============================================================ -->
      <!-- SECTION 2: ZONE MAPPINGS -->
      <!-- ============================================================ -->
      <section class="border rounded-lg p-4">
        <h3 class="text-base font-bold mb-3">Zone Mappings</h3>

        <!-- Create Mapping Form -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <VaSelect
            v-model="mappingForm.deliveryZoneId"
            :options="deliveryZoneOptions"
            label="Delivery Zone"
            text-by="label"
            value-by="value"
            placeholder="Select Zone"
            searchable
          />
          <VaSelect
            v-model="mappingForm.walleeTerminalId"
            :options="terminalOptions"
            label="Terminal"
            text-by="label"
            value-by="value"
            placeholder="Select Terminal"
            searchable
          />
          <VaInput v-model="mappingForm.priority" label="Priority" type="number" />
        </div>
        <div class="flex justify-end mb-4">
          <VaButton size="small" :loading="isCreatingMapping" @click="createMapping">Add Mapping</VaButton>
        </div>

        <!-- Mappings Table -->
        <div v-if="isLoadingMappings" class="text-center py-4 text-sm text-gray-400">Loading mappings…</div>
        <div v-else-if="!mappings.length" class="text-center py-4 text-sm text-gray-400">No zone mappings yet.</div>
        <table v-else class="w-full text-sm border-collapse">
          <thead>
            <tr class="text-left bg-gray-100">
              <th class="p-2 border">Zone</th>
              <th class="p-2 border">Terminal</th>
              <th class="p-2 border">Priority</th>
              <th class="p-2 border text-center">Active</th>
              <th class="p-2 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in mappings" :key="m._id" class="hover:bg-gray-50">
              <!-- Zone -->
              <td class="p-2 border">
                <VaSelect
                  v-if="m._editing"
                  v-model="m._editData.deliveryZoneId"
                  :options="deliveryZoneOptions"
                  text-by="label"
                  value-by="value"
                  size="small"
                  class="w-full"
                />
                <span v-else>{{ zoneLabel(m.deliveryZoneId) }}</span>
              </td>
              <!-- Terminal -->
              <td class="p-2 border">
                <VaSelect
                  v-if="m._editing"
                  v-model="m._editData.walleeTerminalId"
                  :options="terminalOptions"
                  text-by="label"
                  value-by="value"
                  size="small"
                  class="w-full"
                />
                <span v-else>{{ terminalLabel(m.walleeTerminalId) }}</span>
              </td>
              <!-- Priority -->
              <td class="p-2 border">
                <input
                  v-if="m._editing"
                  v-model="m._editData.priority"
                  type="number"
                  class="border rounded px-1 py-0.5 w-16 text-sm"
                />
                <span v-else>{{ m.priority }}</span>
              </td>
              <!-- Active -->
              <td class="p-2 border text-center">
                <VaCheckbox
                  :model-value="m.isActive"
                  size="small"
                  @update:modelValue="(val) => toggleMappingActive(m, val)"
                />
              </td>
              <!-- Actions -->
              <td class="p-2 border">
                <div class="flex gap-1 justify-center">
                  <template v-if="m._editing">
                    <VaButton
                      size="small"
                      color="success"
                      icon="mso-check"
                      :loading="m._saving"
                      @click="saveMapping(m)"
                    />
                    <VaButton size="small" color="secondary" icon="mso-close" @click="cancelEditMapping(m)" />
                  </template>
                  <template v-else>
                    <VaButton size="small" preset="primary" icon="mso-edit" @click="startEditMapping(m)" />
                    <VaButton
                      size="small"
                      preset="primary"
                      color="danger"
                      icon="mso-delete"
                      :loading="m._deleting"
                      @click="deleteMapping(m)"
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
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useToast, useModal } from 'vuestic-ui'

const props = defineProps<{
  outletId: string
  paymentTypeId: string
}>()

const emits = defineEmits(['cancel'])
const { init } = useToast()
const { confirm } = useModal()
const BASE_URL = import.meta.env.VITE_API_BASE_URL

// -----------------------------------------------------------------------
// STATE
// -----------------------------------------------------------------------
const terminals = ref<any[]>([])
const mappings = ref<any[]>([])
const deliveryZones = ref<any[]>([])

const isLoadingTerminals = ref(false)
const isLoadingMappings = ref(false)
const isCreatingTerminal = ref(false)
const isCreatingMapping = ref(false)

const terminalForm = ref({ name: '', ip: '', port: 50000, posId: '', currency: 'EUR' })
const mappingForm = ref({ deliveryZoneId: '', walleeTerminalId: '', priority: 1 })

// -----------------------------------------------------------------------
// FETCH
// -----------------------------------------------------------------------
const fetchTerminals = async () => {
  isLoadingTerminals.value = true
  try {
    const res = await axios.get(`${BASE_URL}/wallee/terminals`, { params: { outletId: props.outletId } })
    terminals.value = (res.data?.data || []).map((t: any) => ({
      ...t,
      _editing: false,
      _saving: false,
      _deleting: false,
      _editData: {},
    }))
  } catch (e) {
    init({ message: 'Failed to load terminals', color: 'danger' })
  } finally {
    isLoadingTerminals.value = false
  }
}

const fetchMappings = async () => {
  isLoadingMappings.value = true
  try {
    const res = await axios.get(`${BASE_URL}/wallee/zone-mappings`, { params: { outletId: props.outletId } })
    mappings.value = (res.data?.data || []).map((m: any) => ({
      ...m,
      _editing: false,
      _saving: false,
      _deleting: false,
      _editData: {},
    }))
  } catch (e) {
    init({ message: 'Failed to load zone mappings', color: 'danger' })
  } finally {
    isLoadingMappings.value = false
  }
}

const fetchDeliveryZones = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/deliveryZones/${props.outletId}`)
    deliveryZones.value = res.data?.data || []
  } catch (e) {
    init({ message: 'Failed to load delivery zones', color: 'danger' })
  }
}

// -----------------------------------------------------------------------
// COMPUTED OPTIONS
// -----------------------------------------------------------------------
const deliveryZoneOptions = computed(() => {
  return [...deliveryZones.value]
    .sort((a, b) => Number(a.serviceZoneId) - Number(b.serviceZoneId))
    .map((z) => ({ label: `${z.serviceZoneId || '?'} - ${z.name}`, value: z._id }))
})

const terminalOptions = computed(() =>
  terminals.value.map((t) => ({ label: `${t.name} (${t.config?.POS_ID || 'No POS ID'})`, value: t._id })),
)

// walleeTerminalId / deliveryZoneId can be a populated object or a plain string
const resolveId = (val: any): string => (val && typeof val === 'object' ? val._id : val) || ''
const zoneLabel = (val: any) => {
  const id = resolveId(val)
  return deliveryZoneOptions.value.find((z) => z.value === id)?.label || id
}
const terminalLabel = (val: any) => {
  const id = resolveId(val)
  return terminalOptions.value.find((t) => t.value === id)?.label || id
}

// -----------------------------------------------------------------------
// TERMINALS — CREATE
// -----------------------------------------------------------------------
const createTerminal = async () => {
  if (!terminalForm.value.name || !terminalForm.value.ip || !terminalForm.value.posId) {
    init({ message: 'Name, IP and POS ID are required', color: 'warning' })
    return
  }
  isCreatingTerminal.value = true
  try {
    const payload = {
      outletId: props.outletId,
      name: terminalForm.value.name,
      isActive: true,
      config: {
        TERMINAL_IP: terminalForm.value.ip,
        TERMINAL_PORT: Number(terminalForm.value.port),
        POS_ID: terminalForm.value.posId,
        CURRENCY: terminalForm.value.currency,
      },
    }
    await axios.post(`${BASE_URL}/wallee/terminals`, payload)
    init({ message: 'Terminal created!', color: 'success' })
    terminalForm.value = { name: '', ip: '', port: 50000, posId: '', currency: 'EUR' }
    await fetchTerminals()
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to create terminal', color: 'danger' })
  } finally {
    isCreatingTerminal.value = false
  }
}

// -----------------------------------------------------------------------
// TERMINALS — EDIT / SAVE / DELETE
// -----------------------------------------------------------------------
const startEditTerminal = (t: any) => {
  t._editData = {
    name: t.name,
    ip: t.config?.TERMINAL_IP || '',
    port: t.config?.TERMINAL_PORT || 50000,
    posId: t.config?.POS_ID || '',
    currency: t.config?.CURRENCY || 'EUR',
  }
  t._editing = true
}

const cancelEditTerminal = (t: any) => {
  t._editing = false
  t._editData = {}
}

const saveTerminal = async (t: any) => {
  t._saving = true
  try {
    await axios.patch(`${BASE_URL}/wallee/terminals/${t._id}`, {
      name: t._editData.name,
      config: {
        TERMINAL_IP: t._editData.ip,
        TERMINAL_PORT: Number(t._editData.port),
        POS_ID: t._editData.posId,
        CURRENCY: t._editData.currency,
      },
    })
    init({ message: 'Terminal updated!', color: 'success' })
    await fetchTerminals()
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to update terminal', color: 'danger' })
  } finally {
    t._saving = false
    t._editing = false
  }
}

const toggleTerminalActive = async (t: any, val: boolean) => {
  try {
    await axios.patch(`${BASE_URL}/wallee/terminals/${t._id}`, { isActive: val })
    t.isActive = val
    init({ message: `Terminal ${val ? 'activated' : 'deactivated'}`, color: 'success' })
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to update terminal', color: 'danger' })
  }
}

const deleteTerminal = async (t: any) => {
  const ok = await confirm({
    message: `Delete terminal "${t.name}"?`,
    okText: 'Delete',
    cancelText: 'Cancel',
    title: 'Delete Terminal',
  })
  if (!ok) return
  t._deleting = true
  try {
    await axios.delete(`${BASE_URL}/wallee/terminals/${t._id}`)
    init({ message: 'Terminal deleted', color: 'success' })
    await fetchTerminals()
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to delete terminal', color: 'danger' })
  } finally {
    t._deleting = false
  }
}

// -----------------------------------------------------------------------
// MAPPINGS — CREATE
// -----------------------------------------------------------------------
const createMapping = async () => {
  if (!mappingForm.value.deliveryZoneId || !mappingForm.value.walleeTerminalId) {
    init({ message: 'Zone and Terminal are required', color: 'warning' })
    return
  }
  isCreatingMapping.value = true
  try {
    await axios.post(`${BASE_URL}/wallee/zone-mappings`, {
      outletId: props.outletId,
      deliveryZoneId: mappingForm.value.deliveryZoneId,
      paymentTypeId: props.paymentTypeId,
      walleeTerminalId: mappingForm.value.walleeTerminalId,
      priority: Number(mappingForm.value.priority),
      isActive: true,
    })
    init({ message: 'Zone mapping created!', color: 'success' })
    mappingForm.value = { deliveryZoneId: '', walleeTerminalId: '', priority: 1 }
    await fetchMappings()
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to create mapping', color: 'danger' })
  } finally {
    isCreatingMapping.value = false
  }
}

// -----------------------------------------------------------------------
// MAPPINGS — EDIT / SAVE / DELETE
// -----------------------------------------------------------------------
const startEditMapping = (m: any) => {
  m._editData = {
    deliveryZoneId: resolveId(m.deliveryZoneId) || m.deliveryZoneId,
    walleeTerminalId: resolveId(m.walleeTerminalId) || m.walleeTerminalId,
    priority: m.priority,
  }
  m._editing = true
}

const cancelEditMapping = (m: any) => {
  m._editing = false
  m._editData = {}
}

const saveMapping = async (m: any) => {
  m._saving = true
  try {
    await axios.patch(`${BASE_URL}/wallee/zone-mappings/${m._id}`, {
      deliveryZoneId: m._editData.deliveryZoneId,
      walleeTerminalId: m._editData.walleeTerminalId,
      priority: Number(m._editData.priority),
    })
    init({ message: 'Mapping updated!', color: 'success' })
    await fetchMappings()
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to update mapping', color: 'danger' })
  } finally {
    m._saving = false
    m._editing = false
  }
}

const toggleMappingActive = async (m: any, val: boolean) => {
  try {
    await axios.patch(`${BASE_URL}/wallee/zone-mappings/${m._id}`, { isActive: val })
    m.isActive = val
    init({ message: `Mapping ${val ? 'activated' : 'deactivated'}`, color: 'success' })
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to update mapping', color: 'danger' })
  }
}

const deleteMapping = async (m: any) => {
  const ok = await confirm({
    message: 'Delete this zone mapping?',
    okText: 'Delete',
    cancelText: 'Cancel',
    title: 'Delete Mapping',
  })
  if (!ok) return
  m._deleting = true
  try {
    await axios.delete(`${BASE_URL}/wallee/zone-mappings/${m._id}`)
    init({ message: 'Mapping deleted', color: 'success' })
    await fetchMappings()
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to delete mapping', color: 'danger' })
  } finally {
    m._deleting = false
  }
}

// -----------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------
onMounted(() => {
  fetchTerminals()
  fetchMappings()
  fetchDeliveryZones()
})
</script>

<style scoped>
.wallee-config-modal {
  --va-modal-width: 860px;
}
</style>
