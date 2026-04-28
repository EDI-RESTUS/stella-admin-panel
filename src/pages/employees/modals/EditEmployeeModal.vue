<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { useToast } from 'vuestic-ui'
import { useServiceStore } from '@/stores/services'

const props = defineProps({
  selectedEmployee: { type: Object as () => any, default: null },
})
const emits = defineEmits(['cancel'])

const { init } = useToast()
const servicesStore = useServiceStore()

const isVisible = ref(true)
const saving = ref(false)

const countryPrefixes = [
  { text: '+357 (CY)', value: '357' },
  { text: '+30 (GR)', value: '30' },
  { text: '+44 (UK)', value: '44' },
  { text: '+1 (US)', value: '1' },
  { text: '+7 (RU)', value: '7' },
  { text: '+971 (AE)', value: '971' },
  { text: '+961 (LB)', value: '961' },
]

const name = ref('')
const phonePrefix = ref('357')
const phoneLocal = ref('')
const active = ref(true)

if (props.selectedEmployee) {
  name.value = props.selectedEmployee.name || ''
  active.value = props.selectedEmployee.active !== false
  const raw = String(props.selectedEmployee.phoneNo || '').replace(/\D/g, '').replace(/^00/, '')
  const found = countryPrefixes.find((p) => raw.startsWith(p.value))
  if (found) {
    phonePrefix.value = found.value
    phoneLocal.value = raw.slice(found.value.length)
  } else {
    phonePrefix.value = '357'
    phoneLocal.value = raw
  }
}

watch(isVisible, (val) => {
  if (!val) emits('cancel')
})

const isEdit = computed(() => !!props.selectedEmployee)
const canSave = computed(() => !!name.value.trim() && !!phoneLocal.value.trim() && !!servicesStore.selectedRest)

const url = import.meta.env.VITE_API_BASE_URL

async function save() {
  if (!canSave.value) return
  saving.value = true
  const phoneNo = '00' + (phonePrefix.value + phoneLocal.value).replace(/\D+/g, '')
  try {
    if (isEdit.value) {
      await axios.patch(`${url}/employees/${props.selectedEmployee._id}`, {
        name: name.value.trim(),
        phoneNo,
        active: active.value,
      })
      init({ message: 'Employee updated', color: 'success' })
    } else {
      await axios.post(`${url}/employees`, {
        name: name.value.trim(),
        phoneNo,
        active: active.value,
        outletId: servicesStore.selectedRest,
      })
      init({ message: 'Employee added', color: 'success' })
    }
    isVisible.value = false
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to save employee', color: 'danger' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <VaModal v-model="isVisible" :mobile-fullscreen="false" size="small" hide-default-actions close-button>
    <template #header>
      <h1 class="va-h6 mb-2">{{ isEdit ? 'Edit Employee' : 'Add Employee' }}</h1>
    </template>

    <div class="flex flex-col gap-3">
      <VaInput v-model="name" label="Name" size="small" placeholder="Employee name" />

      <div class="flex gap-2 items-end">
        <VaSelect
          v-model="phonePrefix"
          label="Country"
          size="small"
          :options="countryPrefixes"
          value-by="value"
          class="w-[130px] shrink-0"
        />
        <VaInput
          :model-value="phoneLocal"
          label="Phone"
          size="small"
          placeholder="Phone number"
          class="flex-1"
          @update:modelValue="(v: string) => (phoneLocal = String(v || '').replace(/\D/g, ''))"
        />
      </div>

      <VaCheckbox v-model="active" label="Active" />
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 mt-4">
        <VaButton preset="secondary" @click="isVisible = false">Cancel</VaButton>
        <VaButton :disabled="!canSave || saving" @click="save">{{ isEdit ? 'Update' : 'Add' }}</VaButton>
      </div>
    </template>
  </VaModal>
</template>
