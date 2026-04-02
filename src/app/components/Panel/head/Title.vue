<template>
  <h2 class="flex-1 break-all text-2xl font-medium">
    {{ text }}
  </h2>
</template>

<script setup lang="ts">
const { text } = defineProps<{
  text: string;
}>();
</script>
