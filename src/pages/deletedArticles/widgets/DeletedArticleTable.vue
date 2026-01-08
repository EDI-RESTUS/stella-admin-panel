<script setup lang="ts">
import { defineVaDataTableColumns, useModal, useToast } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import { ref, watch, toRef, onMounted } from 'vue'
import { useServiceStore } from '@/stores/services'
import axios from 'axios'

const { confirm } = useModal()
const { init } = useToast()
const router = useRouter()
const servicesStore = useServiceStore()
const items = ref([])
const loading = ref(false)
const columns = defineVaDataTableColumns([
  { label: 'Name', key: 'name', sortable: false },
  { label: 'Description', key: 'description', sortable: false },
  { label: 'Code', key: 'code', sortable: false },
  { label: 'Price', key: 'price', sortable: false },
  { label: 'Deleted Date', key: 'updatedAt', sortable: false },
  { label: 'Actions', key: 'actions', sortable: false, thAlign: 'right' },
])
// Fetch deleted articles
const fetchDeletedArticles = async () => {
  try {
    loading.value = true
    const url = import.meta.env.VITE_API_BASE_URL
    const response = await axios.get(`${url}/menuItems?isDeleted=true&outletId=${servicesStore.selectedRest}&limit=500`)

    const result = response.data
    items.value = result
  } catch (error: any) {
    init({
      message: 'Failed to fetch deleted articles',
      color: 'danger',
    })
    items.value = []
  } finally {
    loading.value = false
  }
}
// Restore article
const onRestore = async (rowData: any) => {
  const confirmed = await confirm({
    title: 'Confirm Restore',
    message: `Are you sure you want to restore article "${rowData.name}"?`,
    okText: 'Yes',
    cancelText: 'Cancel',
  })

  if (!confirmed) return

  try {
    const url = import.meta.env.VITE_API_BASE_URL
    const response = await axios.patch(`${url}/menuItems/${rowData._id}`, {
      isDeleted: false,
    })
    if (response.status === 200) {
      init({
        message: 'Article restored successfully',
        color: 'success',
      })
      await fetchDeletedArticles()
    }
  } catch (error) {
    init({
      message: 'Failed to restore article',
      color: 'danger',
    })
  }
}
// Format date nicely
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
watch(
  () => servicesStore.selectedRest,
  () => {
    fetchDeletedArticles()
  },
)
if (servicesStore.selectedRest) {
  onMounted(() => {
    fetchDeletedArticles()
  })
}
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm">
    <!-- HEADER -->
    <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
      <!-- Left: Title -->
      <div class="flex flex-1 min-w-0 items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2 flex-shrink-0 mt-1">
          <h1 class="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Deleted Articles</h1>
        </div>
      </div>
      <!-- Right: empty for spacing consistency -->
      <div class="flex flex-wrap gap-2 justify-end items-center flex-shrink-0"></div>
    </div>

    <!-- TABLE -->
    <div class="flex flex-col h-[calc(100vh-12rem)]">
      <VaDataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        sticky-header
        :style="{
          '--va-data-table-thead-background': '#f8fafc',
          '--va-data-table-thead-color': '#64748b',
        }"
      >
        <!-- PRICE -->
        <template #cell(price)="{ rowData }">
          <span>
            {{ rowData.price ? `€ ${Number(rowData.price).toFixed(2)}` : '€ 0.00' }}
          </span>
        </template>

        <!-- DELETED DATE column -->
        <template #cell(updatedAt)="{ rowData }">
          <span>{{ formatDate(rowData.updatedAt) }}</span>
        </template>

        <!-- ACTIONS -->
        <template #cell(actions)="{ rowData }">
          <div class="flex justify-end">
            <button
              class="px-3 py-1 text-sm rounded-xl font-medium text-red-800 bg-red-100 hover:bg-red-200 transition-colors cursor-pointer"
              @click="onRestore(rowData)"
            >
              Restore
            </button>
          </div>
        </template>
      </VaDataTable>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.va-data-table {
  ::v-deep(.va-data-table__table-tr) {
    border-bottom: 1px solid var(--va-background-border);
  }
}

::v-deep(.va-data-table__table tbody tr:hover) {
  background-color: #f8fafc;
}
</style>
