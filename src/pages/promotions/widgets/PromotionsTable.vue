<script setup lang="ts">
import { defineVaDataTableColumns, useModal, useToast } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import { ref, watch, defineEmits, computed, onMounted, onBeforeUnmount } from 'vue'
import { useServiceStore } from '@/stores/services'
import AddSelectionModal from '../modals/AddSelectionModal.vue'
import axios from 'axios'
import { updatePromotion, getMenuItemsByOutlet } from '../services/promotionService'
import { Copy, List, Download, Pencil, Plus, Columns3, Search } from 'lucide-vue-next'

const emits = defineEmits(['getPromotions', 'editPromotions', 'openSelectionModal', 'openPromotionModal'])
const items = computed(() => props.items || [])
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  loading: { type: Boolean, default: false },
})

const cachedMenuItems = {}
const originalRowData = null
const menuItems = ref([])
const { confirm } = useModal()
const { init } = useToast()
const router = useRouter()
const servicesStore = useServiceStore()
const isAddSelectionModalOpen = ref(false)
const filterMode = ref(2)
const searchQuery = ref('')
const totalVisibleCount = computed(() => filteredItems.value.length)
const visibleColumns = computed(() => {
  return columns.filter((col) => columnVisibility.value[col.key])
})

/** Map IDs in menuItem to full menu item objects */
function getMenuItemDetails(ids) {
  if (!ids || !ids.length) return []
  return ids.map((id) => menuItems.value.find((item) => item._id === id)).filter(Boolean)
}
const columnVisibility = ref({
  name: true,
  promotionType: true,
  price: true,
  startDate: true,
  timeRange: true,
  codes: true,
  availableAtCC: true,
  availableAtWeb: true,
  status: true,
  isActive: true,
  actions: true,
})
watch(
  columnVisibility,
  (val) => {
    localStorage.setItem('promotionTableColumns', JSON.stringify(val))
  },
  { deep: true },
)

onMounted(() => {
  const saved = localStorage.getItem('promotionTableColumns')
  if (saved) columnVisibility.value = JSON.parse(saved)
})
// Reset columns to default
function resetColumnVisibility() {
  for (const col of columns) {
    columnVisibility.value[col.key] = true
  }
}
function cycleFilterMode() {
  filterMode.value = (filterMode.value + 1) % 3
}
const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return items.value
    .filter((item) => {
      if (filterMode.value === 2) return item.isActive // Active only
      if (filterMode.value === 0) return !item.isActive // Inactive only
      return true // All
    })
    .filter((item) => item.name?.toLowerCase().includes(query) || item.code?.toLowerCase().includes(query))
    .sort((a, b) => {
      const now = new Date().getTime()
      const endA = new Date(a.endDate).getTime()
      const endB = new Date(b.endDate).getTime()

      // Check if expired
      const isExpiredA = endA < now
      const isExpiredB = endB < now

      // If one is expired, it goes below the other
      if (isExpiredA && !isExpiredB) return 1
      if (!isExpiredA && isExpiredB) return -1

      // Otherwise, fallback to sorting by start date descending
      const dateA = new Date(a.startDate).getTime()
      const dateB = new Date(b.startDate).getTime()
      return dateB - dateA
    })
})

function handleClickOutside(event: MouseEvent) {
  const menu = columnsMenuWrapper.value
  if (menu && !menu.contains(event.target as Node)) {
    showColumnsMenu.value = false
  }
}

const columnsMenuWrapper = ref<HTMLElement | null>(null)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const showColumnsMenu = ref(false)

const columns = defineVaDataTableColumns([
  { label: 'Name', key: 'name' },
  { label: 'Type', key: 'promotionType', thAlign: 'center' },
  { label: 'Value', key: 'price', thAlign: 'center' },
  { label: 'Date Range', key: 'startDate', thAlign: 'center' },
  { label: 'Time Range', key: 'timeRange', thAlign: 'center' },
  { label: 'Codes', key: 'codes', thAlign: 'center' },
  { label: 'Status', key: 'status', thAlign: 'center' },
  { label: 'Call Center', key: 'availableAtCC', thAlign: 'center' },
  { label: 'Website', key: 'availableAtWeb', thAlign: 'center' },
  { label: 'Active', key: 'isActive', thAlign: 'center' },
  { label: 'Actions', key: 'actions' },
])

