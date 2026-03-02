<template>
  <VaNavbar class="app-layout-navbar py-2 px-0">
    <template #left>
      <div class="left">
        <Transition name="icon-fade" mode="out-in">
          <VaIconMenuCollapsed
            class="cursor-pointer"
            :class="{ 'x-flip': !isSidebarMinimized }"
            :color="collapseIconColor"
            @click="GlobalStore.toggleSidebar()"
          />
        </Transition>
        <RouterLink to="/" aria-label="Visit home page">
          <VuesticLogo />
        </RouterLink>
      </div>
    </template>
    <template #right>
      <div class="flex items-center gap-3">
        <!-- Language picker (only when outlet has multiple languages) -->
        <div
          v-if="outletLanguages.length > 1"
          class="relative"
        >
          <select
            v-model="selectedLanguage"
            class="lang-select appearance-none pl-3 pr-7 py-1.5 rounded-xl text-sm font-semibold uppercase bg-white/60 border border-slate-200 shadow-sm hover:shadow-md hover:bg-white/80 backdrop-blur-md transition-all duration-200 cursor-pointer text-slate-700 focus:outline-none"
          >
            <option v-for="lang in outletLanguages" :key="lang" :value="lang">
              {{ lang.toUpperCase() }}
            </option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        <VaSelect
          v-model="selectedRest"
          :options="restOptions"
          placeholder="Select restaurant"
          searchable
          highlight-matched-text
          class="rest-select"
        />

        <AppNavbarActions class="app-navbar__actions" :is-mobile="isMobile" />
      </div>
    </template>
  </VaNavbar>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useColors } from 'vuestic-ui'
import { useI18n } from 'vue-i18n'
import VaIconMenuCollapsed from '../icons/VaIconMenuCollapsed.vue'
import { storeToRefs } from 'pinia'
import { useGlobalStore } from '../../stores/global-store'
import AppNavbarActions from './components/AppNavbarActions.vue'
import VuesticLogo from '../VuesticLogo.vue'
import { useServiceStore } from '../../stores/services'
import { useRoute } from 'vue-router'
const route = useRoute()
const servicesStore = useServiceStore()
defineProps({
  isMobile: { type: Boolean, default: false },
})

const { locale } = useI18n()
const GlobalStore = useGlobalStore()

const selectedRest = ref('')
const restOptions = ref([])
const restlist = ref([])
const { isSidebarMinimized } = storeToRefs(GlobalStore)
const { getColor } = useColors()

// Language selector
const outletLanguages = computed(() => {
  const details = servicesStore.restDetails as any
  if (details && Array.isArray(details.supportedLanguages) && details.supportedLanguages.length) {
    return details.supportedLanguages
  }
  return ['en']
})
const selectedLanguage = ref(locale.value || 'en')
watch(selectedLanguage, (lang) => { locale.value = lang })
// When outlet changes, sync locale to first supported language
watch(outletLanguages, (langs) => {
  if (langs.length && !langs.includes(selectedLanguage.value)) {
    selectedLanguage.value = langs[0]
  }
})

const collapseIconColor = computed(() => getColor('secondary'))
const getOutlets = () => {
  servicesStore.getAll().then(() => {
    restlist.value = servicesStore.items
    restOptions.value = servicesStore.items.map((e) => e.name).sort((a, b) => a.localeCompare(b))

    const storedRest = sessionStorage.getItem('selectedRest')
    if (storedRest) {
      const found = servicesStore.items.find((a) => a._id === storedRest)
      if (found) {
        selectedRest.value = found.name
        servicesStore.setRest(found._id)
        servicesStore.setResDetails(found)
      }
    } else {
      selectedRest.value = servicesStore.items[0].name
      servicesStore.setRest(servicesStore.items[0]._id)
      servicesStore.setResDetails(servicesStore.items)
    }
  })
}
getOutlets()

watch(
  () => servicesStore.selectedRest,
  () => {
    selectedRest.value = restlist.value.find((a) => a._id === servicesStore.selectedRest).name
    servicesStore.setResDetails(restlist.value.find((a) => a._id === servicesStore.selectedRest))
  },
)
watch(
  () => route.name,
  () => {
    getOutlets()
  },
)

watch(selectedRest, (newValue) => {
  const foundRest = restlist.value.find((a) => a.name === newValue)
  if (foundRest) {
    servicesStore.setResDetails(foundRest)
    servicesStore.setRest(foundRest._id)
    sessionStorage.setItem('selectedRest', foundRest._id)
  }
})
</script>

<style lang="scss" scoped>
.va-navbar {
  z-index: 2;

  @media screen and (max-width: 950px) {
    .left {
      width: 100%;
    }

    .app-navbar__actions {
      display: flex;
      justify-content: space-between;
    }
  }
}

.left {
  display: flex;
  align-items: center;
  margin-left: 1rem;

  & > * {
    margin-right: 1rem;
  }

  & > *:last-child {
    margin-right: 0;
  }
}

.icon-fade-enter-active,
.icon-fade-leave-active {
  transition: transform 0.5s ease;
}

.icon-fade-enter,
.icon-fade-leave-to {
  transform: scale(0.5);
}
.x-flip {
  transform: scaleX(-100%);
}

.rest-select {
  min-width: 220px;

  /* Outer wrapper */
  ::v-deep(.va-select) {
    border-radius: 0.75rem !important; /* rounded-xl */
    border: 1px solid #e2e8f0 !important; /* slate-200 */
    background-color: rgba(255, 255, 255, 0.6) !important; /* bg-white/60 */
    backdrop-filter: blur(12px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease-in-out;

    &:hover {
      background-color: rgba(255, 255, 255, 0.75) !important;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
    }
  }

  /* Input field inside the select */
  ::v-deep(.va-input-wrapper__field) {
    border: none !important;
    background: transparent !important;
    padding: 0.45rem 0.75rem;
    font-weight: 500;
    color: #1e293b !important; /* slate-800 */
  }

  /* Placeholder and dropdown content */
  ::v-deep(.va-select__content) {
    color: #334155 !important; /* slate-700 */
  }

  /* Clear icon (optional: hide it) */
  ::v-deep(.va-select__clear-icon) {
    display: none !important;
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    ::v-deep(.va-select) {
      background-color: rgba(30, 41, 59, 0.6) !important; /* dark:bg-slate-800/60 */
      border-color: #475569 !important; /* dark:border-slate-700 */
    }

    ::v-deep(.va-select__content),
    ::v-deep(.va-input-wrapper__field) {
      color: #f1f5f9 !important; /* slate-100 */
    }
  }
}
</style>
