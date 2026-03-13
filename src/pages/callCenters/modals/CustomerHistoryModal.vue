<template>
  <VaModal
    :model-value="true"
    size="large"
    close-button
    hide-default-actions
    :mobile-fullscreen="false"
    class="big-xl-xl-modal"
    @update:modelValue="$emit('close')"
  >
    <!-- HEADER -->
    <h3 class="w-full bg-gray-900 text-white p-6">
      <div class="flex flex-col md:flex-row md:items-center gap-16 w-full">
        <!-- LEFT: Title + Customer -->
        <div class="flex flex-col flex-shrink-0">
          <span
            class="text-sm uppercase tracking-wider text-gray-400 pb-1 border-b-2 border-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
          >
            Order History
          </span>

          <span class="text-4xl font-extrabold text-white mt-2 tracking-tight drop-shadow-lg">
            {{ customer?.Name || 'Unknown' }}
          </span>

          <span v-if="customer?.Phone" class="text-2xl text-gray-300 font-bold mt-1">
            {{ customer.Phone }}
          </span>
        </div>

        <!-- CENTER: buttons & stats -->
        <div class="flex-1 flex items-center justify-center">
          <div class="flex items-center gap-16 w-full">
            <!-- Time Period Buttons (2x2) -->
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="period in ['1 Month', '6 Months', '12 Months', 'All Time']"
                :key="period"
                :class="[
                  'px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300',
                  selectedPeriod === period
                    ? 'bg-gray-300 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white',
                ]"
                @click="selectedPeriod = period"
              >
                {{ period }}
              </button>
            </div>

            <!-- Stats grid -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-6 text-gray-300 w-full">
              <div
                class="bg-gray-800 bg-opacity-30 rounded-xl p-3 flex flex-col items-start hover:shadow-neon transition"
              >
                <span class="text-sm font-bold mb-1 text-blue-400">Last Ordered:</span>
                <span class="text-lg font-semibold">
                  {{ lastOrdered.daysAgo }}
                  <span class="text-xs text-gray-400">{{ lastOrdered.fullDate }}</span>
                </span>
              </div>
              <div
                class="bg-gray-800 bg-opacity-30 rounded-xl p-3 flex flex-col items-start hover:shadow-neon transition"
              >
                <span class="text-sm font-bold mb-1 text-purple-400">Total:</span>
                <span class="text-lg font-semibold">
                  € {{ totalStats.total.toFixed(2) }}
                  <span class="text-xs text-gray-400">({{ totalStats.count }} Orders)</span>
                </span>
              </div>

              <div
                class="bg-gray-800 bg-opacity-30 rounded-xl p-3 flex flex-col items-start hover:shadow-neon transition"
              >
                <span class="text-sm font-bold mb-1 text-pink-400">Average Order:</span>
                <span class="text-lg font-semibold">
                  € {{ averageOrder.average.toFixed(2) }}
                  <span class="text-xs text-gray-400">({{ averageOrder.avgItems.toFixed(0) }} Items)</span>
                </span>
              </div>
              <div
                class="bg-gray-800 bg-opacity-30 rounded-xl p-3 flex flex-col items-start hover:shadow-neon transition"
              >
                <span class="text-sm font-bold mb-1 text-green-400">Type:</span>
                <span class="text-lg font-semibold">
                  Takeaway: {{ orderTypes.takeaway }}
                  <span class="text-xs text-gray-400">({{ orderTypes.takeawayPercent }}%)</span>
                  / Delivery: {{ orderTypes.delivery }}
                  <span class="text-xs text-gray-400">({{ orderTypes.deliveryPercent }}%)</span>
                </span>
              </div>

              <div
                class="bg-gray-800 bg-opacity-30 rounded-xl p-3 flex flex-col items-start hover:shadow-neon transition"
              >
                <span class="text-sm font-bold mb-1 text-yellow-400">Promo Codes:</span>
                <span class="text-lg font-semibold">
                  {{ promoStats.count }}
                  <span class="text-xs text-gray-400">({{ promoStats.percent }}%)</span>
                </span>
              </div>
              <div
                class="bg-gray-800 bg-opacity-30 rounded-xl p-3 flex flex-col items-start hover:shadow-neon transition"
              >
                <span class="text-sm font-bold mb-1 text-red-500">Complaints:</span>
                <span class="text-lg font-semibold">
                  {{ complaintStats.count }}
                  <span class="text-xs text-gray-400">({{ complaintStats.percent }}%)</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </h3>

    <div v-if="isLoading" class="flex justify-center items-center py-8 min-h-[200px] text-gray-400">
      <Loader2 class="w-10 h-10 animate-spin text-blue-500" />
    </div>

    <!-- No Orders -->
    <div v-else-if="orders && orders.length === 0" class="text-center text-gray-500 py-4">
      No previous orders found for this customer.
    </div>

    <!-- Orders List -->
    <div v-else class="p-3 bg-white">
      <div
        v-for="(order, index) in ordersToShow"
        :key="order._id"
        class="order-card border rounded-lg mb-3 shadow-sm relative"
        :style="{ paddingLeft: order.orderFor === 'future' ? '65px' : '0px' }"
      >
        <!-- GREEN RIBBON FOR FUTURE ORDER -->
        <div v-if="order.orderFor === 'future'" class="future-ribbon">
          <span>Future</span>
          <span>Order</span>
        </div>
        <div
          class="flex justify-between items-center p-4 cursor-pointer transition group hover:bg-gray-100"
          :class="{
            'bg-gray-100': expandedIndex === index,
          }"
          @click="toggleOrder(index)"
        >
          <!-- LEFT DETAILS -->
          <div class="flex items-center gap-8 font-semibold">
            <div>
              <span class="block"
                >Order Number: <span class="font-bold">{{ order.tableNumber }}</span>
              </span>
              <span class="text-xs text-gray-500"
                >{{ formatDateTime(order.createdAt) }} •
                <template v-if="order.orderFor === 'future'">
                  <span
                    class="text-blue-600 hover:text-blue-800 cursor-pointer underline decoration-dotted font-medium transition-colors"
                    title="Click to reschedule"
                    @click.stop="openReschedule(order)"
                  >
                    {{ formatDateTime(order.orderDateTime) }}
                  </span>
                </template>
                <template v-else>
                  {{ getPromisedTime(order.createdAt, order.orderType) }}
                </template>
              </span>
            </div>
            <div class="border-l border-gray-300 h-6"></div>

            <div>
              <span class="block"
                >Total: <span class="font-bold">€ {{ order.total.toFixed(2) }}</span></span
              >
              <span class="text-xs text-gray-500">{{ order.paymentMode }} • {{ order.menuItems.length }} items</span>
            </div>
            <div class="border-l border-gray-300 h-6"></div>

            <div>
              <span class="block"
                >Outlet: <span class="font-bold">{{ getDeliveryZoneName(order.deliveryZoneId) }}</span></span
              >
              <span class="text-xs text-gray-500">
                {{ order.orderType }}
                <template v-if="order.orderType === 'Delivery' && order.address"> • {{ order.address }} </template>
              </span>
            </div>
            <div class="border-l border-gray-300 h-6"></div>

            <div>
              <span class="block"
                >Origin: <span class="font-bold">{{ getOrderSource(order.orderSource) }}</span></span
              >
              <span class="text-xs text-gray-500">{{ getTheEmployeeName(order.outletEmployee) }}</span>
            </div>
          </div>

          <!-- Complaints list -->
          <div v-if="order.complaint" class="ml-10">
            <div
              class="flex flex-col items-center justify-center text-sm text-center cursor-pointer rounded-lg transition-colors duration-200 group hover:bg-gray-200 p-2 w-24"
              @click.stop="editComplaint(order._id, order.complaint)"
            >
              <span class="flex items-center justify-center">
                <TriangleAlert class="w-9 h-9 text-red-500" />
              </span>
              <span
                class="font-semibold truncate"
                style="
                  max-width: 150px;
                  display: inline-block;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                "
              >
                Complaint
              </span>
            </div>
          </div>

          <!-- Note display -->
          <div v-if="order.note" class="ml-2">
            <div
              class="flex flex-col items-center justify-center text-sm text-center cursor-pointer rounded-lg transition-colors duration-200 group hover:bg-gray-200 p-2 w-24 gap-1"
              @click.stop="openNote(order._id, order.note)"
            >
              <span class="flex items-center justify-center">
                <NotepadText class="w-8 h-8 text-black" />
              </span>
              <span
                class="font-semibold truncate"
                style="
                  max-width: 150px;
                  display: inline-block;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                "
              >
                Note
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition mr-5">
            <span
              v-if="!order.complaint || order.complaint === ''"
              class="flex items-center gap-1 rounded-full text-black px-2 py-2 font-semibold text-xs cursor-pointer bg-gray-200 hover:bg-gray-300 transition-colors"
              @click.stop="openComplaint(order._id)"
            >
              <TriangleAlert class="w-4 h-4 text-red-600" /> Add Complaint
            </span>

            <span
              v-if="!order.note || order.note === ''"
              class="flex items-center gap-1 rounded-full text-black px-2 py-2 font-semibold text-xs cursor-pointer bg-gray-200 hover:bg-gray-300 transition-colors"
              @click.stop="openNote(order._id, order.note)"
            >
              <NotepadText class="w-4 h-4" /> Add Note
            </span>

            <span
              size="small"
              class="flex items-center gap-1 rounded-full text-black px-2 py-2 font-semibold text-xs cursor-pointer bg-gray-200 hover:bg-gray-300 transition-colors"
              @click.stop="openConfirm('repeat', order._id)"
            >
              <CopyPlus class="w-4 h-4" /> Repeat Order
            </span>

            <span
              v-if="
                !isCancelled(order, index) &&
                ((index === 0 && ['kds', 'preparing'].includes(String(orderStatuses || '').toLowerCase())) ||
                  order.orderFor === 'future')
              "
              size="small"
              class="flex items-center gap-1 rounded-full text-white px-2 py-2 font-semibold text-xs cursor-pointer bg-green-600 hover:bg-green-700 transition-colors"
              @click.stop="openConfirm('add', order._id)"
            >
              <Plus class="w-4 h-4" /> Add Items
            </span>

            <!-- Cancel Order: allow for ANY Completed row, or the latest KDS/preparing/onrack
            <span
              v-if="
                !isCancelled(order, index) &&
                ((index === 0 &&
                  ['kds', 'preparing', 'onrack', 'in progress'].includes(String(orderStatuses || '').toLowerCase())) ||
                  order.status === 'Completed' ||
                  order.status === 'In Progress')
              "
              size="small"
              class="flex items-center gap-1 rounded-full text-white px-2 py-2 font-semibold text-xs cursor-pointer bg-red-600 hover:bg-red-700 transition-colors"
              @click.stop="openConfirm('cancel', order._id)"
            >
              <X class="w-4 h-4" /> Cancel Order
            </span> -->

            <!-- Switch Order Type -->
            <span
              v-if="
                !isCancelled(order, index) &&
                ((index === 0 &&
                  ['kds', 'preparing', 'onrack', 'in progress'].includes(String(orderStatuses || '').toLowerCase())) ||
                  order.status === 'In Progress')
              "
              size="small"
              class="flex items-center gap-1 rounded-full text-white px-3 py-2 font-semibold text-xs cursor-pointer bg-blue-600 hover:bg-blue-700 transition-colors"
              @click.stop="openConfirm('switchType', order._id)"
            >
              <ArrowRightLeft class="w-4 h-4" />
              {{ order.orderType === 'Delivery' ? 'Switch to TA' : 'Switch to Del' }}
            </span>
          </div>

          <!-- Cancelled always wins (from liveStatus or order.status) -->
          <!-- SINGLE status chip: Cancelled > Coordinator > Stella -->
          <span
            v-if="isCancelled(order, index)"
            class="px-3 py-2 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1 transition-colors bg-red-600 text-white"
          >
            <XCircle class="w-3.5 h-3.5" />
            Cancelled
          </span>

          <span
            v-else-if="
              index === 0 && ['kds', 'preparing', 'onrack'].includes(String(orderStatuses || '').toLowerCase())
            "
            class="px-3 py-2 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1 transition-colors bg-yellow-500 text-white capitalize"
          >
            <Loader2 class="w-3.5 h-3.5 animate-spin-slow" />
            {{ orderStatuses === 'onrack' ? 'On Rack' : orderStatuses }}
          </span>

          <span
            v-else-if="!(order.orderFor === 'future' && order.status === 'Completed')"
            class="px-3 py-2 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1 transition-colors"
            :class="{
              'bg-green-600 text-white': order.status === 'Completed',
              'bg-yellow-500 text-white': order.status === 'In Progress',
              'bg-red-600 text-white': order.status === 'Cancelled',
            }"
          >
            <template v-if="order.status === 'Completed'">
              <CheckCircle class="w-3.5 h-3.5" />
            </template>
            <template v-else-if="order.status === 'In Progress'">
              <Loader2 class="w-3.5 h-3.5 animate-spin-slow" />
            </template>
            <template v-else-if="order.status === 'Cancelled'">
              <XCircle class="w-3.5 h-3.5" />
            </template>
            {{ order.status }}
          </span>
        </div>

        <!-- EXPANDABLE ARTICLE LIST -->
        <div v-if="expandedIndex === index" class="bg-white px-6 pb-4 border-t border-gray-200">
          <div
            v-for="(offer, idx) in order.offerDetails || []"
            :key="idx"
            class="flex flex-col justify-between py-2 border-b last:border-none relative"
            :class="{
              'bg-gray-50 text-black': isOfferSelected(order._id, idx),
              'hover:bg-gray-50 cursor-pointer':
                (index === 0 &&
                  !isCancelled(order, index) &&
                  (orderStatuses === 'kds' ||
                    orderStatuses === 'preparing' ||
                    orderStatuses === 'onrack' ||
                    orderStatuses === 'In Progress')) ||
                order.orderFor === 'future',
              'opacity-60 cursor-not-allowed':
                (index !== 0 ||
                  isCancelled(order, index) ||
                  !(
                    orderStatuses === 'kds' ||
                    orderStatuses === 'preparing' ||
                    orderStatuses === 'onrack' ||
                    orderStatuses === 'In Progress'
                  )) &&
                order.orderFor !== 'future',
            }"
            @click="
              ((index === 0 &&
                !isCancelled(order, index) &&
                (orderStatuses === 'kds' ||
                  orderStatuses === 'preparing' ||
                  orderStatuses === 'onrack' ||
                  orderStatuses === 'In Progress')) ||
                order.orderFor === 'future') &&
                toggleOfferSelection(order._id, idx)
            "
          >
            <div
              v-if="
                (index !== 0 ||
                  isCancelled(order, index) ||
                  !(
                    orderStatuses === 'kds' ||
                    orderStatuses === 'preparing' ||
                    orderStatuses === 'onrack' ||
                    orderStatuses === 'In Progress'
                  )) &&
                order.orderFor !== 'future'
              "
              class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <Ban class="w-4 h-4" />
            </div>

            <div v-if="isOfferSelected(order._id, idx)" class="absolute left-2 top-1/2 -translate-y-1/2">
              <VaCheckbox
                :model-value="true"
                color="primary"
                :readonly="true"
                class="pointer-events-none"
                @click.stop
              />
            </div>

            <span class="pl-8">{{ offer.offerName }}</span>

            <div v-for="item in offer.offerItems" :key="item._id" class="flex flex-row justify-between">
              <div
                class="flex flex-wrap items-center gap-2 pt-1 pl-10"
                :class="isOfferSelected(order._id, idx) ? 'pl-10' : 'pl-12'"
              >
                <p class="font-semibold text-xs">
                  {{ item.quantity }} x {{ item.name }}
                  <span
                    v-if="item.extra"
                    class="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-normal"
                  >
                    {{ item.extra }}
                  </span>
                </p>

                <div class="flex flex-wrap gap-1 text-xs">
  <span
  v-for="addon in item.options || []"
  :key="addon._id || addon.optionId || addon.name"
  class="px-2 py-0.5 rounded-full"
  :class="{
    'bg-green-100 text-green-700': (addon.type || '').toLowerCase() === 'extra',
    'bg-blue-100 text-blue-700': (addon.type || '').toLowerCase() === 'article',
    'bg-red-100 text-red-700': (addon.type || '').toLowerCase() === 'hold',
    'bg-amber-100 text-amber-700': (addon.type || '').toLowerCase() === 'modifier',
  }"
