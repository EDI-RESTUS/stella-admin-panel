<script setup lang="ts">
import { defineVaDataTableColumns, useModal, useToast } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import { ref, toRef, watch, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useServiceStore } from '@/stores/services'
import { useUsersStore } from '@/stores/users'
import FileUpload from '@/components/file-uploader/FileUpload.vue'
import AddSelectionModal from '../modals/AddSelectionModal.vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { Plus, Search, CirclePlus, Pencil, Columns3 } from 'lucide-vue-next'

const { locale } = useI18n()

// Resolve a localized name/description field (may be string or Record<lang, string>)
function getLocalizedValue(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    return val[locale.value] || val['en'] || Object.values(val)[0] || ''
  }
  return ''
}

// Get the inline-edit string for a locale field (edits the primary/en key)
function getEditableValue(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  return val[locale.value] || val['en'] || ''
}

// Write back inline edits to the correct key on a locale object
function setLocaleValue(obj: any, field: string, value: string) {
  if (typeof obj[field] === 'string') {
    obj[field] = value
  } else if (obj[field] && typeof obj[field] === 'object') {
    const lang = locale.value || 'en'
    obj[field] = { ...obj[field], [lang]: value }
  } else {
    obj[field] = value
  }
}

const emits = defineEmits(['getOffers', 'editOffers', 'openOfferModal'])
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  loading: { type: Boolean, default: false },
  deliveryZones: {
    type: Array,
    default: () => [],
  },
  initialStockMap: {
    type: Object,
    default: () => ({}),
  },
})

const isAddSelectionModalOpen = ref(false)
const onAddOfferClick = () => {
  emits('openOfferModal')
}
const { confirm } = useModal()
const { init } = useToast()
const offerData = ref('')
const offerSelection = ref('')
const isEditSelection = ref(false)
const router = useRouter()
const filterMode = ref(2)
const servicesStore = useServiceStore()
const userStore = useUsersStore()
const stockUpdating = ref(new Set()) // Track which rows are currently updating stock
const rowSelectedZones = reactive<Record<string, string[]>>({}) // Track selected delivery zones per row
const columns = defineVaDataTableColumns([
  { label: 'Image', key: 'imageUrl' },
  { label: 'Name', key: 'name' },
  { label: 'Description', key: 'description' },
  { label: 'Code', key: 'code', width: '90px' },
  { label: 'Price', key: 'price', width: '90px' },
  { label: 'Date Range', key: 'startDate', thAlign: 'center' },
  { label: 'Time Range', key: 'timeRange', thAlign: 'center' },
  { label: 'Week Days', key: 'weeklyOffer', thAlign: 'center', width: '190px' },
  { label: 'Order Type', key: 'orderType' },
  { label: 'Selections', key: 'selections', thAlign: 'center' },
  { label: 'In Stock', key: 'inStock', thAlign: 'center' },
  { label: 'Active', key: 'isActive', thAlign: 'center' },
  { label: 'Actions', key: 'actions' },
])
const columnsVisibility = reactive<Record<string, boolean>>({})

// Initialize visibility to true for all columns
columns.forEach((c) => (columnsVisibility[c.key] = true))

// Storage key for persistence
const storageKey = computed(() => `offers_columns_visibility`)
function cycleFilterMode() {
  // 0 = Inactive, 1 = All, 2 = Active
  filterMode.value = (filterMode.value + 1) % 3
}

// Load column visibility from localStorage
function loadColumnVisibility() {
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (!raw) return
    const parsed = JSON.parse(raw)
    columns.forEach((c) => {
      if (Object.prototype.hasOwnProperty.call(parsed, c.key)) {
        columnsVisibility[c.key] = !!parsed[c.key]
      }
    })
  } catch (e) {
    console.warn('Failed to load column visibility', e)
  }
}

