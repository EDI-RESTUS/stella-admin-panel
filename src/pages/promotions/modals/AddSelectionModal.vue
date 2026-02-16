<template>
  <VaModal
    :model-value="isVisible"
    class="big-xl-modal !p-0"
    :mobile-fullscreen="false"
    size="large"
    close-button
    hide-default-actions
    @update:modelValue="$emit('cancel')"
  >
    <!-- HEADER -->
    <template #header>
      <div class="flex items-center gap-2">
        <h1 class="va-h6 mb-3">
          {{ props.type === 'options' ? 'Update Promotion Options' : 'Update Promotion Articles' }}
        </h1>
        <span
          v-if="selectedIds.length > 0"
          class="inline-flex items-center justify-center text-xs font-semibold text-white bg-primary rounded-full w-6 h-6"
        >
          {{ selectedIds.length }}
        </span>
      </div>
    </template>

    <!-- FORM -->
    <VaForm ref="form" @submit.prevent="submit">
      <div class="grid gap-4">
        <div>
          <div
            v-if="!isLoading && props.type !== 'options'"
            class="border rounded shadow-sm bg-white h-[65vh] overflow-y-auto"
          >
            <!-- ITEMS TABLE -->
            <table class="w-full text-sm">
              <thead>
                <tr>
                  <th class="p-1 text-left align-top">
                    <!-- Search -->
                    <VaInput v-model="searchQuery" placeholder="Search..." size="small" class="mb-2" />
                    <!-- Select All -->
                    <VaCheckbox v-model="selectAll" class="ml-1" label="Select All" />
                  </th>
                </tr>
              </thead>
              <tbody>
                <template v-if="!searchQuery">
                  <tr v-for="item in sortedList" :key="item._id" class="border-b hover:bg-orange-50">
                    <td class="p-2">
                      <VaCheckbox
                        :model-value="isChecked(item._id)"
                        :label="item.code + ' - ' + item.name + (props.type === 'options' ? ' - ' + item.posName : '')"
                        @update:modelValue="toggleSelection(String(item._id))"
                      />
                    </td>
                  </tr>
                </template>
                <template v-else>
                  <tr v-for="item in filteredList" :key="item._id" class="border-b hover:bg-orange-50">
                    <td class="p-2">
                      <VaCheckbox
                        :model-value="isChecked(item._id)"
                        :label="item.code + ' - ' + item.name + (props.type === 'options' ? ' - ' + item.posName : '')"
                        @update:modelValue="toggleSelection(String(item._id))"
                      />
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <div v-if="!isLoading && props.type === 'options'" class="pt-3">
            <!-- <div class="border rounded shadow-sm bg-white h-[65vh] overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="p-2 text-left font-semibold text-gray-700">Option Groups</th>
                  </tr>
                  <tr>
                    <th class="p-1 text-left align-top">
                      <VaInput v-model="groupSearchQuery" placeholder="Search..." size="small" class="mb-2" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in sortedList.filter((a) => a.display)"
                    :key="item._id"
                    class="border-b hover:bg-orange-50"
                  >
                    <td class="p-2">
                      <VaCheckbox
                        :model-value="item.selected"
                        :label="item.name + ' - ' + item.internalName"
                        @update:modelValue="item.selected = !item.selected"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div> -->
            <VaSelect
              v-model="selectedGroup"
              :options="sortedList.map((a) => ({ text: a.name + '-' + a.internalName, value: a._id }))"
              :filterable="true"
              :searchable="true"
              option-value="_id"
              option-label="name"
              clearable
              value-by="value"
              placeholder="Select Option Group"
              max-height="470px"
              class="w-full mb-5"
            />
            <div class="border rounded shadow-sm bg-white h-[65vh] overflow-y-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr>
                    <th class="p-2 text-left font-semibold text-gray-700">Options</th>
                  </tr>
                  <tr>
                    <th class="p-1 text-left align-top">
                      <!-- Search -->
                      <VaInput v-model="searchQuery" placeholder="Search..." size="small" class="mb-2" />
                      <!-- Select All -->
                      <VaCheckbox v-model="selectAll" class="ml-1" label="Select All" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="!searchQuery">
                    <tr
                      v-for="item in sortedList
                        .filter((a) => a._id === selectedGroup || !selectedGroup)
                        .flatMap((a) => a.computedOptions)"
                      :key="item._id"
                      class="border-b hover:bg-orange-50"
                    >
                      <td class="p-2">
                        <VaCheckbox
                          :model-value="isChecked(item._id)"
                          :label="
                            item.code + ' - ' + item.name + (props.type === 'options' ? ' - ' + item.posName : '')
                          "
                          @update:modelValue="toggleSelection(String(item._id))"
                        />
                      </td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr v-for="item in filteredList" :key="item._id" class="border-b hover:bg-orange-50">
                      <td class="p-2">
                        <VaCheckbox
                          :model-value="isChecked(item._id)"
                          :label="
                            item.code + ' - ' + item.name + (props.type === 'options' ? ' - ' + item.posName : '')
                          "
                          @update:modelValue="toggleSelection(String(item._id))"
                        />
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
          <div v-if="isLoading" class="border rounded shadow-sm bg-white h-[65vh] overflow-y-auto">
            <!-- LOADING SKELETON -->
            <VaSkeletonGroup animation="wave">
              <VaCard>
                <VaCardContent>
                  <VaSkeleton variant="text" height="64px" class="ml-2" :lines="5" />
                </VaCardContent>
              </VaCard>
            </VaSkeletonGroup>
          </div>
        </div>
      </div>
    </VaForm>

    <!-- FOOTER -->
    <template #footer>
      <div class="flex justify-end mt-6 w-full">
        <VaButton type="submit" @click="submit()">Update</VaButton>
      </div>
    </template>
  </VaModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, toRef, watch, nextTick, onBeforeUnmount } from 'vue'
