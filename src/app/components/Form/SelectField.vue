<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <select
    :id="id"
    v-model="data"
    :name="id"
    class="rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
  >
    <option v-for="option in options" :key="option.label" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>

<script lang="ts" setup>
defineProps<{
  id: string;
  label: string;
  description?: string;
  options: { label: string; value: number | null }[];
}>();

// Vue's <select> v-model tracks the raw `:value` bindings, so numbers and
// `null` (the "no group" sentinel) round-trip without string coercion.
const data = defineModel<number | null>();
</script>
