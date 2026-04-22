<template>
  <VaModal
    v-model="state.visible"
    hide-default-actions
    no-dismiss
    size="small"
  >
    <div class="alert-modal-body">
      <p class="alert-modal-message">{{ state.message }}</p>
      <div class="alert-modal-actions">
        <VaButton color="primary" @click="closeAlert">OK</VaButton>
      </div>
    </div>
  </VaModal>
</template>

<script setup>
import { useCallCenterAlert } from '@/composables/useCallCenterAlert'

const { state, closeAlert } = useCallCenterAlert()
</script>

<style scoped>
.alert-modal-body {
  padding: 1rem 0.5rem 0.5rem;
  text-align: center;
}
.alert-modal-message {
  font-size: 1rem;
  margin-bottom: 1.25rem;
  color: #1a1a1a;
}
.alert-modal-actions {
  display: flex;
  justify-content: center;
}
</style>
