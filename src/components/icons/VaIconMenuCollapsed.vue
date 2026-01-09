<template>
  <svg class="va-icon-menu-collapsed" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" :fill="computedColor">
    <g fill="slate" fill-rule="evenodd">
      <!-- Top line -->
      <rect x="3" y="5" width="18" height="2" rx="1" />
      <!-- Middle line -->
      <rect x="3" y="11" width="18" height="2" rx="1" />
      <!-- Bottom line -->
      <rect x="3" y="17" width="18" height="2" rx="1" />
    </g>
  </svg>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useColors } from 'vuestic-ui'

const { getColor } = useColors()
const props = defineProps<{
  color?: string
}>()

const computedColor = computed(() => props.color || getColor('slate'))
</script>

<style lang="scss">
.va-icon-menu-collapsed {
  display: inline-block;
  width: 24px;
  height: 24px;
  transition: transform 0.3s ease;
}
</style>
