<template>
  <BaseSecondaryButton
    :as="as"
    :value="isInput ? label : undefined"
    :type="isInput ? type : undefined"
    class="col-span-2 px-4 py-2"
  >
    <template v-if="!isInput">
      {{ label }}
    </template>
  </BaseSecondaryButton>
</template>

<script lang="ts" setup>
import type { InputTypeHTMLAttribute } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    type?: InputTypeHTMLAttribute;
    as?: string;
  }>(),
  {
    type: 'button',
    as: 'input',
  }
);

const isInput = computed(() => props.as === 'input');
</script>
