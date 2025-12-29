<template>
  <VaModal
    class="big-form"
    :mobile-fullscreen="false"
    size="large"
    hide-default-actions
    :model-value="true"
    close-button
    @update:modelValue="emits('cancel')"
  >
    <template #header>
      <h1 class="va-h6 mb-5">{{ isUpdating ? 'Update' : 'Add' }} Payment</h1>
    </template>

    <VaForm ref="form" @submit.prevent="submit()">
      <div class="grid grid-cols-2 md:grid-cols-1 gap-3 justify-between">
        <!-- Name -->
        <VaInput
          v-model="formData.name"
          label="Name"
          placeholder="Name"
          type="text"
          :rules="[validators.required]"
        />

        <!-- Payment Gateway -->
        <VaSelect
          v-model="formData.paymentGateway"
          value-by="value"
          label="Payment Gateway"
          :options="paymentGateway"
        />

        <!-- Payment Gateway Config Inputs -->
        <div v-if="formData.paymentGateway" class="grid md:grid-cols-1 gap-3">
          <div
            v-for="e in paymentOptions.find((a) => a.paymentMethodName === formData.paymentGateway)?.inputConfig || []"
            :key="e.label"
          >
            <VaInput v-model="e.value" :type="e.type" :rules="e.required ? [validators.required] : []">
              <template #label>
                <span>
                  {{ e.label }}
                  <span v-if="e.required" class="required-asterisk">*</span>
                </span>
              </template>
            </VaInput>
          </div>
        </div>

        <!-- Payment Type ID -->
        <VaInput
          v-model="formData.paymentTypeId"
          label="Payment Type ID"
          placeholder="Payment Type ID"
          type="text"
        />

        <!-- Options -->
        <div class="grid md:grid-cols-4 gap-3">
          <VaCheckbox v-model="formData.dineIn" label="Dine-in" />
          <VaCheckbox v-model="formData.delivery" label="Delivery" />
          <VaCheckbox v-model="formData.takeaway" label="Takeaway" />
          <VaCheckbox v-model="formData.callCenter" label="Call Center" />
        </div>
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end mt-3 gap-2">
        <VaButton
          v-if="isUpdating && formData.paymentGateway === 'WalleePOS'"
          color="secondary"
          @click="showWalleeConfig = true"
        >
          Configure Wallee
        </VaButton>
        <VaButton type="submit" :disabled="isSubmitDisabled">{{ isUpdating ? 'Update' : 'Add' }}</VaButton>
      </div>
    </VaForm>

    <WalleeConfigModal
      v-if="showWalleeConfig"
      :outlet-id="servicesStore.selectedRest"
      :payment-type-id="formData.paymentTypeId"
      @cancel="showWalleeConfig = false"
    />
  </VaModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import axios from 'axios'
import { validators } from '@/services/utils'
import { useForm, useToast } from 'vuestic-ui'
import { useServiceStore } from '@/stores/services'
import WalleeConfigModal from './WalleeConfigModal.vue'

const emits = defineEmits(['cancel'])
const props = defineProps({
  selectedPayment: {
    type: Object,
    default: () => ({}),
  },
})

const { validate } = useForm('form')
const { init } = useToast()
const servicesStore = useServiceStore()
const showWalleeConfig = ref(false)

// Form data
const formData = ref({
  _id: '',
  name: '',
  paymentGateway: '',
  paymentTypeId: '',
  dineIn: false,
  delivery: false,
  takeaway: false,
  callCenter: false,
})

const isUpdating = computed(() => !!Object.keys(props.selectedPayment).length)

// Payment options
const paymentGateway = ref([])
const paymentOptions = ref([])

