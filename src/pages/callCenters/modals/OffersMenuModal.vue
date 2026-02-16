<template>
  <VaModal
    model-value
    close-button
    class="big-xl-modal !p-0"
    :mobile-fullscreen="false"
    size="large"
    hide-default-actions
    @update:modelValue="emits('cancel')"
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
          <h2 class="text-green-900 font-semibold text-lg uppercase">{{ item.name }}</h2>

          <!-- Description -->
          <p class="text-gray-400 text-xs mt-1">
            {{ item.description }}
          </p>

          <div v-if="(item.customPrice || item.price) && !item.isFree" class="text-green-900 font-bold text-2xl mt-4">
            €{{ parseFloat(item.customPrice || item.totalPrice).toFixed(2) }}
          </div>

          <!-- Price -->
          <!-- <div class="text-green-900 font-bold text-2xl mt-4">€{{ parseFloat(totalPrice).toFixed(2) }}</div> -->

          <!-- Button -->
          <button
            :disabled="formSubmitted && !isFormValid"
            class="mt-4 w-full bg-green-800 hover:bg-green-900 text-white font-semibold p-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            @click="addToBasket(item)"
          >
            {{ isEdit ? 'UPDATE OFFER' : 'ADD TO OFFER' }}
          </button>

          <p v-if="formSubmitted && !isFormValid" class="text-red-500 text-xs mt-2 text-center">
            Please select all required options.
          </p>
        </div>
      </div>

      <!-- RIGHT SECTION -->
      <div class="w-[75%] bg-white p-4 overflow-y-auto max-h-[85vh]">
        <div class="space-y-6">
          <div v-for="group in articlesOptionsGroups" :key="group.optionGroupId" class="space-y-4">
            <!-- Group Title -->
            <div class="flex items-center gap-2">
              <span class="text-green-900 font-bold uppercase text-sm">{{ group.name }}</span>

              <!-- Required Badge -->
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
                Up to {{ group.customMaxChoices || group.maximumChoices }} Choices
              </span>
            </div>

            <div class="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              <label
                v-for="option in group.selectedOptions"
                v-if="group.singleChoice"
                :key="option.optionId"
                class="w-[200px] h-[80px] relative flex items-center border p-2 rounded-lg cursor-pointer transition-all"
                :class="{
                  'border-gray-700 bg-[#f8f9fa] border-2': isChecked(group, option.optionId),
                  'border-gray-200 hover:border-gray-700 hover:border-2': !isChecked(group, option.optionId),
                  'out-of-stock': option.inStock === false || option.name?.toUpperCase().includes('OUT OF STOCK'),
                }"
                @click="option.inStock === false || option.name?.toUpperCase().includes('OUT OF STOCK') ? null : updateSingleChoice(group, option)"
              >
                <div v-if="option.imageUrl" class="item-image">
                  <img
                    :src="option.imageUrl"
                    alt="Option"
                    :class="selectedOptions[group.optionGroupId] === option.optionId ? 'bg-white' : 'bg-[#f8f9fa]'"
                    class="rounded w-full h-full"
                  />
                </div>
                <div class="flex-1">
                  <div class="text-sm font-semibold text-gray-800">{{ option.name }}</div>
                  <div
                    v-if="(option.customPrice || option.price) && !option.isFree"
                    class="text-gray-800 font-semibold text-sm mt-2"
                  >
                    €{{ parseFloat(option.customPrice || option.price).toFixed(2) }}
                  </div>

                  <!-- <p v-if="option.isFree" class="text-sm text-gray-600 font-medium mr-2">Free</p> -->
                </div>

                <input
                  v-model="selectedOptions[group.optionGroupId]"
                  :checked="isChecked(group, option.optionId)"
                  type="radio"
                  :name="group.optionGroupId"
                  :value="option.optionId"
                  class="absolute bottom-2 right-2 accent-gray-700 pointer-events-none"
                />
              </label>

              <!-- Multiple Choice (No Qty)-->
              <!-- Multiple Choice (No Qty) -->
              <label
                v-for="option in group.selectedOptions"
                v-if="group.multipleChoiceNoQty"
                :key="option.optionId"
                class="w-[200px] h-[80px] relative flex items-center border p-2 rounded-lg cursor-pointer transition-all"
                :class="{
                  'border-gray-700 bg-[#f8f9fa] border-2': isChecked(group, option.optionId),
                  'border-gray-200 hover:border-gray-700 hover:border-2': !isChecked(group, option.optionId),
                  'out-of-stock': option.inStock === false || option.name?.toUpperCase().includes('OUT OF STOCK'),
                }"
                @click.prevent="option.inStock === false || option.name?.toUpperCase().includes('OUT OF STOCK') ? null : toggleMultipleChoiceNoQty(group, option)"
              >
                <div v-if="option.imageUrl" class="item-image">
                  <img
                    :src="option.imageUrl"
                    alt="Option"
                    :class="isChecked(group, option.optionId) ? 'bg-white' : 'bg-[#f8f9fa]'"
                    class="rounded w-full h-full"
                  />
                </div>

                <div class="flex-1">
                  <div class="text-sm font-semibold text-gray-800">{{ option.name }}</div>
                  <div
                    v-if="(option.customPrice || option.price) && !option.isFree"
                    class="text-gray-800 font-semibold text-sm mt-2"
                  >
                    €{{ parseFloat(option.customPrice || option.price).toFixed(2) }}
                  </div>
                  <p v-if="option.isFree" class="text-sm text-gray-600 font-medium mt-2">Free</p>
                </div>

                <div
                  class="absolute bottom-2 right-2 w-3 h-3 border border-gray-500 rounded-full flex items-center justify-center"
                >
                  <div v-if="isChecked(group, option.optionId)" class="w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                </div>
              </label>

              <!-- Multiple Choice -->
              <div
                v-for="option in group.selectedOptions"
                v-if="group.multipleChoice"
                :key="option.optionId"
                class="w-[200px] h-[80px] relative flex flex-col justify-between border rounded-xl transition hover:shadow-sm cursor-pointer"
                :class="[
                  getQty(group.optionGroupId, option.optionId) > 0
                    ? 'border-gray-700 bg-[#f8f9fa] border-2'
                    : 'border-gray-200 hover:border-gray-700 hover:border-2',
                  option.inStock === false || option.name?.toUpperCase().includes('OUT OF STOCK') ? 'out-of-stock' : '',
                ]"
              >
                <!-- Top content -->
                <div class="flex items-start gap-1">
                  <div v-if="option.imageUrl" class="image-wrapper">
                    <img
                      :src="option.imageUrl"
                      alt="Topping"
                      :class="getQty(group.optionGroupId, option.optionId) > 0 ? 'bg-white' : 'bg-[#f8f9fa]'"
                      class="rounded w-full h-full"
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

                <!-- Bottom-right quantity control -->
                <div class="absolute bottom-1 right-2 flex items-center gap-1">
                  <div
                    v-if="(option.customPrice || option.price) && !option.isFree"
                    class="text-gray-800 font-semibold text-xs mt-1"
                  >
                    €{{ parseFloat(option.customPrice || option.price).toFixed(2) }}
                  </div>
                  <p v-if="option.isFree" class="text-xs text-gray-600 font-medium mr-1">Free</p>
                  <button
                    class="w-5 h-5 text-xs font-bold border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                    :disabled="getQty(group.optionGroupId, option.optionId) === 0 || option.inStock === false || option.name?.toUpperCase().includes('OUT OF STOCK')"
                    @click="() => updateMultipleChoice(group, option, getQty(group.optionGroupId, option.optionId) - 1)"
                  >
                    -
                  </button>
                  <span class="w-4 text-center text-xs">{{ getQty(group.optionGroupId, option.optionId) }}</span>
                  <button
                    :title="
                      getQty(group.optionGroupId, option.optionId) >=
                      (option.maximumChoices || group.maximumChoices || 99)
                        ? 'Max quantity reached'
                        : option.inStock === false || option.name?.toUpperCase().includes('OUT OF STOCK')
                          ? 'Out of stock'
                          : ''
                    "
                    class="w-5 h-5 text-xs font-bold border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                    :disabled="
                      getQty(group.optionGroupId, option.optionId) >=
                      (option.maximumChoices || group.maximumChoices || 99) ||
                      option.inStock === false || option.name?.toUpperCase().includes('OUT OF STOCK')
                    "
                    @click="() => updateMultipleChoice(group, option, getQty(group.optionGroupId, option.optionId) + 1)"
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
import { ref, watch, computed } from 'vue'
import { useOrderStore } from '@/stores/order-store'
import { useMenuStore } from '@/stores/getMenu'
import { storeToRefs } from 'pinia'
import axios from 'axios'
const orderStore = useOrderStore()