// Save column visibility to localStorage
function saveColumnVisibility() {
  try {
    const payload: Record<string, boolean> = {}
    columns.forEach((c) => (payload[c.key] = !!columnsVisibility[c.key]))
    localStorage.setItem(storageKey.value, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save column visibility', e)
  }
}

// Reset all columns to visible
function resetColumnVisibility() {
  columns.forEach((c) => (columnsVisibility[c.key] = true))
  localStorage.removeItem(storageKey.value)
  saveColumnVisibility()
}

// Compute visible columns dynamically
const visibleColumns = computed(() =>
  defineVaDataTableColumns(columns.filter((c) => columnsVisibility[c.key] !== false)),
)

// Watch changes and save
watch(
  () => Object.fromEntries(columns.map((c) => [c.key, columnsVisibility[c.key]])),
  () => saveColumnVisibility(),
  { deep: true },
)

onMounted(() => loadColumnVisibility())

// Initialize rowSelectedZones from the initialStockMap prop (API data)
watch(
  () => props.initialStockMap,
  (newMap) => {
    Object.keys(rowSelectedZones).forEach((key) => delete rowSelectedZones[key])
    Object.entries(newMap).forEach(([offerId, zoneIds]) => {
      rowSelectedZones[offerId] = [...(zoneIds as string[])]
    })
  },
  { immediate: true, deep: true },
)

const toggleZoneStock = async (rowData: any, zoneId: string, inStock: boolean) => {
  const key = `${rowData._id}_${zoneId}`
  stockUpdating.value.add(key)
  try {
    const url = import.meta.env.VITE_API_BASE_URL
    await axios.put(`${url}/offers/${rowData._id}`, {
      deliveryZoneId: zoneId,
      inStock,
    })
    // Update the row data in-place so it stays in sync
    const currentZones = Array.isArray(rowData.inStockByZones) ? [...rowData.inStockByZones] : []
    const idx = currentZones.findIndex((z: any) => z.deliveryZoneId === zoneId)
    if (idx >= 0) {
      currentZones[idx] = { ...currentZones[idx], inStock }
    } else {
      currentZones.push({ deliveryZoneId: zoneId, inStock })
    }
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
    console.error('[OfferTable] Stock update failed:', err)
  } finally {
    stockUpdating.value.delete(key)
  }
}

// Dropdown state
const showColumnsMenu = ref(false)
const columnsMenuWrapper = ref<HTMLElement | null>(null)

// Close dropdown on outside click
function onDocumentClick(e: MouseEvent) {
  if (!columnsMenuWrapper.value) return
  if (!columnsMenuWrapper.value.contains(e.target as Node)) {
    showColumnsMenu.value = false
  }
}

// Close zone dropdown menus on outside click
function onDocumentClickZone(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target?.closest('.stock-zone-wrapper')) return
  props.items.forEach((item: any) => {
    if (item._showZoneMenu) item._showZoneMenu = false
  })
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('click', onDocumentClickZone)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('click', onDocumentClickZone)
})
const selectionColumns = defineVaDataTableColumns([
  { label: 'Name', key: 'name' },
  { label: 'Options', key: 'menuItems' },
  { label: 'Min Choice', key: 'min' },
  { label: 'Max Choice', key: 'max' },
  { label: 'Actions', key: 'actions' },
])
const totalVisibleCount = computed(() => filteredItems.value.length)
const searchQuery = ref('')
const filteredItems = ref([])
watch(
  [() => props.items, searchQuery, filterMode],
  ([newItems, query, mode]) => {
    const lowerQuery = query.toLowerCase().trim()
    let mappedItems = newItems.map((item) => ({ ...item }))

    // Filter by active mode
    if (mode === 0) {
      // Only inactive
      mappedItems = mappedItems.filter((item) => !item.isActive)
    } else if (mode === 2) {
      // Only active
      mappedItems = mappedItems.filter((item) => item.isActive)
    }

    // Search filter
    if (lowerQuery) {
      mappedItems = mappedItems.filter((item) =>
        [getLocalizedValue(item.name), item.code].filter(Boolean).some((field) => field.toLowerCase().includes(lowerQuery)),
      )
    }

    filteredItems.value = mappedItems
  },
  { immediate: true },
)

const IsActive = ref(true)

