<template>
  <div class="grid grid-cols-1 md:grid-cols-7 gap-4">
    <!-- LEFT SECTION -->
    <div
      class="md:col-span-5 bg-slate-100 py-4"
      :class="{
        'opacity-50 pointer-events-none': (!isCustomerTabActivated || !customerDetailsId) && isNotLocalHost,
      }"
    >
      <VaCard>
        <VaCardContent class="menu-section">
          <div class="category top-bar flex flex-col gap-2 border-b pb-4">
            <div class="flex flex-wrap gap-2 items-center justify-between">
              <!-- CATEGORY LINKS -->
              <div class="flex flex-wrap gap-2">
                <a
                  v-if="offers.length"
                  class="text-white px-4 py-2 rounded-2xl category-link"
                  href="#offers"
                  :style="{
                    backgroundColor: selectedItem === 'offers' ? outlet.primaryColor : '#f1f5f9',
                    color: selectedItem === 'offers' ? '#fff' : '#64748b',
                  }"
                  @click.prevent="selectCategory('offers')"
                >
                  Offers
                </a>

                <a
                  v-for="item in filteredCategories"
                  :key="item._id"
                  :href="`#${item._id}`"
                  :style="{
                    backgroundColor: selectedItem === item._id ? outlet.primaryColor : '#f1f5f9',
                    color: selectedItem === item._id ? '#fff' : '#64748b',
                  }"
                  class="text-white px-4 py-2 rounded-2xl category-link"
                  @click.prevent="selectCategory(item)"
                >
                  {{ toTitleCase(item.name) }}
                </a>
              </div>

              <span class="bg-black px-3 py-3 text-white text-xl rounded">
                {{ currentTime }}
              </span>
            </div>

            <!-- SUBCATEGORIES (SHOW ONLY WHEN CATEGORY CLICKED) -->
            <div v-if="activeSubCategories.length" class="flex overflow-x-auto gap-2 pl-2 subcategories-scroll">
              <a
                v-for="sub in activeSubCategories"
                :key="sub._id"
                :href="`#${sub._id}`"
                :style="{
                  backgroundColor: selectedSubCategory === sub._id ? outlet.primaryColor : '#f1f5f9',
                  color: selectedSubCategory === sub._id ? '#fff' : '#64748b',
                }"
                class="whitespace-nowrap text-white rounded-xl category-link subcategory-link"
                @click.prevent="selectSubCategory(sub._id)"
              >
                {{ toTitleCase(sub.name) }}
              </a>
            </div>
          </div>

          <div class="menu-scroll">
            <MenuSection
              v-if="offers.length"
              id="offers"
              :category="category"
              title="OFFERS"
              :items="offers"
              :outlet="outlet"
            />

            <MenuSection
              v-for="cat in filteredCategories"
              :id="cat._id"
              :key="cat.name"
              :category="cat"
              :title="cat.name"
              :items="cat.menuItems"
              :outlet="outlet"
            />

            <!-- Subcategory Menu Sections -->
            <!-- <MenuSection
              v-for="sub in activeSubCategories"
              :id="sub._id"
              :key="sub.name"
              :category="sub"
              :title="sub.name"
              :items="sub.menuItems"
              :outlet="outlet"
            /> -->
          </div>
        </VaCardContent>
      </VaCard>
    </div>

    <!-- RIGHT SECTION -->

    <div class="md:col-span-2 bg-slate-100 pt-4" style="height: calc(100vh - 98px); overflow-y: hidden">
      <div class="flex flex-col gap-2">
        <VaCard class="order-card">
          <VaCardContent>
            <CustomerDetails
              ref="customerRef"
              :force-remount="forceRemount"
              :outlet="outlet"
              @setTab="() => (isCustomerTabActivated = true)"
              @setDeliveryFee="(val) => (deliveryFee = val)"
              @setCustomerDetailsId="(val) => (customerDetailsId = val)"
              @setDeliveryZone="(val) => (isDeliveryZoneSelected = val)"
              @setOrderType="(val) => (orderType = val)"
              @setOpen="(val) => (accordian[0] = val)"
              @setDateSelected="(val) => (dateSelected = val)"
            />
          </VaCardContent>
        </VaCard>

        <VaCard class="order-card">
          <VaCardContent>
            <OrderDetails
              :delivery-fee="deliveryFee"
              :date-selected="dateSelected ? new Date(dateSelected).toString() : ''"
              :is-delivery-zone-selected="isDeliveryZoneSelected"
              :customer-details-id="customerDetailsId"
              :order-type="orderType"
              :is-customer-open="accordian[0]"
            />
          </VaCardContent>
        </VaCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted, useTemplateRef, onBeforeUnmount } from 'vue'
import { useMenuStore } from '@/stores/getMenu.js'
import { useServiceStore } from '@/stores/services.ts'
import { useOrderStore } from '@/stores/order-store'
import { useRoute } from 'vue-router'
import { useToast } from 'vuestic-ui'
import axios from 'axios'

const { init } = useToast()
const route = useRoute()
const serviceStore = useServiceStore()
const customerRef = useTemplateRef('customerRef')
import MenuSection from '@/pages/callCenters/widgets/MenuSections.vue'
import CustomerDetails from '@/pages/callCenters/widgets/CustomerDetails.vue'
import OrderDetails from '@/pages/callCenters/widgets/OrderDetails.vue'
import { storeToRefs } from 'pinia'

const props = defineProps({
  categories: Array,
  restDetails: Object,
})

