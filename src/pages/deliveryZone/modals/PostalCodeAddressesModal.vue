<template>
  <VaModal
    v-model="isVisible"
    class="medium-modal"
    :mobile-fullscreen="false"
    size="medium"
    hide-default-actions
    close-button
  >
    <template #header>
      <h1 class="va-h6 mb-2">Addresses for {{ postalCode }}</h1>
    </template>

    <div v-if="loading" class="flex justify-center py-8">
      <VaProgressCircle indeterminate />
    </div>

    <div v-else class="flex flex-col gap-4">
      <!-- Add Address Button / Form -->
      <div v-if="!showAddForm && !editingId" class="flex justify-end">
        <VaButton
          size="small"
          icon="add"
          @click="startAddAddress"
        >
          Add Address
        </VaButton>
      </div>

      <!-- Add/Edit Form -->
      <VaCard v-if="showAddForm || editingId" class="mb-4 border border-gray-200">
        <VaCardContent class="flex flex-col gap-3">
          <h3 class="font-bold text-sm">{{ editingId ? 'Edit Address' : 'Add Address' }}</h3>
          
          <VaInput
            v-model="addressForm.streetName"
            label="Street Name"
            placeholder="Street Name"
            size="small"
          />
          
          <!-- Only show these fields for Adding, as per user instructions for Edit (which only showed Street Name update) 
               But user says "PATCH update postal code entry... -d { 'Street Name': ... }". 
               I'll show all fields for editing but maybe only street name is editable?
               Actually, usually all fields should be editable. The user example showed just Street Name being updated, 
               but that might be just an example. I'll include all fields but pre-fill them locally.
          -->
          <div class="grid grid-cols-2 gap-3">
            <VaInput
              v-model="addressForm.municipality"
              label="Municipality / Community"
              placeholder="Municipality"
              size="small"
            />
            <VaInput
              v-model="addressForm.district"
              label="District"
              placeholder="District"
              size="small"
            />
          </div>
           <VaInput
              v-model="addressForm.postalCode"
              label="Postal Code"
              size="small"
              readonly
              disabled
            />

          <div class="flex justify-end gap-2 mt-2">
            <VaButton preset="secondary" size="small" @click="cancelForm">Cancel</VaButton>
            <VaButton size="small" :disabled="formLoading" @click="saveAddress">Save</VaButton>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Address List -->
      <div v-if="addresses.length" class="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
        <div
          v-for="addr in addresses"
          :key="addr._id || addr.id"
          class="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100"
        >
          <div class="flex-1">
            <div class="font-medium text-sm">{{ addr['Street Name'] || addr.streetName }}</div>
            <div class="text-xs text-gray-500">
              {{ addr['Municipality / Community'] || addr.municipality }} · {{ addr.District || addr.district }}
            </div>
          </div>
          <div class="flex gap-1">
             <VaButton
              preset="plain"
              size="small"
              icon="edit"
              color="primary"
              @click="startEditAddress(addr)"
            />
            <VaButton
              preset="plain"
              size="small"
              icon="delete"
              color="danger"
              @click="deleteAddress(addr)"
            />
          </div>
        </div>
      </div>
      <p v-else class="text-center text-gray-500 italic py-4">No addresses found for this postal code.</p>
    </div>
  </VaModal>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import axios from 'axios'
import { useToast } from 'vuestic-ui'

const props = defineProps({
  postalCode: {
    type: String,
    required: true,
  },
})

const emits = defineEmits(['cancel'])

const { init } = useToast()
const isVisible = ref(true)
const loading = ref(false)
const addresses = ref<any[]>([])

// Form state
const showAddForm = ref(false)
const editingId = ref<string | null>(null)
const formLoading = ref(false)

const emptyForm = {
  streetName: '',
  municipality: '',
  district: '',
  postalCode: props.postalCode,
}

const addressForm = reactive({ ...emptyForm })

watch(isVisible, (val) => {
  if (!val) emits('cancel')
})

const url: any = import.meta.env.VITE_API_BASE_URL

async function fetchAddresses() {
  loading.value = true
  try {
    const response = await axios.get(`${url}/postalcodes?postalCode=${props.postalCode}`)
    // Assuming response is an array of objects or wrapped in data
    // The previous getPostalCodes in PostCodeModal used response.data.data.map...
    // But here the user says http://.../postalcodes?postalCode=...
    // I'll assume standard response format.
    // Based on user "data": [...] in previous artifacts, it's likely response.data.data
    // But let's check response structure. 
    // If it's a direct list, response.data.
    // I'll guess response.data.data based on other files.
    // Actually, looking at PostCodeModal.vue lines 121-127:
    // axios.get(...).then(response => postalCodes.value = response.data.data...)
    // So it's response.data.data
    addresses.value = response.data.data || []
  } catch (error: any) {
    // If 404, maybe empty? 
    if (error?.response?.status !== 404) {
      const message = error?.response?.data?.message || 'Failed to load addresses'
      init({ message, color: 'danger' })
    }
    addresses.value = []
  } finally {
    loading.value = false
  }
}

fetchAddresses()

function startAddAddress() {
  Object.assign(addressForm, { ...emptyForm, postalCode: props.postalCode })
  showAddForm.value = true
  editingId.value = null
}

function startEditAddress(addr: any) {
  // Mapping the fields from the fetched object to our form
  // The fetched object keys might be "Street Name", "Municipality / Community", "District" based on user curl
  // Or might be camelCase. I'll handle both just in case, preferring the ones from curl.
  addressForm.streetName = addr['Street Name'] || addr.streetName || ''
  addressForm.municipality = addr['Municipality / Community'] || addr.municipality || ''
  addressForm.district = addr['District'] || addr.district || ''
  addressForm.postalCode = addr['Postal Code'] || addr.postalCode || props.postalCode
  
  editingId.value = addr._id || addr.id
  showAddForm.value = false
}

function cancelForm() {
  showAddForm.value = false
  editingId.value = null
}

async function saveAddress() {
  formLoading.value = true
  try {
    const payload = {
      "Street Name": addressForm.streetName,
      "Postal Code": addressForm.postalCode,
      "Municipality / Community": addressForm.municipality,
      "District": addressForm.district,
    }

    if (editingId.value) {
      // Update
      await axios.patch(`${url}/postalcodes/entries/${editingId.value}`, payload)
      init({ message: 'Address updated', color: 'success' })
    } else {
      // Create
      await axios.post(`${url}/postalcodes`, payload)
      init({ message: 'Address added', color: 'success' })
    }
    
    cancelForm()
    fetchAddresses()
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Failed to save address'
    init({ message, color: 'danger' })
  } finally {
    formLoading.value = false
  }
}

async function deleteAddress(addr: any) {
  const id = addr._id || addr.id
  if (!confirm('Are you sure you want to delete this address?')) return

  try {
    await axios.delete(`${url}/postalcodes/entries/${id}`)
    init({ message: 'Address deleted', color: 'success' })
    fetchAddresses()
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Failed to delete address'
    init({ message, color: 'danger' })
  }
}

</script>

<style scoped>
</style>
