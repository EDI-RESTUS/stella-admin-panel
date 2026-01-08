<template>
  <VaModal
    :model-value="modelValue"
    hide-default-actions
    size="medium"
    @update:modelValue="(val) => emit('update:modelValue', val)"
  >
    <template #header>
      <!-- <h3 class="font-semibold text-md">Confirmation</h3> -->
    </template>

    <div class="text-sm">Are you sure you want to remove the Customer Details?</div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <VaButton size="small" @click="emit('update:modelValue', false)">Cancel</VaButton>
        <VaButton color="danger" size="small" @click="onYes">Yes</VaButton>
        <VaButton color="danger" preset="secondary" border-color="danger" size="small" @click="onYesClearAll"
          >Yes, clear all</VaButton
        >
      </div>
    </template>
  </VaModal>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, required: true },
})
const emit = defineEmits(['update:modelValue', 'confirm', 'confirm-clear-all'])

function onYes() {
  emit('confirm') // tell parent to clear customer only
  emit('update:modelValue', false) // close modal
}

function onYesClearAll() {
  emit('confirm-clear-all') // tell parent to clear customer AND items
  emit('update:modelValue', false) // close modal
}
</script>
