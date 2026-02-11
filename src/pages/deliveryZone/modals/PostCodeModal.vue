<template>
  <VaModal
    v-model="showPostcodeModal"
    class="big-modal"
    :mobile-fullscreen="false"
    size="large"
    hide-default-actions
    close-button
  >
    <template #header>
      <h1 class="va-h6 mb-2">Update PostCode</h1>
    </template>

    <VaForm ref="form" @submit.prevent="submit">
      <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
        <VaSelect
          v-model="formData.district"
          :clearable="true"
          value-by="value"
          label="District"
          :options="districts"
        />
        <VaSelect
          v-model="formData.municipalities"
          label="Municipalities"
          :options="municipalities"
          :multiple="true"
          value-by="value"
        />
        <VaCheckbox
          v-if="postalCodes.length"
          v-model="selectAll"
          class="ml-5"
          label="Select All Post Codes"
          @update:modelValue="toggleSelectAll"
        />
        <div v-if="postalCodes.length" class="max-h-[45vh] overflow-y-auto bg-blue-50 p-5 rounded-lg">
          <div class="grid grid-cols-7">
            <div v-for="postcode in postalCodes" :key="postcode.value" class="mb-2">
              <VaCheckbox v-model="postcode.isChecked" :label="`${postcode.text}`" />
            </div>
          </div>
        </div>
      </div>
    </VaForm>
    <template #footer>
      <div class="flex justify-end mt-4">
        <VaButton type="submit" @click="submit">Update</VaButton>
      </div>
    </template>
  </VaModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useForm, useToast } from 'vuestic-ui'
import axios from 'axios'
const props = defineProps({
  rowData: {
    type: Object,
    required: true,
  },
})
const emits = defineEmits(['cancel'])

const showPostcodeModal = ref(true)

// Watch for closing the modal
watch(showPostcodeModal, (val) => {
  if (!val) emits('cancel')
})

const { validate } = useForm('form')
const { init } = useToast()

const formData = ref({
  district: '',
  municipalities: [],
})

const url = import.meta.env.VITE_API_BASE_URL
const districts = ref([])

const municipalities = ref([])
const postalCodes = ref([])

const selectAll = ref(false)

function getDistricts() {
  axios
    .get(url + '/postalcodes')
    .then((response) => {
      districts.value = response.data.map((district) => ({
        text: district.name,
        value: district.name,
      }))
    })
    .catch((error) => {
      console.error('Error fetching districts:', error)
    })
}
getDistricts()

function getMunicipalities(newDistrict) {
  axios
    .get(`${url}/postalcodes?district=${newDistrict}`)
    .then((response) => {
      municipalities.value = response.data.data.map((municipality) => ({
        text: municipality.name,
        value: municipality.name,
      }))
    })
    .catch((error) => {
      console.error('Error fetching municipalities:', error)
    })
}

function getPostalCodes() {
  axios
    .get(`${url}/postalcodes?district=${formData.value.district}&municipalities=${formData.value.municipalities}`)
    .then((response) => {
      postalCodes.value = response.data.data.map((postalCode) => ({
        text: postalCode.code,
        value: postalCode.id,
        isChecked: props.rowData.postalCodes ? props.rowData.postalCodes.includes(postalCode.code) : false,
      }))
    })
    .catch((error) => {
      console.error('Error fetching municipalities:', error)
    })
}

watch(
  () => formData.value.district,
  (newDistrict) => {
    municipalities.value = []
    if (!props.rowData.municipalities.length || newDistrict !== props.rowData.district) {
      formData.value.municipalities = []
    }
    selectAll.value = false

    if (newDistrict) {
      getMunicipalities(newDistrict)
    }
  },
  { immediate: true },
)

watch(
  () => formData.value.municipalities,
  () => {
    postalCodes.value = []
    if (formData.value.district && formData.value.municipalities.length > 0) {
      getPostalCodes()
    }
  },
  { immediate: true },
)

function toggleSelectAll() {
  postalCodes.value.forEach((postcode) => {
    postcode.isChecked = selectAll.value
  })
}

watch(
  postalCodes,
  () => {
    const allChecked = postalCodes.value.length > 0 && postalCodes.value.every((p) => p.isChecked)
    if (selectAll.value !== allChecked) {
      selectAll.value = allChecked
    }
  },
  { deep: true },
)

if (props.rowData) {
  formData.value.district = props.rowData.district
  formData.value.municipalities = props.rowData.municipalities
}

const submit = async () => {
  try {
    await axios.patch(`${url}/deliveryZones/${props.rowData._id}`, {
      district: formData.value.district,
      municipalities: formData.value.municipalities,
      postalCodes: postalCodes.value.filter((postcode) => postcode.isChecked).map((postcode) => postcode.text),
    })
    showPostcodeModal.value = false
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Failed to update delivery zone'
    init({ message, color: 'danger' })
  }
}
</script>
