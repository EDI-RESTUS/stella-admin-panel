<template>
  <VaModal
    size="large"
    class="big-modal"
    hide-default-actions
    model-value
    close-button
    @update:modelValue="emits('cancel')"
  >
    <div>
      <VaStepper v-model="step" controls-hidden :steps="steps" class="mt-2">
        <template #step-content-0>
          <div>
            <div v-if="!loading">
              <div class="mb-4">
                <VaInput
                  v-model="searchFamiliy"
                  placeholder="Search by name or code"
                  class="max-w-[400px]"
                  size="small"
                />
              </div>
              <VaForm ref="form" class="max-h-[50vh] overflow-y-auto mb-2">
                <div class="bg-blue-50 p-5 rounded-lg">
                  <div v-for="family in filteredFamilies" :key="family.Code" class="mb-2">
                    <VaCheckbox
                      v-model="family.isChecked"
                      :label="family.Code + ' - ' + family.Designation"
                      @update:modelValue="
                        ($event) =>
                          family.SubFamilies.length ? family.SubFamilies.map((e) => (e.isChecked = $event)) : null
                      "
                    />
                    <div v-if="family.SubFamilies.length" class="ml-4 space-y-2 flex flex-col">
                      <VaCheckbox
                        v-for="SubFamily in family.SubFamilies"
                        :key="SubFamily.Code"
                        v-model="SubFamily.isChecked"
                        size="small"
                        :label="SubFamily.Code + ' - ' + SubFamily.Designation"
                      />
                    </div>
                  </div>
                </div>
              </VaForm>
              <VaForm ref="form">
                <div class="flex justify-between items-center mb-0 bg-blue-50 p-3 rounded-lg">
                  <VaSelect v-model="formData.price" :options="prices" label="prices" class="max-w-[300px] mr-3" />
                  <VaCheckbox v-model="formData.includeCategories" label="Categories" class="mr-3 mt-3" />
                  <VaCheckbox v-model="formData.includeExtras" label="Extras" class="mr-3 mt-3" />
                  <VaCheckbox v-model="formData.includeHolds" label="Holds" class="mr-3 mt-3" />
                  <VaCheckbox v-model="formData.includeDescriptives" label="Modifiers" class="mt-3" />
                  <div class="flex flex-col-reverse md:flex-row md:items-center md:justify-end md:space-x-4 mt-3">
                    <VaButton :loading="isLoading" :disabled="isLoading" @click="importData">Get Articles</VaButton>
                  </div>
                </div>
              </VaForm>
            </div>
            <div v-else>
              <VaSkeleton variant="text" :lines="5" />
            </div>
          </div>
        </template>
        <template #step-content-1>
          <div class="mb-4">
            <VaInput
              v-model="searchQuery"
              placeholder="Search articles by name or code..."
              class="max-w-[400px]"
              size="small"
            />
          </div>
          <div class="max-h-[55vh] overflow-y-auto bg-blue-50 p-5 rounded-lg">
            <div v-for="family in filteredArticles" :key="family.code" class="mb-2">
              <VaCheckbox v-model="family.isChecked" :label="`${family.Code} - ${family.Designation}`" />
            </div>
          </div>
          <div class="flex flex-col-reverse md:flex-row md:items-center md:justify-end md:space-x-4">
            <VaButton class="my-4 md:mb-0" :loading="isLoading" :disabled="isLoading" @click="importArticles"
              >Import</VaButton
            >
          </div>
        </template>
      </VaStepper>
    </div>
  </VaModal>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { useToast, useForm } from 'vuestic-ui'
import { useServiceStore } from '@/stores/services'
import { emit } from 'process'
const { init } = useToast()
const emits = defineEmits(['cancel'])
const serviceStore = useServiceStore()
const loading = ref<boolean>(true)
const isLoading = ref<boolean>(false)
const families = ref<any[]>([])
const step = ref(0)