const emits = defineEmits(['cancel', 'cancel-edit', 'items-added'])

const props = defineProps({
  selectedMenuItem: {
    type: Object,
    required: false,
  },
  offerGroup: {
    type: Object,
    required: false,
  },
  item: {
    type: Object,
    required: true,
  },
  isEdit: {
    type: Boolean,
    required: false,
  },
  showMenuModal: {
    type: Boolean,
    required: true,
  },
  menuItemId: String,
})
const selectedOptions = ref([])
const menuStore = useMenuStore()
const { offer } = storeToRefs(menuStore)
let groupItemIndex = -1
let addedItemIndex = -1
const formSubmitted = ref(false)
const fetchConfigurations = ref([])

const isFormValid = computed(() => {
  const requiredGroups = articlesOptionsGroups.value.filter((g) => g.mandatory)

  for (const group of requiredGroups) {
    const selectedGroup = selectedOptions.value.find((sel) => sel.groupId === group.optionGroupId)

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
  let total = parseFloat(props.item.customPrice || props.item.price) || props.item.basePrice || 0

  selectedOptions.value.forEach((group) => {
    group.selected.forEach((option) => {
      const price = parseFloat(option.customPrice || option.price) || 0
      const quantity = option.quantity || 1
      total += price * quantity
    })
  })

  return total.toFixed(2)
})

const getArticlesConfiguration = (group, option) => {
  const url = import.meta.env.VITE_API_BASE_URL
  axios
    .get(`${url}/articles-options-conditions?optionsGroupId=${group}&menuItemId=${props.menuItemId}&optionId=${option}`)
    .then((response) => {
      fetchConfigurations.value = response.data.data
    })
}

watch(
  () => [props.isEdit, props.item],
  ([isEdit, item]) => {
    if (!item.optionGroups.length) return

    if (props.isEdit) {
      groupItemIndex = offer.value.selections.findIndex((a) => a._id === props.offerGroup._id)
      if (groupItemIndex !== -1) {
        const addedItems = offer.value.selections[groupItemIndex].addedItems.find(
          (offerItem) => offerItem.itemId === props.item.id && props.selectedMenuItem.itemId === offerItem.itemId,
        )
          ? offer.value.selections[groupItemIndex].addedItems.find((offerItem) => offerItem.itemId === props.item.id)
          : null
        addedItemIndex = offer.value.selections[groupItemIndex].addedItems.findIndex(
          (offerItem) => offerItem.itemId === props.item.id,
        )
        if (addedItems && addedItems.selectedOptions.length) {
          selectedOptions.value = addedItems.selectedOptions
          selectedOptions.value.forEach((group) => {
            if (group.selected.find((a) => a.type.toLowerCase() === 'article')) {
              getArticlesConfiguration(
                group.groupId,
                group.selected.find((a) => a.type.toLowerCase() === 'article').optionId,
              )
            }
          })
        }
      }
    } else {
      // Fresh selection
      selectedOptions.value = []
    }
  },
  { immediate: true, deep: true },
)

function addToBasket(item: any) {
  formSubmitted.value = true

  if (!isFormValid.value) {
    return
  }

  const productEntry = {
    itemId: item.id,
    itemName: item.name,
    itemDescription: item.description,
    basePrice: item.isFree ? 0 : parseFloat(item.customPrice || item.price),
    imageUrl: item.imageUrl,
    quantity: 1,
    selectedOptions: selectedOptions.value,
    totalPrice: 0,
    selectionTotalPrice: 0,
  }

  if (props.isEdit) {
    menuStore.updateItemToOffer(productEntry, groupItemIndex, addedItemIndex)
  } else {
    menuStore.addItemToOffer(props.offerGroup, productEntry)
  }

  selectedOptions.value = []
  formSubmitted.value = false
  emits('items-added')
}

const articles = computed(() => {
  return props.item.optionGroups
    ? props.item.optionGroups
        .map((e) => {
          return {
            ...e,
            selectedOptions: e.selectedOptions.filter((a) => a.type.toLowerCase() === 'article'),
          }
        })
        .filter((a) => a.selectedOptions.length)
    : []
})

const articlesOptionsGroups = computed(() => {
  let group = []
  if (!articles.value.length) {
    return props.item.optionGroups
  } else {
    if (!fetchConfigurations.value.length && articles.value.length) {
      return articles.value
    }
    const fetchItems = fetchConfigurations.value.flatMap((a) => a.conditionalSelection)
    group = props.item.optionGroups
      .filter((a) => fetchItems.find((e) => e.optionsGroupId === a.optionGroupId))
      .map((e) => {
        const fetchedGroup = fetchItems.find((a) => a.optionsGroupId === e.optionGroupId)
        return {
          ...e,
          selectedOptions: e.selectedOptions.filter(
            (a) => a.type.toLowerCase() === 'article' || fetchedGroup.optionsIds.find((opt) => opt === a.optionId),
          ),
        }
      })
    return [...articles.value, ...group]
  }
})

watch(
  () => [articlesOptionsGroups.value, fetchConfigurations.value],
  () => {
    if (!articlesOptionsGroups.value.length || selectedOptions.value.length > 1) return
    articlesOptionsGroups.value.forEach((group) => {
      const defaults = Array.isArray(group.selectedOptionsDefaultOption) ? group.selectedOptionsDefaultOption : []
      const selected = []
      defaults.forEach((optionId) => {
        const option = group.selectedOptions.find((o) => o.optionId === optionId)
        if (option && (!selectedOptions.value.length || option.type.toLowerCase() !== 'article')) {
          selected.push({
            optionId: option.optionId,
            name: option.name,
            type: option.type,
            price: option.isFree ? 0 : option.customPrice || option.price,
            quantity: group.multipleChoice ? 1 : 1,
          })
        }
      })

      if (!selectedOptions.value.length && selected.find((a) => a.type.toLowerCase() === 'article')) {
        getArticlesConfiguration(group.optionGroupId, selected.find((a) => a.type.toLowerCase() === 'article').optionId)
      }

      if (selected.length) {
        selectedOptions.value.push({
          groupId: group.optionGroupId,
          groupName: group.name,
          selected: group.singleChoice ? [selected[0]] : selected,
        })
      }
    })
  },
  { immediate: true },
)

function toggleMultipleChoiceNoQty(group, option, quantity) {
  const min = option.minimumChoices || 0
  const max = option.maximumChoices || group.customMaxChoices || group.maximumChoices || 99

  let groupEntry = selectedOptions.value.find((sel) => sel.groupId === group.optionGroupId)

  if (!groupEntry) {
    groupEntry = {
      groupId: group.optionGroupId,
      groupName: group.name,
      selected: [],
    }
    selectedOptions.value.push(groupEntry)
  }

  const optionIndex = groupEntry.selected.findIndex((o) => o.optionId === option.optionId)
  if (optionIndex !== -1) {
    groupEntry.selected.splice(optionIndex, 1)
    return
  } else {
    const newOption = {
      optionId: option.optionId,
      name: option.name,
      type: option.type,
      price: option.isFree ? 0 : option.customPrice || option.price,
      quantity: 1,
    }

    groupEntry.selected.push(newOption)
  }
}

function updateSingleChoice(group: any, option: any) {
  if (option.type.toLowerCase() === 'article') {
    selectedOptions.value = []
    getArticlesConfiguration(group.optionGroupId, option.optionId)
  }
  const index = selectedOptions.value.findIndex((sel) => sel.groupId === group.optionGroupId)
  const newEntry = {
    groupId: group.optionGroupId,
    groupName: group.name,
    selected: [
      {
        optionId: option.optionId,
        name: option.name,
        type: option.type,
        price: option.isFree ? 0 : option.customPrice || option.price,
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
  const index = selectedOptions.value.findIndex((sel) => sel.groupId === group.optionGroupId)
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

  let groupEntry = selectedOptions.value.find((sel) => sel.groupId === group.optionGroupId)

  if (!groupEntry) {
    groupEntry = {
      groupId: group.optionGroupId,
      groupName: group.name,
      selected: [],
    }
    selectedOptions.value.push(groupEntry)
  }

  const optionIndex = groupEntry.selected.findIndex((o) => o.optionId === option.optionId)
  const opt = groupEntry.selected[optionIndex]

  const totalQtyInGroup = groupEntry.selected.reduce((sum, o) => sum + (o.quantity || 0), 0)
  const maxAllowed = group.customMaxChoices || group.maximumChoices || 99

  if (totalQtyInGroup - (opt?.quantity || 0) + quantity > maxAllowed) {
    return
  }

  if (quantity === 0) {
    if (optionIndex !== -1) groupEntry.selected.splice(optionIndex, 1)
  } else {
    const newOption = {
      optionId: option.optionId,
      name: option.name,
      type: option.type,
      price: option.isFree ? 0 : option.customPrice || option.price,
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
.out-of-stock {
  opacity: 0.5;
  cursor: not-allowed !important;
  pointer-events: none;
}

.out-of-stock:hover {
  border-color: #e9ecef !important;
  background: white !important;
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
</style>
