<template>
  <VaModal v-model="isVisible" class="big-xl-modal !p-0" size="large" close-button hide-default-actions>
    <template #header>
      <h1 class="va-h6 mb-3">{{ isUpdating ? 'Update Selection' : 'Add Selection' }}</h1>
    </template>

    <VaForm ref="form" @submit.prevent="submit">
      <div class="grid gap-4">
        <!-- Combined Input Row -->
        <div class="grid md:grid-cols-4 gap-4">
          <VaInput
            v-model="formData.name"
            label="Name"
            placeholder="Enter name"
            required-mark
            :rules="[validators.required]"
          />

          <VaInput
            v-model="formData.min"
            label="Min"
            type="number"
            min="0"
            required-mark
            :rules="[validateMin]"
            :disabled="!formData.isRequired"
          />

          <VaInput v-model="formData.max" label="Max" type="number" min="0" required-mark :rules="[validateMax]" />
          <VaSelect
            v-model="formData.isRequired"
            label="Is Required"
            :options="[true, false]"
            placeholder="Select if required"
            required-mark
          />
        </div>

        <div class="grid md:grid-cols-3 gap-4 text-sm leading-tight">
          <!-- Menu Items -->
          <div>
            <div class="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Articles</div>

            <!-- Static Search Bar -->
            <VaInput v-model="searchQuery" placeholder="Search..." size="small" class="w-full mb-2" />

            <!-- Scrollable List -->
            <div class="border rounded shadow-sm bg-white h-[50vh] overflow-y-hidden">
              <table v-if="!isLoading" class="w-full text-sm">
                <tbody>
                  <VaVirtualScroller
                    v-slot="{ item, index }"
                    :items="items.filter((a) => a.display)"
                    :wrapper-size="400"
                  >
                    <tr
                      class="border-b hover:bg-green-50"
                      :class="[{ hidden: !item.display, table: item.display }, item.isVisible ? 'bg-blue-50' : '']"
                    >
                      <td class="p-2 w-full">
                        <div class="flex items-center justify-between">
                          <VaCheckbox
                            v-model="item.selected"
                            :true-value="item._id"
                            :label="item.code + ' - ' + localName(item.name)"
                            class="check"
                          />

                          <div class="flex items-center gap-1">
                            <div class="w-12">
                              <VaInput
                                v-model="item.customPrice"
                                type="number"
                                placeholder="Price"
                                class="w-full"
                                :disabled="item.isFree"
                                @input="item.customPrice > 0 ? (item.isFree = false) : 0"
                              />
                            </div>
                            <span
                              class="ml-1 cursor-pointer text-xs font-semibold px-2 py-0.5 rounded-full transition-all duration-200 shadow-sm"
                              :class="[
                                item.isFree
                                  ? 'bg-gradient-to-r from-blue-200 via-blue-300 to-blue-400 text-blue-900 border border-blue-500'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
                                { 'opacity-50 pointer-events-none': item.customPrice > 0 },
                              ]"
                              @click="item.customPrice <= 0 ? (item.isFree = !item.isFree) : false"
                            >
                              Free
                            </span>

                            <!-- Default span -->
                            <span
                              class="ml-1 cursor-pointer text-xs font-semibold px-2 py-0.5 rounded-full transition-all duration-200 shadow-sm"
                              :class="{
                                'bg-gradient-to-r from-green-200 via-green-300 to-green-400 text-green-900 border border-green-500':
                                  defaultArticles.includes(item._id),
                                'bg-gray-200 text-gray-700 hover:bg-gray-300': !defaultArticles.includes(item._id),
                              }"
                              @click="checkDefaultArticle(item._id)"
                            >
                              Default
                            </span>
                            <span
                              class="ml-1 cursor-pointer px-1 rounded-xl transition-all duration-200 shadow-sm hover:bg-gray-300"
                              :class="[
                                item.isVisible
                                  ? 'text-blue-600 bg-blue-100 border border-blue-300'
                                  : 'text-gray-600 bg-gray-200',
                                { 'opacity-50 pointer-events-none': item.customPrice > 0 },
                              ]"
                              :title="item.isVisible ? 'Hide' : 'Show'"
                              @click="viewItems(item._id)"
                            >
                              <svg
                                v-if="item.isVisible"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                                class="w-4"
                              >
                                <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                                <path
                                  fill-rule="evenodd"
                                  d="M1.38 8.28a.87.87 0 0 1 0-.566 7.003 7.003 0 0 1 13.238.006.87.87 0 0 1 0 .566A7.003 7.003 0 0 1 1.379 8.28ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                  clip-rule="evenodd"
                                />
                              </svg>
                              <svg
                                v-else
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                                class="w-4"
                              >
                                <path
                                  fill-rule="evenodd"
                                  d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l10.5 10.5a.75.75 0 1 0 1.06-1.06l-1.322-1.323a7.012 7.012 0 0 0 2.16-3.11.87.87 0 0 0 0-.567A7.003 7.003 0 0 0 4.82 3.76l-1.54-1.54Zm3.196 3.195 1.135 1.136A1.502 1.502 0 0 1 9.45 8.389l1.136 1.135a3 3 0 0 0-4.109-4.109Z"
                                  clip-rule="evenodd"
                                />
                                <path
                                  d="m7.812 10.994 1.816 1.816A7.003 7.003 0 0 1 1.38 8.28a.87.87 0 0 1 0-.566 6.985 6.985 0 0 1 1.113-2.039l2.513 2.513a3 3 0 0 0 2.806 2.806Z"
                                />
                              </svg>
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </VaVirtualScroller>
                </tbody>
              </table>
              <VaSkeletonGroup v-else animation="wave">
                <VaCard>
                  <VaCardContent>
                    <VaSkeleton variant="text" height="64px" class="ml-2" :lines="5" />
                  </VaCardContent>
                </VaCard>
              </VaSkeletonGroup>
            </div>
          </div>

          <!-- Option Groups -->
          <div>
            <div class="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Option Groups</div>

            <!-- Static Search Bar -->
            <VaInput v-model="groupSearchQuery" placeholder="Search..." size="small" class="w-full mb-2" />

            <!-- Scrollable List -->
            <div class="border rounded shadow-sm bg-white h-[50vh] overflow-y-hidden">
              <table
                v-if="items.filter((a) => a.isVisible).flatMap((a) => a.articlesOptionsGroup).length"
                class="w-full text-sm"
              >
                <tbody>
                  <VaVirtualScroller
                    v-slot="{ item, index }"
                    :items="
                      items
                        .filter((a) => a.isVisible)
                        .flatMap((a) => a.articlesOptionsGroup)
                        .filter((a) => a.display)
                    "
                    class="mb-10"
                    :wrapper-size="400"
                  >
                    <tr class="hover:bg-green-50" :class="{ hidden: !item.display, table: item.display }">
                      <td class="p-2 w-full border-b">
                        <div class="flex items-center justify-between">
                          <VaCheckbox
                            v-model="item.selected"
                            :true-value="item._id"
                            :label="item.internalName ? `${localName(item.name)} - ${item.internalName}` : localName(item.name)"
                            class="w-full"
                          />
                          <div class="w-12">
                            <VaInput
                              v-model="item.customMaxChoices"
                              type="number"
                              placeholder="Max Choice"
                              class="w-full"
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  </VaVirtualScroller>
                </tbody>
              </table>
              <table
                v-else-if="
                  !items.filter((a) => a.isVisible).length &&
                  items.filter((a) => a.selected).flatMap((a) => a.articlesOptionsGroup).length
                "
                class="w-full text-sm"
              >
                <tbody>
                  <VaVirtualScroller
                    v-slot="{ item, index }"
                    :items="
                      items
                        .filter((a) => a.selected)
                        .flatMap((a) => a.articlesOptionsGroup)
                        .filter((a) => a.display)
                    "
                    class="mb-10"
                    :wrapper-size="400"
                  >
                    <tr class="hover:bg-green-50" :class="{ hidden: !item.display, table: item.display }">
                      <td class="p-2 w-full border-b">
                        <div class="flex items-center justify-between">
                          <VaCheckbox
                            v-model="item.selected"
                            :true-value="item._id"
                            :label="item.internalName ? `${localName(item.name)} - ${item.internalName}` : localName(item.name)"
                            class="w-full"
                          />
                          <div class="w-12">
                            <VaInput
                              v-model="item.customMaxChoices"
                              type="number"
                              placeholder="Max Choice"
                              class="w-full"
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  </VaVirtualScroller>
                </tbody>
              </table>
              <div v-else class="text-gray-500 italic text-center py-2">No groups available</div>
            </div>
          </div>

          <!-- Options -->
          <div>
            <div class="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Options</div>

            <!-- Static Search Bar -->
            <VaInput v-model="optionSearchQuery" placeholder="Search..." size="small" class="w-full mb-2" />

            <!-- Scrollable List -->
            <div class="border rounded shadow-sm bg-white h-[50vh] overflow-y-hidden">
              <table
                v-if="
                  items
                    .filter((a) => a.isVisible)
                    .flatMap((item) => item.articlesOptionsGroup)
                    .filter((a) => groupSearchQuery ? a.display : a.selected)
                    .flatMap((a) => a.articlesOptions).length
                "
                class="w-full text-sm"
              >
                <tbody>
                  <VaVirtualScroller
                    v-slot="{ item, index }"
                    :key="debouncedSearch"
                    :items="
                      items
                        .filter((a) => a.isVisible)
                        .flatMap((item) => item.articlesOptionsGroup)
                        .filter((a) => groupSearchQuery ? a.display : a.selected)
                        .flatMap((a) => a.articlesOptions)
                        .filter((a) => a.display)
                    "
                    :wrapper-size="400"
                  >
                    <tr
                      class="border-b hover:bg-green-50 w-full"
                      :class="{ hidden: !item.display, table: item.display }"
                    >
                      <td class="p-2">
                        <div class="flex items-center justify-between">
                          <VaCheckbox
                            v-model="item.selected"
                            :true-value="item.id"
                            :label="item.posName ? `${localName(item.name)} - ${item.posName}` : localName(item.name)"
                          />
                          <div class="flex items-center gap-1">
                            <div class="w-12">
                              <VaInput
                                v-model="item.customPrice"
                                type="number"
                                placeholder="Price"
                                class="w-full"
                                :disabled="item.isFree"
                                @input="item.customPrice > 0 ? (item.isFree = false) : 0"
                              />
                            </div>
                            <span
                              class="ml-1 cursor-pointer text-xs font-semibold px-3 py-0.5 rounded-full transition-all duration-200 shadow-sm"
                              :class="{
                                'bg-gradient-to-r from-blue-200 via-blue-300 to-blue-400 text-blue-900 border border-blue-500':
                                  item.isFree,
                                'bg-gray-200 text-gray-700 hover:bg-gray-300': !item.isFree,
                                'opacity-50 pointer-events-none': item.customPrice > 0,
                              }"
                              @click="item.customPrice <= 0 ? (item.isFree = !item.isFree) : false"
                            >
                              Free
                            </span>
                            <!-- Default span -->
                            <span
                              class="ml-1 cursor-pointer text-xs font-semibold px-3 py-0.5 rounded-full transition-all duration-200 shadow-sm"
                              :class="{
                                'bg-gradient-to-r from-green-200 via-green-300 to-green-400 text-green-900 border border-green-500':
                                  defaultOptions.includes(item.optionGroupId + '-' + item.id),
                                'bg-gray-200 text-gray-700 hover:bg-gray-300': !defaultOptions.includes(
                                  item.optionGroupId + '-' + item.id,
                                ),
                              }"
                              @click="checkDefaultOption(item.optionGroupId, item.id)"
                            >
                              Default
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </VaVirtualScroller>
                </tbody>
              </table>
              <table
                v-else-if="
                  !items.filter((a) => a.isVisible).length &&
                  items
                    .filter((a) => a.selected)
                    .flatMap((item) => item.articlesOptionsGroup)
                    .filter((a) => groupSearchQuery ? a.display : a.selected)
                    .flatMap((a) => a.articlesOptions).length
                "
                class="w-full text-sm"
              >
                <tbody>
                  <VaVirtualScroller
                    v-slot="{ item, index }"
                    :key="debouncedSearch"
                    :items="
                      items
                        .filter((a) => a.selected)
                        .flatMap((item) => item.articlesOptionsGroup)
                        .filter((a) => groupSearchQuery ? a.display : a.selected)
                        .flatMap((a) => a.articlesOptions)
                        .filter((a) => a.display)
                    "
                    :wrapper-size="400"
                  >
                    <tr
                      class="border-b hover:bg-green-50 w-full"
                      :class="{ hidden: !item.display, table: item.display }"
                    >
                      <td class="p-2">
                        <div class="flex items-center justify-between">
                          <VaCheckbox
                            v-model="item.selected"
                            :true-value="item.id"
                            :label="item.posName ? `${localName(item.name)} - ${item.posName}` : localName(item.name)"
                          />
                          <div class="flex items-center gap-1">
                            <div class="w-12">
                              <VaInput
                                v-model="item.customPrice"
                                type="number"
                                placeholder="Price"
                                class="w-full"
                                :disabled="item.isFree"
                                @input="item.customPrice > 0 ? (item.isFree = false) : 0"
                              />
                            </div>
                            <span
                              class="ml-1 cursor-pointer text-xs font-semibold px-3 py-0.5 rounded-full transition-all duration-200 shadow-sm"
                              :class="{
                                'bg-gradient-to-r from-blue-200 via-blue-300 to-blue-400 text-blue-900 border border-blue-500':
                                  item.isFree,
                                'bg-gray-200 text-gray-700 hover:bg-gray-300': !item.isFree,
                                'opacity-50 pointer-events-none': item.customPrice > 0,
                              }"
                              @click="item.customPrice <= 0 ? (item.isFree = !item.isFree) : false"
                            >
                              Free
                            </span>
                            <!-- Default span -->
                            <span
                              class="ml-1 cursor-pointer text-xs font-semibold px-3 py-0.5 rounded-full transition-all duration-200 shadow-sm"
                              :class="{
                                'bg-gradient-to-r from-green-200 via-green-300 to-green-400 text-green-900 border border-green-500':
                                  defaultOptions.includes(item.optionGroupId + '-' + item.id),
                                'bg-gray-200 text-gray-700 hover:bg-gray-300': !defaultOptions.includes(
                                  item.optionGroupId + '-' + item.id,
                                ),
                              }"
                              @click="checkDefaultOption(item.optionGroupId, item.id)"
                            >
                              Default
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </VaVirtualScroller>
                </tbody>
              </table>
              <div v-else class="text-gray-500 italic text-center py-2">No options available</div>
            </div>
          </div>
        </div>
      </div>
    </VaForm>

    <template #footer>
      <div class="flex justify-end mt-6 w-full">
        <VaButton type="submit" @click="submit()">
          {{ isUpdating ? 'Update' : 'Add' }}
        </VaButton>
      </div>
    </template>
  </VaModal>
