<template>
  <NuxtLink
    class="icon-button"
    :to="`/clients/${client.id}`"
    :aria-label="$t('clients.edit', { name: client.name })"
    :title="$t('clients.edit', { name: client.name })"
  >
    <SquarePenIcon class="size-4" />
  </NuxtLink>
</template>

<script setup lang="ts">
import { SquarePenIcon } from '@lucide/vue';

defineProps<{
  client: LocalClient;
}>();
</script>
