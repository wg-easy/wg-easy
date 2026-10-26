<template>
  <a
    :href="'/api/client/' + client.id + '/configuration'"
    download
    class="icon-button"
    :title="$t('client.downloadConfig')"
    :aria-label="$t('client.downloadConfig')"
  >
    <DownloadIcon class="size-4" />
  </a>
</template>

<script setup lang="ts">
import { DownloadIcon } from '@lucide/vue';

defineProps<{
  client: LocalClient;
}>();
</script>
