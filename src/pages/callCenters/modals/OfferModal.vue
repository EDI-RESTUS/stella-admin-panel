<template>
  <VaModal
    v-model="showOfferModal"
    class="big-xl-modal !p-0"
    :mobile-fullscreen="false"
    size="large"
    hide-default-actions
    close-button
  >
    <div class="offer-modal">
      <div class="modal">
        <button class="close-btn" @click="$emit('cancel')">×</button>

        <!-- LEFT: Offer Info -->
        <div class="offer-info">
          <div class="offer-icon">
            <img
              :src="item.imageUrl || '/missing-image.png'"
              alt="Offer Icon"
              class="w-full h-full object-fit rounded-full"
            />
          </div>
          <div class="offer-details">
            <h3 class="offer-name">{{ item.name }}</h3>
            <div class="offer-contents">
              <p style="font-size: 14px; line-height: 1.5; margin-bottom: 0; text-align: center; opacity: 0.95">
                {{ item.description }}
              </p>
            </div>
            <div class="price-section flex flex-col items-center space-y-2">
              <div class="offer-price">€{{ parseFloat(item.price).toFixed(2) }}</div>
              <div v-if="addOnPrice">+</div>
              <div v-if="addOnPrice" class="offer-price flex space-x-2 items-center">
                €{{ parseFloat(addOnPrice).toFixed(2) }} <span class="text-xs ml-2">(Add-ons)</span>
              </div>
            </div>
            <button class="add-to-basket" :disabled="!hasAtLeastOneSelection" @click="addToBasket">
              {{
                totalSelected >= totalRequired
                  ? isEdit
                    ? 'Update Bundle'
                    : 'Add Bundle to Basket'
                  : `Complete Your Selection (${totalSelected}/${totalRequired})`
              }}
            </button>
          </div>
        </div>

        <!-- RIGHT: Selection Area -->

        <div class="selection-area">
          <div v-if="!offer" class="text-center p-4 flex items-center justify-center h-full">
            <p class="text-center text-gray-500">Loading offer details...</p>
          </div>
          <div v-else>
            <SelectionGroup v-for="group in offer.selections" :key="group.title" :is-edit="isEdit" :group="group" />
          </div>
        </div>
      </div>
    </div>
  </VaModal>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrderStore } from '@/stores/order-store'
import SelectionGroup from './SelectionGroup.vue'
import axios from 'axios'
import { useMenuStore } from '@/stores/getMenu'
const orderStore = useOrderStore()

const showOfferModal = ref(true)
const emits = defineEmits(['cancel', 'cancel-edit'])

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  isEdit: {
    type: Boolean,
    required: false,
  },
})
const menuStore = useMenuStore()

const { offer } = storeToRefs(menuStore)

function getMenu() {
  const url = import.meta.env.VITE_API_BASE_URL + '/offers/' + props.item._id
  axios
    .get(url)
    .then((response) => {
      const resp = {
        ...response.data.data,
        selections: response.data.data.selections.map((group) => {
          const hasSelection = props.isEdit ? props.item.selections.find((a) => a._id === group._id) : null
          return {
            ...group,
            addedItems: props.isEdit && hasSelection ? hasSelection.addedItems : [],
          }
        }),
      }

      menuStore.setOffer(resp)
    })
    .catch((error) => {
      console.error('Error fetching offer details:', error)
    })
}
getMenu()
watch(showOfferModal, (val) => {
  if (!val) {
    emits('cancel')
    menuStore.setOffer(null)
  }
})

onBeforeUnmount(() => {
  menuStore.setOffer(null)
})
const totalRequired = computed(() => {
  if (!offer.value) return 0
  return offer.value.selections.reduce((total, group) => total + group.min, 0)
})

const totalSelected = computed(() => {
  if (!offer.value) return 0
  return offer.value.selections.reduce((sum, group) => sum + group.addedItems.length, 0)
})

// Disable if no items selected at all
const hasAtLeastOneSelection = computed(() => {
  return offer.value
    ? offer.value.selections.filter((a) => a.isRequired).length
      ? offer.value.selections
        .filter((a) => a.isRequired)
        .every((group) => group.addedItems && group.addedItems.length > 0)
      : true
    : false
})

const { addOnPrice } = storeToRefs(menuStore)

function addToBasket() {
  if (!props.isEdit) {
    orderStore.offersAdded({
      ...offer.value,
      offerId: offer.value._id,
      selectionTotalPrice: addOnPrice.value,
      quantity: 1,
      totalPrice: offer.value.price + addOnPrice.value,
    })
  } else {
    orderStore.offersUpdated({
      ...offer.value,
      offerId: offer.value._id,
      selectionTotalPrice: addOnPrice.value,
      quantity: 1,
      totalPrice: offer.value.price + addOnPrice.value,
      index: props.item.index,
    })
  }
  emits('cancel')
}
</script>
<style>
.offer-modal {
  background: rgba(0, 0, 0, 0.6);
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 100;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 98vw;
  height: 90vh;
  display: grid;
  grid-template-columns: 280px 1fr;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 20px;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 50%;
  color: #666;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.offer-info {
  background: linear-gradient(135deg, #2d5016 0%, #3a6b1d 100%);
  padding: 25px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1px solid #e9ecef;
  justify-content: space-between;
  color: white;
}

.offer-badge {
  background: rgba(255, 193, 7, 0.9);
  color: #2d5016;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 20px;
}

.offer-icon {
  width: 120px;
  height: 120px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
}

.offer-details {
  text-align: center;
  flex: 1;
}

.offer-name {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 15px;
  line-height: 1.3;
}

.offer-contents {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
}
.offer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  opacity: 0.9;
}
.offer-item:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.item-icon {
  margin-right: 8px;
}

.price-section {
  text-align: center;
  margin: 20px 0;
}
.original-price {
  font-size: 14px;
  text-decoration: line-through;
  opacity: 0.7;
  margin-bottom: 5px;
}
.offer-price {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 5px;
}

.savings {
  font-size: 12px;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 10px;
  display: inline-block;
}

.add-to-basket {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: auto;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.add-to-basket:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.add-to-basket:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selection-area {
  padding: 30px 50px 20px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 25px;
}
@media (max-width: 1200px) {
  .modal {
    grid-template-columns: 240px 1fr;
  }
}

@media (max-width: 900px) {
  .modal {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .offer-info {
    border-right: none;
    border-bottom: 1px solid #e9ecef;
    flex-direction: row;
    gap: 20px;
    padding: 20px;
    justify-content: flex-start;
  }

  .offer-icon {
    width: 80px;
    height: 80px;
    font-size: 40px;
    margin-bottom: 0;
  }

  .offer-details {
    text-align: left;
    flex: 1;
  }

  .items-grid {
    grid-template-columns: 1fr;
  }
}
</style>