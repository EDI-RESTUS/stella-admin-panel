<template>
  <VaModal
    :model-value="isOpen"
    size="small"
    close-button
    hide-default-actions
    @update:modelValue="$emit('update:isOpen', $event)"
  >
    <h3 class="text-lg font-semibold mb-3">
      {{ isEditing ? 'Edit Note' : 'Add Note' }}
    </h3>

    <VaTextarea
      v-model="note"
      placeholder="Enter a note about this order"
      class="w-full"
      autosize
      :min-rows="8"
      :max-rows="20"
    />

    <template #footer>
      <div class="flex justify-end gap-3">
        <VaButton preset="secondary" @click="close">Cancel</VaButton>
        <VaButton v-if="isEditing" color="danger" @click="removeNote"> Remove </VaButton>
        <VaButton color="primary" @click="isEditing ? updateNote() : saveNote()">
          {{ isEditing ? 'Update Note' : 'Save Note' }}
        </VaButton>
      </div>
    </template>
  </VaModal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useCallCenterLogger } from '@/composables/useCallCenterLogger'
const { log } = useCallCenterLogger()

const props = defineProps({
  isOpen: Boolean,
  orderId: String,
  note: { type: Object, default: null },
})
const emits = defineEmits(['update:isOpen', 'saved', 'updated', 'removed'])

const note = ref('')

const isEditing = computed(() => !!props.note)
watch(
  () => props.note,
  (val) => {
    note.value = val?.text || ''
  },
  { immediate: true },
)

const close = () => {
  emits('update:isOpen', false)
  note.value = ''
}

const saveNote = () => {
  if (!note.value.trim()) return
  log('ORDER_NOTE_ADDED', { orderId: props.orderId })
  emits('saved', { orderId: props.orderId, text: note.value })
  close()
}

const updateNote = () => {
  if (!note.value.trim()) return
  log('ORDER_NOTE_UPDATED', { orderId: props.note.orderId })
  emits('updated', { orderId: props.note.orderId, text: note.value })
  close()
}

const removeNote = () => {
  log('ORDER_NOTE_REMOVED', { orderId: props.note.orderId })
  emits('removed', { orderId: props.note.orderId })
  close()
}
</script>
