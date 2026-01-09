<template>
  <VaModal
    v-model="showCustomerModal"
    class="big-xl-modal"
    :mobile-fullscreen="false"
    size="large"
    hide-default-actions
    close-button
    @update:modelValue="$emit('close')"
  >
    <h3 class="va-h3 ml-3">{{ isEdit ? 'Edit Customer' : 'Add New Customer' }}</h3>
    <div class="bg-white p-4 pb-0">
      <div class="space-y-4 text-sm">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Customer Info -->
          <div>
            <h3 class="font-semibold text-gray-700 pb-1 mb-4 border-b" :style="{ borderColor: outlet.primaryColor }">
              Customer Information
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="text-sm font-medium text-gray-500">Mobile Number *</label>
                <VaInput v-model="phoneNumber" placeholder="Enter mobile number" class="mt-1" />
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">Customer Name *</label>
                <VaInput v-model="name" placeholder="Enter full name" class="mt-1" />
              </div>
            </div>

            <div class="flex flex-col gap-1 mt-4">
              <label class="text-sm font-medium text-gray-500">Customer Notes</label>
              <VaTextarea disabled placeholder="Special instructions, allergies, preferences..." rows="3" />
            </div>

            <div v-if="address.length" class="mt-4">
              <label class="text-sm font-medium text-gray-500">Saved Addresses</label>
              <div ref="addressListRef" class="overflow-y-auto max-h-[200px] pr-1 custom-scroll">
                <template v-for="(addr, index) in address" :key="index">
                  <div
                    v-if="!fetchedZones || !fetchedZones.length || isAddressInZone(addr)"
                    ref="addressItems"
                    :ref="(el) => (addressItems.value[index] = el)"
                    :class="[
                      'flex items-center justify-between mt-1 px-4 py-2 rounded border text-gray-500 cursor-pointer',
                      editAddress === index
                        ? 'bg-yellow-100 border-yellow-500'
                        : isSelectionMode && selectedAddressObj === addr
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-[#f8f9fa]',
                    ]"
                    @click="isSelectionMode ? (selectedAddressObj = addr) : null"
                  >
                    <!-- Selection Radio (manual implementation) -->
                    <div v-if="isSelectionMode" class="mr-3 flex items-center">
                      <CircleDot v-if="selectedAddressObj === addr" class="w-5 h-5 text-blue-600" />
                      <Circle v-else class="w-5 h-5 text-gray-400" />
                    </div>

                    <div v-if="addr.designation && addr.designation.startsWith('Meet')">
                      <span>
                        <strong>{{ addr.designation }}</strong>
                      </span>
                    </div>
                    <div v-else>
                      <span v-if="addr.designation" class="font-bold uppercase">{{ addr.designation }} - </span>
                      <span v-if="addr.aptNo">{{ addr.aptNo }},</span>
                      <span v-if="addr.floor">{{ addr.floor }},</span>
                      <span v-if="addr.streetName || addr.streetNo">{{ addr.streetName }} {{ addr.streetNo }},</span>
                      <span v-if="addr.district">{{ addr.district }}</span>
                      <span v-if="addr.city">,{{ addr.city }}</span>
                      <span v-if="addr.postCode">,{{ addr.postCode }}</span>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-1 ml-auto">
                      <!-- Edit Button -->
                      <VaButton
                        preset="secondary"
                        size="small"
                        icon="mso-edit"
                        aria-label="Edit Address"
                        @click="editAddressFields(addr, index)"
                      />
                      <!-- Delete Button -->
                      <!-- <VaButton
                        preset="danger"
                        color="danger"
                        size="small"
                        icon="mso-delete"
                        aria-label="Delete Address"
                        @click="deleteAddress(index)"
                      /> -->
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Address Info -->
          <div>
            <h3 class="font-semibold text-gray-700 pb-1 mb-4 border-b" :style="{ borderColor: outlet.primaryColor }">
              Address Information
            </h3>

            <p class="mb-2 text-sm font-medium text-gray-500">Search Postcode or Street Name</p>
            <div ref="dropdownContainer" class="relative">
              <div class="flex flex-col sm:flex-row gap-3 mb-4">
                <VaInput
                  v-model="searchAdd.postalCode"
                  placeholder="Postcode"
                  class="w-full sm:w-1/3"
                  @keyup.enter="handleSearch"
                />
                <VaInput
                  v-model="searchAdd.street"
                  placeholder="Street Name"
                  class="w-full sm:w-1/2"
                  @keyup.enter="handleSearch"
                />
                <VaButton
                  :disabled="!searchAdd.postalCode && !searchAdd.street"
                  :style="{ '--va-background-color': outlet.primaryColor }"
                  class="w-full sm:w-auto rounded-md"
                  size="medium"
                  icon="mso-search"
                  @click="fetchStreetName"
                />
              </div>
              <div v-if="streetList.length" id="userResults" ref="dropdownRef" class="customer-results">
                <ul class="divide divide-y-2">
                  <li
                    v-for="street in streetList"
                    :key="street"
                    class="p-2 cursor-pointer hover:bg-primary-500"
                    @click="setAddress(street)"
                  >
                    <span v-if="street.Designation && street.Designation.includes('Meeting')">
                      {{ street.Designation }}
                    </span>
                    <span v-else>{{ street['Postal Code'] }} &nbsp; - &nbsp;{{ street['Street Name'] }}</span>
                  </li>
                </ul>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
              <div>
                <label class="text-sm font-small text-gray-500">Post Code</label>
                <VaInput v-model="postCode" class="mt-1" />
              </div>
              <div>
                <label class="text-sm font-small text-gray-500">Street Number</label>
                <VaInput v-model="streetNumber" class="mt-1" />
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">Apt. Number</label>
                <VaInput v-model="aptNumber" class="mt-1" />
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">Floor</label>
                <VaInput v-model="floor" class="mt-1" />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
              <div>
                <label class="text-sm font-small text-gray-500">Street Name</label>
                <VaInput v-model="streetAddress" class="mt-1" />
              </div>
              <div>
                <label class="text-sm font-small text-gray-500">District</label>
                <VaInput v-model="district" class="mt-1" />
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">City</label>
                <VaInput v-model="muncipality" class="mt-1" />
              </div>
            </div>
            <div class="flex flex-col gap-1 mb-2">
              <label class="text-sm font-medium text-gray-500">Designation *</label>
              <VaInput
                v-model="designation"
                type="text"
                :readonly="editAddress !== -1"
                :class="editAddress !== -1 ? 'bg-gray-100 cursor-not-allowed' : ''"
              />
            </div>
            <div class="flex flex-col gap-1 mb-4">
              <label class="text-sm font-medium text-gray-500">Address Notes</label>

              <VaTextarea v-model="addressNote" placeholder="Delivery instructions, building access..." rows="3" />

              <div class="mt-2 flex justify-end">
                <VaButton
                  size="small"
                  class="!text-xs !px-1 !py-1 text-white rounded"
                  :style="{ '--va-background-color': outlet.primaryColor }"
                  :disabled="!isAddressValid"
                  @click="addAddress"
                >
                  {{ editAddress !== -1 ? 'Update' : 'Add' }} Address
                </VaButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-[#f8f9fa] px-3 py-4 w-full">
      <div class="flex flex-wrap sm:justify-end items-center gap-4">
        <div class="flex items-center gap-2">
          <VaCheckbox
            v-model="notifications"
            label="Receive Notifications"
            :color="outlet.primaryColor"
            :checked-text-color="outlet.primaryColor"
            class="outline-none focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-300"
          />
        </div>

        <VaButtonToggle
          v-model="isTick"
          :disabled="lockTick"
          :toggle-color="outlet.primaryColor"
          color="#65667c"
          :options="[
            { label: 'Save Data', value: true, icon: 'va-check' },
            { label: `Don't Save`, value: false, icon: 'va-close' },
          ]"
          icon-color="warning"
        />

        <VaButton
          preset="secondary"
          :style="{ color: outlet.primaryColor }"
          class="border-gray-300 hover:bg-gray-100 text-sm font-medium"
          @click="emits('cancel')"
        >
          Cancel
        </VaButton>
        <VaButton
          type="button"
          :disabled="isSubmitting || isTick === null"
          :style="{ '--va-background-color': outlet.primaryColor }"
          class="text-white text-sm font-semibold"
          @click="handleSubmit"
        >
          {{ isSelectionMode ? 'Select Address' : isEdit ? 'Save' : 'Add Customer' }}
        </VaButton>
      </div>
    </div>
  </VaModal>
