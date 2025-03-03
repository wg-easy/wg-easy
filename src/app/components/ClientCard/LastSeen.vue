<template>
  <span
    v-if="client.latestHandshakeAt"
    :title="$t('client.lastSeen') + $d(new Date(client.latestHandshakeAt))"
  >
    {{ timeago(new Date(client.latestHandshakeAt)) }}
  </span>
</template>

<script setup lang="ts">
import { format as timeago } from 'timeago.js';

defineProps<{
  client: LocalClient;
}>();
</script>
