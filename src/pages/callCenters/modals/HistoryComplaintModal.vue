<template>
  <VaModal
    :model-value="isOpen"
    size="small"
    close-button
    hide-default-actions
    @update:modelValue="$emit('update:isOpen', $event)"
  >
    <h3 class="text-lg font-semibold mb-3">Add Complaint</h3>

    <VaTextarea
      v-model="pComplaint"
      placeholder="Enter a complaint about this order..."
      class="w-full"
      autosize
      :min-rows="8"
      :max-rows="20"
    />

    <template #footer>
      <div class="flex justify-end gap-3">
        <VaButton preset="secondary" @click="close">Cancel</VaButton>
        <VaButton v-if="isEditing" color="danger" @click="removeComplaint"> Remove </VaButton>

        <VaButton color="primary" @click="isEditing ? updateComplaint() : saveComplaint()">
          {{ isEditing ? 'Update Complaint' : 'Save Complaint' }}
        </VaButton>
      </div>
    </template>
  </VaModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCallCenterLogger } from '@/composables/useCallCenterLogger'
const { log } = useCallCenterLogger()

const props = defineProps({
  isOpen: Boolean,
  orderId: String,
  complaint: { type: Object, default: null },
})
const emits = defineEmits(['update:isOpen', 'saved', 'updated', 'removed'])

const pComplaint = ref('')
const isEditing = computed(() => !!props.complaint)

watch(
  () => props.complaint,
  (val) => {
    pComplaint.value = val?.text || ''
  },
  { immediate: true },
)

const close = () => {
  emits('update:isOpen', false)
  pComplaint.value = ''
}

const saveComplaint = () => {
  if (!pComplaint.value.trim()) return
  log('ORDER_COMPLAINT_ADDED', { orderId: props.orderId })
  emits('saved', { orderId: props.orderId, text: pComplaint.value })
  close()
}

const updateComplaint = () => {
  if (!pComplaint.value.trim()) return
  log('ORDER_COMPLAINT_UPDATED', { orderId: props.complaint.orderId })
  emits('updated', { orderId: props.complaint.orderId, text: pComplaint.value })
  close()
}

const removeComplaint = () => {
  log('ORDER_COMPLAINT_REMOVED', { orderId: props.complaint.orderId })
  emits('removed', { orderId: props.complaint.orderId })
  close()
}
</script>
