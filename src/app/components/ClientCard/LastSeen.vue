<template>
  <span
    v-if="client.latestHandshakeAt"
    class="whitespace-nowrap text-gray-400 dark:text-neutral-500"
    :title="$t('lastSeen') + dateTime(new Date(client.latestHandshakeAt))"
  >
    · {{ timeago(new Date(client.latestHandshakeAt)) }}
  </span>
</template>

<script setup lang="ts">
import { format as timeago } from 'timeago.js';

defineProps<{
  client: LocalClient;
}>();
</script>
