<template>
  <div class="w-full">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="font-semibold text-md text-gray-800">Customer Details</h2>
      <button
        class="border rounded p-1 hover:bg-gray-100 text-xs"
        @click="(isOpen = !isOpen), $emit('setOpen', isOpen)"
      >
        <span :class="isOpen ? 'rotate-45' : ''" class="transition-transform p-2">{{ isOpen ? '-' : '+' }}</span>
      </button>
    </div>

    <!-- Collapsible Content -->
    <Transition name="fade">
      <div v-show="isOpen" class="space-y-3 mt-2">
        <div class="flex bg-gray-100 rounded overflow-hidden text-sm">
          <button
            :class="selectedTab == 'takeaway' ? ` text-white font-semibold` : 'text-gray-600 hover:bg-gray-200'"
            class="flex-1 py-1 transition-colors"
            :style="{ backgroundColor: selectedTab == 'takeaway' ? outlet.primaryColor : '' }"
            @click="selectedTab = 'takeaway'"
          >
            Takeaway
            <span v-if="(selectedZoneDetails?.takeawayPromiseTime ?? 0) > 0">
              ({{ selectedZoneDetails.takeawayPromiseTime }} mins)
            </span>
          </button>
          <button
            :class="selectedTab == 'delivery' ? `text-white font-semibold` : 'text-gray-600 hover:bg-gray-200'"
            class="flex-1 py-1 transition-colors"
            :style="{ backgroundColor: selectedTab == 'delivery' ? outlet.primaryColor : '' }"
            @click="selectedTab = 'delivery'"
          >
            Delivery
            <span v-if="(selectedZoneDetails?.deliveryPromiseTime ?? 0) > 0">
              ({{ selectedZoneDetails.deliveryPromiseTime }} mins)
            </span>
          </button>
        </div>

        <!-- Phone & Name Row -->
        <div v-if="selectedTab" class="flex flex-wrap md:flex-nowrap items-center gap-1 relative w-full">
          <!-- Mobile Number -->
          <input
            v-model="phoneNumber"
            :disabled="selectedUser !== ''"
            type="tel"
            placeholder="Mobile No."
            pattern="[0-9]*"
            inputmode="numeric"
            class="border rounded px-2 py-1 text-xs outline-none focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-300 w-full md:w-[120px]"
            @input="phoneNumber = phoneNumber.replace(/\D/g, '')"
            @keyup.enter="fetchCustomerDetails(true)"
          />

          <!-- Customer Name -->
          <input
            v-model="name"
            type="text"
            :disabled="selectedUser !== ''"
            placeholder="Customer Name"
            class="border rounded px-2 py-1 text-xs outline-none focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-300 flex-1 min-w-0"
          />

          <!-- Search Button -->
          <VaButton
            v-if="!selectedUser"
            :style="{ '--va-background-color': outlet.primaryColor }"
            class="h-[24px] w-[24px] rounded-md flex items-center justify-center"
            size="small"
            icon="mso-search"
            @click.prevent="fetchCustomerDetails(false)"
          />
          <VaButton
            v-else
            color="danger"
            size="small"
            icon="mso-close"
            class="h-[24px] w-[24px] rounded-md flex items-center justify-center"
            @click.prevent="showConfirmRemove = true"
          />

          <!-- Add / Edit Button -->
          <template v-if="!selectedUser">
            <VaTooltip text="Add Customer" placement="top">
              <VaButton
                class="text-white h-[24px] w-[24px] rounded-md flex items-center justify-center"
                size="small"
                icon="mso-add"
                :style="{ '--va-background-color': outlet.primaryColor }"
                @click="openCustomerModal"
              />
            </VaTooltip>
          </template>

          <template v-else>
            <div class="flex items-center gap-1">
              <VaTooltip text="Edit Customer" placement="top">
                <VaButton
                  class="hover:bg-blue-600 text-white h-[24px] w-[24px] rounded-md flex items-center justify-center"
                  size="small"
                  icon="mso-edit"
                  :style="{ '--va-background-color': outlet.primaryColor }"
                  @click="openCustomerModal"
                />
              </VaTooltip>

              <!-- Order History Button -->
              <VaTooltip text="View Order History" placement="top">
                <VaButton
                  class="hover:bg-green-600 text-white h-[24px] w-[24px] rounded-md flex items-center justify-center"
                  size="small"
                  icon="mso-history"
                  :style="{ '--va-background-color': outlet.primaryColor }"
                  @click="showHistoryModal = true"
                />
              </VaTooltip>
            </div>
          </template>

          <!-- Suggestions -->
          <div v-if="userResults.length" id="userResults" class="user-results w-full absolute top-full left-0 mt-2">
            <ul ref="userList" class="divide divide-y-2 bg-white border rounded shadow w-full z-10">
              <li
                v-for="(user, index) in userResults"
                :key="user._id || user.id || user.ID || index"
                class="p-2 cursor-pointer hover:bg-blue-100"
                @click="selectUser(user)"
              >
                {{
                  user.Name ||
                  user.customerName ||
                  user.name ||
                  user.MobilePhone ||
                  user.Phone ||
                  user.phoneNo ||
                  user.phone ||
                  'Anonymous'
                }}
              </li>
            </ul>
          </div>

        </div>

        <div v-if="selectedTab && selectedUser" class="flex items-center gap-1 w-full">
          <div class="flex bg-gray-100 rounded overflow-hidden text-xs w-[60%]">
            <button
              :class="orderFor === 'current' ? ` text-white font-semibold` : 'text-gray-600 hover:bg-gray-200'"
              :style="{ backgroundColor: orderFor == 'current' ? outlet.primaryColor : '' }"
              class="w-1/2 py-1 px-1 transition-colors text-xs"
              @click="orderFor = 'current'"
            >
              Order Now
            </button>
            <button
              :class="orderFor === 'future' ? `text-white font-semibold` : 'text-gray-600 hover:bg-gray-200'"
              class="w-1/2 py-1 px-1 transition-colors text-xs"
              :style="{ backgroundColor: orderFor == 'future' ? outlet.primaryColor : '' }"
              @click="orderFor = 'future'"
            >
              Future Order
            </button>
          </div>

        <input
          v-model="localDateTime"
          type="datetime-local"
          class="text-xs border rounded px-1 py-1 w-[40%]"
          :disabled="orderFor === 'current'"
        />

        </div>

        <!-- Address -->
        <div v-if="selectedTab && selectedUser">
          <label class="text-xs text-gray-600 font-medium block mb-1">
            {{ selectedTab === 'takeaway' ? 'Location' : 'Address' }}
          </label>

          <div class="flex flex-wrap md:flex-nowrap items-center gap-1 relative w-full">
            <template v-if="selectedTab === 'takeaway'">
              <!-- <input
                type="text"
                :value="selectedZone || 'No Zone Selected'"
                disabled
                class="border rounded w-full px-1 py-1 text-xs bg-gray-100"
              />
              <VaButton
                class="hover:bg-blue-600 text-white h-[24px] w-[24px] rounded-md flex items-center justify-center"
                size="small"
                :style="{ '--va-background-color': outlet.primaryColor }"
                @click="showDeliveryDropdown = true"
              >
                {{ serviceZoneId || 'N/A' }}
              </VaButton> -->

              <!-- LOCATION FIELD (Takeaway Tab) -->
              <div class="relative flex items-center gap-1 w-full">
                <!-- Input-like clickable field -->
                <div
                  :class="[
                    'border rounded w-full px-2 py-[5px] text-xs flex items-center justify-between',
                    isLocationLocked 
                      ? 'bg-gray-100 cursor-not-allowed opacity-60' 
                      : 'bg-white cursor-pointer hover:bg-gray-50'
                  ]"
                  @click="!isLocationLocked && (showDeliveryDropdown = !showDeliveryDropdown)"
                >
                  <span>{{ selectedZone || 'Select Location' }}</span>
                  <!-- Unfilled / outlined arrow icon -->
                  <svg
                    class="w-3 h-3 text-gray-600 ml-1"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
                  </svg>
                </div>

                <!-- Disabled number button (aligned inline) -->
                <VaButton
                  class="text-white h-[28px] w-[28px] rounded-md flex items-center justify-center opacity-60 cursor-not-allowed"
                  size="small"
                  :style="{ '--va-background-color': outlet.primaryColor }"
                  disabled
                >
                  {{ serviceZoneId || 'N/A' }}
                </VaButton>

                <!-- Dropdown -->
                <div
                  v-if="showDeliveryDropdown && !isLocationLocked"
                  class="absolute left-0 top-full max-h-[300px] overflow-y-auto mt-1 w-full text-left bg-white border rounded shadow z-10"
                >
                  <ul ref="deliveryList" class="text-xs">
                    <li
                      v-for="(zone, index) in filteredDeliveryZones"
                      :key="index"
                      class="px-3 py-2 hover:bg-gray-100 cursor-pointer border border-b-1"
                      :class="{
                        'text-primary font-bold': selectedZone === zone.name,
                      }"
                      @click.prevent.stop="selectDeliveryZone(zone)"
                    >
                      {{ zone.serviceZoneId }} - {{ zone.name }}
                    </li>
                  </ul>
                </div>
              </div>
            </template>

            <!-- Address (Delivery tab) -->
            <template v-else>
              <VaSelect
                v-model="selectedAddress"
                close-on-change
                :options="filteredAddresses"
                track-by="value"
                searchable
                highlight-matched-text
                placeholder="Select address..."
                clearable
                class="h-[24px] w-[24px] min-w-[32px] flex items-center justify-center rounded-md p-0 text-xs mt-1"
                style="--va-select-dropdown-max-height: 100px"
              />

              <!-- Disable outlet/zone manual selection in Delivery -->
              <VaButton
                class="text-white h-[24px] w-[24px] rounded-md flex items-center justify-center opacity-60 cursor-not-allowed"
                size="small"
                :style="{ '--va-background-color': outlet.primaryColor }"
                :disabled="selectedTab === 'delivery'"
                @click.prevent
                title="Zone is auto-selected from address"
              >
                {{ serviceZoneId || 'N/A' }}
              </VaButton>
            </template>

            <!-- Delivery dropdown (shared) -->
            <div
              v-if="showDeliveryDropdown"
              class="absolute right-0 top-full max-h-[300px] overflow-y-auto mt-1 w-full text-left bg-white border rounded shadow z-10"
            >
              <ul ref="deliveryList" class="text-xs">
                <li
                  v-for="(zone, index) in filteredDeliveryZones"
                  :key="index"
                  class="px-3 py-2 hover:bg-gray-100 cursor-pointer border border-b-1"
                  :class="{
                    'text-primary font-bold': selectedZone === zone.name,
                  }"
                  @click.prevent.stop="selectDeliveryZone(zone)"
                >
                  {{ zone.serviceZoneId }} - {{ zone.name }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="selectedTab">
            <label class="text-xs text-gray-600 font-medium block mb-1">Notes</label>
            <VaTextarea
              v-model="orderStore.deliveryNotes"
              placeholder="Delivery notes e.g call on arrival, gate code, or takeaway instructions"
              autosize
              :autofocus="false"
              :min-rows="1"
              class="block !h-auto"
              style="width: calc(100% - 32px);"
              @input="autoGrow"
            />
        </div>
      </div>
    </Transition>
    <CustomerModal
      v-if="showCustomerModal"
      :selected-user="selectedUser"
      :user-name="name"
      :user-number="phoneNumber"
      :outlet="outlet"
      @setUser="setNewUser"
      @cancel="closeCustomerModal"
    />
    <ConfirmRemoveCustomerDetails
      v-model="showConfirmRemove"
      @confirm="onConfirmRemove"
      @close="closeConfirmRemoveModal"
    />
    <CustomerHistoryModal
      v-if="showHistoryModal"
      :customer="selectedUser"
      :outlet="outlet"
      :selected-user="selectedUser"
      :delivery-zone-options="deliveryZoneOptions"
      :takeaway-promise-time="selectedZoneDetails?.takeawayPromiseTime || 0"
      :delivery-promise-time="selectedZoneDetails?.deliveryPromiseTime || 0"
      :delivery-fee="selectedZoneDetails?.deliveryCharge || 0"
      :selected-tab="selectedTab"
      @close="showHistoryModal = false"
      @repeat-order="handleRepeatOrder"
    />
  </div>
</template>

<script setup>
import { ref, watch, defineEmits, computed, defineExpose, onMounted, onUnmounted, onBeforeUnmount } from 'vue'
import { useToast, useColors } from 'vuestic-ui'
import axios from 'axios'
import { useServiceStore } from '@/stores/services.ts'
import CustomerModal from '../modals/CustomerModal.vue'
import ConfirmRemoveCustomerDetails from '../modals/ConfirmRemoveCustomerDetails.vue'
import CustomerHistoryModal from '../modals/CustomerHistoryModal.vue'
import { useOrderStore } from '@/stores/order-store'
import { onClickOutside } from '@vueuse/core'
const props = defineProps(['forceRemount'])
const emits = defineEmits([
  'setTab',
  'setOpen',
  'setOrderType',
  'setCustomerDetailsId',
  'setDeliveryFee',
  'setDeliveryZone',
  'setDateSelected', 
])
const target = ref('userList')
const deliveryTarget = ref('deliveryList')
const isOpen = ref(true)
const selectedTab = ref('')
const isUserLoading = ref(false)
const selectedAddress = ref('')
const { init } = useToast()
const orderStore = useOrderStore()
const showCustomerModal = ref(false)
const serviceZoneId = ref('')
const phoneNumber = ref('')
const name = ref('')
const userResults = ref([])
const selectedUser = ref('')
const selectedZone = ref('')
const showDeliveryDropdown = ref(false)
const selectedZoneDetails = ref(null)
const orderFor = ref('current')
const showConfirmRemove = ref(false)
const showHistoryModal = ref(false)


watch(phoneNumber, (val) => {
  orderStore.setPhoneNumber(val)
})

watch(selectedAddress, (val) => {
  // Only update notes for delivery, not takeaway
  if (selectedTab.value === 'delivery' && val && val.deliveryNote) {
    orderStore.deliveryNotes = val.deliveryNote
  }
})

function handleRepeatOrder({ items, offersItems }) {
  // Clear existing cart items
  orderStore.cartItems = []
  orderStore.offerItems = []
  orderStore.cartTotal = null
  orderStore.editOrder = null
  orderStore.validation = null

  // Add new items
  if (items && items.length) {
    items.forEach((item) => {
      orderStore.addItemToCart(item)
      const newIndex = orderStore.cartItems.length - 1
      orderStore.calculateItemTotal(newIndex)
    })
  }

  // Add new offers
  if (offersItems && offersItems.length) {
    offersItems.forEach((offer) => {
      orderStore.offersAdded(offer)
    })
  }
}

function handleRemoveCustomer() {
  // Check if order has items
  if (orderStore.items && orderStore.items.length > 0) {
    showConfirmRemove.value = true
  } else {
    clearCustomerDetails()
  }
}

function clearCustomerDetails() {
  selectedUser.value = ''
  phoneNumber.value = ''
  name.value = ''
  userResults.value = []
  selectedAddress.value = ''
  selectedZone.value = ''
  serviceZoneId.value = ''
  selectedZoneDetails.value = null
  showDeliveryDropdown.value = false
  orderStore.deliveryNotes = ''
  emits('setCustomerDetailsId', '')
  emits('setDeliveryZone', false)
  emits('setOrderType', '')
}

function onConfirmRemove() {
  clearCustomerDetails()
}
function closeConfirmRemoveModal() {
  showConfirmRemove.value = false
}

onClickOutside(target, (event) => (userResults.value = []), { ignore: [deliveryTarget] })
onClickOutside(deliveryTarget, (event) => (showDeliveryDropdown.value = false), { ignore: [target] })

const localDateTime = ref('')
const selectedDate = ref(new Date())

const getLocalDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const updateTimeOnly = () => {
  localDateTime.value = getLocalDateTime()
}
// --- opening hours helpers ---
const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

function parseHHmm(hhmm) {
  // "11:00" -> {h:11,m:0}; tolerate "", null
  if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return null
  const [h, m] = hhmm.split(':').map((x) => Number(x))
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return { h, m }
}

function dateAtHM(baseDate, h, m) {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, m, 0, 0)
  return d
}

