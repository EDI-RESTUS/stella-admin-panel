<script setup lang="ts">
import { defineVaDataTableColumns, useModal, useToast } from 'vuestic-ui'
import { ref, reactive, computed, watch, onMounted, onUnmounted, toRef } from 'vue'
import { useServiceStore } from '@/stores/services'
import EditArticleOptionModal from '../modals/EditArticleOptionModal.vue'
import FileUpload from '@/components/file-uploader/FileUpload.vue'
import axios from 'axios'
import { Search, Plus, Columns3, Pencil, CirclePlus, Copy } from 'lucide-vue-next'

const isEditArticleOptionModal = ref(false)
const selectedOptions = ref('')
const activeOnly = ref(true)
const columnVisibility = reactive<Record<string, boolean>>({})
const showColumnsMenu = ref(false)
const columnsMenuWrapper = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const searchTimeout = ref<number | null>(null)
const stockUpdating = ref(new Set()) // Track which rows are currently updating stock
const rowSelectedZones = reactive<Record<string, string[]>>({}) // Track selected delivery zones per row

const emits = defineEmits(['getOptions', 'editOption', 'cloneArticle', 'sortBy', 'sortingOrder', 'updateOptionModal', 'getOptionsForPagination', 'update:currentPage', 'activeOnlyChanged'])
const props = defineProps({
  items: { type: Array, required: true },
  count: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  currentPage: { type: Number, default: 1 },
  deliveryZones: { type: Array, default: () => [] },
  initialStockMap: { type: Object, default: () => ({}) },
})

const { confirm } = useModal()
const { init } = useToast()
const servicesStore = useServiceStore()
const selectedRest = computed(() => servicesStore.selectedRest)

const pages = computed(() => Math.ceil(props.count / 50) || 1)

function changePage(page: number) {
  emits('update:currentPage', page)
  emits('getOptionsForPagination', { page, searchQuery: searchQuery.value })
}

