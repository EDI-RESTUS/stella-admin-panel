<script setup lang="ts">
import { defineVaDataTableColumns, useModal, useToast } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import { ref, computed, toRef, watch, reactive, onMounted, onUnmounted } from 'vue'
import { useServiceStore } from '@/stores/services'
import EditArticleOptionGroupsModal from '../modals/EditArticleOptionGroupsModal.vue'
import EditArticleOptionGroupsOptionsModal from '../modals/EditArticleOptionGroupsOptionsModal.vue'
import EditArticleOptionGroupsItemsModal from '../modals/EditArticleOptionGroupsItemsModal.vue'
import EditOptionGroupArticlesModal from '../modals/EditOptionGroupArticlesModal.vue'
import axios from 'axios'
import { Pencil, CirclePlus, Search, Plus, Columns3, Copy } from 'lucide-vue-next'

const isEditArticleOptionGroupsModal = ref(false)
const selectedOptionGroups = ref('')
const isEditArticleOptionsModal = ref(false)
const isEditArticleOptionGroupsItemsModal = ref(false)
const isEditOptionGroupArticlesModal = ref(false)
const selectedOptions = ref('')
const selectedItems = ref('')
const activeOnly = ref(true)
const totalOptionGroupsCount = computed(() => {
  if (activeOnly.value) {
    return props.items.filter(i => i.isActive).length
  }
  return props.items.length
})
const typeOptions = [
  { key: 'singleChoice', label: 'Single Choice' },
  { key: 'multipleChoice', label: 'Multiple Choice' },
  { key: 'multipleChoiceNoQty', label: 'Multiple (No Qty)' },
]
function getTypeLabel(row) {
  if (row.singleChoice) return 'Single Choice'
  if (row.multipleChoice) return 'Multiple Choice'
  if (row.multipleChoiceNoQty) return 'Multiple (No Qty)'
  return ''
}
function changeType(row, selectedKey) {
  // Reset all types
  row.singleChoice = false
  row.multipleChoice = false
  row.multipleChoiceNoQty = false
  row[selectedKey] = true

  // Close dropdown
  row.showTypeDropdown = false

  // Persist change
  updateData(row)
}
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    props.items.forEach(i => (i.showTypeDropdown = false))
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => document.removeEventListener('click', handleClickOutside))
})
// Define columns
const columns = defineVaDataTableColumns([
  { label: 'Name', key: 'name', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Internal Name', key: 'internalName', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Description', key: 'description', sortable: false },
  { label: 'Type', key: 'type', thAlign: 'center'  },
  { label: 'Required', key: 'mandatory', sortable: false, thAlign: 'center'  },
  { label: 'Min', key: 'minimumChoices', sortable: true, thAlign: 'center', sortingOptions: ['desc', 'asc'] },
  { label: 'Max', key: 'maximumChoices', sortable: true, thAlign: 'center', sortingOptions: ['desc', 'asc'] },
  { label: 'Options', key: 'options', sortable: false, thAlign: 'center'  },
  { label: 'Articles', key: 'menuItems', sortable: false, thAlign: 'center'  },
  { label: 'Active', key: 'isActive', sortable: false, thAlign: 'center'  },
  { label: 'Actions', key: 'actions', sortable: false },
])

// Column visibility state for show/hide
const columnVisibility = reactive<Record<string, boolean>>({})

// Dropdown open/close state
const showColumnsMenu = ref(false)

// Ref for click-outside detection
const columnsMenuWrapper = ref<HTMLElement | null>(null)