>
  {{ addon.name }}
</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end pr-0">
              <template v-if="!offer.overrideUnitPrice">
                <span class="font-bold">€ {{ offer.totalPrice.toFixed(2) }}</span>
              </template>
              <template v-else>
                <span class="font-bold line-through">€ {{ offer.totalPrice.toFixed(2) }}</span>
                <span class="font-bold text-red-700">€ {{ offer.overrideUnitPrice.toFixed(2) }}</span>
              </template>
            </div>

            <div v-if="offer.overrideUnitPrice">{{ offer.overrideUnitPrice }}</div>
          </div>

          <div
            v-for="(item, idx) in order.menuItems || []"
            :key="idx"
            class="flex justify-between items-start py-2 border-b last:border-none relative"
            :class="{
              'bg-gray-50 text-black': isItemSelected(order._id, idx),
              'hover:bg-gray-50 cursor-pointer':
                (index === 0 &&
                  (orderStatuses === 'kds' || orderStatuses === 'preparing' || orderStatuses === 'onrack')) ||
                order.orderFor === 'future',
              'opacity-60 cursor-not-allowed':
                (index !== 0 ||
                  !(orderStatuses === 'kds' || orderStatuses === 'preparing' || orderStatuses === 'onrack')) &&
                order.orderFor !== 'future',
            }"
            @click="
              ((index === 0 &&
                (orderStatuses === 'kds' || orderStatuses === 'preparing' || orderStatuses === 'onrack')) ||
                order.orderFor === 'future') &&
                toggleItemSelect(order._id, idx)
            "
          >
            <div
              v-if="
                !orderStatuses &&
                !(orderStatuses === 'kds' && orderStatuses === 'preparing' && orderStatuses === 'onrack') &&
                order.orderFor !== 'future'
              "
              class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <Ban class="w-4 h-4" />
            </div>
            <div v-if="isItemSelected(order._id, idx)" class="absolute left-2 top-1/2 -translate-y-1/2">
              <VaCheckbox
                :model-value="true"
                color="primary"
                :readonly="true"
                class="pointer-events-none"
                @click.stop
              />
            </div>

            <div
              class="flex flex-wrap items-center gap-2 pl-8"
              :class="isItemSelected(order._id, idx) ? 'pl-8' : 'pl-0'"
            >
              <p class="font-semibold text-xs">
                {{ item.quantity }} x {{ item.name || item.menuItem }}
                <span
                  v-if="item.extra"
                  class="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-normal"
                >
                  {{ item.extra }}</span
                >
              </p>

              <div class="flex flex-wrap gap-1 text-xs">
<span
  v-for="addon in item.articlesOptionsGroup
    .flatMap((a) => a.articlesOptions)
    .filter((a) => a.selected)"
  :key="addon._id || addon.optionId || addon.name"
  class="px-2 py-0.5 rounded-full"
  :class="{
    'bg-green-100 text-green-700': (addon.type || '').toLowerCase() === 'extra',
    'bg-blue-100 text-blue-700': (addon.type || '').toLowerCase() === 'article',
    'bg-red-100 text-red-700': (addon.type || '').toLowerCase() === 'hold',
    'bg-amber-100 text-amber-700': (addon.type || '').toLowerCase() === 'modifier',
  }"
>
  {{ addon.name }}