watch(
  () => servicesStore.selectedRest,
  async (newOutlet) => {
    if (!newOutlet) return
    await loadMenuItems(newOutlet)
  },
  { immediate: true },
)

async function loadMenuItems(outletId) {
  try {
    const res = await getMenuItemsByOutlet(outletId)
    menuItems.value = Array.isArray(res) ? res : res?.data || []
    console.log('[loadMenuItems] Loaded menu items:', menuItems.value.length)
  } catch (err) {
    console.error('[loadMenuItems] Failed to fetch menu items:', err)
    menuItems.value = []
  }
}

function getChangedFields(original, updated) {
  const changed = {}
  for (const key in updated) {
    if (!Object.prototype.hasOwnProperty.call(updated, key)) continue
    if (typeof updated[key] === 'function') continue

    if (typeof updated[key] === 'object' && updated[key] !== null && original[key] !== null) {
      if (JSON.stringify(updated[key]) !== JSON.stringify(original[key])) {
        changed[key] = updated[key]
      }
    } else if (updated[key] !== original[key]) {
      changed[key] = updated[key]
    }
  }
  return changed
}

function getPromotionStatus(startDateStr: string, endDateStr: string) {
  const now = new Date()
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)

  if (now < start) {
    return {
      text: 'Upcoming',
      classes: 'text-amber-700 bg-amber-100',
    }
  }

  if (now > end) {
    return {
      text: 'Expired',
      classes: 'text-red-800 bg-red-100',
    }
  }

  return {
    text: 'Running',
    classes: 'text-green-800 bg-green-100',
  }
}

function getPrettyPromotionType(type: string) {
  switch (type) {
    case 'FIXED_PRICE':
      return 'Fixed Price'
    case 'VALUE_DISCOUNT':
      return 'Value'
    case 'PERCENTAGE_DISCOUNT':
      return 'Percentage'
    case 'FREE_DELIVERY':
      return 'Free Delivery'
    case 'TAKE_X_PAY_Y':
      return 'Take X Pay Y'
    default:
      return type
  }
}
function getPromotionTypeClass(type: string) {
  switch (type) {
    case 'VALUE_DISCOUNT':
      return 'type-value'
    case 'PERCENTAGE_DISCOUNT':
      return 'type-percentage'
    case 'FIXED_PRICE':
      return 'type-fixed'
    case 'FREE_DELIVERY':
      return 'type-delivery'
    case 'TAKE_X_PAY_Y':
      return 'type-takex'
    default:
      return ''
  }
}

function copyCodeToClipboard(code: string) {
  if (!code) return
  navigator.clipboard.writeText(code)
  init({ message: 'Code copied to clipboard!', color: 'success' })
}

function onAddClick() {
  emits('openPromotionModal')
}

const showMultiCodePopup = ref(false)
const selectedCodes = ref<string[]>([])

function openMultiCodePopup(codes: string[]) {
  selectedCodes.value = codes || []
  showMultiCodePopup.value = true
}

function closeMultiCodePopup() {
  showMultiCodePopup.value = false
}

async function updateData(rowData) {
  if (!rowData._id) {
    init({ message: 'Promotion ID missing, cannot update.', color: 'danger' })
    return
  }

  const changedFields = {
    isActive: rowData.isActive,
    availableAtCC: rowData.availableAtCC,
    availableAtWeb: rowData.availableAtWeb,
  }

  try {
    await updatePromotion(rowData._id, changedFields)
    init({ message: 'Updated successfully', color: 'success' })
    emits('getPromotions')
  } catch (err) {
    console.error('[updateData] Update error:', err?.response?.data || err)
    init({ message: err.response?.data?.error || 'Update failed', color: 'danger' })
  }
}

const onButtonPromotionDelete = async (payload) => {
  const result = await confirm({
    message: 'Are you sure you want to delete this Promotion?',
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Promotion',
  })
  if (result) {
    deletePromotion(payload)
  }
}

