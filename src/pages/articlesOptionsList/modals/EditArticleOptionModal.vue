<template>
  <VaModal
    class="big-form"
    :mobile-fullscreen="false"
    size="medium"
    hide-default-actions
    :model-value="true"
    close-button
    @update:modelValue="emits('cancel')"
  >
    <template #header>
      <h1 class="va-h6 mb-2">{{ isUpdating ? 'Update' : 'Add' }} Options</h1>
    </template>

    <VaForm ref="form" @submit.prevent="submit">
      <div class="grid grid-cols-1 md:grid-cols-1 gap-3">
        <div class="flex flex-col gap-2 mb-1">
          <div v-for="lang in supportedLanguages" :key="lang">
            <VaInput
              v-model="formData.name[lang]"
              :label="`Name (${lang.toUpperCase()})`"
              placeholder="Name"
              type="text"
            />
          </div>
        </div>
        <VaInput v-model="formData.posName" label="POS Name" placeholder="POS Name" type="text" />
        <VaInput v-model="formData.code" label="Code" placeholder="Code" type="text" />
        <VaSelect
          v-model="formData.type"
          :rules="[validators.required]"
          required-mark
          label="Type"
          :options="types"
          value-by="value"
        />
        <VaInput v-model="formData.price" label="Price" placeholder="Price" type="number" />
        <div class="flex flex-col sm:flex-row gap-4">
          <VaInput
            v-model="formData.minimumChoices"
            label="Minimum Choices"
            placeholder="Minimum Choices"
            type="number"
            class="w-full"
          />
          <VaInput
            v-model="formData.maximumChoices"
            label="Maximum Choices"
            placeholder="Maximum Choices"
            type="number"
            class="w-full"
          />
        </div>
        <div class="flex-1">
          <label
            class="va-input-label va-input-wrapper__label va-input-wrapper__label--outer mt-2"
            style="color: var(--va-primary)"
            >Image</label
          >
          <FileUpload
            :selected-option="selectedOption"
            @uploadSuccess="(data) => ((formData.imageUrl = data.url), (formData.assetId = data._id))"
          ></FileUpload>
          <div class="flex items-center">
            <img v-if="formData.imageUrl" :src="formData.imageUrl" alt="Image" class="w-32 h-32 mt-2" />
            <VaButton
              v-if="formData.assetId"
              preset="primary"
              size="medium"
              color="danger"
              icon="mso-delete"
              class="ml-2 h-12 w-12"
              @click="deleteAsset"
            />
          </div>
        </div>
      </div>
    </VaForm>

    <template #footer>
      <div class="flex justify-end mt-4">
        <VaButton type="submit" @click="submit">
          {{ isUpdating ? 'Update' : 'Add' }}
        </VaButton>
      </div>
    </template>
  </VaModal>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { validators } from '@/services/utils'
import { useServiceStore } from '@/stores/services'
import { useToast, useForm } from 'vuestic-ui'
import FileUpload from '@/components/file-uploader/FileUpload.vue'
const emits = defineEmits(['cancel'])
const props = defineProps({
  selectedOption: {
    type: Object || String,
    default: () => '',
  },
})
const { validate } = useForm('form')
const { init } = useToast()

const servicesStore = useServiceStore()

const supportedLanguages = ref(['en'])

const getOutletDetails = async () => {
  if (servicesStore.selectedRest) {
    try {
      const url = import.meta.env.VITE_API_BASE_URL
      const response = await axios.get(`${url}/outlets/${servicesStore.selectedRest}`)
      if (response.data && response.data.supportedLanguages) {
        supportedLanguages.value = response.data.supportedLanguages
      }
    } catch (e) {
      console.error('Failed to fetch outlet details', e)
    }
  }
}

getOutletDetails()

const formData = ref({
  _id: '',
  name: {},
  posName: '',
  code: '',
  type: '',
  price: 0,
  minimumChoices: 0,
  maximumChoices: 0,
  imageUrl: '',
  assetId: '',
  outletId: '',
  isActive: true,
})

const isUpdating = computed(() => !!Object.keys(props.selectedOption).length && props.selectedOption._id)

const types = [
  { text: 'Extra', value: 'extra' },
  { text: 'Hold', value: 'hold' },
  { text: 'Modifier', value: 'modifier' },
  { text: 'Article', value: 'article' },
]

if (props.selectedOption && props.selectedOption._id) {
  formData.value = {
    ...props.selectedOption,
    name: typeof props.selectedOption.name === 'string'
      ? { en: props.selectedOption.name }
      : { ...props.selectedOption.name },
  }
} else if (props.selectedOption && !props.selectedOption._id) {
  formData.value = {
    _id: '',
    name: typeof props.selectedOption.name === 'string'
      ? { en: props.selectedOption.name }
      : { ...props.selectedOption.name },
    posName: props.selectedOption.posName || '',
    code: props.selectedOption.code || '',
    type: props.selectedOption.type || '',
    price: props.selectedOption.price || 0,
    minimumChoices: props.selectedOption.minimumChoices || 0,
    maximumChoices: props.selectedOption.maximumChoices || 0,
    imageUrl: props.selectedOption.imageUrl || '',
    assetId: props.selectedOption.assetId || '',
    outletId: servicesStore.selectedRest,
    isActive: props.selectedOption.isActive || true,
  }
}

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
      if (props.selectedOption && data._id) {
        await axios.patch(`${url}/articles-options/${data._id}`, data)
        init({ message: "You've successfully updated a Option", color: 'success' })
      } else {
        delete data._id
        await axios.post(`${url}/articles-options`, data)
        init({ message: "You've successfully created a Option", color: 'success' })
      }

      emits('cancel')
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Something went wrong'
      init({ message, color: 'danger' })
    }
  }
}

const deleteAsset = () => {
  const url: any = import.meta.env.VITE_API_BASE_URL
  axios
    .delete(`${url}/assets/${formData.value.assetId}`)
    .then(() => {
      formData.value.imageUrl = ''
      formData.value.assetId = ''
      init({ message: 'deleted successfully', color: 'success' })
    })
    .catch((err) => {
      init({ message: err.response.data.message, color: 'danger' })
    })
}
</script>
