<template>
  <div
    class="break-all text-sm text-gray-700 md:text-base dark:text-neutral-200"
    :title="$t('client.createdOn', { date: $d(new Date(client.createdAt)) })"
  >
    {{ client.name }}
  </div>
  <div
    v-if="client.description"
    class="break-all text-xs text-gray-500 dark:text-neutral-400"
  >
    {{ client.description }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
