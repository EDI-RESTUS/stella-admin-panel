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
                (
                  (index === 0 && ['kds','preparing'].includes(String(orderStatuses || '').toLowerCase())) ||
                  order.orderFor === 'future'
                )                
              "
              size="small"
              class="flex items-center gap-1 rounded-full text-white px-2 py-2 font-semibold text-xs cursor-pointer bg-green-600 hover:bg-green-700 transition-colors"
              @click.stop="openConfirm('add', order._id)"
            >
              <Plus class="w-4 h-4" /> Add Items
            </span>

            <!-- Cancel Order: allow for ANY Completed row, or the latest KDS/preparing/onrack -->
            <span
              v-if="
                !isCancelled(order, index) &&
                (
                  (index === 0 && ['kds','preparing','onrack', 'in progress'].includes(String(orderStatuses || '').toLowerCase())) ||
                  order.status === 'Completed' ||
                  order.status === 'In Progress'
                )
              "
              size="small"
              class="flex items-center gap-1 rounded-full text-white px-2 py-2 font-semibold text-xs cursor-pointer bg-red-600 hover:bg-red-700 transition-colors"
              @click.stop="openConfirm('cancel', order._id)"
            >
              <X class="w-4 h-4" /> Cancel Order
            </span>

            <!-- Switch Order Type -->
            <span
              v-if="
                !isCancelled(order, index) &&
                (
                  (index === 0 && ['kds','preparing','onrack', 'in progress'].includes(String(orderStatuses || '').toLowerCase())) ||
                  order.status === 'In Progress'
                )
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
    index === 0 &&
    ['kds','preparing','onrack'].includes(String(orderStatuses || '').toLowerCase())
  "
  class="px-3 py-2 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1 transition-colors bg-yellow-500 text-white capitalize"
>
  <Loader2 class="w-3.5 h-3.5 animate-spin-slow" />
  {{ orderStatuses === 'onrack' ? 'On Rack' : orderStatuses }}
</span>

<span
  v-else
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
      (orderStatuses === 'kds' || orderStatuses === 'preparing' || orderStatuses === 'onrack' || orderStatuses === 'In Progress')) ||
      order.orderFor === 'future',
    'opacity-60 cursor-not-allowed':
      (index !== 0 ||
      isCancelled(order, index) ||
      !(orderStatuses === 'kds' || orderStatuses === 'preparing' || orderStatuses === 'onrack' || orderStatuses === 'In Progress')) &&
      order.orderFor !== 'future',
  }"
  @click="
    ((index === 0 &&
    !isCancelled(order, index) &&
    (orderStatuses === 'kds' || orderStatuses === 'preparing' || orderStatuses === 'onrack'|| orderStatuses === 'In Progress')) ||
    order.orderFor === 'future') &&
    toggleOfferSelection(order._id, idx)
  "
>
  <div
    v-if="
    (index !== 0 ||
      isCancelled(order, index) ||
      !(orderStatuses === 'kds' || orderStatuses === 'preparing' || orderStatuses === 'onrack' || orderStatuses === 'In Progress')) &&
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
          :key="addon.name"
          class="px-2 py-0.5 rounded-full"
          :class="{
            'bg-green-100 text-green-700': addon.type.toLowerCase() === 'extra',
            'bg-blue-100 text-blue-700': addon.type.toLowerCase() === 'article',
            'bg-red-100 text-red-700': addon.type.toLowerCase() === 'hold',
            'bg-amber-100 text-amber-700': addon.type.toLowerCase() === 'modifier',
          }"
        >
          {{ addon.name }}
          <span v-if="addon.price > 0">(€{{ addon.price.toFixed(2) }})</span>
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
                (index === 0 && (orderStatuses === 'kds' || orderStatuses === 'preparing' || orderStatuses === 'onrack')) || order.orderFor === 'future',
              'opacity-60 cursor-not-allowed':
                (index !== 0 ||
                !(orderStatuses === 'kds' || orderStatuses === 'preparing' || orderStatuses === 'onrack')) && order.orderFor !== 'future',
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
                {{ item.quantity }} x {{ item.menuItem }}
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
                    .filter((a) => a.selected) || []"
                  :key="addon.name"
                  class="px-2 py-0.5 rounded-full"
                  :class="{
                    'bg-green-100 text-green-700': addon.type.toLowerCase() === 'extra',
                    'bg-blue-100 text-blue-700': addon.type.toLowerCase() === 'article',
                    'bg-red-100 text-red-700': addon.type.toLowerCase() === 'hold',
                    'bg-amber-100 text-amber-700': addon.type.toLowerCase() === 'modifier',
                  }"
                >
                  {{ addon.name }}
                  <span v-if="addon.price > 0">(€{{ addon.price.toFixed(2) }})</span>
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
              :disabled="!hasSelectedForOrder(order._id) || (!['Completed', 'Cancelled'].includes(order.status) && order.orderFor !== 'future')"
              @click="openConfirm('remove', order._id)"
            >
              Remove
            </button>

            <button
              class="px-3 py-1 rounded-full bg-yellow-400 text-xs text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!hasSelectedForOrder(order._id) || (!['Completed', 'Cancelled'].includes(order.status) && order.orderFor !== 'future')"
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
    :delivery-zone-id="orders.find(o => o._id === pendingSwitchOrderId)?.deliveryZoneId"
    :is-selection-mode="true"
    @selectAddress="handleAddressSelection"
    @close="showAddressModal = false"
    @cancel="showAddressModal = false"
    @saved="fetchHistory()"
  />

  <!-- Reschedule Modal -->
  <VaModal
    v-model="showRescheduleModal"
    size="small"
    hide-default-actions
  >
    <div class="p-4">
      <h3 class="text-lg font-bold mb-4">Reschedule Future Order</h3>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">New Date & Time</label>
        <input 
          type="datetime-local" 
          v-model="rescheduleDateTime" 
          class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <button 
          class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          @click="showRescheduleModal = false"
        >
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
import { CopyPlus, NotepadText, TriangleAlert, X, Plus, CheckCircle, Loader2, XCircle, ArrowRightLeft } from 'lucide-vue-next'
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