</span>
              </div>
            </div>
            <span v-if="!item.overrideUnitPrice" class="font-bold">€ {{ getTotalPrice(item) }}</span>
            <div v-if="item.overrideUnitPrice" class="space-x-2">
              <span class="font-bold line-through">€ {{ getTotalPrice(item) }}</span>
              <span class="font-bold text-red-700">€ {{ item.overrideUnitPrice }}</span>
            </div>
          </div>

          <!-- Totals -->
          <div class="mt-2 space-y-1 text-xs">
            <div class="flex justify-end gap-16">
              <span class="font-semibold">SubTotal:</span>
              <span class="font-bold">€ {{ order.subtotal.toFixed(2) }}</span>
            </div>

            <div v-if="getPromoForOrder(order)" class="border-b pb-1">
              <div class="flex justify-end gap-16">
                <span class="font-semibold">{{ getPromoForOrder(order).label }}</span>
                <span class="font-bold">{{ getPromoForOrder(order).amount }}</span>
              </div>
            </div>

            <div v-if="order.orderType === 'Delivery' && order.deliveryFee > 0" class="border-b pb-1">
              <div class="flex justify-end gap-16">
                <span class="font-semibold">Delivery Fee:</span>
                <span class="font-bold">€ {{ order.deliveryFee.toFixed(2) }}</span>
              </div>
            </div>

            <div>
              <div class="flex justify-end gap-16">
                <span class="font-semibold">Total:</span>
                <span class="font-bold">€ {{ order.total.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              class="px-3 py-1 rounded-full bg-red-500 text-white font-semibold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="
                !hasSelectedForOrder(order._id) ||
                (!['Completed', 'Cancelled'].includes(order.status) && order.orderFor !== 'future')
              "
              @click="openConfirm('remove', order._id)"
            >
              Remove
            </button>

            <button
              class="px-3 py-1 rounded-full bg-yellow-400 text-xs text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="
                !hasSelectedForOrder(order._id) ||
                (!['Completed', 'Cancelled'].includes(order.status) && order.orderFor !== 'future')
              "
              @click="openConfirm('edit', order._id)"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
      <div v-if="orders.length > 7" class="text-center mt-5">
        <VaButton color="#2D5D2A" class="px-3 rounded-full" @click="showAll = !showAll">
          {{ showAll ? 'Show Less' : 'Load More' }}
        </VaButton>
      </div>
    </div>
  </VaModal>

  <!-- Confirmation Modal -->

  <VaModal
    v-model="isConfirmOpen"
    size="small"
    hide-default-actions
    close-button
    @update:modelValue="isConfirmOpen = $event"
  >
    <div class="text-sm text-gray-700 py-1 pb-5">
      Are you sure you want to
      <span class="font-bold capitalize">
        {{
          confirmAction === 'repeat'
            ? 'repeat this order'
            : confirmAction === 'add'
              ? 'add items to this order'
              : confirmAction === 'cancel'
                ? 'cancel this order'
                : confirmAction === 'edit'
                  ? 'edit the selected Items'
                  : confirmAction === 'remove'
                    ? 'remove the selected Items'
                    : confirmAction === 'switchType'
                      ? 'switch order type'
                      : ''
        }}</span
      >
      ?
    </div>

    <template #footer>
      <div class="flex justify-end gap-1 mt-3">
        <VaButton class="px-2 rounded-full" preset="secondary" size="small" @click="isConfirmOpen = false"
          >Cancel</VaButton
        >
        <VaButton
          class="px-2 rounded-full"
          :color="confirmAction === 'remove' ? 'danger' : 'warning'"
          size="small"
          @click="confirmYes"
        >
          Yes
        </VaButton>
      </div>
    </template>
  </VaModal>

  <HistoryAddNoteModal
    :is-open="showAddNoteModal"
    :order-id="selectedOrderId"
    :note="noteToEdit"
    @update:isOpen="showAddNoteModal = $event"
    @saved="handleNoteSaved"
    @updated="handleNoteUpdated"
    @removed="handleNoteRemoved"
  />
  <HistoryComplaintModal
    :is-open="showComplaintModal"
    :order-id="selectedOrderId"
    :complaint="complaintToEdit"
    @update:isOpen="
      (val) => {
        showComplaintModal = val
        if (!val) complaintToEdit = null
      }
    "
    @saved="handleComplaintSaved"
    @updated="handleComplaintUpdated"
    @removed="handleComplaintRemoved"
  />

  <CustomerModal
    v-if="showAddressModal"
    :selected-user="addressModalCustomer"
    :user-name="addressModalCustomer?.Name || ''"
    :user-number="addressModalCustomer?.Phone || ''"
    :outlet="outlet"
    :delivery-zone-id="orders.find((o) => o._id === pendingSwitchOrderId)?.deliveryZoneId"
    :is-selection-mode="true"
    @selectAddress="handleAddressSelection"
    @close="showAddressModal = false"
    @cancel="showAddressModal = false"
    @saved="fetchHistory()"
  />

  <!-- Reschedule Modal -->
  <VaModal v-model="showRescheduleModal" size="small" hide-default-actions>
    <div class="p-4">
      <h3 class="text-lg font-bold mb-4">Reschedule Future Order</h3>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">New Date & Time</label>
        <input
          v-model="rescheduleDateTime"
          type="datetime-local"
          class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <button class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded" @click="showRescheduleModal = false">
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          :disabled="!rescheduleDateTime"
          @click="saveReschedule"
        >
          Save
        </button>
      </div>
    </div>
  </VaModal>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import {
  CopyPlus,
  NotepadText,
  TriangleAlert,
  X,
  Plus,
  CheckCircle,
  Loader2,
  XCircle,
  ArrowRightLeft,
  Ban,
} from 'lucide-vue-next'
import axios from 'axios'
import { useUsersStore } from '@/stores/users.ts'
import { useMenuStore } from '@/stores/getMenu'
import { useOrderStore } from '@/stores/order-store.ts'
import HistoryAddNoteModal from './HistoryAddNoteModal.vue'
import HistoryComplaintModal from './HistoryComplaintModal.vue'
import CustomerModal from './CustomerModal.vue'
import { useToast } from 'vuestic-ui'
import { useServiceStore } from '@/stores/services.ts'

const { init } = useToast()

const props = defineProps({
  customer: { type: Object, required: true },
  outlet: { type: Object, required: true },
  selectedUser: { type: Object, required: true },
  deliveryZoneOptions: { type: Array, default: () => [] },
  takeawayPromiseTime: { type: Number, default: 0 },
  deliveryPromiseTime: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  selectedTab: { type: String, default: '' },
})

const emits = defineEmits(['close', 'repeat-order'])
const liveStatus = ref(null)
const showAddNoteModal = ref(false)
const showComplaintModal = ref(false)
const selectedOrderId = ref(null)
const noteToEdit = ref(null)
const complaintToEdit = ref(null)

const showAddressModal = ref(false)
const addressModalCustomer = ref(null)
const pendingSwitchOrderId = ref(null)

const showRescheduleModal = ref(false)
const pendingRescheduleOrderId = ref(null)
const rescheduleDateTime = ref('')

const orders = ref([])
const users = ref([])
const expandedIndex = ref(null)
const isLoading = ref(true)

const selectedItems = reactive({})
const selectedOfferItems = reactive({})
const selectedPeriod = ref('1 Month')

const isConfirmOpen = ref(false)
const confirmAction = ref(null)
const confirmOrderId = ref(null)

const url = import.meta.env.VITE_API_BASE_URL
const coordurl = import.meta.env.VITE_COORD_API_URL

const eur = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' })
const toNum = (v) => (v == null || v === '' ? 0 : Number(v))
const first = (...vals) => vals.find((v) => toNum(v) > 0) ?? 0
const titleize = (s = '') =>
  s
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

const TYPE_LABELS = {
  TAKE_X_PAY_Y: 'Take X Pay Y',
  PERCENTAGE_DISCOUNT: 'Percentage Discount',
  VALUE_DISCOUNT: 'Value Discount',
}

// -------------------- Logs --------------------
const OFFER_LOG = true
const offerLog = (...args) => {
  if (OFFER_LOG) console.log('[offer-edit]', ...args)
}

// -------------------- Complaint / Note handlers --------------------
const editComplaint = (orderId, text) => {
  showComplaintModal.value = false
  complaintToEdit.value = null
  setTimeout(() => {
    selectedOrderId.value = orderId
    complaintToEdit.value = { orderId, text }
    showComplaintModal.value = true
  }, 0)
}

const openComplaint = (orderId) => {
  selectedOrderId.value = orderId
  complaintToEdit.value = null
  showComplaintModal.value = true
}

const openNote = (orderId, note) => {
  selectedOrderId.value = orderId
  noteToEdit.value = note ? { orderId, text: note } : null
  showAddNoteModal.value = true
}

const handleComplaintSaved = async ({ orderId, text }) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  await axios.patch(`${url}/orders/${orderId}/complaint`, { complaint: text })
  init({ message: 'Complaint updated successfully', color: 'success' })
  fetchOrders()
}

const handleComplaintUpdated = handleComplaintSaved

const handleComplaintRemoved = async ({ orderId }) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  await axios.patch(`${url}/orders/${orderId}/complaint`, { complaint: '' })
  init({ message: 'Complaint removed successfully', color: 'success' })
  fetchOrders()
}

const handleNoteSaved = async ({ orderId, text }) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  await axios.patch(`${url}/orders/${orderId}/note`, { note: text })
  init({ message: 'Note added successfully', color: 'success' })
  fetchOrders()
}

const handleNoteUpdated = handleNoteSaved

const handleNoteRemoved = async ({ orderId }) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  await axios.patch(`${url}/orders/${orderId}/note`, { note: '' })
  init({ message: 'Note removed successfully', color: 'success' })
  fetchOrders()
}

// -------------------- Confirm modal --------------------
const openConfirm = (action, orderId) => {
  confirmAction.value = action
  confirmOrderId.value = orderId
  isConfirmOpen.value = true
}

const confirmYes = () => {
  if (!confirmAction.value || !confirmOrderId.value) return

  switch (confirmAction.value) {
    case 'remove':
      removeSelected(confirmOrderId.value)
      break
    case 'edit':
      editSelected(confirmOrderId.value)
      break
    case 'repeat':
      repeatOrder(confirmOrderId.value)
      break
    case 'add':
      addItemsToOrder(confirmOrderId.value)
      break
    case 'cancel':
      cancelOrder(confirmOrderId.value)
      break
    case 'switchType':
      switchOrderType(confirmOrderId.value)
      break
  }

  isConfirmOpen.value = false
}

