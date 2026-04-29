<template>
  <VaModal
    v-model="showCheckoutModal"
    no-dismiss
    class="big-xl-xl-modal"
    size="large"
    :mobile-fullscreen="false"
    hide-default-actions
    :close-button="!redirectUrl"
  >
    <div class="grid grid-cols-1 md:grid-cols-3 h-full min-h-0 bg-gray-50">
      <!-- Order Details -->
      <div class="md:col-span-1 flex flex-col h-full min-h-0">
        <div class="p-4 flex flex-col h-full min-h-0">
          <h3 class="va-h3">Order Details</h3>

          <div class="order-items order-items-wrapper overflow-y-auto flex-1 min-h-0 basis-0 h-0">
            <div v-for="(item, index) in orderStore.cartItems" :key="item.itemId" class="order-item">
              <div class="item-main">
                <div class="item-details">
                  <div class="flex-1 px-2">
                    <div class="flex justify-between items-center">
                      <span class="item-qty-name">{{ item.quantity }} x {{ item.itemName }}</span>
                    </div>

                    <!-- Options -->
                    <div class="flex flex-wrap gap-1 mt-1 text-xs">
                      <span
                        v-for="article in item.articleType"
                        :key="article"
                        class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                      >
                        {{ article }}
                      </span>
                      <div v-for="group in item.selectedOptions" :key="group.groupId">
                        <span
                          v-for="option in group.selected"
                          :key="option.optionId"
                          class="px-2 py-0.5 rounded-full"
                          :class="{
                            'bg-green-100 text-green-700': option.type.toLowerCase() === 'extra',
                            'bg-blue-100 text-blue-700': option.type.toLowerCase() === 'article',
                            'bg-red-100 text-red-700': option.type.toLowerCase() === 'hold',
                            'bg-amber-100 text-amber-700': option.type.toLowerCase() === 'modifier',
                          }"
                        >
                          <template v-if="(option.quantity || 1) > 1">{{ option.quantity }}× </template>{{ option.name }}
                          <span v-if="option.price">€{{ (option.price * (option.quantity || 1)).toFixed(2) }}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="item-total-price">
                  <template v-if="promoTotal">
                    <template v-if="cartItemPromoDisplay(item, index).affected">
                      <span class="original-price">{{ cartItemPromoDisplay(item, index).original.toFixed(2) }} € </span>
                      <span class="updated-price">{{ cartItemPromoDisplay(item, index).updated.toFixed(2) }} €</span>
                    </template>
                    <template v-else>
                      <span class="font-semibold text-green-800">{{ item.totalPrice.toFixed(2) }} €</span>
                    </template>
                  </template>
                  <template v-else>
                    <span class="font-semibold text-green-800">{{ item.totalPrice.toFixed(2) }} €</span>
                  </template>
                </div>
              </div>
            </div>

            <div v-for="(item, index) in orderStore.offerItems" :key="item.itemId" class="order-item">
              <div class="item-main">
                <div class="item-details">
                  <div class="item-qty-name">{{ item.name }}</div>
                  <div v-if="item.selections && item.selections.length" class="item-extras">
                    <div v-for="(selection, sIndex) in item.selections" :key="sIndex" class="selection-group">
                      <div
                        v-for="(addedItem, aIndex) in selection.addedItems"
                        :key="`${addedItem.itemId}-${aIndex}`"
                        class="extra-item"
                      >
                        <div class="extra-name font-medium text-gray-800">+ {{ addedItem.itemName }}</div>
                        <div
                          v-if="addedItem.selectedOptions && addedItem.selectedOptions.length"
                          class="pl-4 pt-1 text-xs text-gray-600 flex flex-wrap gap-1"
                        >
                          <div
                            v-for="group in [...addedItem.selectedOptions].sort((a, b) => {
                              if (a.groupName === 'SIZE') return -1
                              if (b.groupName === 'SIZE') return 1
                              if (a.groupName === 'CRUST') return b.groupName === 'SIZE' ? 1 : -1
                              if (b.groupName === 'CRUST') return a.groupName === 'SIZE' ? -1 : 1
                              return 0
                            })"
                            :key="group.groupId"
                          >
                            <span
                              v-for="option in group.selected"
                              :key="option.optionId"
                              class="px-2 py-0.5 rounded-full"
                              :class="{
                                'bg-green-100 text-green-700': option.type.toLowerCase() === 'extra',
                                'bg-blue-100 text-blue-700': option.type.toLowerCase() === 'article',
                                'bg-red-100 text-red-700': option.type.toLowerCase() === 'hold',
                                'bg-amber-100 text-amber-700': option.type.toLowerCase() === 'modifier',
                              }"
                            >
                              <template v-if="(option.quantity || 1) > 1">{{ option.quantity }}× </template>{{ option.name }}
                              <span v-if="option.price">(+€{{ (option.price * (option.quantity || 1)).toFixed(2) }})</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="item-total-price">
                  <template v-if="offerPromoDisplay(item, index).affected">
                    <span class="original-price">{{ offerPromoDisplay(item, index).original.toFixed(2) }} €</span>
                    <span class="updated-price">{{ offerPromoDisplay(item, index).updated.toFixed(2) }} €</span>
                  </template>
                  <template v-else>
                    <span class="font-semibold text-green-800">{{ item.totalPrice.toFixed(2) }} €</span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="summary-totals flex-none pt-3">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>{{ subtotal.toFixed(2) }} €</span>
            </div>

            <div v-if="orderType === 'delivery'" class="total-row">
              <span>Delivery Fee:</span>
              <span>{{ deliveryFee.toFixed(2) }} €</span>
            </div>

            <div v-if="promoTotal" class="total-row">
              <span class="text-red-600">Discount:</span>
              <span class="text-red-600"
                >- {{ (promoTotal.originalTotal - promoTotal.updatedTotal).toFixed(2) }} €</span
              >
            </div>

            <div v-if="orderStore.editOrder" class="total-row">
              <span class="text-gray-600">Paid Amount:</span>
              <span class="text-green-600 font-semibold">{{ paidAmount.toFixed(2) }} €</span>
            </div>

            <div class="total-row total-final !text-2xl">
              <span>Total:</span>
              <span>{{ currentEditedTotal.toFixed(2) }} €</span>
            </div>

            <div v-if="orderStore.editOrder" class="total-row text-sm">
              <span class="text-gray-600">Difference:</span>
              <span
                class="font-semibold"
                :class="editDifference > 0 ? 'text-red-600' : editDifference < 0 ? 'text-green-600' : 'text-gray-700'"
              >
                {{ editDifference.toFixed(2) }} €
              </span>
            </div>
          </div>
        </div>
      </div>
      <!-- Outlet & Type & Time -->
      <div v-if="!redirectUrl" class="relative flex flex-col md:col-span-2">
        <div v-if="apiLoading" class="absolute inset-0 z-50 flex items-center justify-center bg-white/50">
          <div class="loading-spinner !w-16 !h-16 border-4 !border-gray-300 !border-t-gray-600"></div>
        </div>
        <div class="pt-4">
          <h3 class="va-h3">{{ etaTime }}</h3>
        </div>

        <!-- Payment Types & Keypad -->
        <div class="flex-grow min-h-0 overflow-hidden pt-0 pr-4 pb-4">
          <div class="grid h-full min-h-0 grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Left pane: payment types -->
            <div class="flex flex-col h-full min-h-0">
              <!-- Card container like Order Items -->
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0">
                <div class="p-4 flex-1 min-h-0 overflow-y-auto">
                  <div class="payment-options grid gap-2 sm:grid-cols-2">
                    <div
                      v-for="payment in paymentTypes.filter((a) => userDetails.paymentType.includes(a.paymentTypeId))"
                      :key="payment.paymentTypeId"
                      class="payment-option transition-all p-4 flex items-center justify-center text-center"
                      :class="selectedPayment == payment ? 'selected' : ''"
                      @click="selectedPayment = payment; log('PAYMENT_METHOD_SELECTED', { paymentMethod: payment?.name || payment?.paymentTypeId })"
                    >
                      <div class="payment-label font-bold text-lg">{{ payment.name }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Payment button -->
              <div class="pt-4 flex flex-col gap-2">
                <button
                  id="confirmBtn"
                  :disabled="apiLoading || orderSubmitted || !selectedPayment"
                  class="btn btn-primary !w-full !min-w-0 py-2 !text-2xl"
                  @click="orderStore.editOrder ? updateOrder() : createOrder()"
                >
                  <span v-if="!apiLoading" id="btnText">Payment</span>
                  <div v-if="apiLoading" id="loadingSpinner" class="loading-spinner animate-spin"></div>
                </button>
                <button
                  v-if="canCancelExistingOrder"
                  :disabled="apiLoading"
                  class="btn !w-full !min-w-0 py-2 !text-lg !bg-red-600 hover:!bg-red-700 !text-white !border-red-600"
                  @click="confirmCancelOrder()"
                >
                  Cancel Order
                </button>
              </div>
            </div>

            <!-- Right pane -->
            <div
              class="p-4 gap-3 bg-white rounded-xl border border-gray-200 shadow-sm h-full min-h-0 overflow-hidden flex flex-col"
            >
              <div class="bg-white p-3 rounded-lg border border-gray-300 text-right shadow-inner">
                <div class="text-3xl font-bold text-gray-800">€ {{ (selectedCashAmount || 0).toFixed(2) }}</div>
                <div class="text-3xl mt-1" :class="changeAmount >= 0 ? 'text-green-600' : 'text-red-600'">
                  Change: € {{ changeAmount.toFixed(2) }}
                </div>
              </div>

              <div class="flex-1 min-h-0 flex flex-col gap-3">
                <!-- Denominations -->
                <div class="grid grid-cols-3 gap-2 flex-1 min-h-0 auto-rows-fr">
                  <button
                    v-for="amount in cashDenominations"
                    :key="amount"
                    class="py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 font-bold text-gray-700 shadow-sm active:translate-y-0.5 transition-all text-2xl h-full"
                    @click="handleDenominationClick(amount)"
                  >
                    {{ amount.toFixed(2) }}
                  </button>
                </div>

                <!-- Keypad -->
                <div class="grid grid-cols-3 gap-2 flex-[2] min-h-0 auto-rows-fr">
                  <button
                    v-for="n in ['7', '8', '9']"
                    :key="n"
                    class="key-btn bg-gray-200 hover:bg-gray-300 h-full"
                    @click="handleKeypadInput(n)"
                  >
                    {{ n }}
                  </button>
                  <button
                    v-for="n in ['4', '5', '6']"
                    :key="n"
                    class="key-btn bg-gray-200 hover:bg-gray-300 h-full"
                    @click="handleKeypadInput(n)"
                  >
                    {{ n }}
                  </button>
                  <button
                    v-for="n in ['1', '2', '3']"
                    :key="n"
                    class="key-btn bg-gray-200 hover:bg-gray-300 h-full"
                    @click="handleKeypadInput(n)"
                  >
                    {{ n }}
                  </button>

                  <button class="key-btn bg-gray-200 hover:bg-gray-300 h-full" @click="handleKeypadInput('0')">
                    0
                  </button>
                  <button class="key-btn bg-gray-200 hover:bg-gray-300 h-full" @click="handleKeypadInput('.')">
                    .
                  </button>
                  <button
                    class="key-btn bg-gray-400 hover:bg-gray-500 text-white h-full"
                    @click="handleKeypadInput('backspace')"
                  >
                    <span class="text-2xl">⌫</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SaferPay Iframe Section -->
      <div v-if="redirectUrl" class="col-span-2 flex flex-col bg-white h-full">
        <div class="flex-grow relative py-16">
          <iframe :src="redirectUrl" width="100%" height="100%" class="border-none" />
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-50"></div>
        </div>
        <div class="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <span class="text-sm text-gray-500 flex items-center gap-2"> </span>
          <div class="flex gap-2">
            <button
              class="btn btn-secondary text-sm px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              @click="manualRetry()"
            >
              Change Payment Type
            </button>
          </div>
        </div>
      </div>
    </div>
  </VaModal>
</template>
<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useToast, useModal } from 'vuestic-ui'
import { useOrderStore } from '@/stores/order-store'
import { useCallCenterAlert } from '@/composables/useCallCenterAlert'
import { useCallCenterLogger } from '@/composables/useCallCenterLogger'
import { useUsersStore } from '@/stores/users'
import { useServiceStore } from '@/stores/services'
import { storeToRefs } from 'pinia'
import { elements } from 'chart.js'
import axios from 'axios'

