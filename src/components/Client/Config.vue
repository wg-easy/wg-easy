<template>
  <a
    :disabled="!client.downloadableConfig"
    :href="'./api/wireguard/client/' + client.id + '/configuration'"
    :download="client.downloadableConfig ? 'configuration' : null"
    class="align-middle inline-block bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 p-2 rounded transition"
    :class="{
      'hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white':
        client.downloadableConfig,
      'is-disabled': !client.downloadableConfig,
    }"
    :title="!client.downloadableConfig ? $t('noPrivKey') : $t('downloadConfig')"
    @click="
      if (!client.downloadableConfig) {
        $event.preventDefault();
      }
    "
  >
    <IconsDownload class="w-5" />
  </a>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
