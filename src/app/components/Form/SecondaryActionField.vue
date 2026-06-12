<template>
  <BaseFormSecondaryButton
    as="input"
    :value="label"
    :type="type ?? 'button'"
    class="col-span-2 py-2"
  />
</template>

<script lang="ts" setup>
import type { InputTypeHTMLAttribute } from 'vue';

defineProps<{
  label: string;
  type?: InputTypeHTMLAttribute;
}>();
</script>
