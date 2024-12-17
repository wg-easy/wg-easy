<template>
  <span class="inline-block">
    {{ client.address4 }}, {{ client.address6 }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