// Initialize column visibility from localStorage or default to true
onMounted(() => {
  const saved = localStorage.getItem('optionGroupColumnVisibility')
  if (saved) {
    Object.assign(columnVisibility, JSON.parse(saved))
  } else {
    columns.forEach(c => columnVisibility[c.key] = true)
  }

  // Click outside handler to close dropdown
  const handleClickOutside = (event: MouseEvent) => {
    if (columnsMenuWrapper.value && !columnsMenuWrapper.value.contains(event.target as Node)) {
      showColumnsMenu.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})

// Watch changes in column visibility and save to localStorage
watch(
  columnVisibility,
  (newVal) => {
    localStorage.setItem('optionGroupColumnVisibility', JSON.stringify(newVal))
  },
  { deep: true }
)

// Computed filtered columns for the table
const visibleColumns = computed(() =>  columns.filter(col => columnVisibility[col.key]))

// Reset all columns to visible
function resetColumnVisibility() {  columns.forEach(c => (columnVisibility[c.key] = true))
}

const emits = defineEmits(['getOptionGroups', 'editOptionGroup', 'sortBy', 'sortingOrder', 'updateOptionGroupModal'])
const props = defineProps({
  items: { type: Array, required: true },
  count: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})
const { confirm } = useModal()
const { init } = useToast()
const router = useRouter()
const servicesStore = useServiceStore()
const searchQuery = ref('')
const searchTimeout = ref<number | null>(null)

watch(searchQuery, () => {
  // clear previous timer
  if (searchTimeout.value) clearTimeout(searchTimeout.value)

  // start a new timer
  searchTimeout.value = window.setTimeout(() => {
    emits('getOptionGroups', searchQuery.value)
  }, 500) // 500ms delay
})


async function updateData(rowData) {
  const url = import.meta.env.VITE_API_BASE_URL
  const data = { ...rowData, outletId: servicesStore.selectedRest }
  await axios
    .patch(`${url}/articles-options-groups/${rowData._id}`, data)
    .then(() => {
      init({ message: "Option Group successfully updated", color: 'success' })
    })
    .catch((err) => {
      init({ message: err.response?.data?.message || err.message, color: 'danger' })
    })
}

const onButtonOptionGroupsDelete = async (payload) => {
  const result = await confirm({
    message: 'Are you sure you want to delete this Option Group?',
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Option Group',
  })

  if (result) {
    await updateData({ ...payload, isDeleted: true })
    emits('getOptionGroups', searchQuery.value)
  }
}

const cloneArticle = (article) => {
  const clonedData = { ...article }
  delete clonedData._id
  delete clonedData.createdAt
  delete clonedData.updatedAt
  delete clonedData.__v
  selectedOptionGroups.value = { ...clonedData, name: `${clonedData.name}` }
  isEditArticleOptionGroupsModal.value = true
}
const items = toRef(props, 'items') // original prop

const filteredItems = computed(() => {
  if (activeOnly.value) {
    return items.value.filter(item => item.isActive)
  }
  return items.value
})
const activeTab = ref<'groups' | 'options'>('groups')
// Modal open functions
function onButtonEditOptionGroup(rowData) { isEditArticleOptionsModal.value = true; selectedOptions.value = rowData }
function onButtonEditOptionGroupItems(rowData) { isEditArticleOptionGroupsItemsModal.value = true; selectedItems.value = rowData }
function onButtonEditOptionGroupArticles(rowData) { isEditOptionGroupArticlesModal.value = true; selectedItems.value = rowData }
</script>

<template>
  <div>
 <!-- HEADER -->
<div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
  <div class="flex items-center gap-2">

    <!-- Option Groups / Options Toggle -->
  <div class="flex bg-slate-100 rounded-xl shadow-sm overflow-hidden h-9">
    <button
      :class="[
        'whitespace-nowrap px-4 text-base font-medium transition-colors',
        $route.name === 'articlesOptionsGroups'
          ? 'bg-blue-600 text-white'
          : 'text-slate-700 hover:bg-slate-200'
      ]"
      @click="$router.push({ name: 'articlesOptionsGroups' })"
    >
      Option Groups
    </button>
    <button
      :class="[
        'whitespace-nowrap px-4 text-base font-medium transition-colors',
        $route.name === 'articlesOptionsList'
          ? 'bg-blue-600 text-white'
          : 'text-slate-700 hover:bg-slate-200'
      ]"
      @click="$router.push({ name: 'articlesOptionsList' })"
    >
      Options
    </button>
  </div>
  
<!-- FE Counter Badge -->
  <div
    class="h-9 flex items-center px-3 text-sm font-medium rounded-xl 
           bg-blue-100 text-blue-700">
    {{ totalOptionGroupsCount }}
  </div>

  <!-- Search Input -->
  <div
    class="relative flex items-center w-full sm:w-[240px] md:w-[300px] 
            bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700
            rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
  >
    <Search 
      class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"
    />
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Search by Name"
      class="w-full pl-9 pr-3 py-2 text-sm bg-transparent focus:outline-none text-slate-700 dark:text-slate-200 rounded-xl"
    />
  </div>
