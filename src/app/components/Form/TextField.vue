<template>
  <FormFieldLabel :id="id" :label="label" :description="description" />
  <BaseInput
    :id="id"
    v-model.trim="data"
    :name="id"
    type="text"
    :autocomplete="autocomplete"
    :disabled="disabled"
  />
</template>

<script lang="ts" setup>
defineProps<{
  id: string;
  label: string;
  description?: string;
  autocomplete?: string;
  disabled?: boolean;
}>();

const data = defineModel<string>();
</script>