const emits = defineEmits(['close'])

const liveStatus = ref(null)
const showAddNoteModal = ref(false)
const showComplaintModal = ref(false)
const selectedOrderId = ref(null)
const noteToEdit = ref(null)
const complaintToEdit = ref(null)

const showAddressModal = ref(false)
const addressModalCustomer = ref(null)
const pendingSwitchOrderId = ref(null)

// Reschedule state
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

// ---------- Small utils ----------
const eur = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });
const toNum = (v) => (v == null || v === '' ? 0 : Number(v));
const first = (...vals) => vals.find(v => toNum(v) > 0) ?? 0;
const titleize = (s = "") => s.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const idOf = (x) => x?._id || x?.id || x
const optId = (o) => o?.option?._id || o?.option?.id || o?.optionId || o?._id || o?.id || o?.option

const TYPE_LABELS = {
  TAKE_X_PAY_Y: "Take X Pay Y",
  PERCENTAGE_DISCOUNT: "Percentage Discount",
  VALUE_DISCOUNT: "Value Discount",
};

// ---------- Complaint / Note handlers ----------
const editComplaint = (orderId, text) => {
  showComplaintModal.value = false
  complaintToEdit.value = null
  setTimeout(() => {
    selectedOrderId.value = orderId
    complaintToEdit.value = { orderId, text }
    showComplaintModal.value = true
  }, 0)
}
const openComplaint = (orderId) => { selectedOrderId.value = orderId; complaintToEdit.value = null; showComplaintModal.value = true }
const openNote = (orderId, note) => { selectedOrderId.value = orderId; noteToEdit.value = note ? { orderId, text: note } : null; showAddNoteModal.value = true }

const handleComplaintSaved = async ({ orderId, text }) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (order) {
    await axios.patch(`${url}/orders/${orderId}/complaint`, { complaint: text })
    init({ message: 'Complaint updated successfully', color: 'success' })
    fetchOrders()
  }
}
const handleComplaintUpdated = handleComplaintSaved
const handleComplaintRemoved = async ({ orderId }) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (order) {
    await axios.patch(`${url}/orders/${orderId}/complaint`, { complaint: '' })
    init({ message: 'Complaint removed successfully', color: 'success' })
    fetchOrders()
  }
}

const handleNoteSaved = async ({ orderId, text }) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (order) {
    await axios.patch(`${url}/orders/${orderId}/note`, { note: text })
    init({ message: 'Note added successfully', color: 'success' })
    fetchOrders()
  }
}
const handleNoteUpdated = handleNoteSaved
const handleNoteRemoved = async ({ orderId }) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (order) {
    await axios.patch(`${url}/orders/${orderId}/note`, { note: '' })
    init({ message: 'Note removed successfully', color: 'success' })
    fetchOrders()
  }
}

// ---------- Confirm modal ----------
const openConfirm = (action, orderId) => {
  confirmAction.value = action
  confirmOrderId.value = orderId
  isConfirmOpen.value = true
}
const confirmYes = () => {
  if (!confirmAction.value || !confirmOrderId.value) return
  switch (confirmAction.value) {
    case 'remove': removeSelected(confirmOrderId.value); break
    case 'edit':   editSelected(confirmOrderId.value); break
    case 'repeat': repeatOrder(confirmOrderId.value); break
    case 'add':    addItemsToOrder(confirmOrderId.value); break
    case 'cancel': cancelOrder(confirmOrderId.value); break
    case 'switchType': switchOrderType(confirmOrderId.value); break
  }
  isConfirmOpen.value = false
}

