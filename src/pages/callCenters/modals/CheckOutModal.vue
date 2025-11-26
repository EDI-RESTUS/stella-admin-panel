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
                  <div v-if="item.selections?.length" class="item-extras">
                    <div v-for="(selection, sIndex) in item.selections" :key="sIndex" class="selection-group">
                      <div
                        v-for="(addedItem, aIndex) in selection.addedItems"
                        :key="`${addedItem.itemId}-${aIndex}`"
                        class="extra-item"
                      >
                        <div class="extra-name font-medium text-gray-800">+ {{ addedItem.itemName }}</div>
                        <div
                          v-if="addedItem.selectedOptions?.length"
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
                <template v-if="offerPromoDisplay(item).affected">
                  <span class="original-price">€{{ offerPromoDisplay(item).original.toFixed(2) }}</span>
                  <span class="updated-price">€{{ offerPromoDisplay(item).updated.toFixed(2) }}</span>
                </template>
                <template v-else>
                  <span class="font-semibold text-green-800">€{{ item.totalPrice.toFixed(2) }}</span>
                </template>
              </div>
              </div>

              <!-- Show selected items inside each offer -->
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
    <span v-if="orderStore.editOrder">Total:
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
      <div v-if="!redirectUrl" class="md:col-span-2 flex flex-col bg-white">
        <div class="header-container">
          <h3 class="va-h3">{{ etaTime }}</h3>
        </div>

        <div class="payment-content flex-grow">
          <div class="payment-options grid sm:grid-cols-2 gap-4">
            <div
              v-for="payment in paymentTypes.filter((a) => userDetails.paymentType.includes(a.paymentTypeId))"
              :key="payment.paymentTypeId"
              class="payment-option"
              :class="selectedPayment == payment ? 'selected' : ''"
              @click="selectedPayment = payment"
            >
              <div class="payment-icon">{{ payment.name === 'Cash' ? '💵' : '💳' }}</div>
              <div class="payment-label">{{ payment.name }}</div>
              <div class="payment-desc">
                {{ payment.name === 'Cash' ? 'Pay with cash on delivery or pickup' : 'Secure payment with Visa/Card' }}
              </div>
            </div>
          </div>
        </div>

        <div class="action-container">
          <button
            id="confirmBtn"
            :disabled="apiLoading || !selectedPayment"
            class="btn btn-primary"
            @click="orderStore.editOrder ? updateOrder() : createOrder()"
          >
            <span v-if="!apiLoading" id="btnText">
              {{ orderId && selectedPayment?.name.includes('Card') ? 'Retry Payment' : 'Payment' }}
            </span>
            <div v-if="apiLoading" id="loadingSpinner" class="loading-spinner animate-spin"></div>
          </button>
        </div>
      </div>
      <div v-else class="col-span-2 flex items-center bg-white">
        <iframe :src="redirectUrl" width="100%" height="100%" />
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
function setInter() {
  checkInterval.value = setInterval(() => {
    const iframe = document.querySelector('iframe')
    if (iframe && iframe.contentWindow) {
      try {
        const currentUrl = iframe.contentWindow.location.href
        if (currentUrl.includes('loader')) {
          checkPaymentStatus(orderId.value, selectedPayment.value.paymentTypeId)
          resetInter()
          apiLoading.value = false
        }
      } catch (e) {
        // Handle cross-origin errors silently
      }
    }
  }, 2000)
}
function resetInter() {
  clearInterval(checkInterval.value)
}
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
  const map = new Map<string, Array<{ originalPrice: number; optionsPrice: number; updatedPrice: number; discount: number; isAffected: boolean }>>()
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

async function checkPaymentStatus(requestId: string, paymentId: string) {
  const response = await orderStore.checkPaymentStatus(requestId, paymentId)
  if (response.data.data.status === 'Completed') {
    init({
      color: 'success',
      message: 'Payment Success',
    })
    if (orderFor.value === 'current') {
      try {
        await orderStore.sendOrderToWinmax(requestId, orderFor.value)
        init({
          color: 'success',
          message: 'Order sent to Winmax',
        })
        setTimeout(() => {
          orderStore.cartItems = []
          window.location.reload()
        }, 800)
      } catch (err: any) {
        init({
          color: 'danger',
          message: err.response.data.error,
        })
        orderStore.setPaymentLink('')
        orderResponse.value = ''
        orderId.value = ''
      }
    }
  } else {
    init({
      color: 'danger',
      message: response.data.message,
    })
    orderStore.setPaymentLink('')
  }
}

