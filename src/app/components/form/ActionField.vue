<template>
  <input
    :value="label"
    type="button"
    class="dark:bg-neutral-700 text-gray-500 col-span-2 py-2 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
  />
</template>

<script lang="ts" setup>
defineProps<{ label: string }>();
</script>
