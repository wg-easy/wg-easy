<template>
  <div
    class="text-gray-700 dark:text-neutral-200 group text-sm md:text-base"
    :title="$t('createdOn') + dateTime(new Date(client.createdAt))"
  >
    <span class="border-t-2 border-b-2 border-transparent">
      {{ client.name }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
