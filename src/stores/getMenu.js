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
        const { entityType, entityId, inStock } = payload
        // Determine endpoint based on entity type
        const endpoint = entityType === 'MenuItem'
          ? `${this.url}/menuItems/${entityId}`
          : `${this.url}/articles-options/${entityId}`

        // Find the current entity to get its inStockByZones
        let currentZones = []
        if (entityType === 'MenuItem') {
          const item = this.unFilteredMenuItems.find(i => i._id === entityId)
          currentZones = Array.isArray(item?.inStockByZones) ? [...item.inStockByZones] : []
        }

        // Update the specific zone in the array
        const idx = currentZones.findIndex(z => z.deliveryZoneId === this.deliveryZoneId)
        if (idx >= 0) {
          currentZones[idx] = { ...currentZones[idx], inStock }
        } else {
          currentZones.push({ deliveryZoneId: this.deliveryZoneId, inStock })
        }

        await axios.patch(endpoint, {
          inStockByZones: currentZones,
          outletId: this.restDetails?._id,
        })
        this.updateLocalStock({ entityType, entityId, inStock, inStockByZones: currentZones })
      } catch (error) {
        console.error('[MenuStore] Failed to update stock status:', error)
        throw error
      }
    },
    updateLocalStock({ entityType, entityId, inStock, inStockByZones }) {
      // Helper to update stock in memory
      if (entityType === 'MenuItem') {
        const updateItem = (items) => {
          items.forEach((item) => {
            if (item._id === entityId) {
              item.inStock = inStock
              if (inStockByZones) item.inStockByZones = inStockByZones
            }
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
        if (unfiltered) {
          unfiltered.inStock = inStock
          if (inStockByZones) unfiltered.inStockByZones = inStockByZones
        }
      } else if (entityType === 'ArticlesOptions') {
        // Options are nested deep in articlesOptionsGroups
        const updateOptions = (items) => {
          items.forEach((item) => {
            // Check item's option groups
            item.articlesOptionsGroup?.forEach(group => {
              const option = group.articlesOptions?.find(o => o._id === entityId)
              if (option) {
                option.inStock = inStock
                if (inStockByZones) option.inStockByZones = inStockByZones
              }
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