</div>

  <div class="flex items-center gap-2">
  <!-- Active Only Toggle -->
  <div class="flex items-center gap-2">
    <span class="text-sm font-medium text-slate-700">Active Only</span>
    <label class="relative inline-block w-9 h-5 cursor-pointer">
      <input type="checkbox" class="sr-only" v-model="activeOnly" />
      <span
        class="block rounded-full h-5 w-9 transition-colors duration-300 ease-in-out"
        :class="activeOnly ? 'bg-emerald-500' : 'bg-slate-300'"
      ></span>
      <span
        class="absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out"
        :class="activeOnly ? 'translate-x-4' : 'translate-x-1'"
      ></span>
    </label>

  <!-- Columns Dropdown -->
  <div class="relative" ref="columnsMenuWrapper">
    <button
      @click="showColumnsMenu = !showColumnsMenu"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium
             bg-white/60 backdrop-blur-md border border-slate-200
             shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-200"
    >
      <Columns3 class="w-4 h-4" />  
      Columns
    </button>

    <div
      v-if="showColumnsMenu"
      class="absolute left-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-700
             bg-white/80 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl p-4 z-50 transition-all duration-200"
    >
      <div class="flex flex-col gap-3 max-h-[420px] overflow-auto pr-1">
        <label
  v-for="col in columns"
  :key="col.key"
  class="flex items-center justify-between text-sm cursor-pointer text-slate-700 dark:text-slate-200 hover:text-blue-500"
>
  <div class="flex items-center gap-2">
    <input
      type="checkbox"
      v-model="columnVisibility[col.key]"
      class="accent-blue-500 h-4 w-4 rounded"
    />
    <span class="select-none">{{ col.label }}</span>
  </div>
</label>

      </div>

      <div class="flex justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
        <button
          @click="resetColumnVisibility"
          class="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          Reset
        </button>
        <button
          @click="() => (showColumnsMenu = false)"
          class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</div>

  <!-- Add Option Group Button -->
  <button
    @click="isEditArticleOptionGroupsModal = true"
    class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium
           bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97]
           transition-all duration-200 shadow-sm hover:shadow-md"
  >
    <Plus class="w-4 h-4" />
    Add Option Group
  </button>
</div>
  </div>

    <!-- DATA TABLE -->
     <div class="flex flex-col h-[calc(100vh-12rem)]">
    <VaDataTable
      :columns="visibleColumns"
      :items="filteredItems"
      :loading="$props.loading"
      :disable-client-side-sorting="true"
      sticky-header
      :style="{
        '--va-data-table-thead-background': '#f8fafc',
        '--va-data-table-thead-color': '#64748b',
      }"
      @update:sortBy="(sortBy) => emits('sortBy', sortBy)"
      @update:sortingOrder="(sortDesc) => emits('sortingOrder', sortDesc)"
    >
      <!-- NAME -->
      <template #cell(name)="{ rowData }">
        <div class="editable-field relative group">
          <input
            v-if="rowData.editName"
            v-model="rowData.name"
            class="editable-input"
            autofocus
            @blur="rowData.editName = false; updateData(rowData)"
          />
          <div v-else class="editable-text cursor-pointer" @click="rowData.editName = true">
            <span>{{ rowData.name || '' }}</span>
            <Pencil v-if="rowData.name" class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"/>
            <CirclePlus v-else class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors" @click.stop="rowData.editName = true"/>
          </div>
        </div>
      </template>

      <!-- INTERNAL NAME -->
      <template #cell(internalName)="{ rowData }">
        <div class="editable-field relative group">
          <input
            v-if="rowData.editInternalName"
            v-model="rowData.internalName"
            class="editable-input"
            autofocus
            @blur="rowData.editInternalName = false; updateData(rowData)"
          />
          <div v-else class="editable-text cursor-pointer" @click="rowData.editInternalName = true">
            <span>{{ rowData.internalName || '' }}</span>
            <Pencil v-if="rowData.internalName" class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"/>
            <CirclePlus v-else class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors" @click.stop="rowData.editInternalName = true"/>
          </div>
        </div>
      </template>

      <!-- DESCRIPTION -->
      <template #cell(description)="{ rowData }">
        <div class="editable-field relative group max-w-[200px] truncate" :title="rowData.description">
          <input
            v-if="rowData.editDescription"
            v-model="rowData.description"
            class="editable-input"
            autofocus
            @blur="rowData.editDescription = false; updateData(rowData)"
          />
          <div v-else class="editable-text cursor-pointer" @click="rowData.editDescription = true">
            <span>{{ rowData.description || '' }}</span>
            <Pencil v-if="rowData.description" class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"/>
            <CirclePlus v-else class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors" @click.stop="rowData.editDescription = true"/>
          </div>
        </div>
      </template>

      <!-- TYPE -->
      <template #cell(type)="{ rowData }">
  <div class="relative flex justify-center items-center">
    <!-- Pill button -->
    <button
      @click.stop="rowData.showTypeDropdown = !rowData.showTypeDropdown"
      class="flex items-center gap-1 px-3 py-1.5 text-sm rounded-full font-medium
             bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
    >
      {{ getTypeLabel(rowData) }}
      <svg
        class="w-4 h-4 text-blue-700 transition-transform duration-200"
        :class="{ 'rotate-180': rowData.showTypeDropdown }"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
  v-if="rowData.showTypeDropdown"
  class="absolute left-1/2 top-full mt-2 -translate-x-1/2 bg-white border border-slate-200 shadow-xl rounded-xl py-1.5 z-50 w-[180px]"
