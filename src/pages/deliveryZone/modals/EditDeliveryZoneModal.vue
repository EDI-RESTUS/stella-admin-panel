<template>
  <VaModal
    v-model="isVisible"
    class="big-modal"
    :mobile-fullscreen="false"
    size="large"
    hide-default-actions
    close-button
  >
    <template #header>
      <h1 class="va-h6 mb-2">Edit Delivery Zone — {{ zoneName }}</h1>
    </template>

    <div v-if="loading" class="flex justify-center py-8">
      <VaProgressCircle indeterminate />
    </div>

    <div v-else class="flex flex-col gap-6">
      <!-- Postal Codes Section -->
      <div>
        <h3 class="va-h6 mb-3">Postal Codes</h3>
        <!-- Add postal code input -->
        <div class="flex items-center gap-2 mb-3">
          <VaInput
            v-model="newPostalCode"
            placeholder="Enter postal code"
            size="small"
            class="flex-1"
            @keyup.enter="addPostalCode"
          />
          <VaButton
            size="small"
            color="success"
            icon="add"
            @click="addPostalCode"
          />
        </div>
        <div v-if="postalCodes.length" class="flex flex-wrap gap-2 bg-blue-50 p-4 rounded-lg max-h-[30vh] overflow-y-auto">
          <VaBadge
            v-for="(code, index) in postalCodes"
            :key="code"
            :text="code"
            :color="addedCodes.includes(code) ? '#4CAF50' : '#B3D943'"
          >
            <template #text>
              <span class="flex items-center gap-1 px-1">
                <span class="cursor-pointer hover:underline" @click="openAddressesModal(code)">
                  {{ code }}
                </span>
                <VaIcon
                  name="close"
                  size="12px"
                  class="cursor-pointer hover:text-red-500"
                  @click.stop="removePostalCode(index)"
                />
              </span>
            </template>
          </VaBadge>
        </div>
        <p v-else class="text-gray-500 italic">No postal codes assigned</p>
      </div>

      <!-- Meeting Points Section -->
      <div>
        <h3 class="va-h6 mb-3">Meeting Points</h3>
        <div v-if="meetingPoints.length" class="flex flex-col gap-3 max-h-[40vh] overflow-y-auto">
          <VaCard
            v-for="(mp, index) in meetingPoints"
            :key="mp._id || index"
            class="meeting-point-card"
          >
            <VaCardContent>
              <!-- View mode -->
              <div v-if="editingMpIndex !== index" class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-sm mb-1">{{ mp.designation }}</div>
                  <div class="text-xs text-gray-600">{{ mp.address }}</div>
                  <div class="text-xs text-gray-500 mt-1">
                    <span v-if="mp.city">{{ mp.city }}</span>
                    <span v-if="mp.city && mp.postalCode"> · </span>
                    <span v-if="mp.postalCode">{{ mp.postalCode }}</span>
                    <span v-if="mp.district"> · {{ mp.district }}</span>
                  </div>
                </div>
                <div class="flex gap-1">
                  <VaButton
                    preset="plain"
                    size="small"
                    color="primary"
                    icon="mso-edit"
                    @click="startEditMp(index)"
                  />
                  <VaButton
                    preset="plain"
                    size="small"
                    color="danger"
                    icon="mso-delete"
                    :disabled="mpLoading"
                    @click="deleteMeetingPoint(mp, index)"
                  />
                </div>
              </div>
              <!-- Edit mode -->
              <div v-else class="flex flex-col gap-2">
                <VaInput v-model="mpForm.designation" label="Designation" size="small" />
                <VaInput v-model="mpForm.address" label="Address" size="small" />
                <div class="grid grid-cols-2 gap-2">
                  <VaInput v-model="mpForm.streetName" label="Street Name" size="small" />
                  <VaInput v-model="mpForm.streetNo" label="Street No" size="small" />
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <VaInput v-model="mpForm.city" label="City" size="small" />
                  <VaInput v-model="mpForm.postalCode" label="Postal Code" size="small" />
                  <VaInput v-model="mpForm.district" label="District" size="small" />
                </div>
                <div class="flex justify-end gap-2 mt-1">
                  <VaButton size="small" preset="secondary" @click="cancelEditMp">Cancel</VaButton>
                  <VaButton size="small" :disabled="mpLoading" @click="saveEditMp(mp)">Save</VaButton>
                </div>
              </div>
            </VaCardContent>
          </VaCard>
        </div>
        <p v-else class="text-gray-500 italic">No meeting points assigned</p>

        <!-- Add Meeting Point -->
        <div v-if="showAddMpForm" class="mt-3">
          <VaCard class="meeting-point-card">
            <VaCardContent class="flex flex-col gap-2">
              <VaInput v-model="mpForm.designation" label="Designation" size="small" />
              <VaInput v-model="mpForm.address" label="Address" size="small" />
              <div class="grid grid-cols-2 gap-2">
                <VaInput v-model="mpForm.streetName" label="Street Name" size="small" />
                <VaInput v-model="mpForm.streetNo" label="Street No" size="small" />
              </div>
              <div class="grid grid-cols-3 gap-2">
                <VaInput v-model="mpForm.city" label="City" size="small" />
                <VaInput v-model="mpForm.postalCode" label="Postal Code" size="small" />
                <VaInput v-model="mpForm.district" label="District" size="small" />
              </div>
              <div class="flex justify-end gap-2 mt-1">
                <VaButton size="small" preset="secondary" @click="showAddMpForm = false">Cancel</VaButton>
                <VaButton size="small" :disabled="mpLoading" @click="addMeetingPoint">Add</VaButton>
              </div>
            </VaCardContent>
          </VaCard>
        </div>
        <VaButton
          v-if="!showAddMpForm"
          class="mt-3"
          size="small"
          color="primary"
          icon="add"
          @click="openAddMpForm"
        >
          Add Meeting Point
        </VaButton>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end mt-4">
        <VaButton @click="save" :disabled="loading">Update</VaButton>
      </div>
    </template>
  </VaModal>
  <PostalCodeAddressesModal
    v-if="showAddressesModal"
    :postal-code="selectedPostalCode"
    @cancel="showAddressesModal = false"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import axios from 'axios'
