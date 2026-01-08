<script setup lang="ts">
import { defineVaDataTableColumns, useModal, useToast } from 'vuestic-ui'
import { ref, computed, watch, reactive, onMounted, onUnmounted } from 'vue'
import { useServiceStore } from '@/stores/services'
import { useSubCategoriesStore } from '@/stores/subCategories'
import FileUpload from '@/components/file-uploader/FileUpload.vue'
import axios from 'axios'
import { Funnel, Columns3, Import, Plus, Search, CirclePlus, Pencil, Copy } from 'lucide-vue-next'
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  loading: { type: Boolean, default: false },
  categories: {
    type: Array,
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
})

const subCategoryStore = useSubCategoriesStore()
const serviceStore = useServiceStore()
const emits = defineEmits([
  'updateArticle',
  'updateArticleModal',
  'cloneArticle',
  'deleteArticle',
  'sortBy',
  'sortingOrder',
  'getArticlesForPagination',
  'addArticle',
  'importArticle',
])

const activeOnly = ref(true)
const { confirm } = useModal()
const { init } = useToast()
const currentPage = ref(1)
const searchQuery = ref('')
const onAddClick = () => {
  emits('addArticle', { adding: true, searchQuery: searchQuery.value, page: currentPage.value })
}
const onImportClick = () => {
  emits('importArticle')
}

