<template>
  <p v-if="client.description" class="mt-1 text-xs wrap-anywhere text-muted">
    {{ client.description }}
  </p>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
