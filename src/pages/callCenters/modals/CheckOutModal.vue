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
    <div class="grid grid-cols-1 md:grid-cols-3 h-full bg-gray-50">
      <!-- Order Summary -->
      <div class="md:col-span-1 flex flex-col">
        <div class="p-4 h-full flex flex-col">
          <h3 class="va-h3">Order Summary</h3>

          <div class="order-items order-items-wrapper overflow-y-auto flex-grow">
            <div v-for="(item, index) in orderStore.cartItems" :key="item.itemId" class="order-item">
              <div class="item-main">
                <div class="item-details">
                  <div class="flex-1 px-2">
                    <div class="flex justify-between items-center">
                      <span class="item-qty-name">{{ item.quantity }}x {{ item.itemName }}</span>
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
                          {{ option.name }}
                          <span v-if="option.price">(+€{{ (option.price * option.quantity).toFixed(2) }})</span>
                        </span>
                      </div>
                    </div>

                    <!-- Base Info -->
                    <p class="text-[11px] text-gray-500 mt-1 italic">
                      Base: €{{ item.basePrice.toFixed(2) }} + €{{ item.selectionTotalPrice.toFixed(2) }} * = €{{
                        item.totalPrice.toFixed(2) / item.quantity
                      }}
                      each
                    </p>
                  </div>
                </div>

                <div class="item-total-price">
                  <template v-if="promoTotal">
                    <template v-if="cartItemPromoDisplay(item, index).affected">
                      <span class="original-price">€{{ cartItemPromoDisplay(item, index).original.toFixed(2) }}</span>
                      <span class="updated-price">€{{ cartItemPromoDisplay(item, index).updated.toFixed(2) }}</span>
                    </template>
                    <template v-else>
                      <span class="font-semibold text-green-800">€{{ item.totalPrice.toFixed(2) }}</span>
                    </template>
                  </template>
                  <template v-else>
                    <span class="font-semibold text-green-800">€{{ item.totalPrice.toFixed(2) }}</span>
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
                              {{ option.name }}
                              <span v-if="option.price">(+€{{ (option.price * option.quantity).toFixed(2) }})</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="item-base-price">
                    Base price: €{{ item.price.toFixed(2) }} + €{{ item.selectionTotalPrice.toFixed(2) }} for addons
                  </div>
                </div>

                <div class="item-total-price">
                  <template v-if="offerPromoDisplay(item, index).affected">
                    <span class="original-price">€{{ offerPromoDisplay(item, index).original.toFixed(2) }}</span>
                    <span class="updated-price">€{{ offerPromoDisplay(item, index).updated.toFixed(2) }}</span>
                  </template>
                  <template v-else>
                    <span class="font-semibold text-green-800">€{{ item.totalPrice.toFixed(2) }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="summary-totals flex-shrink-0">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>€{{ subtotal.toFixed(2) }}</span>
            </div>
            <div v-if="orderType === 'delivery'" class="total-row">
              <span>Delivery Fee:</span>
              <span>€{{ deliveryFee.toFixed(2) }}</span>
            </div>
            <div v-if="promoTotal" class="total-row">
              <span>Total Discount:</span>
              <span>- €{{ (promoTotal.originalTotal - promoTotal.updatedTotal).toFixed(2) }}</span>
            </div>
            <div class="total-row total-final">
              <span v-if="orderStore.editOrder"
                >Total:
                <span class="text-green-600">PAID AMOUNT: €{{ orderStore.editOrder.editOrderTotal.toFixed(2) }}</span>
              </span>
              <span v-else>Total:</span>
              <span v-if="orderStore.editOrder">Balance €{{ getTotalPrice }}</span>
              <span v-else-if="!promoTotal">€{{ (totalAmount + deliveryFee).toFixed(2) }}</span>
              <span v-else>€{{ promoTotal.updatedTotal.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- Payment Section -->
      <div
        v-if="!redirectUrl"
        class="bg-white relative flex flex-col"
        :class="selectedPayment?.name?.toLowerCase() === 'cash' ? 'md:col-span-1 border-r border-gray-200' : 'md:col-span-2'"
      >
        <div v-if="apiLoading" class="absolute inset-0 z-50 flex items-center justify-center bg-white/50">
          <div class="loading-spinner !w-16 !h-16 border-4 !border-gray-300 !border-t-gray-600"></div>
        </div>
        <div class="header-container">
          <h3 class="va-h3">{{ etaTime }}</h3>
        </div>

        <div class="payment-content flex-grow overflow-y-auto">
          <div class="payment-options grid gap-2" :class="selectedPayment?.name?.toLowerCase() === 'cash' ? 'grid-cols-2' : 'sm:grid-cols-2'">
            <div
              v-for="payment in paymentTypes.filter((a) => userDetails.paymentType.includes(a.paymentTypeId))"
              :key="payment.paymentTypeId"
              class="payment-option transition-all"
              :class="[
                selectedPayment == payment ? 'selected' : '',
                selectedPayment?.name?.toLowerCase() === 'cash' ? 'p-2 flex flex-col items-center justify-center text-center' : 'p-3 sm:p-4'
              ]"
              @click="selectedPayment = payment"
            >
              <div class="payment-icon mb-1" :class="selectedPayment?.name?.toLowerCase() === 'cash' ? 'text-xl' : 'text-2xl'">{{ payment.name === 'Cash' ? '💵' : '💳' }}</div>
              <div class="payment-label font-semibold" :class="selectedPayment?.name?.toLowerCase() === 'cash' ? 'text-smLeading-tight' : 'text-base'">{{ payment.name }}</div>
              <div class="payment-desc text-xs text-gray-500 hidden sm:block" v-if="selectedPayment?.name?.toLowerCase() !== 'cash'">
                {{ payment.name === 'Cash' ? 'Pay with cash' : 'Secure payment' }}
              </div>
            </div>
          </div>
        </div>

        <div class="action-container p-4 border-t border-gray-200">
          <div class="flex flex-col gap-2 w-full justify-center">
            <button
               id="confirmBtn"
              :disabled="apiLoading || !selectedPayment"
              class="btn btn-primary w-full py-3"
              @click="orderStore.editOrder ? updateOrder() : createOrder()"
            >
              <span v-if="!apiLoading" id="btnText">
                {{ orderId && selectedPayment?.name.includes('Card') ? 'Retry' : 'Payment' }}
              </span>
              <div v-if="apiLoading" id="loadingSpinner" class="loading-spinner animate-spin"></div>
            </button>
             <button v-if="orderId" class="btn btn-flat-danger w-full py-2" :disabled="apiLoading" @click="cancelOrder()">
              Cancel
            </button>
          </div>
        </div>
      </div>

       <!-- CASH / KEYPAD SECTION (3rd Column) -->
      <div v-if="selectedPayment?.name?.toLowerCase() === 'cash'" class="md:col-span-1 flex flex-col bg-gray-50 border-l border-gray-200 h-full overflow-hidden">
        <div class="p-4 h-full flex flex-col">
            <!-- Display Screen -->
            <div class="bg-white p-3 rounded-lg border border-gray-300 mb-3 text-right shadow-inner">
               <div class="text-xs text-gray-500 mb-1">Cash Received</div>
               <div class="text-3xl font-bold text-gray-800">€ {{ (selectedCashAmount || 0).toFixed(2) }}</div>
               <div class="text-xs mt-1" :class="changeAmount >= 0 ? 'text-green-600' : 'text-red-600'">
                  Change: €{{ changeAmount.toFixed(2) }}
               </div>
            </div>

            <div class="flex flex-col gap-3 overflow-y-auto">
                <!-- Denominations -->
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="amount in cashDenominations"
                    :key="amount"
                    class="py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 font-bold text-gray-700 shadow-sm active:translate-y-0.5 transition-all text-lg"
                    @click="handleDenominationClick(amount)"
                  >
                    {{ amount.toFixed(2) }}
                  </button>
                </div>

                <!-- Keypad -->
                <div class="grid grid-cols-4 gap-2 mt-2">
                   <button v-for="n in ['7','8','9']" :key="n" class="key-btn bg-gray-200 hover:bg-gray-300" @click="handleKeypadInput(n)">{{ n }}</button>
                   <button class="key-btn bg-gray-400 hover:bg-gray-500 text-white" @click="handleKeypadInput('backspace')">
                      <span class="text-xl">⌫</span>
                   </button>
                   
                   <button v-for="n in ['4','5','6']" :key="n" class="key-btn bg-gray-200 hover:bg-gray-300" @click="handleKeypadInput(n)">{{ n }}</button>
                   <button class="key-btn bg-green-700 hover:bg-green-800 text-white row-span-2 flex items-center justify-center font-bold text-xl" @click="orderStore.editOrder ? updateOrder() : createOrder()">
                      ↵
                   </button>
                   
                   <button v-for="n in ['1','2','3']" :key="n" class="key-btn bg-gray-200 hover:bg-gray-300" @click="handleKeypadInput(n)">{{ n }}</button>
                   
                   <button class="key-btn bg-gray-200 hover:bg-gray-300 col-span-2" @click="handleKeypadInput('0')">0</button>
                   <button class="key-btn bg-gray-200 hover:bg-gray-300" @click="handleKeypadInput('.')">.</button>
                </div>
            </div>
        </div>
      </div>
      <div v-else class="col-span-2 flex flex-col bg-white h-full">
        <div class="flex-grow relative">
          <iframe :src="redirectUrl" width="100%" height="100%" class="border-none" />
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div class="loading-spinner !w-16 !h-16 border-4 !border-gray-300 !border-t-gray-600"></div>
          </div>
        </div>
        <div class="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <span class="text-sm text-gray-500 flex items-center gap-2">
            <div class="loading-spinner !border-gray-300 !border-t-gray-600"></div>
            Payment in progress...
          </span>
          <div class="flex gap-2">
            <button class="btn btn-flat-danger text-sm px-4 py-2" @click="cancelOrder()">Cancel Order</button>
            <button
              class="btn btn-secondary text-sm px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              @click="manualRetry()"
            >
              Try Another Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  </VaModal>
</template>
<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'vuestic-ui'
import { useOrderStore } from '@/stores/order-store'
import { useUsersStore } from '@/stores/users'
import { useServiceStore } from '@/stores/services'
import { storeToRefs } from 'pinia'
import { elements } from 'chart.js'
import axios from 'axios'

const showCheckoutModal = ref(true)
const selectedPayment: any = ref(null)
const apiLoading = ref(false)
const emits = defineEmits(['cancel'])
const { init } = useToast()
const props = defineProps<{
  deliveryFee: number
  customerDetailsId: string
  orderType: string
  dateSelected: string
  promoCode: string
  promoCodes?: string[]
}>()

const orderStore = useOrderStore()
const serviceStore = useServiceStore()
const userStore = useUsersStore()
const orderId: any = ref('')
const orderResponse: any = ref('')
const redirectUrl = computed(() => orderStore.redirectUrl)
const userDetails = computed(() => userStore.userDetails)
const checkInterval: any = ref('')
const paymentTypes: any = ref([])
const orderFor = computed(() => orderStore.orderFor)

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

const finalTotal = computed(() => {
  if (promoTotal.value) {
    return promoTotal.value.updatedTotal
  }
  return totalAmount.value + props.deliveryFee
})

const changeAmount = computed(() => {
  if (!selectedCashAmount.value) return 0
  return selectedCashAmount.value - finalTotal.value
})

const etaTime = computed(() => {
  const now = new Date()

  const selectedDate = new Date(props.dateSelected)

  const promiseTime =
    props.orderType === 'delivery'
      ? orderStore.deliveryZone?.deliveryPromiseTime
      : orderStore.deliveryZone?.takeawayPromiseTime

  const etaDate = new Date(selectedDate)
  etaDate.setMinutes(etaDate.getMinutes() + (promiseTime || 0))

  const timeString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const isFutureOrder = selectedDate.getTime() > now.getTime() + 30 * 60 * 1000

  const zoneName = orderStore.deliveryZone?.name ? `${orderStore.deliveryZone.name} - ` : ''

  if (isFutureOrder) {
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

onMounted(() => {
  if (serviceStore.selectedRest) {
    getPaymentOptions()
  }
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
    if (!val) emits('cancel')
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
    for (let i = 0; i < qty; i++) {
      arr.push({
        originalPrice: Number((line as any).originalPrice ?? 0),
        optionsPrice: Number((line as any).optionsPrice ?? 0),
        updatedPrice: Number((line as any).updatedPrice ?? 0),
        discount: Number((line as any).discount ?? 0),
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
function linePromoCart(item: any, idx: number) {
  if (!promoTotal.value) {
    return {
      hasAnyEffect: false,
      lineOriginal: item.totalPrice,
      lineUpdated: item.totalPrice,
      lineDiscount: 0,
      units: [] as any[],
    }
  }

  const id = (item.menuItemId as string) || (item.itemId as string)
  const allUnits = promoUnitsMap.value.get(id) || []

  // Count preceding units of the same itemId
  let precedingUnits = 0
  for (let i = 0; i < idx; i++) {
    const it = orderStore.cartItems[i]
    const itId = (it.menuItemId as string) || (it.itemId as string)
    if (itId === id) {
      precedingUnits += Number(it.quantity || 1)
    }
  }

  const start = precedingUnits
  const end = Math.min(start + Number(item.quantity || 1), allUnits.length)
  const units = allUnits.slice(start, end)

  if (!units.length) {
    return {
      hasAnyEffect: false,
      lineOriginal: item.totalPrice,
      lineUpdated: item.totalPrice,
      lineDiscount: 0,
      units,
    }
  }

  const lineOriginal = units.reduce((s, u) => s + (u.originalPrice + u.optionsPrice), 0)
  const lineUpdated = units.reduce((s, u) => s + u.updatedPrice, 0)
  const lineDiscount = units.reduce((s, u) => s + (u.isAffected ? u.discount : 0), 0)
  const hasAnyEffect = units.some((u) => u.isAffected)

  return {
    hasAnyEffect,
    lineOriginal,
    lineUpdated,
    lineDiscount,
    units,
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
        handlePaymentSuccess()
        return
      }

      if (responseData.status === 'Completed') {
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
      handlePaymentSuccess()
      return
    }

    if (status === 'Completed') {
      handlePaymentSuccess()
    } else if (status === 'In Progress') {
      if (isPolling) return
      // Payment flow finished (iframe returned) but status is still In Progress => Failed/Unpaid
      init({
        color: 'danger',
        message: 'Payment not completed. Please retry or cancel.',
      })
      orderStore.setPaymentLink('') // Hide iframe
      // UI will show "Retry Payment" because orderId exists
    } else if (status === 'Cancelled') {
      init({ color: 'warning', message: 'Order was cancelled.' })
      orderStore.setPaymentLink('')
      emits('cancel')
    }
  } catch (err: any) {
    console.error('Status check failed', err)
    init({ color: 'danger', message: 'Could not verify payment status.' })
    orderStore.setPaymentLink('')
  }
}

function handlePaymentSuccess() {
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
    window.location.reload()
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

function resetInter() {
  clearInterval(checkInterval.value)
}

async function cancelOrder() {
  if (!orderId.value) return
  resetInter() // Stop polling
  try {
    apiLoading.value = true
    // Use new cancel endpoint
    await orderStore.cancelOrder(orderId.value)

    init({ color: 'info', message: 'Order cancelled' })

    // Reset everything by reloading, similar to success flow
    setTimeout(() => {
      orderStore.cartItems = []
      window.location.reload()
    }, 800)
  } catch (e) {
    console.error(e)
    init({ color: 'danger', message: 'Failed to cancel order' })
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
      init({ color: 'warning', message: 'Payment not confirmed. You can try again.' })
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
})

async function updateOrder() {
  apiLoading.value = true
  const url = import.meta.env.VITE_API_BASE_URL
  const userStore = useUsersStore()
  const existingMenuItems: any[] = []
  const existingOffers: any[] = []
  orderStore.editOrder.menuItems.forEach((item: any) => {
    if (orderStore.cartItems.find((a: any) => a.itemId === item._id)) {
      existingMenuItems.push(item._id)
    }
  })

  orderStore.editOrder.offerDetails.forEach((item: any) => {
    if (orderStore.offerItems.find((a: any) => a._id === item.offerId)) {
      existingOffers.push(item)
    }
  })

  try {
    if (existingMenuItems.length) {
      await Promise.all(
        existingMenuItems.map((item) => {
          const data = {
            menuItems: [
              {
                menuItem: item,
                quantity: 1,
                options: (orderStore.editOrder.menuItems.find((m: any) => m._id === item)?.options || []).map(
                  (op: any) => ({
                    option: typeof op.option === 'string' ? op.option : String(op.option?._id),
                    quantity: Number(op.quantity ?? 1),
                  }),
                ),
              },
            ],
          }
          return applyOrderEdit(orderStore.editOrder._id, 'delete', orderStore.editOrder.tableNumber, data)
        }),
      )
    }

    // --- CHANGED: batch & dedupe offer deletes into ONE call ---
    if (existingOffers.length) {
      const uniq = Array.from(new Map(existingOffers.map((o: any) => [o.offerId, o])).values())
      const payload = {
        offerMenuItems: uniq.map((o: any) => ({ offerId: o.offerId, quantity: 1 })),
      }
      await applyOrderEdit(orderStore.editOrder._id, 'delete', orderStore.editOrder.tableNumber, payload)
    }
    // --- END CHANGE ---

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
    init({
      message: res.data.message,
      color: res.data.status !== 'Failed' ? 'success' : 'danger',
    })
    orderStore.editOrder = null as any
    try {
      orderStore.cartItems = [] as any
    } catch (e) {
      console.error(e)
    }
    window.location.reload()
    return res.data
  } catch (err: any) {
    console.error('Order edit failed:', err)
    init({ message: err.response.data.message, color: 'danger' })
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
    init({
      message: res.data.message,
      color: res.data.status !== 'Failed' ? 'success' : 'danger',
    })
    return res.data
  } catch (err: any) {
    console.error('Order edit failed:', err)
    init({ message: err.response.data.message, color: 'danger' })
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

  // De-dupe case-insensitively
  const seen = new Set()
  const out = []
  for (const c of codes) {
    const k = c.toLowerCase()
    if (!seen.has(k)) {
      seen.add(k)
      out.push(c)
    }
  }
  return out
}

async function createOrder() {
  apiLoading.value = true
  let menuItems: any[] = []
  menuItems = orderStore.cartItems.map((e: any) => {
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
  })

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

  try {
    const payload = {
      orderFor: orderFor.value,
      customerDetailId: props.customerDetailsId,
      orderType: props.orderType === 'takeaway' ? 'Takeaway' : 'Delivery',
      deliveryZoneId: orderStore.deliveryZone?._id,
      menuItems,
      deliveryNotes: orderStore.deliveryNotes || '',
      offerMenuItems,
      orderNotes: orderStore.orderNotes,
      deliveryFee: props.deliveryFee,
      outletId: serviceStore.selectedRest,
      orderDateTime: new Date(props.dateSelected).toISOString(),
      paymentMode: selectedPayment.value,
      address: sanitizeAddress(orderStore.address),
      phoneNo: orderStore.phoneNumber || '',
      ...(codes.length ? { promoCodes: codes } : {}),
      ...(codes.length === 1 ? { promoCode: codes[0] } : {}),
    }

    let response: any = ''
    if (orderId.value) {
      response = await orderStore.retryPayment(orderId.value, selectedPayment.value?.paymentTypeId)
    } else {
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
        } else {
          orderStore.setPaymentLink(response.data.data.redirectUrl)
          orderId.value = response.data.data.requestId
          setInter()
        }
      }
      // CASE 2: No Gateway (Cash, External Terminal) - Immediate Success
      else {
        if (orderFor.value === 'current') {
          init({ color: 'success', message: 'Order sent to Winmax' })
        }

        handlePaymentSuccess()
      }
    } else {
      throw new Error(response.data?.message || 'Something went wrong')
    }
  } catch (err: any) {
    // Build error message, including out of stock items if applicable
    let errorMessage = err.response?.data?.message || 'Order failed, please try again.'
    const errorData = err.response?.data
    
    // Check for OUT_OF_STOCK error and append item names
    if (errorData?.code === 'OUT_OF_STOCK' && Array.isArray(errorData?.outOfStockItems) && errorData.outOfStockItems.length) {
      errorMessage = `${errorMessage} Items: ${errorData.outOfStockItems.join(', ')}`
    }
    
    init({
      color: 'danger',
      message: errorMessage,
    })

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
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.order-items-wrapper {
  max-height: calc(100vh - 350px);
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
  font-size: 15px;
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

.header-container {
  background: #ffffff;
  border-bottom: 2px solid #e5e7eb;
  padding: 16px 32px;
  display: flex;
  justify-content: left;
  align-items: center;
  flex-shrink: 0;
}

.payment-content {
  flex: 1;
  padding: 28px 32px;
  overflow-y: auto;
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
  margin-bottom: 6px;
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

.payment-option.selected::after {
  content: '✓';
  position: absolute;
  top: 16px;
  right: 16px;
  background: #2d5d2a;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
}

.payment-option:hover {
  border-color: #2d5d2a;
  box-shadow: 0 4px 12px rgba(45, 93, 42, 0.1);
  transform: translateY(-2px);
}

.btn {
  padding: 16px 32px;
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
  padding: 24px 32px;
  border-top: 2px solid #e5e7eb;
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

.denomination-btn {
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

.denomination-btn:hover {
  border-color: #2d5d2a;
  background: #f0f7f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(45, 93, 42, 0.15);
}

.denomination-btn.selected {
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
  padding: 12px 4px; /* Reduced side padding, kept vertical reasonable */
  font-size: 18px; /* Slightly smaller font */
  font-weight: 600;
  color: #374151;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.1s ease;
  height: 50px; /* Fixed height to prevent stretching */
  display: flex;
  align-items: center;
  justify-content: center;
}

.key-btn:hover {
  background: #f9fafb;
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
</style>