const customerDetailsId = ref('')
const isCustomerTabActivated = ref(false)
const orderType = ref('')
const dateSelected = ref('')
const isDeliveryZoneSelected = ref('')
const categories = computed(() => menuStore.categories)
const restDetails = computed(() => menuStore.restDetails)
const isNotLocalHost = computed(() => !window.location.href.includes('localhost'))
const isLoading = ref(false)
const menuStore = useMenuStore()
const accordian = ref([true, true])
const deliveryFee = ref(0)
const orderStore = useOrderStore()
const toTitleCase = (text) => {
  if (!text) return ''
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const selectedItem = ref(null)
const selectedSubCategory = ref(null)
const activeSubCategories = ref([])
const currentTime = ref('')
const forceRemount = ref(0)
const offers = ref([])

const selectCategory = (category) => {
  if (category === 'offers') {
    selectedItem.value = 'offers'
    activeSubCategories.value = []
    return
  }

  selectedItem.value = category._id

  if (category.subCategories && category.subCategories.length) {
    activeSubCategories.value = category.subCategories.filter((sub) => sub.menuItems && sub.menuItems.length > 0)
  } else {
    activeSubCategories.value = []
  }
}

const selectSubCategory = (subId) => {
  selectedSubCategory.value = subId

  const el = document.getElementById(subId)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const getOffers = async () => {
  const url = import.meta.env.VITE_API_BASE_URL

  const response = await axios.get(url + '/offers?outletId=' + serviceStore.selectedRest)
  orderStore.offers = response.data.data
  offers.value = response.data.data
}

const outlet = computed(() => {
  const servicesStore = useServiceStore()
  return servicesStore.restDetails || {}
})

const menuItems = computed(() => {
  return (props.categories || []).map((category) => ({
    id: category._id,
    _id: category._id,
    name: category.name,
    label: category.name,
  }))
})

onMounted(() => {
  currentTime.value = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }, 3000)
})

onUnmounted(() => {
  orderStore.cartItems = []
  orderStore.offerItems = []
  orderStore.paymentId = ''
  orderStore.redirectUrl = ''
  orderStore.setAddress('')
  orderStore.setDeliveryZone('')
})
onBeforeUnmount(() => {
  resetState()
})
watch(
  () => route.fullPath,
  () => {
    resetState()
  },
)

function resetState() {
  selectedItem.value = null
  offers.value = []
  orderStore.cartItems = []
  orderStore.paymentId = ''
  orderStore.redirectUrl = ''
  orderStore.setAddress('')
  orderStore.setDeliveryZone('')
  orderStore.setPhoneNumber('')
  customerDetailsId.value = ''
  isCustomerTabActivated.value = false
  orderType.value = ''
  isDeliveryZoneSelected.value = ''
  menuStore.resetUnFilteredMenuItems()
}

watch(
  () => serviceStore.selectedRest,
  (newVal) => {
    if (newVal) {
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search)
      }
      isLoading.value = true
      getMenu()
      getOffers()
      orderStore.cartItems = []
      orderStore.paymentId = ''
      orderStore.redirectUrl = ''
      forceRemount.value++
      isLoading.value = false
    }
  },
  { immediate: true },
)

const filteredCategories = computed(() => {
  const validCategories = categories.value.filter(
    (category) =>
      category.menuItems.length > 0 ||
      (category.subCategories.length && category.subCategories.some((a) => a.menuItems.length)),
  )

  return [...validCategories]
})

watch(
  () => orderStore.cartItems,
  () => {
    if (orderStore.cartItems.length) {
      customerRef.value.isOpen = false
      accordian.value[0] = false
    }
  },
  { deep: true },
)

// watch(
//   () => orderStore.editOrder,
//   (ord) => {
//     if (ord && customerRef?.value?.fromEditOrder) {
//       customerRef.value.fromEditOrder(ord)
//     }
//   },
//   { immediate: true }
// )

watch(
  () => orderStore.offerItems,
  () => {
    if (orderStore.offerItems.length) {
      customerRef.value.isOpen = false
      accordian.value[0] = false
    }
  },
  { deep: true },
)

// Watch route hash and scroll to section if present
watch(
  () => selectedItem.value,
  () => {
    if (selectedItem.value) {
      const el = document.getElementById(selectedItem.value)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  },
  { immediate: true },
)

async function getMenu() {
  isLoading.value = true
  menuStore.resetUnFilteredMenuItems()
  const payload = serviceStore.items.find((item) => item._id === serviceStore.selectedRest).slug
  await menuStore.getOutletDetails(payload)
  await menuStore.getCategories()
  isLoading.value = false
}
</script>

<style lang="scss">
.menu-section {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 115px);
  .category {
    .flex {
      .category-link {
        padding: 8px 16px;
        background: transparent;
        color: #64748b;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: all 0.2s ease;
      }
      .subcategory-link {
        padding: 6px 12px;
        font-size: 13px;
      }
      .category-link:hover {
        background: #e2e8f0;
      }
      .category-link:active {
        color: #fff !important;
      }
    }
  }
}

.menu-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1 1 auto;
  padding-right: 0.25rem;
}

.order-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.subcategories-scroll {
  display: flex;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
  -ms-overflow-style: none;
}

.subcategories-scroll::-webkit-scrollbar {
  height: 4px;
}

.subcategories-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 6px;
}

.subcategories-scroll::-webkit-scrollbar-track {
  background: transparent;
}
</style>