const showCheckoutModal = ref(true)
const selectedPayment: any = ref(null)
const apiLoading = ref(false)
const orderSubmitted = ref(false)
const emits = defineEmits(['cancel', 'success', 'view-history'])
const { init } = useToast()
const { confirm } = useModal()
const { showAlert } = useCallCenterAlert()
const { log, queueRefreshLog } = useCallCenterLogger()
const props = defineProps<{
  deliveryFee: number
  customerDetailsId: string
  orderType: string
  dateSelected: string
  promoCode: string
  promoCodes?: string[]
  existingOrderId?: string
}>()

const orderStore = useOrderStore()
const serviceStore = useServiceStore()
const userStore = useUsersStore()
const orderId: any = ref(props.existingOrderId || '')
const orderResponse: any = ref('')
const redirectUrl = computed(() => orderStore.redirectUrl)
const userDetails = computed(() => userStore.userDetails)
const checkInterval: any = ref('')
const paymentTypes: any = ref([])
const orderFor = computed(() => orderStore.orderFor)
const programmaticClose = ref(false)
const completedOrderData = ref<any>(null)

// Cash payment state
const selectedCashAmount = ref<number | null>(null)
const cashDenominations = [5.0, 10.0, 20.0, 50.0, 100.0, 200.0]
const manualCashString = ref('')

const handleKeypadInput = (input: string) => {
  if (input === 'backspace') {
    manualCashString.value = manualCashString.value.slice(0, -1)
  } else if (input === '.') {
    if (!manualCashString.value.includes('.')) {
      manualCashString.value += '.'
    }
  } else {
    // Prevent multiple leading zeros
    if (manualCashString.value === '0' && input === '0') return
    if (manualCashString.value === '0' && input !== '.') {
      manualCashString.value = input
    } else {
      manualCashString.value += input
    }
  }

  const val = parseFloat(manualCashString.value)
  selectedCashAmount.value = isNaN(val) ? 0 : val
}

const handleDenominationClick = (amount: number) => {
  selectedCashAmount.value = amount
  manualCashString.value = amount.toString()
}

const finalTotal = computed(() => currentEditedTotal.value)

function getSelectedDeliveryZoneId() {
  const zone = orderStore.deliveryZone
  if (!zone) return ''
  if (typeof zone === 'string') return zone
  return zone._id || zone.id || ''
}

const changeAmount = computed(() => {
  if (!selectedCashAmount.value) return 0
  return selectedCashAmount.value - finalTotal.value
})

const etaTime = computed(() => {
  const now = new Date()

  const parsedDate = props.dateSelected ? new Date(props.dateSelected) : new Date()
  const selectedDate = !isNaN(parsedDate.getTime()) ? parsedDate : new Date()

  const promiseTime =
    props.orderType === 'delivery'
      ? orderStore.deliveryZone?.deliveryPromiseTime
      : orderStore.deliveryZone?.takeawayPromiseTime

  const etaDate = new Date(selectedDate)
  etaDate.setMinutes(etaDate.getMinutes() + (promiseTime || 0))

  const timeString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

  const isScheduled = orderFor.value !== 'current'

  const isFutureOrder = selectedDate.getTime() > now.getTime() + 30 * 60 * 1000

  const showScheduledText = isScheduled || isFutureOrder

  const zoneName = orderStore.deliveryZone?.name ? `${orderStore.deliveryZone.name} - ` : ''

  if (showScheduledText) {
    const dateString = selectedDate.toLocaleDateString([], {
      day: 'numeric',

      month: 'short',

      year: 'numeric',
    })

    const scheduledTimeString = selectedDate.toLocaleTimeString([], {
      hour: '2-digit',

      minute: '2-digit',

      hour12: false,
    })

    return `${zoneName}${
      props.orderType === 'delivery' ? 'Delivery' : 'Takeaway'
    } - Scheduled for ${dateString} at ${scheduledTimeString}`
  } else {
    return `${zoneName}${props.orderType === 'delivery' ? 'Delivery - ETA' : 'Takeaway - Ready at'} ${timeString}`
  }
})

const getTotalPrice = computed(() => {
  const total = totalAmount.value + props.deliveryFee
  if (orderStore.editOrder) {
    if (promoTotal.value) {
      return (promoTotal.value.updatedTotal - orderStore.editOrder.editOrderTotal).toFixed(2) || 0
    } else {
      return (total - orderStore.editOrder.editOrderTotal).toFixed(2) || 0
    }
  }
  return total.toFixed(2)
})

function onBeforeUnload() {
  queueRefreshLog({ orderId: orderId.value || null, orderType: props.orderType })
}