const weekdayShortMap = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

function isValidDateString(dateStr) {
  return !!dateStr && !isNaN(new Date(dateStr).getTime())
}

async function updateData(rowData) {
  if (!rowData._id) {
    console.error('Missing _id for offer update:', rowData)
    init({ message: 'Offer ID missing, cannot update.', color: 'danger' })
    return
  }

  const url = import.meta.env.VITE_API_BASE_URL

  const startDate = rowData.dateOffer?.startDate
  const endDate = rowData.dateOffer?.endDate

  const data = {
    isActive: rowData.isActive,
    name: rowData.name,
    description: rowData.description,
    price: rowData.price,
    code: rowData.code,
    imageUrl: rowData.imageUrl,
    dateOffer: {
      startDate: isValidDateString(startDate) ? new Date(startDate).toISOString() : '',
      endDate: isValidDateString(endDate) ? new Date(endDate).toISOString() : '',
    },
    timeOffer: {
      startTime: rowData.timeOffer?.startTime || '',
      endTime: rowData.timeOffer?.endTime || '',
    },
    weeklyOffer: rowData.weeklyOffer || [],
    orderType: rowData.orderType,
    selections: rowData.selections,
  }

  try {
    await axios.put(`${url}/offers/${rowData._id}`, data)
    init({ message: "You've successfully updated", color: 'success' })
    if (!rowData.fromInlineEdit) {
      emits('getOffers')
    }
  } catch (err) {
    init({ message: err.response?.data?.error || 'Update failed', color: 'danger' })
  }
}

const onButtonOfferDelete = async (payload) => {
  const result = await confirm({
    message: 'Are you sure you want to see delete this Offer?',
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Offer',
  })
  if (result) {
    deleteOffer(payload)
  }
}

const onDeleteSelection = async (payload) => {
  const result = await confirm({
    message: 'Are you sure you want to see delete this Offer selection?',
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Offer Selection',
  })
  if (result) {
    deleteSelection(payload)
  }
}

async function deleteOffer(payload) {
  await axios
    .delete(`${import.meta.env.VITE_API_BASE_URL}/offers/${payload._id}`)
    .then(() => {
      init({ message: 'Offer deleted successfully', color: 'success' })
      emits('getOffers')
    })
    .catch((err) => {
      init({ message: err.response?.data?.error || 'Delete failed', color: 'danger' })
    })
}

async function deleteSelection(payload) {
  const updatedSelections = payload.selections.filter((selection) => selection._id !== payload.selectionId)

  await axios
    .put(`${import.meta.env.VITE_API_BASE_URL}/offers/${payload.offerId}/selections`, {
      selections: updatedSelections,
    })
    .then(() => {
      payload.selections.length = 0
      payload.selections.push(...updatedSelections)

      init({ message: 'Selection deleted successfully', color: 'success' })
    })
    .catch((err) => {
      init({ message: err.response?.data?.error || 'Delete failed', color: 'danger' })
    })
}

const items = toRef(props, 'items')
watch(
  () => props.items,
  (newItems) => {
    items.value = newItems.map((item) => ({ ...item }))
  },
)
function toggleDay(rowData, day: string) {
  if (!rowData.weeklyOffer) rowData.weeklyOffer = []

  const dayLower = day.toLowerCase()
  const index = rowData.weeklyOffer.map((d) => d.toLowerCase()).indexOf(dayLower)

  if (index >= 0) {
    // Day is present → remove it
    rowData.weeklyOffer.splice(index, 1)
  } else {
    // Day is not present → add it
    rowData.weeklyOffer.push(day)
  }

  // Persist the change
  updateData(rowData)
}