// ---------- Selection helpers ----------
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
const isOfferSelected = (orderId, idx) => Array.isArray(selectedOfferItems[orderId]) && selectedOfferItems[orderId].includes(idx)
const hasSelectedForOrder = (orderId) =>
  (Array.isArray(selectedItems[orderId]) && selectedItems[orderId].length > 0) ||
  (selectedOfferItems[orderId] && selectedOfferItems[orderId].length)

// ---------- API wrapper ----------
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

// ---------- Delete (menu items + offers) ----------
const buildOrderMenuItemsPayload = (items) => {
  const menuItems = []

  for (const raw of Array.isArray(items) ? items : []) {
    // Prefer stable IDs from the spread menu item doc, then fall back
    const menuItemId =
      raw?._id || raw?.id || raw?.menuItemId ||
      (raw?.menuItem && (raw.menuItem._id || raw.menuItem.id)) ||
      raw?.menuItem

    // Guard against missing/label values
    if (!menuItemId || String(menuItemId).toLowerCase().includes('unknown')) continue

    let options = []

    // Case 1: history payload already has flat options [{ option, quantity, ... }]
    if (Array.isArray(raw?.options) && raw.options.length) {
      options = raw.options.map((op) => ({
        option: String(
          (op?.option && (op.option._id || op.option.id)) ||
          op?.optionId || op?._id || op?.id || op?.option
        ),
        quantity: Number(op?.quantity || 1),
      }))
    }
    // Case 2: UI-mapped structure -> groups -> articlesOptions with .selected flag
    else if (Array.isArray(raw?.articlesOptionsGroup)) {
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

  const menuIdxs  = (selectedItems[orderId] || []).slice()
  const offerIdxs = (selectedOfferItems[orderId] || []).slice()

  if (!menuIdxs.length && !offerIdxs.length) return

  // MENU ITEMS: delete each selected line (include options)
  for (const i of menuIdxs) {
    const line = order.menuItems?.[i]
    if (!line) continue
    const payload = buildOrderMenuItemsPayload([line]) // -> { menuItems: [ { menuItem, quantity, options[] } ] }
    if (payload.menuItems.length) {
      await applyOrderEdit(orderId, 'delete', order.tableNumber, payload)
    }
  }

  // OFFERS: delete whole offer by offerId (no items/options in payload)
  for (const j of offerIdxs) {
    const off = order.offerDetails?.[j]
    const oid = String(off?.offerId || off?._id || '')
    if (!oid) continue
    await applyOrderEdit(orderId, 'delete', order.tableNumber, {
      offerMenuItems: [{ offerId: oid, quantity: 1 }],
    })
  }

  // Reset selection + refresh
  selectedItems[orderId] = []
  selectedOfferItems[orderId] = []
  fetchOrders()
}

// ---------- Edit (stash originals + preload) ----------
const editSelected = async (orderId) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  const items = (selectedItems[orderId] || []).map((i) => order.menuItems[i]).filter(Boolean)
  const offersItems = (selectedOfferItems[orderId] || [])
    .map((i) => (order.offerDetails ? order.offerDetails[i] : null))
    .filter(Boolean)

  if (!items.length && !offersItems.length) return

  // ORIGINALS for later delete→add
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

  // Prefill cart with selected MENU items only
  const orderStore = useOrderStore()
  orderStore.resetEditOrder()
  orderStore.setCartItems([])

  const cartSeed = items.map((menuItem) => ({
    orderId,
    itemId: menuItem._id,
    itemName: menuItem.menuItem,
    basePrice: parseFloat(menuItem.price) || 0,
    totalPrice: 0,
    imageUrl: menuItem.imageUrl || '',
    promotionCode: menuItem.promotionCode || '',
    isRepeatedOrder: true,
    quantity: menuItem.quantity,
    isFree: !!menuItem.isFree,
    selectedOptions: (menuItem.articlesOptionsGroup || [])
      .map((group) => {
        const selected = (group.articlesOptions || [])
          .filter((opt) => opt && opt.selected)
          .map((opt) => ({
            ...opt,
            optionId: opt._id,
            optionName: opt.name,
            price: parseFloat(opt.price) || 0,
            type: opt.type,
            quantity: opt.quantity || 1,
          }))
        if (!selected.length) return null
        return {
          groupId: group._id,
          groupName: group.name,
          categoryId:
            menuItem.categories && menuItem.categories.length > 0
              ? menuItem.categories[0].id
              : null,
          menuItemId: menuItem._id,
          selected,
        }
      })
      .filter(Boolean),
  }))

  cartSeed.forEach((e) => {
    orderStore.addItemToCart(e)
    const newIndex = orderStore.cartItems.length - 1
    orderStore.calculateItemTotal(newIndex)
  })

  // Preload OFFERS visually
  if (offersItems.length) {
    offersItems.forEach((e) => {
      let selectionTotal = 0
      e.structuredOffer.selections.forEach((item) => {
        item.addedItems.forEach((addedItem) => {
          selectionTotal += (Number(addedItem.basePrice) || 0) * (Number(addedItem.quantity) || 1)
          ;(addedItem.selectedOptions || []).forEach((group) => {
            (group.selected || []).forEach((selection) => {
              selectionTotal += (Number(selection.price) || 0) * (Number(selection.quantity) || 1)
            })
          })
        })
      })
      orderStore.offersAdded({
        ...e.structuredOffer,
        _id: e.offerId,
        offerId: e.offerId,
        basePrice: e.structuredOffer.price,
        selectionTotalPrice: selectionTotal,
        totalPrice: Number(e.structuredOffer.price || 0) + selectionTotal,
        quantity: 1,
      })
    })
  }

  // Preview edit total
  const total =
    orderStore.cartItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0) +
    orderStore.offerItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)
  order.editOrderTotal = total

  // Attach _editContext for OrderDetails.vue (delete→add later)
  const orderForStore = {
    ...order,
    _editContext: {
      originalMenuItems,
      originalOffersToDelete,
    },
  }
  orderStore.addEditOrder(orderForStore)

  // Clear selections and close
  selectedItems[orderId] = []
  selectedOfferItems[orderId] = []
  emits('close')
}

