<template>
  <div
    class="text-sm text-gray-700 md:text-base dark:text-neutral-200"
    :title="$t('client.createdOn') + $d(new Date(client.createdAt))"
  >
    <span class="border-b-2 border-t-2 border-transparent">
      {{ client.name }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
