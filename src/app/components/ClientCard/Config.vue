<template>
  <a
    :href="'/api/client/' + client.id + '/configuration'"
    download
    class="inline-block rounded bg-gray-100 p-2 align-middle transition hover:bg-red-800 hover:text-white dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
    :title="$t('client.downloadConfig')"
  >
    <IconsDownload class="w-5" />
  </a>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
