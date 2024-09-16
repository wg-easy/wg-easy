<script setup lang="ts">
const { title, message, duration } = defineProps<{
  title: string;
  message: string;
  duration?: number;
}>();
</script>

<template>
  <ToastRoot
    :duration="duration"
    class="bg-red-800 rounded-md p-2 text-neutral-200"
  >
    <ToastTitle class="mb-4 font-medium text-lg">{{ title }} </ToastTitle>
    <ToastDescription as-child>{{ message }}</ToastDescription>
  </ToastRoot>
</template>
