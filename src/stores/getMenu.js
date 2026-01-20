import { defineStore } from 'pinia'
import axios from 'axios'
import { useServiceStore } from './services'
export const useMenuStore = defineStore('menu', {
  state: () => {
    return {
      categories: [],
      services: useServiceStore().$state,
      url: import.meta.env.VITE_API_BASE_URL,
      restDetails: null,
      unFilteredMenuItems: [],
      offer: null,
      deliveryZoneId: null,
    }
  },
  getters: {
    addOnPrice: (state) => {
      let selectionTotal = 0
      if (!state.offer) {
        return selectionTotal
      }
      state.offer.selections.forEach((item) => {
        item.addedItems.forEach((addedItem) => {
          selectionTotal += addedItem.basePrice * addedItem.quantity
          addedItem.selectedOptions.forEach((group) => {
            group.selected.forEach((selection) => {
              selectionTotal += selection.price * selection.quantity
            })
          })
        })
      })

      return selectionTotal
    },
  },
  actions: {
    setOffer(offer) {
      this.offer = offer
    },
    addItemToOffer(group, product) {
      const index = this.offer.selections.findIndex((a) => a._id === group._id)
      this.offer.selections[index].addedItems.push(product)
      if (!this.offer) {
        this.offer[group] = []
      }
    },
    updateItemToOffer(product, groupItemIndex, addedItemIndex) {
      this.offer.selections[groupItemIndex].addedItems[addedItemIndex] = JSON.parse(JSON.stringify(product))
    },
    removeItemFromOffer(group, index) {
      const itemIndex = this.offer.selections.findIndex((a) => a._id === group._id)
      if (itemIndex !== -1) {
        this.offer.selections[itemIndex].addedItems.splice(index, 1)
      }
    },
    resetUnFilteredMenuItems() {
      this.unFilteredMenuItems
    },
    async getOutletDetails(payload) {
      const response = await axios.get(`${this.url}/outletsvo`, {
        params: {
          outletSlug: payload,
        },
      })
      this.restDetails = response.data[0]
    },
    async getCategories() {
      await axios
        .get(`${this.url}/menuCategoriesvo?limit=50`, {
          params: {
            outletName: this.restDetails.name,
          },
        })
        .then((res) => {
          if (res.data.length) {
            this.categories = res.data.map((e) => ({
              ...e,
              menuItems: [],
              subCategories: e.subCategories.map((subCategory) => ({
                ...subCategory,
                menuItems: [],
              })),
            }))
            res.data.forEach(async (category) => {
              await this.getMenuItems(category)
            })
          }
        })
    },
    setDeliveryZoneId(id) {
      this.deliveryZoneId = id
    },
    async updateStockStatus(payload) {
      if (!this.deliveryZoneId) return
      try {
        await axios.patch(`${this.url}/deliveryZones/${this.deliveryZoneId}/stock`, {
          outletId: this.restDetails?._id,
          ...payload,
        })
        // Optimized: update local state immediately instead of full refetch
        // We can do a refetch in the background if needed, but immediate feedback is better
        this.updateLocalStock(payload)
      } catch (error) {
        console.error('Failed to update stock status:', error)
        throw error
      }
    },
    updateLocalStock({ entityType, entityId, inStock }) {
      // Helper to update stock in memory
      if (entityType === 'MenuItem') {
        const updateItem = (items) => {
          items.forEach((item) => {
            if (item._id === entityId) item.inStock = inStock
            if (item.subCategories) updateItem(item.subCategories)
            if (item.menuItems) updateItem(item.menuItems)
          })
        }
        this.categories.forEach((cat) => {
          updateItem(cat.menuItems)
          if (cat.subCategories) updateItem(cat.subCategories) // Recurse into subcats
        })
        // Also update unFilteredMenuItems
        const unfiltered = this.unFilteredMenuItems.find(i => i._id === entityId)
        if (unfiltered) unfiltered.inStock = inStock
      } else if (entityType === 'ArticlesOptions') {
        // Options are nested deep in articlesOptionsGroups
        const updateOptions = (items) => {
          items.forEach((item) => {
            // Check item's option groups
            item.articlesOptionsGroup?.forEach(group => {
              const option = group.articlesOptions?.find(o => o._id === entityId)
              if (option) option.inStock = inStock
            })
            if (item.subCategories) updateOptions(item.subCategories)
            if (item.menuItems) updateOptions(item.menuItems)
          })
        }
        this.categories.forEach((cat) => {
          updateOptions(cat.menuItems)
          if (cat.subCategories) updateOptions(cat.subCategories)
        })
      }
    },
    async getMenuItems(item) {
      axios
        .get(`${this.url}/menuItemsvo?limit=1000`, {
          params: {
            outletId: this.restDetails._id,
            categoryId: item._id,
            ...(this.deliveryZoneId && { deliveryZoneId: this.deliveryZoneId }),
          },
        })
        .then((response) => {
          this.unFilteredMenuItems.push(...response.data)
          const categoryIndex = this.categories.findIndex((category) => category._id === item._id)
          if (categoryIndex !== -1) {
            const itemsWithSubCategories = response.data.filter((item) => item.subCategories.length)
            const itemsWithoutSubCategories = response.data.filter((item) => !item.subCategories.length)
            this.categories[categoryIndex] = {
              ...this.categories[categoryIndex],
              menuItems: itemsWithoutSubCategories,
              subCategories: this.categories[categoryIndex].subCategories.map((e) => {
                const subCategoryItems = itemsWithSubCategories.filter(
                  (item) => item.subCategories.length && item.subCategories.find((a) => a.id === e._id),
                )
                return {
                  ...e,
                  menuItems: subCategoryItems,
                }
              }),
            }
          }
        })
    },
  },
})
