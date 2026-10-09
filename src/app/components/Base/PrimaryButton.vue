<template>
  <component
    :is="elementType"
    role="button"
    class="ui-button ui-button-primary"
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
