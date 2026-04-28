<script setup lang="ts">
import { defineVaDataTableColumns, useModal, useToast } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import { ref, computed, toRef, watch, defineEmits, defineProps } from 'vue'
import { useServiceStore } from '@/stores/services'
import axios from 'axios'
const emits = defineEmits([
  'updateStellaUserModal',
  'editUser',
  'deleteUser',
  'sortBy',
  'sortingOrder',
  'getUsersForPagination',
  'adduseropenmodal',
])
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
  loading: { type: Boolean, default: false },
})
const { confirm } = useModal()
const { init } = useToast()
const router = useRouter()
const servicesStore = useServiceStore()
const columns = defineVaDataTableColumns([
  { label: 'First Name', key: 'firstName', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Last Name', key: 'lastName', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Type', key: 'role', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Outlets', key: 'outlets', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Username', key: 'username', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Email', key: 'email', sortable: true, sortingOptions: ['desc', 'asc'] },
  { label: 'Active', key: 'isActive', sortable: false },
  { label: 'Actions', key: 'actions', sortable: false },
])

const IsActive = ref(true)

const outlets = computed(() => servicesStore.items)

const onButtonUserDelete = async (payload) => {
  const result = await confirm({
    message: 'Are you sure you want to see delete this User?',
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete User',
  })
  if (result) {
    deleteUser(payload)
  }
}
function deleteUser(payload) {
  emits('deleteUser', payload)
}

const types = [
  { text: 'Super Admin', value: 'super-admin' },
  { text: 'Admin', value: 'admin' },
  { text: 'Caller', value: 'caller' },
  { text: 'Caller & Editor', value: 'caller-editor' },
  { text: 'Editor', value: 'editor' },
  { text: 'Supervisor', value: 'supervisor' },
]

const items = toRef(props, 'items')
const searchQuery = ref('')
const currentPage = ref(1)
const pages = computed(() => {
  return Math.ceil(props.count / 100)
})

function editUser(payload) {
  emits('editUser', payload)
}

function toggleActive(rowData) {
  const url = import.meta.env.VITE_API_BASE_URL
  const data = {
    isActive: rowData.isActive,
  }
  axios
    .patch(`${url}/users/${rowData._id}`, data)
    .then(() => {
      init({ message: "You've successfully updated a user", color: 'success' })
      emits('getUsersForPagination', { page: currentPage.value, searchQuery: searchQuery.value })
    })
    .catch((err) => {
      init({ message: err.response.data.error, color: 'danger' })
    })
}

watch(currentPage, (newPage) => {
  emits('getUsersForPagination', { page: currentPage.value, searchQuery: searchQuery.value })
})
watch(searchQuery, (search) => {
  currentPage.value = 1
  emits('getUsersForPagination', { page: currentPage.value, searchQuery: searchQuery.value })
})
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
        <h1 class="page-title">Users</h1>
        <VaInput
          v-model="searchQuery"
          placeholder="Search..."
          class="w-[300px] sm:w-[320px] md:w-[400px]"
          size="small"
        />
      </div>
      <div class="flex flex-col sm:flex-row sm:items-center gap-6 w-full sm:w-auto justify-end">
        <div class="flex gap-2">
          <VaButton size="small" color="primary" @click="emits('adduseropenmodal')"> Add User </VaButton>
        </div>
        <VaPagination
          v-model="currentPage"
          :pages="pages"
          buttons-preset="default"
          gapped
          :visible-pages="3"
          class="justify-center theme-gradient"
        />
      </div>
    </div>
    <VaDataTable
      :columns="columns"
      :items="items"
      :loading="$props.loading"
      :disable-client-side-sorting="true"
      :style="{
        '--va-data-table-height': '710px',
        '--va-data-table-thead-background': 'var(--va-background-element)',
        '--va-data-table-thead-color': '#2C82E0',
      }"
      sticky-header
      @update:sortBy="(sortBy) => $emit('sortBy', sortBy)"
      @update:sortingOrder="(sortDesc) => $emit('sortingOrder', sortDesc)"
    >
      <template #cell(role)="{ rowData }">
        <div class="table-cell-content">
          {{ rowData.role ? types.find((a) => a.value === rowData.role)?.text : '' }}
        </div>
      </template>
      <template #cell(outlets)="{ rowData }">
        <div v-if="rowData.outlets" class="table-cell-content">
          <VaPopover
            v-if="rowData.outlets.length && rowData.outlets.length > 1"
            class="mr-2 mb-2"
            message="Popover text"
            color="primary"
          >
            <VaBadge :text="rowData.outlets[0].name" color="primary" class="px-1" @click="allOutlets = true" />
            +
            <VaBadge :text="rowData.outlets.length - 1" color="primary" class="px-1" @click="allOutlets = true" />
            <template #title>
              <i>Outlets</i>
            </template>
            <template #body>
              <div class="flex flex-col">
                <span v-for="outlet in rowData.outlets" :key="outlet._id">
                  <VaBadge v-if="outlet" :text="outlet.name" color="primary" class="px-1" @click="allOutlets = true" />
                </span>
              </div>
            </template>
          </VaPopover>
          <VaBadge
            v-if="rowData.outlets.length && rowData.outlets.length === 1"
            :text="rowData.outlets[0].name"
            color="primary"
            class="px-1"
            @click="allOutlets = true"
          />
        </div>
      </template>

      <template #cell(isActive)="{ rowData }">
        <div class="table-cell-content">
          <VaCheckbox v-model="rowData.isActive" size="small" @click="toggleActive(rowData)" />
        </div>
      </template>
      <template #cell(actions)="{ rowData }">
        <div class="flex gap-2 justify-end">
          <VaButton
            preset="primary"
            size="small"
            icon="mso-edit"
            @click="$emit('editUser', { ...rowData, updating: 'all' })"
          />
          <VaButton
            preset="primary"
            size="small"
            color="danger"
            icon="mso-delete"
            @click="onButtonUserDelete(rowData)"
          />
        </div>
      </template>
    </VaDataTable>
  </div>
</template>

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
}
.va-data-table {
  ::v-deep(.va-data-table__table-tr) {
    border-bottom: 1px solid var(--va-background-border);
  }
}
::v-deep(.va-data-table__table thead th:last-child) {
  text-align: right !important;
}
</style>
