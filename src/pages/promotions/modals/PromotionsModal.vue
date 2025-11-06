<template>
  <div>
    <VaModal
      :model-value="isVisible"
      class="promotion-modal big-xl-modal !p-0"
      :mobile-fullscreen="false"
      size="large"
      hide-default-actions
      close-button
      @update:modelValue="$emit('update:isVisible', $event)"
    >
      <!-- HEADER -->
      <template #header>
        <div class="py-4 px-6 border-b font-bold text-xl gradient-header">
          {{ isUpdating ? 'Edit Promotion' : 'Add New Promotion' }}
        </div>
      </template>

      <!-- FORM -->
      <VaForm ref="form" @submit.prevent="submit">
        <div class="p-6 space-y-6">
          <!-- BASIC INFO -->
          <section v-if="!isUpdating">
            <h2 class="text-md font-semibold mb-2">Basic Information</h2>
            <div class="grid md:grid-cols-3 gap-4">
              <VaInput
                v-model="formData.name"
                label="Promotion Name"
                required-mark
                :rules="[validators.required]"
                placeholder="Enter promotion name"
              />
              <VaSelect
                v-model="formData.promotionType"
                :options="promotionTypes"
                label="Promotion Type"
                required-mark
                :rules="[validators.required]"
                placeholder="Select promotion type"
              />
              <VaSelect
                v-model="formData.usageType"
                :options="usageTypes"
                label="Usage Type"
                required-mark
                :rules="[validators.required]"
                placeholder="Single/Unlimited"
              />
            </div>
          </section>

          <!-- Value Discount -->
          <section v-if="formData.promotionType === 'Value Discount' && !isUpdating">
            <h2 class="text-md font-semibold mb-2">Value Discount Configuration</h2>
            <div class="grid md:grid-cols-3 gap-4">
              <VaInput
                v-model="formData.discountValue"
                label="Discount Value"
                type="number"
                min="0"
                step="0.01"
                required-mark
                :rules="[validators.required]"
                placeholder="e.g. 2.50"
              />
              <VaSelect
                v-model="formData.affect"
                :options="affectOptions"
                label="Affect"
                required-mark
                placeholder="Where to apply"
              />
              <VaSelect
    v-model="formData.affectItems"
    :options="affectItemsOptions"
    label="Affect Type"
    required-mark
    placeholder="Single/Multiple Items"
    :disabled="formData.affect !== 'Selected Items' || !['Value Discount', 'Percentage Discount'].includes(formData.promotionType)"
/>
            </div>
            <div v-if="formData.affect === 'Selected Items'" class="flex gap-2 mt-2">
              <VaButton @click="openArticlesModal">Articles</VaButton>
              <VaButton @click="openOptionsModal">Options</VaButton>
            </div>
          </section>

          <!-- Percentage Discount -->
          <section v-if="formData.promotionType === 'Percentage Discount' && !isUpdating">
            <h2 class="text-md font-semibold mb-2">Percentage Discount Configuration</h2>
            <div class="grid md:grid-cols-3 gap-4">
              <VaInput
                v-model="formData.discountPercentage"
                label="Discount %"
                type="number"
                min="1"
                max="100"
                required-mark
                :rules="[validators.required]"
                placeholder="e.g. 10"
              />
              <VaSelect
                v-model="formData.affect"
                :options="affectOptions"
                label="Affect"
                required-mark
                placeholder="Where to apply"
              />
              <VaSelect
    v-model="formData.affectItems"
    :options="affectItemsOptions"
    label="Affect Type"
    required-mark
    placeholder="Single/Multiple Items"
    :disabled="formData.affect !== 'Selected Items' || !['Value Discount', 'Percentage Discount'].includes(formData.promotionType)"