>
  <div
    v-for="option in typeOptions"
    :key="option.key || option"
    @click="
      rowData.type = option.key || option;
      updateData(rowData);
      rowData.showTypeDropdown = false;
    "
    class="px-3 py-1.5 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer text-center transition-colors duration-150"
  >
        {{ option.label }}
      </div>
    </div>
  </div>
      </template>

      <!-- MANDATORY -->
      <template #cell(mandatory)="{ rowData }">
  <div class="flex justify-center items-center">
    <label class="relative inline-block w-9 h-5 cursor-pointer" title="Required">
      <input
        type="checkbox"
        v-model="rowData.mandatory"
        class="sr-only"
        @change="updateData(rowData)"
      />
      <!-- Background pill -->
      <span
        class="block rounded-full h-5 w-9 transition-colors duration-300"
        :class="rowData.mandatory ? 'bg-blue-500' : 'bg-slate-200'"
      ></span>
      <!-- Slider circle -->
      <span
        class="absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300"
        :class="rowData.mandatory ? 'translate-x-4' : 'translate-x-1'"
      ></span>
    </label>
  </div>
      </template>

      <!-- MIN CHOICES -->
      <template #cell(minimumChoices)="{ rowData }">
  <div class="editable-field relative group text-center">
    <input 
      v-if="rowData.editMinimumChoices" 
      v-model="rowData.minimumChoices" 
      class="editable-input" 
      type="number" 
      @blur="rowData.editMinimumChoices = false; updateData(rowData)"
    />
    <div v-else class="editable-text cursor-pointer flex items-center justify-center" @click="rowData.editMinimumChoices = true">
      <span>{{ rowData.minimumChoices }}</span>
      <Pencil 
        v-if="rowData.minimumChoices !== null && rowData.minimumChoices !== undefined" 
        class="w-4 h-4 ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  </div>
      </template>

      <!-- MAX CHOICES -->
      <template #cell(maximumChoices)="{ rowData }">
  <div class="editable-field relative group text-center">
    <input 
      v-if="rowData.editMaximumChoices" 
      v-model="rowData.maximumChoices" 
      class="editable-input" 
      type="number" 
      @blur="rowData.editMaximumChoices = false; updateData(rowData)"
    />
    <div v-else class="editable-text cursor-pointer flex items-center justify-center" @click="rowData.editMaximumChoices = true">
      <span>{{ rowData.maximumChoices }}</span>
      <Pencil 
        v-if="rowData.maximumChoices !== null && rowData.maximumChoices !== undefined" 
        class="w-4 h-4 ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  </div>
      </template>

      <!-- OPTIONS -->
     <template #cell(options)="{ rowData }">
  <div class="flex justify-center items-center">
    <template v-if="rowData.options && rowData.options.length > 0">
      <span
        class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-green-800 bg-green-100 hover:bg-green-200 cursor-pointer transition-colors text-center min-w-[2.5rem]"
        @click="onButtonEditOptionGroup(rowData)"
      >
        {{ rowData.options.length }}
      </span>
    </template>
    <template v-else>
      <CirclePlus
        class="w-4 h-4 text-slate-300 cursor-pointer hover:text-blue-500 transition-colors"
        @click="onButtonEditOptionGroup(rowData)"
      />
    </template>
  </div>
      </template>

      <!-- ARTICLES -->
      <template #cell(menuItems)="{ rowData }">
  <div class="flex flex-col items-center gap-1">
    <template v-if="rowData.menuItems && rowData.menuItems.length > 0">
      <span
        class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-blue-800 bg-blue-100 hover:bg-blue-200 cursor-pointer transition-colors text-center min-w-[2.5rem]"
        @click="onButtonEditOptionGroupArticles(rowData)"
      >
        {{ rowData.menuItems.length }}
      </span>
    </template>
    <template v-else>
      <CirclePlus
        class="w-4 h-4 text-slate-300 cursor-pointer hover:text-blue-500 transition-colors"
        @click.stop="onButtonEditOptionGroupArticles(rowData)"
      />
    </template>
  </div>
      </template>

      <!-- ACTIVE -->
      <template #cell(isActive)="{ rowData }">
        <div class="flex justify-center items-center">
          <label class="relative inline-block w-9 h-5 cursor-pointer">
            <input type="checkbox" v-model="rowData.isActive" class="sr-only" @change="updateData(rowData)" />
            <span :class="rowData.isActive ? 'bg-emerald-500' : 'bg-slate-300'" class="block rounded-full h-5 w-9 transition-colors duration-300"></span>
            <span :class="rowData.isActive ? 'translate-x-4' : 'translate-x-1'" class="absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300"></span>
          </label>
        </div>
      </template>

      <!-- ACTIONS -->
      <template #cell(actions)="{ rowData }">
        <div class="flex justify-end items-center gap-1">
          <button @click="cloneArticle(rowData)" class="flex items-center justify-center w-7 h-7 rounded-lg
             text-slate-600 
             hover:bg-slate-200 
             transition-colors duration-150 active:scale-95"
      title="Duplicate Group"
    >
      <Copy class="w-3.5 h-3.5" />
          </button>
          <button @click="onButtonOptionGroupsDelete(rowData)" class="flex items-center justify-center w-7 h-7 rounded-lg
         text-red-600 dark:text-red-200
         hover:bg-red-100 dark:hover:bg-red-700
         transition-colors duration-150 active:scale-95"
  title="Delete Group"