onMounted(async () => {
  console.log('[CheckOutModal] Mounted. Cart items LEN:', orderStore.cartItems.length)
  console.log('[CheckOutModal] Mounted. Offer items LEN:', orderStore.offerItems.length)
  console.log('[CheckOutModal] Store ID ref:', orderStore.$id)

  if (serviceStore.selectedRest) {
    getPaymentOptions()
  }

  // Re-validate promo on open if codes are present but cartTotal was cleared (e.g. after failed payment redirect)
  const codes = (props.promoCodes?.length ? props.promoCodes : props.promoCode ? [props.promoCode] : [])
    .map((c) => c.trim()).filter(Boolean)

  if (codes.length && !orderStore.cartTotal) {
    try {
      const menuItems = orderStore.cartItems.map((e: any) => ({
        menuItem: e.itemId,
        quantity: e.quantity,
        options: e.selectedOptions.flatMap((g: any) =>
          g.selected.map((o: any) => ({ option: o.optionId, quantity: o.quantity })),
        ),
      }))
      const offerMenuItems = orderStore.offerItems.map((offer: any) => ({
        offerId: offer.offerId,
        menuItems: offer.selections.flatMap((s: any) =>
          s.addedItems.map((item: any) => ({
            menuItem: item.itemId,
            quantity: item.quantity || 1,
            options: (item.selectedOptions || []).flatMap((g: any) =>
              g.selected.map((o: any) => ({ option: o.optionId, quantity: o.quantity })),
            ),
          })),
        ),
      }))
      const dateVal = props.dateSelected ? new Date(props.dateSelected) : new Date()
      const orderDateTime = !isNaN(dateVal.getTime()) ? dateVal.toISOString() : new Date().toISOString()
      const single = codes.length === 1 ? codes[0] : null
      const payload: any = {
        orderFor: orderFor.value,
        customerDetailId: props.customerDetailsId,
        orderType: props.orderType === 'takeaway' ? 'Takeaway' : 'Delivery',
        deliveryZoneId: getSelectedDeliveryZoneId(),
        address: orderStore.address,
        menuItems,
        offerMenuItems,
        orderNotes: orderStore.orderNotes || '',
        deliveryFee: props.deliveryFee,
        outletId: serviceStore.selectedRest,
        orderDateTime,
        paymentMode: '',
        promoCodes: codes,
        hasOtherOffers: offerMenuItems.length,
        ...(single ? { promoCode: single } : {}),
      }
      const res = await orderStore.validatePromoCode(payload)
      if (res.data?.success) {
        orderStore.setOrderTotal(res.data.data)
      }
    } catch {
      // promo may have expired — leave cartTotal null, user sees normal prices
    }
  }

  window.addEventListener('beforeunload', onBeforeUnload)
})

const getPaymentOptions = () => {
  if (!serviceStore.selectedRest) return

  const url = import.meta.env.VITE_API_BASE_URL
  axios
    .get(`${url}/payments?outletId=${serviceStore.selectedRest}`)
    .then((response) => {
      paymentTypes.value = response.data.data.filter((a) => a.callCenter)
    })
    .catch((err) => {
      console.error('Failed to fetch payment options:', err)
    })
}

watch(
  () => showCheckoutModal.value,
  (val) => {
    if (!val) {
      if (!programmaticClose.value) {
        log('CHECKOUT_DISMISSED', { orderId: orderId.value || null, orderType: props.orderType })
      }
      programmaticClose.value = false
      emits('cancel')
    }
  },
  { immediate: true },
)

watch(
  () => serviceStore.selectedRest,
  (val) => {
    if (val) {
      getPaymentOptions()
    }
  },
  { immediate: true },
)

watch(
  () => props.existingOrderId,
  (val) => {
    if (val) orderId.value = val
  },
  { immediate: true },
)

const subtotal = computed(() => {
  return (
    orderStore.cartItems.reduce((acc, item) => acc + item.totalPrice, 0) +
    orderStore.offerItems.reduce((acc, item) => acc + item.price + item.selectionTotalPrice, 0)
  )
})

const promoTotal = computed(() => {
  return orderStore.cartTotal !== null ? orderStore.cartTotal : null
})

const totalAmount = computed(() => {
  return subtotal.value
})

/** ------------------ PER-LINE PROMO MAPPING (duplicates-safe) ------------------ */
/**
 * Expand validator response to per-unit arrays per menuItemId.
 * Each unit contains originalPrice, optionsPrice, updatedPrice, discount, isAffected.
 */
const promoUnitsMap = computed(() => {
  const map = new Map<
    string,
    Array<{ originalPrice: number; optionsPrice: number; updatedPrice: number; discount: number; isAffected: boolean }>
  >()
  const resp = promoTotal.value
  const lines = resp?.menuItems || []
  for (const line of lines) {
    const id = line.menuItemId as string
    const arr = map.get(id) ?? []
    const qty = Math.max(1, Number((line as any).quantity ?? 1))
    const perUnitOriginal = Number((line as any).originalPrice ?? 0) / qty
    const perUnitOptions = Number((line as any).optionsPrice ?? 0) / qty
    const perUnitUpdated = Number((line as any).updatedPrice ?? 0) / qty
    const perUnitDiscount = Number((line as any).discount ?? 0) / qty
    for (let i = 0; i < qty; i++) {
      arr.push({
        originalPrice: perUnitOriginal,
        optionsPrice: perUnitOptions,
        updatedPrice: perUnitUpdated,
        discount: perUnitDiscount,
        isAffected: Boolean((line as any).isAffected),
      })
    }
    map.set(id, arr)
  }
  return map
})

/**
 * For a given cart line at render index `idx`, compute which units from the promo map belong to it.
 * We sum quantities of same itemId before this index to find the correct slice (FIFO per itemId).
 */
function linePromoCart(item: any, _idx: number) {
  // Anchor lineOriginal to the cart's own truth so the strikethrough always matches
  // the line's actual total — independent of how the validator response splits
  // entries (per-unit vs per-line vs per-bundle), which has previously inflated the
  // strikethrough when a single cart line carries quantity > 1.
  const cartLineTotal = Number(item.totalPrice || 0)

  if (!promoTotal.value) {
    return {
      hasAnyEffect: false,
      lineOriginal: cartLineTotal,
      lineUpdated: cartLineTotal,
      lineDiscount: 0,
      units: [] as any[],
    }
  }

  const id = (item.menuItemId as string) || (item.itemId as string)
  const lines = ((promoTotal.value as any).menuItems || []).filter((l: any) => l.menuItemId === id)

  if (!lines.length) {
    return {
      hasAnyEffect: false,
      lineOriginal: cartLineTotal,
      lineUpdated: cartLineTotal,
      lineDiscount: 0,
      units: [] as any[],
    }
  }

  const totalOrigForId = lines.reduce(
    (s: number, l: any) => s + Number(l.originalPrice || 0) + Number(l.optionsPrice || 0),
    0,
  )
  const totalUpdForId = lines.reduce((s: number, l: any) => s + Number(l.updatedPrice || 0), 0)
  const totalDiscountForId = Math.max(0, totalOrigForId - totalUpdForId)
  const hasAnyAffected = lines.some((l: any) => !!l.isAffected) || totalDiscountForId > 0.005

  const totalCartQtyForId = (orderStore.cartItems as any[]).reduce((s, it) => {
    const itId = (it.menuItemId as string) || (it.itemId as string)
    return itId === id ? s + Number(it.quantity || 1) : s
  }, 0)
  const myShare = totalCartQtyForId > 0 ? Number(item.quantity || 1) / totalCartQtyForId : 1
  const lineDiscount = Math.min(cartLineTotal, Number((totalDiscountForId * myShare).toFixed(2)))
  const lineUpdated = Math.max(0, Number((cartLineTotal - lineDiscount).toFixed(2)))

  return {
    hasAnyEffect: hasAnyAffected && lineDiscount > 0.005,
    lineOriginal: cartLineTotal,
    lineUpdated,
    lineDiscount,
    units: [] as any[],
  }
}
/** ------------------------------------------------------------------------------ */

