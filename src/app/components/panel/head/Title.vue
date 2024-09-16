<script setup lang="ts">
const _props = defineProps<{
  text: string;
}>();
</script>

<template>
  <h3 class="flex-1 text-2xl font-medium dark:text-neutral-200">
    {{ text }}
  </h3>
</template>
