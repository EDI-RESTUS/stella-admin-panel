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
      <h1 class="va-h6 mb-2">{{ isUpdating ? 'Update' : 'Add' }} Option Group</h1>
    </template>

    <VaForm ref="form" @submit.prevent="submit">
      <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div v-for="lang in supportedLanguages" :key="lang">
          <VaInput
            v-model="formData.name[lang]"
            :label="`Name (${lang.toUpperCase()})`"
            placeholder="Name"
            type="text"
          />
        </div>
        <VaInput v-model="formData.internalName" label="Internal Name" placeholder="Internal Name" type="text" />
        <div v-for="lang in supportedLanguages" :key="lang + 'desc'">
          <VaTextarea
            v-model="formData.description[lang]"
            :label="`Description (${lang.toUpperCase()})`"
            placeholder="Description"
            :min-rows="3"
            :max-rows="3"
            class="mb-1 w-full"
          />
        </div>
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
        <div class="flex flex-wrap gap-4 items-center">
          <VaCheckbox
            v-model="formData.singleChoice"
            name="choice"
            :disabled="formData.multipleChoice || formData.multipleChoiceNoQty"
            label="Single Choice"
          />
          <VaCheckbox
            v-model="formData.multipleChoice"
            name="choice"
            :disabled="formData.singleChoice || formData.multipleChoiceNoQty"
            label="Multiple Choice"
          />
          <VaCheckbox
            v-model="formData.multipleChoiceNoQty"
            name="choice"
            :disabled="formData.singleChoice || formData.multipleChoice"
            label="Multiple Choice (No Qty)"
          />
          <VaCheckbox v-model="formData.mandatory" label="Mandatory" />
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
import { useServiceStore } from '@/stores/services'
import { useToast, useForm } from 'vuestic-ui'
const emits = defineEmits(['cancel'])
const props = defineProps({
  selectedOptionGroups: {
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
  internalName: '',
  description: {} as Record<string, string>,
  singleChoice: false,
  multipleChoice: false,
  multipleChoiceNoQty: false,
  mandatory: false,
  minimumChoices: 0,
  maximumChoices: 0,
  defaultOptions: [],
  options: [],
  menuItems: [],
})

const isUpdating = computed(() => !!Object.keys(props.selectedOptionGroups).length && props.selectedOptionGroups._id)
const isDuplicating = computed(() => Object.keys(props.selectedOptionGroups).length && !props.selectedOptionGroups._id)

if (props.selectedOptionGroups && props.selectedOptionGroups._id) {
  formData.value = {
    ...props.selectedOptionGroups,
    name: typeof props.selectedOptionGroups.name === 'string'
      ? { en: props.selectedOptionGroups.name }
      : { ...props.selectedOptionGroups.name },
    description: typeof props.selectedOptionGroups.description === 'string'
      ? { en: props.selectedOptionGroups.description }
      : { ...(props.selectedOptionGroups.description || {}) },
  }
} else if (props.selectedOptionGroups && !props.selectedOptionGroups._id) {
  formData.value = {
    _id: '',
    name: typeof props.selectedOptionGroups.name === 'string'
      ? { en: props.selectedOptionGroups.name }
      : { ...props.selectedOptionGroups.name },
    internalName: props.selectedOptionGroups.internalName || '',
    description: typeof props.selectedOptionGroups.description === 'string'
      ? { en: props.selectedOptionGroups.description }
      : { ...(props.selectedOptionGroups.description || {}) },
    singleChoice: props.selectedOptionGroups.singleChoice || false,
    multipleChoice: props.selectedOptionGroups.multipleChoice || false,
    multipleChoiceNoQty: props.selectedOptionGroups.multipleChoiceNoQty || false,
    mandatory: props.selectedOptionGroups.mandatory || false,
    minimumChoices: props.selectedOptionGroups.minimumChoices || 0,
    maximumChoices: props.selectedOptionGroups.maximumChoices || 0,
    defaultOptions: props.selectedOptionGroups.defaultOptions || [],
    options: props.selectedOptionGroups.options || [],
    menuItems: props.selectedOptionGroups.menuItems || [],
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

    const descIsEmpty = !data.description || Object.values(data.description).every((v) => !v)
    if (descIsEmpty) {
      delete data.description
    }
    if (data.internalName === '') {
      delete data.internalName
    }

    const url: any = import.meta.env.VITE_API_BASE_URL

    try {
      if (props.selectedOptionGroups && data._id) {
        await axios.patch(`${url}/articles-options-groups/${data._id}`, data)
        init({ message: "You've successfully updated a OptionGroups", color: 'success' })
      } else {
        delete data._id
        const result = await axios.post(`${url}/articles-options-groups`, data)
        if (isDuplicating.value) {
          if (props.selectedOptionGroups.options && props.selectedOptionGroups.options.length) {
            await axios.patch(`${url}/articles-options-groups/${result.data.data._id}/add-options`, {
              optionIds: props.selectedOptionGroups.options,
            })
          }
          if (props.selectedOptionGroups.defaultOptions && props.selectedOptionGroups.defaultOptions.length) {
            await axios.patch(`${url}/articles-options-groups/${result.data.data._id}`, {
              defaultOptions: props.selectedOptionGroups.defaultOptions,
            })
          }
          if (props.selectedOptionGroups.menuItems && props.selectedOptionGroups.menuItems.length) {
            await axios.patch(`${url}/articles-options-groups/${result.data.data._id}`, {
              menuItems: props.selectedOptionGroups.menuItems,
            })
          }
        }
        init({ message: "You've successfully created a OptionGroups", color: 'success' })
      }

      emits('cancel')
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Something went wrong'
      init({ message, color: 'danger' })
    }
  }
}
</script>
