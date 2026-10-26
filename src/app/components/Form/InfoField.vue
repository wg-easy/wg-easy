<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <InfoIcon class="size-4" />
    </BaseTooltip>
  </div>
  <span :id="id" class="flex flex-col justify-center">{{ data }}</span>
</template>

<script lang="ts" setup>
import { InfoIcon } from '@lucide/vue';

defineProps<{
  id: string;
  label: string;
  description?: string;
  data?: string;
}>();
</script>