const selectedRest = toRef(servicesStore, 'selectedRest')
const isGroupActive = (offerDays, groupDays) => {
  if (!Array.isArray(offerDays)) return false
  const lowerDays = offerDays.map((d) => d.toLowerCase())
  return groupDays.some((day) => lowerDays.includes(day))
}
function openFileModal(data) {
  console.log(data)
  document.getElementById('file-upload-' + data._id).click()
}
const deleteAsset = async (assetId) => {
  const url: any = import.meta.env.VITE_API_BASE_URL
  await axios
    .delete(`${url}/assets/${assetId}`)
    .then(() => {
      init({ message: 'Asset deleted successfully', color: 'success' })
    })
    .catch((err) => {
      init({ message: err.response.data.error, color: 'danger' })
    })
}
const onButtonOptionImageDelete = async (payload) => {
  const result = await confirm({
    message: 'Are you sure you want to delete this image?',
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Image',
  })

  if (!result) return

  try {
    if (payload.assetId && payload.assetId._id) {
      await deleteAsset(payload.assetId._id)
    }

    payload.imageUrl = ''
    payload.assetId = ''
    await updateData(payload)
  } catch (err) {
    init({ message: err?.response?.data?.message || 'Failed to delete image', color: 'danger' })
  }
}
function formatReadableDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)

  return `${day}/${month}/${year}`
}
</script>

