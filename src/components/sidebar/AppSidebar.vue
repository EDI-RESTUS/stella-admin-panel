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

        <transition name="fade">
          <div v-if="callCenterOpen" class="flex flex-col gap-y-1">
            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'callCenters'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
              ]"
              to="/callCenters"
            >
              <VaIcon name="headset_mic" class="mr-2" />
              Call Center
            </RouterLink>
          </div>
        </transition>
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

        <transition name="fade">
          <div v-if="menuOpen" class="flex flex-col gap-y-1">
            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'organizeMenu'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
              ]"
              to="/organizeMenu"
            >
              <VaIcon name="drag_indicator" class="mr-2" />
              Sort Menu
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'categories'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
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
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
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
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
              ]"
              to="/articlesOptions/groups"
            >
              <VaIcon name="mso-toggle_on" class="mr-2" />
              Article Options
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'offers'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
              ]"
              to="/offers"
            >
              <VaIcon name="mso-award_meal" class="mr-2" />
              Offers
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'promotions'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
              ]"
              to="/promotions"
            >
              <VaIcon name="mso-percent_discount" class="mr-2" />
              Promotions
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'allergens'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
              ]"
              to="/allergens"
            >
              <VaIcon name="mso-egg" class="mr-2" />
              Allergens
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'deletedArticles'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
              ]"
              to="/deletedArticles"
            >
              <VaIcon name="mso-delete" class="mr-2" />
              Deleted Articles
            </RouterLink>
          </div>
        </transition>
      </div>

      <!-- Loyalty -->
      <div v-if="userRole.includes('admin')" class="flex flex-col gap-y-1 mb-2">
        <span
  class="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wide text-xs cursor-pointer py-1 rounded-lg transition relative -ml-2 mr-2 pl-2 pr-2 hover:bg-slate-50"
  @click="loyaltyOpen = !loyaltyOpen"
>
  <!-- Left accent visible only when expanded -->
  <span
    v-if="loyaltyOpen"
    class="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-g-600"
  ></span>

  Loyalty
  <VaIcon :name="loyaltyOpen ? 'expand_less' : 'expand_more'" />
</span>


        <transition name="fade">
          <div v-if="loyaltyOpen" class="flex flex-col gap-y-1">
            <span
  class="flex items-center py-1 rounded-lg mr-2 pl-2 -ml-2 text-slate-400 cursor-not-allowed"
  title="Coming Soon"
>
  <VaIcon name="mso-account_circle" class="mr-2" />
  Members
</span>


            <span class="flex items-center py-1 rounded-lg mr-2 pl-2 -ml-2 text-slate-400 cursor-not-allowed"
  title="Coming Soon">
              <VaIcon name="redeem" class="mr-2" />
              Settings
            </span>
          </div>
        </transition>
      </div>

      <!-- Configuration -->
      <div v-if="userRole.includes('admin')" class="flex flex-col gap-y-1 mb-2">
        <span
          class="flex items-center justify-between font-bold text-slate-800 uppercase tracking-wide text-xs cursor-pointer py-1 rounded-lg hover:bg-slate-50 transition -ml-2 mr-2 pl-2 pr-2"
          @click="configOpen = !configOpen"
        >
          Configuration
          <VaIcon :name="configOpen ? 'expand_less' : 'expand_more'" />
        </span>

        <transition name="fade">
          <div v-if="configOpen" class="flex flex-col gap-y-1">
            <span
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2 cursor-pointer',
                $route.name === 'update-outlet'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
              ]"
              @click="goToOutlet"
            >
              <VaIcon name="storefront" class="mr-2"></VaIcon>
              Outlet
            </span>

            <RouterLink
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
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
              ]"
              to="/deliveryZone"
            >
              <VaIcon name="location_on" class="mr-2"></VaIcon>
              Delivery Zones
            </RouterLink>

            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'payments'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
              ]"
              to="/payments"
            >
              <VaIcon name="credit_card" class="mr-2"></VaIcon>
              Payments
            </RouterLink>

            <span
              class="flex items-center py-1 rounded-lg mr-2 pl-2 -ml-2 text-slate-400 cursor-not-allowed"
              title="Coming Soon"
            >
              <VaIcon name="qr_code_scanner" class="mr-2"></VaIcon>
              QR Codes
            </span>

            <span
              class="flex items-center py-1 rounded-lg mr-2 pl-2 -ml-2 text-slate-400 cursor-not-allowed"
              title="Coming Soon"
            >
              <VaIcon name="mso-globe" class="mr-2"></VaIcon>
              Languages
            </span>
          </div>
        </transition>
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

        <transition name="fade">
          <div v-if="adminOpen" class="flex flex-col gap-y-1">
            <RouterLink
              :class="[
                'flex items-center py-1 rounded-lg transition mr-2 pl-2 -ml-2',
                $route.name === 'list' || $route.name === 'admin-update-outlet'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
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
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
              ]"
              to="/stellaUsers"
            >
              <VaIcon name="people" class="mr-2" />
              Users
            </RouterLink>
          </div>
        </transition>
      </div>

    </VaAccordion>

    <div class="px-4 py-1 text-[11px] text-slate-500 text-center">
      Stella 1.139
    </div>
  </VaSidebar>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useColors, useToast } from 'vuestic-ui'
import { useUsersStore } from '@/stores/users'
import { useServiceStore } from '@/stores/services'

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
    const menuOpen = ref(true)
    const loyaltyOpen = ref(false)
    const configOpen = ref(true)
    const adminOpen = ref(true)

    return {
      userRole,
      writableVisible,
      sidebarWidth,
      color,
      servicesStore,
      callCenterOpen,
      menuOpen,
      loyaltyOpen,
      configOpen,
      adminOpen,
      init,
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
