<template>
  <div class="menu-item" @click="getMenuOptions">
    <div class="item-content" :class="{ 'no-price': !parseFloat(item.price) }">
      <div class="item-name">{{ item.name }}</div>
      <div v-if="parseFloat(item.price)" class="item-price">€{{ parseFloat(item.price).toFixed(2) }}</div>
    </div>

    <div v-if="item.imageUrl" class="item-image">
      <img :src="item.imageUrl" alt="icon" class="w-full h-full" />
    </div>

    <MenuModal
      v-if="showMenuModal"
      :item="itemWithArticlesOptionsGroups"
      :menu-item-id="item._id"
      :category-id="categoryId"
      :fetch-configurations="[]"
      @cancel="closeMenuModal"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MenuModal from '../modals/MenuModal.vue'
import axios from 'axios'
import { useToast } from 'vuestic-ui'
import { useOrderStore } from '@/stores/order-store'

const props = defineProps({
  item: Object,
  categoryId: String,
})

const showMenuModal = ref(false)
const isLoading = ref(false)
const itemWithArticlesOptionsGroups = ref({})
const orderStore = useOrderStore()

const { init } = useToast()

function addToBasket(item) {
  const productEntry = {
    itemId: item._id,
    itemName: item.name,
    basePrice: parseFloat(item.price),
    imageUrl: item.imageUrl,
    quantity: 1,
    selectedOptions: [],
    totalPrice: 0,
    selectionTotalPrice: 0,
  }

  orderStore.addItemToCart(productEntry)
  const newIndex = orderStore.cartItems.length - 1
  orderStore.calculateItemTotal(newIndex)
}

const getMenuOptions = async () => {
  const url = import.meta.env.VITE_API_BASE_URL
  isLoading.value = true
  try {
    const response = await axios.get(`${url}/menuItemvoById/${props.item._id}`)

    const articlesOptionsGroups = response.data.articlesOptionsGroups

    itemWithArticlesOptionsGroups.value = {
      articlesOptionsGroups: articlesOptionsGroups || [],
      ...props.item,
    }

    if (articlesOptionsGroups && articlesOptionsGroups.length) {
      openMenuModal()
    } else {
      addToBasket(itemWithArticlesOptionsGroups.value)
    }
  } catch (error) {
    init({ message: 'Something went wrong', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}

function openMenuModal() {
  showMenuModal.value = true
}
function closeMenuModal() {
  showMenuModal.value = false
}
</script>

<style scoped>
.menu-card {
  cursor: pointer;
}
.item-text {
  font-weight: 500;
}

.menu-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 15px 8px;
  transition: all 0.2s ease;
  cursor: pointer;
  width: 200px;
  height: 100px;
  display: flex;
  align-items: stretch;
}

.menu-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #2d5d2a;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
.no-price {
  justify-content: center;
}

.item-image {
  width: 80px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  flex-shrink: 0;
}

.item-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-price {
  font-size: 16px;
  font-weight: 700;
  color: #2d5d2a;
}
</style>