import { useToast } from 'vuestic-ui'
import axios from 'axios'
import { getPromotionById, updatePromotion, getArticlesByOutlet } from '../services/promotionService'

/* Emits */
const emits = defineEmits(['cancel', 'promotionUpdated', 'save-pending-selections'])

/* Props */
const props = defineProps({
  isVisible: { type: Boolean, default: false },
  promotionId: { type: String, required: true },
  outletId: { type: String, required: true },
  pendingSelections: { type: Array, default: () => [] },
  isEditSelection: { type: Boolean, default: false },
  type: { type: String, default: 'menuItems' },
})

/* State */
const isVisible = toRef(props, 'isVisible')
const isLoading = ref(false)
const items = ref<any[]>([])
const groups = ref<any[]>([])
const articles = ref<any[]>([])
const selectedMenuItems = ref<string[]>([])
const selectedArticles = ref<string[]>([])
const searchQuery = ref('')
const selectedGroup = ref('')
const promotionData = ref<any>(null)
const { init } = useToast()
const selectAll = ref(false)

/* Computed lists */
const sourceList = computed(() => (props.type === 'options' ? groups.value : items.value))

const filteredAndSortedList = (list: any[]) => {
  const searchTerm = searchQuery.value.toLowerCase().trim()
  return list.filter((item) => {
    if (!item) return false
    const name = (item.name || '').toLowerCase()
    const code = (item.code || '').toLowerCase()
    const posName = (item.posName || '').toLowerCase()
    return searchTerm === '' || name.includes(searchTerm) || code.includes(searchTerm) || posName.includes(searchTerm)
  })
}

const sortedList = computed(() => {
  // Get base list excluding explicitly hidden items
  const list = sourceList.value.filter((item) => item.display !== false)

  // Sort by selection status
  const currentSelectedIds = props.type === 'options' ? selectedArticles.value : selectedMenuItems.value
  const normalizedSelectedIds = currentSelectedIds.map(String)

  const sortFn = (a: any, b: any) => {
    const aSelected = normalizedSelectedIds.includes(String(a._id))
    const bSelected = normalizedSelectedIds.includes(String(b._id))
    if (aSelected && !bSelected) return -1
    if (!aSelected && bSelected) return 1
    return 0
  }

  // Apply search filter and sort
  if (props.type === 'options') {
    return list.map((group) => ({
      ...group,
      computedOptions: filteredAndSortedList(group.computedOptions || []).sort(sortFn),
    }))
  } else {
    return filteredAndSortedList(list).sort(sortFn)
  }
})

