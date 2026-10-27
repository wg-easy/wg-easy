<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <RLabel :for="id" class="text-xs font-medium text-subtle">
      {{ label }}
    </RLabel>
    <BaseSelect
      :id="id"
      v-model="selected"
      :label="label"
      :options="options"
      :show-value="false"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import { Label as RLabel } from 'reka-ui';
import { useId } from 'vue';

defineProps<{
  label: string;
  options: { label: string; value: T }[];
}>();
const selected = defineModel<T>({ required: true });
const id = useId();
</script>