async function checkPaymentStatus(requestId: string, paymentId: string, isPolling = false) {
  // 1. Try standard payment verification (existing flow) - SKIP IF POLLING
  if (!isPolling) {
    try {
      const response = await orderStore.checkPaymentStatus(requestId, paymentId)
      console.log('Payment Verify Response:', response)

      const responseData = response.data?.data || response.data || {}
      console.log('Payment Verify Data:', responseData)

      // Explicit WalleePOS handling: Close and clean data without reload
      const gateway = responseData.gateway || ''
      const isWallee = /wallee/i.test(gateway)
      const isDeviceSuccess = responseData.raw?.kind === 'deviceSuccess'

      if ((isWallee || isDeviceSuccess) && responseData.status === 'Completed') {
        console.log('WalleePOS/Device Success Detected - Triggering Success Handler')
        completedOrderData.value = responseData.order || responseData
        handlePaymentSuccess()
        return
      }

      if (responseData.status === 'Completed') {
        completedOrderData.value = responseData.order || responseData
        handlePaymentSuccess()
        return
      }
    } catch (e) {
      // ignore error, proceed to check order status directly
    }
  }

  // 2. Fallback: check order status directly (new flow)
  try {
    // Prefer the original order ID if available (orderId.value might be payment request ID)
    const actualOrderId = orderResponse.value?.data?.data?._id || requestId
    const orderRes = await orderStore.getOrderStatus(actualOrderId)
    const responseData = orderRes.data?.data || orderRes.data || {}
    const status = responseData.status // "Completed" | "In Progress" | "Cancelled"

    // Explicit WalleePOS handling for GET response
    const gateway = responseData.gateway || ''
    const isWallee = /wallee/i.test(gateway)
    const isDeviceSuccess = responseData.raw?.kind === 'deviceSuccess'

    if ((isWallee || isDeviceSuccess) && status === 'Completed') {
      console.log('WalleePOS/Device Success Detected (GET) - Triggering Success Handler')
      completedOrderData.value = responseData
      handlePaymentSuccess()
      return
    }

    if (status === 'Completed') {
      completedOrderData.value = responseData
      handlePaymentSuccess()
    } else if (status === 'In Progress') {
      if (isPolling) return
      // Payment flow finished (iframe returned) but status is still In Progress => Failed/Unpaid
      showAlert('Payment not completed. Please retry or cancel.')
      orderStore.setPaymentLink('') // Hide iframe
      // UI will show "Retry Payment" because orderId exists
    } else if (status === 'Cancelled') {
      showAlert('Order was cancelled.')
      orderStore.setPaymentLink('')
      emits('cancel')
    }
  } catch (err: any) {
    console.error('Status check failed', err)
    log('ERROR_PAYMENT_STATUS_CHECK', { orderId: orderId.value, errorMessage: err?.message || 'Could not verify payment status.' })
    showAlert('Could not verify payment status.')
    orderStore.setPaymentLink('')
  }
}

function handlePaymentSuccess() {
  orderSubmitted.value = true
  log('ORDER_PLACED', {
    orderId: orderResponse.value?.data?.data?._id || orderId.value,
    tableNumber: completedOrderData.value?.tableNumber || orderStore.editOrder?.tableNumber || null,
    phoneNo: orderStore.phoneNumber || null,
    paymentRequestId: orderId.value,
    paymentMethod: selectedPayment.value?.name || selectedPayment.value?.paymentTypeId,
    orderType: props.orderType,
    success: true,
  })
  init({
    color: 'success',
    message: 'Payment Success',
  })

  if (orderFor.value === 'current') {
    init({
      color: 'success',
      message: 'Order sent to Winmax',
    })
  }

  setTimeout(() => {
    try {
      orderStore.cartItems = []
    } catch (e) {
      console.error('Error clearing cart', e)
    }
    programmaticClose.value = true
    emits('success')
    showCheckoutModal.value = false
  }, 800)
}

function setInter() {
  let iframeReturnDetected = false
  let lastRetryTime = 0
  const startTime = Date.now()

  checkInterval.value = setInterval(async () => {
    const iframe = document.querySelector('iframe')
    const elapsedSeconds = (Date.now() - startTime) / 1000
    const timeSinceLastRetry = (Date.now() - lastRetryTime) / 1000

    // After 8 seconds, try verification every 5 seconds until success
    if (elapsedSeconds > 8 && timeSinceLastRetry > 5 && !iframeReturnDetected) {
      console.log('[Payment Debug] Triggering automatic verification attempt...')
      lastRetryTime = Date.now()

      try {
        const response = await orderStore.retryPayment(orderId.value, selectedPayment.value.paymentTypeId)
        console.log('[Payment Debug] Auto-retry response:', response.status)

        if (response.status === 200 || response.status === 201) {
          const orderRes = await orderStore.getOrderStatus(orderId.value)
          console.log('[Payment Debug] Order status after auto-retry:', orderRes.data?.data?.status)

          if (orderRes.data?.data?.status === 'Completed') {
            console.log('[Payment Debug] Payment completed via auto-retry!')
            iframeReturnDetected = true
            resetInter()
            handlePaymentSuccess()
            return
          }
        }
      } catch (e) {
        console.error('[Payment Debug] Auto-retry failed:', e)
      }
    }

    // Try to detect if iframe has returned from payment gateway
    if (iframe && iframe.contentWindow && !iframeReturnDetected) {
      try {
        const currentUrl = iframe.contentWindow.location.href
        console.log('[Payment Debug] Iframe URL readable:', currentUrl)

        // IGNORE about:blank which means "not loaded yet" or "loading"
        if (currentUrl && currentUrl !== 'about:blank' && !currentUrl.startsWith('about:')) {
          // We are back on our domain!
          console.log('[Payment Debug] Iframe returned from gateway, triggering payment verification...')
          iframeReturnDetected = true

          // Trigger server-side payment verification (same as retry button)
          try {
            console.log('[Payment Debug] Calling retryPayment for orderId:', orderId.value)
            const response = await orderStore.retryPayment(orderId.value, selectedPayment.value.paymentTypeId)
            console.log('[Payment Debug] retryPayment response:', response.status, response.data)

            if (response.status === 200 || response.status === 201) {
              // Check if payment is now completed
              const orderRes = await orderStore.getOrderStatus(orderId.value)
              console.log('[Payment Debug] Order status:', orderRes.data?.data?.status)

              if (orderRes.data?.data?.status === 'Completed') {
                console.log('[Payment Debug] Payment completed! Triggering success handler...')
                resetInter()
                handlePaymentSuccess()
                return
              }
            }
          } catch (e) {
            console.error('[Payment Debug] Payment verification failed:', e)
          }
        }
      } catch (e) {
        // Cross-origin: still on gateway. Do nothing.
        // This is expected while user is on Saferpay
      }
    }

    // Continue polling status for all payment types
    if (orderId.value && selectedPayment.value) {
      checkPaymentStatus(orderId.value, selectedPayment.value.paymentTypeId, true)
    }
  }, 2000)
}
const editUntouchedTotals = computed(() => {
  if (!orderStore.editOrder) return { items: 0, offers: 0 }

  // Menu items: sum prices of original items that are NOT currently in the cart
  const originalMenuItems: any[] = orderStore.editOrder.menuItems || []
  const cartCountMap = new Map<string, number>()
  for (const c of orderStore.cartItems as any[]) {
    const id = String(c.itemId)
    cartCountMap.set(id, (cartCountMap.get(id) || 0) + 1)
  }
  const removedCountMap = new Map<string, number>()
  let itemsTotal = 0
  for (const item of originalMenuItems) {
    const menuItemId = String(item._id || (item.menuItem?._id ?? item.menuItem) || '')
    const allowed = cartCountMap.get(menuItemId) || 0
    const removed = removedCountMap.get(menuItemId) || 0
    if (allowed > 0 && removed < allowed) {
      removedCountMap.set(menuItemId, removed + 1)
    } else {
      itemsTotal += Number(item.totalPrice) || Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1)
    }
  }

  // Offers: sum prices of original offers not currently in the cart
  const originalOffers: any[] = orderStore.editOrder.offerDetails || []
  const cartOfferCountMap = new Map<string, number>()
  for (const o of orderStore.offerItems as any[]) {
    cartOfferCountMap.set(String(o.offerId), (cartOfferCountMap.get(String(o.offerId)) || 0) + 1)
  }
  const removedOfferCountMap = new Map<string, number>()
  let offersTotal = 0
  for (const offer of originalOffers) {
    const offerId = String(offer.offerId || offer._id)
    const allowed = cartOfferCountMap.get(offerId) || 0
    const removed = removedOfferCountMap.get(offerId) || 0
    if (allowed > 0 && removed < allowed) {
      removedOfferCountMap.set(offerId, removed + 1)
    } else {
      offersTotal += Number(offer.totalPrice || offer.price || 0)
    }
  }

  return { items: itemsTotal, offers: offersTotal }
})

const currentEditedTotal = computed(() => {
  const { items: untouchedItemsTotal, offers: untouchedOffersTotal } = editUntouchedTotals.value

  if (promoTotal.value) {
    // promoTotal.updatedTotal already includes delivery fee for the cart items.
    // Add untouched original items at their stored (already-discounted) prices.
    return Number((Number(promoTotal.value.updatedTotal || 0) + untouchedItemsTotal + untouchedOffersTotal).toFixed(2))
  }

  if (!orderStore.editOrder) {
    return Number(totalAmount.value + props.deliveryFee)
  }

  const effectiveDeliveryFee = Number(props.deliveryFee || orderStore.editOrder.deliveryFee || 0)
  return Number((totalAmount.value + untouchedItemsTotal + untouchedOffersTotal + effectiveDeliveryFee).toFixed(2))
})

