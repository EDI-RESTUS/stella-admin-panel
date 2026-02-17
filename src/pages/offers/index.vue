<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OfferTable from '@/pages/offers/widgets/OfferTable.vue'
import OfferModal from './modals/OfferModal.vue'
import { useServiceStore } from '../../stores/services'
import { useUsersStore } from '@/stores/users'
import { useToast } from 'vuestic-ui'
import axios from 'axios'
const isOfferModalOpen = ref(false)
const servicesStore = useServiceStore()
const userStore = useUsersStore()
const items = ref([])
const forceReMount = ref(0)
const selectedOffers = ref('')
const isLoading = ref(false)
const { init } = useToast()
const deliveryZones = ref([])
const initialStockMap = ref<Record<string, string[]>>({})

function editOffers(payload) {
  isOfferModalOpen.value = true
  selectedOffers.value = payload
}

const fetchDeliveryZones = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/deliveryZones/${servicesStore.selectedRest}`)
    let zones = response.data.data.filter((zone) => zone.isActive !== false)

    // Filter by user's allowed zones if applicable
    const allowed = userStore.userDetails?.allowedDeliveryZoneIds
    if (allowed && allowed.length > 0) {
      zones = zones.filter((zone) => allowed.includes(zone._id) || allowed.includes(zone.id))
    }

    deliveryZones.value = zones.sort((a, b) => Number(a.serviceZoneId) - Number(b.serviceZoneId))
  } catch (error) {
    console.error('Failed to fetch delivery zones', error)
  }
}

// Build stock map from inStockByZones on each offer (returned inline by the API)
const buildStockMapFromItems = () => {
  const stockMap: Record<string, string[]> = {}
  try {
    items.value.forEach((item: any) => {
      if (Array.isArray(item.inStockByZones)) {
        const inStockZoneIds = item.inStockByZones
          .filter((z: any) => z.inStock)
          .map((z: any) => z.deliveryZoneId)
        if (inStockZoneIds.length > 0) {
          stockMap[item._id] = inStockZoneIds
        }
      }
    })
  } catch (error) {
    console.error('[Offers] Failed to build stock map from items', error)
  }
  initialStockMap.value = stockMap
}

const getOffers = async () => {
  const url = import.meta.env.VITE_API_BASE_URL
  isLoading.value = true
  try {
    const response = await axios.get(url + '/offers/?outletId=' + servicesStore.selectedRest)
    const item = response.data.data
    forceReMount.value++
    items.value = item.map((e) => {
      return {
        ...e,
        editName: false,
        editDescription: false,
        editPrice: false,
        editCode: false,
        editImage: false,
        editDate: false,
        editWeekDays: false,
        editTime: false,
        editOrderType: false,
        editSelections: false,
      }
    })
  } catch (error) {
    init({ message: 'Failed to load offers', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}

watch(
  () => servicesStore.selectedRest,
  async () => {
    await fetchDeliveryZones()
    await getOffers()
    buildStockMapFromItems()
  },
)

if (servicesStore.selectedRest) {
  fetchDeliveryZones().then(async () => {
    await getOffers()
    buildStockMapFromItems()
  })
}
</script>

<template>
  <div>
    <VaCard class="mt-4">
      <VaCardContent>
        <OfferTable
          :key="forceReMount"
          :items="items"
          :loading="isLoading"
          :delivery-zones="deliveryZones"
          :initial-stock-map="initialStockMap"
          @editOffers="editOffers"
          @getOffers="getOffers"
          @openOfferModal="isOfferModalOpen = true"
        />
      </VaCardContent>
    </VaCard>
    <OfferModal
      v-if="isOfferModalOpen"
      :selected-option="selectedOffers"
      @cancel="(isOfferModalOpen = false), (selectedOffers = ''), getOffers()"
    />
  </div>
</template>