const filteredList = computed(() => {
  // Get the search phrase and normalize it
  const searchPhrase = searchQuery.value.toLowerCase().trim()
  if (!searchPhrase) return []

  const list = sourceList.value

  const matchesAllTerms = (item: any) => {
    if (!item) return false

    // Create the same display text that's shown in the UI
    const displayText = `${item.code} - ${item.name}${props.type === 'options' ? ' - ' + item.posName : ''}`
      .toLowerCase()
      .trim()

    // Split search phrase into words
    const searchWords = searchPhrase.split(/\s+/).filter((word) => word.length > 0)

    // Split display text into words
    const displayWords = displayText.split(/[\s,.-]+/).filter((word) => word.length > 0)

    // Check that all search words match the beginning of words in the display text
    return searchWords.every((searchWord) => {
      return displayWords.some((displayWord) => {
        // For shorter search terms (1-2 chars), require exact match
        if (searchWord.length < 3) {
          return displayWord === searchWord
        }
        // For longer search terms, allow partial matches from the start of the word
        return displayWord.startsWith(searchWord)
      })
    })
  }

  if (props.type === 'options') {
    return list.flatMap((group) => group.computedOptions || []).filter(matchesAllTerms)
  } else {
    return list.filter(matchesAllTerms)
  }
})

const selectedItemsCount = computed(() => {
  return props.type === 'options' ? selectedArticles.value.length : selectedMenuItems.value.length
})

const selectedIds = computed(() => {
  // Get the correct list based on type
  const ids = props.type === 'options' ? selectedArticles.value : selectedMenuItems.value

  // Ensure we're working with an array and all IDs are strings
  const normalizedIds = (Array.isArray(ids) ? ids : []).map(String)

  // Remove any potential duplicates
  const uniqueIds = [...new Set(normalizedIds)]

  console.log('[computed:selectedIds] Current selectedIds:', uniqueIds)
  return uniqueIds
})

// Initialize from props
if (props.type === 'options') {
  selectedArticles.value = [...props.pendingSelections] as string[]
} else {
  selectedMenuItems.value = [...props.pendingSelections] as string[]
}

// Watch for prop changes to update local state
watch(
  () => props.pendingSelections,
  (newVal) => {
    console.log('[watch:pendingSelections] Updated:', newVal)
    if (props.type === 'options') {
      selectedArticles.value = [...newVal] as string[]
    } else {
      selectedMenuItems.value = [...newVal] as string[]
    }
  },
  { deep: true, immediate: true },
)

onBeforeUnmount(() => {
  console.log('[onBeforeUnmount] Cleaning up state')
  searchQuery.value = ''
  selectAll.value = false
  selectedMenuItems.value = []
  selectedArticles.value = []
})

// Reset display property when search is cleared
watch(
  searchQuery,
  () => {
    sourceList.value.forEach((item: any) => {
      if (props.type === 'options' && item.computedOptions) {
        item.computedOptions.forEach((option: any) => {
          option.display = true
        })
      }
      item.display = true
    })
  },
  { immediate: true },
)

watch(sourceList, () => {
  const visibleIds = sourceList.value.filter((item) => item.display !== false).map((item) => String(item._id))
  const targetList = props.type === 'options' ? selectedArticles.value : selectedMenuItems.value

  const allSelected = visibleIds.every((id) => targetList.includes(id))
  selectAll.value = allSelected
})

/* Helper to check if item is selected */
function isChecked(id: string) {
  const normalized = String(id)
  const list = props.type === 'options' ? selectedArticles.value : selectedMenuItems.value
  const exists = list.includes(normalized)

  console.log(`[isChecked] ID: ${normalized} | selected:`, list, '| exists:', exists)

  return exists
}

/* Reset search when modal closes (keep selections) */
watch(isVisible, (visible) => {
  console.log('[watch:isVisible] Modal visibility changed:', visible)
  if (!visible) {
    searchQuery.value = ''
  }
})

/* Pre-select items when promotionData AND items/articles are available */
watch([promotionData, items, articles], async ([promo]) => {
  console.log('[watch:promotionData+items+articles] Triggered with promo:', promo)

  if (!promo) return

  await nextTick()

  if (props.type === 'menuItems') {
    const validIds = items.value.map((i) => String(i._id))
    selectedMenuItems.value = (promo.menuItem || []).map(String).filter((id) => validIds.includes(id))
  }

  if (props.type === 'options') {
    const validIds = articles.value.map((i) => String(i._id))
    selectedArticles.value = (promo.option || []).map(String).filter((id) => validIds.includes(id))

    console.log('[watch] Valid options after filtering:', selectedArticles.value)
  }
})