/>
            </div>
            <div v-if="formData.affect === 'Selected Items'" class="flex gap-2 mt-2">
              <VaButton @click="openArticlesModal">Articles</VaButton>
              <VaButton @click="openOptionsModal">Options</VaButton>
            </div>
          </section>

          <!-- Fixed Price -->
          <section v-if="formData.promotionType === 'Fixed Price' && !isUpdating">
            <h2 class="text-md font-semibold mb-2">Fixed Price Configuration</h2>

            <div class="grid md:grid-cols-2 gap-4 items-end">
              <!-- Price Input -->
              <VaInput
                v-model="formData.fixedPrice"
                label="Price"
                type="number"
                min="0"
                step="0.01"
                required-mark
                :rules="[validators.required]"
                placeholder="e.g. 2.50"
              />

              <!-- Buttons aligned properly -->
              <div class="flex gap-2">
                <VaButton @click="openArticlesModal">Articles</VaButton>
                <VaButton @click="openOptionsModal">Options</VaButton>
              </div>
            </div>
          </section>

          <!-- Free Delivery -->
          <section v-if="formData.promotionType === 'Free Delivery' && !isUpdating">
            <h2 class="text-md font-semibold mb-2">Free Delivery Configuration</h2>
            <VaAlert color="primary">Order Type will be automatically set to Delivery.</VaAlert>
          </section>

          <!-- Take X Pay Y -->
          <section v-if="formData.promotionType === 'Take X pay Y' && !isUpdating">
            <h2 class="text-md font-semibold mb-2">Take X pay Y Configuration</h2>
            <div class="grid md:grid-cols-4 gap-4 items-end">
              <VaInput
                v-model="formData.takeQuantity"
                label="Take"
                type="number"
                min="1"
                required-mark
                :rules="[validators.required]"
              />
              <VaInput
                v-model="formData.payQuantity"
                label="Pay"
                type="number"
                min="1"
                required-mark
                :rules="[validators.required]"
              />
              <VaInput v-model="formData.unitPrice" label="Unit Price (€)" type="number" />
              <div class="flex gap-2">
                <VaButton @click="openArticlesModal">Articles</VaButton>
                <VaButton @click="openOptionsModal">Options</VaButton>
              </div>
            </div>
          </section>

          <!-- Code Generation -->
          <section v-if="!isUpdating">
            <h2 class="text-md font-semibold mb-2">Code Generation</h2>
            <VaOptionList
              v-model="formData.codeType"
              :options="[
                { label: 'Single Code', value: 'SINGLE' },
                { label: 'Multi Code', value: 'MULTI' },
                { label: 'No Code (Auto)', value: 'AUTO' },
              ]"
              type="radio"
              text-by="label"
              value-by="value"
            />
            <!-- Single Code Input -->
            <div v-if="formData.codeType === 'SINGLE'" class="grid md:grid-cols-2 gap-4 mt-4">
              <VaInput
                v-model="formData.codes"
                label="Promotion Code"
                required-mark
                :rules="[validators.required]"
                placeholder="PROMOTION CODE"
              />
            </div>

            <!-- Multi Code Input -->
            <div v-if="formData.codeType === 'MULTI'" class="grid md:grid-cols-3 gap-4 mt-4">
              <VaInput v-model="formData.startFrom" label="Start From" type="number" min="1" required-mark />
              <VaInput v-model="formData.endAt" label="End At" type="number" min="1" required-mark />
              <VaInput v-model="formData.codePrefix" label="Code Prefix" placeholder="e.g. SEQ" required-mark />
            </div>

            <!-- AUTO -->
            <div v-if="formData.codeType === 'AUTO'" class="grid md:grid-cols-2 gap-4 mt-4">
              <VaInput v-model="formData.quantity" label="Quantity" type="number" min="1" required-mark />
              <VaInput v-model="formData.codePrefix" label="Code Prefix" placeholder="e.g. PROMO" />
            </div>
          </section>

          <!-- Validity & Availability -->
          <section>
            <h2 class="text-md font-semibold mb-2">Validity & Availability</h2>
            <div class="grid md:grid-cols-5 gap-3 mb-3">
              <VaInput v-model="formData.startDate" label="Start Date" type="date" required-mark />
              <VaInput v-model="formData.endDate" label="End Date" type="date" required-mark />
              <VaInput v-model="formData.startTime" label="Time From" type="time" required-mark />
              <VaInput v-model="formData.endTime" label="Time To" type="time" required-mark />
              <VaSelect v-model="formData.days" label="Available Days" placeholder="Select days" multiple required-mark :options="daysOfWeek"
              />
            </div>
          </section>

          <!-- Other Configuration -->
          <section>
            <h2 class="text-md font-semibold mb-2">Other Configurations</h2>
            <div class="grid md:grid-cols-3 gap-4">
              <VaSelect
                v-model="formData.orderType"
                :options="orderTypes"
                label="Order Type"
                required-mark
                multiple
                placeholder="Delivery, Takeaway, Dine-in"
                :disabled="formData.promotionType === 'Free Delivery'"
              />
              <VaSelect
                v-model="formData.deliveryZones"
                :options="safeDeliveryZones"
                text-by="label"
                value-by="value"
                label="Delivery Zones"
                required-mark
                multiple
                :loading="!safeDeliveryZones.length"
                placeholder="Select Delivery Zones"
                :max-visible-options="5"
              />
              <VaInput v-model="formData.minimumOrder" label="Minimum Order (€)" type="number" min="0" step="0.01" />
            </div>
            <div class="flex items-center gap-6 mt-3">
              <VaCheckbox v-model="formData.availableAtCC" label="Available at CC" />
              <VaCheckbox v-model="formData.availableAtWeb" label="Available at Web" />
              <VaCheckbox v-model="formData.affectOffers" label="Affect Offers" />
            </div>
          </section>
        </div>
      </VaForm>

      <!-- FOOTER -->
      <template #footer>
        <div class="flex justify-end gap-2 p-4">
          <VaButton color="secondary" @click="onCancel">Cancel</VaButton>
          <VaButton color="primary" @click="submit">
            {{ isUpdating ? 'Update' : 'Add' }}
          </VaButton>
        </div>
      </template>
    </VaModal>

    <!-- MENU ITEMS MODAL (Articles) -->
    <AddSelectionModal
      v-if="isMenuItemsModalOpen"
      :is-visible="isMenuItemsModalOpen"
      :promotion-id="formData._id"
      :outlet-id="servicesStore.selectedRest"
      :pending-selections="promotionsArticles"
      :type="'menuItems'"
      @cancel="isMenuItemsModalOpen = false"
      @promotionUpdated="emits('getPromotions')"
      @savePendingSelections="handleMenuItemsUpdated"
    />

    <!-- OPTIONS MODAL -->
    <AddSelectionModal
      v-if="isOptionsModalOpen"
      :is-visible="isOptionsModalOpen"
      :promotion-id="formData._id"
      :outlet-id="servicesStore.selectedRest"
      :pending-selections="promotionOptions"
      :type="'options'"
      @cancel="isOptionsModalOpen = false"
      @savePendingSelections="handleMenuItemsOptionsUpdated"
      @promotionUpdated="emits('getPromotions')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, toRef, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { useForm, useToast } from 'vuestic-ui'
