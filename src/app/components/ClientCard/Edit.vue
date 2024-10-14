<template>
  <NuxtLink
    class="align-middle bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 p-2 rounded transition hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white"
    :to="`/clients/${client.id}`"
  >
    <IconsEdit class="w-5" />
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
