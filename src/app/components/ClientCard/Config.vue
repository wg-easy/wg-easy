<template>
  <span class="inline-flex items-center gap-2" role="group">
    <a
      :href="`/api/client/${client.id}/configuration`"
      download
      class="inline-block rounded bg-gray-100 p-2 align-middle transition hover:bg-red-800 hover:text-white dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
      :title="$t('client.downloadConfig')"
    >
      <IconsDownload class="w-5" />
    </a>
    <a
      :href="`/api/client/${client.id}/configuration?format=flclash`"
      download
      class="inline-flex h-9 min-w-9 items-center justify-center rounded bg-sky-100 px-2 text-xs font-bold text-sky-800 transition hover:bg-sky-700 hover:text-white dark:bg-sky-950 dark:text-sky-200 dark:hover:bg-sky-700 dark:hover:text-white"
      :title="`FlClash: ${$t('client.downloadConfig')}`"
      :aria-label="`FlClash: ${$t('client.downloadConfig')}`"
    >
      <span aria-hidden="true">FC</span>
    </a>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
