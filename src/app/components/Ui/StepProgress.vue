<template>
  <div
    v-for="n in totalSteps"
    :key="n"
    :class="['h-1 grow rounded-full', step >= n ? 'bg-accent' : 'bg-line']"
  ></div>
</template>

<script setup lang="ts">
defineProps({
  step: {
    type: Number,
    required: true,
  },
  totalSteps: {
    type: Number,
    default: 5,
  },
});
</script>
