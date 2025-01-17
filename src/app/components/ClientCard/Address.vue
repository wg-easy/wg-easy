<template>
  <span class="inline-block">
    {{ client.ipv4Address }}, {{ client.ipv6Address }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
