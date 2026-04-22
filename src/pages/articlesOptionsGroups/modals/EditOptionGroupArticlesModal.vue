<template>
  <VaModal
    class="big-modal"
    size="large"
    hide-default-actions
    :model-value="true"
    close-button
    @update:modelValue="emits('cancel')"
  >
    <template #header>
      <h1 class="va-h6 mb-2">Add / Remove Articles</h1>
    </template>
    <div>
      <VaInput
        v-model="searchQuery"
        placeholder="Search articles by code or name..."
        class="max-w-[400px] mb-5 w-full"
        size="small"
      />
      <div class="max-h-[60vh] overflow-y-auto">
        <table v-if="!isLoading" class="w-full table border border-gray-200 mb-4">
          <thead></thead>
          <tbody>
            <tr v-for="article in items" :key="article.id" class="border-b border-gray-200">
              <td class="p-2">
                <VaCheckbox
                  v-model="menuItems"
                  :array-value="article._id"
                  :label="article.code + '-' + localName(article.name)"
                  @update:modelValue="submit"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <VaSkeletonGroup v-else animation="wave">
          <VaCard>
            <VaCardContent>
              <VaSkeleton variant="text" height="64px" class="ml-2" :lines="5" />
            </VaCardContent>
            <VaCardActions class="flex justify-end" style="display: flex; justify-content: end">
              <VaSkeleton variant="rounded" inline width="64px" height="32px" />
            </VaCardActions>
          </VaCard>
        </VaSkeletonGroup>
      </div>
      <VaPagination
        v-if="!isLoading"
        v-model="currentPage"
        :pages="pages"
        buttons-preset="default"
        gapped
        :visible-pages="3"
        class="justify-center theme-gradient"
      />
    </div>
  </VaModal>
</template>
<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { useServiceStore } from '@/stores/services'
import { useToast, useForm } from 'vuestic-ui'
import { useI18n } from 'vue-i18n'
const { locale } = useI18n()
const localName = (val: any) => {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') return val[locale.value] || val['en'] || Object.values(val)[0] || ''
  return String(val)
}
const emits = defineEmits(['cancel'])
const props = defineProps({
  selectedItems: {
    type: Object || String,
    default: () => '',
  },
})
const { validate } = useForm('form')
const { init } = useToast()
const isLoading = ref(false)
const isSubmitting = ref(false)
const servicesStore = useServiceStore()
const searchQuery = ref('')
const sortBy = ref('name')
const sortOrder = ref('asc')
const items = ref([])
const articles = ref([])
const count = ref(0)
const currentPage = ref(1)
const pages = computed(() => Math.ceil(count.value / 50))
const menuItems = ref([])

if (props.selectedItems && props.selectedItems.menuItems) {
  menuItems.value = props.selectedItems.menuItems
}
const getArticles = (outletId) => {
  items.value = []
  isLoading.value = true
  const url = import.meta.env.VITE_API_BASE_URL
  axios
    .get(
      `${url}/menuItems?outletId=${outletId}&limit=50&page=${currentPage.value}&search=${searchQuery.value}&sortKey=${sortBy.value}&sortValue=${sortOrder.value}`,
    )
    .then((response) => {
      items.value = response.data
        .map((item) => ({
          ...item,
          selected: menuItems.value.includes(item._id),
        }))
        .sort((a, b) => {
          return b.selected - a.selected
        })
      isLoading.value = false
    })
}

const getArticlesCount = (outletId) => {
  const url = import.meta.env.VITE_API_BASE_URL
  axios.get(`${url}/menuItems/count?outletId=${outletId}&search=${searchQuery.value}`).then((response) => {
    count.value = Number(response.data.totalNoRec)
  })
}

getArticles(servicesStore.selectedRest)
getArticlesCount(servicesStore.selectedRest)

watch(currentPage, (newPage) => {
  getArticles(servicesStore.selectedRest)
})
watch(searchQuery, (search) => {
  getArticles(servicesStore.selectedRest)
  getArticlesCount(servicesStore.selectedRest)
})

const submit = async () => {
  isSubmitting.value = true
  try {
    await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/articles-options-groups/${props.selectedItems._id}`, {
      menuItems: menuItems.value,
    })
    init({ message: "You've successfully updated a Articles", color: 'success' })
  } catch (error) {
    init({ message: error.response.data.message, color: 'danger' })
    isSubmitting.value = false
  } finally {
    isSubmitting.value = false
  }
}
</script>
