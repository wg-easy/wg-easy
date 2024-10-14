<template>
  <span class="inline-block">
    {{ client.address4 }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
