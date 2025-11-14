<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
    <BaseTooltip v-if="overridden" text="This field is overridden by an environment variable">
      <IconsWarning class="size-4 ml-1 text-amber-500" />
    </BaseTooltip>
  </div>
  <BaseInput :id="id" v-model.number="data" :name="id" type="number" />
</template>

<script lang="ts" setup>
defineProps<{
  id: string;
  label: string;
  description?: string;
  overridden?: boolean;
}>();

const data = defineModel<number>();
</script>
