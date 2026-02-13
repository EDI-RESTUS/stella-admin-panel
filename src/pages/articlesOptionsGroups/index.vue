<script setup lang="ts">
import { ref, watch } from 'vue'
import OptionGroupsTable from '@/pages/articlesOptionsGroups/widgets/OptionGroupsTable.vue'
import { useServiceStore } from '@/stores/services'
import axios from 'axios'
import { useToast } from 'vuestic-ui'

const servicesStore = useServiceStore()
const items = ref([])
const { init } = useToast()
const isLoading = ref(false)
const searchValue = ref('')
const sortBy = ref('name')
const sortOrder = ref('asc')
const pageNumber = ref(1)
const currentPage = ref(1)
const count = ref(0)

const getOptionGroups = async () => {
  const url = import.meta.env.VITE_API_BASE_URL
  isLoading.value = true
  try {
    const response = await axios.get(
      url +
        `/articles-options-groups?limit=50&page=${pageNumber.value}&search=${encodeURIComponent(
          searchValue.value,
        )}&sortKey=${encodeURIComponent(sortBy.value)}&sortValue=${encodeURIComponent(
          sortOrder.value,
        )}&outletId=${encodeURIComponent(servicesStore.selectedRest)}`,
    )
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
        editInternalName: false,
        editDescription: false,
        editOptions: false,
        editSingleChoice: false,
        editMultipleChoice: false,
        editMandatory: false,
        editMinimumChoices: false,
        editMaximumChoices: false,
        editIsActive: false,
      }
    })
  } catch (error) {
    init({ message: 'Failed to load OptionGroups', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}

const getOptionGroupsCount = () => {
  const url = import.meta.env.VITE_API_BASE_URL
  axios
    .get(`${url}/articles-options-groups/count?outletId=${servicesStore.selectedRest}&search=${encodeURIComponent(searchValue.value)}`)
    .then((response) => {
      count.value = Number(response.data.data || response.data.totalNoRec || response.data.count || 0)
    })
    .catch((err) => {
      console.error('[OptionGroups] Failed to get count:', err)
    })
}

watch(
  () => servicesStore.selectedRest,
  () => {
    pageNumber.value = 1
    currentPage.value = 1
    getOptionGroups()
    getOptionGroupsCount()
  },
)

if (servicesStore.selectedRest) {
  getOptionGroups()
  getOptionGroupsCount()
}

function getOptionGroupsForSearch(search) {
  searchValue.value = search || ''
  pageNumber.value = 1
  currentPage.value = 1
  getOptionGroups()
  getOptionGroupsCount()
}

function getOptionGroupsForPagination(payload) {
  pageNumber.value = payload.page
  searchValue.value = payload.searchQuery || ''
  getOptionGroups()
}

function updateSortBy(payload) {
  sortBy.value = payload
  pageNumber.value = 1
  currentPage.value = 1
  getOptionGroups()
}

function updateSortOrder(payload) {
  sortOrder.value = payload
  pageNumber.value = 1
  currentPage.value = 1
  getOptionGroups()
}
</script>

<template>
  <VaCard square>
    <VaCardContent>
      <OptionGroupsTable
        :items="items"
        :loading="isLoading"
        :search-query="searchValue"
        :current-page="currentPage"
        :count="count"
        @update:searchValue="(val) => (searchValue = val)"
        @update:currentPage="(val) => (currentPage = val)"
        @sortBy="updateSortBy"
        @sortingOrder="updateSortOrder"
        @getOptionGroups="getOptionGroupsForSearch"
        @getOptionGroupsForPagination="getOptionGroupsForPagination"
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
