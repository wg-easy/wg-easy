<template>
  <NuxtLink
    class="icon-button"
    :to="`/clients/${client.id}`"
    :aria-label="$t('ui.editClient', { name: client.name })"
    :title="$t('ui.editClient', { name: client.name })"
  >
    <IconsEdit class="size-4" />
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