const columns = defineVaDataTableColumns([
  { label: 'Image', key: 'imageUrl' },
  { label: 'Name', key: 'name', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'POS Name', key: 'posName', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Code', key: 'code', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Type', key: 'type', sortable: false, thAlign: 'center' },
  { label: 'Price', key: 'price', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Min', key: 'minimumChoices', sortable: false },
  { label: 'Max', key: 'maximumChoices', sortable: false },
  { label: 'Active', key: 'isActive', sortable: false, thAlign: 'center' },
  { label: 'In Stock', key: 'inStock', sortable: false, thAlign: 'center' },
  { label: 'Actions', key: 'actions', sortable: false },
])

const typeOptions = ['Extra', 'Hold', 'Modifier', 'Article']
const items = toRef(props, 'items')
function getTypeClasses(type) {
  switch (type) {
    case 'Article':
    case 'article':
      return 'text-blue-800 bg-blue-100 hover:bg-blue-200'
    case 'Extra':
    case 'extra':
      return 'text-green-800 bg-green-100 hover:bg-green-200'
    case 'Hold':
    case 'hold':
      return 'text-red-800 bg-red-100 hover:bg-red-200'
    case 'Modifier':
    case 'modifier':
      return 'text-yellow-800 bg-yellow-100 hover:bg-yellow-200'
    default:
      return 'text-slate-800 bg-slate-100 hover:bg-slate-200'
  }
}
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    props.items.forEach((i) => (i.showTypeDropdown = false))
  }
  const handleZoneClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target?.closest('.stock-zone-wrapper')) return
    props.items.forEach((item: any) => {
      if (item._showZoneMenu) item._showZoneMenu = false
    })
  }
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('click', handleZoneClickOutside)
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('click', handleZoneClickOutside)
  })
})
// Column visibility
onMounted(() => {
  const saved = localStorage.getItem('optionsColumnVisibility')
  const savedVisibility = saved ? JSON.parse(saved) : {}
  columns.forEach((c) => {
    // If key exists in saved, use it; otherwise default to true (new column)
    columnVisibility[c.key] = savedVisibility.hasOwnProperty(c.key) ? savedVisibility[c.key] : true
  })

  const handleClickOutside = (event: MouseEvent) => {
    if (columnsMenuWrapper.value && !columnsMenuWrapper.value.contains(event.target as Node)) {
      showColumnsMenu.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => document.removeEventListener('click', handleClickOutside))
})

watch(columnVisibility, (val) => localStorage.setItem('optionsColumnVisibility', JSON.stringify(val)), { deep: true })
const visibleColumns = computed(() => columns.filter((c) => columnVisibility[c.key]))
function resetColumnVisibility() {
  columns.forEach((c) => (columnVisibility[c.key] = true))
}

// Search debounce
watch(searchQuery, () => {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = window.setTimeout(() => emits('getOptions', searchQuery.value), 500)
})

// Emit activeOnly changes so parent can re-fetch with server-side filter
watch(activeOnly, (val) => {
  emits('activeOnlyChanged', val)
}, { immediate: true })

// Update option
async function updateData(rowData) {
  const url = import.meta.env.VITE_API_BASE_URL
  const data = { ...rowData, outletId: selectedRest.value }
  try {
    await axios.patch(`${url}/articles-options/${rowData._id}`, data)
    init({ message: 'Option successfully updated', color: 'success' })
  } catch (err: any) {
    init({ message: err.response?.data?.message || err.message, color: 'danger' })
  }
}
const filteredItems = computed(() => items.value)
// Delete & clone
const onButtonOptionsDelete = async (payload) => {
  const result = await confirm({
    message: 'Are you sure?',
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Option',
  })
  if (!result) return

  try {
    await updateData({ ...payload, isDeleted: true })
    emits('getOptions', searchQuery.value)
  } catch (err) {
    console.error(err)
  }
}
const cloneArticle = (article) => {
  const clonedData = { ...article }
  delete clonedData._id
  delete clonedData.createdAt
  delete clonedData.updatedAt
  delete clonedData.__v
  selectedOptions.value = { ...clonedData, name: `${clonedData.name}` }
  isEditArticleOptionModal.value = true
}
function openFileModal(data) {
  document.getElementById('file-upload-' + data._id)?.click()
}
const deleteAsset = async (assetId: string) => {
  await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/assets/${assetId}`)
  init({ message: 'Asset deleted successfully', color: 'success' })
}
const onButtonOptionImageDelete = async (payload) => {
  const result = await confirm({
    message: 'Delete this image?',
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Image',
  })
  if (!result) return
  try {
    if (payload.assetId?._id) await deleteAsset(payload.assetId._id)
    payload.imageUrl = ''
    payload.assetId = ''
    await updateData(payload)
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to delete image', color: 'danger' })
  }
}
function formatPrice(value) {
  const parts = parseFloat(value).toString().split('.')
  if (parts.length === 1) return `${parts[0]}.00`
  if (parts[1].length === 1) return `${parts[0]}.${parts[1]}0`
  return parseFloat(value).toFixed(Math.min(parts[1].length, 3))
}

// Initialize rowSelectedZones from the initialStockMap prop (API data)
watch(
  () => props.initialStockMap,
  (newMap) => {
    Object.keys(rowSelectedZones).forEach((key) => delete rowSelectedZones[key])
    Object.entries(newMap).forEach(([optionId, zoneIds]) => {
      rowSelectedZones[optionId] = [...(zoneIds as string[])]
    })
  },
  { immediate: true, deep: true },
)

const toggleZoneStock = async (rowData: any, zoneId: string, inStock: boolean) => {
  const key = `${rowData._id}_${zoneId}`
  stockUpdating.value.add(key)
  try {
    const url = import.meta.env.VITE_API_BASE_URL
    // Build updated inStockByZones array
    const currentZones = Array.isArray(rowData.inStockByZones) ? [...rowData.inStockByZones] : []
    const idx = currentZones.findIndex((z: any) => z.deliveryZoneId === zoneId)
    if (idx >= 0) {
      currentZones[idx] = { ...currentZones[idx], inStock }
    } else {
      currentZones.push({ deliveryZoneId: zoneId, inStock })
    }
    await axios.patch(`${url}/articles-options/${rowData._id}`, {
      inStockByZones: currentZones,
      outletId: selectedRest.value,
    })
    // Update the row data in-place so it stays in sync
    rowData.inStockByZones = currentZones
    // Update local tracking
    if (!rowSelectedZones[rowData._id]) rowSelectedZones[rowData._id] = []
    if (inStock) {
      if (!rowSelectedZones[rowData._id].includes(zoneId)) {
        rowSelectedZones[rowData._id].push(zoneId)
      }
    } else {
      rowSelectedZones[rowData._id] = rowSelectedZones[rowData._id].filter((id) => id !== zoneId)
    }
    const zone = props.deliveryZones.find((z: any) => z._id === zoneId)
    const zoneName = zone ? (zone as any).name : zoneId
    init({ message: `${zoneName}: ${inStock ? 'In Stock' : 'Out of Stock'}`, color: 'success' })
  } catch (err) {
    init({ message: 'Failed to update zone stock', color: 'danger' })
    console.error('[OptionsTable] Stock update failed:', err)
  } finally {
    stockUpdating.value.delete(key)
  }
}
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
              $route.name === 'articlesOptionsGroups' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200',
            ]"
            @click="$router.push({ name: 'articlesOptionsGroups' })"
          >
            Option Groups
          </button>
          <button
            :class="[
              'whitespace-nowrap px-4 text-base font-medium transition-colors',
              $route.name === 'articlesOptionsList' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200',
            ]"
            @click="$router.push({ name: 'articlesOptionsList' })"
          >
            Options
          </button>
        </div>
        <!-- COUNTER -->
        <div
          class="h-9 flex items-center px-3 text-sm font-medium rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        >
          {{ props.count }}
        </div>
        <!-- SEARCH -->
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

      <div class="flex items-center gap-2">
        <!-- Active Only Toggle -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-slate-700">Active Only</span>
          <label class="relative inline-block w-9 h-5 cursor-pointer">
            <input v-model="activeOnly" type="checkbox" class="sr-only" />
            <span
              :class="activeOnly ? 'bg-emerald-500' : 'bg-slate-300'"
              class="block rounded-full h-5 w-9 transition-colors duration-300 ease-in-out"
            ></span>
            <span
              :class="activeOnly ? 'translate-x-4' : 'translate-x-1'"
              class="absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out"
            ></span>
          </label>
        </div>

        <!-- Columns Dropdown -->
        <div ref="columnsMenuWrapper" class="relative">
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-white/60 backdrop-blur-md border border-slate-200 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-200"
            @click="showColumnsMenu = !showColumnsMenu"
          >
            <Columns3 class="w-4 h-4" /> Columns
          </button>

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

        <!-- Add Option -->
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md"
          @click="isEditArticleOptionModal = true"
        >
          <Plus class="w-4 h-4" /> Add Option
        </button>
      </div>
    </div>

    <!-- DATA TABLE -->
    <div class="flex flex-col h-[calc(100vh-12rem)]">
      <VaDataTable
        :columns="visibleColumns"
        :items="filteredItems"
        :loading="$props.loading"
        sticky-header
        :disable-client-side-sorting="true"
        :style="{ '--va-data-table-thead-background': '#f8fafc', '--va-data-table-thead-color': '#64748b' }"
        @update:sortBy="(sortBy) => emits('sortBy', sortBy)"
        @update:sortingOrder="(sortDesc) => emits('sortingOrder', sortDesc)"
      >
        <!-- IMAGE -->
        <template #cell(imageUrl)="{ rowData }">
          <div class="relative group w-12 h-12 overflow-hidden rounded shadow-lg">
            <!-- Dark overlay on hover -->
            <div
              class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded"
            ></div>

            <!-- Image Display -->
            <img
              :src="rowData.imageUrl || '/missing-image.png'"
              alt="Article Image"
              class="w-full h-full object-cover cursor-pointer"
              @click="openFileModal(rowData)"
              @error="
                (e) => {
                  e.target.src = '/missing-image.png'
                }
              "
            />

            <!-- Add Image Button (top-left) -->
            <VaButton
              preset="plain"
              size="small"
              class="!absolute !top-0.5 !left-0.5 !p-0 !w-5 !h-5 !rounded-full hidden group-hover:flex items-center justify-center z-20 hover:scale-110 transition-transform duration-50"
              @click.prevent="openFileModal(rowData)"
            >
              <VaIcon name="mso-add_photo_alternate" class="text-white" />
            </VaButton>

            <!-- Delete Button (bottom-right) -->
            <VaButton
              v-if="rowData.imageUrl"
              preset="plain"
              size="small"
              class="!absolute !bottom-0.5 !right-0.5 !p-0 !w-5 !h-5 !rounded-full hidden group-hover:flex items-center justify-center z-20 hover:scale-110 transition-transform duration-50"
              @click.prevent="onButtonOptionImageDelete(rowData)"
            >
              <VaIcon name="mso-delete" class="text-red-500" />
            </VaButton>

            <!-- Hidden FileUpload -->
            <FileUpload
              :attr-id="'file-upload-' + rowData._id"
              class="hidden"
              :selected-rest="selectedRest"
              @uploadSuccess="
                (data) => {
                  rowData.imageUrl = data.url
                  rowData.assetId = data._id
                  updateData(rowData)
                }
              "
            />
          </div>
        </template>

        <!-- NAME -->
        <template #cell(name)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editName"
              v-model="rowData.name"
              class="editable-input"
              autofocus
              @blur="
                rowData.editName = false;
                updateData(rowData)
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editName = true">
              <span>{{ rowData.name || '' }}</span>
              <Pencil
                v-if="rowData.name"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <CirclePlus v-else class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors" />
            </div>
          </div>
        </template>

        <!-- POS NAME -->
        <template #cell(posName)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editPOSName"
              v-model="rowData.posName"
              class="editable-input"
              autofocus
              @blur="
                rowData.editPOSName = false;
                updateData(rowData)
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editPOSName = true">
              <span>{{ rowData.posName || '' }}</span>
              <Pencil
                v-if="rowData.posName"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <CirclePlus v-else class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors" />
            </div>
          </div>
        </template>

        <!-- CODE -->
        <template #cell(code)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editCode"
              v-model="rowData.code"
              class="editable-input"
              autofocus
              @blur="
                rowData.editCode = false;
                updateData(rowData)
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editCode = true">
              <span>{{ rowData.code || '' }}</span>
              <Pencil
                v-if="rowData.code"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <CirclePlus v-else class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors" />
            </div>
          </div>
        </template>

        <!-- TYPE -->
        <template #cell(type)="{ rowData }">
          <div class="relative flex justify-center items-center">
            <!-- Pill button -->
            <button
              :class="[
                getTypeClasses(rowData.type),
                'flex items-center gap-1 px-3 py-1.5 text-sm rounded-full font-medium transition-colors',
              ]"
              @click.stop="rowData.showTypeDropdown = !rowData.showTypeDropdown"
            >
              {{
                rowData.type
                  ? {
                      extra: 'Extra',
                      hold: 'Hold',
                      modifier: 'Modifier',
                      article: 'Article',
                    }[rowData.type.toLowerCase()] || rowData.type
                  : ''
              }}
              <svg
                class="w-4 h-4 transition-transform duration-200"
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
                class="px-3 py-1.5 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer text-center transition-colors duration-150"
                @click="
                  rowData.type = option.key || option;
                  updateData(rowData);
                  rowData.showTypeDropdown = false
                "
              >
                {{ option }}
              </div>
            </div>
          </div>
        </template>

        <!-- PRICE -->
        <template #cell(price)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editPrice"
              v-model="rowData.price"
              type="number"
              class="editable-input"
              autofocus
              @blur="
                rowData.editPrice = false;
                updateData(rowData)
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editPrice = true">
              <span>
                {{ rowData.price ? `€ ${formatPrice(rowData.price)}` : '' }}
              </span>

              <!-- Pencil icon for non-zero price -->
              <Pencil
                v-if="rowData.price && rowData.price !== 0"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />

              <!-- Plus icon for empty or zero price -->
              <CirclePlus
                v-else
                class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors"
                @click.stop="rowData.editPrice = true"
              />
            </div>
          </div>
        </template>

        <!-- MIN -->
        <template #cell(minimumChoices)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editMinimumChoices"
              v-model="rowData.minimumChoices"
              type="number"
              class="editable-input"
              autofocus
              @blur="
                rowData.editMinimumChoices = false;
                updateData(rowData)
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editMinimumChoices = true">
              <span>{{ rowData.minimumChoices }}</span>
              <Pencil
                v-if="rowData.minimumChoices !== null && rowData.minimumChoices !== undefined"
                class="w-4 h-4 ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <CirclePlus v-else class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors" />
            </div>
          </div>
        </template>

        <!-- MAX -->
        <template #cell(maximumChoices)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editMaximumChoices"
              v-model="rowData.maximumChoices"
              type="number"
              class="editable-input"
              autofocus
              @blur="
                rowData.editMaximumChoices = false;
                updateData(rowData)
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editMaximumChoices = true">
              <span>{{ rowData.maximumChoices }}</span>
              <Pencil
                v-if="rowData.maximumChoices !== null && rowData.maximumChoices !== undefined"
                class="w-4 h-4 ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <CirclePlus v-else class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors" />
            </div>
          </div>
        </template>

        <!-- ACTIVE -->
        <template #cell(isActive)="{ rowData }">
          <div class="flex justify-center items-center">
            <label class="relative inline-block w-9 h-5 cursor-pointer">
              <input v-model="rowData.isActive" type="checkbox" class="sr-only" @change="updateData(rowData)" />
              <span
                :class="rowData.isActive ? 'bg-emerald-500' : 'bg-slate-300'"
                class="block rounded-full h-5 w-9 transition-colors duration-300"
              ></span>
              <span
                :class="rowData.isActive ? 'translate-x-4' : 'translate-x-1'"
                class="absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300"
              ></span>
            </label>
          </div>
        </template>

        <!-- IN STOCK (per-zone dropdown) -->
        <template #cell(inStock)="{ rowData }">
          <div class="flex flex-col items-center gap-1" style="min-width: 140px">
            <template v-if="deliveryZones.length > 0">
              <div class="relative stock-zone-wrapper w-full">
                <!-- Trigger button -->
                <button
                  class="flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200"
                  :class="(rowSelectedZones[rowData._id] || []).length > 0
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'"
                  @click.stop="rowData._showZoneMenu = !rowData._showZoneMenu"
                >
                  <span class="truncate">
                    <template v-if="(rowSelectedZones[rowData._id] || []).length > 0">
                      {{ (rowSelectedZones[rowData._id] || []).length }} Zone{{ (rowSelectedZones[rowData._id] || []).length > 1 ? 's' : '' }}
                    </template>
                    <template v-else>
                      Select zone
                    </template>
                  </span>
                  <svg class="w-3 h-3 flex-shrink-0 ml-1 transition-transform" :class="rowData._showZoneMenu ? 'rotate-180' : ''" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                  </svg>
                </button>

                <!-- Dropdown menu -->
                <div
                  v-if="rowData._showZoneMenu"
                  class="absolute left-0 top-full mt-1 w-48 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl p-2 z-50"
                >
                  <div class="flex flex-col gap-0.5 max-h-[200px] overflow-auto">
                    <label
                      v-for="zone in deliveryZones"
                      :key="zone._id"
                      class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <!-- Loading spinner for this specific zone+row -->
                      <div
                        v-if="stockUpdating.has(`${rowData._id}_${zone._id}`)"
                        class="animate-spin w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full flex-shrink-0"
                      ></div>
                      <input
                        v-else
                        type="checkbox"
                        class="accent-emerald-500 h-3.5 w-3.5 rounded flex-shrink-0"
                        :checked="(rowSelectedZones[rowData._id] || []).includes(zone._id)"
                        @change="(e) => toggleZoneStock(rowData, zone._id, (e.target as HTMLInputElement).checked)"
                      />
                      <span class="truncate text-slate-700">{{ zone.name }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <span class="text-xs text-slate-400 italic">No zones</span>
            </template>
          </div>
        </template>

        <!-- ACTIONS -->
        <template #cell(actions)="{ rowData }">
          <div class="flex justify-end items-center gap-1">
            <button
              class="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors duration-150 active:scale-95"
              title="Duplicate Option"
              @click="cloneArticle(rowData)"
            >
              <Copy class="w-3.5 h-3.5" />
            </button>
            <button
              class="flex items-center justify-center w-7 h-7 rounded-lg text-red-600 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-700 transition-colors duration-150 active:scale-95"
              title="Delete Option"
              @click="onButtonOptionsDelete(rowData)"
            >
              <VaIcon name="mso-delete" class="w-4.5 h-4.5 block" />
            </button>
          </div>
        </template>
      </VaDataTable>

      <!-- Bottom Pagination -->
      <div v-if="pages > 1" class="flex justify-center py-3 border-t border-slate-200">
        <VaPagination :model-value="props.currentPage" :pages="pages" buttons-preset="secondary" gapped="20" :visible-pages="3" @update:modelValue="changePage">
          <template #firstPageLink="{ onClick, disabled }">
            <button
              class="px-3 py-1.5 font-bold border-slate-300 bg-white hover:bg-slate-100 transition disabled:opacity-50"
              :disabled="disabled"
              @click="onClick"
            >
              ‹‹
            </button>
          </template>
          <template #prevPageLink="{ onClick, disabled }">
            <button
              class="px-3 py-1.5 font-bold border-slate-300 bg-white hover:bg-slate-100 transition disabled:opacity-50"
              :disabled="disabled"
              @click="onClick"
            >
              ‹
            </button>
          </template>
          <template #nextPageLink="{ onClick, disabled }">
            <button
              class="px-3 py-1.5 font-bold border-slate-300 bg-white hover:bg-slate-100 transition disabled:opacity-50"
              :disabled="disabled"
              @click="onClick"
            >
              ›
            </button>
          </template>
          <template #lastPageLink="{ onClick, disabled }">
            <button
              class="px-3 py-1.5 font-bold border-slate-300 bg-white hover:bg-slate-100 transition disabled:opacity-50"
              :disabled="disabled"
              @click="onClick"
            >
              ››
            </button>
          </template>
        </VaPagination>
      </div>
    </div>

    <EditArticleOptionModal
      v-if="isEditArticleOptionModal"
      :selected-option="selectedOptions"
      @cancel="
        () => {
          isEditArticleOptionModal = false
          selectedOptions = ''
          emits('getOptions', searchQuery)
        }
      "
    />
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
