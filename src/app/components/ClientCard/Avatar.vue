<template>
  <div class="relative shrink-0">
    <BaseAvatar
      :img="client.avatar"
      class="size-11 rounded-xl border border-accent/20 bg-accent/10 text-accent"
      >{{ initials }}</BaseAvatar
    >
    <span
      class="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-surface"
      :class="connected ? 'bg-success' : 'bg-subtle'"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ client: LocalClient }>();
const initials = computed(() =>
  props.client.name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
);
const connected = computed(
  () =>
    props.client.enabled &&
    isPeerConnected({
      latestHandshakeAt: props.client.latestHandshakeAt
        ? new Date(props.client.latestHandshakeAt)
        : null,
    })
);
</script>
