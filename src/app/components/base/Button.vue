<template>
  <component
    :is="elementType"
    role="button"
    class="inline-flex items-center rounded border-2 border-gray-100 py-2 text-gray-700 transition hover:border-red-800 hover:bg-red-800 hover:text-white max-md:rounded-full max-md:border-x-0 md:px-4 dark:border-neutral-600 dark:text-neutral-200"
    v-bind="attrs"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
const props = defineProps({
  as: {
    type: String,
    default: 'button',
  },
});

const elementType = computed(() => props.as);

const attrs = computed(() => {
  const { as, ...attrs } = props;
  return attrs;
});
</script>