<!-- PAGE -->
<template>
  <div>
    <!-- HEADER -->
    <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
      <!-- Left: Title + Counter + Search -->
      <div class="flex flex-1 min-w-0 items-center gap-2 flex-wrap">
        <!-- Title + Counter -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <h1 class="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Offers</h1>
          <div
            class="h-9 flex items-center px-3 text-sm font-medium rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          >
            {{ totalVisibleCount }}
          </div>
        </div>

        <!-- Search Bar -->
        <div
          class="relative flex-1 min-w-[150px] max-w-[300px] w-full sm:w-[240px] md:w-[300px] bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by Name or Code"
            class="w-full pl-9 pr-3 py-2 text-sm bg-transparent focus:outline-none text-slate-700 dark:text-slate-200 rounded-xl truncate"
          />
        </div>
      </div>

      <!-- Right: Buttons -->
      <div class="flex flex-wrap gap-2 justify-end items-center flex-shrink-0">
        <!-- Active Only -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200">Active Only</span>
          <label class="relative inline-block w-9 h-5 cursor-pointer" @click="cycleFilterMode">
            <!-- Track -->
            <span
              class="block rounded-full h-5 w-9 transition-colors duration-300 ease-in-out"
              :class="{
                'bg-red-500': filterMode === 0,
                'bg-slate-300': filterMode === 1,
                'bg-emerald-500': filterMode === 2,
              }"
            ></span>
            <!-- Thumb -->
            <span
              class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out"
              :class="{
                'translate-x-1': filterMode === 0,
                'translate-x-2.5': filterMode === 1,
                'translate-x-4': filterMode === 2,
              }"
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
            class="absolute left-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl p-4 z-50 transition-all duration-200"
          >
            <div class="flex flex-col gap-3 max-h-[420px] overflow-auto pr-1">
              <label
                v-for="col in columns"
                :key="col.key"
                class="flex items-center justify-between text-sm cursor-pointer text-slate-700 dark:text-slate-200 hover:text-blue-500"
              >
                <div class="flex items-center gap-2">
                  <input v-model="columnsVisibility[col.key]" type="checkbox" class="accent-blue-500 h-4 w-4 rounded" />
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

        <!-- Add Offer Button -->
        <button
          class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md h-10 w-10 md:w-auto md:h-auto"
          @click="onAddOfferClick"
        >
          <Plus class="w-4 h-4" />
          <span class="hidden md:inline">Add Offer</span>
        </button>
      </div>
    </div>

    <!-- TABLE -->
    <div class="flex flex-col h-[calc(100vh-12rem)]">
      <VaDataTable
        :columns="visibleColumns"
        :items="filteredItems"
        :loading="$props.loading"
        :style="{
          '--va-data-table-thead-background': '#f8fafc',
          '--va-data-table-thead-color': '#64748b',
        }"
        sticky-header
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
              alt="Offer Image"
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
                  rowData.editing = ''
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
              :value="getEditableValue(rowData.name)"
              class="editable-input"
              autofocus
              @input="(e) => setLocaleValue(rowData, 'name', (e.target as HTMLInputElement).value)"
              @blur="
                rowData.editName = false;
                updateData(rowData)
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editName = true">
              <span>{{ getLocalizedValue(rowData.name) || '' }}</span>
              <Pencil
                v-if="rowData.name"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <CirclePlus
                v-else
                class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors"
                @click.stop="rowData.editName = true"
              />
            </div>
          </div>
        </template>

        <!-- DESCRIPTION -->
        <template #cell(description)="{ rowData }">
          <div class="editable-field relative group">
            <textarea
              v-if="rowData.editDescription"
              :value="getEditableValue(rowData.description)"
              class="editable-input"
              rows="3"
              autofocus
              @input="(e) => setLocaleValue(rowData, 'description', (e.target as HTMLTextAreaElement).value)"
              @blur="
                rowData.editDescription = false;
                updateData(rowData)
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editDescription = true">
              <span>{{ getLocalizedValue(rowData.description) || '' }}</span>
              <Pencil
                v-if="rowData.description"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <CirclePlus
                v-else
                class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors"
                @click.stop="rowData.editDescription = true"
              />
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
              type="text"
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
              <CirclePlus
                v-else
                class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors"
                @click.stop="rowData.editCode = true"
              />
            </div>
          </div>
        </template>

        <!-- PRICE -->
        <template #cell(price)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editPrice"
              v-model="rowData.price"
              class="editable-input"
              type="text"
              autofocus
              @blur="
                rowData.editPrice = false;
                updateData(rowData)
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editPrice = true">
              <span>{{ rowData.price ? `€ ${parseFloat(rowData.price).toFixed(2)}` : '' }}</span>
              <Pencil
                v-if="rowData.price"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <CirclePlus
                v-else
                class="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors"
                @click.stop="rowData.editPrice = true"
              />
            </div>
          </div>
        </template>

        <!-- DATES -->
        <template #cell(startDate)="{ rowData }">
          <div class="flex justify-center items-center">
            {{ formatReadableDate(rowData.dateOffer?.startDate) }}
            <span v-if="rowData.dateOffer?.startDate && rowData.dateOffer?.endDate" class="mx-1 font-bold"> - </span>
            {{ formatReadableDate(rowData.dateOffer?.endDate) }}
          </div>
        </template>

        <!-- DAYS -->
        <template #cell(weeklyOffer)="{ rowData }">
          <div class="flex flex-col items-center gap-1">
            <!-- Top pill: Mon–Wed -->
            <div class="flex rounded-xl border overflow-hidden h-7">
              <span
                v-for="(day, index) in ['monday', 'tuesday', 'wednesday']"
                :key="day"
                class="flex-1 flex justify-center items-center text-xs font-medium transition-colors duration-150 px-2 cursor-pointer select-none"
                :class="
                  (rowData.weeklyOffer || []).map((d) => d.toLowerCase()).includes(day)
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                "
                :style="index > 0 ? 'border-left:1px solid rgba(100,116,139,0.3);' : ''"
                @click.stop="toggleDay(rowData, day)"
              >
                {{ weekdayShortMap[day] }}
              </span>
            </div>

            <!-- Bottom pill: Thu–Sun -->
            <div class="flex rounded-xl border overflow-hidden h-7">
              <span
                v-for="(day, index) in ['thursday', 'friday', 'saturday', 'sunday']"
                :key="day"
                class="flex-1 flex justify-center items-center text-xs font-medium transition-colors duration-150 px-2 cursor-pointer select-none"
                :class="
                  (rowData.weeklyOffer || []).map((d) => d.toLowerCase()).includes(day)
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                "
                :style="index > 0 ? 'border-left:1px solid rgba(100,116,139,0.3);' : ''"
                @click.stop="toggleDay(rowData, day)"
              >
                {{ weekdayShortMap[day] }}
              </span>
            </div>
          </div>
        </template>

        <!-- TIMES -->
        <template #cell(timeRange)="{ rowData }">
          <div class="flex justify-center items-center">
            {{ rowData.timeOffer?.startTime || '' }}
            <span v-if="rowData.timeOffer?.startTime && rowData.timeOffer?.endTime" class="mx-1 font-bold"> - </span>
            {{ rowData.timeOffer?.endTime || '' }}
          </div>
        </template>

        <!-- ORDER TYPE -->
        <template #cell(orderType)="{ rowData }">
          <div class="flex flex-col items-center justify-center text-center">
            <span
              v-for="type in rowData.orderType || []"
              :key="type"
              class="block text-slate-700 dark:text-slate-200 font-medium"
            >
              {{ type.charAt(0).toUpperCase() + type.slice(1) }}
            </span>
          </div>
        </template>

        <!-- SELECTIONS -->
        <template #cell(selections)="{ row, rowData, isExpanded }">
          <div class="relative flex justify-center items-center">
            <button
              class="flex items-center justify-center gap-1 px-3 py-1.5 text-sm rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors min-w-[3rem]"
              @click.stop="row.toggleRowDetails()"
            >
              <span>{{ rowData.selections?.length || 0 }}</span>
              <svg
                class="w-4 h-4 text-blue-700 transition-transform duration-200"
                :class="{ 'rotate-180': isExpanded }"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </template>

        <template #expandableRow="{ rowData }">
          <div class="expandable_table mt-2 mb-2 rounded-lg overflow-hidden border">
            <div class="flex justify-end p-4">
              <button
                class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md h-10 w-10 md:w-auto md:h-auto"
                @click="(isAddSelectionModalOpen = true), (offerData = rowData)"
              >
                <Plus class="w-4 h-4" />
                <span class="hidden md:inline">Add Selection</span>
              </button>
            </div>

            <table class="w-full table-fixed border-collapse">
              <thead>
                <tr class="text-left border-b">
                  <th class="py-2 px-3 w-[35%]">NAME</th>
                  <th class="py-2 px-3 w-[15%] text-center">CHOICES</th>
                  <th class="py-2 px-3 w-[15%] text-center">MIN CHOICES</th>
                  <th class="py-2 px-3 w-[15%] text-center">MAX CHOICES</th>
                  <th class="py-2 px-3 w-[20%] text-right">ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="selection in rowData.selections" :key="selection._id" class="border-b hover:bg-gray-50">
                  <td class="py-2 px-3">
                    <div v-if="!selection.editName" @click="selection.editName = true">{{ selection.name }}</div>
                    <input
                      v-else
                      v-model="selection.name"
                      class="w-full p-1 border rounded"
                      type="text"
                      @change="
                        () => {
                          updateData({ ...rowData, fromInlineEdit: true })
                          selection.editName = false
                        }
                      "
                    />
                  </td>

                  <td class="py-2 px-3 text-center">{{ selection.menuItems?.length || 0 }} Articles</td>

                  <td class="py-2 px-3 text-center">
                    <div v-if="!selection.editMinChoice" @click="selection.editMinChoice = true">
                      {{ selection.min }}
                    </div>
                    <input
                      v-else
                      v-model="selection.min"
                      class="w-full p-1 border rounded"
                      type="number"
                      @change="
                        () => {
                          updateData({ ...rowData, fromInlineEdit: true })
                          selection.editMinChoice = false
                        }
                      "
                    />
                  </td>

                  <td class="py-2 px-3 text-center">
                    <div v-if="!selection.editMaxChoice" @click="selection.editMaxChoice = true">
                      {{ selection.max }}
                    </div>
                    <input
                      v-else
                      v-model="selection.max"
                      class="w-full p-1 border rounded"
                      type="number"
                      @change="
                        () => {
                          updateData({ ...rowData, fromInlineEdit: true })
                          selection.editMaxChoice = false
                        }
                      "
                    />
                  </td>

                  <td class="py-2 px-3 text-right">
                    <div class="flex justify-end gap-2">
                      <!-- Edit Button -->
                      <button
                        class="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors duration-150 active:scale-95"
                        title="Edit Selection"
                        @click="
                          () => {
                            isAddSelectionModalOpen = true
                            offerData = rowData
                            isEditSelection = true
                            offerSelection = selection
                          }
                        "
                      >
                        <Pencil class="w-3.5 h-3.5" />
                      </button>

                      <!-- Delete Button -->
                      <button
                        class="flex items-center justify-center w-7 h-7 rounded-lg text-red-600 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-700 transition-colors duration-150 active:scale-95"
                        title="Delete Selection"
                        @click="onDeleteSelection({ ...rowData, selectionId: selection._id, offerId: rowData._id })"
                      >
                        <VaIcon name="mso-delete" class="w-4.5 h-4.5 block" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
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

        <!-- ACTIVE -->
        <template #cell(isActive)="{ rowData }">
          <div class="flex justify-center items-center">
            <label class="relative inline-block w-9 h-5 cursor-pointer">
              <input
                type="checkbox"
                :checked="rowData.isActive"
                class="sr-only"
                @change="updateData({ ...rowData, isActive: $event.target.checked })"
              />
              <span
                class="block rounded-full h-5 w-9 transition-colors duration-300 ease-in-out"
                :class="rowData.isActive ? 'bg-emerald-500' : 'bg-red-500'"
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
            <!-- Edit -->
            <button
              class="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors duration-150 active:scale-95"
              title="Edit Offer"
              @click="emits('editOffers', rowData)"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>

            <!-- Delete -->
            <button
              class="flex items-center justify-center w-7 h-7 rounded-lg text-red-600 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-700 transition-colors duration-150 active:scale-95"
              title="Delete Offer"
              @click="onButtonOfferDelete(rowData)"
            >
              <VaIcon name="mso-delete" class="w-4.5 h-4.5 block" />
            </button>
          </div>
        </template>
      </VaDataTable>
      <AddSelectionModal
        v-if="isAddSelectionModalOpen"
        :is-edit-selection="isEditSelection"
        :offer-selection="offerSelection"
        :offer-data="offerData"
        @cancel="
          (isAddSelectionModalOpen = false), (offerSelection = ''), (isEditSelection = false), emits('getOffers')
        "
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.notification-dropdown {
  cursor: pointer;

  .notification-dropdown__icon {
    position: relative;
    display: flex;
    align-items: center;
  }

  .va-dropdown__anchor {
    display: inline-block;
  }
}

