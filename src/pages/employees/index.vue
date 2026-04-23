<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToast } from 'vuestic-ui'
import axios from 'axios'
import EmployeesTable from './widgets/EmployeesTable.vue'
import EditEmployeeModal from './modals/EditEmployeeModal.vue'
import { useServiceStore } from '@/stores/services'

const servicesStore = useServiceStore()
const { init } = useToast()

const items = ref<any[]>([])
const isLoading = ref(false)
const isModalOpen = ref(false)
const selectedEmployee = ref<any>(null)

const url = import.meta.env.VITE_API_BASE_URL

async function getEmployees() {
  if (!servicesStore.selectedRest) return
  isLoading.value = true
  try {
    const response = await axios.get(`${url}/employees/${servicesStore.selectedRest}`)
    items.value = response.data?.data || []
  } catch (err: any) {
    init({ message: err?.response?.data?.message || 'Failed to load employees', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}

function openAdd() {
  selectedEmployee.value = null
  isModalOpen.value = true
}

function openEdit(payload: any) {
  selectedEmployee.value = payload
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  selectedEmployee.value = null
  getEmployees()
}

watch(() => servicesStore.selectedRest, () => getEmployees())

if (servicesStore.selectedRest) getEmployees()
</script>

<template>
  <div>
    <VaCard class="mt-4">
      <VaCardContent>
        <EmployeesTable
          :items="items"
          :loading="isLoading"
          @getEmployees="getEmployees"
          @editEmployee="openEdit"
          @addEmployee="openAdd"
        />
      </VaCardContent>
    </VaCard>

    <EditEmployeeModal
      v-if="isModalOpen"
      :selected-employee="selectedEmployee"
      @cancel="closeModal"
    />
  </div>
</template>
