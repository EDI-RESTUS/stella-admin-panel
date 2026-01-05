<template>
  <VaModal
    v-model="showMenuModal"
    class="big-xl-modal !p-0"
    :mobile-fullscreen="false"
    size="large"
    hide-default-actions
    close-button
  >
    <div class="flex sm:max-h-[85vh]">
      <!-- LEFT SECTION -->
      <div
        class="w-[25%] bg-slate-100 p-4 flex-shrink-0 flex items-start justify-start sm:items-center sm:justify-center"
      >
        <div class="flex flex-col items-center justify-start sm:justify-center text-center w-full max-w-[250px]">
          <!-- Image -->
          <div class="flex justify-center mb-4">
            <img
              :src="item.imageUrl || '/missing-image.png'"
              alt="icon"
              class="w-48 h-48 rounded-full object-cover object-center shadow-[0_8px_25px_rgba(0,0,0,0.1)]"
            />
          </div>

          <!-- Title -->
          <h2 class="text-green-900 font-semibold text-lg uppercase">{{ isEdit ? item.itemName : item.name }}</h2>

          <!-- Description -->
          <p class="text-gray-400 text-xs mt-1">
            {{ item.description }}
          </p>

          <!-- Tags -->
          <div
            v-if="item.allergenIds && item.allergenIds.length"
            class="flex flex-wrap justify-center gap-1 mt-3 text-xs"
          >
            <img
              v-for="allergenId in item.allergenIds"
              :key="allergenId"
              :src="allergenIcons[allergenId] || '/missing-image.png'"
              :alt="`Allergen ${allergenId}`"
              class="w-8 h-8 object-contain bg-pink-100 text-pink-600 px-2 py-1 rounded-full flex items-center gap-1"
            />
          </div>

          <!-- Price -->
          <div class="text-green-900 font-bold text-2xl mt-4">€{{ parseFloat(totalPrice).toFixed(2) }}</div>

          <!-- Button -->
          <button
            :disabled="formSubmitted && !isFormValid"
            class="mt-4 w-full bg-green-800 hover:bg-green-900 text-white font-semibold p-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            @click="addToBasket(item)"
          >
            {{ isEdit ? 'UPDATE BASKET' : 'ADD TO BASKET' }}
          </button>

          <p v-if="formSubmitted && !isFormValid" class="text-red-500 text-xs mt-2 text-center">
            Please select all required options.
          </p>
        </div>
      </div>

      <!-- RIGHT SECTION -->
      <div class="w-[75%] bg-white p-4 overflow-y-auto max-h-[85vh]">
        <div class="space-y-6">
          <div v-for="group in articlesOptionsGroups" :key="group._id" class="space-y-4">
            <!-- Group Title -->
            <div class="flex items-center gap-2">
              <span class="text-green-900 font-semibold uppercase text-sm">{{ group.name }}</span>
              <span v-if="group.mandatory" class="text-[10px] bg-red-500 text-white font-semibold px-2 rounded-full">
                Required
              </span>
              <!-- Min Choices -->
              <span
                v-if="group.minimumChoices"
                class="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 rounded-full"
              >
                Min {{ group.minimumChoices }} {{ group.minimumChoices === 1 ? 'Choice' : 'Choices' }}
              </span>

              <!-- Max Choices -->
              <span
                v-if="group.maximumChoices"
                class="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 rounded-full"
              >
                Up to {{ group.maximumChoices }} Choices
              </span>
            </div>

            <!-- Group Options -->
            <div class="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              <!-- Single Choice (Radio) -->
              <label
                v-for="option in group.options"
                v-if="group.singleChoice"
                :key="option._id"
                class="w-[200px] h-[80px] relative flex items-center border p-2 rounded-lg cursor-pointer transition-all"
                :class="{
                  'border-gray-700 bg-[#f8f9fa] border-2': isChecked(group, option._id),
                  'border-gray-200 hover:border-gray-700 hover:border-2': !isChecked(group, option._id),
                  'out-of-stock': option.name?.toUpperCase().includes('OUT OF STOCK')
                }"
                @click="option.name?.toUpperCase().includes('OUT OF STOCK') ? null : updateSingleChoice(group, option)"
              >
                <div v-if="option.imageUrl" class="item-image">
                  <img
                    :src="option.imageUrl"
                    alt="Option"
                    :class="selectedOptions[group._id] === option._id ? 'bg-white' : 'bg-[#f8f9fa]'"
                    class="rounded w-full h-full"
                  />
                </div>
                <div class="flex-1">
                  <div class="text-sm font-semibold text-gray-800">{{ option.name }}</div>
                  <div v-if="option.price" class="text-gray-800 font-semibold text-sm mt-1">
                    €{{ parseFloat(option.price).toFixed(2) }}
                  </div>
                </div>

                <input
                  v-model="selectedOptions[group._id]"
                  :checked="isChecked(group, option._id)"
                  type="radio"
                  :name="group._id"
                  :value="option._id"
                  class="absolute bottom-2 right-2 accent-gray-700 pointer-events-none"
                />
              </label>

              <!-- Multiple Choice (No Qty)-->
              <label
                v-for="option in group.options"
                v-if="group.multipleChoiceNoQty"
                :key="option._id"
                class="w-[200px] h-[80px] relative flex items-center border p-2 rounded-lg cursor-pointer transition-all"
                :class="{
                  'border-gray-700 bg-[#f8f9fa] border-2': isChecked(group, option._id),
                  'border-gray-200 hover:border-gray-700 hover:border-2': !isChecked(group, option._id),
                  'out-of-stock': option.name?.toUpperCase().includes('OUT OF STOCK')
                }"
                @click.prevent="option.name?.toUpperCase().includes('OUT OF STOCK') ? null : toggleMultipleChoiceNoQty(group, option)"
              >
                <div v-if="option.imageUrl" class="item-image">
                  <img
                    :src="option.imageUrl"
                    alt="Option"
                    :class="isChecked(group, option._id) ? 'bg-white' : 'bg-[#f8f9fa]'"
                    class="rounded w-full h-full"
                  />
                </div>
                <div class="flex-1">
                  <div class="text-sm font-semibold text-gray-800">{{ option.name }}</div>
                  <div v-if="option.price" class="text-gray-800 font-semibold text-sm mt-1">
                    €{{ parseFloat(option.price).toFixed(2) }}
                  </div>
                </div>

                <div
                  class="absolute bottom-2 right-2 w-3 h-3 border border-gray-500 rounded-full flex items-center justify-center p-0 m-0"
                >
                  <div
                    v-if="isChecked(group, option._id)"
                    class="w-1.5 h-1.5 bg-gray-700 rounded-full"
                    style="margin: 0; padding: 0"
                  ></div>
                </div>
              </label>

              <!-- Multiple Choice -->
              <div
                v-for="option in group.options"
                v-if="group.multipleChoice"
                :key="option._id"
                class="w-[200px] h-[80px] relative flex flex-col justify-between border rounded-xl transition hover:shadow-sm cursor-pointer"
                :class="[
                  getQty(group._id, option._id) > 0
                    ? 'border-gray-700 bg-[#f8f9fa] border-2'
                    : 'border-gray-200 hover:border-gray-700 hover:border-2',
                  option.name?.toUpperCase().includes('OUT OF STOCK') ? 'out-of-stock' : ''
                ]"
              >
                <div class="flex items-start gap-1">
                  <div v-if="option.imageUrl" class="image-wrapper">
                    <img
                      :src="option.imageUrl"
                      alt="Topping"
                      :class="getQty(group._id, option._id) > 0 ? 'bg-white' : 'bg-[#f8f9fa]'"
                    />
                  </div>
                  <div class="text-left leading-tight pt-1 pl-1">
                    <p
                      class="font-semibold text-sm text-gray-800 leading-4 line-clamp-3"
                      style="
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                      "
                    >
                      {{ option.name }}
                    </p>
                  </div>
                </div>

                <div class="absolute bottom-1 right-2 flex items-center gap-1">
                  <p v-if="option.price" class="text-xs text-gray-600 font-medium mr-1">
                    €{{ parseFloat(option.price).toFixed(2) }}
                  </p>

                  <button
                    class="w-5 h-5 text-xs font-bold border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                    :disabled="getQty(group._id, option._id) === 0 || option.name?.toUpperCase().includes('OUT OF STOCK')"
                    @click="() => updateMultipleChoice(group, option, getQty(group._id, option._id) - 1)"
                  >
                    -
                  </button>
                  <span class="w-4 text-center text-xs">{{ getQty(group._id, option._id) }}</span>
                  <button
                    :title="
                      getQty(group._id, option._id) >= (option.maximumChoices || group.maximumChoices || 99)
                        ? 'Max quantity reached'
                        : option.name?.toUpperCase().includes('OUT OF STOCK')
                        ? 'Out of stock'
                        : ''
                    "
                    class="w-5 h-5 text-xs font-bold border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                    :disabled="getQty(group._id, option._id) >= (option.maximumChoices || group.maximumChoices || 99) || option.name?.toUpperCase().includes('OUT OF STOCK')"
                    @click="() => updateMultipleChoice(group, option, getQty(group._id, option._id) + 1)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </VaModal>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/order-store'
