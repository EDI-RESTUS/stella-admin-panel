<template>
  <VaDropdown :offset="[13, 0]" class="notification-dropdown" stick-to-edges :close-on-content-click="false">
    <template #anchor>
      <VaButton preset="secondary" color="textPrimary">
        <VaBadge v-if="store.unreadCount > 0" overlap :text="store.unreadCount > 9 ? '9+' : String(store.unreadCount)" color="danger">
          <VaIconNotification class="notification-dropdown__icon" />
        </VaBadge>
        <VaIconNotification v-else class="notification-dropdown__icon" />
      </VaButton>
    </template>

    <VaDropdownContent class="h-full sm:max-w-[480px] sm:h-auto">
      <section class="p-3">
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold text-sm">Notifications</span>
          <VaButton v-if="store.unreadCount > 0" preset="plain" size="small" @click="store.markAllRead()">
            Mark all as read
          </VaButton>
        </div>

        <div v-if="store.unread.length === 0" class="text-center text-sm text-gray-400 py-4">
          No unread notifications
        </div>

        <VaList v-else class="space-y-2 sm:max-h-[500px] overflow-auto">
          <div
            v-for="item in store.unread"
            :key="item._id"
            class="notification-item rounded-lg overflow-hidden"
          >
            <!-- Collapsed header — always visible, click to expand -->
            <div
              class="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer select-none"
              @click="toggleExpand(item._id)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <VaIcon name="warning" color="warning" size="16px" class="flex-shrink-0" />
                <div class="min-w-0">
                  <div class="text-xs font-semibold text-warning leading-tight">Winmax Send Failed</div>
                  <div class="text-xs text-gray-600 truncate">
                    {{ item.orderNo }} · {{ item.orderType }}
                    <span v-if="item.failedItems?.length" class="text-red-600 font-medium">
                      · {{ item.failedItems.map(f => f.name).join(', ') }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                <span class="text-xs text-gray-400">{{ relativeTime(item.createdAt) }}</span>
                <VaIcon
                  :name="expandedIds.has(item._id) ? 'expand_less' : 'expand_more'"
                  size="16px"
                  class="text-gray-400"
                />
                <VaButton preset="plain" size="small" color="secondary" title="Dismiss" @click.stop="store.markRead(item._id)">
                  <VaIcon name="close" size="14px" />
                </VaButton>
              </div>
            </div>

            <!-- Expanded detail panel -->
            <div v-if="expandedIds.has(item._id)" class="border-t border-orange-200 px-3 pb-3 pt-2 space-y-2">

              <!-- Order grid -->
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div v-if="item.orderNo" class="flex items-center gap-1 text-gray-700">
                  <VaIcon name="receipt" size="12px" class="text-gray-400 flex-shrink-0" />
                  <span class="font-medium">Order:</span>&nbsp;{{ item.orderNo }}
                </div>
                <div v-if="item.orderType" class="flex items-center gap-1 text-gray-700">
                  <VaIcon name="category" size="12px" class="text-gray-400 flex-shrink-0" />
                  <span class="font-medium">Type:</span>&nbsp;{{ item.orderType }}
                </div>
                <div v-if="item.total" class="flex items-center gap-1 text-gray-700">
                  <VaIcon name="euro" size="12px" class="text-gray-400 flex-shrink-0" />
                  <span class="font-medium">Total:</span>&nbsp;€{{ item.total.toFixed(2) }}
                </div>
                <div v-if="item.customerName" class="flex items-center gap-1 text-gray-700">
                  <VaIcon name="person" size="12px" class="text-gray-400 flex-shrink-0" />
                  <span class="font-medium">Customer:</span>&nbsp;{{ item.customerName }}
                </div>
                <div v-if="item.tableNumber != null" class="flex items-center gap-1 text-gray-700">
                  <VaIcon name="table_restaurant" size="12px" class="text-gray-400 flex-shrink-0" />
                  <span class="font-medium">Table:</span>&nbsp;{{ item.tableNumber }}
                </div>
                <div v-if="item.deliveryZoneName" class="flex items-center gap-1 text-gray-700">
                  <VaIcon name="local_shipping" size="12px" class="text-gray-400 flex-shrink-0" />
                  <span class="font-medium">Zone:</span>&nbsp;{{ item.deliveryZoneName }}
                </div>
                <div v-if="item.phoneNo" class="flex items-center gap-1 text-gray-700 col-span-2">
                  <VaIcon name="phone" size="12px" class="text-gray-400 flex-shrink-0" />
                  <span class="font-medium">Phone:</span>&nbsp;{{ item.phoneNo }}
                </div>
              </div>

              <!-- All order items, failed ones highlighted -->
              <div v-if="item.allItems?.length" class="rounded border border-orange-200 overflow-hidden">
                <div class="text-xs font-semibold text-gray-600 bg-orange-50 px-2 py-1 border-b border-orange-200">
                  Order items
                </div>
                <div
                  v-for="oi in item.allItems"
                  :key="oi.name + oi.qty"
                  class="flex items-center justify-between px-2 py-1 text-xs border-b border-orange-100 last:border-b-0"
                  :class="isFailed(item, oi) ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700'"
                >
                  <span>{{ oi.name }}</span>
                  <span class="flex items-center gap-1">
                    x{{ oi.qty }}
                    <VaIcon v-if="isFailed(item, oi)" name="error_outline" size="12px" color="danger" title="Missing article code" />
                  </span>
                </div>
              </div>

              <!-- Dismiss button -->
              <div class="flex justify-end pt-1">
                <VaButton preset="secondary" size="small" @click="store.markRead(item._id)">
                  Dismiss
                </VaButton>
              </div>
            </div>
          </div>
        </VaList>
      </section>
    </VaDropdownContent>
  </VaDropdown>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import VaIconNotification from '../../../icons/VaIconNotification.vue'
import { useNotificationsStore, type WinmaxNotification, type OrderItem } from '../../../../stores/notifications'

const store = useNotificationsStore()
const expandedIds = ref<Set<string>>(new Set())

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
}

function isFailed(notif: WinmaxNotification, item: OrderItem): boolean {
  return notif.failedItems?.some((f) => f.name === item.name) ?? false
}

onMounted(() => store.startPolling(30_000))
onUnmounted(() => store.stopPolling())

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
</script>

<style lang="scss" scoped>
.notification-dropdown {
  cursor: pointer;

  .notification-dropdown__icon {
    position: relative;
    display: flex;
    align-items: center;
  }

  .va-dropdown__anchor {
    display: inline-block;
  }

  .notification-item {
    background: #fff8f0;
    border: 1px solid #ffe0b2;
    transition: box-shadow 0.15s ease;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
  }
}
</style>
