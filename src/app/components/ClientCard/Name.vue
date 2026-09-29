<template>
  <div
    class="break-all text-sm text-gray-700 md:text-base dark:text-neutral-200"
    :title="$t('client.createdOn', { date: $d(new Date(client.createdAt)) })"
  >
    {{ client.name }}
    <span
      class="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-neutral-700"
      >{{ client.protocol === 'wg' ? 'WG' : 'AWG 3.1' }}</span
    >
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
