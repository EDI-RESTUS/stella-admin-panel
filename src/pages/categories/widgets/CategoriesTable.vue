<script setup lang="ts">
import { defineVaDataTableColumns, useModal } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import { ref, computed, toRef, watch, reactive, onMounted, onUnmounted } from 'vue'
import { useServiceStore } from '@/stores/services'
import { Funnel, Columns3, Import, Plus, Pencil, CirclePlus, Copy, Search } from 'lucide-vue-next'

const emits = defineEmits([
  'updateCategoryModal',
  'updateCategory',
  'sortBy',
  'sortingOrder',
  'deleteCategory',
  'addCategory',
  'importCategory',
])

const { confirm } = useModal()
const router = useRouter()
const servicesStore = useServiceStore()

const columns = defineVaDataTableColumns([
  { label: 'Name', key: 'name', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Description', key: 'description', sortable: false },
  { label: 'Code', key: 'wCode', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Sub-Categories', key: 'sub_categories', sortable: false, thAlign: 'center' },
  { label: 'Area', key: 'area', sortable: false, thAlign: 'center' },
  { label: 'Schedule', key: 'schedule', sortable: false, thAlign: 'center' },
  { label: 'Active', key: 'isActive', sortable: false, thAlign: 'center' },
  { label: 'Actions', key: 'actions', sortable: false },
])

// Column visibility
const columnVisibility = reactive<Record<string, boolean>>({})
columns.forEach((c) => {
  columnVisibility[c.key] = true
})

// Storage key for persistence
const storageKey = computed(() => {
  return `categories_columns_visibility`
})

function loadColumnVisibility() {
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (!raw) return
    const parsed = JSON.parse(raw)
    columns.forEach((c) => {
      if (Object.prototype.hasOwnProperty.call(parsed, c.key)) {
        columnVisibility[c.key] = !!parsed[c.key]
      }
    })
  } catch (e) {
    console.warn('Failed to load column visibility', e)
  }
}

function saveColumnVisibility() {
  try {
    const payload: Record<string, boolean> = {}
    columns.forEach((c) => (payload[c.key] = !!columnVisibility[c.key]))
    localStorage.setItem(storageKey.value, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save column visibility', e)
  }
}

function resetColumnVisibility() {
  columns.forEach((c) => (columnVisibility[c.key] = true))
  localStorage.removeItem(storageKey.value)
  saveColumnVisibility()
}

// Update VaDataTable columns dynamically based on visibility
const visibleColumns = computed(() => {
  return defineVaDataTableColumns(columns.filter((c) => columnVisibility[c.key] !== false))
})

watch(
  () => Object.fromEntries(columns.map((c) => [c.key, columnVisibility[c.key]])),
  () => saveColumnVisibility(),
  { deep: true },
)

onMounted(() => loadColumnVisibility())

const showColumnsMenu = ref(false)
const columnsMenuWrapper = ref<HTMLElement | null>(null)

function onDocumentClick(e: MouseEvent) {
  if (!columnsMenuWrapper.value) return
  if (!columnsMenuWrapper.value.contains(e.target as Node)) {
    showColumnsMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

const IsActive = ref(true)
const searchQuery = ref('')
const areas = ref([])

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  loading: { type: Boolean, default: false },
})

watch(
  () => props.items,
  (newValue) => {
    if (newValue.length > 0) {
      servicesStore.getAreas().then((response) => {
        areas.value = response.data.map((e) => ({
          text: e.name,
          value: e._id,
        }))
      })
    }
  },
)
const activeOnly = ref(true)

const items = toRef(props, 'items')

const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return items.value
    .filter((item) => !activeOnly.value || item.isActive)
    .filter((item) => item.wCode?.toLowerCase().includes(query) || item.name?.toLowerCase().includes(query))
})

const onButtonCategoryDelete = async (payload) => {
  const result = await confirm({
    message: 'Are you sure you want to delete this Category?',
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Category',
  })
  if (result) emits('deleteCategory', payload)
}
</script>