watch(selectAll, (value) => {
  // Get the list of items based on whether we have a search query
  let itemsToSelect = searchQuery.value ? filteredList.value : sourceList.value

  // For options type, handle special case
  if (props.type === 'options' && !searchQuery.value) {
    itemsToSelect = sourceList.value
      .filter((group) => group._id === selectedGroup.value || !selectedGroup.value)
      .flatMap((group) => group.computedOptions || [])
  }

  // Get the IDs to work with
  const itemIds = itemsToSelect.map((item) => String(item._id))

  // Get reference to the correct target list
  const targetList = props.type === 'options' ? selectedArticles : selectedMenuItems

  if (value) {
    // Select all items - add new IDs that aren't already selected
    itemIds.forEach((id) => {
      if (!targetList.value.includes(id)) {
        targetList.value.push(id)
      }
    })
  } else {
    // Deselect items - only remove IDs that are in our current view
    targetList.value = targetList.value.filter((id) => !itemIds.includes(id))
  }
})

/* Toggle selection */
function toggleSelection(id: string) {
  const target = props.type === 'options' ? selectedArticles.value : selectedMenuItems.value

  const idx = target.indexOf(id)
  if (idx > -1) {
    target.splice(idx, 1)
  } else {
    target.push(id)
  }
}

const getOptionGroups = async () => {
  const url = import.meta.env.VITE_API_BASE_URL
  isLoading.value = true
  try {
    const response = await axios.get(
      url + `/articles-options-groups?limit=100000&&sortKey=name&sortValue=asc&outletId=${props.outletId}`,
    )
    // Handle response structures: array directly, { items: [...] }, or { result: [...] }
    const rawData = response.data
    const item = Array.isArray(rawData) ? rawData : (rawData.items || rawData.result || [])
    groups.value = item.map((e) => {
      return {
        ...e,
        selected: !!e.options.find((a) => selectedIds.value.includes(a)),
        display: true,
        computedOptions: articles.value.filter((a) => e.options.includes(a._id)),
      }
    })
    console.log('[getOptionGroups] Loaded groups:', groups.value)
  } catch (error) {
    init({ message: 'Failed to load OptionGroups', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}

/* Fetch menu items */
const fetchMenuItems = async () => {
  isLoading.value = true
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/menuItems`, {
      params: { outletId: props.outletId, sortKey: 'id', sortValue: 'asc', isDeleted: false, limit: 1000000 },
    })
    items.value = res.data.map((i: any) => ({ ...i, display: true, _id: String(i._id) }))
    console.log('[fetchMenuItems] Loaded menu items:', items.value)
  } catch (err) {
    console.error('[fetchMenuItems] Failed:', err)
  } finally {
    isLoading.value = false
  }
}

/* Fetch options (articles) */
async function loadArticles(outletId: string) {
  try {
    const result = await getArticlesByOutlet(outletId)
    articles.value = (Array.isArray(result) ? result : []).map((a: any) => ({
      ...a,
      display: true,
      _id: String(a._id),
    }))
    console.log('[loadArticles] Loaded options:', articles.value)
    getOptionGroups()
  } catch (err) {
    console.error('[loadArticles] Failed:', err)
    articles.value = []
  }
}

/* Load promotion details */
const loadPromotion = async () => {
  try {
    const res = await getPromotionById(props.promotionId)
    const promo = Array.isArray(res.data) ? res.data[0] : res.data
    promotionData.value = promo || null
    console.log('[loadPromotion] Promotion data loaded:', promotionData.value)
  } catch (err) {
    console.error('[loadPromotion] Failed:', err)
    promotionData.value = null
  }
}

/* Submit */
const submit = async () => {
  try {
    if (!props.promotionId) {
      emits('save-pending-selections', selectedIds.value)
      init({ message: 'Selections saved for later.', color: 'warning' })
      emits('cancel')
      return
    }

    const payload =
      props.type === 'options' ? { option: selectedArticles.value } : { menuItem: selectedMenuItems.value }

    console.log('[submit] Payload being sent:', payload)
    await updatePromotion(props.promotionId, payload)

    init({ message: 'Promotion updated successfully!', color: 'success' })
    emits('promotionUpdated')
    emits('cancel')
  } catch (err) {
    console.error('[submit] Error updating promotion:', err)
    init({
      message: err?.response?.data?.message || 'Failed to update promotion',
      color: 'danger',
    })
  }
}

/* Lifecycle */
onMounted(() => {
  console.log('[onMounted] Modal mounted. Type:', props.type)

  const init = async () => {
    if (props.type === 'options') {
      await loadArticles(props.outletId)
    } else {
      await fetchMenuItems()
    }

    if (props.promotionId) {
      await loadPromotion()
    }
  }

  init()
})
</script>

<style scoped>
tr {
  width: 100%;
}
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}
.h-\[65vh\] {
  max-height: 70vh;
}
.va-checkbox .va-checkbox__square {
  background: #f3f4f6 !important;
  border: 1px solid #d1d5db !important;
}
</style>
