// E-shop gating, shared by the sidebar and the E-shop pages.
//
// The E-SHOP section exists for an outlet whose document carries
// `eshopFulfilment` (only POW today — absent on every other outlet), and for a
// super-admin on any outlet, so the first settings can be written. The outlet
// is the one picked in the top navbar: `servicesStore.restDetails` (the admin
// outlet document from GET /outlets), else the same id in `servicesStore.items`
// — restDetails briefly holds the whole list on a first visit.
import { computed } from 'vue'
import { useServiceStore } from '@/stores/services'
import { useUsersStore } from '@/stores/users'

export function useEshopOutlet() {
  const servicesStore = useServiceStore()
  const usersStore = useUsersStore()

  const outletId = computed(() => String(servicesStore.selectedRest || ''))

  /** The selected outlet's document, or null while the navbar is still loading it. */
  const outlet = computed<any>(() => {
    const id = outletId.value
    if (!id) return null
    const details: any = servicesStore.restDetails
    if (details && !Array.isArray(details) && typeof details === 'object' && details._id === id) return details
    const items: any[] = Array.isArray(servicesStore.items) ? servicesStore.items : []
    return items.find((o) => o?._id === id) || null
  })

  const hasEshop = computed(() => !!outlet.value?.eshopFulfilment)

  // userDetails is null on a hard refresh until the sidebar's GET /users/:id
  // answers; the role the router guard reads is in sessionStorage already.
  const role = computed<string>(() => {
    const fromStore = (usersStore.userDetails as any)?.role
    if (fromStore) return String(fromStore)
    try {
      return window.sessionStorage.getItem('role') || ''
    } catch {
      return ''
    }
  })
  const isSuperAdmin = computed(() => role.value === 'super-admin')
  /** Settings, resyncs: the backend's admin roles. */
  const isAdmin = computed(() => ['admin', 'super-admin'].includes(role.value))

  return { outletId, outlet, hasEshop, role, isSuperAdmin, isAdmin }
}
