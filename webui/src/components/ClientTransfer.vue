<script>
import { useBytes } from '../composables/useBytes';
export default {
  setup() {
    const { bytes } = useBytes();
    return { bytes };
  },
  props: ['transferData', 'transferDataCurrent', 'title'],
};
</script>

<template>
  <span v-if="transferData" :title="title">
    ·
    <slot></slot>
    {{ bytes(transferDataCurrent) }}/s
  </span>
</template>
