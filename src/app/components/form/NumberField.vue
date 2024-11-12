<template>
  <Label :for="id" class="font-semibold md:align-middle md:leading-10">
    {{ label }}
  </Label>
  <input
    :id="id"
    v-model.number="data"
    type="number"
    class="rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
  />
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string }>();

const data = defineModel<number>();
</script>
