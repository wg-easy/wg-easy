<template>
  <span
    v-if="client.latestHandshakeAt"
    :title="$t('client.lastSeen') + $d(new Date(client.latestHandshakeAt))"
  >
    {{ lastSeen }}
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  client: LocalClient;
}>();

const { localeProperties } = useI18n();

const lastSeen = computed(() => {
  const now = Date.now();

  return formatTimeAgoIntl(
    new Date(props.client.latestHandshakeAt ?? now),
    {
      locale: localeProperties.value.language,
    },
    now
  );
});
</script>