.va-data-table {
  ::v-deep(.va-data-table__table-tr) {
    border-bottom: 1px solid var(--va-background-border);
  }
}

::v-deep(.va-data-table__table tbody tr:hover) {
  background-color: #f8fafc;
}

::v-deep(.va-data-table__table thead th:last-child) {
  text-align: right !important;
}

.expandable_table {
  background-color: #dbeafe;
  color: var(--va-on-background-element);
}
.expandable_table thead th {
  background-color: var(--va-data-table-thead-background);
  color: var(--va-data-table-thead-color);
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
.editable-textarea {
  width: 100%;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
  line-height: 1.3em;
  max-height: 5.2em; /* 4 lines x 1.3em */
  overflow-y: auto;
}

.editable-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  line-height: 1.3em;
  max-height: 3.9em; /* 3 lines x 1.3em */
}

.inline-input {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  padding: 0 !important;
  font-size: 0.875rem;
}

.description-ellipsis {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4em;
  max-height: 2.8em;
  white-space: normal;
  word-break: break-word;
  cursor: pointer;
}

.weekdays-ellipsis {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4em;
  max-height: 2.8em;
  white-space: normal;
  word-break: break-word;
  font-weight: bold;
}
.expandable_table table {
  width: 100%;
  border-spacing: 0;
}

.expandable_table th {
  font-weight: 600;
  background-color: var(--va-background-primary);
  color: var(--va-primary);
  border-bottom: 1px solid var(--va-background-border);
}

.expandable_table td {
  vertical-align: middle;
  padding: 0.75rem;
}

.expandable_table tbody tr td {
  background-color: #ffffff;
}

.expandable_table tbody tr:hover td {
  background-color: var(--va-background-secondary);
}
</style>
