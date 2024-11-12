<template>
  <div
    v-for="n in totalSteps"
    :key="n"
    :class="[
      'step mx-3 h-[3px] grow',
      step >= n ? 'bg-red-800 dark:bg-white' : 'bg-gray-500',
    ]"
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
