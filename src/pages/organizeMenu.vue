<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { VueDraggableNext } from 'vue-draggable-next'
import { useCategoryStore } from '../stores/categories'
import { useServiceStore } from '@/stores/services'
import { useToast } from 'vuestic-ui'
import axios from 'axios'

const serviceStore = useServiceStore()
const categoriesStore = useCategoryStore()
const { init } = useToast()
const isLoading = ref(true)
const loading = ref(false)
const categories = ref([])
const selectedCategory = ref(null)
const selectedSubcategory = ref(null)
const selectedArticle = ref(null)
const selectedGroup = ref(null)

// Track collapsed state of each column
const collapsed = ref({
  categories: false,
  subcategories: false,
  articles: false,
  groups: false,
  options: false,
})

// ----- API Calls -----
const getArticles = async () => {
  loading.value = true
  if (!selectedCategory.value) {
    loading.value = false
    return
  }

  const selectedCategoryIndex = categories.value.findIndex((c) => c._id === selectedCategory.value._id)
  if (selectedCategoryIndex === -1) {
    loading.value = false
    return
  }

  const url = import.meta.env.VITE_API_BASE_URL
  axios
    .get(`${url}/menuitemsvo?limit=100000`, {
      params: {
        outletId: serviceStore.selectedRest,
        categoryId: selectedCategory.value._id,
      },
    })
    .then((resp) => {
      const cat = categories.value[selectedCategoryIndex]

      cat.articles = resp.data.filter((a) => !a.subCategories.length)
      cat.subCategories = (cat.subCategories || []).map((sub) => ({
        ...sub,
        articles: resp.data
          .filter((a) => a.subCategories.find((s) => s.id === sub._id))
          .sort(
            (a, b) =>
              (a.subCategories.find((s) => s.id === sub._id).sortOrder || 0) -
              (b.subCategories.find((s) => s.id === sub._id).sortOrder || 0),
          ),
      }))
      loading.value = false
    })
    .catch(() => {
      loading.value = false
    })
}