import axios from 'axios'
const orderStore = useOrderStore()

const showMenuModal = ref(true)
const emits = defineEmits(['cancel', 'cancel-edit'])

const props = defineProps({
  categoryId: String,
  menuItemId: String,
  item: {
    type: Object,
    required: true,
  },
  isEdit: {
    type: Boolean,
    required: false,
  },
  fetchConfigurations: {
    type: Array,
    required: true,
  },
})

const selectedOptions = ref([])
const fetchConfigurations = ref([])
const formSubmitted = ref(false)

const articles = computed(() => {
  return props.item.articlesOptionsGroups
    ? props.item.articlesOptionsGroups
        .map((e) => {
          return {
            ...e,
            options: e.options.filter((a) => a.type.toLowerCase() === 'article'),
          }
        })
        .filter((a) => a.options.length)
    : []
})

const articlesOptionsGroups = computed(() => {
  let group = []
  if (!articles.value.length) {
    return props.item.articlesOptionsGroups
  } else {
    if (!fetchConfigurations.value.length && articles.value.length) {
      return articles.value
    }
    const fetchItems = fetchConfigurations.value.flatMap((a) => a.conditionalSelection)
    group = props.item.articlesOptionsGroups
      .filter((a) => fetchItems.find((e) => e.optionsGroupId === a._id))
      .map((e) => {
        const fetchedGroup = fetchItems.find((a) => a.optionsGroupId === e._id)
        return {
          ...e,
          options: e.options.filter(
            (a) => a.type.toLowerCase() === 'article' || fetchedGroup.optionsIds.find((opt) => opt === a._id),
          ),
        }
      })
    return [...articles.value, ...group]
  }
})

