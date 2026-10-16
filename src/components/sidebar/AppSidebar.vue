<template>
  <VaSidebar
    v-model="writableVisible"
    :width="sidebarWidth"
    :color="color"
    minimized-width="0"
    class="flex flex-col justify-between"
  >
    <VaAccordion class="mt-5 pl-5 flex-1 overflow-y-auto">
      <!-- Call Center -->
      <div v-if="userRole !== 'editor'" class="flex flex-col gap-y-1 mb-2">
        <span
          class="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wide text-xs cursor-pointer py-1 rounded-lg hover:bg-slate-50 transition -ml-2 mr-2 pl-2 pr-2"
          @click="callCenterOpen = !callCenterOpen"
        >
          Call Center
          <VaIcon :name="callCenterOpen ? 'expand_less' : 'expand_more'" />
        </span>

        <Transition name="fade">
          <div v-if="callCenterOpen" class="flex flex-col gap-y-1">
            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'callCenters'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/callCenters"
            >
              <VaIcon name="headset_mic" class="mr-2" />
              Call Center
            </RouterLink>
          </div>
        </Transition>
      </div>

      <!-- Scheduled Orders -->
      <div v-if="userRole !== 'editor'" class="flex flex-col gap-y-1 mb-2">
        <span
          class="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wide text-xs cursor-pointer py-1 rounded-lg hover:bg-slate-50 transition -ml-2 mr-2 pl-2 pr-2"
          @click="scheduledOrdersOpen = !scheduledOrdersOpen"
        >
          Scheduled Orders
          <VaIcon :name="scheduledOrdersOpen ? 'expand_less' : 'expand_more'" />
        </span>

        <Transition name="fade">
          <div v-if="scheduledOrdersOpen" class="flex flex-col gap-y-1">
            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'scheduledOrders'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/scheduledOrders"
            >
              <VaIcon name="schedule" class="mr-2" />
              Scheduled Orders
            </RouterLink>
          </div>
        </Transition>
      </div>

      <!-- Menu -->
      <div v-if="userRole !== 'caller'" class="flex flex-col gap-y-1 mb-2">
        <span
          class="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wide text-xs cursor-pointer py-1 rounded-lg hover:bg-slate-50 transition -ml-2 mr-2 pl-2 pr-2"
          @click="menuOpen = !menuOpen"
        >
          Menu
          <VaIcon :name="menuOpen ? 'expand_less' : 'expand_more'" />
        </span>

        <Transition name="fade">
          <div v-if="menuOpen" class="flex flex-col gap-y-1">
            <RouterLink
              v-if="userRole !== 'supervisor'"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'organizeMenu'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/organizeMenu"
            >
              <VaIcon name="drag_indicator" class="mr-2" />
              Sort Menu
            </RouterLink>

            <RouterLink
              v-if="userRole !== 'supervisor'"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'categories'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/categories"
            >
              <VaIcon name="mso-subheader" class="mr-2" />
              Categories
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'articles'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/articles"
            >
              <VaIcon name="fastfood" class="mr-2" />
              Articles
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                ['articlesOptionsGroups', 'articlesOptionsList'].includes($route.name)
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              :to="userRole === 'supervisor' ? '/articlesOptions/list' : '/articlesOptions/groups'"
            >
              <VaIcon name="mso-toggle_on" class="mr-2" />
              Article Options
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'offers'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/offers"
            >
              <VaIcon name="mso-award_meal" class="mr-2" />
              Offers
            </RouterLink>

            <RouterLink
              v-if="['admin', 'super-admin', 'supervisor'].includes(userRole)"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'offerGiftRules'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/offerGiftRules"
            >
              <VaIcon name="mso-redeem" class="mr-2" />
              Offer Gift Rules
            </RouterLink>

            <RouterLink
              v-if="userRole !== 'supervisor'"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'promotions'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/promotions"
            >
              <VaIcon name="mso-percent_discount" class="mr-2" />
              Promotions
            </RouterLink>

            <RouterLink
              v-if="userRole !== 'supervisor'"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'allergens'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/allergens"
            >
              <VaIcon name="mso-egg" class="mr-2" />
              Allergens
            </RouterLink>

            <RouterLink
              v-if="userRole !== 'supervisor'"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'deletedArticles'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/deletedArticles"
            >
              <VaIcon name="mso-delete" class="mr-2" />
              Deleted Articles
            </RouterLink>
          </div>
        </Transition>
      </div>

      <!-- Loyalty -->
      <div v-if="userRole.includes('admin')" class="flex flex-col gap-y-1 mb-2">
        <span
          class="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wide text-xs cursor-pointer py-1 rounded-lg transition relative -ml-2 mr-2 pl-2 pr-2 hover:bg-slate-50"
          @click="loyaltyOpen = !loyaltyOpen"
        >
          <!-- Left accent visible only when expanded -->
          <span v-if="loyaltyOpen" class="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-g-600"></span>

          Loyalty
          <VaIcon :name="loyaltyOpen ? 'expand_less' : 'expand_more'" />
        </span>

        <Transition name="fade">
          <div v-if="loyaltyOpen" class="flex flex-col gap-y-1">
            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'loyaltyMembers'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/loyalty/members"
            >
              <VaIcon name="mso-account_circle" class="mr-2" />
              Members
            </RouterLink>

            <!-- Global all-outlets settings — super-admin only; outlet managers
                 use the Loyalty section in their outlet configuration instead. -->
            <RouterLink
              v-if="userRole === 'super-admin'"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'loyaltySettings'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/loyalty/settings"
            >
              <VaIcon name="redeem" class="mr-2" />
              Settings
            </RouterLink>
          </div>
        </Transition>
      </div>

      <!-- Customer App (announcements) — the backend's staff roles: editors
           compose drafts, admins publish / schedule / push. -->
      <div v-if="['admin', 'super-admin', 'editor'].includes(userRole)" class="flex flex-col gap-y-1 mb-2">
        <span
          class="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wide text-xs cursor-pointer py-1 rounded-lg transition relative -ml-2 mr-2 pl-2 pr-2 hover:bg-slate-50"
          @click="customerAppOpen = !customerAppOpen"
        >
          <span v-if="customerAppOpen" class="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-g-600"></span>

          {{ t('customerApp.group') }}
          <VaIcon :name="customerAppOpen ? 'expand_less' : 'expand_more'" />
        </span>

        <Transition name="fade">
          <div v-if="customerAppOpen" class="flex flex-col gap-y-1">
            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'announcements'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/announcements"
            >
              <VaIcon name="campaign" class="mr-2" />
              {{ t('customerApp.announcements') }}
            </RouterLink>
          </div>
        </Transition>
      </div>

      <!-- E-shop (POW: outlet.eshopFulfilment) — only for an outlet that has an
           e-shop, and for a super-admin on any outlet (who writes the first
           settings). Settings are admin-only; stock and weights are readable
           by supervisors too (the backend's roles). -->
      <div v-if="eshopVisible" class="flex flex-col gap-y-1 mb-2">
        <span
          class="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wide text-xs cursor-pointer py-1 rounded-lg transition relative -ml-2 mr-2 pl-2 pr-2 hover:bg-slate-50"
          @click="eshopOpen = !eshopOpen"
        >
          <span v-if="eshopOpen" class="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-g-600"></span>

          {{ t('eshop.nav.group') }}
          <VaIcon :name="eshopOpen ? 'expand_less' : 'expand_more'" />
        </span>

        <Transition name="fade">
          <div v-if="eshopOpen" class="flex flex-col gap-y-1">
            <!-- Orders and stock holds: admins and supervisors (resolving an Exception is admin-only on the page) -->
            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'eshopOrders'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/eshop/orders"
            >
              <VaIcon name="mso-receipt_long" class="mr-2" />
              {{ t('eshop.nav.orders') }}
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'eshopHolds'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/eshop/holds"
            >
              <VaIcon name="mso-lock_clock" class="mr-2" />
              {{ t('eshop.nav.holds') }}
            </RouterLink>

            <RouterLink
              v-if="userRole.includes('admin')"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'eshopSettings'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/eshop/settings"
            >
              <VaIcon name="mso-tune" class="mr-2" />
              {{ t('eshop.nav.settings') }}
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'eshopStock'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/eshop/stock"
            >
              <VaIcon name="mso-inventory_2" class="mr-2" />
              {{ t('eshop.nav.stock') }}
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'eshopWeights'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/eshop/weights"
            >
              <VaIcon name="mso-weight" class="mr-2" />
              {{ t('eshop.nav.weights') }}
            </RouterLink>

            <!-- Courier fees (saving: admins) and delivery costs: admins and supervisors -->
            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'eshopRates'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/eshop/courier-fees"
            >
              <VaIcon name="mso-local_shipping" class="mr-2" />
              {{ t('eshop.nav.rates') }}
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'eshopShipping'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/eshop/delivery-costs"
            >
              <VaIcon name="mso-request_quote" class="mr-2" />
              {{ t('eshop.nav.shipping') }}
            </RouterLink>

            <!-- Fetch marketplace feed (its settings and keys): admins -->
            <RouterLink
              v-if="userRole.includes('admin')"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'eshopFetch'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/eshop/fetch"
            >
              <VaIcon name="mso-sync_alt" class="mr-2" />
              {{ t('eshop.nav.fetch') }}
            </RouterLink>

            <!-- Prepaid codes (ContentCard): settings and the ContentCard access — admins -->
            <RouterLink
              v-if="userRole.includes('admin')"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'eshopPrepaid'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/eshop/prepaid-codes"
            >
              <VaIcon name="mso-card_giftcard" class="mr-2" />
              {{ t('eshop.nav.prepaid') }}
            </RouterLink>
          </div>
        </Transition>
      </div>

      <!-- Configuration -->
      <div v-if="userRole.includes('admin') || userRole === 'supervisor'" class="flex flex-col gap-y-1 mb-2">
        <span
          class="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wide text-xs cursor-pointer py-1 rounded-lg hover:bg-slate-50 transition -ml-2 mr-2 pl-2 pr-2"
          @click="configOpen = !configOpen"
        >
          Configuration
          <VaIcon :name="configOpen ? 'expand_less' : 'expand_more'" />
        </span>

        <Transition name="fade">
          <div v-if="configOpen" class="flex flex-col gap-y-1">
            <span
              v-if="userRole !== 'supervisor'"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2 cursor-pointer',
                $route.name === 'update-outlet'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              @click="goToOutlet"
            >
              <VaIcon name="storefront" class="mr-2"></VaIcon>
              Outlet
            </span>

            <RouterLink
              v-if="userRole !== 'supervisor'"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'outletUsers'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/outletUsers"
            >
              <VaIcon name="people" class="mr-2" />
              Outlet Users
            </RouterLink>

            <RouterLink
              v-if="userRole !== 'supervisor'"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'areas'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/areas"
            >
              <VaIcon name="deck" class="mr-2"></VaIcon>
              Areas
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'deliveryZone'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/deliveryZone"
            >
              <VaIcon name="location_on" class="mr-2"></VaIcon>
              Delivery Zones
            </RouterLink>

            <RouterLink
              v-if="userRole !== 'supervisor'"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'payments'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/payments"
            >
              <VaIcon name="credit_card" class="mr-2"></VaIcon>
              Payments
            </RouterLink>

            <RouterLink
              v-if="userRole.includes('admin')"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'employees'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/employees"
            >
              <VaIcon name="badge" class="mr-2"></VaIcon>
              Employees
            </RouterLink>

            <RouterLink
              v-if="userRole.includes('admin')"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'officeCustomers'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/officeCustomers"
            >
              <VaIcon name="apartment" class="mr-2"></VaIcon>
              Office Customers
            </RouterLink>

            <RouterLink
              v-if="userRole !== 'supervisor'"
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'callCenterLogs'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/callCenterLogs"
            >
              <VaIcon name="assignment" class="mr-2" />
              CC Logs
            </RouterLink>

            <span
              v-if="userRole !== 'supervisor'"
              class="flex items-center py-1 rounded-lg mr-2 pl-2 -ml-2 text-slate-400 cursor-not-allowed"
              title="Coming Soon"
            >
              <VaIcon name="qr_code_scanner" class="mr-2"></VaIcon>
              QR Codes
            </span>

            <span
              v-if="userRole !== 'supervisor'"
              class="flex items-center py-1 rounded-lg mr-2 pl-2 -ml-2 text-slate-400 cursor-not-allowed"
              title="Coming Soon"
            >
              <VaIcon name="mso-globe" class="mr-2"></VaIcon>
              Languages
            </span>
          </div>
        </Transition>
      </div>

      <!-- Admin -->
      <div v-if="userRole === 'super-admin'" class="flex flex-col gap-y-1 mt-1">
        <span
          class="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wide text-xs cursor-pointer py-1 rounded-lg hover:bg-slate-50 transition -ml-2 mr-2 pl-2 pr-2"
          @click="adminOpen = !adminOpen"
        >
          Admin
          <VaIcon :name="adminOpen ? 'expand_less' : 'expand_more'" />
        </span>

        <Transition name="fade">
          <div v-if="adminOpen" class="flex flex-col gap-y-1">
            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'list' || $route.name === 'admin-update-outlet'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/outlets/list"
            >
              <VaIcon name="storefront" class="mr-2" />
              Outlets
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'stellaUsers'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700',
              ]"
              to="/stellaUsers"
            >
              <VaIcon name="people" class="mr-2" />
              Users
            </RouterLink>
          </div>
        </Transition>
      </div>
    </VaAccordion>

    <div class="px-4 py-1 text-[11px] text-slate-500 text-center">Stella 1.139</div>
  </VaSidebar>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useColors, useToast } from 'vuestic-ui'