// Fetch payment configuration
const getPaymentconfig = () => {
  const url: any = import.meta.env.VITE_API_BASE_URL
  axios.get(`${url}/payments-config`).then((response) => {
    // Populate gateways
    paymentGateway.value = response.data.data.types.map((e) => ({ text: e, value: e }))

    // Populate gateway configs
    paymentOptions.value = response.data.data.config.map((e) => ({
      ...e,
      inputConfig: e.inputConfig.map((config) => ({ ...config, value: config.default || '' })),
    }))

    // --- Manual Wallee Injection ---
    if (!paymentGateway.value.find((p) => p.value === 'WalleePOS')) {
      paymentGateway.value.push({ text: 'WalleePOS', value: 'WalleePOS' })
    }

    if (!paymentOptions.value.find((p) => p.paymentMethodName === 'WalleePOS')) {
      paymentOptions.value.push({
        paymentMethodName: 'WalleePOS',
        inputConfig: [
          { name: 'TERMINAL_IP', label: 'Terminal IP', type: 'text', required: true, value: '' },
          { name: 'TERMINAL_PORT', label: 'Terminal Port', type: 'number', required: true, value: 50000 },
          { name: 'POS_ID', label: 'POS ID', type: 'text', required: true, value: '' },
          { name: 'CURRENCY', label: 'Currency', type: 'text', required: true, value: 'EUR' },
        ],
      })
    }
    // -------------------------------

    // If updating, load selected payment
    if (props.selectedPayment && props.selectedPayment._id) {
      axios
        .get(`${url}/payments/${props.selectedPayment._id}`)
        .then((response) => {
          formData.value = response.data.data
          const selected = paymentOptions.value.find(
            (a) => a.paymentMethodName === formData.value.paymentGateway
          )
          selected?.inputConfig.forEach((e) => {
            e.value = response.data.data.paymentGatewayConfig?.[e.name] || ''
          })
        })
        .catch((error) => {
          init({ message: error.response?.data?.message || 'Error loading payment', color: 'danger' })
        })
    }
  })
}
getPaymentconfig()

const isSubmitDisabled = computed(() => {
  if (!formData.value.name?.trim()) return true
  if (!formData.value.paymentGateway) return false
  const selectedGateway = paymentOptions.value.find((a) => a.paymentMethodName === formData.value.paymentGateway)
  if (!selectedGateway) return false
  const hasEmptyRequiredField = selectedGateway.inputConfig.some((input) => input.required && !input.value?.trim())
  return hasEmptyRequiredField
})

const submit = async () => {
  if (validate()) {
    let selectedGateway = null
    if (formData.value.paymentGateway) {
      selectedGateway = paymentOptions.value.find((a) => a.paymentMethodName === formData.value.paymentGateway)
    }

    let data = JSON.parse(JSON.stringify(formData.value))

    // Build paymentGatewayConfig only if gateway selected
    const getConfig = (gateway) => {
      if (!gateway) return {}
      return Object.fromEntries(
        gateway.inputConfig.map((input) => {
          const val = input.value
          // Cast to number if type is number
          return [input.name, input.type === 'number' ? Number(val) : val]
        })
      )
    }

    data = {
      ...data,
      outletId: servicesStore.selectedRest,
      paymentGatewayConfig: getConfig(selectedGateway),
    }

    // Remove unnecessary fields
    delete data.createdAt
    delete data.updatedAt
    delete data.__v
    delete data.updating

    const url = import.meta.env.VITE_API_BASE_URL

    try {
      if (props.selectedPayment && data._id) {
        await axios.patch(`${url}/payments/${data._id}`, data)
        init({ message: "You've successfully updated a payment", color: 'success' })
      } else {
        delete data._id
        await axios.post(`${url}/payments`, data)
        init({ message: "You've successfully created a payment", color: 'success' })
      }
      emits('cancel')
    } catch (err) {
      const message = err?.response?.data?.message || 'Something went wrong'
      init({ message, color: 'danger' })
    }
  }
}

getPaymentconfig()
</script>

<style scoped>
.required-asterisk {
  color: red;
  font-weight: bold;
}
</style>