const paidAmount = computed(() => {
  return Number(orderStore.editOrder?.editOrderTotal || 0)
})

const editDifference = computed(() => {
  return Number((currentEditedTotal.value - paidAmount.value).toFixed(2))
})
function resetInter() {
  clearInterval(checkInterval.value)
}

// Cancel button is shown when the modal is reopened with an existing order
// (e.g. after a failed Visa / Cash CC / SaferPay / Wallet redirect) and we're
// not in the edit-order flow. The order needs to be explicitly cancelled before
// abandoning, otherwise it stays open in the system.
const canCancelExistingOrder = computed(
  () => !!orderId.value && !orderStore.editOrder && !apiLoading.value && !orderSubmitted.value,
)

async function confirmCancelOrder() {
  const proceed = await confirm({
    title: 'Cancel order?',
    message: 'This will cancel order ' + (orderId.value || '') + '. This cannot be undone.',
    okText: 'Cancel Order',
    cancelText: 'Keep Order',
    size: 'small',
  })
  if (!proceed) return
  await cancelOrder()
}

async function cancelOrder() {
  if (!orderId.value) return
  resetInter() // Stop polling
  log('ORDER_CANCELLED', { orderId: orderId.value, orderType: props.orderType })
  try {
    apiLoading.value = true
    // Use new cancel endpoint
    await orderStore.cancelOrder(orderId.value)

    init({ color: 'info', message: 'Order cancelled' })

    // Reset everything by emitting event, similar to success flow
    setTimeout(() => {
      orderStore.cartItems = []
      programmaticClose.value = true
      emits('cancel')
      showCheckoutModal.value = false
    }, 800)
  } catch (e) {
    console.error(e)
    log('ERROR_CANCEL_ORDER', { orderId: orderId.value, errorMessage: e?.message || 'Failed to cancel order.' })
    showAlert('Failed to cancel order.')
  } finally {
    apiLoading.value = false
  }
}

async function manualRetry() {
  resetInter() // Stop polling so it doesn't auto-retry with new selection
  // Check status one last time in case it actually went through
  try {
    apiLoading.value = true
    const orderRes = await orderStore.getOrderStatus(orderId.value)
    const status = orderRes.data.data.status

    if (status === 'Completed') {
      handlePaymentSuccess()
      return
    } else {
      // If In Progress or Cancelled, just reset the view so they can try again
      showAlert('Payment not confirmed. You can try again.')
      orderStore.setPaymentLink('')
    }
  } catch (e) {
    // If check fails, just let them retry
    orderStore.setPaymentLink('')
  } finally {
    apiLoading.value = false
  }
}

onUnmounted(() => {
  resetInter()
  window.removeEventListener('beforeunload', onBeforeUnload)
})

async function updateOrder() {
  if (apiLoading.value || orderSubmitted.value) return
  apiLoading.value = true

  // --- Detect promo codes (from props OR original order) ---
  // If the user (re)selected codes via PromotionModal, trust that array verbatim —
  // duplicates matter for TXPY codes with size directives like "(XL+XL)", where each
  // engine application is capped to a single bundle, so [code,code,code] = 3 bundles.
  // Only fall back to the order's stored codes when nothing was reselected.
  const codes = normalizeCodes(props.promoCode, props.promoCodes)
  const editPromos =
    orderStore.editOrder.promoCodes || (orderStore.editOrder.promoCode ? [orderStore.editOrder.promoCode] : [])
  const allCodes = (codes.length ? codes : editPromos).filter(Boolean)
  const hasPromo = allCodes.length > 0

  if (hasPromo) {
    return await updateOrderWithPromo(allCodes)
  }

  // --- Existing non-promo edit flow (unchanged) ---
  const url = import.meta.env.VITE_API_BASE_URL
  const userStore = useUsersStore()
  const itemsToDelete: any = {
    menuItems: [],
    offerMenuItems: [],
  }

  orderStore.editOrder.menuItems.forEach((item: any) => {
    if (orderStore.cartItems.find((a: any) => a.itemId === item._id)) {
      itemsToDelete.menuItems.push({
        menuItem: item._id,
        quantity: 1,
        options: (item.options || []).map((op: any) => ({
          option: typeof op.option === 'string' ? op.option : String(op.option?._id),
          quantity: Number(op.quantity ?? 1),
        })),
      })
    }
  })

  const existingOffers = orderStore.editOrder.offerDetails.filter((item: any) =>
    orderStore.offerItems.find((a: any) => a._id === item.offerId),
  )
  if (existingOffers.length) {
    const uniq = Array.from(new Map(existingOffers.map((o: any) => [o.offerId, o])).values())
    itemsToDelete.offerMenuItems = uniq.map((o: any) => ({ offerId: o.offerId, quantity: 1 }))
  }

  try {
    if (itemsToDelete.menuItems.length || itemsToDelete.offerMenuItems.length) {
      await applyOrderEdit(orderStore.editOrder._id, 'delete', orderStore.editOrder.tableNumber, itemsToDelete)
    }

    const offerMenuItems = orderStore.offerItems.map((offer: any) => ({
      offerId: offer.offerId,
      menuItems: offer.selections.flatMap((selection: any) =>
        selection.addedItems.map((item: any) => ({
          menuItem: item.itemId,
          quantity: item.quantity || 1,
          options:
            item.selectedOptions?.flatMap((group: any) =>
              group.selected.map((option: any) => ({
                option: option.optionId,
                quantity: option.quantity,
              })),
            ) || [],
        })),
      ),
    }))

    const res = await axios.post(
      `${url}/order-edits/${orderStore.editOrder._id}/apply`,
      {
        action: 'add',
        tableNumber: orderStore.editOrder.tableNumber,

        menuItems: orderStore.cartItems.map((e: any) => {
          return {
            menuItem: e.itemId,
            quantity: e.quantity,
            options: e.selectedOptions.flatMap((group: any) =>
              group.selected.map((option: any) => ({
                option: option.optionId,
                quantity: option.quantity,
              })),
            ),
          }
        }),
        offerMenuItems,
      },
      {
        params: {
          orderId: orderStore.editOrder._id,
          tableNumber: orderStore.editOrder.tableNumber,
          posUser: userStore.userDetails.posCreds.posId || 'STELLA',
          posPass: userStore.userDetails.posCreds.posPassword || 'St3ll@',
        },
      },
    )
    if (res.data.status === 'Failed') {
      showAlert(res.data.message)
    } else {
      orderSubmitted.value = true
      init({ message: res.data.message, color: 'success' })
    }
    orderStore.editOrder = null as any
    try {
      orderStore.cartItems = [] as any
    } catch (e) {
      console.error(e)
    }
    emits('success')
    showCheckoutModal.value = false
    return res.data
  } catch (err: any) {
    console.error('Order edit failed:', err)
    showAlert(err.response.data.message)
    apiLoading.value = false
    throw err
  }
}

/**
 * Promo-aware edit: delete ALL original items/offers, then resend the
 * entire order via PATCH so the promo engine re-calculates on the full order.
 */
