<template>
  <VaModal
    v-model="isVisible"
    class="big-form"
    :mobile-fullscreen="false"
    size="large"
    hide-default-actions
    close-button
  >
    <template #header>
      <h1 class="va-h6 mb-4">Add Delivery Zone</h1>
    </template>

    <VaForm ref="form" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-3">
        <VaInput v-model="formData.name" label="Delivery Zone" placeholder="Delivery Zone" type="text" />
        <VaInput
          v-model="formData.deliveryCharge"
          label="Delivery Charges"
          placeholder="Delivery Charges"
          type="number"
        />
      </div>
      <div class="grid grid-cols-2 gap-4 mt-4">
        <VaInput v-model="formData.terminalNumber" label="Terminal No." placeholder="Terminal No." type="number" />
        <VaInput
          v-model="formData.futureOrderPromiseTime"
          label="Future Order Promise Time"
          placeholder="Future Order Promise Time"
          type="number"
        />
      </div>
      <div class="grid grid-cols-1 gap-4 mt-4">
        <VaInput
          v-model="formData.posSaleDocumentTypeCode"
          label="Sales Document Type (retail POS)"
          placeholder="e.g. IR4"
          helper-text="Only for outlets in 'Sales documents' mode: the Winmax document type this shop's sales are posted as. Empty = the outlet's default."
        />
      </div>
      <div class="grid grid-cols-2 gap-4 mt-4">
        <VaInput
          v-model="formData.deliveryPromiseTime"
          label="Delivery Promise Time"
          placeholder="Delivery Promise Time"
          type="number"
        />
        <VaInput
          v-model="formData.takeawayPromiseTime"
          label="Takeaway Promise Time"
          placeholder="Takeaway Promise Time"
          type="number"
        />
      </div>

      <div class="grid grid-cols-2 gap-4 mt-4">
        <VaInput v-model="formData.ccFromTable" label="CC From Table" placeholder="CC From Table" type="number" />
        <VaInput
          v-model="formData.ccToTable"
          label="CC To Table"
          placeholder="CC To Table"
          type="number"
          :rules="ccToRules"
        />
        <VaInput v-model="formData.webFromTable" label="Web From Table" placeholder="Web From Table" type="number" />
        <VaInput
          v-model="formData.webToTable"
          label="Web To Table"
          placeholder="Web To Table"
          type="number"
          :rules="webToRules"
        />
      </div>
    </VaForm>

    <template #footer>
      <div class="flex justify-end mt-4">
        <VaButton type="submit" @click="submit">Add</VaButton>
      </div>
    </template>
  </VaModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import { validators } from '@/services/utils'
import { useServiceStore } from '@/stores/services'
import { useForm, useToast } from 'vuestic-ui'

const emits = defineEmits(['cancel'])
const props = defineProps({
  selectedOption: {
    type: Object || String,
    default: () => '',
  },
})

const isVisible = ref(true)

watch(isVisible, (val) => {
  if (!val) emits('cancel')
})

const { validate } = useForm('form')
const { init } = useToast()

const servicesStore = useServiceStore()

const formData = ref({
  id: '',
  name: '',
  deliveryCharge: '',
  terminalNumber: '',
  futureOrderPromiseTime: '',
  deliveryPromiseTime: '',
  takeawayPromiseTime: '',
  ccFromTable: '',
  ccToTable: '',
  webFromTable: '',
  webToTable: '',
  posSaleDocumentTypeCode: '',
  outletId: '',
  isActive: true,
})

const ccToRules = computed(() => [
  (v: number) => {
    const from = Number(formData.value.ccFromTable)
    if (!formData.value.ccFromTable && v === '') return true
    if (!formData.value.ccFromTable) return true
    return v > from || 'CC To must be greater than CC From'
  },
])

const webToRules = computed(() => [
  (v: number) => {
    const from = Number(formData.value.webFromTable)
    if (!formData.value.webFromTable && v === '') return true
    if (!formData.value.webFromTable) return true
    return v > from || 'Web To must be greater than Web From'
  },
])

const submit = async () => {
  if (validate()) {
    const data = JSON.parse(JSON.stringify(formData.value))

    data.outletId = servicesStore.selectedRest

    delete data.createdAt
    delete data.updatedAt
    delete data.__v
    delete data.updating
    if (!data.assetId) {
      delete data.assetId
    }

    const url: any = import.meta.env.VITE_API_BASE_URL

    try {
      if (props.selectedOption && data.id) {
        await axios.patch(`${url}/deliveryZones/${data.id}`, data)
        init({ message: "You've successfully updated", color: 'success' })
      } else {
        delete data._id
        await axios.post(`${url}/deliveryZones`, data)
        init({ message: "You've successfully created", color: 'success' })
      }

      emits('cancel')
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Something went wrong'
      init({ message, color: 'danger' })
    }
  }
}
</script>