import { useToast } from 'vuestic-ui'
import { useServiceStore } from '@/stores/services'
import PostalCodeAddressesModal from './PostalCodeAddressesModal.vue'

const props = defineProps({
  rowData: {
    type: Object,
    required: true,
  },
})

const emits = defineEmits(['cancel'])

const { init } = useToast()
const servicesStore = useServiceStore()

const isVisible = ref(true)
const loading = ref(false)
const zoneName = ref('')
const postalCodes = ref<string[]>([])
const originalPostalCodes = ref<string[]>([])
const addedCodes = ref<string[]>([])
const removedCodes = ref<string[]>([])
const newPostalCode = ref('')
const meetingPoints = ref<any[]>([])

const showAddressesModal = ref(false)
const selectedPostalCode = ref('')

// Meeting point form state
const mpLoading = ref(false)
const editingMpIndex = ref<number | null>(null)
const showAddMpForm = ref(false)
const emptyMpForm = {
  designation: '',
  address: '',
  streetNo: '',
  aptNo: '',
  floor: '',
  streetName: '',
  district: '',
  city: '',
  postalCode: '',
}
const mpForm = ref({ ...emptyMpForm })

watch(isVisible, (val) => {
  if (!val) emits('cancel')
})

const url: any = import.meta.env.VITE_API_BASE_URL

async function fetchZoneDetails() {
  loading.value = true
  try {
    const response = await axios.get(
      `${url}/deliveryZone/${servicesStore.selectedRest}?id=${props.rowData._id}`,
    )
    const zone = response.data.data[0]
    zoneName.value = zone.name || ''
    postalCodes.value = [...(zone.postalCodes || [])]
    originalPostalCodes.value = [...(zone.postalCodes || [])]
    meetingPoints.value = [...(zone.meetingPoints || [])]
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Failed to load delivery zone details'
    init({ message, color: 'danger' })
  } finally {
    loading.value = false
  }
}

fetchZoneDetails()

