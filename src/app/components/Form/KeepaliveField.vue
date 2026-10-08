<template>
  <div class="flex items-center">
    <FormLabel :for="id">{{ label }}</FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <BaseInput
    :id="id"
    v-model="data"
    :name="id"
    :type="allowRange ? 'text' : 'number'"
  />
</template>

<script lang="ts" setup>
defineProps<{
  id: string;
  label: string;
  description?: string;
  allowRange: boolean;
}>();
const data = defineModel<number | string>();
</script>