</template>
<script setup lang="ts">
import { useOrderStore } from '@/stores/order-store'
import { ref, watch, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from 'vuestic-ui'
import axios from 'axios'
import { useServiceStore } from '@/stores/services.ts'
import { Circle, CircleDot } from 'lucide-vue-next'

const { init } = useToast()
const addressNote = ref('')
const emits = defineEmits(['cancel', 'setUser', 'close', 'selectAddress'])
const orderStore = useOrderStore()

const props = defineProps<{
  selectedUser?: Record<string, string>
  userName: string
  userNumber: string
  outlet: Record<string, any>
  forceUpdateId?: string | null
  isSelectionMode?: boolean
  deliveryZoneId?: string
}>()

const fetchedZones = ref<any[]>([])

function isAddressInZone(addr: any) {
  // If we haven't fetched zones yet or request failed, effectively disable filter (or hide all? User implied strict filtering)
  // User: "choose an address with a postal code not covered" -> implied we SHOULD hide invalid ones.
  // If we have no zones, maybe we shouldn't show any addresses? Or show all?
  // Safest: Show all if catch error, but if success and empty, show none.
  // Let's assume if fetchedZones is populated, we filter.
  if (!fetchedZones.value.length) return true

  const currentText = (addr.designation || '') + (addr.designation && addr.postCode ? ' ' : '') + (addr.postCode || '')
  const postalCode = addr.postCode

  // 1. Try postal code match
  const matchingZone = fetchedZones.value.find((zone) => {
    return (
      zone.postalCodes &&
      zone.postalCodes.some((zoneCode: any) => String(zoneCode).trim() === String(postalCode).trim())
    )
  })
  if (matchingZone) return true

  // 2. Try meeting point match
  if (addr.designation && (addr.designation.includes('Meeting') || addr.designation.includes('M.P'))) {
    for (const zone of fetchedZones.value) {
      if (!zone.meetingPoints) continue
      const match = zone.meetingPoints.find((mp: any) => {
        if (!mp || !mp.designation) return false
        // Normal match
        if (currentText.includes(mp.designation)) return true

        // Abbreviation match
        try {
          const abbr = mp.designation.replace(
            /(Meeting\s*Point)(\s*-\s*)([^-]+)(.*)/i,
            (_: any, _mp: any, sep: any, mid: any, rest: any) => `M.P${sep}${(mid || '').trim().slice(0, 4)}${rest}`,
          )
          return currentText.toLowerCase().replace(/\s/g, '').includes(abbr.toLowerCase().replace(/\s/g, ''))
        } catch {
          return false
        }
      })
      if (match) return true
    }
  }

  return false
}

// ... existing code ...

const fetchDeliveryZones = async () => {
  // We need the parent ID (Brand/Portal) to fetch all zones, then find our specific outlet's zone
  const serviceStore = useServiceStore()
  const parentId = serviceStore.selectedRest

  console.log('DEBUG: fetchDeliveryZones Called', {
    isSelectionMode: props.isSelectionMode,
    hasOutlet: !!props.outlet,
    parentId,
  })

  if (!props.isSelectionMode || !props.outlet) {
    console.log('DEBUG: Returning early due to missing props')
    return
  }
  if (!parentId) {
    console.log('DEBUG: Returning early due to missing parentId')
    return
  }

  try {
    // Fetch all zones for the brand
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/deliveryZones/${parentId}`)
    // Handle potentially different response structures (array directly or wrapped in zones)
    const allZones = response.data?.data?.zones || (Array.isArray(response.data?.data) ? response.data.data : [])

    // Find the specific zone for THIS outlet (e.g. Lakatamia)
    // props.outlet contains the specific outlet details
    // We match by ID first, then Name as fallback

    console.log('DEBUG: Filter Logic', {
      parentId,
      outletProp: props.outlet,
      deliveryZoneIdProp: props.deliveryZoneId,
      allZones,
    })

    const targetZone = allZones.find(
      (z) =>
        (props.deliveryZoneId && z._id === props.deliveryZoneId) ||
        (z._id && props.outlet._id && z._id === props.outlet._id) ||
        (z.name && props.outlet.name && z.name.toLowerCase() === props.outlet.name.toLowerCase()),
    )

    console.log('DEBUG: Target Zone Found:', targetZone)

    // We only care about the postal codes/meeting points for THIS specific zone
    fetchedZones.value = targetZone ? [targetZone] : []
  } catch (e) {
    console.error('Failed to fetch delivery zones for filtering', e)
  }
}

watch(
  () => props.isSelectionMode,
  (val) => {
    if (val) fetchDeliveryZones()
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (props.isSelectionMode && !fetchedZones.value.length) fetchDeliveryZones()
})

const addressListRef = ref(null)
const addressSet = ref(null)
const addressItems = ref<any[]>([])
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownContainer = ref<HTMLElement | null>(null)

const showCustomerModal = ref(true)
const searchAdd = reactive({
  street: '',
  postalCode: '',
})
const name = ref('')
const phoneNumber = ref('')
const notifications: any = ref(false)
const postCode = ref('')
const streetAddress = ref('')
const floor = ref('')
const muncipality = ref('')
const district = ref('')
const streetNumber = ref('')
const aptNumber = ref('')
const designation = ref('')
const isTick = ref<boolean | null>(null)
const streetList = ref<any[]>([])
const address = ref<any[]>([])
const isSubmitting = ref(false)
const editAddress = ref(-1)
const selectedAddressObj = ref<any>(null) // Track selected object directly

watch(showCustomerModal, (val) => {
  if (!val) {
    // clear transient state on close
    streetList.value = []
    addressSet.value = null
    editAddress.value = -1
    emits('cancel')
  }
})

const isAddressValid = computed(() => {
  if (designation.value.trim().startsWith('Meet') || designation.value.trim().startsWith('M.P')) {
    return designation.value.trim() !== ''
  }
  return (
    postCode.value.trim() !== '' &&
    streetAddress.value.trim() !== '' &&
    district.value.trim() !== '' &&
    muncipality.value.trim() !== '' &&
    designation.value.trim() !== ''
  )
})

if (props.selectedUser) {
  name.value = props.selectedUser['Name'] || ''
  phoneNumber.value = props.selectedUser['MobilePhone'] || props.selectedUser['Phone'] || ''
  notifications.value = !!props.selectedUser['notifications']

  if (typeof props.selectedUser['isTick'] !== 'undefined') {
    isTick.value = !!props.selectedUser['isTick']
  } else {
    isTick.value = true
  }

  const other = props.selectedUser['OtherAddresses']
  if (Array.isArray(other) && other.length) {
    other.forEach((e: any) => {
      const add = String(e.Address || '').split(',')
      address.value.push({
        designation: e.Designation || 'Home',
        floor: add[1] || '',
        aptNo: add[0] || '',
        streetName: add[3] || '',
        streetNo: add[2] || '',
        district: add[4] || '',
        city: add[5] || '',
        postCode: add[6] || '',
        deliveryNote: e.deliveryNote || '', // Add this
      })
    })
  }
} else {
  name.value = props.userName || ''
  phoneNumber.value = String(props.userNumber ?? '').trim()
  isTick.value = null
}

const isEdit = computed(() => !!(props.selectedUser || props.forceUpdateId))

function handleClickOutside(event: MouseEvent) {
  if (
    dropdownRef.value &&
    !dropdownRef.value.contains(event.target as Node) &&
    dropdownContainer.value &&
    !dropdownContainer.value.contains(event.target as Node)
  ) {
    streetList.value = []
  }
}

function handleSearch() {
  if (!searchAdd.postalCode && !searchAdd.street) return
  fetchStreetName()
}

function setAddress(addr: any) {
  addressSet.value = addr

  if (addr.Designation && addr.Designation.includes('Meeting Point')) {
    const d = addr?.Designation ?? ''

    designation.value = d.includes('Meeting Point')
      ? d
          .replace(
            /(Meeting\s*Point)(\s*-\s*)([^-]+)(.*)/i,
            (_, _mp, sep, mid, rest) => `M.P${sep}${mid.trim().slice(0, 4)}${rest}`,
          )
          .trim()
      : d
  }

  streetAddress.value = addr['Street Name'] || ''
  district.value = addr['District'] || ''
  postCode.value = addr['Postal Code'] || ''
  muncipality.value = addr['Municipality / Community'] || ''
  streetList.value = []
}

async function addAddress() {
  if (!isAddressValid.value) {
    init({ color: 'danger', message: 'Please fill all required address fields.' })
    addressSet.value = null
    return
  }

  const isMeetingPoint = designation.value.includes('M.P')

  if (!isMeetingPoint /*&& editAddress.value === -1*/) {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/postalcodes/streets`, {
        params: {
          postalCode: postCode.value,
          streetName: streetAddress.value,
        },
      })

      if (!response.data.data || response.data.data.length === 0) {
        init({ color: 'danger', message: 'Address not available for Delivery' })
        return
      }
    } catch (error) {
      init({ color: 'danger', message: 'Failed to verify delivery availability' })
      return
    }
  }

  const payload = {
    designation: designation.value,
    floor: floor.value,
    aptNo: aptNumber.value,
    streetName: streetAddress.value,
    streetNo: streetNumber.value,
    district: district.value,
    postCode: postCode.value,
    city: muncipality.value,
    deliveryNote: addressNote.value || '',
  }
  if (editAddress.value !== -1) {
    address.value[editAddress.value] = payload
    // If in selection mode, keep the selection if we just edited the selected one
    if (props.isSelectionMode && selectedAddressObj.value === address.value[editAddress.value]) {
      // already selected, logic holds
    } else if (props.isSelectionMode) {
      // Option: auto-select the edited one? Usually yes.
      selectedAddressObj.value = address.value[editAddress.value]
    }
  } else {
    address.value.push(payload)
    // Auto-select the newly added address if in selection mode
    if (props.isSelectionMode) {
      selectedAddressObj.value = payload
    }
  }
  // Set the order’s delivery notes for this session only (not persisted in customer profile)
  if (addressNote.value?.trim()) {
    orderStore.deliveryNotes = addressNote.value.trim()
  }
  floor.value = ''
  aptNumber.value = ''
  designation.value = ''
  streetAddress.value = ''
  streetNumber.value = ''
  district.value = ''
  postCode.value = ''
  muncipality.value = ''
  addressNote.value = '' // Clear address note

  // Clear search fields too
  searchAdd.postalCode = ''
  searchAdd.street = ''

  editAddress.value = -1
}

