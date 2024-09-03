<template>
  <span
    v-if="client.latestHandshakeAt"
    class="text-gray-400 dark:text-neutral-500 whitespace-nowrap"
    :title="$t('lastSeen') + dateTime(new Date(client.latestHandshakeAt))"
  >
    {{ !globalStore.features.trafficStats.enabled ? ' · ' : ''
    }}{{ timeago(new Date(client.latestHandshakeAt)) }}
  </span>
</template>

<script setup lang="ts">
import { format as timeago } from 'timeago.js';

defineProps<{
  client: LocalClient;
}>();

const globalStore = useGlobalStore();
</script>
