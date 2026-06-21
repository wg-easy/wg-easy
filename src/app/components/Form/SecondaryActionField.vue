<template>
  <BaseFormSecondaryButton
    :as="as"
    :value="isInput ? label : undefined"
    :type="isInput ? type : undefined"
    class="col-span-2 px-4 py-2"
  >
    <template v-if="!isInput">
      {{ label }}
    </template>
  </BaseFormSecondaryButton>
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

const isInput = computed(() => {
  return props.as === 'input';
});
</script>
