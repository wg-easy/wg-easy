<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
    <BaseTooltip
      v-if="overridden"
      text="This field is overridden by an environment variable"
    >
      <IconsWarning class="ml-1 size-4 text-amber-500" />
    </BaseTooltip>
  </div>
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
  overridden?: boolean;
}>();

const data = defineModel<string>();
</script>
