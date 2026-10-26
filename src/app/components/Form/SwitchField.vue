<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <InfoIcon class="size-4" />
    </BaseTooltip>
  </div>
  <div class="my-auto">
    <BaseSwitch :id="id" v-model="data" />
  </div>
</template>

<script lang="ts" setup>
import { InfoIcon } from '@lucide/vue';

defineProps<{ id: string; label: string; description?: string }>();
const data = defineModel<boolean>();
</script>
