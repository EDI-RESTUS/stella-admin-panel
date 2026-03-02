<template>
  <div class="w-full">
    <h2 class="font-semibold text-md text-gray-800 border-b pb-1">
      Order Details {{ orderStore.editOrder ? '(Edit - ' + orderStore.editOrder.tableNumber + ')' : '' }}
      <VaButton
        v-if="orderStore.editOrder"
        size="small"
        color="danger"
        class="text-white px-1 rounded-md text-xs shadow-md"
        @click="orderStore.resetEditOrder(), orderStore.setCartItems([])"
      >
        Remove Edit Order
      </VaButton>
    </h2>

    <template v-if="items.length || offersItems.length">
      <!-- Promo Code with Button -->
      <div v-if="!orderStore.editOrder" class="flex flex-wrap items-center gap-1 mt-3 mb-3 w-full">
        <VaInput
          v-model="promoCode"
          placeholder="Promotion Code"
          size="small"
          class="flex-1 min-w-[200px]"
          input-class="text-xs pr-6"
          @keypress.enter="applyPromoCode"
        >
          <template #appendInner>
            <VaIcon v-if="isPromoValid" name="close" color="danger" class="cursor-pointer" @click="clearPromoCode" />
          </template>
        </VaInput>

        <VaButton
          size="small"
          :style="{ '--va-background-color': outlet.primaryColor }"
          class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-2 py-1 rounded-md text-xs shadow-md"
          @click="openPromotionModal"
        >
          Select
        </VaButton>
      </div>
      <!-- Order Notes -->
      <div class="flex flex-wrap items-center gap-1 mt-3 mb-3 w-full">
        <VaTextarea
          v-model="orderStore.orderNotes"
          placeholder="Order notes (e.g., alergies)"
          autosize
          :min-rows="1"
          :max-rows="4"
          class="block !h-auto"
          style="width: calc(100% - 32px)"
        />
      </div>

      <!-- Scroll container (ONLY items/offers). Extra bottom pad so footer never covers content -->
      <div :style="orderItemsStyle" class="flex flex-col overflow-y-auto gap-2 pb-28">
        <!-- Order Items -->
        <div v-for="item in items" :key="item.id" class="mb-2 border-b pb-2 last:border-none">
          <div class="flex items-start justify-between">
            <!-- Qty controls -->
            <div class="flex items-center gap-2">
              <VaButton icon="mso-close" color="danger" size="small" class="rounded" @click="deleteItem(item)" />
              <VaButton
                icon="remove"
                :disabled="item.quantity === 1"
                :style="{ '--va-background-color': outlet.primaryColor }"
                size="small"
                class="rounded"
                @click="decreaseQty(item)"
              />
              <VaBadge :text="item.quantity" color="secondary" size="large" class="!py-1 !h-[2rem]" />
              <VaButton
                icon="add"
                :style="{ '--va-background-color': outlet.primaryColor }"
                size="small"
                class="rounded"
                @click="increaseQty(item)"
              />
            </div>

            <!-- Item Info -->
            <div class="flex-1 px-2">
              <div class="flex justify-between items-center">
                <span class="font-medium text-gray-800">{{ item.name }}</span>
                <VaIcon
                  name="edit"
                  size="small"
                  class="text-yellow-600 cursor-pointer"
                  @click="getMenuOptions(item.fullItem)"
                />
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
                <span
                  v-for="option in item.subItems"
                  :key="option"
                  class="px-2 py-0.5 rounded-full"
                  :class="{
                    'bg-green-100 text-green-700': option.type.toLowerCase() === 'extra',
                    'bg-blue-100 text-blue-700': option.type.toLowerCase() === 'article',
                    'bg-red-100 text-red-700': option.type.toLowerCase() === 'hold',
                    'bg-amber-100 text-amber-700': option.type.toLowerCase() === 'modifier',
                  }"
                >
                  {{ option.text }}
                </span>
              </div>

              <!-- Base Info -->
              <p class="text-[11px] text-gray-500 mt-1 italic">
                Base: €{{ item.basePrice.toFixed(2) }} + €{{ item.selectionTotalPrice.toFixed(2) }} = €{{
                  item.unitTotal.toFixed(2)
                }}
                each
              </p>
            </div>

            <!-- Item Total -->
            <div class="flex flex-col items-end">
              <template v-if="promoTotal">
                <template v-if="menuItemPromo(item).affected">
                  <span class="original-price">€{{ menuItemPromo(item).original.toFixed(2) }}</span>
                  <span class="updated-price">€{{ menuItemPromo(item).updated.toFixed(2) }}</span>
                </template>
                <template v-else>
                  <span class="font-semibold text-green-800">€{{ item.total.toFixed(2) }}</span>
                </template>
              </template>
              <template v-else>
                <span class="font-semibold text-green-800">€{{ item.total.toFixed(2) }}</span>
              </template>
            </div>
          </div>
        </div>

        <!-- Offers -->
        <div v-for="(item, index) in offersItems" :key="item.id" class="mb-2 border-b pb-2 last:border-none">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <VaButton icon="mso-close" color="danger" size="small" class="rounded" @click="deleteOffer(item)" />
            </div>

            <div class="flex-1 px-2">
              <div class="flex justify-between items-center">
                <span class="font-medium text-gray-800">
                  {{ item.name }}
                  <span class="font-semibold text-gray-700 mb-1 mt-2">
                    <span v-if="Number(item.basePrice) > 0" class="text-xs font-normal text-gray-500">
                      (€{{ Number(item.basePrice).toFixed(2) }})
                    </span>
                  </span>
                </span>

                <VaIcon
                  name="edit"
                  size="small"
                  class="text-yellow-600 cursor-pointer"
                  @click="getOfferItems({ ...item.fullItem, index: index })"
                />
              </div>

              <div class="divide-y">
                <div v-for="selectedArticle in item.items" :key="selectedArticle.itemName" class="mt-2 text-xs">
                  <p class="font-semibold text-gray-800 mt-1 flex items-center gap-2">
                    <span class="mb-1">{{ selectedArticle.itemName }}</span>
                    <span v-if="Number(selectedArticle.basePrice) > 0" class="text-xs font-normal text-gray-500">
                      (€{{ Number(selectedArticle.basePrice).toFixed(2) }})
                    </span>
                  </p>

                  <div class="flex flex-wrap gap-1 text-xs">
                    <span
                      v-for="option in [...selectedArticle.selectedOptions]
                        .sort((a, b) => {
                          if (a.groupName === 'SIZE') return -1
                          if (b.groupName === 'SIZE') return 1
                          if (a.groupName === 'CRUST') return b.groupName === 'SIZE' ? 1 : -1
                          if (b.groupName === 'CRUST') return a.groupName === 'SIZE' ? -1 : 1
                          return 0
                        })
                        .flatMap((a) => a.selected)"
                      :key="option.name + option.type"
                      class="px-2 py-0.5 rounded-full"
                      :class="{
                        'bg-green-100 text-green-700': option.type.toLowerCase() === 'extra',
                        'bg-blue-100 text-blue-700': option.type.toLowerCase() === 'article',
                        'bg-red-100 text-red-700': option.type.toLowerCase() === 'hold',
                        'bg-amber-100 text-amber-700': option.type.toLowerCase() === 'modifier',
                      }"
                    >
                      {{ formattedLabel(option) }}
                    </span>
                  </div>
                </div>
              </div>

              <p class="text-[11px] text-gray-500 mt-1 italic">
                Base: €{{ item.basePrice.toFixed(2) }} + €{{ item.selectionTotalPrice.toFixed(2) }} = €{{
                  item.unitTotal.toFixed(2)
                }}
                each
              </p>
            </div>
            <!-- Offer line total -->
            <div class="flex flex-col items-end">
              <template v-if="promoTotal">
                <template v-if="offerPromo(item).affected">
                  <span class="original-price">€{{ offerPromo(item).original.toFixed(2) }}</span>
                  <span class="updated-price">€{{ offerPromo(item).updated.toFixed(2) }}</span>
                </template>
                <template v-else>
                  <span class="font-semibold text-green-800">€{{ offerPromo(item).original.toFixed(2) }}</span>
                </template>
              </template>
              <template v-else>
                <span class="font-semibold text-green-800">€{{ item.total.toFixed(2) }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- STICKY FOOTER: summary + checkout button together -->
      <div class="sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t -mx-4 -mb-4 rounded-b-lg overflow-hidden">
        <div class="px-4 pt-2 text-xs space-y-1">
          <!-- No promo -->
          <template v-if="!promoTotal">
            <div class="flex justify-between">
              <span class="text-gray-600">Subtotal</span>
              <span>€{{ subtotal.toFixed(2) }}</span>
            </div>
            <div v-if="orderType === 'delivery'" class="flex justify-between">
              <span class="text-gray-600">Delivery Fee</span>
              <span>€{{ deliveryFee.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between font-bold text-xs pt-1 border-t">
              <span v-if="orderStore.editOrder">
                Total
                <span class="text-green-600"> · PAID €{{ (orderStore.editOrder.editOrderTotal || 0).toFixed(2) }}</span>
              </span>
              <span v-else>Total</span>
              <span v-if="orderStore.editOrder">€{{ getTotalPrice }}</span>
              <span v-else>€{{ total.toFixed(2) }}</span>
            </div>
          </template>

          <!-- Promo present -->
          <template v-else>
            <div class="flex justify-between">
              <span class="text-gray-600">Subtotal</span>
              <span>€{{ (promoOriginalItems + promoOriginalOffers).toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-[10px] text-gray-500">
              <span>Items + Offers</span>
              <span>€{{ promoOriginalItems.toFixed(2) }} + €{{ promoOriginalOffers.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Discount</span>
              <span>€{{ (promoTotal.originalTotal - promoTotal.updatedTotal).toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Delivery Fee</span>
              <span>€{{ Number(promoTotal.deliveryFee || 0).toFixed(2) }}</span>
            </div>
            <div class="flex justify-between font-bold text-xs pt-1 border-t">
              <span v-if="orderStore.editOrder">
                Total
                <span class="text-green-600"> · PAID €{{ (orderStore.editOrder.editOrderTotal || 0).toFixed(2) }}</span>
              </span>
              <span v-else>Total</span>
              <span v-if="orderStore.editOrder">€{{ getTotalPrice }}</span>
              <span v-else>€{{ promoTotal.updatedTotal.toFixed(2) }}</span>
            </div>
          </template>
        </div>

        <div class="px-4 pb-4">
          <div class="w-full relative">
            <!-- Overlay for disabled state to allow clicks for error message (optional, but requested 'pop up') -->
            <div
               v-if="isServiceRestricted"
               class="absolute inset-0 z-10 cursor-not-allowed"
               @click="showRestrictedMessage"
            ></div>
            <VaButton
              :disabled="
                !customerDetailsId ||
                !orderType ||
                (items.length === 0 && offersItems.length === 0) ||
                isServiceRestricted
              "
              class="w-full rounded-md"
              color="success"
              :style="{ '--va-background-color': outlet.primaryColor }"
              size="medium"
              @click="openCheckoutModal"
            >
              Checkout Order
            </VaButton>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="mt-4 w-full">No Orders Selected</div>
    </template>

    <MenuModal
      v-if="showMenuModal"
      :item="selectedItemWithArticlesOptionsGroups"
      :category-id="selectedItemCategoryId"
      :menu-item-id="selectedItemWithArticlesOptionsGroups.menuItemId"
      :is-edit="isEdit"
      @cancel="closeMenuModal"
      @cancelEdit="isEdit = false"
    />
    <OfferModal
      v-if="showOfferModal"
      :item="selectedItemWithArticlesOptionsGroups"
      :is-edit="isEdit"
      @cancel="closeOfferModal"
      @cancelEdit="isEdit = false"
    />
    <CheckOutModal
      v-if="showCheckoutModal"
      v-model="showCheckoutModal"
      :date-selected="orderStore.orderDateTime || dateSelected"
      :delivery-fee="deliveryFee"
      :customer-details-id="customerDetailsId"
      :order-type="orderType"
      :promo-code="promoCode"
      :promo-codes="appliedPromoCodes"
      :existing-order-id="existingOrderId"
      @cancel="closeCheckoutModal"
    />
    <PromotionModal
      ref="promotionModal"
      v-model="showPromotionModal"
      :promotion="promotionData"
      :date-selected="dateSelected"
      :order-type="orderType"
      :delivery-fee="deliveryFee"
      :customer-details-id="customerDetailsId"
      @cancel="closePromotionModal"
      @selectCode="onCodeSelected"
      @selectCodes="onCodesSelected"
    />
  </div>
</template>

<script setup>
import { ref, computed, useTemplateRef, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrderStore } from '@/stores/order-store'
import { useServiceStore } from '@/stores/services.ts'
import MenuModal from '../modals/MenuModal.vue'
import CheckOutModal from '../modals/CheckOutModal.vue'
import OfferModal from '../modals/OfferModal.vue'
import axios from 'axios'
import { useToast, useModal } from 'vuestic-ui'
import PromotionModal from '../modals/PromotionModal.vue'

import { useMenuStore } from '@/stores/getMenu.js'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  isCustomerOpen: Boolean,
  customerDetailsId: [String, Number],
  orderType: String,
  deliveryFee: Number,
  isDeliveryZoneSelected: Boolean,
  dateSelected: String,
})

const emit = defineEmits(['restore-context'])

const route = useRoute()
const router = useRouter()
const menuStore = useMenuStore()
const promotionRef = useTemplateRef('promotionModal')
const serviceStore = useServiceStore()

const promoCode = ref('')
const promotionData = ref(null)
const showPromotionModal = ref(false)
const showOfferModal = ref(false)
const isPromoValid = ref(false)
const orderStore = useOrderStore()
const { cartItems, offerItems } = storeToRefs(orderStore)

const money = (n) => (typeof n === 'number' ? n.toFixed(2) : '0.00')

const formattedLabel = (sel) => {
  const totalPrice = sel.price * sel.quantity
  return totalPrice > 0 ? `${sel.name} (+€${totalPrice.toFixed(2)})` : sel.name
}

function isBetween11to23(dt) {
  // 11:00 inclusive, 23:00 exclusive
  const mins = dt.getHours() * 60 + dt.getMinutes()
  return mins >= 11 * 60 && mins < 23 * 60
}

const selectedDt = computed(() => parseSelectedDate(props.dateSelected))

const isFutureTimeAllowed = computed(() => {
  if (orderFor.value !== 'future') return true
  if (!selectedDt.value) return false
  return isBetween11to23(selectedDt.value)
})

const promoOriginalItems = computed(() => {
  const v = promoTotal.value
  if (!v?.menuItems) return 0
  const n = v.menuItems.reduce((sum, it) => sum + Number(it.originalPrice || 0) + Number(it.optionsPrice || 0), 0)
  return Number(n.toFixed(2))
})

const promoOriginalOffers = computed(() => {
  const v = promoTotal.value
  if (!v) return 0

  // If originalTotal is present, use it to derive offers total so Subtotal matches exactly
  if (v.originalTotal !== undefined) {
    return Number((v.originalTotal - promoOriginalItems.value).toFixed(2))
  }

  if (!v.offerDetails?.length) return 0
  const n = v.offerDetails.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0)
  return Number(n.toFixed(2))
})

watch(
  [cartItems, offerItems],
  async (newVal, oldVal) => {
    // If no promo is applied, skip
    if (!isPromoValid.value || !promoCode.value.trim()) return

    // Avoid running before state fully settles (e.g. quantity buttons)
    await nextTick()

    // Re-apply the promo (will re-call the validation API)
    applyPromoCode()
  },
  { deep: true }, // watch nested changes in arrays/objects
)

const itemsAfterPromos = computed(() => {
  const v = promoTotal.value
  if (!v?.menuItems) return 0
  const n = v.menuItems.reduce((sum, it) => sum + Number(it.updatedPrice || 0), 0)
  return Number(n.toFixed(2))
})

const offersAfterPromos = computed(() => {
  const v = promoTotal.value
  const n = Number(v?.updatedOffersTotal || 0)
  return Number(n.toFixed(2))
})

const appliedPromoCodes = ref([]) // NEW - JS only

function onCodeSelected(code) {
  promoCode.value = code
  appliedPromoCodes.value = [code] // keep in sync
  isPromoValid.value = true
  showPromotionModal.value = false
}

function onCodesSelected(codes) {
  // NEW - JS only
  appliedPromoCodes.value = codes
  // keep single field for back-compat UIs / summaries
  promoCode.value = codes.length === 1 ? codes[0] : ''
  isPromoValid.value = codes.length > 0
  showPromotionModal.value = false
}

// Check if the current service is restricted for the selected zone
const isServiceRestricted = computed(() => {
  const zone = orderStore.deliveryZone
  if (!zone) return false // fallback to other checks

  const type = props.orderType // 'delivery' or 'takeaway'
  if (!type) return false

  // Check availability for 'cc' channel
  const availability = zone.availability?.[type]?.cc

  // If explicitly false, it is restricted
  return availability === false
})

function showRestrictedMessage() {
  const type = props.orderType === 'takeaway' ? 'Takeaway' : 'Delivery'
  confirm({
    message: `${type} not available for this Zone`,
    okText: 'Close',
    cancelText: '',
    size: 'small',
    zIndex: 9999,
  })
}

function openCheckoutModal() {
  if (!isFutureTimeAllowed.value) {
    const msg = 'Future orders must be between 11:00–23:00.'
    init({ color: 'danger', message: msg })
    return
  }

  // Check if delivery is selected but no delivery zone is selected
  if (props.orderType === 'delivery' && !props.isDeliveryZoneSelected) {
    confirm({
      message: 'Please select a delivery address to determine the delivery zone.',
      okText: 'Close',
      cancelText: '',
      size: 'small',
      zIndex: 9999,
    })
    return
  }

  // Check if delivery is selected but no address is provided
  if (props.orderType === 'delivery' && !orderStore.address) {
    confirm({
      message: 'Please select a delivery address before proceeding to checkout.',
      okText: 'Close',
      cancelText: '',
      size: 'small',
      zIndex: 9999,
    })
    return
  }

  showCheckoutModal.value = true
}

function parseSelectedDate(v) {
  // Pass-through if it’s already a Date
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  if (typeof v !== 'string' || !v) return null

  // Accept: 2025-10-08T16:54, 2025-10-08T16:54:00, 2025-10-08T16:54:00.000, with/without trailing Z
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?(Z)?$/)
  if (m) {
    const [, Y, M, D, h, m2, s = '0', ms = '0'] = m
    // Build as **local** time (ignore trailing Z so we don’t shift)
    return new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(m2), Number(s), Number(ms))
  }

  // Fallback: try native, but this may shift or be invalid if timezone suffixes exist
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

const getTotalPrice = computed(() => {
  if (orderStore.editOrder) {
    if (promoTotal.value) {
      return (promoTotal.value.updatedTotal - orderStore.editOrder.editOrderTotal).toFixed(2) || 0
    } else {
      return (total.value - orderStore.editOrder.editOrderTotal).toFixed(2) || 0
    }
  }
  return total.value.toFixed(2)
})

const orderItemsStyle = computed(() => {
  let height = {}
  if (props.isCustomerOpen) {
    if (props.orderType === 'delivery') {
      height = { height: 'calc(100vh - 635px)', overflowY: 'auto' }
    } else if (props.orderType === 'takeaway') {
      height = { height: 'calc(100vh - 615px)', overflowY: 'auto' }
    }
  } else {
    if (props.orderType === 'delivery') {
      height = { height: 'calc(100vh - 395px)', overflowY: 'auto' }
    } else if (props.orderType === 'takeaway') {
      height = { height: 'calc(100vh - 375px)', overflowY: 'auto' }
    }
  }
  if (promoTotal.value) {
    height.height = `calc(${height.height} - 20px)`
  }
  return height
})

const selectedItemCategoryId = computed(() => {
  if (!selectedItemWithArticlesOptionsGroups.value) return ''
  else {
    const categoryIds = selectedItemWithArticlesOptionsGroups.value.selectedOptions
      .flatMap((a) => a.categoryId)
      .filter((a) => a)
    if (categoryIds.length) {
      return categoryIds[0]
    } else {
      return ''
    }
  }
  return selectedItemWithArticlesOptionsGroups.value.categoryId || ''
})

const outlet = computed(() => {
  const servicesStore = useServiceStore()
  return servicesStore.restDetails || {}
})

const items = computed(() =>
  cartItems.value.map((item, index) => {
    const subItems = []
    let categoryId = ''
    let menuItemId = ''
    item.selectedOptions.forEach((group) => {
      menuItemId = group.menuItemId
      categoryId = group.categoryId
      group.selected.forEach((sel) => {
        subItems.push({ text: formattedLabel(sel), type: sel.type })
      })
    })

    const unitTotal = item.totalPrice / item.quantity

    return {
      id: item.itemId || index,
      menuItemId: menuItemId || item.itemId,
      name: item.itemName,
      quantity: item.quantity,
      basePrice: item.basePrice,
      selectionTotalPrice: item.selectionTotalPrice,
      subItems,
      unitTotal,
      total: item.totalPrice,
      fullItem: { ...item, menuItemId, categoryId },
      // for stable duplicate mapping:
      __renderIndex: index,
    }
  }),
)

const offersItems = computed(() =>
  offerItems.value.map((item, index) => {
    const items = []
    const subItems = []
    item.selections.map((selection) => {
      selection.addedItems.map((addedItems) => {
        addedItems.selectedOptions.forEach((group) => {
          group.selected.forEach((sel) => {
            subItems.push({ text: formattedLabel(sel), type: sel.type })
          })
        })
      })
      items.push(...selection.addedItems)
    })
    const totalPrice = item.selectionTotalPrice ? item.price + item.selectionTotalPrice : item.price

    return {
      id: item.itemId || index,
      offerId: item.offerId,
      name: item.name,
      quantity: item.quantity,
      basePrice: item.price,
      selectionTotalPrice: item.selectionTotalPrice,
      items,
      unitTotal: totalPrice,
      total: totalPrice * item.quantity,
      fullItem: { ...item, offerId: item.offerId },
      // fullItem: item,
      __storeIndex: index,
    }
  }),
)

const subtotal = computed(
  () =>
    items.value.reduce((sum, item) => sum + item.total, 0) +
    offersItems.value.reduce((sum, item) => sum + item.total, 0),
)

const total = computed(() => {
  if (props.orderType === 'delivery') {
    return subtotal.value + props.deliveryFee
  } else {
    return subtotal.value
  }
})

const promoTotal = computed(() => {
  return orderStore.cartTotal !== null ? orderStore.cartTotal : null
})

const orderFor = computed(() => orderStore.orderFor)

const promoUnitsMap = computed(() => {
  const map = new Map()
  const resp = promoTotal.value
  const lines = resp?.menuItems || []
  for (const line of lines) {
    const id = line.menuItemId
    const arr = map.get(id) ?? []
    const qty = Math.max(1, Number(line.quantity ?? 1))
    for (let i = 0; i < qty; i++) {
      arr.push({
        originalPrice: Number(line.originalPrice ?? 0),
        optionsPrice: Number(line.optionsPrice ?? 0),
        updatedPrice: Number(line.updatedPrice ?? 0),
        discount: Number(line.discount ?? 0),
        isAffected: !!line.isAffected,
      })
    }
    map.set(id, arr)
  }
  return map
})

function linePromo(item) {
  if (!promoTotal.value) {
    return {
      hasAnyEffect: false,
      lineOriginal: item.total,
      lineUpdated: item.total,
      lineDiscount: 0,
      units: [],
    }
  }

  const id = item.menuItemId || item.id
  const allUnits = promoUnitsMap.value.get(id) || []

  let precedingUnits = 0
  for (const it of items.value) {
    if (it.__renderIndex >= item.__renderIndex) break
    if ((it.menuItemId || it.id) === id) {
      precedingUnits += Number(it.quantity || 1)
    }
  }

  const start = precedingUnits
  const end = Math.min(start + Number(item.quantity || 1), allUnits.length)
  const units = allUnits.slice(start, end)

  if (!units.length) {
    return {
      hasAnyEffect: false,
      lineOriginal: item.total,
      lineUpdated: item.total,
      lineDiscount: 0,
      units: [],
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

const promoOfferItemPrice = (item) => {
  const v = promoTotal.value
  if (!v || !v.offerDetails || !v.offerDetails.length || !item) return null

  const offerId = item.offerId || (item.fullItem && item.fullItem.offerId)
  if (!offerId) return null

  // All validator entries for this offer type
  const matches = v.offerDetails.filter((o) => o.offerId === offerId)
  if (!matches.length) return null

  // Determine which occurrence THIS UI item is among same-offer items
  let seen = 0
  let occ = 0
  for (let i = 0; i < orderStore.offerItems.length; i++) {
    const it = orderStore.offerItems[i]
    const itOfferId = it.offerId || (it.fullItem && it.fullItem.offerId)
    if (itOfferId === offerId) {
      if (i === item.__storeIndex) {
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

function offerPromo(item) {
  const updated = promoOfferItemPrice(item) // number | null (your existing helper)
  const original = Number(item.total || 0)

  // If the promo engine didn’t return anything for this offer, it’s not affected.
  if (updated === null) return { affected: false, original, updated: original }

  // Consider it “affected” only if the value actually changes (with a tiny epsilon).
  const affected = Math.abs(updated - original) > 0.005
  return { affected, original, updated }
}

function menuItemPromo(item) {
  // fallbacks keep UI stable when promo data is missing
  const lp = promoTotal.value ? linePromo(item) : null
  const original = Number(lp?.lineOriginal ?? item.total ?? 0)
  const updated = Number(lp?.lineUpdated ?? item.total ?? 0)

  // treat as affected only if the number actually changed
  const affected = Math.abs(updated - original) > 0.005
  return { affected, original, updated }
}

const increaseQty = (item) => {
  const index = cartItems.value.findIndex((i) => i.itemId === item.id)
  if (index !== -1) {
    orderStore.cartItems[index].quantity++
    orderStore.calculateItemTotal(index)
  }
}

const deleteItem = (item) => {
  const index = cartItems.value.findIndex((i) => i.itemId === item.id)
  orderStore.cartItems.splice(index, 1)
  orderStore.calculateItemTotal(index)
}

const deleteOffer = (item) => {
  const index = offerItems.value.findIndex((i) => i.itemId === item.id)
  orderStore.offerItems.splice(index, 1)
}

const decreaseQty = (item) => {
  const index = cartItems.value.findIndex((i) => i.itemId === item.id)
  if (index !== -1 && orderStore.cartItems[index].quantity > 1) {
    orderStore.cartItems[index].quantity--
    orderStore.calculateItemTotal(index)
  }
}

// -----------------TO OPEN THE CHECKOUT MODAL---------------------
const showCheckoutModal = ref(false)

function closeCheckoutModal() {
  showCheckoutModal.value = false
}

// -----------------TO OPEN THE EDIT MODAL-------------------------

const selectedItemWithArticlesOptionsGroups = ref({})
const showMenuModal = ref(false)
const isEdit = ref(false)
const isLoading = ref(false)
const { init } = useToast()
const { confirm } = useModal()

async function openPromotionModal() {
  const url = import.meta.env.VITE_API_BASE_URL
  try {
    const { data } = await axios.get(`${url}/cc/promotions?outletId=${serviceStore.selectedRest}`)
    console.log('Promotion Data:', data)

    const validPromotions = data.data.filter((promo) => promo.availableAtCC)

    if (validPromotions.length > 0) {
      promotionData.value = validPromotions
      showPromotionModal.value = true
    } else {
      init({ message: 'No promotions available at Call Center.', color: 'danger' })
    }
  } catch (error) {
    init({ message: 'Invalid or expired promotion code.', color: 'danger' })
  }
}
function parseCodes(raw) {
  const tokens = (raw || '')
    .split(/[\s,;\n\r]+/g)
    .map((s) => s.trim())
    .filter(Boolean)

  const seen = new Set()
  const out = []
  for (const t of tokens) {
    const k = t.toLowerCase()
    if (!seen.has(k)) {
      seen.add(k)
      out.push(t)
    }
  }
  return out
}

// Build payload identical to the modal (keys + types)
function buildPromoPayloadFromState(promoCodes) {
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
        options: (item.selectedOptions || []).flatMap((group) =>
          group.selected.map((option) => ({
            option: option.optionId,
            quantity: option.quantity,
          })),
        ),
      })),
    ),
  }))

  const single = promoCodes.length === 1 ? promoCodes[0] : null

  const payload = {
    orderFor: orderFor.value,
    customerDetailId: props.customerDetailsId,
    orderType: props.orderType === 'takeaway' ? 'Takeaway' : 'Delivery',
    deliveryZoneId: orderStore.deliveryZone?._id,
    address: orderStore.address,
    menuItems,
    offerMenuItems,
    orderNotes: orderStore.orderNotes || '',
    deliveryFee: props.deliveryFee,
    outletId: serviceStore.selectedRest,
    orderDateTime: new Date(props.dateSelected).toISOString(),
    paymentMode: '',
    promoCodes: promoCodes, // array (no empty strings)
    hasOtherOffers: offerMenuItems.length, // number (not boolean)
  }

  if (single) payload.promoCode = single
  return payload
}

async function applyPromoCode() {
  const codes = parseCodes(promoCode.value)
  if (!codes.length) {
    init({ message: 'Please enter a promotion code.', color: 'warning' })
    return
  }
  if (props.orderType === 'takeaway' && !props.isDeliveryZoneSelected) {
    init({ message: 'Please select a delivery zone first.', color: 'warning' })
    return
  }
  if (!props.customerDetailsId) {
    init({ message: 'Please select a customer first.', color: 'warning' })
    return
  }
  if (total.value === 0) {
    init({ message: 'Cart is empty. Please add items to the cart.', color: 'warning' })
    return
  }

  try {
    const payload = buildPromoPayloadFromState(codes)
    const response = await orderStore.validatePromoCode(payload)

    if (response.data && response.data.success) {
      orderStore.setOrderTotal(response.data.data)
      isPromoValid.value = true
      // ✅ keep the input readable and in sync
      promoCode.value = codes.join(', ')
      init({ message: `PromoCode${codes.length > 1 ? 's' : ''} selected`, color: 'success' })
    } else {
      orderStore.setOrderTotal(null)
      isPromoValid.value = false
      init({ message: (response.data && response.data.message) || 'PromoCode invalid', color: 'danger' })
    }
  } catch (err) {
    orderStore.setOrderTotal(null)
    isPromoValid.value = false
    init({
      message: (err && err.response && err.response.data && err.response.data.message) || 'PromoCode invalid',
      color: 'danger',
    })
  }
}

function clearPromoCode() {
  promoCode.value = ''
  isPromoValid.value = false
  if (promotionRef.value) {
    promotionRef.value.selectedCode = ''
  }
  orderStore.setOrderTotal(null)
}

const getMenuOptions = async (selectedItem) => {
  const url = import.meta.env.VITE_API_BASE_URL
  isLoading.value = true
  isEdit.value = true
  try {
    const response = await axios.get(`${url}/menuItemvoById/${selectedItem.itemId}`)

    const articlesOptionsGroups = response.data.articlesOptionsGroups

    // Assign item with groups only if data is returned
    selectedItemWithArticlesOptionsGroups.value = {
      ...selectedItem,
      menuItemId: selectedItem.menuItemId || selectedItem.itemId,
      categoryId: selectedItem.categoryId || response.data.categoryId,
      articlesOptionsGroups: articlesOptionsGroups || [],
    }

    // Open modal if there are any groups
    if (articlesOptionsGroups && articlesOptionsGroups.length) {
      openMenuModal()
    }
  } catch (error) {
    init({ message: 'Something went wrong', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}

const isFutureTimeValid = () => {
  if (orderFor.value !== 'future') return true // only validate future orders
  if (!props.dateSelected) return false

  const dateTime = new Date(props.dateSelected)
  const hour = dateTime.getHours()
  const minute = dateTime.getMinutes()

  // Only validate the **time** part
  // Valid time: 11:00 to 23:00 (inclusive)
  if (hour < 11 || hour > 23 || (hour === 23 && minute > 0)) {
    return false
  }

  return true
}

const futureTimeError = ref(false)

const getOfferItems = async (selectedItem) => {
  selectedItemWithArticlesOptionsGroups.value = selectedItem
  openOfferModal(selectedItem)
}
function openMenuModal() {
  showMenuModal.value = true
  isEdit.value = true
}
function openOfferModal() {
  isEdit.value = true
  showOfferModal.value = true
}
// function openPromotionModal() {
//   showPromotionModal.value = true
// }
function closeMenuModal() {
  showMenuModal.value = false
  isEdit.value = false
}
function closeOfferModal() {
  showOfferModal.value = false
  isEdit.value = false
}
function closePromotionModal() {
  showPromotionModal.value = false
}
import { onMounted } from 'vue'

const existingOrderId = ref('')

onMounted(async () => {
  if (route.query.payment === 'failed' && route.query.orderId) {
    console.log('[PaymentRetry] Detected failed payment redirect', route.query)
    isLoading.value = true
    try {
      const oid = String(route.query.orderId)
      // 1. Fetch order
      const res = await orderStore.getOrderStatus(oid)
      console.log('[PaymentRetry] Order status response:', res.data)

      if (res.data?.data) {
        const order = res.data.data
        console.log('[PaymentRetry] Order data:', order)

        // Check if SPECIFIC menu items are loaded
        const requiredItemIds = (order.menuItems || []).map(i => i.menuItem)
        console.log('[PaymentRetry] Required Item IDs:', requiredItemIds)

        let retries = 0
        let allItemsFound = false

        while (!allItemsFound && retries < 40) { // Increased retries to 40 (20s)
           const loadedIds = new Set(menuStore.unFilteredMenuItems.map(m => m._id))
           const missing = requiredItemIds.filter(id => !loadedIds.has(id))

           if (missing.length === 0) {
             allItemsFound = true
             console.log('[PaymentRetry] All required menu items found.')
           } else {
             console.warn(`[PaymentRetry] Missing items: ${missing.join(', ')}. Waiting... (${retries + 1}/40)`)
             if (retries % 5 === 0) console.log(`[PaymentRetry] Loaded count: ${menuStore.unFilteredMenuItems.length}`)
             await new Promise(resolve => setTimeout(resolve, 500))
             retries++
           }
        }

        if (menuStore.unFilteredMenuItems.length === 0) {
           console.error('[PaymentRetry] Menu items failed to load after timeout. Cart restoration may be incomplete.')
           init({ message: 'Menu data missing. Order details may be incomplete.', color: 'warning' })
        } else {
           console.log('[PaymentRetry] Menu items loaded. Proceeding with restoration.')
        }

        // 2. Restore cart
        await orderStore.restoreCartFromOrder(order, menuStore)
        console.log('[PaymentRetry] Cart restored. Cart items:', orderStore.cartItems)

        // 2b. Emit context to parent (index.vue) to update props
        emit('restore-context', {
          customerDetailsId: order.customerDetailId,
          orderType: (order.orderType || '').toLowerCase(),
          deliveryFee: Number(order.deliveryFee || 0),
          isDeliveryZoneSelected: !!order.deliveryZoneId,
          dateSelected: order.orderDateTime || order.createdAt
        })

        // 3. Set local state to match order
        // Note: Props are passed from parent, so we might need to emit or rely on store
        // For CheckOutModal, we pass 'existingOrderId'
        existingOrderId.value = oid
        orderStore.orderDateTime = order.orderDateTime || order.createdAt

        // 4. Open modal
        console.log('[OrderDetails] Setting showCheckoutModal = true. Cart items LEN:', orderStore.cartItems.length)
        showCheckoutModal.value = true

        // 5. Clean URL
        const q = { ...route.query }
        delete q.payment
        delete q.orderId
        delete q.status
        router.replace({ query: q })
      }
    } catch (e) {
      console.error('Failed to restore failed payment order', e)
      init({ message: 'Failed to restore order for retry', color: 'danger' })
    } finally {
      isLoading.value = false
    }
  }
})
</script>
<style>
.original-price {
  text-decoration: line-through;
  color: #9ca3af;
  font-size: 0.8rem;
}

.updated-price {
  color: #dc2626;
  font-weight: 600;
  font-size: 0.9rem;
  margin-top: 2px;
}
</style>
