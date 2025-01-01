<template>
  <form :action="action" :method="method">
    <slot />
  </form>
</template>

<script lang="ts" setup>
defineProps<{ method: string; action: string }>();
</script>