async function updateOrderWithPromo(promoCodes: string[]) {
  const userStore = useUsersStore()
  try {
    // 1. Cache original menu items before deleting
    const originalMenuItems = orderStore.editOrder.menuItems || []
    const cachedMenuItems = originalMenuItems.map((item: any) => ({
      menuItem: item._id,
      quantity: Number(item.quantity ?? 1),
      options: (item.options || []).map((op: any) => ({
        option: typeof op.option === 'string' ? op.option : String(op.option?._id),
        quantity: Number(op.quantity ?? 1),
      })),
    }))

    // Cache original offers before deleting
    const originalOffers = orderStore.editOrder.offerDetails || []
    const cachedOfferItems = originalOffers.map((od: any) => ({
      offerId: od.offerId,
      menuItems: (od.offerItems || []).map((oi: any) => ({
        menuItem: typeof oi.menuItem === 'string' ? oi.menuItem : String(oi.menuItem?._id || oi._id),
        quantity: Number(oi.quantity ?? 1),
        options: (oi.options || []).map((op: any) => ({
          option: typeof op.option === 'string' ? op.option : String(op.option?._id),
          quantity: Number(op.quantity ?? 1),
        })),
      })),
    }))

    // 2. Delete ALL original items and offers in ONE call
    const itemsToDelete: any = {
      menuItems: originalMenuItems.map((item: any) => ({
        menuItem: item._id,
        quantity: 1,
        options: (item.options || []).map((op: any) => ({
          option: typeof op.option === 'string' ? op.option : String(op.option?._id),
          quantity: Number(op.quantity ?? 1),
        })),
      })),
      offerMenuItems: [],
    }

    if (originalOffers.length) {
      const uniq = Array.from(new Map(originalOffers.map((o: any) => [o.offerId, o])).values())
      itemsToDelete.offerMenuItems = uniq.map((o: any) => ({ offerId: o.offerId, quantity: 1 }))
    }

    if (itemsToDelete.menuItems.length || itemsToDelete.offerMenuItems.length) {
      await applyOrderEdit(orderStore.editOrder._id, 'delete', orderStore.editOrder.tableNumber, itemsToDelete)
    }

    // 4. Build full order payload: cached original items + new cart items
    const newMenuItems = orderStore.cartItems.map((e: any) => ({
      menuItem: e.itemId,
      quantity: e.quantity,
      options: e.selectedOptions.flatMap((group: any) =>
        group.selected.map((option: any) => ({
          option: option.optionId,
          quantity: option.quantity,
        })),
      ),
    }))

    // Merge: remove from cache only as many as exist in cart (edited items), keep the rest
    const cartCountMap = new Map<string, number>()
    for (const c of orderStore.cartItems as any[]) {
      cartCountMap.set(c.itemId, (cartCountMap.get(c.itemId) || 0) + 1)
    }
    const removedCountMap = new Map<string, number>()
    const untouchedCachedItems = cachedMenuItems.filter((ci: any) => {
      const allowed = cartCountMap.get(ci.menuItem) || 0
      const removed = removedCountMap.get(ci.menuItem) || 0
      if (allowed > 0 && removed < allowed) {
        removedCountMap.set(ci.menuItem, removed + 1)
        return false // this one was edited, skip it
      }
      return true // keep untouched original
    })
    const menuItems = [...untouchedCachedItems, ...newMenuItems]

    const newOfferItems = orderStore.offerItems.map((offer: any) => ({
      offerId: offer.offerId,
      menuItems: offer.selections.flatMap((selection: any) =>
        selection.addedItems.map((item: any) => ({
          menuItem: item.itemId,
          quantity: item.quantity || 1,
          options:
            item.selectedOptions?.flatMap((group: any) =>
              group.selected.map((option: any) => ({
                option: option.optionId,
                quantity: option.quantity,
              })),
            ) || [],
        })),
      ),
    }))

    // Merge: count-based removal for offers too
    const cartOfferCountMap = new Map<string, number>()
    for (const o of orderStore.offerItems as any[]) {
      cartOfferCountMap.set(o.offerId, (cartOfferCountMap.get(o.offerId) || 0) + 1)
    }
    const removedOfferCountMap = new Map<string, number>()
    const untouchedCachedOffers = cachedOfferItems.filter((co: any) => {
      const allowed = cartOfferCountMap.get(co.offerId) || 0
      const removed = removedOfferCountMap.get(co.offerId) || 0
      if (allowed > 0 && removed < allowed) {
        removedOfferCountMap.set(co.offerId, removed + 1)
        return false
      }
      return true
    })
    const offerMenuItems = [...untouchedCachedOffers, ...newOfferItems]

    const dateVal = props.dateSelected ? new Date(props.dateSelected) : new Date()
    const orderDateTime = !isNaN(dateVal.getTime()) ? dateVal.toISOString() : new Date().toISOString()

    const pm = selectedPayment.value || ({} as any)
    const patchPayload: any = {
      orderFor: orderFor.value,
      customerDetailId: props.customerDetailsId,
      orderType: props.orderType === 'takeaway' ? 'Takeaway' : 'Delivery',
      deliveryZoneId: getSelectedDeliveryZoneId(),
      outletId: serviceStore.selectedRest,
      orderDateTime,
      phoneNo: orderStore.phoneNumber || '',
      address: sanitizeAddress(orderStore.address),
      deliveryNotes: orderStore.deliveryNotes || '',
      orderNotes: orderStore.orderNotes,
      deliveryFee: props.deliveryFee,
      paymentMode: {
        _id: pm._id,
        name: pm.name,
        paymentTypeId: pm.paymentTypeId,
        autoReceipt: pm.autoReceipt ?? false,
        receiptFormat: pm.receiptFormat ?? 'NONE',
      },
      menuItems,
      offerDetails: offerMenuItems,
      promoCodes,
    }
    if (promoCodes.length === 1) patchPayload.promoCode = promoCodes[0]

    // 4. PATCH the entire order
    const res = await orderStore.patchOrder(orderStore.editOrder._id, patchPayload)

    if (res.data?.status === 'Failed') {
      showAlert(res.data?.message || 'Order edit failed')
    } else {
      orderSubmitted.value = true
      init({ message: res.data?.message || 'Order updated with promo', color: 'success' })
    }
    orderStore.editOrder = null as any
    try {
      orderStore.cartItems = [] as any
    } catch (e) {
      console.error(e)
    }
    emits('success')
    showCheckoutModal.value = false
    return res.data
  } catch (err: any) {
    console.error('Order edit with promo failed:', err)
    showAlert(err.response?.data?.message || 'Order edit failed')
    apiLoading.value = false
    throw err
  }
}
function sanitizeAddress(raw?: string) {
  return (raw || '')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join(',')
}