// -------------------- Selection helpers --------------------
const toggleItemSelect = (orderId, idx) => {
  if (!selectedItems[orderId]) selectedItems[orderId] = []
  const pos = selectedItems[orderId].indexOf(idx)
  if (pos > -1) selectedItems[orderId].splice(pos, 1)
  else selectedItems[orderId].push(idx)
}

const toggleOfferSelection = (orderId, idx) => {
  if (!selectedOfferItems[orderId]) selectedOfferItems[orderId] = []
  const pos = selectedOfferItems[orderId].indexOf(idx)
  if (pos > -1) selectedOfferItems[orderId].splice(pos, 1)
  else selectedOfferItems[orderId].push(idx)
}

const isItemSelected = (orderId, idx) => Array.isArray(selectedItems[orderId]) && selectedItems[orderId].includes(idx)

const isOfferSelected = (orderId, idx) =>
  Array.isArray(selectedOfferItems[orderId]) && selectedOfferItems[orderId].includes(idx)

const hasSelectedForOrder = (orderId) =>
  (Array.isArray(selectedItems[orderId]) && selectedItems[orderId].length > 0) ||
  (selectedOfferItems[orderId] && selectedOfferItems[orderId].length)

// -------------------- API wrapper --------------------
const applyOrderEdit = async (orderId, action, tableNumber, payload = {}) => {
  const userStore = useUsersStore()

  try {
    const res = await axios.post(
      `${url}/order-edits/${orderId}/apply`,
      { action, tableNumber, ...payload },
      {
        params: {
          orderId,
          tableNumber,
          posUser: userStore.userDetails.posCreds.posId || 'STELLA',
          posPass: userStore.userDetails.posCreds.posPassword || 'St3ll@',
        },
      },
    )

    init({ message: res.data.message, color: res.data.status !== 'Failed' ? 'success' : 'danger' })
    return res.data
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || 'Failed to apply edit'
    init({ message: msg, color: 'danger' })
    throw err
  }
}

// -------------------- Delete helpers --------------------
const buildOrderMenuItemsPayload = (items) => {
  const menuItems = []

  for (const raw of Array.isArray(items) ? items : []) {
    const menuItemId =
      raw?._id ||
      raw?.id ||
      raw?.menuItemId ||
      (raw?.menuItem && (raw.menuItem._id || raw.menuItem.id)) ||
      raw?.menuItem

    if (!menuItemId || String(menuItemId).toLowerCase().includes('unknown')) continue

    let options = []

    if (Array.isArray(raw?.options) && raw.options.length) {
      options = raw.options.map((op) => ({
        option: String(
          (op?.option && (op.option._id || op.option.id)) || op?.optionId || op?._id || op?.id || op?.option,
        ),
        quantity: Number(op?.quantity || 1),
      }))
    } else if (Array.isArray(raw?.articlesOptionsGroup)) {
      options = raw.articlesOptionsGroup
        .flatMap((g) => (Array.isArray(g?.articlesOptions) ? g.articlesOptions : []))
        .filter((op) => op && (op.selected || op.isSelected))
        .map((op) => ({
          option: String(op?.option || op?.optionId || op?._id || op?.id),
          quantity: Number(op?.quantity || 1),
        }))
    }

    menuItems.push({
      menuItem: String(menuItemId),
      quantity: Number(raw?.quantity || 1),
      options,
    })
  }

  return { menuItems }
}

const removeSelected = async (orderId) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  const menuIdxs = (selectedItems[orderId] || []).slice()
  const offerIdxs = (selectedOfferItems[orderId] || []).slice()

  if (!menuIdxs.length && !offerIdxs.length) return

  for (const i of menuIdxs) {
    const line = order.menuItems?.[i]
    if (!line) continue
    const payload = buildOrderMenuItemsPayload([line])
    if (payload.menuItems.length) {
      await applyOrderEdit(orderId, 'delete', order.tableNumber, payload)
    }
  }

  for (const j of offerIdxs) {
    const off = order.offerDetails?.[j]
    const oid = String(off?.offerId || off?._id || '')
    if (!oid) continue

    await applyOrderEdit(orderId, 'delete', order.tableNumber, {
      offerMenuItems: [{ offerId: oid, quantity: 1 }],
    })
  }

  selectedItems[orderId] = []
  selectedOfferItems[orderId] = []
  fetchOrders()
}

// -------------------- Offer pricing helpers --------------------
const findOfferGroups = (slotDef) => {
  if (!slotDef) return []

  return (
    slotDef.articlesOptionsGroups ||
    slotDef.articleOptionsGroups ||
    slotDef.articlesOptionsGroup ||
    slotDef.optionGroups ||
    slotDef.groups ||
    []
  )
}

const findOfferGroup = (slotDef, groupId, fallbackGroupName = '') => {
  const groups = findOfferGroups(slotDef)

  let group = groups.find((g) => String(g?._id || g?.id || g?.groupId) === String(groupId))

  if (!group && fallbackGroupName) {
    group = groups.find((g) => String(g?.name || '').toLowerCase() === String(fallbackGroupName || '').toLowerCase())
  }

  offerLog('findOfferGroup', {
    groupId,
    fallbackGroupName,
    found: !!group,
    availableGroups: groups.map((g) => ({
      id: g?._id || g?.id || g?.groupId,
      name: g?.name,
      keys: Object.keys(g || {}),
    })),
  })

  return group || null
}

const findOfferOption = (group, optionId, fallbackOptionName = '') => {
  if (!group) return null

  const options = group.articlesOptions || group.options || group.items || []

  let opt = options.find((o) => String(o?._id || o?.id || o?.optionId || o?.option) === String(optionId))

  if (!opt && fallbackOptionName) {
    opt = options.find((o) => String(o?.name || '').toLowerCase() === String(fallbackOptionName || '').toLowerCase())
  }

  offerLog('findOfferOption', {
    optionId,
    fallbackOptionName,
    found: !!opt,
    availableOptions: options.map((o) => ({
      id: o?._id || o?.id || o?.optionId || o?.option,
      name: o?.name,
      price: o?.price,
      customPrice: o?.customPrice,
      isFree: o?.isFree,
    })),
  })

  return opt || null
}

// Used for history mapping only.
// Here we still allow history fallback so the historical modal can reflect saved data.
const resolveOfferOptionPrice = (
  slotDef,
  groupId,
  optionId,
  fallbackOption,
  fallbackGroupName = '',
  fallbackOptionName = '',
  historyOption = null,
) => {
  const historyPrice =
    historyOption?.price !== undefined && historyOption?.price !== null
      ? Number(historyOption.price)
      : null

  offerLog('resolveOfferOptionPrice -> start', {
    slotDefKeys: Object.keys(slotDef || {}),
    groupId,
    optionId,
    fallbackGroupName,
    fallbackOptionName,
    historyPrice,
    fallbackPrice: fallbackOption?.price,
  })

  if (!slotDef) {
    const finalPrice = historyPrice ?? Number(fallbackOption?.price || 0)

    offerLog('resolveOfferOptionPrice -> no slotDef, using history/fallback', {
      groupId,
      optionId,
      historyPrice,
      fallbackPrice: fallbackOption?.price,
      finalPrice,
    })

    return finalPrice
  }

  const group = findOfferGroup(slotDef, groupId, fallbackGroupName)

  if (!group) {
    const finalPrice = historyPrice ?? Number(fallbackOption?.price || 0)

    offerLog('resolveOfferOptionPrice -> group not found, using history/fallback', {
      groupId,
      optionId,
      historyPrice,
      fallbackPrice: fallbackOption?.price,
      finalPrice,
    })

    return finalPrice
  }

  const offerOpt = findOfferOption(group, optionId, fallbackOptionName)

  if (!offerOpt) {
    const finalPrice = historyPrice ?? Number(fallbackOption?.price || 0)

    offerLog('resolveOfferOptionPrice -> option not found, using history/fallback', {
      groupId,
      optionId,
      historyPrice,
      fallbackPrice: fallbackOption?.price,
      finalPrice,
    })

    return finalPrice
  }

  if (offerOpt.isFree) {
    offerLog('resolveOfferOptionPrice -> offer option is free', {
      groupId,
      optionId,
      optionName: offerOpt?.name,
    })
    return 0
  }

  const finalPrice = Number(
    offerOpt.customPrice ??
      offerOpt.price ??
      historyPrice ??
      fallbackOption?.price ??
      0,
  )

  offerLog('resolveOfferOptionPrice -> resolved from offer', {
    groupId,
    optionId,
    optionName: offerOpt?.name,
    customPrice: offerOpt?.customPrice,
    offerPrice: offerOpt?.price,
    historyPrice,
    fallbackPrice: fallbackOption?.price,
    finalPrice,
  })

  return finalPrice
}