// ---------- Cancel ----------
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

// ---------- Promo display (Type · €Value · %; hide % when 0) ----------
const getPromoForOrder = (order) => {
  if (!order) return null

  // ✅ Only show discount if the order actually has a promotionCode
  if (!order.promotionCode) return null

  const p = order.promotion || {}
  const typeKey = (p.type || order.discountType || '').toString()
  const typeName = TYPE_LABELS[typeKey] || (typeKey ? titleize(typeKey) : '')

  // Raw values from DB
  const discountValueRaw = toNum(first(order.discount, p.discountValue, order.discountAmount))
  const discountPercentRaw = toNum(first(order.discountPercentage, p.discountPercent))

  // If we only have a percent, derive value from the totals
  let discountValue = discountValueRaw
  if (discountValue <= 0 && discountPercentRaw > 0) {
    const gap = toNum(order.subtotal) + toNum(order.deliveryFee) - toNum(order.total)
    if (gap > 0) discountValue = gap
  }

  // If we still have nothing, don't show a row
  if (discountValue <= 0 && discountPercentRaw <= 0) return null

  // Build label: "Type · €Value · %"
  const parts = []
  if (typeName) parts.push(typeName)
  if (discountValue > 0) parts.push(eur.format(discountValue))
  if (discountPercentRaw > 0) parts.push(`${discountPercentRaw}%`)

  if (!parts.length) return null

  return {
    label: `Discount (${parts.join(' · ')})`,
    // Show a negative amount, e.g. "-€5.00"
    amount: discountValue > 0 ? eur.format(-Math.abs(discountValue)) : eur.format(0),
    detail: null,
  }
}


