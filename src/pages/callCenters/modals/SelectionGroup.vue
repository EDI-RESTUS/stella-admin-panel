<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="selection-group">
    <div class="group-header">
      <h3 class="group-title">{{ group.name }}</h3>
      <div class="selection-progress">
        <span>{{ selectedItems.length }}/{{ group.max }} selected</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: percent + '%' }" />
        </div>
      </div>
    </div>
    <div class="items-grid">
      <div
        v-for="(item, index) in group.addedItems"
        :key="index"
        class="selection-item selected"
        @click="openSelectionItemModal(group, true, item, index)"
      >
        <div class="item-image"><img :src="item.imageUrl" /></div>
        <div class="item-content">
          <div class="item-name">{{ item.itemName }}</div>
          <div class="item-description">{{ item.itemDescription }}</div>
          <div
            v-if="item.selectedOptions && item.selectedOptions.flatMap(g => g.selected).length"
            class="item-extras"
          >
            <span
              v-for="opt in item.selectedOptions.flatMap(g => g.selected)"
              :key="opt.optionId"
              class="item-extra-tag"
            >
              {{ opt.name }}{{ opt.price > 0 ? ` (+€${Number(opt.price).toFixed(2)})` : '' }}
            </span>
          </div>
        </div>
        <div class="selection-status"></div>
      </div>

      <div
        v-for="n in group.max - group.addedItems.length"
        :key="'ph-' + n"
        class="selection-item placeholder"
        @click="openSelectionItemModal(group)"
      >
        <div class="item-image cursor-pointer" style="color: #2d5016">➕</div>
        <div class="item-content cursor-pointer">
          <div class="item-label">{{ group.name }} {{ n }}</div>
          <div class="item-name">Select Your {{ group.description }}</div>
          <div class="item-description">Choose from options</div>
        </div>
        <div class="selection-status"></div>
      </div>
    </div>
    <OffersMenuItemsSelectionModal
      v-if="isItemSelectionModalVisible"
      :is-edit="isEdit"
      :selected-menu-item="selectedMenuItem"
      :slot-index="selectedSlotIndex"
      :group="group"
      :menu-items="group.menuItems"
      :default-selected="group.menuItemDefaultOptions"
      @closeModal="isItemSelectionModalVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import OffersMenuItemsSelectionModal from './OffersMenuItemsSelectionModal.vue'
import axios from 'axios'
import { useMenuStore } from '@/stores/getMenu'
const props = defineProps({
  group: Object,
  isEdit: Boolean,
})
const emit = defineEmits(['update:selectedItems'])
const menuStore = useMenuStore()
const isItemSelectionModalVisible = ref(false)
const menuItems = ref(null)
const isEdit = ref(false)
const selectedMenuItem = ref('')
const selectedSlotIndex = ref(-1)
function openSelectionItemModal(payload, editing = false, item = null, slotIndex = -1) {
  isEdit.value = editing
  selectedSlotIndex.value = slotIndex
  selectedMenuItem.value = item
  menuItems.value = payload.menuItems || null
  isItemSelectionModalVisible.value = true
}
const selectedItems = computed(() => props.group.addedItems.map((item) => item._id))
const percent = computed(() => (selectedItems.value.length / props.group.max) * 100)
const fetchConfigurations = ref([])

function toggleSelection(group, index) {
  useMenuStore().removeItemFromOffer(group, index)
}

const getArticlesConfiguration = async (menuItem, group, option, hasSelectedOptions) => {
  const url = import.meta.env.VITE_API_BASE_URL
  await axios
    .get(`${url}/articles-options-conditions?optionsGroupId=${group._id}&menuItemId=${menuItem.id}&optionId=${option}`)
    .then((response) => {
      let addedItems = {}
      fetchConfigurations.value = response.data.data.flatMap((a) => a.conditionalSelection)
      const hasFilteredOptions = hasSelectedOptions.filter((a) =>
        fetchConfigurations.value.find((e) => e.optionsGroupId === a._id),
      )
      addedItems = {
        itemId: menuItem.id,
        itemName: menuItem.name,
        itemDescription: menuItem.description,
        basePrice: menuItem.isFree ? 0 : parseFloat(menuItem.customPrice || menuItem.price),
        imageUrl: menuItem.imageUrl,
        quantity: 1,
        selectedOptions: hasFilteredOptions
          ? [
              {
                groupId: group._id,
                groupName: group.name,
                selected: group.selectedOptions
                  .filter((a) => group.selectedOptionsDefaultOption.includes(a.optionId))
                  .map((option) => ({
                    optionId: option.optionId,
                    name: option.name,
                    type: option.type,
                    price: option.isFree ? 0 : option.customPrice || option.price,
                    quantity: 1,
                  })),
              },
              ...hasFilteredOptions.map((optionGroup) => {
                const fetchOptions = fetchConfigurations.value.find((a) => a.optionsGroupId === optionGroup._id)

                return {
                  groupId: optionGroup._id,
                  groupName: optionGroup.name,
                  selected: optionGroup.selectedOptions
                    .filter(
                      (a) =>
                        optionGroup.selectedOptionsDefaultOption.includes(a.optionId) &&
                        fetchOptions.optionsIds.includes(a.optionId),
                    )
                    .map((option) => ({
                      optionId: option.optionId,
                      name: option.name,
                      type: option.type,
                      price: option.isFree ? 0 : option.customPrice || option.price,
                      quantity: 1,
                    })),
                }
              }),
            ]
          : [],
        totalPrice: 0,
        selectionTotalPrice: 0,
      }

      menuStore.addItemToOffer(props.group, addedItems)
    })
}