const applyOrderEdit = async (orderId: string, action: string, tableNumber: string, payload: any = {}) => {
  const userStore = useUsersStore()
  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/order-edits/${orderId}/apply`,
      {
        action,
        tableNumber,
        ...payload,
      },
      {
        params: {
          orderId,
          tableNumber,
          posUser: userStore.userDetails.posCreds.posId || 'STELLA',
          posPass: userStore.userDetails.posCreds.posPassword || 'St3ll@',
        },
      },
    )
    if (res.data.status === 'Failed') {
      showAlert(res.data.message)
    } else {
      init({ message: res.data.message, color: 'success' })
    }
    return res.data
  } catch (err: any) {
    console.error('Order edit failed:', err)
    showAlert(err.response.data.message)
    throw err
  }
}
const promoOriginalItems = computed(() => {
  const v = promoTotal.value
  if (!v?.menuItems) return 0
  const n = v.menuItems.reduce(
    (sum: number, it: any) => sum + Number(it.originalPrice || 0) + Number(it.optionsPrice || 0),
    0,
  )
  return Number(n.toFixed(2))
})

const promoOriginalOffers = computed(() => {
  const v = promoTotal.value
  if (!v?.offerDetails?.length) return 0
  const n = v.offerDetails.reduce((sum: number, o: any) => sum + Number(o.basePrice || 0), 0)
  return Number(n.toFixed(2))
})

const itemsAfterPromos = computed(() => {
  const v = promoTotal.value
  if (!v?.menuItems) return 0
  const n = v.menuItems.reduce((sum: number, it: any) => sum + Number(it.updatedPrice || 0), 0)
  return Number(n.toFixed(2))
})
// Treat numbers as equal within half a cent
const moneyEq = (a: number, b: number) => Math.abs(Number(a) - Number(b)) < 0.005

// Menu item (cart) display: use validator slice for this line
function cartItemPromoDisplay(item: any, idx: number) {
  const lp = promoTotal.value ? linePromoCart(item, idx) : null
  const original = Number(lp?.lineOriginal ?? item.totalPrice ?? 0)
  const updated = Number(lp?.lineUpdated ?? item.totalPrice ?? 0)
  const affected = !moneyEq(original, updated)
  return { affected, original, updated }
}

// Offer display: use promoOfferItemPrice(item) when it returns something different
function offerPromoDisplay(item: any, index: number) {
  const updatedMaybe = promoOfferItemPrice(item, index)
  const original = Number(item.totalPrice ?? 0)
  const updated = updatedMaybe != null ? Number(updatedMaybe) : original
  const affected = updatedMaybe != null && !moneyEq(original, updated)
  return { affected, original, updated }
}

const offersAfterPromos = computed(() => {
  const v = promoTotal.value
  const n = Number(v?.updatedOffersTotal || 0)
  return Number(n.toFixed(2))
})
function normalizeCodes(singleStr, codesArr) {
  // Prefer provided array if non-empty
  let codes = Array.isArray(codesArr) && codesArr.length ? codesArr.slice() : []

  // Otherwise, parse the string: "P50, XL+1" -> ["P50","XL+1"]
  if (!codes.length && singleStr) {
    codes = singleStr
      .split(/[\s,;\n\r]+/g)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return codes
}

async function createOrder(force = false) {
  if (apiLoading.value || orderSubmitted.value) return
  log('PAYMENT_INITIATED', {
    paymentMethod: selectedPayment.value?.name || selectedPayment.value?.paymentTypeId,
    orderType: props.orderType,
    isEdit: !!orderStore.editOrder,
    force,
  })
  apiLoading.value = true

  try {
    let response: any = ''

    // ── Payment Retry path ──
    // When we already have an orderId (from a failed payment redirect),
    // skip building the full payload and just retry the payment.
    if (orderId.value) {
      console.log('[CheckOutModal] RETRY path — orderId:', orderId.value, 'paymentTypeId:', selectedPayment.value?.paymentTypeId)
      response = await orderStore.retryPayment(orderId.value, selectedPayment.value?.paymentTypeId)
    } else {
      // ── New Order path ──
      const menuItems = orderStore.cartItems.map((e: any) => ({
        menuItem: e.itemId,
        quantity: e.quantity,
        options: e.selectedOptions.flatMap((group: any) =>
          group.selected.map((option: any) => ({
            option: option.optionId,
            quantity: option.quantity,
          })),
        ),
      }))

      const offerMenuItems = orderStore.offerItems.map((offer: any) => ({
        offerId: offer.offerId,
        menuItems: offer.selections.flatMap((selection: any) =>
          selection.addedItems.map((item: any) => ({
            menuItem: item.itemId,
            quantity: item.quantity || 1,
            options:
              item.selectedOptions?.flatMap((group: any) =>
                group.selected.map((option: any) => ({
                  option: option.optionId,
                  quantity: option.quantity,
                })),
              ) || [],
          })),
        ),
      }))
      const codes = normalizeCodes(props.promoCode, props.promoCodes)

      const dateVal = props.dateSelected ? new Date(props.dateSelected) : new Date()
      const orderDateTime = !isNaN(dateVal.getTime()) ? dateVal.toISOString() : new Date().toISOString()

      // Shops 1-15: internal service-zone "customers" whose phone is just 1..15
      // (stored locally as "357" prefix + local "1".."15"). They routinely
      // place multiple orders in a short window, so force past the backend's
      // duplicate-order guard instead of prompting the operator.
      const isShop1to15 = (() => {
        const raw = String(orderStore.phoneNumber || '').replace(/\D/g, '')
        const local = raw.startsWith('357') ? raw.slice(3) : raw
        if (local.length === 0 || local.length > 2) return false
        const num = Number(local)
        return num >= 1 && num <= 15
      })()

      const payload = {
        orderFor: orderFor.value,
        customerDetailId: props.customerDetailsId,
        orderType: props.orderType === 'takeaway' ? 'Takeaway' : 'Delivery',
        deliveryZoneId: getSelectedDeliveryZoneId(),
        menuItems,
        deliveryNotes: orderStore.deliveryNotes || '',
        offerMenuItems,
        orderNotes: orderStore.orderNotes,
        deliveryFee: props.deliveryFee,
        outletId: serviceStore.selectedRest,
        orderDateTime,
        paymentMode: selectedPayment.value,
        address: sanitizeAddress(orderStore.address),
        phoneNo: orderStore.phoneNumber || '',
        ...(codes.length ? { promoCodes: codes } : {}),
        ...(codes.length === 1 ? { promoCode: codes[0] } : {}),
        ...(force || isShop1to15 ? { force: true } : {}),
      }

      orderResponse.value = await orderStore.createOrder(payload)
      response = await orderStore.createPayment({
        orderId: orderResponse.value.data.data._id,
        paymentTypeId: selectedPayment.value?.paymentTypeId,
      })
    }

    if (response.status === 201 || response.status === 200) {
      // CASE 1: Payment Gateway (e.g. Wallee) - Expects Iframe Interaction
      if (selectedPayment.value.paymentGateway) {
        if (!orderId.value) {
          init({ color: 'success', message: 'Order created.' })
        }

        // Immediate success check (e.g. test gateways or auto-capture)
        if (response.data.data.status === 'Completed') {
          handlePaymentSuccess()
        } else if (selectedPayment.value.paymentGateway === 'WalleePOS') {
          // WalleePOS failure/timeout: keep modal open on retry screen (no redirect).
          // Setting orderId.value causes the template to render the "Retry Payment" UI.
          const errMsg = response.data.data.errorMessage || 'Payment failed, please retry.'
          orderId.value =
            response.data.data.order?._id ||
            orderResponse.value?.data?.data?._id ||
            orderId.value
          log('ORDER_AWAITING_PAYMENT', {
            orderId: orderId.value,
            errorMessage: errMsg,
            paymentMethod: selectedPayment.value?.name || selectedPayment.value?.paymentTypeId,
            orderType: props.orderType,
          })
          showAlert(errMsg)
        } else {
          // orderStore.setPaymentLink(response.data.data.redirectUrl)
          orderId.value = response.data.data.requestId
          log('ORDER_AWAITING_PAYMENT', {
            orderId: orderResponse.value?.data?.data?._id,
            paymentRequestId: response.data.data.requestId,
            paymentMethod: selectedPayment.value?.name || selectedPayment.value?.paymentTypeId,
            orderType: props.orderType,
          })
          const deliveryZoneId = getSelectedDeliveryZoneId()
          // Save customer context so it can be restored on failed-payment return
          sessionStorage.setItem('cc_pending_customer', JSON.stringify({
            phone: orderStore.phoneNumber || '',
            customerName: orderStore.customerName || '',
            customerDetailId: props.customerDetailsId || '',
            deliveryZoneId,
            orderType: props.orderType || '',
            address: orderStore.address || '',
            deliveryNotes: orderStore.deliveryNotes || '',
          }))
          // Survive the gateway redirect so we can log the success-return on the
          // next page load, even if the success URL doesn't carry orderId in the query.
          // localStorage is preferred over sessionStorage because some browsers drop
          // sessionStorage on cross-origin redirects from payment gateways.
          // We also snapshot userId/userName/outletId here because the user/service
          // stores may not be populated yet when the redirected page mounts and tries
          // to post the log — passing them through avoids a 400 on /cc/logs.
          const pendingPaymentMarker = JSON.stringify({
            orderId: orderResponse.value?.data?.data?._id || null,
            paymentRequestId: response.data.data.requestId || null,
            paymentMethod: selectedPayment.value?.name || selectedPayment.value?.paymentTypeId || null,
            orderType: props.orderType || null,
            gateway: selectedPayment.value?.paymentGateway || 'Saferpay',
            startedAt: new Date().toISOString(),
            userId: userStore.userDetails?._id || null,
            userName: userStore.userDetails?.name || userStore.userDetails?.email || 'unknown',
            outletId: serviceStore.selectedRest || null,
            phoneNo: orderStore.phoneNumber || null,
          })
          try {
            localStorage.setItem('cc_pending_payment', pendingPaymentMarker)
          } catch {
            // ignore
          }
          try {
            sessionStorage.setItem('cc_pending_payment', pendingPaymentMarker)
          } catch {
            // ignore
          }
          // setInter()
          window.top.location.href = response.data.data.redirectUrl
        }
      }
      // CASE 2: No Gateway (Cash, External Terminal) - Immediate Success
      else {
        if (orderFor.value === 'current') {
          init({ color: 'success', message: 'Order sent to Winmax' })
        }

        completedOrderData.value = response?.data?.data || orderResponse.value?.data?.data || null
        handlePaymentSuccess()
      }
    } else {
      throw new Error(response.data?.message || 'Something went wrong')
    }
  } catch (err: any) {
    console.error('[CheckOutModal] Payment failed. Error details:', err)
    console.error('[CheckOutModal] Response data:', err.response?.data)

    // Build error message, including out of stock items if applicable
    let errorMessage = err.response?.data?.message || 'Order failed, please try again.'
    const errorData = err.response?.data

    // Check for OUT_OF_STOCK error and append item names
    if (
      errorData?.code === 'OUT_OF_STOCK' &&
      Array.isArray(errorData?.outOfStockItems) &&
      errorData.outOfStockItems.length
    ) {
      errorMessage = `${errorMessage} Items: ${errorData.outOfStockItems.join(', ')}`
    }

    // Possible duplicate order — backend safety net
    if (errorData?.code === 'DUPLICATE_ORDER_SUSPECTED') {
      log('ORDER_DUPLICATE_SUSPECTED', {
        kind: errorData.kind,
        match: errorData.match,
        paymentMethod: selectedPayment.value?.name || selectedPayment.value?.paymentTypeId,
        orderType: props.orderType,
      })

      const m = errorData.match || {}
      const isFuture = String(m.orderFor || '').toLowerCase() === 'future'
      const when = m.orderDateTime || m.createdAt
      const whenStr = when ? new Date(when).toLocaleString() : ''
      const totalStr = Number(m.total || 0).toFixed(2)
      const tableStr = m.tableNumber ? ` (table ${m.tableNumber})` : ''

      const message =
        `${errorData.message}\n\n` +
        `• ${isFuture ? 'Scheduled' : 'Placed'}: ${whenStr}\n` +
        `• Total: €${totalStr}${tableStr}\n` +
        `• Status: ${m.status || ''}\n\n` +
        `View the customer's order history, or proceed and place this order anyway?`

      apiLoading.value = false
      orderStore.setPaymentLink('')

      const proceed = await confirm({
        title: 'Possible duplicate order',
        message,
        okText: 'Proceed Anyway',
        cancelText: 'View History',
        size: 'medium',
      })

      if (proceed) {
        log('ORDER_DUPLICATE_PROCEED', { match: errorData.match })
        await createOrder(true)
      } else {
        log('ORDER_DUPLICATE_VIEW_HISTORY', { match: errorData.match })
        emits('view-history')
        emits('cancel')
      }
      return
    }

    log('ORDER_FAILED', {
      errorMessage,
      errorCode: err?.response?.data?.code || null,
      paymentMethod: selectedPayment.value?.name || selectedPayment.value?.paymentTypeId,
      orderType: props.orderType,
      success: false,
    })
    showAlert(errorMessage)

    if (err?.response?.data?.data?.requestId) {
      orderId.value = err.response.data.data.requestId
    }

    orderStore.setPaymentLink('')
  } finally {
    apiLoading.value = false
  }
}

