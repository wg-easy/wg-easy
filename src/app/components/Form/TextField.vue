<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <BaseInput
    :id="id"
    v-model.trim="data"
    :name="id"
    type="text"
    :autcomplete="autocomplete"
  />
</template>

<script lang="ts" setup>
defineProps<{
  id: string;
  label: string;
  description?: string;
  autocomplete?: string;
}>();

const data = defineModel<string>();
</script>
