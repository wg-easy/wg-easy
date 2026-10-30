<template>
  <component :is="as" role="button" class="ui-button ui-button-primary">
    <slot />
  </component>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ as?: string }>(), { as: 'button' });
</script>