// in Customer Details
const FALLBACK_OPEN = { h: 11, m: 0 }
const FALLBACK_CLOSE = { h: 23, m: 0 }

function getOpenCloseFor(dt) {
  const ot = outlet.value?.openingTimes
  let opensStr = '', closesStr = ''

  if (ot) {
    if (ot.is24h) {
      const open = new Date(dt); open.setHours(0,0,0,0)
      const close = new Date(open); close.setDate(close.getDate() + 1)
      return { open, close }
    }
    if (ot.selected === 'byDay') {
      const key = dayNames[dt.getDay()]
      const rec = ot.byDay?.[key] || {}
      opensStr = rec.opens || ''
      closesStr = rec.closes || ''
    } else {
      opensStr = ot.daily?.opens || ''
      closesStr = ot.daily?.closes || ''
    }
  }

  const o = parseHHmm(opensStr) || FALLBACK_OPEN
  const c = parseHHmm(closesStr) || FALLBACK_CLOSE

  const open = dateAtHM(dt, o.h, o.m)
  let close = dateAtHM(dt, c.h, c.m)
  if (close <= open) { close = new Date(close.getTime()); close.setDate(close.getDate() + 1) }
  return { open, close }
}


function fmtForInput(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Clamp a target date to a given {open, close} window */
function clampToWindow(target, { open, close }) {
  if (target < open) return new Date(open)
  if (target > close) return new Date(close)
  return target
}
const dayMin = ref(null)
const dayMax = ref(null)

// 1) Let users pick ANY date/time; just emit + optional warning
watch(
  localDateTime,
  (val) => {
    if (!val || val.length < 16) return

    // Parse YYYY-MM-DDTHH:mm
    const [datePart, timePart] = val.split('T')
    const [y, m, d] = datePart.split('-').map(Number)
    const [hh, mm] = timePart.split(':').map(Number)
    const chosen = new Date(y, m - 1, d, hh, mm, 0, 0)

    // Set + emit immediately (do not modify the user's choice)
    selectedDate.value = chosen
    emits('setDateSelected', chosen)

    // For future orders, show a soft warning if outside opening hours
    if (orderFor.value === 'future') {
      const win = getOpenCloseFor(chosen)
      if (win) {
        const normalized = new Date(
          chosen.getFullYear(),
          chosen.getMonth(),
          chosen.getDate(),
          chosen.getHours(),
          chosen.getMinutes(),
          0, 0
        )
        const inWindow = normalized >= win.open && normalized < win.close
        
      }
    }
  },
  { immediate: false }
)


let timeInterval = null
const futureMin = computed(() => {
  if (orderFor.value !== 'future') return null
  const dt = selectedDate.value ?? new Date()
  const win = getOpenCloseFor(dt)
  if (!win) return null
  // If selecting today and we’re already past open, min should be now
  const now = new Date()
  const min = (dt.toDateString() === now.toDateString()) ? new Date(Math.max(now.getTime(), win.open.getTime())) : win.open
  return fmtForInput(min)
})

const futureMax = computed(() => {
  if (orderFor.value !== 'future') return null
  const dt = selectedDate.value ?? new Date()
  const win = getOpenCloseFor(dt)
  if (!win) return null
  return fmtForInput(win.close)
})

const startAutoUpdateTime = () => {
  stopAutoUpdateTime()
  updateTimeOnly()
  timeInterval = setInterval(() => {
    if (orderFor.value === 'current') {
      updateTimeOnly()
    }
  }, 1000)
}

const stopAutoUpdateTime = () => {
  if (timeInterval) {
    clearInterval(timeInterval)
    timeInterval = null
  }
}

watch(orderFor, (mode) => {
  orderStore.setOrderFor(mode)

  if (mode !== 'future') return

  // If outlet not loaded yet, don't clamp or flip back
  const ot = outlet.value && outlet.value.openingTimes
  if (!ot) return

  const dt = selectedDate.value ?? new Date()
  const win = getOpenCloseFor(dt)

  if (!win) {
    init({ color: 'danger', message: 'Selected day is closed. Please choose another day.' })
    return // don't force back to current; let user pick another date
  }

  const clamped = clampToWindow(dt, win)
  selectedDate.value = clamped
  localDateTime.value = fmtForInput(clamped)
})


onMounted(() => {
  if (orderFor.value === 'current') {
    startAutoUpdateTime()
  }
})
onBeforeUnmount(() => {
  stopAutoUpdateTime()
})

// onUnmounted(() => {
//   stopAutoUpdateTime()
// })

function openCustomerModal() {
  showCustomerModal.value = true
}
function closeCustomerModal() {
  showCustomerModal.value = false
}
async function fetchCustomerDetails(setUser = false) {
  userResults.value = []
  isUserLoading.value = true

  if (!phoneNumber.value && !name.value) {
    init({
      color: 'danger',
      message: 'Please provide name or phone number',
    })
    isUserLoading.value = false
    return
  } else {
    const servicesStore = useServiceStore()

    await axios
      .get(`${import.meta.env.VITE_API_BASE_URL}/winmax/entities`, {
        params: {
          outletId: servicesStore.selectedRest,
          ...(phoneNumber.value && { Phone: phoneNumber.value }),
          ...(name.value && { Name: name.value }),
        },
      })
      .then(async (response) => {
        if (response.status === 200) {
          const wm = response.data
          const wmList = Array.isArray(wm?.data) ? wm.data : []
          const winmaxNotFound = /not\s*found/i.test(String(wm?.message || '')) || wmList.length === 0

          if (!winmaxNotFound) {
            // Winmax HAS a match → check Stella for 'deliveryNote' and merge BEFORE mapping/selecting
            try {
               const stellaRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/customers/search`, {
                  params: {
                     outletId: servicesStore.selectedRest,
                     ...(phoneNumber.value && { phoneNo: phoneNumber.value }),
                     ...(name.value && { customerName: name.value }),
                  },
               })
               const hits = Array.isArray(stellaRes?.data?.data) ? stellaRes.data.data : []
               if (hits.length > 0) {
                  const stellaUser = hits[0] 
                  const stellaAddrs = Array.isArray(stellaUser.address) ? stellaUser.address : []

                  // Merge deliveryNote into Winmax list
                  wmList.forEach(u => {
                    if (u.OtherAddresses) {
                       u.OtherAddresses.forEach(wmAddr => {
                          const match = stellaAddrs.find(sa => 
                             (sa.designation || '').trim().toLowerCase() === (wmAddr.Designation || '').trim().toLowerCase()
                          )
                          if (match && match.deliveryNote) {
                             wmAddr.deliveryNote = match.deliveryNote
                          }
                       })
                    }
                  })
               }
            } catch (err) {
               console.warn("Failed to fetch Stella details for merging notes", err)
            }

            // Winmax HAS a match → use it
            if (!setUser) {
              userResults.value = wmList.map((user) => ({
                ...user,
                OtherAddresses: Array.isArray(user.OtherAddresses)
                  ? user.OtherAddresses.map((add) => ({
                      ...add,
                      Address: typeof add.Address === 'string' ? add.Address : '',
                      ZipCode:
                        (add.PostCode || add.postalCode || add.ZipCode)
                          ? (add.PostCode || add.postalCode || add.ZipCode)
                          : (add.Designation && (add.Designation.startsWith('Meet') || add.Designation.startsWith('M.P')))
                            ? '' // Meeting points may not have a zip
                            : (typeof add.Address === 'string' && add.Address.split(',').length > 1)
                              ? add.Address.split(',')[add.Address.split(',').length - 1].trim()
                              : '',
                      deliveryNote: add.deliveryNote || '', // ADD THIS
                    }))
                  : [],
              }))
            } else {
              selectUser(wmList[0])
            }
            return
          }

          // Winmax returned 200 + "Entity not found..." OR empty data → query Stella
          const stellaRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/customers/search`, {
            params: {
              outletId: servicesStore.selectedRest,
              ...(phoneNumber.value && { phoneNo: phoneNumber.value }),
              ...(name.value && { customerName: name.value }),
            },
          })

          const hits = Array.isArray(stellaRes?.data?.data) ? stellaRes.data.data : []
          if (hits.length) {
            userResults.value = hits.map((e) => ({
              ...e,
              Name: e.customerName,
              MobilePhone: e.phoneNo,
              OtherAddresses: (Array.isArray(e?.address) ? e.address : []).map((address) => ({
                Designation: address.designation,
                Address: [
                  address.aptNo,
                  address.floor,
                  address.streetName,
                  address.streetNo,
                  address.district,
                  address.city,
                  address.postalCode,
                ].filter(val => val && String(val).trim()).join(','),
                ZipCode: address.postalCode,
                Phone: '',
                Fax: '',
                Location: '',
                CountryCode: '',
                deliveryNote: address.deliveryNote || '',
              })),
            }))

            // If we need to auto-pick, prefer exact phone match
            if (setUser && userResults.value.length) {
              const norm = (s) => String(s || '').replace(/\D+/g, '')
              const wanted = norm(phoneNumber.value)
              const exact = userResults.value.find((u) => norm(u.MobilePhone || u.Phone) === wanted)
              selectUser(exact || userResults.value[0])
            }
          } else {
            // Neither Winmax nor Stella → open create modal
            openCustomerModal()
          }
        }
      })
      .catch(async () => {
        // If Winmax call errored (non-200), try Stella
        await axios
          .get(`${import.meta.env.VITE_API_BASE_URL}/customers/search`, {
            params: {
              outletId: servicesStore.selectedRest,
              ...(phoneNumber.value && { phoneNo: phoneNumber.value }),
              ...(name.value && { customerName: name.value }),
            },
          })
          .then((response) => {
            const arr = Array.isArray(response?.data?.data) ? response.data.data : []
            userResults.value = arr.map((e) => ({
              ...e,
              Name: e.customerName,
              MobilePhone: e.phoneNo,
              OtherAddresses: (Array.isArray(e?.address) ? e.address : []).map((address) => ({
                Designation: address.designation,
                Address: [
                  address.aptNo,
                  address.floor,
                  address.streetName,
                  address.streetNo,
                  address.district,
                  address.city,
                  address.postalCode,
                ].filter(val => val && String(val).trim()).join(','),
                ZipCode: address.postalCode,
                Phone: '',
                Fax: '',
                Location: '',
                CountryCode: '',
                deliveryNote: address.deliveryNote || '',
              })),
            }))
          })

        if (!userResults.value.length) {
          openCustomerModal()
        } else if (setUser) {
          const norm = (s) => String(s || '').replace(/\D+/g, '')
          const wanted = norm(phoneNumber.value)
          const exact = userResults.value.find((u) => norm(u.MobilePhone || u.Phone) === wanted)
          selectUser(exact || userResults.value[0])
        }
      })
      .finally(() => {
        isUserLoading.value = false
      })
  }
}

function setNewUser(payload) {
  phoneNumber.value = payload.phoneNumber
  name.value = payload.name
  fetchCustomerDetails(true)
}

function selectUser(user) {
  // normalize different payload shapes
  const normName =
    user['Name'] ??
    user['customerName'] ??
    user['name'] ??
    ''
  const normPhone =
    user['MobilePhone'] ??
    user['Phone'] ??
    user['phoneNo'] ??
    user['phone'] ??
    ''

  name.value = String(normName)
  phoneNumber.value = String(normPhone)

  selectedUser.value = {
    ...user,
    Name: normName,
    MobilePhone: normPhone,
    OtherAddresses: Array.isArray(user.OtherAddresses)
      ? user.OtherAddresses
      : Array.isArray(user.address)
        ? user.address.map((addr) => ({
            Designation: addr.designation,
            Address: [
              addr.aptNo,
              addr.floor,
              addr.streetName,
              addr.streetNo,
              addr.district,
              addr.city,
              addr.postalCode,
            ].filter(val => val && String(val).trim()).join(','),
            ZipCode: addr.postalCode,
            Phone: '',
            Fax: '',
            Location: '',
            CountryCode: '',
            deliveryNote: addr.deliveryNote || '', // ADD THIS
          }))
        : [],
  }

  userResults.value = []
    prefillNotesFromUser(selectedUser.value)

  // Auto-select location if phone number is 1-15
  autoSelectLocationForShortPhone()
}

// Auto-select location when phone number is 1-15 based on customer name
function autoSelectLocationForShortPhone() {
  const phone = String(phoneNumber.value || '').trim()
  const phoneNum = Number(phone)
  
  // Only apply for phone numbers 1-15
  if (phone.length <= 2 && phoneNum >= 1 && phoneNum <= 15) {
    // Wait for delivery zones to be loaded
    if (!deliveryZoneOptions.value.length) {
      // Zones not loaded yet, will be handled after they load
      return
    }
    
    // For now, always select Deftera (zone 15) for phone numbers 1-15
    const defteraZone = deliveryZoneOptions.value.find(zone => {
      return Number(zone.serviceZoneId) === 15
    })
    
    if (defteraZone) {
      selectDeliveryZone(defteraZone)
    }
  }
}



const deliveryZoneOptions = ref([])

// Check if location should be locked (for phone numbers 1-15)
const isLocationLocked = computed(() => {
  const phone = String(phoneNumber.value || '').trim()
  const phoneNum = Number(phone)
  return phone.length <= 2 && phoneNum >= 1 && phoneNum <= 15
})

// Filter delivery zones - for phone 1-15, show only Deftera (zone 15)
const filteredDeliveryZones = computed(() => {
  if (!deliveryZoneOptions.value.length) return []
  
  // For now, show only Deftera (zone 15) for ALL phone numbers
  return deliveryZoneOptions.value.filter(zone => {
    return Number(zone.serviceZoneId) === 15
  })
})

function selectDeliveryZone(zone) {
  if (zone) {
    emits('setDeliveryFee', selectedTab.value === 'takeaway' ? 0 : zone.deliveryCharge)
    emits('setDeliveryZone', true)
    orderStore.setDeliveryZone(zone)
    selectedZone.value = zone.name
    serviceZoneId.value = zone.serviceZoneId
    selectedZoneDetails.value = zone
    showDeliveryDropdown.value = false
  }
}


async function handleDeliveryZoneFetch() {
  const servicesStore = useServiceStore()
  if (deliveryZoneOptions.value.length) {
    return
  }
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/deliveryZones/${servicesStore.selectedRest}`)

    deliveryZoneOptions.value = response.data.data.sort((a, b) => {
      return Number(a.serviceZoneId) - Number(b.serviceZoneId)
    })

    // Auto-select location if phone is 1-15 and user is already selected
    if (selectedUser.value) {
      autoSelectLocationForShortPhone()
    }

    if (!response.data.data.length) {
      selectedZone.value = ''
      if (selectedTab.value === 'delivery') {
        serviceZoneId.value = ''
      }
      init({
        color: 'danger',
        message: 'No delivery zones found.',
      })
    }
  } catch (err) {
    console.log(err)
    selectedZone.value = ''
    if (selectedTab.value === 'delivery') {
      serviceZoneId.value = ''
    }
    init({
      color: 'danger',
      message: err?.response?.data?.message || 'Failed to fetch delivery zones.',
    })
  }
}
function prefillNotesFromUser(user) {
  // Only autofill notes for delivery orders, not takeaway
  if (selectedTab.value === 'takeaway') {
    return
  }
  
  const note = String(user?.customerNote || '').trim()
  if (note && !String(orderStore.deliveryNotes || '').trim()) {
    orderStore.deliveryNotes = note
  }
}
function getParsedAddress(payload) {
  const add = payload.split(',')

  let address = ''
  if (add[0]) {
    address += add[0] + (add[1] ? ',' : '')
  }
  if (add[1]) {
    address += add[1] + (add[2] ? ',' : '')
  }
  if (add[3]) {
    address += add[3] + (!add[2] && add[4] ? ',' : ' ')
  }
  if (add[2]) {
    address += add[2] + (add[4] ? ',' : ' ')
  }
  if (add[4]) {
    address += add[4] + (add[5] ? ',' : '')
  }
  if (add[5]) {
    address += add[5] + (add[6] ? ',' : '')
  }
  if (add[6]) {
    address += add[6]
  }
  if (address.includes(',')) return address
  else return ',' + address
}
function fromEditOrder(order) {
  if (!order) return
  // open & switch tab based on type (adjust keys if yours differ)
  isOpen.value = true
  selectedTab.value = /takeaway/i.test(order.orderType || order.type) ? 'takeaway' : 'delivery'

  // set identity
  phoneNumber.value = order.customerPhone || order.phone || ''
  name.value = order.customerName || order.name || ''

  // build a minimal Winmax-like "OtherAddresses" array so filteredAddresses works unchanged
  const fullAddr =
    order.deliveryAddress || order.address || order.delivery_address || '' // pick what you store
  const postal =
    order.postalCode || order.postCode || ''                               // optional, used for zone match
  const designation = order.addressDesignation || 'From order'

  selectedUser.value = {
    _id: order.customerDetailsId || order.customerId || undefined,
    customerName: name.value,
    phoneNo: phoneNumber.value,
    OtherAddresses: [
      {
        Designation: designation,
        Address: fullAddr,
        ZipCode: postal,
      },
    ],
  }

  // ensure the dropdown has a value right away
  // filteredAddresses already converts OtherAddresses -> {text,value,postalCode,fullAddress}
  // nextTick in case computed needs a tick
  setTimeout(() => {
    selectedAddress.value = filteredAddresses.value[0] || null
  })

  // set zone id label if you show it on the button
  serviceZoneId.value = order.deliveryZoneId || order.serviceZoneId || ''

  // emit to parent like the rest of your watchers do
  emits('setOrderType', selectedTab.value)
  emits('setCustomerDetailsId', selectedUser.value._id)
}

const outlet = computed(() => {
  const servicesStore = useServiceStore()
  return servicesStore.restDetails || {}
})

const filteredAddresses = computed(() => {
  let addresses = []
  if (selectedUser.value && selectedUser.value['OtherAddresses']) {
    addresses = selectedUser.value['OtherAddresses'].map((e) => {
      if (e.Designation && e.Designation.includes('Meeting')) {
        return {
          text: `${e.Designation ? e.Designation + ' - ' : ''} , ${e.ZipCode}`,
          value: `${e.Designation ? e.Designation + ' - ' : ''}, ${e.ZipCode}`,
          postalCode: e.ZipCode,
          fullAddress: e.Address || '',
          deliveryNote: e.deliveryNote || '', // Add this
        }
      } else {
        const addressArray = e.Address.split(',')
        const postalCodeFromStr = addressArray[addressArray.length - 1].trim()
        const postalCode = e.ZipCode || e.postalCode || e.postCode || postalCodeFromStr
        return {
          text: `${e.Designation ? e.Designation + ' - ' : ''}${getParsedAddress(e.Address)}`,
          value: `${e.Designation ? e.Designation + ' - ' : ''}${getParsedAddress(e.Address)}`,
          postalCode: postalCode,
          fullAddress: e.Address,
          deliveryNote: e.deliveryNote || '', 
        }
      }
    })
  }
  return addresses.filter((a) => !a.text.includes('00000'))
})

watch(
  () => selectedZoneDetails.value,
  (newVal, oldVal) => {
    if (newVal && oldVal && !selectedAddress.value) {
      selectedAddress.value = filteredAddresses.value.length ? filteredAddresses.value[0] : ''
    }
  },
)

watch(
  () => selectedUser.value,
  () => {
    if (selectedUser.value) {
      selectedAddress.value = null
      emits('setOrderType', selectedTab.value)
      handleDeliveryZoneFetch()
      emits('setCustomerDetailsId', selectedUser.value._id || selectedUser.value.id)
      userResults.value = []
    } else {
      selectedAddress.value = null
    }
  },
)


watch(
  () => selectedTab.value,
  () => {
    emits('setOrderType', selectedTab.value)
    emits('setTab', selectedTab.value)
    selectedZone.value = ''
    serviceZoneId.value = ''
    selectedZoneDetails.value = null
    selectedAddress.value = null

    if (selectedUser.value) {
      handleDeliveryZoneFetch()
    }
    emits('setCustomerDetailsId', selectedUser.value._id || selectedUser.value.id)
  },
)

watch(
  () => selectedAddress.value,
  async (newAddress) => {
    if (newAddress) {
      const postalCode = newAddress.postalCode
      const currentText = newAddress.text
      const fullAddress = newAddress.fullAddress

      // Update delivery notes from the selected address (only for delivery, not takeaway)
      if (selectedTab.value === 'delivery') {
        orderStore.deliveryNotes = newAddress.deliveryNote || ''
      }

      // Always fetch fresh delivery zones to ensure latest data
      await handleDeliveryZoneFetch()

      // Find matching zone based on postal code
      const matchingZone = deliveryZoneOptions.value.find((zone) =>
        zone.postalCodes.some((zoneCode) => String(zoneCode).trim() === String(postalCode).trim()),
      )
      // Check for meeting point match first
      const meetingPoints = deliveryZoneOptions.value
        .map((zone) => zone.meetingPoints?.find((mp) => currentText.includes(mp.designation)))
        .filter(Boolean)

      if (selectedTab.value === 'delivery') {
        const isMeetingPointAddress = currentText.includes('Meeting Point') || currentText.includes('M.P')
        
        let foundZone = null
        if (isMeetingPointAddress) {
          // 1. Try to find a meeting point match in our zones
          for (const zone of deliveryZoneOptions.value) {
            if (!zone.meetingPoints) continue
            // Simple check: does the address include the designation?
            // OR checks if fuzzy match (e.g. M.P - Laka...)
            const match = zone.meetingPoints.find(mp => {
               // Normal match
               if (currentText.includes(mp.designation)) return true
               
               // Abbreviation match: Meeting Point -> M.P with truncated middle part (same as CustomerModal logic)
               // Regex: /(Meeting\s*Point)(\s*-\s*)([^-]+)(.*)/i
               const abbr = mp.designation.replace(
                  /(Meeting\s*Point)(\s*-\s*)([^-]+)(.*)/i,
                  (_, _mp, sep, mid, rest) => `M.P${sep}${mid.trim().slice(0, 4)}${rest}`
               )

               // Remove spaces and case-insensitive check for fuzzier match
               // Check if currentText includes the abbr
               return currentText.toLowerCase().replace(/\s/g, '').includes(abbr.toLowerCase().replace(/\s/g, ''))
            })
            
            if (match) {
               // User request: "pass the id ... which is the delivy zone"
               // matched id: meeting-68482fb4...-0
               if (match.id && match.id.includes('-')) {
                 const extractedId = match.id.split('-')[1] // 68482fb4...
                 // Find zone by this ID if possible, or just use the current 'zone' iterate
                 // But ensuring we pick the zone defined by ID is safer if shared
                 foundZone = deliveryZoneOptions.value.find(z => z.restaurant_id === extractedId || z._id === extractedId || z.id === extractedId)
               }
               if (!foundZone) foundZone = zone
               break;
            }
          }
        }

        if (foundZone) {
            selectDeliveryZone(foundZone)
            orderStore.setDeliveryZone(foundZone)
            emits('setDeliveryZone', true)
            // Use the selected address's fullAddress, not a fallback
            orderStore.setAddress(fullAddress)
            return
        }

        if (matchingZone) {
          selectDeliveryZone(matchingZone)
          orderStore.setDeliveryZone(matchingZone)
          emits('setDeliveryZone', true)
          // Use the selected address's fullAddress, not a fallback
          orderStore.setAddress(fullAddress)
        } else {
          if (!currentText.includes('Meeting') && selectedTab.value === 'delivery') {
            init({
              color: 'danger',
              message: `No delivery zone found for postal code: ${postalCode}`,
            })
          }
          selectedZone.value = ''
          serviceZoneId.value = ''
          selectedZoneDetails.value = null
          emits('setDeliveryZone', false)
        }
      }
    }
  },
)

watch(
  () => props.forceRemount,
  () => {
    isOpen.value = true
    selectedTab.value = ''
    isUserLoading.value = false
    selectedAddress.value = ''
    phoneNumber.value = ''
    name.value = ''
    userResults.value = []
    selectedUser.value = ''
    selectedZone.value = ''
    showDeliveryDropdown.value = false
    selectedDate.value = new Date()
    showCustomerModal.value = false
    deliveryZoneOptions.value = []
    orderStore.deliveryNotes = ''
  },
)

watch(name, (newVal) => {
  if (!newVal.trim()) {
    userResults.value = []
  }
})

watch(orderFor, (newVal) => {
  orderStore.setOrderFor(newVal)
})

defineExpose({
  isOpen,
  fromEditOrder,

})
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.95);
}

.user-results {
  max-height: 200px;
  overflow-y: auto;
  width: 100%;
  top: 80%;
  position: absolute;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-top: 8px;
  margin-bottom: 16px;
  background: white;
  z-index: 50;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.datetime-display {
  background: #f1f5f9;
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-weight: 500;
  color: #475569;
  font-size: 12px;
  flex: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}
.va-input-wrapper .va-input-wrapper__fieldset .va-input-wrapper__container .va-input-wrapper__field {
  padding: 6px;
}
</style>
