<template>
  <component
    :is="elementType"
    role="button"
    class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 dark:text-neutral-200 max-md:border-x-0 border-2 border-gray-100 dark:border-neutral-600 py-2 md:px-4 rounded max-md:rounded-full inline-flex items-center transition"
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
