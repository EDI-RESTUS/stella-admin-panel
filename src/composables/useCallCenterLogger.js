import axios from 'axios'
import { useUsersStore } from '@/stores/users'
import { useServiceStore } from '@/stores/services'

const PENDING_KEY = 'cc_pending_refresh_logs'

export function useCallCenterLogger() {
  function log(action, details = {}) {
    try {
      const userStore = useUsersStore()
      const serviceStore = useServiceStore()

      const payload = {
        userId: userStore.userDetails?._id || null,
        userName: userStore.userDetails?.name || userStore.userDetails?.email || 'unknown',
        outletId: serviceStore.selectedRest || null,
        action,
        details,
        timestamp: new Date().toISOString(),
      }

      // Fire-and-forget — never block the UI
      axios
        .post(`${import.meta.env.VITE_API_BASE_URL}/cc/logs`, payload)
        .catch(() => {
          // Silently ignore logging errors
        })
    } catch {
      // Never let logging crash the app
    }
  }

  // Called synchronously in beforeunload — writes to localStorage so we can
  // send it via axios on the next page load (sendBeacon is unreliable cross-origin)
  function queueRefreshLog(details = {}) {
    try {
      const userStore = useUsersStore()
      const serviceStore = useServiceStore()
      const entry = {
        userId: userStore.userDetails?._id || null,
        userName: userStore.userDetails?.name || userStore.userDetails?.email || 'unknown',
        outletId: serviceStore.selectedRest || null,
        action: 'PAGE_REFRESHED',
        details,
        timestamp: new Date().toISOString(),
      }
      const existing = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
      existing.push(entry)
      localStorage.setItem(PENDING_KEY, JSON.stringify(existing))
    } catch {
      // Never block the UI
    }
  }

  // Call once on app startup to flush any refresh logs saved before the last unload
  function flushPendingRefreshLogs() {
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
      if (!pending.length) return
      localStorage.removeItem(PENDING_KEY)
      const url = import.meta.env.VITE_API_BASE_URL
      for (const entry of pending) {
        axios.post(`${url}/cc/logs`, entry).catch(() => {})
      }
    } catch {
      // Ignore
    }
  }

  return { log, queueRefreshLog, flushPendingRefreshLogs }
}