// Used ONLY during edit rebuild.
// Key rule: if item belongs to an included offer slot, unmatched options must stay FREE (0),
// not fallback to historical saved upgrade prices.
const resolveOfferOptionPriceForEdit = ({
  slotDef,
  groupId,
  optionId,
  fallbackOption,
  fallbackGroupName = '',
  fallbackOptionName = '',
  historyOption = null,
}) => {
  const historyPrice =
    historyOption?.price !== undefined && historyOption?.price !== null
      ? Number(historyOption.price)
      : null

  offerLog('resolveOfferOptionPriceForEdit -> start', {
    slotDefKeys: Object.keys(slotDef || {}),
    groupId,
    optionId,
    fallbackGroupName,
    fallbackOptionName,
    historyPrice,
    fallbackPrice: fallbackOption?.price,
  })

  if (!slotDef) {
    const finalPrice = historyPrice ?? Number(fallbackOption?.price || 0)

    offerLog('resolveOfferOptionPriceForEdit -> no slotDef, using history/fallback', {
      groupId,
      optionId,
      historyPrice,
      fallbackPrice: fallbackOption?.price,
      finalPrice,
    })

    return finalPrice
  }

  const group = findOfferGroup(slotDef, groupId, fallbackGroupName)

const isSizeGroup = String(fallbackGroupName || '').trim().toLowerCase() === 'size'
const isCrustGroup = String(fallbackGroupName || '').trim().toLowerCase() === 'crust'

if (!group) {
  let finalPrice = 0

  if (isSizeGroup) {
    finalPrice = 0
  } else if (isCrustGroup) {
    finalPrice = historyPrice > 0 ? historyPrice : 0
  } else {
    finalPrice = historyPrice > 0 ? historyPrice : 0
  }

  offerLog('resolveOfferOptionPriceForEdit -> group not found inside slot', {
    groupId,
    optionId,
    fallbackGroupName,
    historyPrice,
    fallbackPrice: fallbackOption?.price,
    finalPrice,
    rule: isSizeGroup ? 'size-forced-zero' : isCrustGroup ? 'crust-preserve-history' : 'default-preserve-positive-history',
  })

  return finalPrice
}

const offerOpt = findOfferOption(group, optionId, fallbackOptionName)

if (!offerOpt) {
  let finalPrice = 0

  if (isSizeGroup) {
    finalPrice = 0
  } else if (isCrustGroup) {
    finalPrice = historyPrice > 0 ? historyPrice : 0
  } else {
    finalPrice = historyPrice > 0 ? historyPrice : 0
  }

  offerLog('resolveOfferOptionPriceForEdit -> option not found inside matched slot group', {
    groupId,
    optionId,
    fallbackGroupName,
    historyPrice,
    fallbackPrice: fallbackOption?.price,
    finalPrice,
    rule: isSizeGroup ? 'size-forced-zero' : isCrustGroup ? 'crust-preserve-history' : 'default-preserve-positive-history',
  })

  return finalPrice
}

  if (offerOpt.isFree) {
    offerLog('resolveOfferOptionPriceForEdit -> option explicitly free', {
      groupId,
      optionId,
      optionName: offerOpt?.name,
    })
    return 0
  }

  if (offerOpt.customPrice != null || offerOpt.price != null) {
    const finalPrice = Number(offerOpt.customPrice ?? offerOpt.price ?? 0)

    offerLog('resolveOfferOptionPriceForEdit -> explicit offer price', {
      groupId,
      optionId,
      optionName: offerOpt?.name,
      customPrice: offerOpt?.customPrice,
      offerPrice: offerOpt?.price,
      finalPrice,
    })

    return finalPrice
  }

  const finalPrice = historyPrice > 0 ? historyPrice : 0

  offerLog('resolveOfferOptionPriceForEdit -> matched option but no explicit offer price, preserving paid history only', {
    groupId,
    optionId,
    optionName: offerOpt?.name,
    historyPrice,
    finalPrice,
  })

  return finalPrice
}
const resolveOfferItemBasePrice = (slotDef, addedItem, freshOfferItemDef) => {
  if (!slotDef) {
    const fallback = Number(freshOfferItemDef?.customPrice ?? freshOfferItemDef?.price ?? 0)
    offerLog('resolveOfferItemBasePrice -> no slotDef, fallback', {
      itemId: addedItem?.itemId,
      fallback,
    })
    return fallback
  }

  if (slotDef.isFree) {
    offerLog('resolveOfferItemBasePrice -> slot free', {
      itemId: addedItem?.itemId,
    })
    return 0
  }

  const finalPrice = Number(slotDef.customPrice ?? slotDef.price ?? freshOfferItemDef?.customPrice ?? freshOfferItemDef?.price ?? 0)

  offerLog('resolveOfferItemBasePrice -> resolved', {
    itemId: addedItem?.itemId,
    slotCustomPrice: slotDef?.customPrice,
    slotPrice: slotDef?.price,
    freshOfferItemPrice: freshOfferItemDef?.price,
    finalPrice,
  })

  return finalPrice
}

// Used ONLY during edit rebuild.
const resolveOfferItemBasePriceForEdit = (slotDef, addedItem, freshOfferItemDef) => {
  if (!slotDef) {
    const fallback = Number(freshOfferItemDef?.customPrice ?? freshOfferItemDef?.price ?? 0)
    offerLog('resolveOfferItemBasePriceForEdit -> no slotDef, fallback', {
      itemId: addedItem?.itemId,
      fallback,
    })
    return fallback
  }

  if (slotDef.isFree) {
    offerLog('resolveOfferItemBasePriceForEdit -> slot free', {
      itemId: addedItem?.itemId,
    })
    return 0
  }

  if (slotDef.customPrice != null || slotDef.price != null) {
    const finalPrice = Number(slotDef.customPrice ?? slotDef.price ?? 0)
    offerLog('resolveOfferItemBasePriceForEdit -> explicit slot price', {
      itemId: addedItem?.itemId,
      slotCustomPrice: slotDef?.customPrice,
      slotPrice: slotDef?.price,
      finalPrice,
    })
    return finalPrice
  }

  // Included offer item with no explicit charge
  offerLog('resolveOfferItemBasePriceForEdit -> included slot without explicit price, forcing 0', {
    itemId: addedItem?.itemId,
  })
  return 0
}

// -------------------- Edit --------------------
const restoreFullOrder = async (orderId) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  const items = order.menuItems || []
  const offersItems = order.offerDetails || []

  const menuStore = useMenuStore()
  const orderStore = useOrderStore()

  // 1. Prepare original context for diffing
  const originalMenuItems = items.map((mi) => {
    const menuItemId = (mi?.menuItem && (mi.menuItem._id || mi.menuItem)) || mi?.menuItemId || mi?._id

    let options = []
    if (Array.isArray(mi?.options) && mi.options.length) {
      options = mi.options.map((o) => ({
        option: String((o?.option && (o.option._id || o.option)) || o?._id),
        quantity: Number(o?.quantity || 1),
      }))
    } else if (Array.isArray(mi?.articlesOptionsGroup)) {
      options = mi.articlesOptionsGroup
        .flatMap((g) => (Array.isArray(g?.articlesOptions) ? g.articlesOptions : []))
        .filter((opt) => opt && opt.selected)
        .map((opt) => ({
          option: String(opt.optionId || opt._id || opt.option),
          quantity: Number(opt.quantity || 1),
        }))
    }

    return { menuItem: String(menuItemId), quantity: Number(mi.quantity || 1), options }
  })

  const originalOffersToDelete = offersItems
    .map((e) => ({ offerId: String(e.offerId || e._id), quantity: 1 }))
    .filter((x) => !!x.offerId)

  // 2. Reset and initialize store for edit
  orderStore.resetEditOrder()
  orderStore.setCartItems([])
  orderStore.offerItems = []
  orderStore.cartTotal = null
  orderStore.validation = null

  orderStore.setOrderFor(order.orderFor || 'current')
  orderStore.setDeliveryZone(order.deliveryZoneId)
  orderStore.setAddress(order.address)
  orderStore.setOrderNotes(order.orderNotes || order.note)
  orderStore.setDeliveryNotes(order.deliveryNotes)
  orderStore.setPhoneNumber(order.phoneNo || order.customer?.MobilePhone || '')

  // 3. Map Menu Items to Cart
  const cartSeed = items.map((histItem) => {
    const targetId = String(
      (histItem?.menuItem && (histItem.menuItem._id || histItem.menuItem)) || histItem?.menuItemId || histItem?._id,
    ).trim()
    const freshItem = menuStore.unFilteredMenuItems.find((m) => String(m._id || m.id).trim() === targetId)

    const selectedOptions = (freshItem?.articlesOptionsGroup || [])
      .map((group) => {
        const selected = (group.articlesOptions || [])
          .filter((opt) => {
            const found = (histItem.options || []).find(
              (h) => String(h.option?._id || h.option || h._id).trim() === String(opt._id).trim(),
            )
            const oldFound = (histItem.articlesOptionsGroup || []).some((g) =>
              (g.articlesOptions || []).some(
                (o) => o.selected && String(o.optionId || o._id).trim() === String(opt._id).trim(),
              ),
            )
            return !!found || oldFound
          })
          .map((opt) => {
            const hOpt = (histItem.options || []).find(
              (h) => String(h.option?._id || h.option || h._id).trim() === String(opt._id).trim(),
            )
            return {
              ...opt,
              optionId: opt._id,
              optionName: opt.name,
              price: parseFloat(opt.price) || 0,
              type: opt.type,
              quantity: hOpt ? Number(hOpt.quantity) || 1 : 1,
              selected: true,
            }
          })

        if (!selected.length) return null

        return {
          groupId: group._id,
          groupName: group.name,
          categoryId: freshItem.categories && freshItem.categories.length > 0 ? freshItem.categories[0].id : null,
          menuItemId: freshItem._id,
          selected,
        }
      })
      .filter(Boolean)

    return {
      orderId,
      itemId: freshItem?._id || targetId,
      itemName: freshItem?.name || histItem.name || histItem.menuItem || 'Unknown Item',
      basePrice: parseFloat(histItem.unitPrice || histItem.price || freshItem?.price) || 0,
      totalPrice: 0,
      imageUrl: freshItem?.imageUrl || histItem.imageUrl || '',
      promotionCode: histItem.promotionCode || '',
      isRepeatedOrder: true,
      quantity: histItem.quantity,
      isFree: !!histItem.isFree,
      selectedOptions,
    }
  })

  cartSeed.forEach((e) => {
    orderStore.addItemToCart(e)
    const newIndex = orderStore.cartItems.length - 1
    orderStore.calculateItemTotal(newIndex)
  })

  // 4. Map Offers
  if (offersItems.length) {
    offersItems.forEach((histOffer) => {
      const freshOfferDef = orderStore.offers.find((o) => String(o._id) === String(histOffer.offerId))
      if (!freshOfferDef) {
        offerLog('restoreFullOrder -> freshOfferDef not found', { offerId: histOffer.offerId })
        return
      }

      offerLog('restoreFullOrder -> rebuilding offer', {
        offerId: histOffer.offerId,
        offerName: histOffer.offerName,
        freshOfferDef,
        structuredOffer: histOffer.structuredOffer,
      })

      const rebuiltSelections = []
      let selectionTotal = 0

      ;(histOffer.structuredOffer?.selections || []).forEach((sel, selIndex) => {
        const rebuiltAddedItems = []

        offerLog('restoreFullOrder -> selection start', {
          offerId: histOffer.offerId,
          selectionIndex: selIndex,
          addedItems: sel?.addedItems,
        })

        ;(sel.addedItems || []).forEach((addedItem) => {
          const freshMenuItem = menuStore.unFilteredMenuItems.find((m) => String(m._id) === String(addedItem.itemId))
          if (!freshMenuItem) {
            offerLog('restoreFullOrder -> freshMenuItem not found', { addedItem })
            return
          }

          const slotDef = (sel.menuItems || []).find((mi) => String(mi.menuItemId) === String(addedItem.itemId))
          const freshOfferItemDef = (freshOfferDef.offerItems || []).find(
            (oi) => String(oi.menuItem || oi.menuItemId || oi._id) === String(addedItem.itemId),
          )

          const correctedBasePrice = resolveOfferItemBasePriceForEdit(slotDef, addedItem, freshOfferItemDef)

          const rebuiltSelectedOptions = (addedItem.selectedOptions || [])
            .map((group) => {
              const freshGroup = (freshMenuItem.articlesOptionsGroup || []).find(
                (g) => String(g._id) === String(group.groupId),
              )
              if (!freshGroup) return null

              const rebuiltGroupSelections = (group.selected || [])
                .map((selOpt) => {
                  const freshOpt = (freshGroup.articlesOptions || []).find(
                    (o) => String(o._id) === String(selOpt.optionId),
                  )
                  if (!freshOpt) return null

                  const correctedOptionPrice = resolveOfferOptionPriceForEdit({
                    slotDef,
                    groupId: group.groupId,
                    optionId: selOpt.optionId,
                    fallbackOption: freshOpt,
                    fallbackGroupName: group.groupName,
                    fallbackOptionName: selOpt.name,
                    historyOption: selOpt,
                  })

                  return {
                    ...selOpt,
                    optionId: freshOpt._id,
                    name: freshOpt.name,
                    price: correctedOptionPrice,
                    quantity: Number(selOpt.quantity || 1),
                    type: selOpt?.type || freshOpt.type,
                  }
                })
                .filter(Boolean)

              if (!rebuiltGroupSelections.length) return null

              return {
                ...group,
                groupId: freshGroup._id,
                groupName: freshGroup.name,
                selected: rebuiltGroupSelections,
              }
            })
            .filter(Boolean)

          let itemOptionsTotal = 0
          rebuiltSelectedOptions.forEach((g) => {
            ;(g.selected || []).forEach((opt) => {
              itemOptionsTotal += Number(opt.price || 0) * Number(opt.quantity || 1)
            })
          })

          selectionTotal += correctedBasePrice * Number(addedItem.quantity || 1)
          selectionTotal += itemOptionsTotal

          rebuiltAddedItems.push({
            ...addedItem,
            itemId: freshMenuItem._id,
            itemName: freshMenuItem.name,
            basePrice: correctedBasePrice,
            selectedOptions: rebuiltSelectedOptions,
          })
        })

        rebuiltSelections.push({
          ...sel,
          addedItems: rebuiltAddedItems,
        })
      })

      const rebuiltOffer = {
        ...freshOfferDef,
        _id: freshOfferDef._id,
        offerId: freshOfferDef._id,
        name: freshOfferDef.name,
        price: Number(freshOfferDef.price || 0),
        basePrice: Number(freshOfferDef.price || 0),
        quantity: 1,
        selections: rebuiltSelections,
        selectionTotalPrice: selectionTotal,
        totalPrice: Number(freshOfferDef.price || 0) + selectionTotal,
      }

      offerLog('restoreFullOrder -> final rebuilt offer', rebuiltOffer)
      orderStore.offersAdded(rebuiltOffer)
    })
  }

  const orderForStore = {
    ...order,
    editOrderTotal: order.total || 0,
    _editContext: {
      originalMenuItems,
      originalOffersToDelete,
    },
  }

  orderStore.addEditOrder(orderForStore)
}