const getArticlesConfiguration = (group, option) => {
  const url = import.meta.env.VITE_API_BASE_URL
  axios
    .get(
      `${url}/articles-options-conditions?menuCategoryId=${props.categoryId}&optionsGroupId=${group}&menuItemId=${props.menuItemId}&optionId=${option}`,
    )
    .then((response) => {
      fetchConfigurations.value = []
      fetchConfigurations.value = response.data.data
    })
}

watch(
  () => [articlesOptionsGroups.value, fetchConfigurations.value],
  () => {
    if (!articlesOptionsGroups.value.length || selectedOptions.value.length > 1) return
    articlesOptionsGroups.value.forEach((group) => {
      const defaults = Array.isArray(group.defaultOptions) ? group.defaultOptions : []
      const selected = []
      defaults.forEach((optionId) => {
        const option = group.options.find((o) => o._id === optionId)
        // Fix: Allow selecting default articles even if other options are already selected.
        // We check if this specific group already has a selection to avoid duplicates if re-running.
        const groupAlreadySelected = selectedOptions.value.some(s => s.groupId === group._id)
        
        if (option && (!groupAlreadySelected || option.type.toLowerCase() !== 'article')) {
          selected.push({
            optionId: option._id,
            name: option.name,
            type: option.type,
            price: option.price,
            quantity: group.multipleChoice ? 1 : 1,
          })
        }
      })

      // Only trigger configuration fetch if this is the first article being selected (to avoid loops or conflicts)
      if (!selectedOptions.value.length && selected.find((a) => a.type.toLowerCase() === 'article')) {
        getArticlesConfiguration(group._id, selected.find((a) => a.type.toLowerCase() === 'article').optionId)
      }

      if (selected.length) {
        selectedOptions.value.push({
          groupId: group._id,
          groupName: group.name,
          selected: group.singleChoice ? [selected[0]] : selected,
        })
      }
    })
    console.log('Selected Options:', selectedOptions.value)
  },
  { immediate: true, deep: true },
)

const isFormValid = computed(() => {
  const requiredGroups = articlesOptionsGroups.value.filter((g) => g.mandatory)

  for (const group of requiredGroups) {
    const selectedGroup = selectedOptions.value.find((sel) => sel.groupId === group._id)

    if (!selectedGroup || !selectedGroup.selected.length) {
      return false
    }

    if (group.multipleChoice && group.minimumChoices) {
      const totalQty = selectedGroup.selected.reduce((sum, opt) => sum + (opt.quantity || 0), 0)

      if (totalQty < group.minimumChoices) return false
    }
  }

  return true
})

