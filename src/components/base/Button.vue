<template>
  <component :is="elementType" role="button" :class="btnClasses" v-bind="attrs">
    <slot />
  </component>
</template>

<script setup lang="ts">
const props = defineProps({
  as: {
    type: String,
    default: 'button',
  },
  class: {
    type: String,
    default: '',
  },
});

const elementType = computed(() => props.as);

const attrs = computed(() => {
  const { as, class: _, ...attrs } = props;
  return attrs;
});

const btnClasses =
  props.class ||
  `
py-2 px-4 transition-colors
hover:bg-primary hover:border-primary
hover:text-white text-gray-700 dark:text-neutral-200
max-md:border-l-0 border-2 border-gray-100 dark:border-neutral-600
  `.replaceAll('\n', ' ');
</script>
