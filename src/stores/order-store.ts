import { defineStore } from 'pinia'
import axios from 'axios'

export const useOrderStore = defineStore('order', {
  state: () => ({
    cartItems: [],
    editOrder: null,
    offers: [],
    offerItems: [],
    cartTotal: null,
    paymentId: '',
    redirectUrl: '',
    deliveryZone: '',
    address: '',
    phoneNumber: '',
    orderFor: 'current',
    orderNotes: '',
    deliveryNotes: "",

    // ADDED — holds /orders/validate-promo response for UI breakdown (incl. updatedOffersTotal)
    validation: null as null | {
      originalTotal: number
      updatedTotal: number
      discount: number
      discountType: string | null
      affect: any
      deliveryFee: number
      menuItems: Array<{
        menuItemId: string
        name: string
        quantity: number
        originalPrice: number
        optionsPrice: number
        updatedPrice: number
        discount: number
        isAffected: boolean
      }>
      offerDetails: Array<{
        offerName: string
        code: string
        totalPrice: number
        offerId: string
        basePrice: number
        offerItems: any[]
      }>
      updatedOffersTotal: number
      affectsOffers: boolean

    },
    editContext: null as null | {
      orderId: string
      tableNumber: number
      originalMenuItems: Array<{ menuItem: string; quantity: number; options?: Array<{ option: string; quantity?: number }> }>
      originalOffersToDelete: Array<{ offerId: string; quantity: number }>
    },
  }),

  // ADDED — derived totals for Order Details & Checkout Modal
  getters: {
    // Items (before promos)
    originalItemsTotal: (s) =>
      s.validation
        ? Number(
          s.validation.menuItems
            .reduce((sum, it) => sum + Number(it.originalPrice) + Number(it.optionsPrice || 0), 0)
            .toFixed(2),
        )
        : 0,

    // Offers (before promos) = sum of basePrice in offerDetails
    originalOffersTotal: (s) =>
      s.validation?.offerDetails?.length
        ? Number(
          s.validation.offerDetails.reduce((sum, o) => sum + Number(o.basePrice || 0), 0).toFixed(2),
        )
        : 0,

    // Items after promos = sum of updatedPrice
    itemsAfterPromos: (s) =>
      s.validation
        ? Number(
          s.validation.menuItems.reduce((sum, it) => sum + Number(it.updatedPrice || 0), 0).toFixed(2),
        )
        : 0,

    // Offers after promos = backend aggregate updatedOffersTotal
    offersAfterPromos: (s) =>
      s.validation ? Number((s.validation.updatedOffersTotal || 0).toFixed(2)) : 0,

    deliveryFeeValidated: (s) =>
      s.validation ? Number((s.validation.deliveryFee || 0).toFixed(2)) : 0,

    // Cross-getter access must use method syntax + `this`
    originalTotal(): number {
      return Number((this.originalItemsTotal + this.originalOffersTotal).toFixed(2))
    },

    updatedTotalValidated(): number {
      return Number((this.itemsAfterPromos + this.offersAfterPromos + this.deliveryFeeValidated).toFixed(2))
    },

    totalDiscountValidated(): number {
      return Number((this.originalTotal - this.updatedTotalValidated).toFixed(2))
    },

    affectsOffers: (s): boolean => !!s.validation?.affectsOffers,
  },

  actions: {
    setOrderTotal(payload) {
      this.cartTotal = payload
    },
    setOrderFor(payload) {
      this.orderFor = payload
    },
    resetEditOrder() {
      this.editOrder = null
    },
    setCartItems(payload) {
      this.cartItems = payload
    },
    setDeliveryZone(payload) {
      this.deliveryZone = payload
    },
    setAddress(payload) {
      this.address = payload
    },
    setOrderNotes(payload) {
      this.orderNotes = payload
    },
    setDeliveryNotes(v: string) {
      this.deliveryNotes = v ?? ""
    },
    setPaymentLink(payload) {
      this.redirectUrl = payload
    },
    addItemToCart(item: any) {
      this.cartItems.push(item)
    },
    offersAdded(item: any) {
      this.offerItems.push(item)
    },
    offersUpdated(item: any) {
      const itemIndex = item.index
      if (itemIndex !== -1) {
        this.offerItems[itemIndex] = item
      }
    },
    updateItem(index: number, newItem: any) {
      this.cartItems[index] = newItem
    },
    removeItem(index: number) {
      this.cartItems.splice(index, 1)
    },
    removeOffersAdded(index: number) {
      this.offerItems.splice(index, 1)
    },
    addEditOrder(item: any) {
      this.editOrder = item
    },
    calculateItemTotal(itemIndex: number) {
      const item = this.cartItems[itemIndex]

      let total = item.basePrice
      let selectionTotal = 0

      item.selectedOptions.forEach((group) => {
        group.selected.forEach((selection) => {
          total += selection.price * selection.quantity
          selectionTotal += selection.price * selection.quantity
        })
      })

      total = total * item.quantity
      this.cartItems[itemIndex] = {
        ...item,
        totalPrice: total,
        selectionTotalPrice: selectionTotal,
      }
    },
    async createOrder(payload) {
      const url = import.meta.env.VITE_API_BASE_URL
      return await axios.post(`${url}/orders`, payload)
    },
    async validatePromoCode(payload) {
      const url = import.meta.env.VITE_API_BASE_URL
      return await axios.post(`${url}/orders/validate-promo`, payload)
    },

    // ADDED — convenience: validate + persist response for UI usage
    async validatePromoAndSave(payload: any) {
      const res = await this.validatePromoCode(payload)
      if (res?.data?.success) {
        this.validation = res.data.data
      } else {
        this.validation = null
      }
      return res
    },
    // ADDED — manual control if you already have the response object
    setValidation(data: any) {
      this.validation = data
    },
    // ADDED — clear breakdown
    clearValidation() {
      this.validation = null
    },

    async checkPaymentStatus(orderId, paymentTypeId) {
      const url = import.meta.env.VITE_API_BASE_URL
      return await axios.put(`${url}/payments/verify/${orderId}?paymentTypeId=${paymentTypeId}`)
    },
    async getOrderStatus(orderId: string) {
      const url = import.meta.env.VITE_API_BASE_URL
      return await axios.get(`${url}/orders/${orderId}/status`)
    },
    async cancelOrder(orderId: string) {
      const url = import.meta.env.VITE_API_BASE_URL
      return await axios.put(`${url}/orders/${orderId}/cancel`)
    },
    async createPayment({ orderId: orderId, paymentTypeId: paymentTypeId }) {
      const url = import.meta.env.VITE_API_BASE_URL
      const next = window.location.href

      return await axios.post(`${url}/payments/${orderId}?paymentTypeId=${paymentTypeId}`, { next })
    },
    async sendOrderToWinmax(orderId, orderFor) {
      const url = import.meta.env.VITE_API_BASE_URL
      return await axios.post(`${url}/winmax/winmax-orders/`, {
        id: orderId,
        orderFor: orderFor,
      })
    },
    async retryPayment(orderId, paymentTypeId) {
      const url = import.meta.env.VITE_API_BASE_URL
      const next = window.location.href

      return await axios.post(`${url}/payments/retry/${orderId}?paymentTypeId=${paymentTypeId}`, { next })
    },
    setPhoneNumber(payload: string) {
      this.phoneNumber = payload
    },

    // --- additions inside `actions: { ... }` ---
    setEditContext(ctx: any) { this.editContext = ctx },
    clearEditContext() { this.editContext = null },

    async applyOrderEditApi(orderId: string, args: {
      action: "add" | "delete" | "entity" | "cancel",
      payload?: any,
      tableNumber?: number | string,
      posUser?: string,
      posPass?: string,
      cancelReasonId?: number | string,
      kiosk?: boolean, // optional: route switch
    }) {
      const url = import.meta.env.VITE_API_BASE_URL
      const qp = new URLSearchParams()
      if (args.tableNumber != null) qp.set('tableNumber', String(args.tableNumber))
      if (args.cancelReasonId != null) qp.set('cancelReasonId', String(args.cancelReasonId))
      if (args.posUser) qp.set('posUser', args.posUser)
      if (args.posPass) qp.set('posPass', args.posPass)

      const route = args.kiosk ? 'order-edits-kiosk' : 'order-edits'
      const body = { action: args.action, ...(args.payload || {}) }
      return await axios.post(`${url}/${route}/${orderId}/apply?${qp.toString()}`, body)
    },

    // Build API-ready lines from cartItems (robust id pickers)
    buildMenuPayloadFromCart(): Array<{ menuItem: string; quantity: number; options: Array<{ option: string; quantity: number }> }> {
      const idOf = (x: any) => x?.menuItem?._id || x?.menuItem?.id || x?.menuItem || x?._id || x?.id || x
      const optId = (o: any) => o?.option?._id || o?.option?.id || o?.optionId || o?._id || o?.id || o?.option
      const lines: any[] = []
      for (const it of this.cartItems || []) {
        const options: Array<{ option: string; quantity: number }> = []
        // tolerate both flat `selectedOptions` and `options`
        const groups = Array.isArray(it.selectedOptions) ? it.selectedOptions : (Array.isArray(it.options) ? it.options : [])
        for (const g of groups || []) {
          const sels = Array.isArray(g.selected) ? g.selected : (Array.isArray(g.selections) ? g.selections : [])
          for (const s of sels || []) {
            const oid = optId(s)
            const q = Number(s?.quantity ?? 1) || 1
            if (oid) options.push({ option: String(oid), quantity: q })
          }
        }
        const mid = idOf(it)
        const qty = Number(it?.quantity ?? 1) || 1
        if (mid && qty > 0) lines.push({ menuItem: String(mid), quantity: qty, options })
      }
      return lines
    },

    // Build API-ready offers payload from store.offerItems
    buildOffersPayloadFromStore(): Array<{ offerId: string; menuItems: Array<{ menuItem: string; quantity: number; options: Array<{ option: string; quantity: number }> }> }> {
      const idOf = (x: any) => x?._id || x?.id || x
      const optId = (o: any) => o?.option?._id || o?.option?.id || o?.optionId || o?._id || o?.id || o?.option
      const out: any[] = []
      for (const block of this.offerItems || []) {
        const offerId = String(block?.offerId || block?._id || block?.id || '')
        if (!offerId) continue
        const entries: any[] = []
        for (const mi of block?.menuItems || []) {
          const mid = String(idOf(mi?.menuItem || mi))
          const qty = Number(mi?.quantity ?? 1) || 1
          const options: any[] = []
          const groups = Array.isArray(mi.selectedOptions) ? mi.selectedOptions : (Array.isArray(mi.options) ? mi.options : [])
          for (const g of groups || []) {
            const sels = Array.isArray(g.selected) ? g.selected : (Array.isArray(g.selections) ? g.selections : [])
            for (const s of sels || []) {
              const oid = optId(s)
              const q = Number(s?.quantity ?? 1) || 1
              if (oid) options.push({ option: String(oid), quantity: q })
            }
          }
          if (mid && qty > 0) entries.push({ menuItem: mid, quantity: qty, options })
        }
        out.push({ offerId, menuItems: entries })
      }
      return out
    },

    // Canonical key for diff on a single line
    _lineKey(l: { menuItem: string; quantity: number; options?: Array<{ option: string; quantity?: number }> }) {
      const opt = (l.options || []).map(o => `${String(o.option)}:${Number(o.quantity ?? 1) || 1}`).sort().join('|')
      return `${l.menuItem}__${opt || 'noopts'}`
    },

    // Multi-set diff for menu lines (by lineKey)
    _diffMenu(oldArr: any[], newArr: any[]) {
      const k = (l: any) => this._lineKey(l)
      const cnt = (arr: any[]) => {
        const m = new Map<string, { sample: any; q: number }>()
        for (const l of arr || []) {
          const key = k(l)
          const rec = m.get(key) || { sample: l, q: 0 }
          rec.q += Number(l?.quantity ?? 1) || 1
          m.set(key, rec)
        }
        return m
      }
      const A = cnt(oldArr), B = cnt(newArr)
      const toDelete: any[] = [], toAdd: any[] = []

      // keys in old → if decreased, delete the diff
      for (const [key, rec] of A.entries()) {
        const newQ = B.get(key)?.q || 0
        if (rec.q > newQ) toDelete.push({ ...rec.sample, quantity: rec.q - newQ })
      }
      // keys in new → if increased/new, add the diff
      for (const [key, rec] of B.entries()) {
        const oldQ = A.get(key)?.q || 0
        if (rec.q > oldQ) toAdd.push({ ...rec.sample, quantity: rec.q - oldQ })
      }
      return { toDelete, toAdd }
    },

    /**
     * Orchestrate “edit by replace”:
     * - delete changed/removed menu lines
     * - delete selected offers (whole bundle) — then
     * - add new/changed menu lines
     * - add current offers (full blocks with items+options)
     */
    async applyEditByReplace({ posUser, posPass, tableNumber, cancelReasonId, kiosk = false }: {
      posUser?: string, posPass?: string, tableNumber?: number | string, cancelReasonId?: number | string, kiosk?: boolean
    }) {
      if (!this.editContext) throw new Error('No edit context set')
      const orderId = this.editContext.orderId
      const tbl = tableNumber ?? this.editContext.tableNumber ?? this.editOrder?.tableNumber

      const currentMenu = this.buildMenuPayloadFromCart()
      const currentOffers = this.buildOffersPayloadFromStore()

      const { toDelete, toAdd } = this._diffMenu(this.editContext.originalMenuItems || [], currentMenu)

      if (toDelete.length) {
        await this.applyOrderEditApi(orderId, {
          action: 'delete',
          payload: { menuItems: toDelete },
          tableNumber: tbl, posUser, posPass, cancelReasonId, kiosk,
        })
      }

      if ((this.editContext.originalOffersToDelete || []).length) {
        await this.applyOrderEditApi(orderId, {
          action: 'delete',
          payload: { offerMenuItems: this.editContext.originalOffersToDelete.map(o => ({ offerId: o.offerId, quantity: Number(o.quantity || 1) })) },
          tableNumber: tbl, posUser, posPass, cancelReasonId, kiosk,
        })
      }

      if (toAdd.length) {
        await this.applyOrderEditApi(orderId, {
          action: 'add',
          payload: { menuItems: toAdd },
          tableNumber: tbl, posUser, posPass, kiosk,
        })
      }

      // 6) ADD — offers (full blocks with items/options)
      if (currentOffers.length) {
        await this.applyOrderEditApi(orderId, {
          action: 'add',
          payload: { offerMenuItems: currentOffers },
          tableNumber: tbl, posUser, posPass, kiosk,
        })
      }

      // done — clear context
      this.clearEditContext()
      this.resetEditOrder()
      return true
    },

  },
})
