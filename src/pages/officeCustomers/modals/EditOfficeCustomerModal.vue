<template>
  <VaModal
    :mobile-fullscreen="false"
    size="medium"
    hide-default-actions
    :model-value="true"
    close-button
    @update:modelValue="emits('cancel')"
  >
    <template #header>
      <h1 class="va-h6 mb-2">Edit Employee — {{ props.customer.winmaxId }}</h1>
    </template>

    <VaForm ref="editOfficeForm" @submit.prevent="submit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VaInput
          v-model="formData.name"
          :rules="[validators.required]"
          label="Name"
          required-mark
          placeholder="First name"
        />
        <VaInput
          v-model="formData.surname"
          :rules="[validators.required]"
          label="Surname"
          required-mark
          placeholder="Surname"
        />
        <VaInput
          v-model="formData.email"
          :rules="[validators.required, validators.email]"
          label="Email"
          required-mark
          type="email"
          placeholder="name@company.com"
        />
        <VaInput v-model="formData.officeNo" label="Office No" placeholder="Office number (optional)" />
        <VaInput v-model="formData.officePhone" label="Office Phone" placeholder="Office phone number (optional)" />
        <div class="flex items-center">
          <VaSwitch v-model="formData.isActive" label="Active" size="small" />
        </div>
      </div>
    </VaForm>

    <template #footer>
      <div class="flex justify-end gap-2 mt-4">
        <VaButton preset="secondary" @click="emits('cancel')">Cancel</VaButton>
        <VaButton :loading="saving" @click="submit">Update</VaButton>
      </div>
    </template>
  </VaModal>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import axios from 'axios'
import { validators } from '@/services/utils'
import { useToast, useForm } from 'vuestic-ui'

const emits = defineEmits(['cancel', 'saved'])
const props = defineProps({
  customer: {
    type: Object,
    required: true,
  },
})

const { validate } = useForm('editOfficeForm')
const { init } = useToast()

const saving = ref(false)
const formData = ref({
  name: props.customer.firstName || '',
  surname: props.customer.lastName || '',
  email: props.customer.email || '',
  officeNo: props.customer.officeNo || '',
  officePhone: props.customer.officePhone || '',
  isActive: props.customer.isActive !== false,
})

async function submit() {
  if (!validate()) return
  saving.value = true
  try {
    const url = import.meta.env.VITE_API_BASE_URL
    const { data } = await axios.patch(`${url}/customers/office/${props.customer.id}`, {
      name: formData.value.name.trim(),
      surname: formData.value.surname.trim(),
      email: formData.value.email.trim(),
      officeNo: formData.value.officeNo.trim(),
      officePhone: formData.value.officePhone.trim(),
      isActive: formData.value.isActive,
    })
    init({ message: data?.message || 'Employee updated', color: 'success' })
    emits('saved')
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to update employee', color: 'danger' })
  } finally {
    saving.value = false
  }
}
</script>
