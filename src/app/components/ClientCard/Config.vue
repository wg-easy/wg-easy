<template>
  <a
    :href="'/api/client/' + client.id + '/configuration'"
    download
    class="icon-button"
    :title="$t('client.downloadConfig')"
    :aria-label="$t('client.downloadConfig')"
  >
    <IconsDownload class="size-4" />
  </a>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
