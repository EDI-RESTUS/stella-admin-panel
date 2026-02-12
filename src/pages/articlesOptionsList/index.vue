<script setup lang="ts">
import { ref, watch } from 'vue'
import OptionsTable from '@/pages/articlesOptionsList/widgets/OptionsTable.vue'
import { useServiceStore } from '@/stores/services'
import axios from 'axios'
import { useToast } from 'vuestic-ui'
import { useUsersStore } from '@/stores/users'

const userStore = useUsersStore()

const servicesStore = useServiceStore()
const items = ref([])
const { init } = useToast()
const isLoading = ref(false)

const searchValue = ref('')
const sortBy = ref('name')
const sortOrder = ref('asc')
const deliveryZones = ref([])
const initialStockMap = ref<Record<string, string[]>>({})

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

// Fetch stock status for all delivery zones and build a map: optionId -> [zoneIds that are in stock]
const fetchStockForZones = async () => {
  const stockMap: Record<string, string[]> = {}
  const url = import.meta.env.VITE_API_BASE_URL
  try {
    const promises = deliveryZones.value.map(async (zone) => {
      try {
        const res = await axios.get(`${url}/deliveryZones/${zone._id}/stock`, {
          params: { outletId: servicesStore.selectedRest, entityType: 'ArticlesOptions' },
        })
        const entries = res.data?.data || res.data || []
        entries.forEach((entry: any) => {
          if (entry.inStock && entry.entityId) {
            if (!stockMap[entry.entityId]) stockMap[entry.entityId] = []
            stockMap[entry.entityId].push(zone._id)
          }
        })
      } catch (err) {
        console.warn(`Failed to fetch stock for zone ${zone._id}`, err)
      }
    })
    await Promise.all(promises)
  } catch (error) {
    console.error('Failed to fetch stock for zones', error)
  }
  initialStockMap.value = stockMap
}

const getOptions = async () => {
  const url = import.meta.env.VITE_API_BASE_URL
  isLoading.value = true
  try {
    const response = await axios.get(
      url +
        `/articles-options?limit=100000&search=${encodeURIComponent(searchValue.value)}&sortKey=${encodeURIComponent(
          sortBy.value,
        )}&sortValue=${encodeURIComponent(sortOrder.value)}&outletId=${encodeURIComponent(servicesStore.selectedRest)}`,
    )
    
    // Handle both response structures (array directly or wrapped in result)
    const rawData = response.data
    const item = Array.isArray(rawData) ? rawData : (rawData.result || [])
    
    // console.log('Parsed active options:', item.length)

    items.value = item.map((e) => {
      return {
        ...e,
        editID: false,
        editName: false,
        editPOSName: false,
        editCode: false,
        editType: false,
        editPrice: false,
        editMinimumChoices: false,
        editMaximumChoices: false,
        editIsActive: false,
        editArticlesOptionsGroups: false,
        editIsDeleted: false,
        editImageUrl: false,
      }
    })
  } catch (error) {
    init({ message: 'Failed to load Options', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}


watch(
  () => servicesStore.selectedRest,
  async () => {
    await fetchDeliveryZones()
    await getOptions()
    await fetchStockForZones()
  },
  { immediate: true },
)

if (servicesStore.selectedRest) {
  fetchDeliveryZones().then(async () => {
    await getOptions()
    await fetchStockForZones()
  })
}

function getOptionsForSearch(search) {
  searchValue.value = search || ''
  getOptions()
}

function updateSortBy(payload) {
  sortBy.value = payload
  getOptions()
}

function updateSortOrder(payload) {
  sortOrder.value = payload
  getOptions()
}
</script>

<template>
  <VaCard square>
    <VaCardContent>
      <OptionsTable
        :items="items"
        :loading="isLoading"
        :search-query="searchValue"
        :delivery-zones="deliveryZones"
        :initial-stock-map="initialStockMap"
        @update:searchValue="(val) => (searchValue = val)"
        @sortBy="updateSortBy"
        @sortingOrder="updateSortOrder"
        @getOptions="getOptionsForSearch"
      />
    </VaCardContent>
  </VaCard>
</template>
<style lang="scss">
.va-tabs {
  .va-tabs__content {
    width: 100% !important;
  }
}
</style>
