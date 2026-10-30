<template>
  <FormFieldLabel :id="id" :label="label" :description="description" />
  <BaseInput
    :id="id"
    v-model.trim="data"
    :name="id"
    type="text"
    :autocomplete="autocomplete"
    :placeholder="placeholder"
  />
</template>

<script lang="ts" setup>
defineProps<{
  id: string;
  label: string;
  description?: string;
  autocomplete?: string;
  placeholder?: string;
}>();

const data = defineModel<string | null>({
  set(value) {
    return value?.trim() || null;
  },
});
</script>
