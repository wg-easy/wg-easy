<template>
  <component
    :is="elementType"
    role="button"
    class="inline-flex items-center rounded border-2 border-red-800 bg-red-800 px-4 py-2 text-white transition hover:border-red-600 hover:bg-red-600"
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
