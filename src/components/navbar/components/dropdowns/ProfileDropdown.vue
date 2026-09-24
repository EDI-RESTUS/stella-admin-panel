<template>
  <div class="profile-dropdown-wrapper">
    <VaDropdown v-model="isShown" :offset="[9, 0]" class="profile-dropdown" stick-to-edges>
      <template #anchor>
        <VaButton preset="secondary" color="textPrimary">
          <span class="profile-dropdown__anchor min-w-max">
            <slot />
            <VaAvatar
              :size="32"
              color="primary"
              class="font-bold text-white flex items-center justify-center uppercase profile-avatar"
            >
              {{ userInitials }}
            </VaAvatar>
          </span>
        </VaButton>
      </template>

      <VaDropdownContent
        class="profile-dropdown__content md:w-60 px-0 py-4 w-full"
        :style="{ '--hover-color': hoverColor }"
      >
        <VaList v-for="group in updatedOptions" :key="group.name">
          <header v-if="group.name" class="uppercase text-[var(--va-secondary)] opacity-80 font-bold text-xs px-4 mt-2">
            {{ group.name }}
          </header>

          <!-- Menu Items -->
          <VaListItem
            v-for="item in group.list"
            :key="item.name"
            class="menu-item text-base cursor-pointer h-8"
            v-bind="resolveLinkAttribute(item)"
            @click="onItemClick(item)"
            @keydown.enter="onItemClick(item)"
          >
            <VaIcon :name="item.icon" class="pr-1" color="secondary" />
            {{ t(`user.${item.name}`) }}
          </VaListItem>
          <VaListSeparator v-if="group.separator" class="mx-3 my-2" />
        </VaList>
      </VaDropdownContent>
    </VaDropdown>
    <ResetPasswordModal v-if="isChangePasswordOpen" @cancel="isChangePasswordOpen = false" />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useColors } from 'vuestic-ui'
import { useUsersStore } from '@/stores/users'
import ResetPasswordModal from '@/pages/preferences/modals/ResetPasswordModal.vue'

const { colors, setHSLAColor } = useColors()
const hoverColor = computed(() => setHSLAColor(colors.focus, { a: 0.1 }))

const { t } = useI18n()
const usersStore = useUsersStore()

onMounted(async () => {
  if (!usersStore.userDetails) {
    await usersStore.getUser()
  }
})

const fullName = computed(() => {
  const user = usersStore.userDetails
  if (!user) return ''
  return `${user.firstName || ''} ${user.lastName || ''}`.trim()
})

const userInitials = computed(() => {
  const user = usersStore.userDetails
  if (!user) return ''
  const first = user.firstName?.charAt(0) || ''
  const last = user.lastName?.charAt(0) || ''
  return (first + last).toUpperCase()
})

type ProfileListItem = {
  name: string
  to?: string
  href?: string
  // Opens something in place instead of navigating.
  action?: 'changePassword'
  icon: string
}

type ProfileOptions = {
  name: string
  separator: boolean
  list: ProfileListItem[]
}

const props = withDefaults(
  defineProps<{
    options?: ProfileOptions[]
  }>(),
  {
    options: () => [
      {
        name: 'account',
        separator: true,
        list: [
          {
            name: 'changePassword',
            action: 'changePassword',
            icon: 'mso-lock_reset',
          },
        ],
      },
      {
        name: '',
        separator: false,
        list: [
          {
            name: 'logout',
            to: 'logout',
            icon: 'mso-logout',
          },
        ],
      },
    ],
  },
)

const updatedOptions = computed(() => {
  return props.options.map((group) => {
    if (group.name === 'account') {
      return { ...group, name: fullName.value || 'Account' }
    }
    return group
  })
})

const isShown = ref(false)
const isChangePasswordOpen = ref(false)

const onItemClick = (item: ProfileListItem) => {
  if (item.action === 'changePassword') {
    isShown.value = false
    isChangePasswordOpen.value = true
  }
}

const resolveLinkAttribute = (item: ProfileListItem) => {
  return item.to ? { to: { name: item.to } } : item.href ? { href: item.href, target: '_blank' } : {}
}
</script>

<style lang="scss">
.profile-avatar {
  font-size: 12px !important;
  line-height: 1 !important;
}
.profile-dropdown {
  cursor: pointer;

  &__content {
    .menu-item:hover {
      background: var(--hover-color);
    }
    // Padding lives on the inner element: VaListItem only emits click from
    // there, so the whole row width must be clickable.
    .menu-item .va-list-item__inner {
      padding: 0 1rem;
    }
  }

  &__anchor {
    display: inline-block;
  }
}
</style>
