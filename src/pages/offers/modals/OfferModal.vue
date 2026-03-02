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
      <h1 class="va-h6 mb-5">{{ isUpdating ? 'Update' : 'Add' }} Offer</h1>
    </template>

    <VaForm ref="form" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-4">
        <div class="grid gap-4">
          <div class="grid md:grid-cols-2 gap-4">
            <!-- Name per language -->
            <div class="flex flex-col gap-2">
              <div v-for="lang in supportedLanguages" :key="lang + 'name'">
                <VaInput
                  v-model="formData.name[lang]"
                  :label="`Name (${lang.toUpperCase()})`"
                  :rules="lang === primaryLanguage ? [validators.required] : []"
                  :required-mark="lang === primaryLanguage"
                  placeholder="Enter offer name"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <VaInput
                v-model="formData.price"
                :rules="[validators.required]"
                required-mark
                label="Price"
                placeholder="Enter price"
                type="number"
              />
              <VaInput v-model="formData.code" label="Code" placeholder="Enter code" type="text" />
            </div>
          </div>

          <!-- Description per language -->
          <div class="flex flex-col gap-2">
            <div v-for="lang in supportedLanguages" :key="lang + 'desc'">
              <VaTextarea
                v-model="formData.description[lang]"
                :label="`Description (${lang.toUpperCase()})`"
                placeholder="Short description"
                rows="3"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <VaInput
            v-model="formData.dateOffer.startDate"
            label="Start Date"
            type="date"
            :max="formData.dateOffer.endDate"
          />
          <VaInput
            v-model="formData.dateOffer.endDate"
            label="End Date"
            type="date"
            :min="formData.dateOffer.startDate"
          />
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <VaInput v-model="formData.timeOffer.startTime" label="Time From" type="time" />
          <VaInput v-model="formData.timeOffer.endTime" label="Time To" type="time" />
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <VaSelect v-model="formData.weeklyOffer" label="Available Days" multiple :options="dayOptions" />
          <VaSelect
            v-model="formData.orderType"
            :rules="[validators.required]"
            required-mark
            multiple
            track-by="value"
            label="Order Type"
            :options="['takeaway', 'delivery', 'dine-in']"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="va-input-label va-input-wrapper__label va-input-wrapper__label--outer text-primary font-semibold">Image</label>
          <FileUpload
            :selected-rest="selectedRest"
            @uploadSuccess="(data) => ((formData.imageUrl = data.url), (formData.assetId = data._id))"
          />
          <div class="flex items-start gap-4 mt-2">
            <img
              v-if="formData.imageUrl"
              :src="formData.imageUrl"
              alt="Image"
              class="w-32 h-32 rounded-lg object-cover border"
            />
            <VaButton
              v-if="formData.assetId"
              preset="primary"
              color="danger"
              icon="mso-delete"
              size="small"
              class="mt-2"
              @click="deleteAsset"
            />
          </div>
        </div>
      </div>
    </VaForm>

    <template #footer>
      <div class="flex justify-end mt-6">
        <VaButton type="submit" @click="submit()">{{ isUpdating ? 'Update' : 'Add' }}</VaButton>
      </div>
    </template>
  </VaModal>
</template>

<script setup lang="ts">
import { ref, watch, computed, toRef, nextTick, onMounted } from 'vue'
import axios from 'axios'
import { useForm, useToast } from 'vuestic-ui'
import { validators } from '@/services/utils'
import { useServiceStore } from '@/stores/services'
import FileUpload from '@/components/file-uploader/FileUpload.vue'

const emits = defineEmits(['cancel'])

const props = defineProps({
  selectedOption: {
    type: Object,
    default: () => null,
  },
})

const isVisible = ref(true)

watch(isVisible, (val) => {
  if (!val) emits('cancel')
})

const servicesStore = useServiceStore()
const { validate } = useForm('form')
const { init } = useToast()

// ----- Supported Languages (same pattern as Articles) -----
const supportedLanguages = ref<string[]>(['en'])
const primaryLanguage = ref('en')

