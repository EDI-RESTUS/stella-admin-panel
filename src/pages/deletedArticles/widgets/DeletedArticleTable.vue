<script setup lang="ts">
import { defineVaDataTableColumns, useModal, useToast } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import { ref, watch, toRef, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useServiceStore } from '@/stores/services'
import axios from 'axios'

const { confirm } = useModal()
const { init } = useToast()
const router = useRouter()
const servicesStore = useServiceStore()
const items = ref([])
const loading = ref(false)
const { locale } = useI18n()

const getLocalizedValue = (value: any) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale.value] || value['en'] || Object.values(value)[0] || ''
}
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
    // Backend list filters `isActive: true` by default, so we fetch both
    // active+deleted and inactive+deleted and merge — otherwise inactive
    // items that were deleted would never show up here.
    const base = `${url}/menuItems?isDeleted=true&outletId=${servicesStore.selectedRest}&limit=500`
    const [activeRes, inactiveRes] = await Promise.all([
      axios.get(`${base}&isActive=true`),
      axios.get(`${base}&isActive=false`),
    ])

    const merged = [...(activeRes.data || []), ...(inactiveRes.data || [])]
    const seen = new Set<string>()
    items.value = merged.filter((item: any) => {
      const id = String(item?._id || '')
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
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
    message: `Are you sure you want to restore article "${getLocalizedValue(rowData.name)}"?`,
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
  <div class="flex flex-col h-full bg-white rounded-xl shadow-sm">
    <!-- HEADER -->
    <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
      <!-- Left: Title -->
      <div class="flex flex-1 min-w-0 items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2 flex-shrink-0 mt-1">
          <h1 class="text-2xl font-semibold text-slate-800 tracking-tight">Deleted Articles</h1>
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
        <!-- NAME -->
        <template #cell(name)="{ rowData }">
          <span>{{ getLocalizedValue(rowData.name) }}</span>
        </template>

        <!-- DESCRIPTION -->
        <template #cell(description)="{ rowData }">
          <span class="line-clamp-2">{{ getLocalizedValue(rowData.description) }}</span>
        </template>

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
  background-color: #ffffff !important;
  color: #0f172a !important;

  ::v-deep(.va-data-table__table-tr) {
    border-bottom: 1px solid var(--va-background-border);
    background-color: #ffffff !important;
    color: #0f172a !important;
  }

  ::v-deep(.va-data-table__table td),
  ::v-deep(.va-data-table__table th) {
    background-color: #ffffff !important;
    color: #0f172a !important;
  }

  ::v-deep(.va-data-table__table thead tr),
  ::v-deep(.va-data-table__table thead th) {
    background-color: #f8fafc !important;
    color: #64748b !important;
  }
}

::v-deep(.va-data-table__table tbody tr:hover),
::v-deep(.va-data-table__table tbody tr:hover td) {
  background-color: #f8fafc !important;
}
</style>