</template>

<script setup lang="ts">
import { ref, watch, computed, toRef, onMounted } from 'vue'
import axios from 'axios'
import { useForm, useToast } from 'vuestic-ui'
import { validators } from '@/services/utils'
import { useServiceStore } from '@/stores/services'

const emits = defineEmits(['cancel', 'getOffers'])

const props = defineProps({
  selectedOption: {
    type: Object,
    default: () => null,
  },
  offerData: {
    type: Object,
    default: '',
  },
  isEditSelection: {
    type: Boolean,
    default: false,
  },
  offerSelection: {
    type: Object,
    default: () => null,
  },
})

const isLoading = ref(false)
const items = ref([])
const sortBy = ref('name')
const sortOrder = ref('asc')

// Outlet default language (same pattern as OfferModal)
const primaryLanguage = ref('en')

const getOutletDetails = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/outlets/${servicesStore.selectedRest}`)
    if (response.data?.defaultLanguage) {
      primaryLanguage.value = response.data.defaultLanguage
    }
  } catch {
    primaryLanguage.value = 'en'
  }
}

/** Extract the localised string from a name that may be a plain string or a { lang: string } object */
function localName(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    return val[primaryLanguage.value] || val['en'] || Object.values(val)[0] || ''
  }
  return String(val)
}

const isVisible = ref(true)
const isUpdating = ref(false)
watch(isVisible, (val) => {
  if (!val) emits('cancel')
})

const servicesStore = useServiceStore()
const { validate } = useForm('form')
const { init } = useToast()

const searchQuery = ref('')

const groupSearchQuery = ref('')
const optionSearchQuery = ref('')
const defaultOptions = ref([])
const defaultArticles = ref([])
const debouncedSearch = ref('')

function debounce(fn, delay) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

const updateSearch = debounce((value) => {
  debouncedSearch.value = value
}, 300)

watch(optionSearchQuery, (newVal) => {
  updateSearch(newVal)
})
const validateMin = (value) => {
  if (value === null || value === '') return 'Min is required'
  if (isNaN(value)) return 'Min must be a number'
  if (value < 0) return 'Min must be ≥ 0'
  return true
}

const validateMax = (value) => {
  if (value === null || value === '') return 'Max is required'
  if (isNaN(value)) return 'Max must be a number'
  if (value < 0) return 'Max must be ≥ 0'
  if (formData.value.min !== null && parseInt(value) < parseInt(formData.value.min)) {
    return 'Max must be ≥ Min'
  }
  return true
}

defaultArticles.value = props.offerSelection?.menuItemDefaultOptions || []

props.offerSelection?.menuItems?.forEach((item) => {
  item.optionGroups.forEach((group) => {
    defaultOptions.value = Array.from(
      new Set([
        ...defaultOptions.value,
        ...group.selectedOptionsDefaultOption.map((e) => group.optionGroupId + '-' + e),
      ]),
    )
  })
})

function checkDefaultArticle(optionId) {
  if (defaultArticles.value.includes(optionId)) {
    defaultArticles.value = defaultArticles.value.filter((id) => id !== optionId)
  } else {
    defaultArticles.value.push(optionId)
  }
}

function checkDefaultOption(groupId, optionId) {
  if (defaultOptions.value.includes(groupId + '-' + optionId)) {
    defaultOptions.value = defaultOptions.value.filter((id) => id !== groupId + '-' + optionId)
  } else {
    defaultOptions.value.push(groupId + '-' + optionId)
  }
}

const groupWorker = new Worker(
  URL.createObjectURL(
    new Blob(
      [
        `
      self.onmessage = function(e) {
        const { items, groupSearchQuery, debouncedSearch, searchQuery } = e.data;
        const groupSearch = groupSearchQuery.toLowerCase();
        const optionSearch = debouncedSearch.toLowerCase();
        const search = searchQuery.toLowerCase();

        // Extract a plain string from a possibly-multilingual name object
        function localStr(val) {
          if (!val) return '';
          if (typeof val === 'string') return val;
          if (typeof val === 'object') return val['en'] || Object.values(val)[0] || '';
          return String(val);
        }

        const filtered = items
          .map(a => {
            const nameMatch = localStr(a.name).toLowerCase().includes(search);
              const internalNameMatch = a.code?.toLowerCase().includes(search);
              return {
                ...a,
                isVisible: a.isVisible,
                display: nameMatch || internalNameMatch || !searchQuery,
                articlesOptionsGroup: a.articlesOptionsGroup.map(g => {
                  const nameMatch = localStr(g.name).toLowerCase().includes(groupSearch);
                  const internalNameMatch = g.internalName?.toLowerCase().includes(groupSearch);
                  return {
                    ...g,
                    display: nameMatch || internalNameMatch || !groupSearch,
                    articlesOptions: g.articlesOptions.map(opt => {
                      const optNameMatch = localStr(opt.name).toLowerCase().includes(optionSearch);
                      const optPosNameMatch = opt.posName?.toLowerCase().includes(optionSearch);
                      return {
                        ...opt,
                        optionGroupId: g.id,
                        display: optNameMatch || optPosNameMatch || !optionSearch,
                      };
                    }),
                  };
                })
              };
            })
        self.postMessage(filtered);
      }
    `,
      ],
      { type: 'application/javascript' },
    ),
  ),
)

const lastWorkerCall = ref(0)

watch(
  [groupSearchQuery, debouncedSearch, searchQuery],
  () => {
    const callId = ++lastWorkerCall.value
    groupWorker.postMessage({
      items: JSON.parse(JSON.stringify(items.value)),
      groupSearchQuery: groupSearchQuery.value,
      debouncedSearch: debouncedSearch.value,
      searchQuery: searchQuery.value,
    })
    groupWorker.onmessage = (e) => {
      if (callId === lastWorkerCall.value) {
        items.value = JSON.parse(JSON.stringify(e.data))
      }
    }
  },
  { immediate: true, deep: true },
)

const formData = ref({
  name: '',
  min: 0,
  max: 0,
  isRequired: true,
})

if (props.isEditSelection) {
  isUpdating.value = true
  formData.value = {
    ...formData.value,
    name: localName(props.offerSelection.name),
    min: props.offerSelection.min.toString(),
    max: props.offerSelection.max.toString(),
    isRequired: props.offerSelection.isRequired || false,
  }
} else {
  isUpdating.value = false
}

const getArticles = async () => {
  isLoading.value = true
  const url = import.meta.env.VITE_API_BASE_URL

  const res = await axios.get(`${url}/menuItems`, {
    params: {
      outletId: servicesStore.selectedRest,
      limit: 10000,
      sortKey: sortBy.value,
      sortValue: sortOrder.value,
    },
  })
  items.value = res.data.map((e) => {
    const selected = props.offerSelection?.menuItems?.find((item) => item.menuItemId === e._id)

    return {
      ...e,
      isVisible: false,
      display: true,
      isFree: selected ? selected.isFree : false,
      selected: selected ? e._id : '',
      customPrice: selected ? selected.customPrice : 0,
      articlesOptionsGroup: e.articlesOptionsGroup.map((e) => {
        let groupSelected = false
        if (selected) {
          groupSelected = selected.optionGroups.find((group) => group.optionGroupId === e.id)
        }
        return {
          ...e,
          display: true,
          customMaxChoices: groupSelected ? groupSelected.customMaxChoices : 0,
          selected: groupSelected ? e._id : !props.isEditSelection ? e._id : '',
          articlesOptions: e.articlesOptions.map((opt) => {
            let optionSelected = false
            if (groupSelected) {
              optionSelected = groupSelected?.selectedOptions.find((option) => option.optionId === opt.id)
            }

            return {
              ...opt,
              optionGroupId: e.id,
              display: true,
              selected: optionSelected ? opt.id : !props.isEditSelection ? opt.id : '',
              isFree: optionSelected?.isFree || false,
              customPrice: optionSelected ? optionSelected?.customPrice : 0,
            }
          }),
        }
      }),
    }
  })
  items.value.sort((a: any, b: any) => {
    if (!!a.selected && !b.selected) return -1
    if (!a.selected && !!b.selected) return 1
    return localName(a.name).localeCompare(localName(b.name))
  })
  isLoading.value = false
}

onMounted(() => {
  getOutletDetails()
  getArticles()
})

// const viewItems = function (index) {
//   console.log('viewItems', index, items.value)
//   items.value[index].isVisible = !items.value[index].isVisible
//   groupWorker.postMessage({
//     items: JSON.parse(JSON.stringify(items.value)),
//     groupSearchQuery: groupSearchQuery.value,
//     debouncedSearch: debouncedSearch.value,
//     searchQuery: searchQuery.value,
//   })
//   groupWorker.onmessage = (e) => {
//     // Only update if this is the latest call
//     items.value = JSON.parse(JSON.stringify(e.data))
//   }
// }

const viewItems = function (id) {
  const item = items.value.find((i) => i._id === id)
  if (item) {
    item.isVisible = !item.isVisible
    groupWorker.postMessage({
      items: JSON.parse(JSON.stringify(items.value)),
      groupSearchQuery: groupSearchQuery.value,
      debouncedSearch: debouncedSearch.value,
      searchQuery: searchQuery.value,
    })
    groupWorker.onmessage = (e) => {
      // Only update if this is the latest call
      items.value = JSON.parse(JSON.stringify(e.data))
    }
  }
}

const submit = async () => {
  const isValid = await validate()
  if (!isValid) return
  if (!formData.value.isRequired && formData.value.min > 0) {
    formData.value.min = 0
  }
  const payload = {
    selections: JSON.parse(JSON.stringify(props.offerData.selections || [])),
  }
  const data = JSON.parse(JSON.stringify(formData.value))
  data.min = parseInt(data.min)
  data.max = parseInt(data.max)
  data.isActive = true
  data.menuItemDefaultOptions = defaultArticles.value

  // Reconstruct menuItems from the current UI state to reflect latest selection/free changes
  data.menuItems = items.value
    .filter((item: any) => !!item.selected)
    .map((item: any) => ({
      menuItemId: item._id,
      isFree: !!item.isFree,
      customPrice: item.customPrice || 0,
      optionGroups: item.articlesOptionsGroup
        .filter((group: any) => !!group.selected)
        .map((group: any) => ({
          optionGroupId: group.id,
          customMaxChoices: group.customMaxChoices || 0,
          selectedOptionsDefaultOption: defaultOptions.value
            .filter((opt) => opt.startsWith(group.id + '-'))
            .map((opt) => opt.split('-')[1]),
          selectedOptions: group.articlesOptions
            .filter((option: any) => !!option.selected)
            .map((option: any) => ({
              optionId: option.id,
              isFree: !!option.isFree,
              customPrice: option.customPrice || 0,
              isDefault: defaultOptions.value.includes(option.id),
            })),
        })),
    }))

  const url = import.meta.env.VITE_API_BASE_URL
  if (props.isEditSelection) {
    const index = props.offerData.selections.findIndex((e: any) => e._id === props.offerSelection._id)
    payload.selections[index] = data
  } else {
    payload.selections.push(data)
  }
  try {
    await axios.put(`${url}/offers/${props.offerData._id}/selections`, payload)
    init({ message: 'Offers updated successfully!', color: 'success' })
    emits('cancel')
    emits('getOffers')
  } catch (err) {
    init({ message: err?.response?.data?.message || 'Error occurred', color: 'danger' })
  }
}
watch(
  () => formData.value.isRequired,
  (val) => {
    if (!val) {
      formData.value.min = 0
    }
  },
  { immediate: true },
)
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
::v-deep(.check .va-checkbox__input:focus-visible + .va-checkbox__square) {
  outline: 0 !important;
  box-shadow: none;
  border: none;
}
</style>