const editSelected = async (orderId) => {
  await restoreFullOrder(orderId)
  selectedItems[orderId] = []
  selectedOfferItems[orderId] = []
  emits('close')
}

// -------------------- Cancel --------------------
const cancelOrder = async (orderId) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  if (order.status === 'In Progress') {
    const orderStore = useOrderStore()
    try {
      await orderStore.cancelOrder(orderId)
      init({ message: 'Order cancelled successfully', color: 'success' })
    } catch (err) {
      console.error(err)
      init({ message: 'Failed to cancel order', color: 'danger' })
    }
  } else {
    await applyOrderEdit(orderId, 'cancel', order.tableNumber)
  }

  fetchOrders()
}

// -------------------- Promo display --------------------
const getPromoForOrder = (order) => {
  if (!order || !order.promotionCode) return null

  const p = order.promotion || {}
  const typeKey = (p.type || order.discountType || '').toString()
  const typeName = TYPE_LABELS[typeKey] || (typeKey ? titleize(typeKey) : '')

  const discountValueRaw = toNum(first(order.discount, p.discountValue, order.discountAmount))
  const discountPercentRaw = toNum(first(order.discountPercentage, p.discountPercent))

  let discountValue = discountValueRaw

  if (discountPercentRaw > 0) {
    const calculated = (toNum(order.subtotal) * discountPercentRaw) / 100
    if (Math.abs(discountValueRaw - discountPercentRaw) < 0.01 && Math.abs(discountValueRaw - calculated) > 0.05) {
      discountValue = calculated
    }
  }

  if (discountValue <= 0 && discountPercentRaw > 0) {
    const gap = toNum(order.subtotal) + toNum(order.deliveryFee) - toNum(order.total)
    if (gap > 0) discountValue = gap
  }

  if (discountValue <= 0 && discountPercentRaw <= 0) return null

  const parts = []
  if (typeName) parts.push(typeName)
  if (discountValue > 0) parts.push(eur.format(discountValue))
  if (discountPercentRaw > 0) parts.push(`${Number(discountPercentRaw).toFixed(2)}%`)

  if (!parts.length) return null

  return {
    label: `Discount (${parts.join(' · ')})`,
    amount: discountValue > 0 ? eur.format(-Math.abs(discountValue)) : eur.format(0),
    detail: null,
  }
}

