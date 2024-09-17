<template>
  <div
    v-for="n in totalSteps"
    :key="n"
    :class="[
      'step grow h-[3px] mx-4',
      step >= n ? 'dark:bg-white' : 'dark:bg-gray-500',
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
    default: 4,
  },
});
</script>
