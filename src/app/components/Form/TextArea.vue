<template>
  <FormFieldLabel
    :id="id"
    :label="label"
    :description="description"
    class="self-start"
  />
  <BaseTextArea
    :id="id"
    v-model.trim="data"
    :name="id"
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
