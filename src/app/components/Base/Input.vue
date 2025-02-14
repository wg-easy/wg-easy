<template>
  <input
    v-model="data"
    class="rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
  />
</template>

<script lang="ts" setup>
const data = defineModel<unknown>();
</script>