<template>
  <div>
    <!-- HEADER -->
    <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
      <!-- LEFT: Title + Count + Search -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Categories</h1>
          <div
            class="h-9 flex items-center px-3 text-sm font-medium rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          >
            {{ filteredItems.length }}
          </div>
        </div>

        <div
          class="relative flex items-center w-full sm:w-[240px] md:w-[300px] bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by Name or Code"
            class="w-full pl-9 pr-3 py-2 text-sm bg-transparent focus:outline-none text-slate-700 dark:text-slate-200 rounded-xl"
          />
        </div>
      </div>

      <!-- RIGHT: Buttons -->
      <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
        <!-- Active Only Toggle Button waiting for api -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200">Active Only</span>
          <label class="relative inline-block w-9 h-5 cursor-pointer">
            <input v-model="activeOnly" type="checkbox" class="sr-only" />
            <!-- Track -->
            <span
              class="block rounded-full h-5 w-9 transition-colors duration-300 ease-in-out"
              :class="activeOnly ? 'bg-emerald-500' : 'bg-slate-300'"
            ></span>
            <!-- Thumb -->
            <span
              class="absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out"
              :class="activeOnly ? 'translate-x-4' : 'translate-x-1'"
            ></span>
          </label>
        </div>
        <!-- Columns dropdown button -->
        <div ref="columnsMenuWrapper" class="relative">
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-200 active:scale-[0.97]"
            @click="showColumnsMenu = !showColumnsMenu"
          >
            <Columns3 class="w-4 h-4" /> Columns
          </button>

          <!-- Dropdown -->
          <div
            v-if="showColumnsMenu"
            class="absolute left-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl p-4 z-50 transition-all duration-200"
          >
            <div class="flex flex-col gap-3 max-h-[420px] overflow-auto pr-1">
              <label
                v-for="col in columns"
                :key="col.key"
                class="flex items-center justify-between text-sm cursor-pointer text-slate-700 dark:text-slate-200 hover:text-blue-500"
              >
                <div class="flex items-center gap-2">
                  <input v-model="columnVisibility[col.key]" type="checkbox" class="accent-blue-500 h-4 w-4 rounded" />
                  <span class="select-none">{{ col.label }}</span>
                </div>
              </label>
            </div>
            <div class="flex justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                class="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                @click="resetColumnVisibility"
              >
                Reset
              </button>
              <button
                class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                @click="() => (showColumnsMenu = false)"
              >
                Done
              </button>
            </div>
          </div>
        </div>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md"
          @click="emits('importCategory')"
        >
          <Import class="w-4 h-4" /> Import
        </button>

        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md"
          @click="emits('addCategory')"
        >
          <Plus class="w-4 h-4" /> Add Category
        </button>
      </div>
    </div>

    <!-- TABLE -->
    <div class="flex flex-col h-[calc(100vh-12rem)]">
      <VaDataTable
        :columns="visibleColumns"
        :items="filteredItems"
        :loading="$props.loading"
        :disable-client-side-sorting="true"
        :style="{
          '--va-data-table-thead-background': '#f8fafc',
          '--va-data-table-thead-color': '#64748b',
        }"
        sticky-header
        @update:sortBy="(sortBy) => $emit('sortBy', sortBy)"
        @update:sortingOrder="(sortDesc) => $emit('sortingOrder', sortDesc)"
      >
        <!-- NAME -->
        <template #cell(name)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editName"
              v-model="rowData.name"
              class="editable-input"
              autofocus
              @blur="(rowData.editName = false), emits('updateCategory', { name: rowData.name, _id: rowData._id })"
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editName = true">
              <span>{{ rowData.name || '' }}</span>
              <Pencil
                v-if="rowData.name"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <CirclePlus
                v-else
                class="w-4 h-4 text-slate-300 cursor-pointer hover:text-blue-500 transition-colors"
                @click.stop="rowData.editName = true"
              />
            </div>
          </div>
        </template>

        <!-- DESCRIPTION -->
        <template #cell(description)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editDescription"
              v-model="rowData.description"
              class="editable-input"
              autofocus
              @blur="
                (rowData.editDescription = false),
                  emits('updateCategory', { description: rowData.description, _id: rowData._id })
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editDescription = true">
              <span>{{ rowData.description || '' }}</span>

              <!-- Pencil icon when text exists -->
              <Pencil
                v-if="rowData.description"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />

              <!-- Plus icon inline left when empty -->
              <CirclePlus
                v-else
                class="w-4 h-4 text-slate-300 cursor-pointer hover:text-blue-500 transition-colors ml-1"
                @click.stop="rowData.editDescription = true"
              />
            </div>
          </div>
        </template>

        <!-- CODE -->
        <template #cell(wCode)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editCode"
              v-model="rowData.wCode"
              class="editable-input"
              autofocus
              @blur="(rowData.editCode = false), emits('updateCategory', { wCode: rowData.wCode, _id: rowData._id })"
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editCode = true">
              <span>{{ rowData.wCode || '' }}</span>
              <Pencil
                v-if="rowData.wCode"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <CirclePlus
                v-else
                class="w-4 h-4 text-slate-300 cursor-pointer hover:text-blue-500 transition-colors"
                @click.stop="rowData.editCode = true"
              />
            </div>
          </div>
        </template>

        <!-- SUB-CATEGORIES -->
        <template #cell(sub_categories)="{ rowData }">
          <div class="flex flex-col items-center gap-1">
            <template v-if="rowData.subCategories.length > 0">
              <template v-if="rowData.subCategories.length <= 2">
                <span
                  v-for="sub in rowData.subCategories"
                  :key="sub.wCode"
                  class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-blue-800 bg-blue-100 hover:bg-blue-200 cursor-pointer transition-colors text-center"
                  @click="emits('updateCategoryModal', { ...rowData, updating: 'subCategory' })"
                >
                  {{ sub.name }}
                </span>
              </template>
              <template v-else>
                <span
                  v-for="sub in rowData.subCategories.slice(0, 2)"
                  :key="sub.wCode"
                  class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-blue-800 bg-blue-100 hover:bg-blue-200 cursor-pointer transition-colors text-center"
                  @click="emits('updateCategoryModal', { ...rowData, updating: 'subCategory' })"
                >
                  {{ sub.name }}
                </span>
                <span
                  class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-blue-800 bg-blue-50 cursor-pointer transition-colors text-center"
                  @click="emits('updateCategoryModal', { ...rowData, updating: 'subCategory' })"
                >
                  +{{ rowData.subCategories.length - 2 }} more
                </span>
              </template>
            </template>

            <!-- EMPTY CASE: Show plus icon -->
            <template v-else>
              <CirclePlus
                class="w-4 h-4 text-slate-300 cursor-pointer hover:text-blue-500 transition-colors"
                @click.stop="emits('updateCategoryModal', { ...rowData, updating: 'subCategory' })"
              />
            </template>
          </div>
        </template>

        <!-- AREA COLUMN -->
        <template #cell(area)="{ rowData }">
          <div class="flex flex-col items-center gap-1">
            <template v-if="rowData.areaId && rowData.areaId.length">
              <!-- Show up to 2 areas -->
              <span
                v-for="area in rowData.areaId.slice(0, 2)"
                :key="area"
                class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-green-800 bg-green-100 hover:bg-green-200 cursor-pointer transition-colors text-center"
                @click="emits('updateCategoryModal', { ...rowData, updating: 'area' })"
              >
                {{ areas.find((a) => a.value === area)?.text || '' }}
              </span>
              <!-- Show +X more if more than 2 -->
              <span
                v-if="rowData.areaId.length > 2"
                class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-green-800 bg-green-50 cursor-pointer transition-colors text-center"
                @click="emits('updateCategoryModal', { ...rowData, updating: 'area' })"
              >
                +{{ rowData.areaId.length - 2 }} more
              </span>
            </template>

            <!-- Empty state: show plus icon -->
            <template v-else>
              <CirclePlus
                class="w-4 h-4 text-slate-300 cursor-pointer hover:text-blue-500 transition-colors"
                @click="emits('updateCategoryModal', { ...rowData, updating: 'area' })"
              />
            </template>
          </div>
        </template>

        <!-- SCHEDULE -->
        <template #cell(schedule)="{ rowData }">
          <div
            class="ellipsis text-center cursor-pointer"
            @click="emits('updateCategoryModal', { ...rowData, updating: 'schedule' })"
          >
            {{
              rowData.schedule
                ? rowData.schedule.selected === 'is24h'
                  ? '24 Hours'
                  : rowData.schedule.selected === 'daily'
                    ? `${rowData.schedule.daily.opens || ''} - ${rowData.schedule.daily.closes || ''}`
                    : rowData.schedule.selected === 'byDay'
                      ? 'By Day'
                      : '-'
                : '-'
            }}
          </div>
        </template>

        <!-- ACTIVE -->
        <template #cell(isActive)="{ rowData }">
          <div class="flex justify-center items-center">
            <label class="relative inline-block w-9 h-5 cursor-pointer">
              <input
                v-model="rowData.isActive"
                type="checkbox"
                class="sr-only"
                @change="emits('updateCategory', { ...rowData })"
              />
              <span
                class="block rounded-full h-5 w-9 transition-colors duration-300 ease-in-out"
                :class="rowData.isActive ? 'bg-emerald-500' : 'bg-slate-300'"
              ></span>
              <span
                class="absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out"
                :class="rowData.isActive ? 'translate-x-4' : 'translate-x-1'"
              ></span>
            </label>
          </div>
        </template>

        <!-- ACTIONS -->
        <template #cell(actions)="{ rowData }">
          <div class="flex justify-end items-center gap-1">
            <button
              class="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors duration-150 active:scale-95"
              title="Edit Category"
              @click="emits('updateCategoryModal', rowData)"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>

            <button
              class="flex items-center justify-center w-7 h-7 rounded-lg text-red-600 hover:bg-red-100 transition-colors duration-150 active:scale-95"
              title="Delete Category"
              @click="onButtonCategoryDelete(rowData)"
            >
              <VaIcon name="mso-delete" class="w-4.5 h-4.5 block" />
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
}
</style>
