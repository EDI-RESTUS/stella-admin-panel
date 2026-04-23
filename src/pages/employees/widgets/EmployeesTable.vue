<script setup lang="ts">
import { defineVaDataTableColumns, useModal, useToast } from 'vuestic-ui'
import { toRef } from 'vue'
import axios from 'axios'

const emits = defineEmits(['getEmployees', 'editEmployee', 'addEmployee'])
const props = defineProps({
  items: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})

const { confirm } = useModal()
const { init } = useToast()

const columns = defineVaDataTableColumns([
  { label: 'Name', key: 'name', sortable: true },
  { label: 'Phone', key: 'phoneNo', sortable: false },
  { label: 'Active', key: 'active', sortable: false, thAlign: 'center' },
  { label: 'Actions', key: 'actions', sortable: false },
])

const url = import.meta.env.VITE_API_BASE_URL

async function toggleActive(rowData: any) {
  try {
    await axios.patch(`${url}/employees/${rowData._id}`, { active: rowData.active })
    init({ message: 'Employee updated', color: 'success' })
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to update employee', color: 'danger' })
    rowData.active = !rowData.active
  }
}

async function onDelete(rowData: any) {
  const ok = await confirm({
    message: `Delete employee "${rowData.name}"?`,
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Employee',
  })
  if (!ok) return
  try {
    await axios.delete(`${url}/employees/${rowData._id}`)
    init({ message: 'Employee deleted', color: 'success' })
    emits('getEmployees')
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to delete employee', color: 'danger' })
  }
}

const items = toRef(props, 'items')
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="page-title">Employees</h1>
      <VaButton size="small" color="primary" @click="emits('addEmployee')">Add Employee</VaButton>
    </div>

    <VaDataTable
      :columns="columns"
      :items="items"
      :loading="$props.loading"
      :style="{
        '--va-data-table-height': '710px',
        '--va-data-table-thead-background': 'var(--va-background-element)',
        '--va-data-table-thead-color': '#2C82E0',
      }"
      sticky-header
    >
      <template #cell(active)="{ rowData }">
        <div class="flex justify-center">
          <VaCheckbox v-model="rowData.active" size="small" @update:modelValue="toggleActive(rowData)" />
        </div>
      </template>
      <template #cell(actions)="{ rowData }">
        <div class="flex gap-2 justify-end">
          <VaButton preset="primary" size="small" color="primary" icon="mso-edit" @click="emits('editEmployee', rowData)" />
          <VaButton preset="primary" size="small" color="danger" icon="mso-delete" @click="onDelete(rowData)" />
        </div>
      </template>
    </VaDataTable>
  </div>
</template>

<style scoped>
.va-data-table {
  ::v-deep(.va-data-table__table-tr) {
    border-bottom: 1px solid var(--va-background-border);
  }
}
::v-deep(.va-data-table__table thead th:last-child) {
  text-align: right !important;
}
</style>
