<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useServiceStore } from '@/stores/services'
import ConfigurationModal from './ConfigurationModal.vue'
import axios from 'axios'
import { useToast } from 'vuestic-ui'
const props = defineProps({
  selectedOptions: {
    type: Object || String,
    default: () => '',
  },
})
const emits = defineEmits(['cancel'])
const servicesStore = useServiceStore()
const isConfigurationModal = ref(false)
const items = ref([])
const { init } = useToast()
const isLoading = ref(false)
const isSubmitting = ref(false)
const optionId = ref('')
const searchQuery = ref('')
const filteredItems = computed(() =>
  items.value.filter((item) => {
    const query = searchQuery.value.toLowerCase()
    return (
      item.name?.toLowerCase().includes(query) ||
      item.code?.toLowerCase().includes(query) ||
      item.posName?.toLowerCase().includes(query)
    )
  }),
)

const defaultOptions = ref([])

defaultOptions.value = props.selectedOptions.defaultOptions

const selectAll = ref(false)
const toggleAll = () => {
  filteredItems.value.forEach((item) => {
    item.isChecked = selectAll.value
  })
}
watch(
  items,
  () => {
    const allChecked = filteredItems.value.length > 0 && filteredItems.value.every((p) => p.isChecked)
    if (selectAll.value !== allChecked) {
      selectAll.value = allChecked
    }
  },
  { deep: true },
)
const updateSelectAll = () => {
  const allChecked = filteredItems.value.length > 0 && filteredItems.value.every((p) => p.isChecked)
  selectAll.value = allChecked
}
const getOptions = async () => {
  const url = import.meta.env.VITE_API_BASE_URL
  isLoading.value = true
  try {
    const response = await axios.get(url + '/articles-options?limit=10000&outletId=' + servicesStore.selectedRest)

    // Handle response structures: array directly, { items: [...] }, or { result: [...] }
    const rawData = response.data
    const data = Array.isArray(rawData) ? rawData : (rawData.items || rawData.result || [])

    items.value = data
      .map((e) => {
        return {
          isChecked: props.selectedOptions.options?.includes(e._id) || false,
          ...e,
          isOriginalChecked: props.selectedOptions.options?.includes(e._id) || false,
        }
      })
      .sort((a, b) => (a.isOriginalChecked === b.isOriginalChecked ? 0 : a.isOriginalChecked ? -1 : 1))
  } catch (error) {
    console.error('[Options Modal] Failed to load options:', error)
    init({ message: 'Failed to load Options', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}

const setDefaultOptions = async () => {
  const url = import.meta.env.VITE_API_BASE_URL
  try {
    await axios.patch(`${url}/articles-options-groups/${props.selectedOptions._id}`, {
      defaultOptions: defaultOptions.value,
    })
  } catch (error) {
    console.error('Error loading default options:', error.response?.data || error)
    init({ message: 'Failed to load default options', color: 'warning' })
  }
}

const initOptions = async () => {
  if (!props.selectedOptions || !props.selectedOptions._id) return
  await getOptions()
}

watch(
  () => props.selectedOptions,
  (val) => {
    if (val && val._id) {
      initOptions()
    }
  },
  { immediate: true },
)

async function submit() {
  isSubmitting.value = true
  setDefaultOptions()
  const url = import.meta.env.VITE_API_BASE_URL
  const selectedOptions = items.value.filter((item) => item.isChecked).map((item) => item._id)
  const removedOptions = items.value.filter((item) => !item.isChecked && item.isOriginalChecked).map((item) => item._id)
  if (selectedOptions.length) {
    try {
      await axios.patch(`${url}/articles-options-groups/${props.selectedOptions._id}/add-options`, {
        optionIds: selectedOptions,
      })
    } catch (error) {
      init({ message: error.response.data.message, color: 'danger' })
      return
    }
  }

  if (removedOptions.length > 0) {
    try {
      await axios.patch(`${url}/articles-options-groups/${props.selectedOptions._id}/remove-options`, {
        optionIds: removedOptions,
      })
    } catch (error) {
      init({ message: error.response.data.message, color: 'danger' })
      return
    }
  }
  init({ message: 'Options updated successfully', color: 'success' })
  isSubmitting.value = false
  emits('cancel')
}

function checkDefaultOptions(id: any) {
  if (defaultOptions.value.includes(id)) {
    defaultOptions.value = defaultOptions.value.filter((optionId) => optionId !== id)
  } else {
    defaultOptions.value.push(id)
  }
}
</script>
<template>
  <div>
    <VaModal
      class="big-modal"
      size="large"
      hide-default-actions
      :model-value="true"
      close-button
      @update:modelValue="emits('cancel')"
    >
      <template #header>
        <h1 class="va-h6 mb-2">Options</h1>
      </template>
      <div class="row align-items-center mb-2">
        <div class="mt-2 mb-4 w-full flex justify-start">
          <div class="w-1/2">
            <VaInput v-model="searchQuery" placeholder="Search..." clearable />
          </div>
        </div>

        <div class="max-h-[50vh] overflow-y-auto">
          <table class="w-full border-collapse border border-gray-200">
            <thead>
              <tr class="">
                <th colspan="2" class="p-2 text-left font-light">
                  <div class="flex items-center space-x-2">
                    <VaCheckbox v-model="selectAll" label="Select All" @update:modelValue="toggleAll" />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(item, index) in filteredItems"
                :key="item._id"
                :class="{ 'bg-gray-50': index % 2 === 0 }"
                class="border-b hover:bg-gray-100 transition-colors"
              >
                <td class="p-2">
                  <div class="flex justify-between items-center w-full">
                    <!-- LEFT SIDE: Checkbox + Name/Code -->
                    <div class="flex items-center gap-2 flex-wrap">
                      <VaCheckbox v-model="item.isChecked" class="m-0" @update:modelValue="updateSelectAll" />
                      <span>
                        <template v-if="item.code">{{ item.code }}</template>
                        <template v-if="item.code && (item.name || item.posName)"> - </template>
                        <template v-if="item.name">{{ item.name }}</template>
                        <template v-if="item.name && item.posName"> - </template>
                        <template v-if="item.posName">{{ item.posName }}</template>
                      </span>
                      <span
                        class="cursor-pointer text-xs font-semibold px-3 py-0.5 rounded-full transition-all duration-200 shadow-sm"
                        :class="{
                          'bg-gradient-to-r from-green-200 via-green-300 to-green-400 text-green-900 border border-green-500':
                            defaultOptions.includes(item._id),
                          'bg-gray-200 text-gray-700 hover:bg-gray-300': !defaultOptions.includes(item._id),
                        }"
                        @click="checkDefaultOptions(item._id)"
                      >
                        Default
                      </span>
                    </div>

                    <!-- RIGHT SIDE: Configure button -->

                    <span
                      v-if="item.type.toLowerCase() === 'article'"
                      class="cursor-pointer text-xs font-semibold px-3 py-0.5 rounded-full transition-all duration-200 shadow-sm"
                      :class="{
                        'bg-gradient-to-r from-blue-200 via-blue-300 to-blue-400 text-blue-900 border border-blue-500': true,
                        'opacity-50 pointer-events-none select-none': !item.isChecked,
                      }"
                      @click="(optionId = item._id), (isConfigurationModal = true)"
                    >
                      Configure
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end mt-4">
          <VaButton :loading="isSubmitting || isLoading" :disabled="isSubmitting" type="button" @click="submit">
            Update
          </VaButton>
        </div>
      </template>
    </VaModal>
    <ConfigurationModal
      v-if="isConfigurationModal"
      :option-group-id="selectedOptions._id"
      :option-id="optionId"
      @cancel="isConfigurationModal = false"
    />
  </div>
</template>
