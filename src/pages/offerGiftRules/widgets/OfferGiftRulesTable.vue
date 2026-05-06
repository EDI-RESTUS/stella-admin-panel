<script setup lang="ts">
import { defineVaDataTableColumns, useModal, useToast } from 'vuestic-ui'
import { toRef } from 'vue'
import axios from 'axios'

const emits = defineEmits(['getRules', 'editRule', 'addRule'])
const props = defineProps({
  items: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})

const { confirm } = useModal()
const { init } = useToast()

const columns = defineVaDataTableColumns([
  { label: 'Offer', key: 'offerName', sortable: true },
  { label: 'Trigger Item', key: 'triggerName', sortable: true },
  { label: 'Gift Item', key: 'giftName', sortable: true },
  { label: 'Active', key: 'isActive', sortable: false, thAlign: 'center' },
  { label: 'Actions', key: 'actions', sortable: false },
])

const url = import.meta.env.VITE_API_BASE_URL

function pickText(v: any) {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v.en || v.el || Object.values(v)[0] || ''
  return String(v)
}

async function toggleActive(rowData: any) {
  try {
    await axios.patch(`${url}/offer-gift-rules/${rowData._id}`, { isActive: rowData.isActive })
    init({ message: 'Rule updated', color: 'success' })
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to update rule', color: 'danger' })
    rowData.isActive = !rowData.isActive
  }
}

async function onDelete(rowData: any) {
  const ok = await confirm({
    message: `Delete this gift rule?`,
    okText: 'Yes',
    cancelText: 'No',
    size: 'medium',
    title: 'Delete Gift Rule',
  })
  if (!ok) return
  try {
    await axios.delete(`${url}/offer-gift-rules/${rowData._id}`)
    init({ message: 'Rule deleted', color: 'success' })
    emits('getRules')
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to delete rule', color: 'danger' })
  }
}

const items = toRef(props, 'items')
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="page-title">Offer Gift Rules</h1>
      <VaButton size="small" color="primary" @click="emits('addRule')">Add Rule</VaButton>
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
      <template #cell(offerName)="{ rowData }">
        <span>{{ pickText((rowData as any).offerId?.name) || '-' }}</span>
      </template>
      <template #cell(triggerName)="{ rowData }">
        <span>{{ pickText((rowData as any).triggerMenuItemId?.name) || '-' }}</span>
        <span v-if="(rowData as any).triggerMenuItemId?.code" class="text-xs opacity-70 ml-1">
          ({{ (rowData as any).triggerMenuItemId.code }})
        </span>
      </template>
      <template #cell(giftName)="{ rowData }">
        <span>{{ pickText((rowData as any).giftMenuItemId?.name) || '-' }}</span>
        <span v-if="(rowData as any).giftMenuItemId?.code" class="text-xs opacity-70 ml-1">
          ({{ (rowData as any).giftMenuItemId.code }})
        </span>
      </template>
      <template #cell(isActive)="{ rowData }">
        <div class="flex justify-center">
          <VaCheckbox v-model="(rowData as any).isActive" size="small" @update:modelValue="toggleActive(rowData)" />
        </div>
      </template>
      <template #cell(actions)="{ rowData }">
        <div class="flex gap-2 justify-end">
          <VaButton preset="primary" size="small" color="primary" icon="mso-edit" @click="emits('editRule', rowData)" />
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