// -------------------- Status / formatting --------------------
const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getPromisedTime = (createdAt, orderType) => {
  if (!createdAt) return 'N/A'
  const date = new Date(createdAt)
  if (orderType?.toLowerCase() === 'takeaway') {
    date.setMinutes(date.getMinutes() + (props.takeawayPromiseTime || 0))
  } else if (orderType?.toLowerCase() === 'delivery') {
    date.setMinutes(date.getMinutes() + (props.deliveryPromiseTime || 0))
  }

  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const getOrderSource = (source) => (!source ? '' : source === 'CC' ? 'Call Center' : source)

const getDisplayStatus = (order, index) => (index === 0 && liveStatus.value ? liveStatus.value : order.status)

const getDeliveryZoneName = (deliveryZoneId) => {
  if (!deliveryZoneId || !Array.isArray(props.deliveryZoneOptions)) return ''
  const zone = props.deliveryZoneOptions.find((z) => z._id === deliveryZoneId)
  return zone ? zone.name : ''
}

// -------------------- Toggle accordion --------------------
const toggleOrder = (index) => {
  expandedIndex.value = expandedIndex.value === index ? null : index
  for (const key in selectedItems) delete selectedItems[key]
  for (const key in selectedOfferItems) delete selectedOfferItems[key]
}

const isCancelled = (order, index) => {
  const norm = (s) =>
    String(s || '')
      .trim()
      .toLowerCase()

  const hist = norm(order?.status)
  const live = index === 0 ? norm(liveStatus.value) : ''
  const coord = index === 0 ? norm(orderStatuses?.value ?? orderStatuses) : ''

  const saysCancel = (s) => s.startsWith('cancel')
  return [hist, live, coord].some(saysCancel)
}

// -------------------- Stats / filters --------------------
const showAll = ref(false)
const ordersToShow = computed(() => (showAll.value ? orders.value : orders.value.slice(0, 5)))
const orderStatuses = ref(null)

const periodStartDate = computed(() => {
  const today = new Date()
  let startDate = new Date(today)

  switch (selectedPeriod.value) {
    case '1 Month':
      startDate.setMonth(today.getMonth() - 1)
      break
    case '6 Months':
      startDate.setMonth(today.getMonth() - 6)
      break
    case '12 Months':
      startDate.setMonth(today.getMonth() - 12)
      break
    case 'All Time':
      startDate = new Date(0)
      break
  }

  startDate.setHours(0, 0, 0, 0)
  return startDate
})

const filteredOrders = computed(() => {
  if (!orders.value || !orders.value.length) return []
  const startDate = periodStartDate.value
  return orders.value.filter((o) => o.status === 'Completed' && new Date(o.createdAt) >= startDate)
})

const lastOrdered = computed(() => {
  if (!filteredOrders.value.length) return { daysAgo: 'No Orders', fullDate: '' }

  const sorted = [...filteredOrders.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const last = sorted[0]
  const lastDate = new Date(last.createdAt)
  const today = new Date()

  lastDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24))
  const daysAgoText = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`

  return { daysAgo: daysAgoText, fullDate: formatDateTime(last.createdAt) }
})

const totalStats = computed(() => {
  const total = filteredOrders.value.reduce((sum, order) => sum + (order.total || 0), 0)
  const count = filteredOrders.value.length
  return { total, count }
})

const orderTypes = computed(() => {
  const takeaway = filteredOrders.value.filter((o) => o.orderType?.toLowerCase() === 'takeaway').length
  const delivery = filteredOrders.value.filter((o) => o.orderType?.toLowerCase() === 'delivery').length
  const total = takeaway + delivery

  return {
    takeaway,
    takeawayPercent: total ? Math.round((takeaway / total) * 100) : 0,
    delivery,
    deliveryPercent: total ? Math.round((delivery / total) * 100) : 0,
  }
})

const averageOrder = computed(() => {
  if (!filteredOrders.value.length) return { average: 0, avgItems: 0 }

  const total = filteredOrders.value.reduce((sum, order) => sum + (order.total || 0), 0)
  const totalItems = filteredOrders.value.reduce((sum, order) => sum + (order.menuItems?.length || 0), 0)

  return {
    average: total / filteredOrders.value.length,
    avgItems: totalItems / filteredOrders.value.length,
  }
})

const promoStats = computed(() => {
  const count = filteredOrders.value.filter((o) => o.discount && o.discount > 0).length
  const percent = filteredOrders.value.length ? Math.round((count / filteredOrders.value.length) * 100) : 0
  return { count, percent }
})

const complaintStats = computed(() => {
  const count = filteredOrders.value.filter((o) => o.complaint && o.complaint.trim() !== '').length
  const percent = filteredOrders.value.length ? Math.round((count / filteredOrders.value.length) * 100) : 0
  return { count, percent }
})

// -------------------- External status + orders --------------------
const fetchOrderStatus = async () => {
  const outlet = useServiceStore()

  try {
    const base = coordurl.replace(/\/+$/, '')
    const urlC = `${base}/CoordApi/v1/Stella/GetOrderStatusByMobile`

    const res = await axios.get(urlC, {
      params: {
        mobile: props.selectedUser.MobilePhone,
        w4CompanyCode: outlet.restDetails.winmaxConfig.company.toLowerCase(),
      },
      headers: { 'X-API-Key': '1234567890' },
      transformRequest: [
        (data, headers) => {
          if (headers && headers.hasOwnProperty('Authorization')) delete headers['Authorization']
          return data
        },
      ],
    })

    orderStatuses.value = res.data?.statusCode ? res.data.statusCode.toLowerCase() : null
  } catch {
    orderStatuses.value = null
  }
}

const mapOfferDetailsToSelections = (offerDetailsResponse, detailedOfferPayload) => {
  const detailedSelections = JSON.parse(JSON.stringify(detailedOfferPayload.selections || []))
  const remainingItems = [...(offerDetailsResponse.offerItems || [])]
  const storeMenuItems = useMenuStore().unFilteredMenuItems || []

  offerLog('mapOfferDetailsToSelections -> start', {
    offerDetailsResponse,
    detailedOfferPayload,
  })

  for (const selection of detailedSelections) {
    if (!selection.addedItems) selection.addedItems = []

    const allowedIds = new Set((selection.menuItems || []).map((mi) => String(mi.menuItemId)))
    const maxItems = selection.max ?? Infinity

    for (let i = 0; i < remainingItems.length && selection.addedItems.length < maxItems; ) {
      const histItem = remainingItems[i]

      if (!allowedIds.has(String(histItem.menuItem))) {
        i++
        continue
      }

      const storeMenu = storeMenuItems.find((m) => String(m._id) === String(histItem.menuItem))
      if (!storeMenu) {
        offerLog('mapOfferDetailsToSelections -> storeMenu missing', histItem)
        i++
        continue
      }

      const offerMenuDef = (selection.menuItems || []).find(
        (mi) => String(mi.menuItemId) === String(histItem.menuItem),
      )

      let basePrice = 0
      if (offerMenuDef) {
        const hasExplicitCharge = offerMenuDef.customPrice != null || offerMenuDef.price != null

        if (offerMenuDef.isFree) {
          basePrice = 0
        } else if (hasExplicitCharge) {
          basePrice = Number(offerMenuDef.customPrice ?? offerMenuDef.price ?? 0)
        }
      }

      const optionIds = (histItem.options || []).map((o) => String(o.option))

      const selectedOptions = (storeMenu.articlesOptionsGroup || [])
        .map((group) => {
          const selected = (group.articlesOptions || [])
            .filter((opt) => optionIds.includes(String(opt._id)))
            .map((opt) => {
              const histOpt = (histItem.options || []).find((o) => String(o.option) === String(opt._id))

              const correctedOptionPrice = resolveOfferOptionPrice(
                offerMenuDef,
                group._id,
                opt._id,
                opt,
                group.name,
                opt.name,
                histOpt,
              )

              offerLog('mapOfferDetailsToSelections -> option resolved', {
                item: histItem.name,
                group: group.name,
                option: opt.name,
                correctedOptionPrice,
                histOpt,
              })

              return {
                optionId: opt._id,
                name: opt.name,
                quantity: Number(histOpt?.quantity || 1),
                price: correctedOptionPrice,
                type: histOpt?.type || opt.type,
              }
            })

          if (!selected.length) return null

          return {
            groupId: group._id,
            groupName: group.name,
            selected,
          }
        })
        .filter(Boolean)

      selection.addedItems.push({
        itemId: histItem.menuItem,
        itemName: histItem.name,
        itemDescription: storeMenu.description,
        imageUrl: storeMenu.imageUrl,
        quantity: Number(histItem.quantity || 1),
        basePrice,
        selectedOptions,
      })

      offerLog('mapOfferDetailsToSelections -> added item', {
        histItem,
        offerMenuDef,
        basePrice,
        selectedOptions,
      })

      remainingItems.splice(i, 1)
    }
  }

  return { ...detailedOfferPayload, selections: detailedSelections }
}

const fetchOrders = async () => {
  const menuItems = useMenuStore()
  const orderStore = useOrderStore()

  try {
    const phone = props.customer?.MobilePhone || props.customer?.Phone || props.customer?.phoneNo || ''
    const res = await axios.get(
      `${url}/orders/history?phone=${phone}&page=1&limit=500&from=2025-01-01&status=Completed`,
    )

    if (res.data?.status === 'Success') {
      orders.value = res.data.data.items.map((order) => {
        const p = order.promotion || {}
        const discountPercentRaw = toNum(first(order.discountPercentage, p.discountPercent))

        const detailedOfferItems = (order.offerDetails || []).map((offer) => {
          const offerItem = orderStore.offers.find((a) => String(a._id) === String(offer.offerId))
          // Preserve raw history if fresh offer definition is missing
          if (!offerItem) {
            offerLog('fetchOrders -> fresh offer definition not found, preserving raw history', {
              orderId: order._id,
              offerId: offer.offerId,
              offerName: offer.offerName,
            })

            return {
              ...offer,
              structuredOffer: offer.structuredOffer || { selections: [] },
              overrideUnitPrice: null,
            }
          }

          const mappedData = mapOfferDetailsToSelections(offer, offerItem)

          let overrideUnitPrice = 0
          if (discountPercentRaw > 0) {
            const originalTotal = Number(mappedData.totalPrice || 0)
            overrideUnitPrice = originalTotal * (1 - discountPercentRaw / 100)
          }

          return {
            ...offer,
            structuredOffer: { ...mappedData },
            overrideUnitPrice: overrideUnitPrice > 0 ? Number(overrideUnitPrice).toFixed(2) : null,
          }
        })

        const detailedItems = (order.menuItems || []).map((item) => {
          const menuItem = menuItems.unFilteredMenuItems.find((mi) => String(mi._id) === String(item.menuItem))

          const optionCounts = new Map()
          if (item.options && item.options.length) {
            item.options.forEach((o) => {
              const qty = Number(o.quantity || 1)
              const unitQ = item.quantity && item.quantity > 1 ? Math.floor(qty / item.quantity) : qty
              if (unitQ > 0) {
                optionCounts.set(String(o.option), (optionCounts.get(String(o.option)) || 0) + unitQ)
              }
            })
          }

          const mappedGroups = (menuItem?.articlesOptionsGroup || []).map((group) => {
            const limit = group.singleChoice ? 1 : group.maximumChoices || Infinity
            let selectedTotalQty = 0

            const options = (group.articlesOptions || []).map((opt) => {
              const optId = String(opt._id)
              const available = optionCounts.get(optId) || 0
              const remainingLimit = limit - selectedTotalQty
              const take = Math.min(available, remainingLimit)

              if (take > 0) {
                optionCounts.set(optId, available - take)
                selectedTotalQty += take

                const historyDetails = (item.options || []).find((o) => String(o.option) === optId)

                return {
                  ...opt,
                  ...historyDetails,
                  selected: true,
                  quantity: take,
                }
              }

              return {
                ...opt,
                selected: false,
              }
            })

            return {
              ...group,
              articlesOptions: options,
            }
          })

          const enrichedItem = {
            ...item,
            name: menuItem ? menuItem.name : item.menuItemName || 'Unknown Item',
            ...menuItem,
            articlesOptionsGroup: mappedGroups,
            overrideUnitPrice: null,
          }

          if (discountPercentRaw > 0) {
            const originalTotal = Number(getTotalPrice(enrichedItem))
            const discounted = originalTotal * (1 - discountPercentRaw / 100)
            enrichedItem.overrideUnitPrice = discounted.toFixed(2)
          }

          return enrichedItem
        })

        return {
          ...order,
          menuItems: detailedItems,
          offerDetails: detailedOfferItems,
        }
      })
    } else {
      orders.value = []
    }
  } catch (error) {
    console.log(error)
    orders.value = []
  } finally {
    isLoading.value = false
  }
}

// -------------------- Misc --------------------
const getTheEmployeeName = (employeeId) => {
  const user = users.value.find((user) => user._id === employeeId)
  if (!user) return ''
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username
}

const getTotalPrice = (item) => {
  if (item.unitPrice != null && item.unitPrice > 0) {
    return Number(item.unitPrice).toFixed(2)
  }

  const basePrice = Number(item.price || 0)

  const selectedOptions =
    item.articlesOptionsGroup
      ?.flatMap((a) => a.articlesOptions)
      .filter((a) => a.selected) || []

  const optionsTotal = selectedOptions.reduce(
    (sum, opt) => sum + (Number(opt.price) || 0) * (Number(opt.quantity) || 1),
    0,
  )

  return (basePrice + optionsTotal).toFixed(2)
}

const fetchUsers = async () => {
  try {
    const userStore = useUsersStore()
    const { data } = await userStore.getAll({
      page: 1,
      limit: 1000,
      search: '',
      sortBy: 'name',
      sortOrder: 'asc',
    })
    users.value = data
  } catch (error) {
    console.error('Error fetching users:', error)
  }
}

onMounted(async () => {
  fetchUsers()
  await fetchOrderStatus()
  await fetchOrders()
})

// -------------------- Placeholder stubs already in your flow --------------------
const repeatOrder = async (orderId) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  const menuStore = useMenuStore()
  const orderStore = useOrderStore()

  const items = (order.menuItems || [])
    .map((histItem) => {
      const freshItem = menuStore.unFilteredMenuItems.find((mi) => mi._id === histItem._id)
      if (!freshItem) return null

      const histOptionMap = new Map()
      if (histItem.articlesOptionsGroup) {
        histItem.articlesOptionsGroup.forEach((g) => {
          ;(g.articlesOptions || []).forEach((opt) => {
            if (opt.selected) histOptionMap.set(opt._id, opt.quantity || 1)
          })
        })
      }

      const freshSelectedOptions = (freshItem.articlesOptionsGroup || [])
        .map((group) => {
          const limit = group.singleChoice ? 1 : group.maximumChoices || Infinity
          let groupSelectedQty = 0

          const selected = (group.articlesOptions || [])
            .map((opt) => {
              if (!histOptionMap.has(opt._id)) return null

              const available = histOptionMap.get(opt._id)
              if (available <= 0) return null

              const remainingLimit = limit - groupSelectedQty
              const take = Math.min(available, remainingLimit)
              if (take <= 0) return null

              histOptionMap.set(opt._id, available - take)
              groupSelectedQty += take

              return {
                ...opt,
                optionId: opt._id,
                optionName: opt.name,
                price: parseFloat(opt.price) || 0,
                type: opt.type,
                quantity: take,
              }
            })
            .filter(Boolean)

          if (!selected.length) return null

          return {
            groupId: group._id,
            groupName: group.name,
            categoryId: freshItem.categories && freshItem.categories.length > 0 ? freshItem.categories[0].id : null,
            menuItemId: freshItem._id,
            selected,
          }
        })
        .filter(Boolean)

      return {
        orderId,
        itemId: freshItem._id,
        itemName: freshItem.name,
        basePrice: parseFloat(freshItem.price) || 0,
        totalPrice: 0,
        imageUrl: freshItem.imageUrl || '',
        promotionCode: freshItem.promotionCode || '',
        isRepeatedOrder: true,
        quantity: histItem.quantity,
        isFree: !!freshItem.isFree,
        selectedOptions: freshSelectedOptions,
      }
    })
    .filter(Boolean)

  const offersItems = (order.offerDetails || [])
    .map((histOffer) => {
      const freshOfferDef = orderStore.offers.find((o) => o._id === histOffer.offerId)
      if (!freshOfferDef) return null

      let selectionTotal = 0
      const selections = []

      if (histOffer.structuredOffer && histOffer.structuredOffer.selections) {
        histOffer.structuredOffer.selections.forEach((sel) => {
          const freshAddedItems = []

          sel.addedItems.forEach((addedItem) => {
            const freshOfferItemDef = freshOfferDef.offerItems.find((oi) => oi.menuItem === addedItem.itemId)
            if (!freshOfferItemDef) return

            const freshBasePrice = Number(freshOfferItemDef.price || 0)
            const freshMenuItem = menuStore.unFilteredMenuItems.find((m) => m._id === addedItem.itemId)
            if (!freshMenuItem) return

            const freshSelectedOptions = (addedItem.selectedOptions || [])
              .map((group) => {
                const freshGroup = freshMenuItem.articlesOptionsGroup.find((g) => g._id === group.groupId)
                if (!freshGroup) return null

                const validSelections = (group.selected || [])
                  .map((s) => {
                    const freshOpt = freshGroup.articlesOptions.find((o) => o._id === s.optionId)
                    if (!freshOpt) return null
                    return {
                      ...s,
                      price: parseFloat(freshOpt.price) || 0,
                    }
                  })
                  .filter(Boolean)

                if (!validSelections.length) return null
                return { ...group, selected: validSelections }
              })
              .filter(Boolean)

            let itemOptionsTotal = 0
            freshSelectedOptions.forEach((g) => {
              g.selected.forEach((s) => (itemOptionsTotal += s.price * s.quantity))
            })

            selectionTotal += freshBasePrice * addedItem.quantity + itemOptionsTotal

            freshAddedItems.push({
              ...addedItem,
              basePrice: freshBasePrice,
              selectedOptions: freshSelectedOptions,
            })
          })

          if (freshAddedItems.length) {
            selections.push({ ...sel, addedItems: freshAddedItems })
          }
        })
      }

      return {
        ...freshOfferDef,
        _id: freshOfferDef._id,
        offerId: freshOfferDef._id,
        basePrice: freshOfferDef.price,
        selectionTotalPrice: selectionTotal,
        totalPrice: Number(freshOfferDef.price || 0) + selectionTotal,
        quantity: 1,
        selections,
      }
    })
    .filter(Boolean)

  emits('repeat-order', { items, offersItems })
  emits('close')
  init({ message: 'Order items added to basket', color: 'success' })
}

const addItemsToOrder = async (orderId) => {
  await restoreFullOrder(orderId)
  emits('close')
  init({ message: 'Order set to edit mode. Add new items.', color: 'success' })
}

const switchOrderType = async (orderId) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  const isDelivery = order.orderType === 'Delivery'
  const newType = isDelivery ? 'Takeaway' : 'Delivery'
  const action = 'add'

  const payload = {
    orderTypeChange: {
      to: newType,
    },
  }

  if (!isDelivery) {
    pendingSwitchOrderId.value = orderId
    addressModalCustomer.value = props.customer
    showAddressModal.value = true
    return
  }

  isLoading.value = true
  try {
    await applyOrderEdit(orderId, action, order.tableNumber, payload)
    fetchOrders()
  } catch {}
}

const handleAddressSelection = async (addr) => {
  if (!pendingSwitchOrderId.value) return

  isLoading.value = true

  const order = orders.value.find((o) => o._id === pendingSwitchOrderId.value)
  if (!order) return

  const streetPart = [addr.streetName, addr.streetNo].filter((val) => val && String(val).trim()).join(' ')
  const locationPart = [addr.district, addr.city].filter((val) => val && String(val).trim()).join(', ')
  const buildingPart = [addr.aptNo ? `Apt ${addr.aptNo}` : '', addr.floor ? `Floor ${addr.floor}` : '']
    .filter((val) => val && String(val).trim())
    .join(', ')

  const fullParts = [buildingPart, streetPart, locationPart, addr.postCode].filter((val) => val && String(val).trim())
  const fullAddress = fullParts.join(', ')

  const zip = addr.postCode || addr.postalCode || ''
  const designation = addr.designation || ''

  let fee = props.deliveryFee || 0

  if (props.deliveryZoneOptions && props.deliveryZoneOptions.length) {
    let zone = props.deliveryZoneOptions.find(
      (z) => z.postalCodes && z.postalCodes.some((pc) => String(pc).trim() === String(zip).trim()),
    )

    if (!zone && (designation.includes('Meeting') || designation.includes('M.P'))) {
      zone = props.deliveryZoneOptions.find(
        (z) => z.meetingPoints && z.meetingPoints.some((mp) => designation.includes(mp.designation)),
      )
    }

    if (zone && typeof zone.deliveryCharge === 'number') {
      fee = zone.deliveryCharge
    }
  }

  const c = props.customer || {}

  const payload = {
    action: 'add',
    orderTypeChange: {
      to: 'Delivery',
      deliveryFee: fee,
    },
    entity: {
      Code: c.Code,
      Name: c.Name || c.name || c.customerName,
      TaxPayerID: c.TaxPayerID || '',
      Phone: c.Phone || c.MobilePhone || c.phoneNo,
      Address: fullAddress,
      ZipCode: zip,
      DeliveryNote: addr.deliveryNote || '',
    },
  }

  try {
    await applyOrderEdit(pendingSwitchOrderId.value, 'add', order.tableNumber, payload)
    fetchOrders()
    showAddressModal.value = false
    pendingSwitchOrderId.value = null
  } catch (e) {
    console.error(e)
  }
}

const openReschedule = (order) => {
  pendingRescheduleOrderId.value = order._id

  if (order.orderDateTime) {
    const d = new Date(order.orderDateTime)
    const offset = d.getTimezoneOffset() * 60000
    const local = new Date(d.getTime() - offset)
    rescheduleDateTime.value = local.toISOString().slice(0, 16)
  } else {
    rescheduleDateTime.value = ''
  }

  showRescheduleModal.value = true
}

const saveReschedule = async () => {
  if (!pendingRescheduleOrderId.value || !rescheduleDateTime.value) return

  isLoading.value = true
  showRescheduleModal.value = false

  try {
    const payload = {
      orderDateTime: new Date(rescheduleDateTime.value).toISOString(),
    }
    await axios.patch(`${url}/orders/${pendingRescheduleOrderId.value}/schedule`, payload)
    init({ message: 'Order rescheduled successfully', color: 'success' })
    fetchOrders()
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || 'Failed to reschedule'
    init({ message: msg, color: 'danger' })
    isLoading.value = false
  }
}
</script>

<style scoped>
.order-card {
  background: #fff;
  border: 1px solid #eee;
  transition: all 0.2s ease-in-out;
  overflow: hidden;
}

.opt {
  font-size: 11px;
}
.future-ribbon {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 65px;
  background-color: #16a34a;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  letter-spacing: 0.5px;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.2);
  z-index: 20;
  pointer-events: none;
}

.future-ribbon span {
  display: block;
  text-align: center;
  line-height: 18px;
}
.hover\:bg-gray-50:hover {
  background-color: #f9f9f9;
}
</style>