import { validators } from '@/services/utils'
import { useServiceStore } from '@/stores/services'
import FileUpload from '@/components/file-uploader/FileUpload.vue'
import { createPromotion, updatePromotion, getPromotionById, getMenuItemsByOutlet } from '../services/promotionService'
import AddSelectionModal from './AddSelectionModal.vue'

const emits = defineEmits(['update:isVisible', 'submitted', 'open-selection-modal'])

const props = defineProps({
  isVisible: Boolean,
  promotion: {
    type: Object,
    default: () => ({}),
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
  deliveryZones: {
    type: Array,
    default: () => [],
  },
  isLoadingZones: Boolean,
  pendingSelections: {
    type: Object,
    required: true,
  },
})

const servicesStore = useServiceStore()
const { validate } = useForm('form')
const { init } = useToast()
const isLoadingZones = computed(() => props.deliveryZones.length === 0)
const articles = ref([])
const isArticlesLoading = ref(false)
const articlesSearchQuery = ref('')
const showArticlesSection = ref(false)
const isOptionsModalOpen = ref(false)

const promotionOptions = ref([])

const promotionsArticles = ref([])

// Toggle Articles Section
const fetchArticles = async () => {
  isArticlesLoading.value = true
  try {
    const res = await getMenuItemsByOutlet(servicesStore.selectedRest)

    // Handle different response shapes
    const items = res.data?.data || res.data || []

    // Map to article structure
    articles.value = items.map((item) => ({
      _id: item._id,
      code: item.code || '',
      name: item.name || '',
      selected: false,
    }))
  } catch (e) {
    console.error('[fetchArticles] Failed to load menu items', e)
  } finally {
    isArticlesLoading.value = false
  }
}

const promotionTypeMap = {
  'Value Discount': 'VALUE_DISCOUNT',
  'Percentage Discount': 'PERCENTAGE_DISCOUNT',
  'Fixed Price': 'FIXED_PRICE',
  'Free Delivery': 'FREE_DELIVERY',
  'Take X pay Y': 'TAKE_X_PAY_Y',
}

const affectMap = {
  'Entire Order': 'ENTIRE_ORDER',
  'Selected Items': 'SELECTED_ITEMS',
}

const affectItemsMap = {
  'Single Item': 'SINGLE',
  'Multiple Items': 'MULTIPLE',
}

const orderTypeMap = {
  Delivery: 'DELIVERY',
  Takeaway: 'TAKEAWAY',
  'Dine-in': 'DINE_IN',
}

const usageTypeMap = {
  'Single Use': 'SINGLE_USE',
  Unlimited: 'UNLIMITED',
}

const dayToNum = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

const reversePromotionTypeMap = Object.fromEntries(Object.entries(promotionTypeMap).map(([label, key]) => [key, label]))

const reverseAffectMap = Object.fromEntries(Object.entries(affectMap).map(([label, key]) => [key, label]))

const reverseAffectItemsMap = Object.fromEntries(Object.entries(affectItemsMap).map(([label, key]) => [key, label]))

const reverseOrderTypeMap = Object.fromEntries(Object.entries(orderTypeMap).map(([label, key]) => [key, label]))

const reverseUsageTypeMap = Object.fromEntries(Object.entries(usageTypeMap).map(([label, key]) => [key, label]))

const formData = ref({
  _id: '',
  name: '',
  promotionType: '',
  usageType: '',
  discountValue: null,
  discountPercentage: null,
  fixedPrice: null,
  affect: '',
  affectItems: '',
  codeType: 'SINGLE',
  codes: [],
  startFrom: 1,
  endAt: 10,
  codePrefix: '',
  quantity: 1,
  prefix: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  days: [],
  orderType: [],
  deliveryZones: [],
  availableAtCC: false,
  availableAtWeb: false,
  affectOffers: false,
  minimumOrder: null,
  takeQuantity: null,
  payQuantity: null,
  unitPrice: null,
  assetId: '',
  isActive: true,
})

const resetForm = () => {
  formData.value = {
    _id: '',
    name: '',
    promotionType: '',
    usageType: '',
    discountValue: null,
    discountPercentage: null,
    fixedPrice: null,
    affect: '',
    affectItems: '',
    codeType: 'SINGLE',
    quantity: 1,
    prefix: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    days: [],
    orderType: [],
    deliveryZones: [],
    availableAtCC: false,
    availableAtWeb: false,
    affectOffers: false,
    minimumOrder: null,
    takeQuantity: null,
    payQuantity: null,
    unitPrice: null,
    assetId: '',
    isActive: true,
  }
}
const numToDay = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

const promotionTypes = ['Value Discount', 'Percentage Discount', 'Fixed Price', 'Free Delivery', 'Take X pay Y']

const usageTypes = ['Single Use', 'Unlimited']
const affectOptions = ['Entire Order', 'Selected Items']
const affectItemsOptions = ['Single Item', 'Multiple Items']
const orderTypes = ['Delivery', 'Takeaway', 'Dine-in']

const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const daysOfWeek = ['All Days', ...allDays]

let isAutoSelecting = false

watch(
  () => formData.value.days,
  (newVal) => {
    if (isAutoSelecting) return

    if (newVal.includes('All Days')) {
      isAutoSelecting = true
      formData.value.days = [...allDays]
      nextTick(() => (isAutoSelecting = false))
    } else {
      const isPartial = allDays.some((day) => !newVal.includes(day))

      if (!isPartial && newVal.length === allDays.length + 1) {
        formData.value.days = newVal.filter((d) => d !== 'All Days')
      }
    }
  },
  { deep: true },
)

watch(
  () => formData.value.promotionType,
  (newVal) => {
    if (newVal === 'Free Delivery') {
      formData.value.orderType = ['Delivery']
    }
  },
)

watch(
  () => [formData.value.affect, formData.value.promotionType],
  ([affect, promotionType]) => {
    if (
      affect !== 'Selected Items' ||
      !['Value Discount', 'Percentage Discount'].includes(promotionType)
    ) {
      formData.value.affectItems = ''
    }
  }
)

function populateFormData(promotion) {
  // Parse timeRange "HH:MM - HH:MM"
  let startTime = ''
  let endTime = ''
  if (promotion.timeRange && typeof promotion.timeRange === 'string') {
    const [start, end] = promotion.timeRange.split('-').map((t) => t.trim())
    startTime = start || ''
    endTime = end || ''
  }

  formData.value = {
    _id: promotion._id || '',
    name: promotion.name || '',
    promotionType: reversePromotionTypeMap[promotion.promotionType] || '',
    usageType: reverseUsageTypeMap[promotion.usage] || '',
    discountValue: promotion.discountValue ?? null,
    discountPercentage: promotion.discountPercentage ?? promotion.discountPercentage ?? null,
    fixedPrice: promotion.fixedPrice ?? null,
    affect: reverseAffectMap[promotion.affect] || '',
    affectItems: reverseAffectItemsMap[promotion.affectItems] || '',
    codeType: promotion.automatic ? 'AUTO' : promotion.quantity > 1 ? 'MULTI' : 'SINGLE',
    quantity: promotion.codeType === 'MULTI' ? promotion.quantity : 1,
    prefix: promotion.codeType === 'MULTI' ? promotion.prefix || '' : '',
    startDate: toInputDate(promotion.dateRange?.startDate),
    endDate: toInputDate(promotion.dateRange?.endDate),
    startTime,
    endTime,
    days: Array.isArray(promotion.validDays) ? promotion.validDays.map((num) => numToDay[num]) : [],
    orderType: Array.isArray(promotion.orderTypes) ? promotion.orderTypes.map((type) => reverseOrderTypeMap[type]) : [],
    deliveryZones: (Array.isArray(promotion.deliveryZoneId) ? promotion.deliveryZoneId : [])
      .map((id) => props.deliveryZones.find((z) => z.value === id))
      .filter(Boolean),
    availableAtCC: !!promotion.availableAtCC,
    availableAtWeb: !!promotion.availableAtWeb,
    affectOffers: !!promotion.availableWithOffers,
    minimumOrder: promotion.minimumOrder ?? null,
    takeQuantity: promotion.takeQuantity || null,
    payQuantity: promotion.payQuantity || null,
    unitPrice: promotion.txpy?.unitPrice ?? null,
    assetId: promotion.assetId || '',
    codes: promotion.codes || [],
    isActive: promotion.isActive ?? true,
  }
}

watch(
  () => props.isVisible,
  (val) => {
    if (!val) {
      resetForm()
    }
  },
)
watch(
  () => props.isVisible,
  async (visible) => {
    console.log('[watch:isVisible] Changed to:', visible)
    console.log('[watch:isVisible] Current props:', {
      isEdit: props.isEdit,
      promotion: props.promotion,
    })

    if (visible && props.isEdit && props.promotion) {
      populateFormData(props.promotion) // new function to map directly
    }

    if (!visible) {
      resetForm()
    }
  },
)

watch(
  () => props.promotion,
  (newVal) => {
    console.log('[watch:promotion] Prop changed to:', newVal)
  },
)

function onCancel() {
  emits('update:isVisible', false)
}

const isMenuItemsModalOpen = ref(false)

const openMenuItemsModal = () => {
  isMenuItemsModalOpen.value = true
}

const handleMenuItemsUpdated = (value) => {
  promotionsArticles.value = value
}

const handleMenuItemsOptionsUpdated = (value) => {
  promotionOptions.value = value
}

const safeDeliveryZones = computed(() => {
  const raw = props.deliveryZones || []
  const mapped = raw.map((z: any) => ({
    label: z?.label ?? '',
    value: z?.value ?? '',
  }))
  mapped.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
  return [{ label: 'All Zones', value: 'ALL' }, ...mapped]
})

let isAutoSelectingZones = false

watch(
  () => formData.value.deliveryZones,
  (newVal) => {
    if (isAutoSelectingZones) return

    const allZones = safeDeliveryZones.value.filter((z) => z.value !== 'ALL')
    const allZoneValues = allZones.map((z) => z.value)

    const isAllSelected = newVal.includes('ALL') // `some()` can fail if zone is an object

    isAutoSelectingZones = true

    if (isAllSelected) {
      formData.value.deliveryZones = allZoneValues
    } else if (newVal.length === allZoneValues.length && newVal.some((z) => z === 'ALL')) {
      formData.value.deliveryZones = newVal.filter((val) => val !== 'ALL')
    }

    nextTick(() => {
      isAutoSelectingZones = false
    })
  },
  { deep: true },
)

const isUpdating = computed(() => !!(props.promotion && Object.keys(props.promotion).length))
const getDeliveryZones = async () => {
  try {
    const url = import.meta.env.VITE_API_BASE_URL
    const res = await axios.get(`${url}/deliveryZones`, {
      params: {
        outletId: servicesStore.selectedRest,
      },
    })

    return (
      res.data?.data.map((zone: any) => ({
        label: zone.name,
        value: zone._id,
      })) || []
    )
  } catch (e) {
    console.error('[getDeliveryZones] Failed to fetch zones', e)
    return []
  }
}

const toInputDate = (val: string) => {
  if (!val) return ''
  const d = new Date(val)
  return isNaN(d.getTime()) ? val : d.toISOString().slice(0, 10)
}
const submit = async () => {
  if (!validate()) {
    return
  }

  const raw = { ...formData.value }
  const data: any = {
    name: raw.name,
    isActive: raw.isActive,
    discountValue: raw.discountValue,
    discountPercentage: raw.discountPercentage,
    fixedPrice: raw.fixedPrice,
    automatic: raw.codeType === 'AUTO',
    quantity: raw.codeType === 'MULTI' ? raw.quantity : 1,
    prefix: raw.codeType === 'MULTI' ? raw.prefix : '',
    availableAtCC: raw.availableAtCC,
    availableAtWeb: raw.availableAtWeb,
    availableWithOffers: raw.affectOffers,
    minimumOrder: raw.minimumOrder,
    takeQuantity: raw.takeQuantity,
    payQuantity: raw.payQuantity,
    txpy: {
      unitPrice: raw.unitPrice,
    },
    promotionType: promotionTypeMap[raw.promotionType],
    affect: affectMap[raw.affect],
    affectItems: affectItemsMap[raw.affectItems],
    usage: usageTypeMap[raw.usageType],
    orderTypes: (raw.orderType || []).map((t) => orderTypeMap[t]),
    dateRange: {
      startDate: raw.startDate ? new Date(raw.startDate + 'T00:00:00Z').toISOString() : null,
      endDate: raw.endDate ? new Date(raw.endDate + 'T00:00:00Z').toISOString() : null,
    },
    timeRange: {
      startTime: raw.startTime,
      endTime: raw.endTime,
    },
    validDays: raw.days.includes('All Days') ? [0, 1, 2, 3, 4, 5, 6] : (raw.days || []).map((d) => dayToNum[d]),
    deliveryZoneId: (raw.deliveryZones || [])
      .map((z) => (typeof z === 'object' ? z.value : z))
      .filter((id) => id && id !== 'string'),
    createdBy: servicesStore.currentUser?._id || '65edc27fa8c3e330d7db0a23',
    outletId: servicesStore.selectedRest,
    menuItem: articles.value
      .filter((a) => a.selected)
      .map((a) => a._id)
      .filter((id) => id && id !== 'string'),
    option: [],
  }

  if (raw.codeType === 'SINGLE') {
    const codeList = Array.isArray(raw.codes)
      ? raw.codes
      : raw.codes
          .split('\n')
          .map((c) => c.trim())
          .filter(Boolean)

    if (!codeList.length) {
      init({ message: 'Please enter at least one code', color: 'danger' })
      return
    }

    data.codes = codeList
  } else if (raw.codeType === 'MULTI') {
    if (!raw.startFrom || !raw.endAt || Number(raw.endAt) <= Number(raw.startFrom)) {
      init({ message: 'Invalid start/end range', color: 'danger' })
      return
    }

    data.startFrom = Number(raw.startFrom)
    data.endAt = Number(raw.endAt)
    data.codePrefix = raw.codePrefix || ''
  } else if (raw.codeType === 'AUTO') {
    if (!raw.quantity || Number(raw.quantity) <= 0) {
      init({ message: 'Quantity must be greater than 0', color: 'danger' })
      return
    }

    data.automaticPromotion = true
    data.quantity = Number(raw.quantity)
    data.codePrefix = raw.codePrefix || ''
  }

  if (raw.assetId) data.assetId = raw.assetId
  if (props.isEdit && raw._id?.trim()) {
    data._id = raw._id
  } else {
    delete data._id
  }

  // Collect selected menu items
  const selectedMenuItems = articles.value.filter((a) => a.selected).map((a) => a._id)

  data.menuItem = selectedMenuItems

  try {
    if (data._id) {
      delete data.menuItem
      delete data.option
      delete data.codes
      await updatePromotion(data._id, data)
      init({ message: 'Promotion updated successfully!', color: 'success' })
      emits('submitted')
    } else {
      data.option = promotionOptions.value
      data.menuItem = promotionsArticles.value

      const created = await createPromotion(data) // returns promotion object directly
      init({ message: 'Promotion created successfully!', color: 'success' })

      emits('submitted')
    }
  } catch (err) {
    init({
      message: err.message || 'Error occurred while saving promotion',
      color: 'danger',
    })
  }
}

const selectedRest = toRef(servicesStore.selectedRest)

function openArticlesModal() {
  isMenuItemsModalOpen.value = true
}

function openOptionsModal() {
  isOptionsModalOpen.value = true
}
</script>

<style scoped>
.gradient-header {
  background: linear-gradient(90deg, #6a8dfa, #b76fdc 60%);
  color: white;
  border-radius: 8px 8px 0 0;
}

.promotion-modal {
  border-radius: 16px;
}
</style>
