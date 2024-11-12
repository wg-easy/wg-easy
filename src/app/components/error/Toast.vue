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
    class="rounded-md bg-red-800 p-2 text-neutral-200"
  >
    <ToastTitle class="mb-4 text-lg font-medium">{{ title }} </ToastTitle>
    <ToastDescription as-child>{{ message }}</ToastDescription>
  </ToastRoot>
</template>