const totalPrice = computed(() => {
  let total = parseFloat(props.item.price) || props.item.basePrice || 0

  selectedOptions.value.forEach((group) => {
    group.selected.forEach((option) => {
      const price = parseFloat(option.price) || 0
      const quantity = option.quantity || 1
      total += price * quantity
    })
  })

  return total.toFixed(2)
})

watch(
  () => [props.isEdit, props.item],
  ([isEdit, item]) => {
    if (
      !item ||
      typeof item !== 'object' ||
      !Array.isArray(articlesOptionsGroups.value) ||
      !articlesOptionsGroups.value.length
    )
      return
    if (isEdit && item?.selectedOptions) {
      selectedOptions.value = JSON.parse(JSON.stringify(item.selectedOptions))
      const selectedGroupAndOption = item.selectedOptions.find((group) =>
        group.selected.flatMap((a) => a.type.toLowerCase()).includes('article'),
      )
      if (selectedGroupAndOption) {
        getArticlesConfiguration(selectedGroupAndOption.groupId, selectedGroupAndOption.selected[0].optionId)
      }
    } else {
      selectedOptions.value = []
    }
  },
  { deep: true },
)

function addToBasket(item: any) {
  formSubmitted.value = true

  if (!isFormValid.value) {
    return
  }

  const productEntry = {
    itemId: props.isEdit ? item.itemId : item._id,
    itemName: props.isEdit ? item.itemName : item.name,
    description: item.description,
    basePrice: props.isEdit ? item.basePrice : parseFloat(item.price),
    imageUrl: item.imageUrl,
    quantity: props.isEdit ? item.quantity : 1,
    selectedOptions: articlesOptionsGroups.value
      .map((group) => {
        const entry = selectedOptions.value.find((sel) => sel.groupId === group._id)
        return entry ? { ...entry } : ''
      })
      .filter((a) => a),
    totalPrice: 0,
    selectionTotalPrice: 0,
  }

  const index = null
  if (props.isEdit) {
    const index = orderStore.cartItems.findIndex((i) => i.itemId === item.itemId)
    if (index !== -1) {
      orderStore.cartItems.splice(index, 1)
      orderStore.cartItems.splice(index, 0, JSON.parse(JSON.stringify(productEntry)))
      orderStore.calculateItemTotal(index)
    }
  } else {
    orderStore.addItemToCart(productEntry)
    const newIndex = orderStore.cartItems.length - 1
    orderStore.calculateItemTotal(newIndex)
  }

  selectedOptions.value = []
  showMenuModal.value = false
  formSubmitted.value = false

  if (props.isEdit) {
    emits('cancel-edit')
  }
  emits('cancel')
}

function toggleMultipleChoiceNoQty(group, option) {
  const groupEntry = selectedOptions.value.find((g) => g.groupId === group._id)
  const maxAllowed = group.maximumChoices || 99

  if (!groupEntry) {
    selectedOptions.value.push({
      groupId: group._id,
      groupName: group.name,
      selected: [
        {
          optionId: option._id,
          name: option.name,
          type: option.type,
          price: option.price,
          quantity: 1,
        },
      ],
    })
    return
  }

  const optIndex = groupEntry.selected.findIndex((o) => o.optionId === option._id)

  if (optIndex !== -1) {
    groupEntry.selected.splice(optIndex, 1)
  } else {
    if (groupEntry.selected.length >= maxAllowed) return
    groupEntry.selected.push({
      optionId: option._id,
      name: option.name,
      type: option.type,
      price: option.price,
      quantity: 1,
    })
  }
}

function updateSingleChoice(group: any, option: any) {
  if (option.type.toLowerCase() === 'article') {
    selectedOptions.value = []
    getArticlesConfiguration(group._id, option._id)
  }
  const index = selectedOptions.value.findIndex((sel) => sel.groupId === group._id)
  const newEntry = {
    groupId: group._id,
    groupName: group.name,
    categoryId: props.categoryId,
    menuItemId: props.menuItemId,
    selected: [
      {
        optionId: option._id,
        name: option.name,
        type: option.type,
        price: option.price,
        quantity: 1,
      },
    ],
  }

  if (index !== -1) {
    selectedOptions.value[index] = newEntry
  } else {
    selectedOptions.value.push(newEntry)
  }
}

function isChecked(group, optionId) {
  const index = selectedOptions.value.findIndex((sel) => sel.groupId === group._id)
  if (index === -1) {
    return false
  } else {
    if (selectedOptions.value[index].selected.find((a) => a.optionId === optionId)) {
      return true
    }
    return false
  }
}

