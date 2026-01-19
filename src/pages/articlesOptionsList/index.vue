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
const selectedDeliveryZoneId = ref('')

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

    // Auto-select if only one zone
    if (deliveryZones.value.length === 1) {
      selectedDeliveryZoneId.value = deliveryZones.value[0]._id
    }
  } catch (error) {
    console.error('Failed to fetch delivery zones', error)
  }
}

const getOptions = async () => {
  const url = import.meta.env.VITE_API_BASE_URL
  isLoading.value = true
  try {
    const response = await axios.get(
      url +
        `/articles-options?limit=100000&search=${encodeURIComponent(searchValue.value)}&sortKey=${encodeURIComponent(
          sortBy.value,
        )}&sortValue=${encodeURIComponent(sortOrder.value)}&outletId=${encodeURIComponent(servicesStore.selectedRest)}${
          selectedDeliveryZoneId.value ? `&deliveryZoneId=${encodeURIComponent(selectedDeliveryZoneId.value)}` : ''
        }`,
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
    selectedDeliveryZoneId.value = ''
    await fetchDeliveryZones()
    getOptions()
  },
  { immediate: true },
)

watch(selectedDeliveryZoneId, () => {
  getOptions()
})

if (servicesStore.selectedRest) {
  fetchDeliveryZones().then(() => {
    getOptions()
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
      <div class="mb-4" v-if="deliveryZones.length > 1">
        <VaSelect
          v-model="selectedDeliveryZoneId"
          :options="deliveryZones"
          text-by="name"
          value-by="_id"
          track-by="_id"
          label="Select Delivery Zone"
          placeholder="Select a zone to manage stock"
          clearable
          class="w-full sm:w-1/3"
        />
      </div>
      <OptionsTable
        :items="items"
        :loading="isLoading"
        :search-query="searchValue"
        :selected-delivery-zone-id="selectedDeliveryZoneId"
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
