<template>
  <span
    v-if="client.group"
    class="inline-flex w-fit items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-neutral-600 dark:text-neutral-200"
  >
    <span
      class="inline-block size-2 rounded-full"
      :style="{ backgroundColor: client.group.color ?? '#9ca3af' }"
    />
    {{ client.group.name }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
