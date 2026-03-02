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
const pageNumber = ref(1)
const currentPage = ref(1)
const count = ref(0)
const activeOnly = ref(true)

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

// Build stock map from inStockByZones on each option (returned inline by the API)
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
    console.error('[ArticleOptions] Failed to build stock map from items', error)
  }
  initialStockMap.value = stockMap
}

const getOptions = async () => {
  const url = import.meta.env.VITE_API_BASE_URL
  isLoading.value = true
  try {
    const response = await axios.get(
      url +
        `/articles-options?limit=50&page=${pageNumber.value}&search=${encodeURIComponent(
          searchValue.value,
        )}&sortKey=${encodeURIComponent(sortBy.value)}&sortValue=${encodeURIComponent(
          sortOrder.value,
        )}&outletId=${encodeURIComponent(servicesStore.selectedRest)}${
          activeOnly.value ? '&isActive=true' : ''
        }&rawName=true`,
    )

    // Handle response structures: array directly, { items: [...] }, or { result: [...] }
    const rawData = response.data
    const item = Array.isArray(rawData) ? rawData : (rawData.items || rawData.result || [])

    // Extract total count from the response if available
    if (rawData.totalNoRec !== undefined) {
      count.value = Number(rawData.totalNoRec)
    } else if (rawData.count !== undefined) {
      count.value = Number(rawData.count)
    } else if (rawData.total !== undefined) {
      count.value = Number(rawData.total)
    }

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
    console.error('[ArticleOptions] Failed to load options:', error)
  } finally {
    isLoading.value = false
  }
}

const getOptionsCount = () => {
  const url = import.meta.env.VITE_API_BASE_URL
  axios
    .get(`${url}/articles-options/count?outletId=${servicesStore.selectedRest}&search=${encodeURIComponent(searchValue.value)}${activeOnly.value ? '&isActive=true' : ''}`)
    .then((response) => {
      count.value = Number(response.data.data || response.data.totalNoRec || response.data.count || 0)
    })
    .catch((err) => {
      console.error('[ArticleOptions] Failed to get count:', err)
    })
}


watch(
  () => servicesStore.selectedRest,
  async () => {
    pageNumber.value = 1
    currentPage.value = 1
    await fetchDeliveryZones()
    await getOptions()
    buildStockMapFromItems()
    getOptionsCount()
  },
  { immediate: true },
)

if (servicesStore.selectedRest) {
  fetchDeliveryZones().then(async () => {
    await getOptions()
    buildStockMapFromItems()
    getOptionsCount()
  })
}

function getOptionsForSearch(search) {
  searchValue.value = search || ''
  pageNumber.value = 1
  currentPage.value = 1
  getOptions()
  getOptionsCount()
}

function getOptionsForPagination(payload) {
  pageNumber.value = payload.page
  searchValue.value = payload.searchQuery || ''
  getOptions()
}

function handleActiveOnlyChanged(val: boolean) {
  activeOnly.value = val
  pageNumber.value = 1
  currentPage.value = 1
  getOptions()
  getOptionsCount()
}

function updateSortBy(payload) {
  sortBy.value = payload
  pageNumber.value = 1
  currentPage.value = 1
  getOptions()
}

function updateSortOrder(payload) {
  sortOrder.value = payload
  pageNumber.value = 1
  currentPage.value = 1
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
        :current-page="currentPage"
        :count="count"
        :delivery-zones="deliveryZones"
        :initial-stock-map="initialStockMap"
        @update:searchValue="(val) => (searchValue = val)"
        @update:currentPage="(val) => (currentPage = val)"
        @sortBy="updateSortBy"
        @sortingOrder="updateSortOrder"
        @getOptions="getOptionsForSearch"
        @getOptionsForPagination="getOptionsForPagination"
        @activeOnlyChanged="handleActiveOnlyChanged"
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