const getCategories = async (outletId) => {
  isLoading.value = true
  await categoriesStore.getAll(outletId)
  const items = categoriesStore.items.map(item => ({
    _id: item._id || '',
    name: item.name || '',
    subCategories: item.subCategories || [],
    ...item,
  }))
  categories.value = items
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((cat) => ({
      ...cat,
      subCategories: (cat.subCategories || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    }))
  if (categories.value.length) selectedCategory.value = categories.value[0]
  await getArticles()
  isLoading.value = false
}

// ----- Drag & Drop Handlers -----
const updateSortOrder = async (payload) => {
  const url = import.meta.env.VITE_API_BASE_URL
  axios
    .post(`${url}/organize-menu`, payload)
    .then(() => init({ message: 'Order updated.', color: 'success' }))
    .catch((err) => {
      init({ message: err.response.data.error, color: 'danger' })
      if (serviceStore.selectedRest) getCategories(serviceStore.selectedRest)
    })
}

const movedCategory = async ($event) => {
  if (!$event.moved) return
  categories.value.forEach((c, idx) => (c.sortOrder = idx))
  const payload = {
    resourceType: 'categories',
    items: categories.value.map((c) => ({ id: c._id, sortOrder: c.sortOrder })),
  }
  await updateSortOrder(payload)
}

const movedSubCategory = async ($event, category) => {
  const cat = categories.value.find((c) => c._id === category._id)
  cat.subCategories.forEach((s, idx) => (s.sortOrder = idx))
  const payload = {
    resourceType: 'subcategories',
    categoryId: cat._id,
    items: cat.subCategories.filter((s) => !s.isArticle).map((s) => ({ id: s._id, sortOrder: s.sortOrder })),
  }
  await updateSortOrder(payload)
}

const movedArticle = async ($event, category, subcategory = null) => {
  const cat = categories.value.find((c) => c._id === category._id)
  let items = []
  if (subcategory) items = cat.subCategories.find((s) => s._id === subcategory._id).articles
  else items = cat.articles

  const payload = {
    resourceType: 'menuitems',
    categoryId: cat._id,
    subcategoryId: subcategory?._id,
    items: items.map((a, idx) => ({ id: a._id, sortOrder: idx })),
  }
  await updateSortOrder(payload)
}

const movedArticleGroup = async ($event) => {
  if (!$event.moved) return

  const items =
    selectedSubcategory.value?.articlesOptionsGroup ||
    selectedArticle.value?.articlesOptionsGroup ||
    selectedCategory.value?.articlesOptionsGroup ||
    []

  // Update sortOrder
  items.forEach((grp, idx) => (grp.sortOrder = idx))

  const payload = {
    resourceType: 'articleoptionsgroups',
    categoryId: selectedCategory.value?._id,
    subcategoryId: selectedSubcategory.value?._id,
    menuitemId: selectedArticle.value?._id,
    items: items.map((g) => ({ id: g._id, sortOrder: g.sortOrder })),
  }

  await updateSortOrder(payload)
}

const movedArticleOption = async ($event) => {
  if (!$event.moved) return

  const updatedGroupId = selectedGroup.value?._id
  if (!updatedGroupId) return

  // Recalculate sort order for current group's options
  const items = selectedGroup.value?.articlesOptions || []
  items.forEach((opt, idx) => (opt.sortOrder = idx))

  // --- Collect all articles that share the same group ---
  const affectedArticles: { cat: any; sub?: any; article: any }[] = []

  categories.value.forEach((cat) => {
    cat.articles?.forEach((article) => {
      if (article.articlesOptionsGroup?.some((g) => g._id === updatedGroupId)) {
        affectedArticles.push({ cat, article })
      }
    })

    cat.subCategories?.forEach((sub) => {
      sub.articles?.forEach((article) => {
        if (article.articlesOptionsGroup?.some((g) => g._id === updatedGroupId)) {
          affectedArticles.push({ cat, sub, article })
        }
      })
    })
  })

  // --- Send updates for all affected articles ---
  const updatePromises = affectedArticles.map(({ cat, sub, article }) => {
    const payload = {
      resourceType: 'articleoptions',
      categoryId: cat._id,
      subcategoryId: sub?._id,
      menuitemId: article._id,
      articlesOptionsGroupId: updatedGroupId,
      items: items.map((o) => ({ id: o._id, sortOrder: o.sortOrder })),
    }
    return axios.post(`${import.meta.env.VITE_API_BASE_URL}/organize-menu`, payload)
  })

  try {
    await Promise.all(updatePromises)
    init({ message: 'Order updated for all related articles.', color: 'success' })
  } catch (err: any) {
    init({ message: err.response?.data?.error || 'Update failed', color: 'danger' })
    if (serviceStore.selectedRest) getCategories(serviceStore.selectedRest)
  }
}

watch(
  () => serviceStore.selectedRest,
  (newId) => {
    if (newId) getCategories(newId)
  },
  { immediate: true },
)

// ----- Filters -----
const filteredSubcategories = computed(() => selectedCategory.value?.subCategories || [])
const filteredArticles = computed(() => {
  if (!selectedCategory.value) return []
  if (selectedSubcategory.value) return selectedSubcategory.value.articles || []
  return selectedCategory.value.articles || []
})
const filteredGroups = computed(() => selectedArticle.value?.articlesOptionsGroup || [])
const filteredOptions = computed(() => selectedGroup.value?.articlesOptions || [])

const sharedGroupNotice = computed(() => {
  if (!selectedGroup.value || !selectedCategory.value) return null

  // Count all articles in the current category that use the same group ID
  let count = 0

  categories.value.forEach((cat) => {
    const articlesToCheck = cat.articles || []
    cat.subCategories?.forEach((sub) => {
      articlesToCheck.push(...(sub.articles || []))
    })

    articlesToCheck.forEach((art) => {
      const groupIds = (art.articlesOptionsGroup || []).map((g) => g._id)
      if (groupIds.includes(selectedGroup.value._id)) count++
    })
  })

  // Remove the current article itself
  count = Math.max(0, count - 1)

  if (count > 0)
    return `This Group is used in ${count} other Article${
      count > 1 ? 's' : ''
    }. Updating the Options will reflect in all Articles. To see changes reflected in other Articles, please refresh the page.`

  return null
})
</script>

<template>
  <div class="organize-menu flex gap-4 pt-4 h-screen bg-slate-100">
    <!-- Categories -->
    <div
      :class="[
        'column border rounded-lg bg-white flex flex-col transition-all duration-300 overflow-hidden',
        collapsed.categories ? 'collapsed' : 'flex-1',
      ]"
    >
      <div class="header">
        <h3 v-if="!collapsed.categories" class="title">Categories</h3>
        <button class="toggle-btn" @click="collapsed.categories = !collapsed.categories">
          {{ collapsed.categories ? '+' : '−' }}
        </button>
      </div>
      <div v-if="!collapsed.categories" class="flex-1 overflow-y-auto p-2">
        <VueDraggableNext :list="categories" @change="movedCategory">
          <div
            v-for="cat in categories"
            :key="cat._id"
            :class="['item-card', selectedCategory?._id === cat._id ? 'selected' : '']"
            @click="
              (selectedCategory = cat),
                (selectedSubcategory = null),
                (selectedArticle = null),
                (selectedGroup = null),
                getArticles()
            "
          >
            <VaIcon name="drag_indicator" class="cursor-move text-slate-400" /> {{ cat.name }}
          </div>
        </VueDraggableNext>
      </div>
      <div v-else class="collapsed-title">Categories</div>
    </div>

    <!-- Subcategories -->
    <div
      :class="[
        'column border rounded-lg bg-white flex flex-col transition-all duration-300 overflow-hidden',
        collapsed.subcategories ? 'collapsed' : 'flex-1',
      ]"
    >
      <div class="header">
        <h3 v-if="!collapsed.subcategories" class="title">Sub-Categories</h3>
        <button class="toggle-btn" @click="collapsed.subcategories = !collapsed.subcategories">
          {{ collapsed.subcategories ? '+' : '−' }}
        </button>
      </div>
      <div v-if="!collapsed.subcategories" class="flex-1 overflow-y-auto p-2">
        <VueDraggableNext :list="filteredSubcategories" @change="(cat) => movedSubCategory(cat, selectedCategory)">
          <div
            v-for="sub in filteredSubcategories"
            :key="sub._id"
            :class="['item-card', selectedSubcategory?._id === sub._id ? 'selected' : '']"
            @click="(selectedSubcategory = sub), (selectedArticle = null), (selectedGroup = null), getArticles()"
          >
            <VaIcon name="drag_indicator" class="cursor-move text-slate-400" /> {{ sub.name }}
          </div>
        </VueDraggableNext>
      </div>
      <div v-else class="collapsed-title">Sub-Categories</div>
    </div>

    <!-- Articles -->
    <div
      :class="[
        'column border rounded-lg bg-white flex flex-col transition-all duration-300 overflow-hidden',
        collapsed.articles ? 'collapsed' : 'flex-1',
      ]"
    >
      <div class="header">
        <h3 v-if="!collapsed.articles" class="title">Articles</h3>
        <button class="toggle-btn" @click="collapsed.articles = !collapsed.articles">
          {{ collapsed.articles ? '+' : '−' }}
        </button>
      </div>
      <div v-if="!collapsed.articles" class="flex-1 overflow-y-auto p-2">
        <VueDraggableNext
          :list="filteredArticles"
          @change="(cat) => movedArticle(cat, selectedCategory, selectedSubcategory)"
        >
          <div
            v-for="art in filteredArticles"
            :key="art._id"
            :class="['item-card', selectedArticle?._id === art._id ? 'selected' : '']"
            @click="(selectedArticle = art), (selectedGroup = null)"
          >
            <VaIcon name="drag_indicator" class="cursor-move text-slate-400" /> {{ art.name }}
          </div>
        </VueDraggableNext>
      </div>
      <div v-else class="collapsed-title">Articles</div>
    </div>

    <!-- Groups -->
    <div
      :class="[
        'column border rounded-lg bg-white flex flex-col transition-all duration-300 overflow-hidden',
        collapsed.groups ? 'collapsed' : 'flex-1',
      ]"
    >
      <div class="header">
        <h3 v-if="!collapsed.groups" class="title">Groups</h3>
        <button class="toggle-btn" @click="collapsed.groups = !collapsed.groups">
          {{ collapsed.groups ? '+' : '−' }}
        </button>
      </div>
      <div v-if="!collapsed.groups" class="flex-1 overflow-y-auto p-2">
        <VueDraggableNext :list="filteredGroups" @change="movedArticleGroup">
          <div
            v-for="grp in filteredGroups"
            :key="grp._id"
            :class="['item-card', selectedGroup?._id === grp._id ? 'selected' : '']"
            @click="selectedGroup = grp"
          >
            <VaIcon name="drag_indicator" class="cursor-move text-slate-400" /> {{ grp.name }}
          </div>
        </VueDraggableNext>
      </div>
      <div v-else class="collapsed-title">Groups</div>
    </div>

    <!-- Options -->
    <div
      :class="[
        'column border rounded-lg bg-white flex flex-col transition-all duration-300 overflow-hidden',
        collapsed.options ? 'collapsed' : 'flex-1',
      ]"
    >
      <div class="header">
        <h3 v-if="!collapsed.options" class="title">Options</h3>
        <button class="toggle-btn" @click="collapsed.options = !collapsed.options">
          {{ collapsed.options ? '+' : '−' }}
        </button>
      </div>
      <div v-if="!collapsed.options" class="flex-1 overflow-y-auto p-2">
        <div v-if="sharedGroupNotice" class="shared-group-notice mb-2 text-sm text-gray-600 flex items-center gap-3">
          <VaIcon name="info" class="text-blue-500 w-4 h-4" />
          <span>{{ sharedGroupNotice }}</span>
        </div>

        <VueDraggableNext :list="filteredOptions" @change="movedArticleOption">
          <div v-for="opt in filteredOptions" :key="opt._id" class="item-card">
            <VaIcon name="drag_indicator" class="cursor-move text-slate-400" /> {{ opt.name }}
          </div>
        </VueDraggableNext>
      </div>
      <div v-else class="collapsed-title">Options</div>
    </div>
  </div>
</template>

<style scoped>
.organize-menu {
  width: 100%;
  height: calc(100vh - 5.5rem);
}

.column {
  min-width: 220px;
}

.column.collapsed {
  min-width: 46px;
  max-width: 46px;
  flex: none;
  padding: 0rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.title {
  flex: 1;
  text-align: center;
  font-weight: bold;
  color: #374151;
  margin: 0;
  margin-top: 1rem;
  align-items: center;
  justify-content: center;
  display: flex;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: #f3f6f8;
  color: #111827;
}

.toggle-btn:active {
  transform: scale(0.95);
}

.collapsed-title {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-weight: bold;
  color: #374151;
  margin: 0;
  margin-top: 1rem;
  align-items: center;
  justify-content: center;
  display: flex;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 0.375rem;
  border-radius: 0.5rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  transition: all 0.15s ease-in-out;
  cursor: move;
}

.item-card:hover {
  background: #f2f6f8;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.item-card.selected {
  background: #f0f9ff;
  border-color: #3b82f6;
}

.shared-group-notice {
  font-style: italic;
  font-size: small;
  background: #f9fafb;
  padding: 0.25rem 0.5rem;
  border: 2px solid #3b82f6;
  border-radius: 0.5rem;
}
</style>
