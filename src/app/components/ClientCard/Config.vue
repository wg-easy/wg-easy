<template>
  <a
    :href="'/api/client/' + client.id + '/configuration'"
    download
    class="icon-button"
    :title="label"
    :aria-label="label"
  >
    <DownloadIcon class="size-4" />
  </a>
</template>

<script setup lang="ts">
import { DownloadIcon } from '@lucide/vue';

const props = defineProps<{
  client: LocalClient;
}>();
const { t } = useI18n();
const label = computed(() =>
  props.client.hasPrivateKey
    ? t('clients.configuration.download')
    : t('clients.configuration.downloadTemplate')
);
</script>
