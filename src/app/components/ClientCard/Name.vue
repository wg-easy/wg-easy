<template>
  <div
    class="break-all text-sm text-gray-700 md:text-base dark:text-neutral-200"
    :title="$t('client.createdOn') + $d(new Date(client.createdAt))"
  >
    {{ client.name }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
