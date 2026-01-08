<template>
  <VaModal
    :model-value="true"
    class="wallee-config-modal"
    title="Configure Wallee"
    hide-default-actions
    close-button
    @update:modelValue="emits('cancel')"
  >
    <div class="p-4 space-y-6">
      <!-- SECTION 1: Create Terminal -->
      <section class="border p-4 rounded-lg bg-gray-50">
        <h3 class="text-lg font-bold mb-3">1. Create Extra Terminal</h3>
        <div class="grid grid-cols-2 gap-4">
          <VaInput v-model="terminalForm.name" label="Terminal Name" placeholder="e.g. Front Counter #2" />
          <VaInput v-model="terminalForm.ip" label="IP Address" placeholder="192.168.x.x" />
          <VaInput v-model="terminalForm.port" label="Port" type="number" />
          <VaInput v-model="terminalForm.posId" label="POS ID" placeholder="TILL02" />
          <VaInput v-model="terminalForm.currency" label="Currency" />
        </div>
        <div class="flex justify-end mt-3">
          <VaButton :loading="isCreatingTerminal" @click="createTerminal">Create Terminal</VaButton>
        </div>

        <!-- List of created terminals in this session -->
        <div v-if="createdTerminals.length" class="mt-4">
          <h4 class="font-semibold text-sm text-gray-600">Terminals Created in this Session:</h4>
          <ul class="list-disc pl-5 text-sm">
            <li v-for="t in createdTerminals" :key="t._id">
              <span class="font-mono bg-gray-200 px-1 rounded">{{ t._id }}</span> - {{ t.name }} ({{ t.config.POS_ID }})
            </li>
          </ul>
        </div>
      </section>

      <!-- SECTION 2: Map Zone -->
      <section class="border p-4 rounded-lg bg-gray-50">
        <h3 class="text-lg font-bold mb-3">2. Map Delivery Zone to Terminal</h3>
        <div class="grid grid-cols-1 gap-4">
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
            label="Wallee Terminal"
            text-by="label"
            value-by="value"
            placeholder="Select Terminal"
            searchable
          />
          <VaInput v-model="mappingForm.priority" label="Priority" type="number" />
        </div>
        <div class="flex justify-end mt-3">
          <VaButton :loading="isMappingZone" @click="createMapping">Map Zone</VaButton>
        </div>
      </section>
    </div>
  </VaModal>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useToast } from 'vuestic-ui'

const props = defineProps<{
  outletId: string
  paymentTypeId: string
}>()

const emits = defineEmits(['cancel'])
const { init } = useToast()

// --- STATE ---
const createdTerminals = ref<any[]>([])
const deliveryZones = ref<any[]>([])
const existingTerminals = ref<any[]>([])

const terminalForm = ref({
  name: '',
  ip: '',
  port: 50000,
  posId: '',
  currency: 'EUR',
})

const mappingForm = ref({
  deliveryZoneId: '',
  walleeTerminalId: '',
  priority: 1,
})

const isCreatingTerminal = ref(false)
const isMappingZone = ref(false)

// --- ACTIONS ---

const fetchDeliveryZones = async () => {
  try {
    const url = import.meta.env.VITE_API_BASE_URL
    const res = await axios.get(`${url}/deliveryZones/${props.outletId}`)
    deliveryZones.value = res.data?.data || []
  } catch (e) {
    console.error('Failed to fetch zones', e)
    init({ message: 'Failed to load delivery zones', color: 'danger' })
  }
}

const fetchTerminals = async () => {
  try {
    const url = import.meta.env.VITE_API_BASE_URL
    const res = await axios.get(`${url}/wallee/terminals`, {
      params: { outletId: props.outletId },
    })
    existingTerminals.value = res.data?.data || []
  } catch (e) {
    console.error('Failed to fetch terminals', e)
    // Don't error loudly if endpoint doesn't exist yet, just log
  }
}

const createTerminal = async () => {
  if (!terminalForm.value.name || !terminalForm.value.ip || !terminalForm.value.posId) {
    init({ message: 'Please fill all required fields', color: 'warning' })
    return
  }

  isCreatingTerminal.value = true
  try {
    const url = import.meta.env.VITE_API_BASE_URL
    const payload = {
      outletId: props.outletId,
      name: terminalForm.value.name,
      config: {
        TERMINAL_IP: terminalForm.value.ip,
        TERMINAL_PORT: Number(terminalForm.value.port),
        POS_ID: terminalForm.value.posId,
        CURRENCY: terminalForm.value.currency,
      },
    }
    const res = await axios.post(`${url}/wallee/terminals`, payload)

    const newTerminal = res.data.data
    createdTerminals.value.push(newTerminal)
    existingTerminals.value.push(newTerminal) // Add to dropdown list too

    // Auto-fill mapping ID if empty
    if (!mappingForm.value.walleeTerminalId) {
      mappingForm.value.walleeTerminalId = newTerminal._id
    }

    init({ message: 'Terminal created!', color: 'success' })

    // Reset form slightly
    terminalForm.value.name = ''
    terminalForm.value.posId = ''
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to create terminal', color: 'danger' })
  } finally {
    isCreatingTerminal.value = false
  }
}

const createMapping = async () => {
  if (!mappingForm.value.deliveryZoneId || !mappingForm.value.walleeTerminalId) {
    init({ message: 'Zone and Terminal ID are required', color: 'warning' })
    return
  }

  isMappingZone.value = true
  try {
    const url = import.meta.env.VITE_API_BASE_URL
    const payload = {
      outletId: props.outletId,
      deliveryZoneId: mappingForm.value.deliveryZoneId,
      paymentTypeId: props.paymentTypeId,
      walleeTerminalId: mappingForm.value.walleeTerminalId,
      priority: Number(mappingForm.value.priority),
    }
    await axios.post(`${url}/wallee/zone-mappings`, payload)
    init({ message: 'Zone mapped successfully!', color: 'success' })

    // Reset mapping form
    mappingForm.value.deliveryZoneId = ''
    mappingForm.value.walleeTerminalId = ''
  } catch (e: any) {
    init({ message: e.response?.data?.message || 'Failed to map zone', color: 'danger' })
  } finally {
    isMappingZone.value = false
  }
}

// --- COMPUTED ---
const deliveryZoneOptions = computed(() => {
  const sorted = [...deliveryZones.value].sort((a, b) => Number(a.serviceZoneId) - Number(b.serviceZoneId))
  return sorted.map((z) => ({
    label: `${z.serviceZoneId || '?'} - ${z.name}`,
    value: z._id,
  }))
})

const terminalOptions = computed(() => {
  return existingTerminals.value.map((t) => ({
    label: `${t.name} (${t.config?.POS_ID || 'No POS ID'})`,
    value: t._id,
  }))
})

onMounted(() => {
  fetchDeliveryZones()
  fetchTerminals()
})
</script>

<style scoped>
.wallee-config-modal {
  --va-modal-width: 700px;
}
</style>