const getActiveOptions = (rowData) => {
  const options = rowData.articlesOptionsGroup || []

  // Sort by sortOrder if it exists, otherwise keep payload order
  return options.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

const getActiveAllergens = (rowData) => {
  // Only count allergen IDs that exist in allergenOptions store
  return (rowData.allergenIds || []).filter((id) => allergenOptions.find((a) => a.id === id))
}

const showColumnsMenu = ref(false)
const columnsMenuWrapper = ref<HTMLElement | null>(null)

function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node | null
  if (!columnsMenuWrapper.value) return
  if (columnsMenuWrapper.value.contains(target)) return
  showColumnsMenu.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

const allergenOptions = subCategoryStore.allergenOptions.map((e) => {
  return { text: e.text, id: e.id }
})
const getAllergenNames = (id) => {
  return allergenOptions.find((a) => a.id === id).text
}

watch(currentPage, (newPage) => {
  emits('getArticlesForPagination', { page: currentPage.value, searchQuery: searchQuery.value })
})
watch(searchQuery, () => {
  // clear previous timer
  if (searchTimeout.value) clearTimeout(searchTimeout.value)

  // start a new timer
  searchTimeout.value = window.setTimeout(() => {
    emits('getArticlesForPagination', {
      page: currentPage.value,
      searchQuery: searchQuery.value,
      categoryFilter: selectedCategoryFilter.value,
    })
  }, 500) // 500ms delay
})
const pages = computed(() => {
  return Math.ceil(props.count / 50)
})

const filteredItems = computed(() => {
  let result = props.items

  // Category filter
  if (selectedCategoryFilter.value) {
    result = result.filter((item) =>
      item.categories.some(
        (cat) => cat._id === selectedCategoryFilter.value || cat.id === selectedCategoryFilter.value,
      ),
    )
  }

  // Active-only filter
  if (activeOnly.value) {
    result = result.filter((item) => item.isActive)
  }

  return result
})

const totalVisibleCount = computed(() => {
  // If category filter is active, use local filtered count
  if (selectedCategoryFilter.value) return filteredItems.value.length

  // Otherwise, fall back to backend-provided total (props.count)
  return props.count
})

const searchTimeout = ref<number | null>(null)
const selectedRest = computed(() => serviceStore.selectedRest)

const baseColumns = [
  { label: 'Image', key: 'image', sortable: false },
  { label: 'Name', key: 'name', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Description', key: 'description', sortable: false, sortingOptions: ['desc', 'asc'] },
  { label: 'Code', key: 'code', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Price', key: 'price', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Category', key: 'category', sortable: false, thAlign: 'center' },
  { label: 'Sub-Category', key: 'sub_category', sortable: false, thAlign: 'center' },
  { label: 'Options', key: 'articlesOptionsGroup', sortable: false, thAlign: 'center' },
  { label: 'Allergens', key: 'allergenIds', sortable: false, thAlign: 'center' },
  { label: 'Stock', key: 'stock', sortable: false, thAlign: 'center' },
  { label: 'Active', key: 'isActive', sortable: false, thAlign: 'center' },
  { label: 'Actions', key: 'actions', sortable: false },
]

const columnVisibility = reactive<Record<string, boolean>>({})
baseColumns.forEach((c) => {
  columnVisibility[c.key] = true
})

const storageKey = computed(() => {
  const restId = selectedRest.value?.id || selectedRest.value?.wCode || 'global' //
  return `articles_columns_visibility_${restId}`
})

function loadColumnVisibility() {
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (!raw) return
    const parsed = JSON.parse(raw)
    baseColumns.forEach((c) => {
      if (Object.prototype.hasOwnProperty.call(parsed, c.key)) {
        columnVisibility[c.key] = !!parsed[c.key]
      } else {
        columnVisibility[c.key] = true
      }
    })
  } catch (e) {
    console.warn('Failed to load column visibility', e)
  }
}

function saveColumnVisibility() {
  try {
    const payload: Record<string, boolean> = {}
    baseColumns.forEach((c) => (payload[c.key] = !!columnVisibility[c.key]))
    localStorage.setItem(storageKey.value, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save column visibility', e)
  }
}

function resetColumnVisibility() {
  baseColumns.forEach((c) => (columnVisibility[c.key] = true))
  // clear storage for current key
  localStorage.removeItem(storageKey.value)
  // persist defaults as immediate feedback
  saveColumnVisibility()
}

const columns = computed(() => {
  const visible = baseColumns.filter((c) => columnVisibility[c.key] !== false)
  return defineVaDataTableColumns(visible)
})

watch(
  () => Object.fromEntries(baseColumns.map((c) => [c.key, columnVisibility[c.key]])),
  () => saveColumnVisibility(),
  { deep: true },
)

watch(
  () => storageKey.value,
  () => {
    loadColumnVisibility()
  },
)

onMounted(() => {
  loadColumnVisibility()
})

const selectedCategoryFilter = ref(null)
const showCategoryFilterMenu = ref(false)
const categoryFilterWrapper = ref<HTMLElement | null>(null)

watch(selectedCategoryFilter, (newVal) => {
  emits('getArticlesForPagination', {
    page: currentPage.value,
    searchQuery: searchQuery.value,
    categoryFilter: newVal,
  })
})

function onClickOutsideCategory(e: MouseEvent) {
  const target = e.target as Node
  if (!categoryFilterWrapper.value?.contains(target)) {
    showCategoryFilterMenu.value = false
  }
}
onMounted(() => document.addEventListener('click', onClickOutsideCategory))
onUnmounted(() => document.removeEventListener('click', onClickOutsideCategory))

const onButtonArticleDelete = async (payload) => {
  const result = await confirm({
    message: 'Are you sure you want to Delete this Article?',
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Article',
  })
  if (result) {
    deleteArticle(payload)
  }
}
const deleteAsset = async (assetId) => {
  const url: any = import.meta.env.VITE_API_BASE_URL
  await axios
    .delete(`${url}/assets/${assetId}`)
    .then(() => {
      init({ message: 'Image deleted successfully', color: 'success' })
    })
    .catch((err) => {
      init({ message: err.response.data.error, color: 'danger' })
    })
}
const onButtonArticleImageDelete = async (payload) => {
  const result = await confirm({
    message: 'Are you sure you want to Delete this Article Image?',
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Article Image',
  })
  if (result) {
    await deleteAsset(payload.assetId._id)
    emits('updateArticle', { ...payload, imageUrl: '', assetId: '', editing: '' })
  }
}
function deleteArticle(payload) {
  emits('deleteArticle', payload)
}

function openFileModal(data) {
  console.log(data)
  document.getElementById('file-upload-' + data._id).click()
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
          <h1 class="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Articles</h1>
          <div
            class="h-9 flex items-center px-3 text-sm font-medium rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          >
            {{ totalVisibleCount }}
          </div>
        </div>

        <!-- Search Bar -->
        <div
          class="relative flex-1 min-w-[150px] max-w-[300px] w-full sm:w-[240px] md:w-[300px] bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
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
        <!-- Active Only Toggle -->
        <div class="flex items-center gap-1">
          <span class="hidden md:inline text-sm font-medium text-slate-700 dark:text-slate-200">Active Only</span>
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
                v-for="col in baseColumns"
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

        <!-- Import Button -->
        <button
          class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md h-10 w-10 md:w-auto md:h-auto"
          @click="onImportClick"
        >
          <Import class="w-4 h-4" />
          <span class="hidden md:inline">Import</span>
        </button>

        <!-- Add Article Button -->
        <button
          class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md h-10 w-10 md:w-auto md:h-auto"
          @click="onAddClick"
        >
          <Plus class="w-4 h-4" />
          <span class="hidden md:inline">Add Article</span>
        </button>

        <!-- Pagination -->
        <div class="flex items-center gap-2">
          <VaPagination v-model="currentPage" :pages="pages" buttons-preset="secondary" gapped="20" :visible-pages="3">
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
    </div>

    <!-- TABLE -->
    <div class="flex flex-col h-[calc(100vh-12rem)]">
      <VaDataTable
        :columns="columns"
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
        <!-- ID COLUMN (HIDDEN) -->
        <template #cell(id)="{ rowData }">
          <div class="max-w-[120px] ellipsis">
            {{ rowData.id }}
          </div>
        </template>

        <!-- IMAGE COLUMN -->
        <template #cell(image)="{ rowData }">
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
              @click.prevent="onButtonArticleImageDelete(rowData)"
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
                  $emit('updateArticle', { ...rowData, searchQuery: searchQuery.value, page: currentPage.value })
                  rowData.editing = ''
                }
              "
            />
          </div>
        </template>

        <!-- NAME COLUMN -->
        <template #cell(name)="{ rowData }">
          <div class="editable-field relative group">
            <!-- Editable textarea when editing -->
            <textarea
              v-if="rowData.editing === 'name'"
              v-model="rowData.name"
              class="editable-textarea"
              autofocus
              rows="3"
              @blur="
                emits('updateArticle', { ...rowData, searchQuery: searchQuery, page: currentPage }),
                  (rowData.editing = '')
              "
            />

            <!-- Display value when not editing -->
            <div v-else class="editable-text cursor-pointer" @click="rowData.editing = 'name'">
              <span>{{ rowData.name || '' }}</span>

              <!-- Pencil icon, appears only on hover -->
              <Pencil
                v-if="rowData.name"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </template>

        <!-- DESCRIPTION COLUMN -->
        <template #cell(description)="{ rowData }">
          <div class="editable-field relative group">
            <!-- Editable textarea -->
            <textarea
              v-if="rowData.editing === 'description'"
              v-model="rowData.description"
              class="editable-textarea"
              autofocus
              rows="3"
              @blur="
                emits('updateArticle', { ...rowData, searchQuery: searchQuery, page: currentPage }),
                  (rowData.editing = '')
              "
            />

            <!-- Display value when not editing -->
            <div v-else class="editable-text cursor-pointer" @click="rowData.editing = 'description'">
              <span>{{ rowData.description || '' }}</span>

              <!-- Pencil icon for existing description -->
              <Pencil
                v-if="rowData.description"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />

              <!-- Plus icon for empty field -->
              <CirclePlus
                v-else
                class="w-4 h-4 text-slate-300 cursor-pointer hover:text-blue-500 transition-colors"
                @click.stop="rowData.editing = 'description'"
              />
            </div>
          </div>
        </template>

        <!-- CODE COLUMN -->
        <template #cell(code)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editing === 'code'"
              v-model="rowData.code"
              class="editable-input"
              autofocus
              @blur="
                emits('updateArticle', { ...rowData, searchQuery: searchQuery, page: currentPage }),
                  (rowData.editing = '')
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editing = 'code'">
              <span>{{ rowData.code || '' }}</span>

              <!-- Pencil icon for existing code -->
              <Pencil
                v-if="rowData.code"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />

              <!-- Plus icon for empty field -->
              <CirclePlus
                v-else
                class="w-4 h-4 text-slate-300 cursor-pointer hover:text-blue-500 transition-colors"
                @click.stop="rowData.editing = 'code'"
              />
            </div>
          </div>
        </template>

        <!-- PRICE COLUMN -->
        <template #cell(price)="{ rowData }">
          <div class="editable-field relative group">
            <input
              v-if="rowData.editing === 'price'"
              v-model="rowData.price"
              class="editable-input"
              autofocus
              @blur="
                emits('updateArticle', { ...rowData, searchQuery: searchQuery, page: currentPage }),
                  (rowData.editing = '')
              "
            />
            <div v-else class="editable-text cursor-pointer" @click="rowData.editing = 'price'">
              <span>{{ rowData.price ? `€ ${parseFloat(rowData.price).toFixed(2)}` : '' }}</span>

              <!-- Pencil icon for existing price -->
              <Pencil
                v-if="rowData.price"
                class="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />

              <!-- Plus icon for empty field -->
              <CirclePlus
                v-else
                class="w-4 h-4 text-slate-300 cursor-pointer hover:text-blue-500 transition-colors"
                @click.stop="rowData.editing = 'price'"
              />
            </div>
          </div>
        </template>

        <!-- CATEGORY COLUMN -->
        <template #cell(category)="{ rowData }">
          <div class="flex flex-col gap-1">
            <template v-if="rowData.categories.length <= 2">
              <span
                v-for="e in rowData.categories"
                :key="e.wCode"
                class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-blue-800 bg-blue-100 hover:bg-blue-200 cursor-pointer transition-colors text-center"
                @click="
                  emits('updateArticleModal', {
                    ...rowData,
                    updating: 'category',
                    searchQuery: searchQuery.value,
                    page: currentPage.value,
                  })
                "
              >
                {{ e.name }}
              </span>
            </template>
            <template v-else>
              <span
                v-for="e in rowData.categories.slice(0, 2)"
                :key="e.wCode"
                class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-blue-800 bg-blue-100 hover:bg-blue-200 cursor-pointer transition-colors text-center"
                @click="
                  emits('updateArticleModal', {
                    ...rowData,
                    updating: 'category',
                    searchQuery: searchQuery.value,
                    page: currentPage.value,
                  })
                "
              >
                {{ e.name }}
              </span>
              <span
                class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-blue-800 bg-blue-50 cursor-pointer transition-colors text-center"
                @click="
                  emits('updateArticleModal', {
                    ...rowData,
                    updating: 'category',
                    searchQuery: searchQuery.value,
                    page: currentPage.value,
                  })
                "
              >
                +{{ rowData.categories.length - 2 }} more
              </span>
            </template>
          </div>
        </template>

        <!-- CATEGORY DROPDOWN FILTER -->
        <template #header(category)>
          <div ref="categoryFilterWrapper" class="relative flex items-center gap-1">
            <!-- Category Title + Filter Icon -->
            <span
              class="font-semibold text-[--va-data-table-thead-color] flex items-center gap-2 cursor-pointer"
              @click.stop="showCategoryFilterMenu = !showCategoryFilterMenu"
            >
              Category
              <Funnel class="w-3.5 h-3.5 text-[--va-data-table-thead-color]" />
            </span>

            <!-- Dropdown Menu -->
            <div
              v-if="showCategoryFilterMenu"
              class="absolute left-0 top-full mt-1 w-56 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-3 z-50"
            >
              <div class="flex flex-col gap-2 max-h-[400px] overflow-auto">
                <button
                  class="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                  :class="{
                    'font-semibold text-slate-500 dark:text-slate-400': selectedCategoryFilter === null,
                    'font-normal': selectedCategoryFilter !== null,
                  }"
                  @click="(selectedCategoryFilter = null), (showCategoryFilterMenu = false)"
                >
                  All Categories
                </button>

                <!-- Category options -->
                <button
                  v-for="cat in props.categories"
                  :key="cat._id || cat.id"
                  class="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                  :class="{
                    'font-semibold text-slate-500 dark:text-slate-400': selectedCategoryFilter === (cat._id || cat.id),
                    'font-normal': selectedCategoryFilter !== (cat._id || cat.id),
                  }"
                  @click="(selectedCategoryFilter = cat._id || cat.id), (showCategoryFilterMenu = false)"
                >
                  {{ cat.name }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- SUBCATEGORY COLUMN -->
        <template #cell(sub_category)="{ rowData }">
          <div class="flex flex-col items-center gap-1">
            <template v-if="rowData.subCategories.length <= 2">
              <span
                v-for="sub in rowData.subCategories"
                :key="sub.wCode"
                class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-blue-800 bg-blue-100 hover:bg-blue-200 cursor-pointer transition-colors text-center"
                @click="
                  emits('updateArticleModal', {
                    ...rowData,
                    updating: 'subCategory',
                    searchQuery: searchQuery.value,
                    page: currentPage.value,
                  })
                "
              >
                {{ sub.name }}
              </span>
            </template>
            <template v-else>
              <span
                v-for="sub in rowData.subCategories.slice(0, 2)"
                :key="sub.wCode"
                class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-blue-800 bg-blue-100 hover:bg-blue-200 cursor-pointer transition-colors text-center"
                @click="
                  emits('updateArticleModal', {
                    ...rowData,
                    updating: 'subCategory',
                    searchQuery: searchQuery.value,
                    page: currentPage.value,
                  })
                "
              >
                {{ sub.name }}
              </span>
              <span
                class="inline-block px-3 py-1 text-sm rounded-xl font-medium text-blue-800 bg-blue-50 cursor-pointer transition-colors text-center"
                @click="
                  emits('updateArticleModal', {
                    ...rowData,
                    updating: 'subCategory',
                    searchQuery: searchQuery.value,
                    page: currentPage.value,
                  })
                "
              >
                +{{ rowData.subCategories.length - 2 }} more
              </span>
            </template>
          </div>
        </template>

        <!-- OPTIONS COLUMN -->
        <template #cell(articlesOptionsGroup)="{ rowData }">
          <div class="relative flex flex-col items-center group options-dropdown-wrapper">
            <template v-if="getActiveOptions(rowData).length > 0">
              <button
                class="px-3 py-1 text-sm rounded-xl font-medium text-green-800 bg-green-100 hover:bg-green-200 transition-colors cursor-pointer"
              >
                {{ getActiveOptions(rowData).length }} Selected
              </button>

              <!-- Hover Popup only when there are options -->
              <div
                class="absolute top-full mt-1 bg-white/80 backdrop-blur-md border border-slate-200 text-center rounded-2xl shadow-xl p-3 z-50 flex flex-col gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200"
                style="min-width: 150px; width: max-content"
              >
                <template v-for="opt in getActiveOptions(rowData)" :key="opt.id">
                  <span class="px-2 py-1 rounded text-sm bg-green-50 text-green-700 text-center w-full">
                    {{ opt.name }}
                  </span>
                </template>
              </div>
            </template>

            <!-- Plus Icon when no options -->
            <template v-else>
              <button
                class="px-3 py-1 text-sm rounded-xl font-medium text-green-50 cursor-pointer text-green-600/50 hover:text-green-600/80"
                @click="
                  emits('updateArticleModal', {
                    ...rowData,
                    updating: 'options',
                    searchQuery: searchQuery.value,
                    page: currentPage.value,
                  })
                "
              >
                <CirclePlus class="w-4 h-4" />
              </button>
            </template>
          </div>
        </template>

        <!-- ALLERGENS COLUMN -->
        <template #cell(allergenIds)="{ rowData }">
          <div class="relative flex flex-col items-center group allergens-dropdown-wrapper">
            <template v-if="getActiveAllergens(rowData).length > 0">
              <button
                class="px-3 py-1 text-sm rounded-xl font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors cursor-pointer"
              >
                {{ getActiveAllergens(rowData).length }} Selected
              </button>

              <!-- Hover Popup only when there are allergens -->
              <div
                class="absolute top-full mt-1 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-3 z-50 flex flex-col gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200"
                style="min-width: 150px; width: max-content"
              >
                <template v-for="id in getActiveAllergens(rowData)" :key="id">
                  <span class="px-2 py-1 rounded text-sm bg-amber-50 text-amber-700 text-center w-full">
                    {{ getAllergenNames(id) }}
                  </span>
                </template>
              </div>
            </template>

            <!-- Plus Icon when no allergens -->
            <template v-else>
              <button
                class="px-3 py-1 text-sm rounded-xl font-medium text-amber-50cursor-pointer text-amber-600/50 hover:text-amber-600/80"
                @click="
                  emits('updateArticleModal', {
                    ...rowData,
                    updating: 'allergens',
                    searchQuery: searchQuery.value,
                    page: currentPage.value,
                  })
                "
              >
                <CirclePlus class="w-4 h-4" />
              </button>
            </template>
          </div>
        </template>

        <!-- ACTIVE COLUMN -->
        <template #cell(isActive)="{ rowData }">
          <div class="flex justify-center items-center">
            <label class="relative inline-block w-9 h-5 cursor-pointer">
              <input
                :checked="rowData.isActive"
                type="checkbox"
                class="sr-only"
                @change="
                  (e) => {
                    console.log(
                      '🎯 Toggle clicked! e.target.checked =',
                      e.target.checked,
                      'rowData.isActive =',
                      rowData.isActive,
                    )
                    emits('updateArticle', {
                      ...rowData,
                      isActive: e.target.checked,
                      searchQuery: searchQuery.value,
                      page: currentPage.value,
                    })
                  }
                "
              />
              <!-- Track -->
              <span
                class="block rounded-full h-5 w-9 transition-colors duration-300 ease-in-out"
                :class="rowData.isActive ? 'bg-emerald-500' : 'bg-slate-300'"
              ></span>
              <!-- Thumb -->
              <span
                class="absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out"
                :class="rowData.isActive ? 'translate-x-4' : 'translate-x-1'"
              ></span>
            </label>
          </div>
        </template>

        <!-- STOCK COLUMN -->
        <template #cell(stock)="{ rowData }">
          <div class="flex justify-center items-center">
            <label class="relative inline-block w-9 h-5 cursor-pointer">
              <input
                v-model="rowData.inStock"
                type="checkbox"
                class="sr-only"
                @change="
                  emits('updateArticle', { ...rowData, searchQuery: searchQuery.value, page: currentPage.value })
                "
              />
              <!-- Track -->
              <span
                class="block rounded-full h-5 w-9 transition-colors duration-300 ease-in-out"
                :class="rowData.inStock ? 'bg-blue-500' : 'bg-slate-300'"
              ></span>
              <!-- Thumb -->
              <span
                class="absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out"
                :class="rowData.inStock ? 'translate-x-4' : 'translate-x-1'"
              ></span>
            </label>
          </div>
        </template>

        <!-- ACTIONS COLUMN -->
        <template #cell(actions)="{ rowData }">
          <div class="flex justify-end items-center gap-1">
            <!-- Duplicate -->
            <button
              class="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors duration-150 active:scale-95"
              title="Duplicate Article"
              @click="emits('cloneArticle', rowData)"
            >
              <Copy class="w-3.5 h-3.5" />
            </button>

            <!-- Edit -->
            <button
              class="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors duration-150 active:scale-95"
              title="Edit Article"
              @click="emits('updateArticleModal', rowData)"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>

            <!-- Delete -->
            <button
              class="flex items-center justify-center w-7 h-7 rounded-lg text-red-600 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-700 transition-colors duration-150 active:scale-95"
              title="Delete Article"
              @click="onButtonArticleDelete(rowData)"
            >
              <VaIcon name="mso-delete" class="w-4.5 h-4.5 block" />
            </button>
          </div>
        </template>
      </VaDataTable>
    </div>
  </div>
</template>

<!-- STYLE -->
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
.options {
  font-size: 12px;
  line-height: 1.2rem;
}
.editable-field {
  width: 100%;
  max-width: none;
  cursor: pointer;
}
/* Hover background for table rows */
::v-deep(.va-data-table__table tbody tr:hover) {
  background-color: #f8fafc; /* slate-50 */
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

.editable-input {
  width: 100%;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button.px-3.py-1\.5.font-bold {
  font-size: 18px;
  color: #64748b;
}
</style>
