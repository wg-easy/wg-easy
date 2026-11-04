<template>
  <span
    v-if="client.latestHandshakeAt"
    :title="
      $t('clients.status.lastSeen', {
        date: $d(new Date(client.latestHandshakeAt)),
      })
    "
  >
    {{ lastSeen }}
  </span>
  <span v-else>{{ $t('clients.status.notConnected') }}</span>
</template>

<script setup lang="ts">
const props = defineProps<{
  client: LocalClient;
}>();

const { localeProperties } = useI18n();
const now = useHydrationTime();

const lastSeen = computed(() => {
  const timestamp = now();

  return formatTimeAgoIntl(
    new Date(props.client.latestHandshakeAt ?? timestamp),
    {
      locale: localeProperties.value.language,
    },
    timestamp
  );
});
</script>
