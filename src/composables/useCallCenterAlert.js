import { reactive } from 'vue'

const state = reactive({
  visible: false,
  message: '',
})

export function useCallCenterAlert() {
  function showAlert(message) {
    state.message = message
    state.visible = true
  }

  function closeAlert() {
    state.visible = false
    state.message = ''
  }

  return { state, showAlert, closeAlert }
}