async function deletePromotion(payload) {
  try {
    await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/promotions/${payload._id}`)
    init({ message: 'Promotion deleted successfully', color: 'success' })

    // Still tell parent to refresh if needed
    emits('getPromotions')
  } catch (err) {
    init({ message: err.response?.data?.error || 'Delete failed', color: 'danger' })
  }
}

const localItems = ref([])

watch(
  () => props.items,
  (newItems) => {
    localItems.value = Array.isArray(newItems) ? newItems.map((item) => ({ ...item })) : []
  },
  { immediate: true },
)

function formatReadableDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)

  return `${day}/${month}/${year}`
}

function downloadCodeList(codes: string[], promotionName: string) {
  if (!codes || !codes.length) return
  if (!promotionName) promotionName = 'promotion'

  // Sanitize promotion name for filesystem
  const safeName = promotionName.replace(/[^a-zA-Z0-9-_]/g, '_')

  // Create CSV content with optional header
  const csvContent = ['Code', ...codes].join('\n')

  // Create a Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  // Create temporary link
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${safeName}_codes.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <!-- HEADER -->
  <div>
    <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
      <!-- Left: Title + Counter + Search -->
      <div class="flex flex-1 min-w-0 items-center gap-2 flex-wrap">
        <!-- Title + Counter -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <h1 class="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Promotions</h1>
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

        <!-- Columns Button -->
        <div ref="columnsMenuWrapper" class="relative">
          <button
            class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-200 active:scale-[0.97] h-10 w-10 md:w-auto md:h-auto"
            @click="showColumnsMenu = !showColumnsMenu"
          >
            <Columns3 class="w-4 h-4" />
            <span class="hidden md:inline">Columns</span>
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
                @click="showColumnsMenu = false"
              >
                Done
              </button>
            </div>
          </div>
        </div>

        <!-- Add Promotion Button -->
        <button
          class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md h-10 w-10 md:w-auto md:h-auto"
          @click="onAddClick"
        >
          <Plus class="w-4 h-4" />
          <span class="hidden md:inline">Add Promotion</span>
        </button>
      </div>
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
      <!-- DATE -->
      <template #cell(startDate)="{ rowData }">
        <div class="flex justify-center items-center">
          {{ formatReadableDate(rowData.startDate) }}
          <span v-if="rowData.startDate && rowData.endDate" class="mx-1 font-bold"> - </span>
          {{ formatReadableDate(rowData.endDate) }}
        </div>
      </template>

      <!-- TIME -->
      <template #cell(timeRange)="{ rowData }">
        <div class="flex justify-center items-center">
          {{ rowData.timeRange }}
        </div>
      </template>

      <!-- TYPE -->
      <template #cell(promotionType)="{ rowData }">
        <span
          class="flex justify-center items-center inline-block text-sm px-3 py-1 rounded-xl"
          :class="getPromotionTypeClass(rowData.promotionType)"
        >
          {{ getPrettyPromotionType(rowData.promotionType) }}
        </span>
      </template>

      <!-- VALUE -->
      <template #cell(price)="{ rowData }">
        <div class="flex justify-center items-center">
          <template v-if="rowData.promotionType === 'FIXED_PRICE'">€{{ rowData.fixedPrice }}</template>
          <template v-else-if="rowData.promotionType === 'VALUE_DISCOUNT'"
            >€ {{ Number(rowData.discountValue).toFixed(2) }}</template
          >
          <template v-else-if="rowData.promotionType === 'PERCENTAGE_DISCOUNT'">
            {{ rowData.discountPercentage }} %
          </template>
          <template v-else-if="rowData.promotionType === 'FREE_DELIVERY'">Free Delivery</template>
          <template v-else-if="rowData.promotionType === 'TAKE_X_PAY_Y'">
            Take {{ rowData.takeQuantity }} Pay {{ rowData.payQuantity }}
          </template>
        </div>
      </template>

      <!-- CODES -->
      <template #cell(codes)="{ rowData }">
        <!-- Single Code -->
        <template v-if="rowData.codeType === 'SINGLE'">
          <div class="flex justify-center items-center gap-2">
            <span class="code-pill code-single uppercase">
              {{ rowData.codes?.[0] || '—' }}
            </span>
            <button
              v-if="rowData.codes?.[0]"
              class="text-slate-400 hover:text-slate-500 hover:scale-105 transition"
              title="Copy code"
              @click="copyCodeToClipboard(rowData.codes[0])"
            >
              <Copy class="w-4 h-4" />
            </button>
          </div>
        </template>

        <!-- Multi Code -->
        <template v-else-if="rowData.codeType === 'MULTI'">
          <div class="flex justify-center items-center gap-2">
            <span class="code-pill code-multi">
              {{ (rowData.totalCount || 0) - (rowData.usageCount || 0) }} / {{ rowData.totalCount || 0 }}
            </span>
            <button
              v-if="rowData.codes?.length"
              class="text-slate-400 hover:text-slate-500 hover:scale-105 transition"
              title="View code list"
              @click="openMultiCodePopup(rowData.codes)"
            >
              <List class="w-4 h-4" />
            </button>
            <button
              v-if="rowData.codes?.length"
              class="text-slate-400 hover:text-slate-500 hover:scale-105 transition"
              title="Download code list"
              @click="downloadCodeList(rowData.codes, rowData.name)"
            >
              <Download class="w-4 h-4" />
            </button>
          </div>
        </template>

        <!-- Auto Code -->
        <template v-else-if="rowData.codeType === 'AUTO'">
          <span class="code-pill code-auto"> {{ rowData.codes?.length || 0 }} Codes </span>
        </template>

        <!-- Fallback -->
        <template v-else>
          <!-- <span class="text-gray-400 italic">—</span> -->
        </template>
      </template>

      <!-- CC -->
      <template #cell(availableAtCC)="{ rowData }">
        <div class="flex justify-center items-center">
          <label class="relative inline-block w-9 h-5 cursor-pointer">
            <input
              type="checkbox"
              :checked="rowData.availableAtCC"
              class="sr-only"
              @change="updateData({ ...rowData, availableAtCC: $event.target.checked })"
            />
            <!-- Track -->
            <span
              class="block rounded-full h-5 w-9 transition-colors duration-300 ease-in-out"
              :class="rowData.availableAtCC ? 'bg-blue-500' : 'bg-slate-300'"
            ></span>
            <!-- Thumb -->
            <span
              class="absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out"
              :class="rowData.availableAtCC ? 'translate-x-4' : 'translate-x-1'"
            ></span>
          </label>
        </div>
      </template>

      <!-- WEBSITE -->
      <template #cell(availableAtWeb)="{ rowData }">
        <div class="flex justify-center items-center">
          <label class="relative inline-block w-9 h-5 cursor-pointer">
            <input
              type="checkbox"
              :checked="rowData.availableAtWeb"
              class="sr-only"
              @change="updateData({ ...rowData, availableAtWeb: $event.target.checked })"
            />
            <!-- Track -->
            <span
              class="block rounded-full h-5 w-9 transition-colors duration-300 ease-in-out"
              :class="rowData.availableAtWeb ? 'bg-blue-500' : 'bg-slate-300'"
            ></span>
            <!-- Thumb -->
            <span
              class="absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out"
              :class="rowData.availableAtWeb ? 'translate-x-4' : 'translate-x-1'"
            ></span>
          </label>
        </div>
      </template>

      <!-- STATUS -->
      <template #cell(status)="{ rowData }">
        <div class="flex justify-center items-center">
          <button
            class="px-3 py-1 text-sm rounded-xl font-medium transition-colors cursor-default"
            :class="getPromotionStatus(rowData.startDate, rowData.endDate).classes"
          >
            {{ getPromotionStatus(rowData.startDate, rowData.endDate).text }}
          </button>
        </div>
      </template>

      <!-- Expandable Row -->
      <template #expandableRow="{ rowData }">
        <div class="expandable_table rounded p-5">
          <!-- Linked Menu Items -->
          <div class="mb-4">
            <p class="font-semibold">Menu Items linked:</p>
            <div v-if="getMenuItemDetails(rowData.menuItem).length">
              <ul class="list-disc pl-4">
                <li
                  v-for="item in getMenuItemDetails(rowData.menuItem)"
                  :key="item._id"
                  class="flex items-center gap-2"
                >
                  <img v-if="item.imageUrl" :src="item.imageUrl" class="w-6 h-6 rounded" alt="menu item" />
                  <span>{{ item.name }}</span>
                </li>
              </ul>
            </div>
            <div v-else class="text-slate-400">No menu items linked</div>
          </div>

          <!-- Add Menu Item Button -->
          <div class="flex justify-end mb-4">
            <VaButton
              color="primary"
              icon="mso-add"
              @click="
                emits('openSelectionModal', {
                  promotion: rowData,
                  selection: null,
                  isEdit: false,
                })
              "
            >
              Add Menu Item
            </VaButton>
          </div>
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
            title="Edit Promotion"
            @click="emits('editPromotions', rowData)"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>

          <!-- Delete -->
          <button
            class="flex items-center justify-center w-7 h-7 rounded-lg text-red-600 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-700 transition-colors duration-150 active:scale-95"
            title="Delete Promotion"
            @click="onButtonPromotionDelete(rowData)"
          >
            <VaIcon name="mso-delete" class="w-4.5 h-4.5 block" />
          </button>
        </div>
      </template>
    </VaDataTable>
  </div>

  <VaModal v-model="showMultiCodePopup" size="small" title="Promotion Codes" hide-default-actions>
    <div v-if="selectedCodes.length">
      <ul class="divide-y divide-slate-200">
        <li v-for="(code, index) in selectedCodes" :key="index" class="flex items-center justify-between py-1">
          <span>{{ typeof code === 'string' ? code : code.code }}</span>
          <button
            class="text-slate-500 hover:text-blue-500 transition"
            title="Copy code"
            @click="copyCodeToClipboard(typeof code === 'string' ? code : code.code)"
          >
            <Copy class="w-4 h-4" />
          </button>
        </li>
      </ul>
    </div>
    <div v-else class="text-slate-400 text-center py-2">No codes available</div>

    <template #footer>
      <div class="flex justify-end">
        <VaButton color="primary" @click="closeMultiCodePopup">Close</VaButton>
      </div>
    </template>
  </VaModal>

  <!-- Add Selection Modal -->
  <AddSelectionModal
    v-if="isAddSelectionModalOpen"
    :promotion-id="promotionData._id"
    :outlet-id="servicesStore.selectedRest"
    :pending-selections="promotionData.menuItem || []"
    :is-edit-selection="isEditSelection"
    :promotion-selection="promotionSelection"
    @cancel="
      () => {
        isAddSelectionModalOpen = false
        promotionSelection = ''
        isEditSelection = false
        emits('getPromotions')
      }
    "
    @submitted="
      () => {
        isAddSelectionModalOpen = false
        promotionSelection = ''
        isEditSelection = false
        emits('getPromotions')
      }
    "
  />
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

::v-deep(.va-data-table__table thead th:last-child) {
  text-align: right !important;
}

.expandable_table {
  background-color: var(--va-background-element);
  color: var(--va-on-background-element);
}

.text-blue-600 {
  font-size: 0.85rem;
  line-height: 1.2rem;
  display: block;
}

.type-value {
  background: #dbeafe;
  color: #1d4ed8;
}

.type-percentage {
  background: #dcfce7;
  color: #0e6d31;
}

.type-fixed {
  background: #fef3c7;
  color: #d97706;
}

.type-delivery {
  background: #f3e8ff;
  color: #7e2cca;
}

.type-takex {
  background: #ffeff8;
  color: #b32a6e;
}

.code-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 13px;
  color: white;
  text-align: center;
  min-width: 70px;
}

::v-deep(.va-data-table__table tbody tr:hover) {
  background-color: #f8fafc;
  /* slate-50 */
}

/* SINGLE CODE */
.code-single {
  background: #dbeafe;
  color: #1d4ed8;
}

/* MULTI CODE */
.code-multi {
  background: #f3e8ff;
  color: #7e2cca;
}

.code-auto {
  background: linear-gradient(to right, #ee9f18, #f5ce4f);
}
</style>
