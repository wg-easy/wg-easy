<template>
  <CheckboxRoot
    v-model="model"
    :disabled="disabled"
    :aria-label="label"
    class="grid size-5 shrink-0 place-items-center rounded border border-line bg-input text-white transition-colors disabled:opacity-45 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent"
  >
    <CheckboxIndicator>
      <MinusIcon
        v-if="model === 'indeterminate'"
        class="size-3.5"
        aria-hidden="true"
      />
      <CheckIcon v-else class="size-3.5" aria-hidden="true" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>

<script setup lang="ts">
import { CheckIcon, MinusIcon } from '@lucide/vue';

defineProps<{ label: string; disabled?: boolean }>();
const model = defineModel<boolean | 'indeterminate'>({ default: false });
</script>
