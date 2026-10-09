<template>
  <div
    class="mt-2 flex min-w-0 flex-wrap gap-x-2 gap-y-1 font-mono text-[11px] text-muted"
  >
    <span>{{ client.ipv4Address }}</span
    ><span class="hidden text-line sm:inline">/</span
    ><span class="break-all">{{ client.ipv6Address }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