// ---------- Status / formatting ----------
const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const getPromisedTime = (createdAt, orderType) => {
  if (!createdAt) return 'N/A'
  const date = new Date(createdAt)
  if (orderType?.toLowerCase() === 'takeaway') date.setMinutes(date.getMinutes() + (props.takeawayPromiseTime || 0))
  else if (orderType?.toLowerCase() === 'delivery') date.setMinutes(date.getMinutes() + (props.deliveryPromiseTime || 0))
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
const getOrderSource = (source) => !source ? '' : (source === 'CC' ? 'Call Center' : source)
const getDisplayStatus = (order, index) => (index === 0 && liveStatus.value) ? liveStatus.value : order.status
const getDeliveryZoneName = (deliveryZoneId) => {
  if (!deliveryZoneId || !Array.isArray(props.deliveryZoneOptions)) return ''
  const zone = props.deliveryZoneOptions.find((z) => z._id === deliveryZoneId)
  return zone ? zone.name : ''
}

// ---------- Toggle accordion + reset selections ----------
const toggleOrder = (index) => {
  expandedIndex.value = (expandedIndex.value === index) ? null : index
  for (const key in selectedItems) delete selectedItems[key]
  for (const key in selectedOfferItems) delete selectedOfferItems[key]
}
const isCancelled = (order, index) => {
  const norm = (s) => String(s || '').trim().toLowerCase()
  const hist  = norm(order?.status)                              // Stella history
  const live  = index === 0 ? norm(liveStatus.value) : ''        // latest row live chip (if you use it)
  const coord = index === 0 ? norm(orderStatuses?.value ?? orderStatuses) : '' // coordinator code

  // treat any variant like "canceled"/"cancelled" as cancelled
  const saysCancel = (s) => s.startsWith('cancel')
  return [hist, live, coord].some(saysCancel)
}


// ---------- Stats / filters ----------
const showAll = ref(false)
const ordersToShow = computed(() => showAll.value ? orders.value : orders.value.slice(0, 5))
const orderStatuses = ref(null)

const periodStartDate = computed(() => {
  const today = new Date()
  let startDate = new Date(today)
  switch (selectedPeriod.value) {
    case '1 Month': startDate.setMonth(today.getMonth() - 1); break
    case '6 Months': startDate.setMonth(today.getMonth() - 6); break
    case '12 Months': startDate.setMonth(today.getMonth() - 12); break
    case 'All Time': startDate = new Date(0); break
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
  return { average: total / filteredOrders.value.length, avgItems: totalItems / filteredOrders.value.length }
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

// ---------- External status + orders ----------
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
      transformRequest: [(data, headers) => {
        if (headers && headers.hasOwnProperty('Authorization')) delete headers['Authorization']
        return data
      }],
    })
    orderStatuses.value = res.data?.statusCode ? res.data.statusCode.toLowerCase() : null
  } catch {
    orderStatuses.value = null
  }
}

const mapOfferDetailsToSelections = (offerDetailsResponse, detailedOfferPayload) => {
  const detailedSelections = JSON.parse(JSON.stringify(detailedOfferPayload.selections || []))
  const offerItems = offerDetailsResponse.offerItems || []
  const storeMenuItems = useMenuStore().categories.flatMap((a) => a.menuItems || [])

  offerItems.forEach((item) => {
    detailedSelections.forEach((selection) => {
      const matchedMenuItem = (selection.menuItems || []).find((mi) => mi.menuItemId === item.menuItem)
      if (matchedMenuItem) {
        const storeMenu = storeMenuItems.find((a) => a._id === item.menuItem)
        if (!storeMenu) return
        if (!selection.addedItems) selection.addedItems = []

        const optionIds = (item.options || []).map((a) => a.option)
        const articleOptionsGroup = (storeMenu.articlesOptionsGroup || []).filter((group) =>
          (group.articlesOptions || []).some((opt) => optionIds.includes(opt._id)),
        )

        if (selection.addedItems.length < (selection.max ?? Infinity)) {
          selection.addedItems.push({
            articlesOptionsGroups: storeMenu.articlesOptionsGroup,
            itemId: item.menuItem,
            quantity: item.quantity,
            imageUrl: storeMenu.imageUrl,
            itemDescription: storeMenu.description,
            basePrice: Number(item.price || 0).toFixed(2),
            itemName: item.name,
            code: item.code,
            selectedOptions: articleOptionsGroup.map((group) => ({
              groupId: group._id,
              groupName: group?.name,
              selected: (item.options || [])
                .filter((opt) => (group.articlesOptions || []).some((gOpt) => gOpt._id === opt.option))
                .map((opt) => ({
                  optionId: opt.option,
                  name: opt.name,
                  quantity: opt.quantity,
                  price: opt.price,
                  type: opt.type,
                })),
            })),
          })
        }
      }
    })
  })

  return { ...detailedOfferPayload, selections: detailedSelections }
}