// check if default selection is already made

if (!props.isEdit) {
  const includedMenuItems = props.group.menuItems.filter((item) => props.group.menuItemDefaultOptions.includes(item.id))

  includedMenuItems.forEach((menuItem) => {
    const hasSelectedOptions = (menuItem.optionGroups || []).filter((a) => a.selectedOptionsDefaultOption?.length)

    const optionGroupArticle = hasSelectedOptions
      .flatMap((a) => a.selectedOptions)
      .find((a) => a.type.toLowerCase() === 'article')
    if (optionGroupArticle) {
      getArticlesConfiguration(menuItem, menuItem.optionGroups[0], optionGroupArticle.optionId, hasSelectedOptions)
    } else {
      let addedItems = {}
      addedItems = {
        itemId: menuItem.id,
        itemName: menuItem.name,
        itemDescription: menuItem.description,
        basePrice: menuItem.isFree ? 0 : parseFloat(menuItem.customPrice || menuItem.price),
        imageUrl: menuItem.imageUrl,
        quantity: 1,
        selectedOptions: hasSelectedOptions
          ? hasSelectedOptions.map((optionGroup) => ({
              groupId: optionGroup.optionGroupId,
              groupName: optionGroup.name,
              selected: (optionGroup.selectedOptions || [])
                .filter((a) => optionGroup.selectedOptionsDefaultOption.includes(a.optionId))
                .map((option) => ({
                  optionId: option.optionId,
                  name: option.name,
                  type: option.type,
                  price: option.isFree ? 0 : option.customPrice || option.price,
                  quantity: 1,
                })),
            }))
          : [],
        totalPrice: 0,
        selectionTotalPrice: 0,
      }

      menuStore.addItemToOffer(props.group, addedItems)
    }
  })
}
</script>

<style>
.selection-group {
  display: flex;
  flex-direction: column;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e9ecef;
}

.group-title {
  font-size: 18px;
  font-weight: 700;
  color: #2d5016;
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-icon {
  font-size: 24px;
}

.selection-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6c757d;
}

.progress-bar {
  width: 60px;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2d5016;
  transition: width 0.3s ease;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  padding-bottom: 20px;
  margin-top: 10px;
}

.selection-item {
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  transition: all 0.3s ease;
  background: white;
}

.selection-item:hover {
  border-color: #2d5016;
  background: rgba(45, 80, 22, 0.02);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.selection-item.selected {
  border-color: #2d5016;
  background: rgba(45, 80, 22, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 80, 22, 0.2);
}

.selection-item.placeholder {
  border-style: dashed;
  border-color: #ced4da;
  background: #f8f9fa;
  cursor: default;
  opacity: 0.7;
}

.selection-item.placeholder:hover {
  transform: none;
  box-shadow: none;
  background: #f8f9fa;
  border-color: #ced4da;
}

.item-image {
  width: 60px;
  height: 60px;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.selection-item.selected .item-image {
  background: rgba(45, 80, 22, 0.1);
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-label {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.item-name {
  font-size: 16px;
  color: #495057;
  font-weight: 600;
  line-height: 1.2;
}

.item-description {
  font-size: 13px;
  color: #6c757d;
  line-height: 1.3;
}

.selection-item.placeholder .item-name {
  color: #adb5bd;
  font-style: italic;
}

.item-extras {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.item-extra-tag {
  font-size: 10px;
  background: rgba(45, 80, 22, 0.12);
  color: #2d5016;
  border-radius: 4px;
  padding: 1px 5px;
  white-space: nowrap;
}

.selection-status {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selection-item.selected .selection-status {
  border-color: #2d5016;
  background: #2d5016;
  color: white;
}

.selection-status::after {
  content: '✓';
  font-size: 12px;
  font-weight: 700;
  opacity: 0;
}

.selection-item.selected .selection-status::after {
  opacity: 1;
}
</style>
