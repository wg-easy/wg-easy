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
  <div v-if="client.tags.length > 0" class="flex flex-wrap gap-1.5">
    <span
      v-for="tag in client.tags"
      :key="tag.id"
      class="rounded-full border border-red-800 bg-white px-2.5 py-0.5 text-xs text-gray-700 dark:border-red-700 dark:bg-neutral-700 dark:text-neutral-200"
    >
      {{ tag.name }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