const steps = [{ label: 'Select Families' }, { label: 'Import Articles' }]
const fetchedFamilies = ref([])
const formData = ref({
  price: null,
  includeCategories: true,
  includeExtras: true,
  includeHolds: true,
  includeDescriptives: true,
})
const searchQuery = ref('')
const prices = [
  { value: '1', text: 'Price 1' },
  { value: '2', text: 'Price 2' },
  { value: '3', text: 'Price 3' },
  { value: '4', text: 'Price 4' },
  { value: '5', text: 'Price 5' },
  { value: '6', text: 'Price 6' },
  { value: '7', text: 'Price 7' },
  { value: '8', text: 'Price 7' },
  { value: '9', text: 'Price 9' },
]

const filteredArticles = computed(() => {
  return fetchedFamilies.value.filter(
    (family) =>
      family.Code.toString().toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      family.Designation.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

const searchFamiliy = ref('')

const filteredFamilies = computed(() => {
  return families.value.filter(
    (family) =>
      family.Code.toString().toLowerCase().includes(searchFamiliy.value.toLowerCase()) ||
      family.Designation.toLowerCase().includes(searchFamiliy.value.toLowerCase()),
  )
})

const getfamilies = async () => {
  loading.value = true
  const url: any = import.meta.env.VITE_API_BASE_URL
  try {
    const response = await axios.get(`${url}/winmax/families?outletId=${serviceStore.selectedRest}`)

    families.value = response.data.families.map((family) => {
      return {
        ...family,
        isChecked: true,
        SubFamilies: Object.keys(family).includes('SubFamilies')
          ? family.SubFamilies.map((SubFamily) => ({
              ...SubFamily,
              isChecked: true,
            }))
          : [],
      }
    })
    loading.value = false
    return response.data
  } catch (error) {
    init({
      message: error.response.data.error,
      color: 'danger',
    })
    loading.value = false
  }
}

getfamilies()

const importData = async () => {
  isLoading.value = true
  const url: any = import.meta.env.VITE_API_BASE_URL
  const filteredPayload = families.value
    .filter((family) => family.isChecked)
    .map((family) => ({
      familyCode: family.Code.toString(),
      subFamilyCodes: family.SubFamilies.filter((SubFamily) => SubFamily.isChecked).map((SubFamily) =>
        SubFamily.Code.toString(),
      ),
    }))

  const payload = {
    filterSchema: filteredPayload,
    includeCategories: formData.value.includeCategories,
    includeExtras: formData.value.includeExtras,
    includeHolds: formData.value.includeHolds,
    includeDescriptives: formData.value.includeDescriptives,
  }
  await axios
    .post(`${url}/winmax/articles?outletId=${serviceStore.selectedRest}&limit=100000`, payload)
    .then((response) => {
      init({
        message: response.data.message,
        color: 'success',
      })
      fetchedFamilies.value = response.data.articles.map((e) => {
        return {
          ...e,
          isChecked: true,
        }
      })
      step.value = 1
    })
    .catch((err) => {
      init({ message: err.response.data.message, color: 'danger' })
    })

  isLoading.value = false
}

const importArticles = async () => {
  isLoading.value = true
  const url: any = import.meta.env.VITE_API_BASE_URL
  const filteredPayload = fetchedFamilies.value.filter((article) => article.isChecked)

  const payload = {
    selectedArticles: filteredPayload.map((article) => article.ID),
    articles: filteredPayload,
    outletId: serviceStore.selectedRest,
  }
  await axios
    .post(`${url}/menuItems/import`, payload)
    .then((response) => {
      if (response.data.importedItems.length) {
        init({
          message: 'Articles Imported Successfully',
          color: 'success',
        })
      }
      if (response.data.updatedItems.length) {
        init({
          message: 'Articles Updated Successfully',
          color: 'success',
        })
      }
      if (response.data.failedItems.length) {
        init({
          message: 'Few Articles Failed to Import',
          color: 'danger',
        })
      }
      emits('cancel')
      step.value = 0
    })
    .catch((err) => {
      init({ message: err.response.data.message, color: 'danger' })
    })

  isLoading.value = false
}
</script>

<style lang="scss" scoped>
.va-modal__message {
  margin-bottom: 0 !important;
}
.va-stepper__step-content {
  margin-bottom: 0px !important;
}
</style>
