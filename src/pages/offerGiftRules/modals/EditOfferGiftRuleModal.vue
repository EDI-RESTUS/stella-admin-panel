<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { useToast } from 'vuestic-ui'
import { useServiceStore } from '@/stores/services'

const props = defineProps({
  selectedRule: { type: Object as () => any, default: null },
})
const emits = defineEmits(['cancel'])

const { init } = useToast()
const servicesStore = useServiceStore()

const isVisible = ref(true)
const saving = ref(false)
const loadingOptions = ref(false)

const offerId = ref<string>('')
const triggerMenuItemId = ref<string>('')
const giftMenuItemId = ref<string>('')
const isActive = ref<boolean>(true)

const offerOptions = ref<{ text: string; value: string }[]>([])
const offerOnlyMenuItemOptions = ref<{ text: string; value: string }[]>([])

const url = import.meta.env.VITE_API_BASE_URL

function pickText(v: any) {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v.en || v.el || Object.values(v)[0] || ''
  return String(v)
}

function extractId(v: any): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') return String(v._id || v.id || '')
  return String(v)
}

if (props.selectedRule) {
  offerId.value = extractId(props.selectedRule.offerId)
  triggerMenuItemId.value = extractId(props.selectedRule.triggerMenuItemId)
  giftMenuItemId.value = extractId(props.selectedRule.giftMenuItemId)
  isActive.value = props.selectedRule.isActive !== false
}

watch(isVisible, (val) => {
  if (!val) emits('cancel')
})

const isEdit = computed(() => !!props.selectedRule)
const canSave = computed(
  () =>
    !!offerId.value &&
    !!triggerMenuItemId.value &&
    !!giftMenuItemId.value &&
    triggerMenuItemId.value !== giftMenuItemId.value,
)

async function loadOffers() {
  if (!servicesStore.selectedRest) return
  try {
    const res = await axios.get(`${url}/offers/?outletId=${servicesStore.selectedRest}&rawname=true`)
    const items = res.data?.data || []
    offerOptions.value = items
      .map((o: any) => ({
        text: `${pickText(o.name)}${o.code ? ` (${o.code})` : ''}`,
        value: String(o._id),
      }))
      .filter((o) => !!o.value)
      .sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }))
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to load offers', color: 'danger' })
  }
}

async function loadOfferOnlyMenuItems() {
  if (!servicesStore.selectedRest) return
  try {
    const res = await axios.get(
      `${url}/menuItems?outletId=${servicesStore.selectedRest}&limit=500&page=1&isActive=true`,
    )
    const items = res.data?.data || res.data || []
    offerOnlyMenuItemOptions.value = (Array.isArray(items) ? items : [])
      .filter((m: any) => m?.isOfferOnly === true)
      .map((m: any) => ({
        text: `${pickText(m.name)}${m.code ? ` (${m.code})` : ''}`,
        value: String(m._id),
      }))
      .filter((o) => !!o.value)
      .sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }))
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to load menu items', color: 'danger' })
  }
}

onMounted(async () => {
  loadingOptions.value = true
  await Promise.all([loadOffers(), loadOfferOnlyMenuItems()])
  loadingOptions.value = false
})

async function save() {
  if (!canSave.value) return
  saving.value = true
  const payload = {
    offerId: offerId.value,
    triggerMenuItemId: triggerMenuItemId.value,
    giftMenuItemId: giftMenuItemId.value,
    isActive: isActive.value,
  }
  try {
    if (isEdit.value) {
      await axios.patch(`${url}/offer-gift-rules/${props.selectedRule._id}`, payload)
      init({ message: 'Rule updated', color: 'success' })
    } else {
      await axios.post(`${url}/offer-gift-rules`, payload)
      init({ message: 'Rule created', color: 'success' })
    }
    isVisible.value = false
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to save rule', color: 'danger' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <VaModal v-model="isVisible" :mobile-fullscreen="false" size="small" hide-default-actions close-button>
    <template #header>
      <h1 class="va-h6 mb-2">{{ isEdit ? 'Edit Gift Rule' : 'Add Gift Rule' }}</h1>
    </template>

    <div class="flex flex-col gap-3">
      <VaSelect
        v-model="offerId"
        label="Offer"
        size="small"
        :options="offerOptions"
        value-by="value"
        :loading="loadingOptions"
        placeholder="Select an offer"
      />

      <VaSelect
        v-model="triggerMenuItemId"
        label="Trigger Menu Item (offer-only)"
        size="small"
        :options="offerOnlyMenuItemOptions"
        value-by="value"
        :loading="loadingOptions"
        placeholder="Pizza that triggers the gift"
      />

      <VaSelect
        v-model="giftMenuItemId"
        label="Gift Menu Item (offer-only)"
        size="small"
        :options="offerOnlyMenuItemOptions"
        value-by="value"
        :loading="loadingOptions"
        placeholder="Toy/gift item to award"
      />

      <p v-if="offerOnlyMenuItemOptions.length === 0 && !loadingOptions" class="text-xs text-warning">
        No offer-only menu items found. Mark items as &quot;Offer-only&quot; on the Articles page first.
      </p>
      <p
        v-if="triggerMenuItemId && triggerMenuItemId === giftMenuItemId"
        class="text-xs text-danger"
      >
        Trigger and gift items must differ.
      </p>

      <VaCheckbox v-model="isActive" label="Active" />
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 mt-4">
        <VaButton preset="secondary" @click="isVisible = false">Cancel</VaButton>
        <VaButton :disabled="!canSave || saving" @click="save">{{ isEdit ? 'Update' : 'Add' }}</VaButton>
      </div>
    </template>
  </VaModal>
</template>