const fetchOrders = async () => {
  const menuItems = useMenuStore()
  const orderStore = useOrderStore()
  try {
    const res = await axios.get(
      `${url}/orders/history?phone=${props.customer?.Phone}&page=1&limit=500&from=2025-01-01&status=Completed`,
    )
    if (res.data?.status === 'Success') {
      orders.value = res.data.data.items.map((order) => {
        const detailedOfferItems = (order.offerDetails || [])
          .map((offer) => {
            const offerItem = orderStore.offers.find((a) => a._id === offer.offerId)
            if (!offerItem) return ''
            const mappedData = mapOfferDetailsToSelections(offer, offerItem)
            return { orderOffer: offer, offerData: mappedData }
          })
          .filter(Boolean)
          .map((offer) => ({
            ...offer.orderOffer,
            structuredOffer: { ...offer.offerData },
          }))

        const detailedItems = (order.menuItems || []).map((item) => {
          const menuItem = menuItems.unFilteredMenuItems.find((mi) => mi._id === item.menuItem)
          return {
            ...item,
            menuItem: menuItem ? menuItem.name : 'Unknown Item',
            ...menuItem,
            articlesOptionsGroup: (menuItem?.articlesOptionsGroup || []).map((group) => ({
              ...group,
              articlesOptions:
                (group.articlesOptions || []).map((opt) => {
                  const optionDetails = (item.options || []).find((o) => o.option === opt._id)
                  return { ...opt, ...optionDetails, selected: !!optionDetails }
                }),
            })),
          }
        })

        return { ...order, menuItems: detailedItems, offerDetails: detailedOfferItems }
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

// ---------- Misc ----------
const getTheEmployeeName = (employeeId) => {
  const user = users.value.find((user) => user._id === employeeId)
  if (!user) return ''
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username
}
const getTotalPrice = (item) => {
  const hasOpts = !!(item.articlesOptionsGroup?.flatMap((a) => a.articlesOptions).filter((a) => a.selected).length)
  if (!hasOpts) return Number(item.price || 0).toFixed(2)
  const extra = item.articlesOptionsGroup
    .flatMap((a) => a.articlesOptions)
    .filter((a) => a.selected)
    .reduce((sum, opt) => sum + (Number(opt.price) || 0), 0)
  return (Number(item.price || 0) + extra).toFixed(2)
}

// ---------- Period stats ----------
const fetchUsers = async () => {
  try {
    const userStore = useUsersStore()
    const { data } = await userStore.getAll({
      page: 1, limit: 1000, search: '', sortBy: 'name', sortOrder: 'asc',
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

// Placeholder stubs (already exist elsewhere in your codebase)
const repeatOrder = async (orderId) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  const menuStore = useMenuStore()
  const orderStore = useOrderStore()

  // 1. Process Menu Items
  // We iterate history items, but we rebuild the cart item using the FRESH item from store
  const items = (order.menuItems || []).map((histItem) => {
    // histItem._id is the Menu Item ID (because fetchOrders merges store item properties)
    const freshItem = menuStore.unFilteredMenuItems.find((mi) => mi._id === histItem._id)
    
    // If item no longer exists in store, we might skip it or handle it. 
    // Here we skip gracefully or fall back? 
    // If detailedItems in fetchOrders succeeded, freshItem *should* exist. 
    // If it doesn't, we probably shouldn't add it to cart as it's discontinued.
    if (!freshItem) return null

    // Map historical option selection to fresh option data
    // We need to know WHICH options were selected. 
    // histItem.articlesOptionsGroup has the 'selected' flag from fetchOrders logic.
    const histOptionMap = new Map() // OptionID -> quantity
    if (histItem.articlesOptionsGroup) {
         histItem.articlesOptionsGroup.forEach(g => {
             (g.articlesOptions || []).forEach(opt => {
                 if (opt.selected) {
                     histOptionMap.set(opt._id, opt.quantity || 1)
                 }
             })
         })
    }

    const freshSelectedOptions = (freshItem.articlesOptionsGroup || [])
      .map((group) => {
        const selected = (group.articlesOptions || [])
          .filter((opt) => histOptionMap.has(opt._id)) // Only pick options that were selected in history
          .map((opt) => ({
            ...opt,
            optionId: opt._id,
            optionName: opt.name,
            price: parseFloat(opt.price) || 0, // USE FRESH PRICE
            type: opt.type,
            quantity: histOptionMap.get(opt._id) || 1, // Use historical quantity
          }))

        if (!selected.length) return null
        return {
          groupId: group._id,
          groupName: group.name,
          categoryId: freshItem.categories && freshItem.categories.length > 0
              ? freshItem.categories[0].id
              : null,
          menuItemId: freshItem._id,
          selected,
        }
      })
      .filter(Boolean)

    return {
      orderId,
      itemId: freshItem._id,
      itemName: freshItem.name,
      basePrice: parseFloat(freshItem.price) || 0, // USE FRESH BASE PRICE
      totalPrice: 0, // Will be recalc by store
      imageUrl: freshItem.imageUrl || '',
      promotionCode: freshItem.promotionCode || '',
      isRepeatedOrder: true,
      quantity: histItem.quantity,
      isFree: !!freshItem.isFree,
      selectedOptions: freshSelectedOptions,
    }
  }).filter(Boolean)

  // 2. Process Offers
  // Similar logic: find fresh offer definition from orderStore.offers
  const offersItems = (order.offerDetails || [])
    .map((histOffer) => {
      // Find fresh offer
      const freshOfferDef = orderStore.offers.find((o) => o._id === histOffer.offerId)
      if (!freshOfferDef) return null

      // We need to reconstruct the selections. 
      // histOffer.structuredOffer.selections (from fetchOrders) should effectively map to what we need, 
      // BUT we must ensure we use fresh prices.
      
      // Ideally, we re-run `mapOfferDetailsToSelections` but using the FRESH prices from `freshOfferDef`.
      // However, `mapOfferDetailsToSelections` takes the "offerDetails" response from history (which lacks prices or has old prices?) 
      // and looks up items in `storeMenuItems`.
      
      // Actually, `mapOfferDetailsToSelections` (lines 1225+) ALREADY looks up `useMenuStore`.
      // It sets `basePrice: Number(item.price || 0).toFixed(2)` where `item` comes from `offerDetailsResponse.offerItems`.
      // `offerDetailsResponse` IS `histOffer` (the history object).
      // So `mapOfferDetailsToSelections` uses the *historical configuration* of the offer (items list), 
      // but it looks up `storeMenu` (fresh) to get `articlesOptionsGroup`.
      
      // WAIT using `mapOfferDetailsToSelections`:
      // `const item = offerItems.find(...)` -> `offerItems` comes from `offerDetailsResponse` (History).
      // `item.price` (History) is used? `Number(item.price || 0)`. 
      // YES, `mapOfferDetailsToSelections` uses `item.price` from the history object!
      // This is why offers have old prices.
      
      // To fix offers, we must look up the price from the FRESH `freshOfferDef` items list, not the history one.
      
      // Let's re-map manually for safety and freshness.
      
      // 1. We have `freshOfferDef`. It has `offerItems` (definition with current override prices).
      // 2. We have `histOffer` (user's selection).
      
      let selectionTotal = 0
      
      // Get FRESH selections structure based on history choices
      const selections = []
      
       // Iterate over `structuredOffer.selections` (which tells us what the user picked: quantities, options)
      // `structuredOffer` was built by `mapOfferDetailsToSelections`.
      if (histOffer.structuredOffer && histOffer.structuredOffer.selections) {
          
          histOffer.structuredOffer.selections.forEach(sel => {
             // 'sel' corresponds to a Selection Group (e.g. "Select 2 Pizzas")
             // We need to map the addedItems
             
             const freshAddedItems = []
             
             sel.addedItems.forEach(addedItem => {
                 // addedItem.itemId is the menu item ID.
                 // Find this item in the FRESH offer definition to get the override price.
                 const freshOfferItemDef = freshOfferDef.offerItems.find(oi => oi.menuItem === addedItem.itemId)
                 
                 // If not in fresh offer, maybe it was removed? Skip.
                 if (!freshOfferItemDef) return 
                 
                 // Fresh override price (or 0 if not overridden? check definition)
                 const freshBasePrice = Number(freshOfferItemDef.price || 0)
                 
                 // Now options.
                 // addedItem.selectedOptions has the groups/selected structure.
                 // We need to recalculate option prices using FRESH menu item.
                 const freshMenuItem = menuStore.unFilteredMenuItems.find(m => m._id === addedItem.itemId)
                 if (!freshMenuItem) return

                 // Re-map options with fresh prices
                 const freshSelectedOptions = (addedItem.selectedOptions || []).map(group => {
                     const freshGroup = freshMenuItem.articlesOptionsGroup.find(g => g._id === group.groupId)
                     if (!freshGroup) return null
                     
                     const validSelections = (group.selected || []).map(s => {
                         const freshOpt = freshGroup.articlesOptions.find(o => o._id === s.optionId)
                         if (!freshOpt) return null
                         return {
                             ...s,
                             price: parseFloat(freshOpt.price) || 0, // FRESH
                         }
                     }).filter(Boolean)
                     
                     if (!validSelections.length) return null
                     return { ...group, selected: validSelections }
                 }).filter(Boolean)


                 // Calc total so we can pass it (though orderStore might recalc, better safe)
                 let itemOptionsTotal = 0
                 freshSelectedOptions.forEach(g => {
                     g.selected.forEach(s => itemOptionsTotal += (s.price * s.quantity))
                 })
                 
                 selectionTotal += (freshBasePrice * addedItem.quantity) + itemOptionsTotal

                 freshAddedItems.push({
                     ...addedItem,
                     basePrice: freshBasePrice, // Updated
                     selectedOptions: freshSelectedOptions
                 })
             })
             
             if (freshAddedItems.length) {
                 selections.push({ ...sel, addedItems: freshAddedItems })
             }
          })
      }
      
      return {
          ...freshOfferDef, // Use fresh definition (name, basePrice of offer itself)
          _id: freshOfferDef._id,
          offerId: freshOfferDef._id,
          basePrice: freshOfferDef.price, // Fresh base price of offer
          selectionTotalPrice: selectionTotal,
          totalPrice: Number(freshOfferDef.price || 0) + selectionTotal,
          quantity: 1,
          selections: selections // Our rebuilt selections
      }
    })
    .filter(Boolean)

  emits('repeat-order', { items, offersItems })
  emits('close')
  init({ message: 'Order items added to basket', color: 'success' })
}
const addItemsToOrder = (orderId) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  const orderStore = useOrderStore()
  
  // Reset and prepare edit context similar to editSelected
  orderStore.resetEditOrder()
  orderStore.setCartItems([])
  orderStore.offerItems = []
  orderStore.cartTotal = null
  orderStore.validation = null

  // Attach _editContext (empty for pure add) and set as editOrder
  const orderForStore = {
    ...order,
    editOrderTotal: order.totalAmount || 0, // Ensure this property exists as used in CheckOutModal
    _editContext: {
      originalMenuItems: [],
      originalOffersToDelete: [],
    },
  }
  orderStore.addEditOrder(orderForStore)

  emits('close')
  init({ message: 'Order set to edit mode. Add new items.', color: 'success' })
}

const switchOrderType = async (orderId) => {
  const order = orders.value.find((o) => o._id === orderId)
  if (!order) return

  const isDelivery = order.orderType === 'Delivery'
  const newType = isDelivery ? 'Takeaway' : 'Delivery'
  const action = 'add'

  let payload = {
    orderTypeChange: {
      to: newType,
    },
  }

  if (!isDelivery) {
    // Switching TO Delivery -> Open Modal for Address Selection
    pendingSwitchOrderId.value = orderId
    // Ensure we pass a customer object compatible with CustomerModal
    // It expects a 'selectedUser' prop (Record<string,string>) with Name, Phone, OtherAddresses
    addressModalCustomer.value = props.customer
    showAddressModal.value = true
    return
  }

  isLoading.value = true // Buffer: immediate feedback
  try {
     await applyOrderEdit(orderId, action, order.tableNumber, payload)
     fetchOrders()
  } catch(e) { /* handled primarily by applyOrderEdit toast but we ensure fetch runs or state resets */ }
}

const handleAddressSelection = async (addr) => {
  if (!pendingSwitchOrderId.value) return
  
  isLoading.value = true // Buffer: immediate feedback
  
  const order = orders.value.find((o) => o._id === pendingSwitchOrderId.value)
  if (!order) return

  // addr comes from CustomerModal address list item
  // format: { designation, floor, aptNo, streetName, streetNo, district, city, postCode, deliveryNote }
  
  const streetPart = [addr.streetName, addr.streetNo].filter(val => val && String(val).trim()).join(' ')
  const locationPart = [addr.district, addr.city].filter(val => val && String(val).trim()).join(', ')
  const buildingPart = [addr.aptNo ? `Apt ${addr.aptNo}` : '', addr.floor ? `Floor ${addr.floor}` : ''].filter(val => val && String(val).trim()).join(', ')

  const fullParts = [buildingPart, streetPart, locationPart, addr.postCode].filter(val => val && String(val).trim())
  const fullAddress = fullParts.join(', ')

  const zip = addr.postCode || addr.postalCode || ''
  const designation = addr.designation || ''
  
  // Calculate Delivery Fee based on Zone
  let fee = props.deliveryFee || 0 // Default fallback
  
  if (props.deliveryZoneOptions && props.deliveryZoneOptions.length) {
    // 1. Try Postal Code Match
    let zone = props.deliveryZoneOptions.find(z => 
      z.postalCodes && z.postalCodes.some(pc => String(pc).trim() === String(zip).trim())
    )
    
    // 2. Try Meeting Point Match if not found and looks like MP
    if (!zone && (designation.includes('Meeting') || designation.includes('M.P'))) {
       // Simple match by designation inclusion
       zone = props.deliveryZoneOptions.find(z => 
         z.meetingPoints && z.meetingPoints.some(mp => designation.includes(mp.designation))
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
      DeliveryNote: addr.deliveryNote || '', // If backend supports it on entity/update
    }
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

// ---------- Reschedule Logic ----------
const openReschedule = (order) => {
  pendingRescheduleOrderId.value = order._id
  
  if (order.orderDateTime) {
      const d = new Date(order.orderDateTime)
      // Format local ISO string for datetime-local input (YYYY-MM-DDTHH:mm)
      // We adjust for timezone offset manually to get local time string
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

    isLoading.value = true // Buffer
    showRescheduleModal.value = false // Close immediately to show buffer on list
    
    try {
        const payload = {
            orderDateTime: new Date(rescheduleDateTime.value).toISOString()
        }
        await axios.patch(`${url}/orders/${pendingRescheduleOrderId.value}/schedule`, payload)
        init({ message: 'Order rescheduled successfully', color: 'success' })
        fetchOrders() // Logic handles isLoading toggle
    } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to reschedule'
        init({ message: msg, color: 'danger' })
        isLoading.value = false // Reset if error
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