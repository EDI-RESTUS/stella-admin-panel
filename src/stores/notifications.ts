import { defineStore } from 'pinia'
import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

export interface OrderItem {
  name: string
  qty: number
}

export interface WinmaxNotification {
  _id: string
  outletId: string
  type: 'winmax_send_failed'
  orderId: string
  orderNo: string
  orderType: string
  total: number
  tableNumber: number | null
  deliveryZoneName: string | null
  phoneNo: string | null
  customerName: string | null
  allItems: OrderItem[]
  failedItems: OrderItem[]
  message: string
  read: boolean
  createdAt: string
}

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [] as WinmaxNotification[],
    _pollInterval: null as ReturnType<typeof setInterval> | null,
  }),

  getters: {
    unreadCount: (state): number => state.items.filter((n: WinmaxNotification) => !n.read).length,
    unread: (state): WinmaxNotification[] => state.items.filter((n: WinmaxNotification) => !n.read),
  },

  actions: {
    async fetchNotifications() {
      try {
        const { data } = await axios.get(`${apiBaseUrl}/notifications`)
        this.items = data.data ?? []
      } catch (err) {
        console.error('[notifications] fetch error:', err)
      }
    },

    async markRead(id: string) {
      try {
        await axios.patch(`${apiBaseUrl}/notifications/${id}/read`)
        const item = this.items.find((n) => n._id === id)
        if (item) item.read = true
      } catch (err) {
        console.error('[notifications] markRead error:', err)
      }
    },

    async markAllRead() {
      const unread = this.unread
      await Promise.all(unread.map((n) => this.markRead(n._id)))
    },

    async retry(id: string): Promise<{ manualRetryCount: number; escalated: boolean; alreadySent?: boolean } | null> {
      try {
        const { data } = await axios.post(`${apiBaseUrl}/notifications/${id}/retry`)
        const item = this.items.find((n) => n._id === id)
        if (item) item.read = true
        return data?.data ?? null
      } catch (err: any) {
        console.error('[notifications] retry error:', err)
        throw err
      }
    },

    startPolling(intervalMs = 30_000) {
      this.fetchNotifications()
      if (this._pollInterval) clearInterval(this._pollInterval)
      this._pollInterval = setInterval(() => this.fetchNotifications(), intervalMs)
    },

    stopPolling() {
      if (this._pollInterval) {
        clearInterval(this._pollInterval)
        this._pollInterval = null
      }
    },
  },
})
