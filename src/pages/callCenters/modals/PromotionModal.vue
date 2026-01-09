<template>
  <VaModal
    class="big-xl-modal !p-0"
    :model-value="true"
    :mobile-fullscreen="false"
    size="large"
    hide-default-actions
    close-button
    @update:modelValue="emits('cancel')"
  >
    <div class="p-2">
      <h4 class="va-h4 mb-4 text-gray-800">Available Codes</h4>

      <div v-if="sortedPromotions.length" class="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
        <template v-for="(promo, i) in sortedPromotions" :key="i">
          <template v-for="(code, j) in promo.codes" :key="`${i}-${j}`">
            <div
              class="flex items-center justify-between px-3 py-2 rounded-full shadow-sm cursor-pointer transition"
              :class="isSelected(code) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'"
              @click="toggleCode(code)"
            >
              <span class="text-sm truncate">
                <strong>{{ promo.name }}</strong> - {{ code }}
              </span>
              <div class="flex items-center gap-2">
                <VaIcon v-if="isSelected(code)" name="check" class="text-white" />
                <VaIcon
                  name="copy"
                  class="cursor-pointer opacity-80 hover:opacity-100"
                  @click.stop="copyToClipboard(code)"
                />
              </div>
            </div>
          </template>
        </template>
      </div>

      <div v-else class="text-center text-gray-500 py-6">No promotion codes available.</div>

      <!-- Footer actions -->
      <div class="mt-4 flex items-center justify-between gap-2">
        <div class="text-sm text-gray-600">
          <span v-if="selectedCodes.length">{{ selectedCodes.length }} selected</span>
          <span v-else>No code selected</span>
        </div>
        <div class="flex items-center gap-2">
          <VaButton
            preset="secondary"
            size="small"
            :disabled="!selectedCodes.length || apiLoading"
            @click="clearSelection"
          >
            Clear
          </VaButton>
          <VaButton
            color="primary"
            size="small"
            :loading="apiLoading"
            :disabled="!selectedCodes.length"
            @click="applySelectedCodes()"
          >
            Apply {{ selectedCodes.length > 1 ? selectedCodes.length + ' Codes' : 'Code' }}
          </VaButton>
        </div>
      </div>
    </div>
  </VaModal>
</template>

<script setup>
import { useToast } from 'vuestic-ui'
import { computed, ref, watch } from 'vue'
import { useOrderStore } from '@/stores/order-store'
import { useServiceStore } from '@/stores/services'

const emits = defineEmits(['cancel', 'select-code', 'select-codes'])
const { init } = useToast()

const props = defineProps({
  promotion: { type: Array, default: () => [] },
  customerDetailsId: { type: String, default: '' },
  orderType: { type: String, default: 'delivery' }, // 'delivery' | 'takeaway'
  deliveryFee: { type: Number, default: 0 },
  dateSelected: { type: String, default: new Date().toISOString() },
})

const apiLoading = ref(false)
const orderStore = useOrderStore()
const serviceStore = useServiceStore()
const orderFor = computed(() => orderStore.orderFor)

const selectedCodes = ref([]) // NEW: multiple codes

const sortedPromotions = computed(() =>
  [...props.promotion].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())),
)

function isSelected(code) {
  return selectedCodes.value.includes(code)
}

function toggleCode(code) {
  const idx = selectedCodes.value.indexOf(code)
  if (idx >= 0) selectedCodes.value.splice(idx, 1)
  else selectedCodes.value.push(code)
}

function clearSelection() {
  selectedCodes.value = []
}

function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => init({ message: 'Copied', color: 'success' }))
    .catch(() => init({ message: 'Copy failed.', color: 'danger' }))
}

// Build payload shared by single/multi
function buildPayload({ promoCodes }) {
  const menuItems = orderStore.cartItems.map((e) => ({
    menuItem: e.itemId,
    quantity: e.quantity,
    options: e.selectedOptions.flatMap((group) =>
      group.selected.map((option) => ({
        option: option.optionId,
        quantity: option.quantity,
      })),
    ),
  }))

  const offerMenuItems = orderStore.offerItems.map((offer) => ({
    offerId: offer.offerId,
    menuItems: offer.selections.flatMap((selection) =>
      selection.addedItems.map((item) => ({
        menuItem: item.itemId,
        quantity: item.quantity || 1,
        options:
          item.selectedOptions?.flatMap((group) =>
            group.selected.map((option) => ({
              option: option.optionId,
              quantity: option.quantity,
            })),
          ) || [],
      })),
    ),
  }))

  // Back-compat: if exactly one code, keep promoCode too
  const single = promoCodes.length === 1 ? promoCodes[0] : ''

  return {
    orderFor: orderFor.value,
    customerDetailId: props.customerDetailsId,
    orderType: props.orderType === 'takeaway' ? 'Takeaway' : 'Delivery',
    deliveryZoneId: orderStore.deliveryZone?._id,
    address: orderStore.address,
    menuItems,
    offerMenuItems,
    orderNotes: '',
    deliveryFee: props.deliveryFee,
    outletId: serviceStore.selectedRest,
    orderDateTime: new Date(props.dateSelected).toISOString(),
    paymentMode: '',
    promoCode: single, // <= keep for older API paths
    promoCodes, // <= NEW multi-code field
    hasOtherOffers: offerMenuItems.length,
  }
}

async function applySelectedCodes(hideToast = false) {
  if (!selectedCodes.value.length) return

  apiLoading.value = true
  try {
    const payload = buildPayload({ promoCodes: selectedCodes.value })
    const response = await orderStore.validatePromoCode(payload)

    if (response.data?.success) {
      if (!hideToast)
        init({ message: `Promotion${selectedCodes.value.length > 1 ? 's' : ''} applied`, color: 'success' })
      orderStore.setOrderTotal(response.data.data)

      // Emit both for compatibility; parent can listen to either
      if (selectedCodes.value.length === 1) {
        emits('select-code', selectedCodes.value[0])
      }
      emits('select-codes', [...selectedCodes.value])

      // Close after apply (same behavior as before)
      emits('cancel')
    } else {
      orderStore.setOrderTotal(null)
      init({ message: response.data?.message || 'Invalid promotion(s)', color: 'danger' })
    }
  } catch (err) {
    init({ message: err?.response?.data?.message || 'Promotion validation failed', color: 'danger' })
    console.error(err)
  } finally {
    apiLoading.value = false
  }
}

// Auto re-validate if cart/offer/type changes and we have a selection
watch(
  () => orderStore.cartItems,
  () => {
    if (selectedCodes.value.length) {
      orderStore.setOrderTotal(null)
      applySelectedCodes(true)
    }
  },
  { deep: true },
)

watch(
  () => orderStore.offerItems,
  () => {
    if (selectedCodes.value.length) {
      orderStore.setOrderTotal(null)
      applySelectedCodes(true)
    }
  },
  { deep: true },
)

watch(
  () => props.orderType,
  () => {
    if (selectedCodes.value.length) {
      orderStore.setOrderTotal(null)
      applySelectedCodes(true)
    }
  },
)
</script>