import { useI18n } from 'vue-i18n'
import { useUsersStore } from '@/stores/users'
import { useServiceStore } from '@/stores/services'
import { useEshopOutlet } from '@/composables/useEshopOutlet'

export default defineComponent({
  name: 'Sidebar',
  props: {
    visible: { type: Boolean, default: true },
    mobile: { type: Boolean, default: false },
  },
  emits: ['update:visible'],
  setup(props, { emit }) {
    const userRole = ref('')
    const userStore = useUsersStore()
    const servicesStore = useServiceStore()
    const { init } = useToast()
    const { t } = useI18n()

    userStore.getUser().then((response) => {
      userRole.value = response.data.role
    })

    const { getColor } = useColors()
    const writableVisible = computed({
      get: () => props.visible,
      set: (v: boolean) => emit('update:visible', v),
    })

    const sidebarWidth = computed(() => (props.mobile ? '100vw' : '200px'))
    const color = computed(() => getColor('background-secondary'))

    // Collapsible states
    const callCenterOpen = ref(true)
    const scheduledOrdersOpen = ref(true)
    const menuOpen = ref(true)
    const loyaltyOpen = ref(false)
    const customerAppOpen = ref(false)
    const configOpen = ref(true)
    const adminOpen = ref(true)

    // E-shop: the navbar outlet has one (outlet.eshopFulfilment), or a
    // super-admin, on any outlet. Collapsed unless an E-shop page is open.
    const route = useRoute()
    const { hasEshop } = useEshopOutlet()
    const eshopVisible = computed(
      () => userRole.value === 'super-admin' || (['admin', 'supervisor'].includes(userRole.value) && hasEshop.value),
    )
    const eshopOpen = ref(false)
    watch(
      () => route.name,
      (name) => {
        if (String(name || '').startsWith('eshop')) eshopOpen.value = true
      },
      { immediate: true },
    )

    return {
      userRole,
      writableVisible,
      sidebarWidth,
      color,
      servicesStore,
      callCenterOpen,
      scheduledOrdersOpen,
      menuOpen,
      loyaltyOpen,
      customerAppOpen,
      configOpen,
      adminOpen,
      eshopVisible,
      eshopOpen,
      init,
      t,
    }
  },
  methods: {
    goToOutlet() {
      if (this.servicesStore.selectedRest) {
        this.$router.push('/outlets/update/' + this.servicesStore.selectedRest)
      } else {
        this.init({
          message: 'Please select outlet from top navigation bar.',
          color: 'danger',
        })
      }
    },
  },
})
</script>