const promoOfferItemPrice = (item: any, index: number) => {
  const v = promoTotal.value
  if (!v || !v.offerDetails || !v.offerDetails.length || !item) return null

  const offerId = item.offerId || (item.fullItem && item.fullItem.offerId)
  if (!offerId) return null

  // All validator entries for this offer type
  const matches = v.offerDetails.filter((o: any) => o.offerId === offerId)
  if (!matches.length) return null

  // Determine which occurrence THIS UI item is among same-offer items
  let seen = 0
  let occ = 0
  for (let i = 0; i < orderStore.offerItems.length; i++) {
    const it = orderStore.offerItems[i]
    const itOfferId = it.offerId || (it.fullItem && it.fullItem.offerId)
    if (itOfferId === offerId) {
      if (i === index) {
        occ = seen
        break
      }
      seen++
    }
  }

  // Pick corresponding validator entry (fallback to last if fewer entries)
  const picked = matches[Math.min(occ, matches.length - 1)]
  const updated = Number(picked && picked.totalPrice ? picked.totalPrice : 0)

  return Number(updated.toFixed(2))
}
</script>

<style scoped>
.order-items {
  margin-bottom: 1rem;
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.order-item {
  padding: 6px 0;
  border-bottom: 1px solid #f3f4f6;
}

.order-items-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.order-items::-webkit-scrollbar {
  width: 6px;
}

.order-items::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.item-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  /* margin-bottom: 12px; */
}

.item-extras {
  /* border-top: 1px solid #f3f4f6; */
  padding-top: 6px;
}

.item-details {
  flex: 1;
}

.item-qty-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.item-base-price {
  font-size: 12px;
  color: #6b7280;
  /* margin-bottom: 8px; */
}

.item-total-price {
  font-size: 18px;
  font-weight: 700;
  color: #2d5d2a;
}

.extra-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 3px 0;
  font-size: 14px;
}

.extra-name {
  color: #374151;
}

.extra-price {
  color: #2d5d2a;
  font-weight: 500;
}

.summary-title {
  font-size: 22px;
  font-weight: 600;
  color: #2d5d2a;
  margin-bottom: 20px;
}

.summary-totals {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 18px;
}

.total-row:not(:last-child) {
  border-bottom: 1px solid #f3f4f6;
}

.total-final {
  font-weight: 700;
  font-size: 20px;
  color: #2d5d2a;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 2px solid #2d5d2a;
}

/* payment section styling */
.payment-header {
  font-size: 22px;
  font-weight: 600;
  color: #2d5d2a;
  margin-bottom: 24px;
  text-align: left !important;
}

.payment-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.payment-section {
  flex: 1;
}

.payment-options {
  gap: 20px;
  margin-bottom: 32px;
  margin-top: 0;
}

.card-form {
  animation: slideDown 0.3s ease-out;
}

.payment-option {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  position: relative;
  background: white;
}

.payment-icon {
  font-size: 36px;
  margin-bottom: 16px;
  display: block;
}

.payment-label {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.payment-desc {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
}

.security-note {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
  font-size: 14px;
  color: #0369a1;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}

.form-group.card-number {
  flex: 2;
}

.form-group.quarter {
  flex: 1;
}

.form-group.half {
  flex: 4;
}

.form-label {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s ease;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #2d5d2a;
  box-shadow: 0 0 0 3px rgba(45, 93, 42, 0.1);
}

.form-group {
  flex: 1;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: white;
}

.checkbox.checked {
  background: #2d5d2a;
  border-color: #2d5d2a;
  color: white;
}

.checkbox-label {
  font-size: 15px;
  color: #374151;
  cursor: pointer;
}

.payment-option.selected {
  border-color: #2d5d2a;
  background: #f0f7f0;
  box-shadow: 0 4px 16px rgba(45, 93, 42, 0.2);
}

.payment-option:hover {
  border-color: #2d5d2a;
  box-shadow: 0 4px 12px rgba(45, 93, 42, 0.1);
  transform: translateY(-2px);
}

.btn {
  padding: 16px 32px;
  background: #2d5d2a;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: auto;
  min-width: 200px;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(45, 93, 42, 0.4);
}
.btn-primary {
  background: linear-gradient(135deg, #2d5d2a 0%, #1f4a1d 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(45, 93, 42, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(45, 93, 42, 0.4);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.modal-body-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
}

.action-container {
  background: #f9fafb;
  padding: 16px 32px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.va-modal__close {
  background: #f8f9fa;
  padding: 7px 10px;
  border-radius: 240px;
  font-size: 13px !important;
  height: 32px !important;

  margin-right: 10px;
  margin-top: 10px;

  @media (min-width: 640px) {
    margin-right: 20px;
    margin-top: 10px;
  }
}

:root {
  --va-modal-padding-top: 0rem;
  --va-modal-padding-right: 0rem;
  --va-modal-padding-bottom: 0rem;
  --va-modal-padding-left: 0rem;
}

:root .va-modal__message {
  margin-bottom: 0px !important;
}

/* Cash Denominations Section */
.cash-denominations-section {
  margin-top: 24px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
}

.denominations-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.denominations-btn {
  padding: 16px 12px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 18px;
  font-weight: 700;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.denominations-btn:hover {
  border-color: #2d5d2a;
  background: #f0f7f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(45, 93, 42, 0.15);
}

.denominations-btn.selected {
  border-color: #2d5d2a;
  background: linear-gradient(135deg, #2d5d2a 0%, #1f4a1d 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(45, 93, 42, 0.3);
}

.change-info {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.change-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 15px;
  color: #374151;
}

.change-row.total-change {
  border-top: 2px solid #e5e7eb;
  margin-top: 8px;
  padding-top: 12px;
  font-size: 16px;
}

/* Keypad Styles */
.keypad-container {
  background: white;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.keypad-display {
  background: #f3f4f6;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  text-align: right;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border: 2px solid transparent;
}

.keypad-display:focus-within {
  border-color: #2d5d2a;
}

.currency-symbol {
  color: #6b7280;
  margin-right: 4px;
  font-size: 20px;
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.key-btn {
  padding: 12px 4px;
  font-size: 24px;
  font-weight: 600;
  color: #ffffff;
  background: #1f4a1d;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.1s ease;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.key-btn:hover {
  background: #396137;
}

.key-btn:active {
  background: #e5e7eb;
  transform: translateY(1px);
}

.delete-btn {
  color: #dc2626;
  font-weight: bold;
}

.clear-btn {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fecaca;
  font-size: 16px;
  margin-top: 8px;
  height: 40px;
}

.clear-btn:hover {
  background: #fecaca;
}

/* Make VaModal default close button bigger + more visible */
.big-xl-xl-modal :deep(.va-modal__close-button),
.big-xl-xl-modal :deep(.va-modal__close),
.big-xl-xl-modal :deep(.va-modal__close-btn) {
  /* Bigger tap target */
  width: 48px;
  height: 48px;
  background: #bd3523;
  border-radius: 9999px;
  opacity: 1;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.big-xl-xl-modal :deep(.va-modal__close-button svg),
.big-xl-xl-modal :deep(.va-modal__close svg),
.big-xl-xl-modal :deep(.va-modal__close-btn svg),
.big-xl-xl-modal :deep(.va-icon) {
  width: 32px;
  height: 32px;
  color: #ffffff;
}

.big-xl-xl-modal :deep(.va-modal__close-button:hover),
.big-xl-xl-modal :deep(.va-modal__close:hover),
.big-xl-xl-modal :deep(.va-modal__close-btn:hover) {
  background: #e06752;
}
</style>