function updateMultipleChoice(group, option, quantity) {
  const min = option.minimumChoices || 0
  const max = option.maximumChoices || group.maximumChoices || 99

  if (quantity < 0 || quantity > max) return

  let groupEntry = selectedOptions.value.find((sel) => sel.groupId === group._id)

  if (!groupEntry) {
    groupEntry = {
      categoryId: props.categoryId,
      menuItemId: props.menuItemId,
      groupId: group._id,
      groupName: group.name,
      selected: [],
    }
    selectedOptions.value.push(groupEntry)
  }

  const optionIndex = groupEntry.selected.findIndex((o) => o.optionId === option._id)
  const opt = groupEntry.selected[optionIndex]

  const totalQtyInGroup = groupEntry.selected.reduce((sum, o) => sum + (o.quantity || 0), 0)
  const maxAllowed = group.maximumChoices || 99

  if (totalQtyInGroup - (opt?.quantity || 0) + quantity > maxAllowed) {
    return
  }

  if (quantity === 0) {
    if (optionIndex !== -1) groupEntry.selected.splice(optionIndex, 1)
  } else {
    const newOption = {
      optionId: option._id,
      name: option.name,
      type: option.type,
      price: option.price,
      quantity,
    }

    if (optionIndex !== -1) {
      groupEntry.selected[optionIndex] = newOption
    } else {
      groupEntry.selected.push(newOption)
    }
  }
}

function getQty(groupId, optionId) {
  const group = selectedOptions.value.find((g) => g.groupId === groupId)
  const opt = group?.selected.find((o) => o.optionId === optionId)
  return opt?.quantity || 0
}

function getTotalQtyInGroup(groupId: string) {
  const group = selectedOptions.value.find((g) => g.groupId === groupId)

  if (!group) return 0

  return group.selected.reduce((sum, opt) => sum + (opt.quantity || 0), 0)
}

watch(showMenuModal, (val) => {
  if (!val) emits('cancel')
})

const allergenIcons = {
  1: '/allergens/vegan.png',
  2: '/allergens/plant_based.png',
  3: '/allergens/vegetarian.png',
  4: '/allergens/pescatarian.png',
  5: '/allergens/spicy.png',
  6: '/allergens/halal.png',
  7: '/allergens/kosher.png',
  8: '/allergens/gluten_free.png',
  9: '/allergens/dairy_free.png',
  10: '/allergens/nut_free.png',
  11: '/allergens/gluten.png',
  12: '/allergens/crustaceans.png',
  13: '/allergens/eggs.png',
  14: '/allergens/fish.png',
  15: '/allergens/peanuts.png',
  16: '/allergens/soybeans.png',
  17: '/allergens/milk.png',
  18: '/allergens/nuts.png',
  19: '/allergens/celery.png',
  20: '/allergens/mustard.png',
  21: '/allergens/sesame_seeds.png',
  22: '/allergens/sulphur_dioxide.png',
  23: '/allergens/lupin.png',
  24: '/allergens/molluscs.png',
}

function increment(item) {
  item.quantity++
}

function decrement(item) {
  if (item.quantity > 0) item.quantity--
}

onMounted(() => {
  if (props.isEdit && props.item?.selectedOptions) {
    selectedOptions.value = JSON.parse(JSON.stringify(props.item.selectedOptions))
    const selectedGroupAndOption = props.item.selectedOptions.find((group) =>
      group.selected.flatMap((a) => a.type.toLowerCase()).includes('article'),
    )
    if (selectedGroupAndOption) {
      getArticlesConfiguration(selectedGroupAndOption.groupId, selectedGroupAndOption.selected[0].optionId)
    }
  }
})
</script>

<style>
.va-modal__close {
  background: #f8f9fa;
  padding: 7px 10px;
  border-radius: 240px;
  font-size: 13px !important;
  height: 32px !important;
  margin-right: 30px;
  margin-top: 10px;

  @media (min-width: 640px) {
    margin-right: 30px;
    margin-top: 10px;
  }
}
.item-image {
  width: 60px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  padding: 0px 10px;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  flex-shrink: 0;
}
.image-wrapper {
  flex-shrink: 0;
  width: 60px; /* or tweak for ratio */
  height: 77px; /* full height of option box */
  border-radius: 8px;
  overflow: hidden;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* fills the area without distortion */
  display: block;
}

.out-of-stock {
  opacity: 0.5;
  cursor: not-allowed !important;
  pointer-events: none;
}

.out-of-stock:hover {
  border-color: #e9ecef !important;
  background: white !important;
}
</style>
