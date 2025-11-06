<script setup lang="ts">
import { defineVaDataTableColumns, useModal, VaCard } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import { ref, toRef } from 'vue'
import { useServiceStore } from '@/stores/services'
import { useSubCategoriesStore } from '@/stores/subCategories'

const router = useRouter()
const servicesStore = useServiceStore()
const columns = defineVaDataTableColumns([
  { label: 'Name', key: 'text' },
  { label: 'Icon', key: 'icon' },
])
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  loading: { type: Boolean, default: false },
})
const subCategoryStore = useSubCategoriesStore()
const allergenOptions = subCategoryStore.allergenOptions
const items = toRef(props, 'items')
</script>

<template>
  <div class="flex flex-col h-full p-4 mt-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
    <!-- HEADER -->
    <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
      <!-- Left: Title -->
      <div class="flex flex-1 min-w-0 items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2 flex-shrink-0 mt-1">
          <h1 class="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            Allergens
          </h1>
        </div>
      </div>
      <!-- Right: empty for spacing consistency -->
      <div class="flex flex-wrap gap-2 justify-end items-center flex-shrink-0"></div>
    </div>

    <!-- TABLE -->
    <div class="flex flex-col h-[calc(100vh-12rem)] ">
      <VaDataTable
        :columns="columns"
        :items="allergenOptions"
        sticky-header
        :style="{
          '--va-data-table-thead-background': '#f8fafc',
          '--va-data-table-thead-color': '#64748b',
        }"
      >
        <template #cell(icon)="{ rowData }">
          <div class="relative group w-12 h-12 overflow-hidden rounded">
            <img
              :src="`/allergens/${rowData.icon}.png`"
              alt="Allergen Icon"
              class="w-full h-full object-cover"
            />
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