async function updateOrder() {
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

  try {
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
    orderStore.cartItems = [] as any
    window.location.reload()
    return res.data
  } catch (err: any) {
    console.error('Order edit failed:', err)
    init({ message: err.response.data.message, color: 'danger' })
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
  const updated  = Number(lp?.lineUpdated  ?? item.totalPrice ?? 0)
  const affected = !moneyEq(original, updated)
  return { affected, original, updated }
}

// Offer display: use promoOfferItemPrice(item) when it returns something different
function offerPromoDisplay(item: any) {
  const updatedMaybe = promoOfferItemPrice(item)
  const original = Number(item.totalPrice ?? 0)
  const updated  = updatedMaybe != null ? Number(updatedMaybe) : original
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
      .map(s => s.trim())
      .filter(Boolean)
  }

  // De-dupe case-insensitively
  const seen = new Set()
  const out = []
  for (const c of codes) {
    const k = c.toLowerCase()
    if (!seen.has(k)) { seen.add(k); out.push(c) }
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
      paymorderNotes: orderStore.orderNotes || '',
      address: sanitizeAddress(orderStore.address),
  ...(codes.length ? { promoCodes: codes } : {}),
  ...(codes.length === 1 ? { promoCode: codes[0] } : {}),
    }


    let response: any = ''
    if (orderId.value) {
      response = await orderStore.retryPayment(orderId.value)
    } else {
      orderResponse.value = await orderStore.createOrder(payload)
      response = await orderStore.createPayment({
        orderId: orderResponse.value.data.data._id,
        paymentTypeId: selectedPayment.value?.paymentTypeId,
      })
    }

    if (response.status === 201 || response.status === 200) {
      if (!orderId.value) {
        init({ color: 'success', message: 'Order created.' })
      }

      if (selectedPayment.value.paymentGateway) {
        orderStore.setPaymentLink(response.data.data.redirectUrl)
        orderId.value = response.data.data.requestId
        setInter()
      } else {
        try {
          if (orderFor.value === 'current') {
            await orderStore.sendOrderToWinmax(orderResponse.value.data.data._id, orderFor.value)
            init({
              color: 'success',
              message: 'Order sent to Winmax',
            })
          }
          setTimeout(() => {
            orderStore.cartItems = [] as any
            window.location.reload()
          }, 800)
        } catch (err: any) {
          init({
            color: 'danger',
            message: err.response.data.message,
          })
          orderStore.setPaymentLink('')
          orderResponse.value = ''
          orderId.value = ''
        }
      }
    } else {
      throw new Error(response.data?.message || 'Something went wrong')
    }
  } catch (err: any) {
    init({
      color: 'danger',
      message: err.response.data.message || 'Order failed, please try again.',
    })

    if (err?.response?.data?.data?.requestId) {
      orderId.value = err.response.data.data.requestId
    }

    orderStore.setPaymentLink('')
  } finally {
    apiLoading.value = false
  }
}

const promoOfferItemPrice = (item: any) => {
  if (!promoTotal.value || !item) return null

  const promoOffers = promoTotal.value.offerDetails || []

  const offerId = (item as any).offerId || (item as any).fullItem?.offerId

  const promo = promoOffers.filter((a: any) => a.offerId === offerId)
  // Get the minimum totalPrice from the list of promo
  const miniMumPrice = Math.min(...orderStore.offerItems.map((p: any) => Number(p.totalPrice)))
  if (!promo.length) return null
  const updated = Number(promo[0].totalPrice)
  if ((item as any).totalPrice === miniMumPrice) {
    return Number(updated.toFixed(2))
  }
  return null
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
  align-items: start;
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
</style>