function openAddressesModal(code: string) {
  selectedPostalCode.value = code
  showAddressesModal.value = true
}

// --- Postal code functions ---
function addPostalCode() {
  const code = newPostalCode.value.trim()
  if (!code) return
  if (postalCodes.value.includes(code)) {
    init({ message: `Postal code "${code}" already exists`, color: 'warning' })
    return
  }
  postalCodes.value.push(code)
  const removedIndex = removedCodes.value.indexOf(code)
  if (removedIndex !== -1) {
    removedCodes.value.splice(removedIndex, 1)
  } else {
    addedCodes.value.push(code)
  }
  newPostalCode.value = ''
}

function removePostalCode(index: number) {
  const code = postalCodes.value[index]
  postalCodes.value.splice(index, 1)
  const addedIndex = addedCodes.value.indexOf(code)
  if (addedIndex !== -1) {
    addedCodes.value.splice(addedIndex, 1)
  } else {
    removedCodes.value.push(code)
  }
}

// --- Meeting point functions ---
function startEditMp(index: number) {
  const mp = meetingPoints.value[index]
  editingMpIndex.value = index
  showAddMpForm.value = false
  mpForm.value = {
    designation: mp.designation || '',
    address: mp.address || '',
    streetNo: mp.streetNo || '',
    aptNo: mp.aptNo || '',
    floor: mp.floor || '',
    streetName: mp.streetName || '',
    district: mp.district || '',
    city: mp.city || '',
    postalCode: mp.postalCode || '',
  }
}

function cancelEditMp() {
  editingMpIndex.value = null
  mpForm.value = { ...emptyMpForm }
}

async function saveEditMp(mp: any) {
  mpLoading.value = true
  try {
    await axios.patch(
      `${url}/deliveryZones/${props.rowData._id}/meetingPoints/${mp._id}`,
      { ...mpForm.value },
    )
    // Update the local meeting point data
    const idx = editingMpIndex.value!
    meetingPoints.value[idx] = { ...meetingPoints.value[idx], ...mpForm.value }
    editingMpIndex.value = null
    mpForm.value = { ...emptyMpForm }
    init({ message: 'Meeting point updated', color: 'success' })
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Failed to update meeting point'
    init({ message, color: 'danger' })
  } finally {
    mpLoading.value = false
  }
}

async function deleteMeetingPoint(mp: any, index: number) {
  mpLoading.value = true
  try {
    await axios.delete(`${url}/deliveryZones/${props.rowData._id}/meetingPoints/${mp._id}`)
    meetingPoints.value.splice(index, 1)
    init({ message: 'Meeting point deleted', color: 'success' })
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Failed to delete meeting point'
    init({ message, color: 'danger' })
  } finally {
    mpLoading.value = false
  }
}

function openAddMpForm() {
  editingMpIndex.value = null
  mpForm.value = { ...emptyMpForm }
  showAddMpForm.value = true
}

async function addMeetingPoint() {
  mpLoading.value = true
  try {
    await axios.post(
      `${url}/deliveryZones/${props.rowData._id}/meetingPoints`,
      { ...mpForm.value },
    )
    // Re-fetch to get the new meeting point with its _id
    await fetchZoneDetails()
    showAddMpForm.value = false
    mpForm.value = { ...emptyMpForm }
    init({ message: 'Meeting point added', color: 'success' })
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Failed to add meeting point'
    init({ message, color: 'danger' })
  } finally {
    mpLoading.value = false
  }
}

// --- Save (postal codes only) ---
async function save() {
  loading.value = true
  try {
    const postalPayload: any = {}
    if (addedCodes.value.length) postalPayload.add = addedCodes.value
    if (removedCodes.value.length) postalPayload.remove = removedCodes.value

    if (Object.keys(postalPayload).length) {
      await axios.patch(`${url}/deliveryZones/${props.rowData._id}/postalCodes`, postalPayload)
    }

    init({ message: 'Delivery zone updated successfully', color: 'success' })
    isVisible.value = false
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Failed to update delivery zone'
    init({ message, color: 'danger' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.meeting-point-card {
  border: 1px solid var(--va-background-border);
  border-radius: 8px;
}
</style>
