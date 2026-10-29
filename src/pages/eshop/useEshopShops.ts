// The e-shop's shops of the navbar outlet, each with a name: the website name
// of the settings, else its delivery zone's name — as the server names them
// on the orders. The shops come from the outlet document the navbar loaded
// (outlet.eshopFulfilment.shops, there for every staff role: the settings
// endpoint is admin-only); the zone names from GET /deliveryZones/:outletId
// (any signed-in role), read once per outlet. Without them a shop shows its
// website name, or its zone id.
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { useEshopOutlet } from '@/composables/useEshopOutlet'
import { eshopShopsOf } from './eshopHelpers'

export function useEshopShops() {
  const { outletId, outlet, hasEshop } = useEshopOutlet()
  const zoneNames = ref<Record<string, string>>({})

  watch(
    [outletId, hasEshop],
    async ([id, has]) => {
      zoneNames.value = {}
      if (!id || !has) return
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/deliveryZones/${id}`)
        if (id !== outletId.value) return
        const names: Record<string, string> = {}
        for (const z of Array.isArray(data?.data) ? data.data : []) {
          if (z?._id && z.name) names[String(z._id).toLowerCase()] = String(z.name)
        }
        zoneNames.value = names
      } catch {
        /* the shops keep their website name, or their id */
      }
    },
    { immediate: true },
  )

  const shops = computed(() =>
    eshopShopsOf(outlet.value).map((s) => ({ ...s, name: s.displayName || zoneNames.value[s.zoneId] || s.zoneId })),
  )

  /** The shop selling from a Winmax warehouse (an active one first), or null. */
  function shopOfWarehouse(code: unknown) {
    const all = shops.value.filter((s) => s.warehouseCode === Number(code))
    return all.find((s) => s.active) || all[0] || null
  }

  return { shops, shopOfWarehouse }
}