const getOutletDetails = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/outlets/${servicesStore.selectedRest}`)
    if (response.data?.supportedLanguages?.length) {
      supportedLanguages.value = response.data.supportedLanguages
    } else {
      supportedLanguages.value = ['en']
    }
    if (response.data?.defaultLanguage) {
      primaryLanguage.value = response.data.defaultLanguage
    }
  } catch {
    supportedLanguages.value = ['en']
  }
}

onMounted(() => {
  getOutletDetails()
})

// Helper: normalise name/description from the API — may come back as string or Record
function toLocaleRecord(val: any, fallbackLang = 'en'): Record<string, string> {
  if (!val) return { [fallbackLang]: '' }
  if (typeof val === 'string') return { [fallbackLang]: val }
  return { ...val }
}

// ----- Form state -----
const formData = ref({
  _id: '',
  name: {} as Record<string, string>,
  description: {} as Record<string, string>,
  price: '' as string | number,
  code: '',
  imageUrl: '',
  assetId: '',
  dateOffer: { startDate: '', endDate: '' },
  timeOffer: { startTime: '', endTime: '' },
  weeklyOffer: [] as string[],
  orderType: [] as string[],
  selections: [] as any[],
  isActive: true,
})

const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const dayOptions = ['All Days', ...allDays]

let isAutoSelecting = false

watch(
  () => formData.value.weeklyOffer,
  (newVal) => {
    if (isAutoSelecting) return

    if (newVal.includes('All Days')) {
      isAutoSelecting = true
      formData.value.weeklyOffer = [...allDays]
      nextTick(() => (isAutoSelecting = false))
    } else {
      const isPartial = allDays.some((day) => !newVal.includes(day))
      if (!isPartial && newVal.length === allDays.length + 1) {
        formData.value.weeklyOffer = newVal.filter((d) => d !== 'All Days')
      }
    }
  },
  { deep: true },
)

const isUpdating = computed(() => props.selectedOption && Object.keys(props.selectedOption).length)

const selectionsJson = ref('')

watch(
  () => props.selectedOption,
  async (val) => {
    if (!val) return

    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/offers/${val._id}?rawname=true`)
      const data = response.data.data

      formData.value = {
        _id: data._id || '',
        name: toLocaleRecord(data.name, primaryLanguage.value),
        description: toLocaleRecord(data.description, primaryLanguage.value),
        price: data.price || 0,
        code: data.code || '',
        imageUrl: data.imageUrl || '',
        assetId: data.assetId || '',
        dateOffer: {
          startDate: data.dateOffer?.startDate?.slice(0, 10) || '',
          endDate: data.dateOffer?.endDate?.slice(0, 10) || '',
        },
        timeOffer: {
          startTime: data.timeOffer?.startTime || '',
          endTime: data.timeOffer?.endTime || '',
        },
        weeklyOffer: (data.weeklyOffer || []).map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)),
        orderType: Array.isArray(data.orderType) ? data.orderType : [],
        selections: data.selections || [],
        isActive: data.isActive ?? true,
      }

      selectionsJson.value = JSON.stringify(data.selections || [], null, 2)
    } catch (error: any) {
      init({ message: error.response?.data?.message || 'Failed to load offer', color: 'danger' })
    }
  },
  { immediate: true },
)

const submit = async () => {
  if (validate()) {
    const data = JSON.parse(JSON.stringify(formData.value))

    delete data.createdAt
    delete data.updatedAt
    delete data.__v
    if (!data.assetId) {
      delete data.assetId
    }

    if (data.dateOffer?.startDate) {
      data.dateOffer.startDate = new Date(data.dateOffer.startDate + 'T00:00:00Z').toISOString()
    }
    if (data.dateOffer?.endDate) {
      data.dateOffer.endDate = new Date(data.dateOffer.endDate + 'T00:00:00Z').toISOString()
    }

    data.outletId = servicesStore.selectedRest
    data.weeklyOffer = data.weeklyOffer.map((d: string) => d.toLowerCase())

    const url = import.meta.env.VITE_API_BASE_URL

    try {
      if (data._id) {
        delete data.selections
        await axios.put(`${url}/offers/${data._id}`, data)
        init({ message: 'Offer updated successfully!', color: 'success' })
      } else {
        delete data._id
        await axios.post(`${url}/offers`, data)
        init({ message: 'Offer created successfully!', color: 'success' })
      }
      emits('cancel')
    } catch (err: any) {
      init({ message: err?.response?.data?.message || 'Error occurred', color: 'danger' })
    }
  }
}

const selectedRest = toRef(servicesStore.selectedRest)

const deleteAsset = () => {
  const url: any = import.meta.env.VITE_API_BASE_URL
  axios
    .delete(`${url}/assets/${formData.value.assetId}`)
    .then(() => {
      formData.value.imageUrl = ''
      formData.value.assetId = ''
      init({ message: 'Asset deleted successfully', color: 'success' })
    })
    .catch((err) => {
      init({ message: err.response.data.error, color: 'danger' })
    })
}
</script>
