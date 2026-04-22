<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToast } from 'vuestic-ui'
import { useRoute } from 'vue-router'
import CategoriesTable from './widgets/CategoriesTable.vue'
import { useCategoryStore } from '../../stores/categories'
import { useServiceStore } from '@/stores/services'
import EditCategoryModal from './modals/EditCategoryModal.vue'
import ImportCategoryModal from './modals/ImportCategoryModal.vue'
import axios from 'axios'
const isEditCategoryModalOpen = ref(false)
const categoriesStore = useCategoryStore()
const { init } = useToast()
const serviceStore = useServiceStore()
const items = ref([])
const sortBy = ref('name')
const sortOrder = ref('asc')
const selectedCategory = ref('')
const isLoading = ref(true)
const route = useRoute()

const getCategories = (outletId) => {
  isLoading.value = true
  items.value = []
  categoriesStore.getAll(outletId, sortBy.value, sortOrder.value).then(() => {
    items.value = categoriesStore.items.map((item) => ({
      editCode: false,
      editName: false,
      editDescription: false,
      editArea: false,
      editSchedule: false,
      _id: item._id || '',
      name: item.name || '',
      wCode: item.code || '',
      schedule: item.schedule || { selected: '' },
      ...item,
    }))
    isLoading.value = false
  })
}

function updateSortBy(payload) {
  sortBy.value = payload
  getCategories(serviceStore.selectedRest)
}
function updateSortOrder(payload) {
  sortOrder.value = payload
  getCategories(serviceStore.selectedRest)
}

const updateCategory = (payload) => {
  isEditCategoryModalOpen.value = true
  selectedCategory.value = payload
}

const updateCategoryDirectly = (payload) => {
  const data = payload
  data.outletId = serviceStore.selectedRest
  const url: any = import.meta.env.VITE_API_BASE_URL
  axios
    .patch(`${url}/menuCategories/${payload._id}`, data)
    .then(() => {
      getCategories(serviceStore.selectedRest)
      init({ message: "You've successfully updated", color: 'success' })
    })
    .catch((err) => {
      getCategories(serviceStore.selectedRest)
      init({ message: err.response.data.error, color: 'danger' })
    })
}

watch(
  () => serviceStore.selectedRest,
  (newId) => {
    if (newId) {
      getCategories(serviceStore.selectedRest)
    }
  },
  { immediate: true },
)

async function deleteCategory(payload) {
  const data = {
    id: payload._id,
  }
  categoriesStore
    .deleteCategory(data)
    .then((response) => {
      init({
        message: "You've successfully deleted Category",
        color: 'success',
      })
      getCategories(serviceStore.selectedRest)
    })
    .catch((err) => {
      init({
        message: err.response.data,
        color: 'error',
      })
    })
}

const closeImportCategoryModal = () => {
  isImportCategoryModalOpen.value = false
  getCategories(serviceStore.selectedRest)
}

const isImportCategoryModalOpen = ref(false)
</script>

<template>
  <div>
    <!-- <div class="flex items-center justify-between">
    <h1 class="page-title font-bold">Categories</h1>
    <div class="flex gap-2">
      <VaButton color="primary" size="small" @click="isImportCategoryModalOpen = true"> Import</VaButton>
      <VaButton size="small" color="primary" @click="isEditCategoryModalOpen = true"> Add Category </VaButton>
    </div>
  </div> -->

    <VaCard class="mt-4">
      <VaCardContent>
        <CategoriesTable
          :items="items"
          :loading="isLoading"
          :sort-by="sortBy"
          :sort-order="sortOrder"
          @sortBy="updateSortBy"
          @sortingOrder="updateSortOrder"
          @deleteCategory="deleteCategory"
          @updateCategoryModal="updateCategory"
          @updateCategory="updateCategoryDirectly"
          @addCategory="isEditCategoryModalOpen = true"
          @importCategory="isImportCategoryModalOpen = true"
        />
      </VaCardContent>
    </VaCard>

    <EditCategoryModal
      v-if="isEditCategoryModalOpen"
      :selected-category="selectedCategory"
      @cancel="(isEditCategoryModalOpen = false), (selectedCategory = ''), getCategories(serviceStore.selectedRest)"
    />
    <ImportCategoryModal v-if="isImportCategoryModalOpen" @cancel="closeImportCategoryModal" />
  </div>
</template>