>
  <VaIcon name="mso-delete" class="w-4.5 h-4.5 block" />
          </button>
        </div>
      </template>
    </VaDataTable>
    </div>

    <!-- MODALS -->
    <EditArticleOptionGroupsModal v-if="isEditArticleOptionGroupsModal" :selected-option-groups="selectedOptionGroups" @cancel="isEditArticleOptionGroupsModal=false; selectedOptionGroups=''; emits('getOptionGroups', searchQuery)" />
    <EditArticleOptionGroupsOptionsModal v-if="isEditArticleOptionsModal" :selected-options="selectedOptions" @cancel="isEditArticleOptionsModal=false; selectedOptions=''; emits('getOptionGroups', searchQuery)" />
    <EditArticleOptionGroupsItemsModal v-if="isEditArticleOptionGroupsItemsModal" :selected-option-group="selectedItems" @cancel="isEditArticleOptionGroupsItemsModal=false; selectedItems=''; emits('getOptionGroups', searchQuery)" />
    <EditOptionGroupArticlesModal v-if="isEditOptionGroupArticlesModal" :selected-items="selectedItems" @cancel="isEditOptionGroupArticlesModal=false; selectedItems=''; emits('getOptionGroups', searchQuery)" />
  </div>
</template>

<style lang="scss" scoped>
.va-data-table {
  ::v-deep(.va-data-table__table-tr) {
    border-bottom: 1px solid var(--va-background-border);
  }
}
::v-deep(.va-data-table__table thead th:last-child) {
  text-align: right !important;
}
::v-deep(.va-data-table__table tbody tr:hover) {
  background-color: #f8fafc;
}
.editable-field {
  position: relative;
  width: 100%;
  cursor: pointer;
}
.editable-input {
  width: 100%;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.editable-text {
  display: flex;
  align-items: center;
  line-height: 1.3em;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
}
</style>
