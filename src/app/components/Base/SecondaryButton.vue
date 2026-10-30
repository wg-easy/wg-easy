<template>
  <component :is="as" role="button" class="ui-button ui-button-secondary">
    <slot />
  </component>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ as?: string }>(), { as: 'button' });
</script>
