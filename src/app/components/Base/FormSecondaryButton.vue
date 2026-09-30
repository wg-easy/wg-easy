<template>
  <component
    :is="elementType"
    role="button"
    class="rounded-lg border-2 border-gray-100 text-gray-500 hover:border-red-800 hover:bg-red-800 hover:text-white focus:border-red-800 focus:outline-0 focus:ring-0 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400 dark:disabled:border-neutral-800 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400"
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
  const { as, ...rest } = props;
  return rest;
});
</script>
