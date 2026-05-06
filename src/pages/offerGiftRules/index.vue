<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToast } from 'vuestic-ui'
import axios from 'axios'
import OfferGiftRulesTable from './widgets/OfferGiftRulesTable.vue'
import EditOfferGiftRuleModal from './modals/EditOfferGiftRuleModal.vue'
import { useServiceStore } from '@/stores/services'

const servicesStore = useServiceStore()
const { init } = useToast()

const items = ref<any[]>([])
const isLoading = ref(false)
const isModalOpen = ref(false)
const selectedRule = ref<any>(null)

const url = import.meta.env.VITE_API_BASE_URL

async function getRules() {
  if (!servicesStore.selectedRest) return
  isLoading.value = true
  try {
    const response = await axios.get(`${url}/offer-gift-rules`)
    const all = response.data?.data || []
    items.value = all.filter((r: any) => {
      const offerOutlet = r?.offerId?.outletId
      if (!offerOutlet) return true
      return String(offerOutlet) === String(servicesStore.selectedRest)
    })
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to load gift rules', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}

function openAdd() {
  selectedRule.value = null
  isModalOpen.value = true
}

function openEdit(payload: any) {
  selectedRule.value = payload
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  selectedRule.value = null
  getRules()
}

watch(() => servicesStore.selectedRest, () => getRules())

if (servicesStore.selectedRest) getRules()
</script>

<template>
  <div>
    <VaCard class="mt-4">
      <VaCardContent>
        <OfferGiftRulesTable
          :items="items"
          :loading="isLoading"
          @getRules="getRules"
          @editRule="openEdit"
          @addRule="openAdd"
        />
      </VaCardContent>
    </VaCard>

    <EditOfferGiftRuleModal
      v-if="isModalOpen"
      :selected-rule="selectedRule"
      @cancel="closeModal"
    />
  </div>
</template>