function editAddressFields(addr: any, index: number) {
  postCode.value = addr.postCode || ''
  muncipality.value = addr.city || ''
  streetAddress.value = addr.streetName || ''
  streetNumber.value = addr.streetNo || ''
  aptNumber.value = addr.aptNo || ''
  floor.value = addr.floor || ''
  district.value = addr.district || ''
  designation.value = addr.designation || ''
  addressNote.value = addr.deliveryNote || ''

  editAddress.value = index

  nextTick(() => {
    const el = addressItems.value[index]
    if (el && addressListRef.value) {
      const parent: any = addressListRef.value
      parent.scrollTop = el.offsetTop - parent.offsetTop
    }
  })
}

// async function deleteAddress(index: number) {
//   if (!confirm('Are you sure you want to delete this address?')) return
//   address.value.splice(index, 1)
// }

async function fetchStreetName() {
  streetList.value = []
  const servicesStore = useServiceStore()
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/postalcodes/streets`, {
      params: {
        postalCode: searchAdd.postalCode,
        streetName: searchAdd.street,
        outletId: servicesStore.selectedRest,
      },
    })

    if (response.status === 200 && response.data.data.length > 0) {
      streetList.value = response.data.data.sort((a: any, b: any) => {
        const aDesignation = a.Designation || ''
        const bDesignation = b.Designation || ''
        const aIsMeeting = aDesignation.includes('Meeting')
        const bIsMeeting = bDesignation.includes('Meeting')

        if (aIsMeeting && bIsMeeting) {
          return aDesignation.localeCompare(bDesignation)
        } else if (aIsMeeting) {
          return -1
        } else if (bIsMeeting) {
          return 1
        } else {
          return (a['Street Name'] || '').localeCompare(b['Street Name'] || '')
        }
      })
    } else {
      streetList.value = []
      init({ color: 'danger', message: 'Address not available for Delivery' })
    }
  } catch (error) {
    streetList.value = []
    init({ color: 'danger', message: 'Failed to fetch address data' })
  }
}
async function stellaUpsertFromForm(
  base: any,
  outletId: string,
  maybeId?: string,
  wmMeta?: { ID?: number | string; Code?: number | string } | null = null,
) {
  const byId = maybeId
    ? { data: { data: [{ _id: maybeId }] } }
    : await axios.get(`${import.meta.env.VITE_API_BASE_URL}/customers/search`, {
        params: { phoneNo: base.phone, outletId },
      })

  const hit = maybeId ? { _id: maybeId } : (Array.isArray(byId?.data?.data) && byId.data.data[0]) || null

  const common = {
    phone: base.phone,
    name: base.name,
    isTick: !!base.isTick,
    notifications: !!base.notifications,
    customerNote: base.customerNote || '',
    addressNote: base.addressNote || '',
    outletId,
    address: (base.address || []).map((e: any) => ({
      designation: e.designation || 'Home',
      aptNo: e.aptNo || '',
      floor: e.floor || '',
      streetNo: e.streetNo || '',
      streetName: e.streetName || '',
      district: e.district || '',
      city: e.city || '',
      postCode: e.postCode || e.postalCode || '',
      deliveryNote: e.deliveryNote || '',
    })),
    ...(wmMeta?.ID ? { ID: wmMeta.ID } : {}),
    ...(wmMeta?.Code ? { Code: wmMeta.Code } : {}),
  }

  if (hit) {
    return axios.patch(`${import.meta.env.VITE_API_BASE_URL}/customers/${hit._id || hit.id}`, {
      ...common,
      id: hit._id || hit.id,
    })
  } else {
    return axios.post(`${import.meta.env.VITE_API_BASE_URL}/customers`, common)
  }
}
async function winmaxCreateOrUpdate(base: any, outletId: string, selected?: any) {
  const hasWmId = !!selected?.ID

  const baseAddrs = Array.isArray(base.address) ? base.address : []
  const addressForWinmax = baseAddrs.filter(Boolean).map((e: any) => ({
    designation: e?.designation || 'Home',
    aptNo: e?.aptNo || '',
    floor: e?.floor || '',
    streetName: e?.streetName || '',
    streetNo: e?.streetNo || '',
    district: e?.district || '',
    city: e?.city || '',
    postCode: e?.postCode || e?.postalCode || '',
    deliveryNote: e?.deliveryNote || '',
  }))

  // 🔑 IMPORTANT: coerce to booleans — DO NOT pass the ref `isTick`
  const wmPayload = {
    name: String(base.name || ''),
    phone: String(base.phone || ''),
    address: addressForWinmax.map((a) => ({ ...a, PostCode: a.postCode })),
    isTick: !!base.isTick,
    isPresent: !!base.isTick, // ← as requested: “isPresent: isTick”
    notifications: !!base.notifications,
    customerNote: base.customerNote || '',
    addressNote: base.addressNote || '',
  }

  if (hasWmId) {
    await axios.put(
      `${import.meta.env.VITE_API_BASE_URL}/winmax/entities/${selected.ID}`,
      { ...wmPayload, ID: selected.ID, Code: selected.Code, id: selected._id || selected.id },
      { params: { outletId } },
    )
    return { ID: selected.ID, Code: selected.Code }
  } else {
    const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/winmax/entities`, wmPayload, {
      params: { outletId },
    })
    let meta =
      res?.data?.data && (res.data.data.ID || res.data.data.Code)
        ? { ID: res.data.data.ID, Code: res.data.data.Code }
        : null

    if (!meta) {
      const lookup = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/winmax/entities`, {
        params: { outletId, Phone: base.phone },
      })
      const first = Array.isArray(lookup?.data?.data) ? lookup.data.data[0] : null
      if (first?.ID) meta = { ID: first.ID, Code: first.Code }
    }
    return meta
  }
}
const lockTick = computed(() => {
  // Lock only when editing an existing customer AND their isTick is true
  return !!(props.selectedUser && (props.selectedUser as any).isTick)
})

async function addOrUpdateCustomerDetails() {
  const servicesStore = useServiceStore()
  const outletId = servicesStore.selectedRest

  // normalize phone to digits only
  phoneNumber.value = String(phoneNumber.value || '').replace(/\D+/g, '')

  const base = {
    name: String(name.value || '').trim(),
    phone: String(phoneNumber.value || '').trim(),
    address: Array.isArray(address.value) ? address.value : [],
    isTick: isTick.value, // UI toggle (Save / Don’t Save). We still do Winmax-first per rule.
    notifications: !!notifications.value,
    customerNote: '',
    addressNote: '',
  }

  try {
    // 1) Forced anonymous update of an existing Stella doc (never Winmax)
    if ((props as any).forceUpdateId) {
      await stellaUpsertFromForm(base, outletId, (props as any).forceUpdateId /* maybeId */, /* wmMeta */ null)
      emits('setUser', { phoneNumber: base.phone, name: base.name })
      return
    }

    // 2) Editing an existing selected user
    // 2) Editing an existing selected user
    if (props.selectedUser) {
      const selected = props.selectedUser as any

      // isPresent === isTick (coming from Stella doc)
      const present = !!selected.isTick

      if (present) {
        // Winmax only
        await winmaxCreateOrUpdate(base, outletId, selected?.ID ? selected : undefined)
      } else {
        // Anonymous (Stella-only) → UPDATE STELLA ONLY
        await stellaUpsertFromForm(base, outletId, selected._id || selected.id, null)
      }

      emits('setUser', { phoneNumber: base.phone, name: base.name })
      return
    }

    // 3) Creating a brand-new record → ALWAYS Winmax first, then Stella
    const wmCreated = await winmaxCreateOrUpdate(base, outletId, null)
    await stellaUpsertFromForm(base, outletId, /* maybeId */ undefined, wmCreated)

    emits('setUser', { phoneNumber: base.phone, name: base.name })
  } catch (error: any) {
    const msg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      (Array.isArray(error?.response?.data?.errors) ? error.response.data.errors.join(', ') : null) ||
      error?.message ||
      'Something went wrong.'
    init({ color: 'danger', message: msg })
  }
}

async function handleSubmit() {
  if (isSubmitting.value) return

  // basic guards for brand-new customers
  if (!String(name.value || '').trim()) {
    init({ color: 'danger', message: 'Please enter a customer name.' })
    return
  }
  const digits = String(phoneNumber.value || '').replace(/\D+/g, '')
  if (!digits) {
    init({ color: 'danger', message: 'Please enter a valid mobile number.' })
    return
  }
  if (isTick.value === null) {
    init({ color: 'danger', message: 'Choose “Save Data” or “Don’t Save”.' })
    return
  }

  // normalize phone in the bound field so downstream calls receive digits-only
  phoneNumber.value = digits

  isSubmitting.value = true
  try {
    await addOrUpdateCustomerDetails()

    // If in selection mode, emit the selected address now (using the potentially updated list)
    // If in selection mode, emit the selected address now
    if (props.isSelectionMode) {
      if (selectedAddressObj.value) {
        emits('selectAddress', selectedAddressObj.value)
      } else {
        init({ color: 'warning', message: 'Please select an address.' })
        isSubmitting.value = false
        return
      }
    }

    // close modal on success
    showCustomerModal.value = false
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Something went wrong.'
    init({ color: 'danger', message: msg })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style>
.customer-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 440px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  z-index: 50;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
.custom-scroll::-webkit-scrollbar-track {
  background-color: transparent;
}
.va-checkbox input:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
.va-checkbox input[type='checkbox']:focus,
.va-checkbox input[type='checkbox']:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
</style>
