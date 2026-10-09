<template>
  <component
    :is="elementType"
    role="button"
    class="ui-button ui-button-secondary"
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
