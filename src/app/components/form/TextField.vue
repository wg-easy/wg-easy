<template>
  <Label :for="id" class="font-semibold md:align-middle md:leading-10">
    {{ label }}
  </Label>
  <input
    :id="id"
    v-model="data"
    type="text"
    class="dark:bg-neutral-700 text-gray-500 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-800 rounded-lg focus:border-red-800 dark:placeholder:text-neutral-400 focus:outline-0 focus:ring-0"
  />
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string }>();

const data = defineModel<string>();
</script>
