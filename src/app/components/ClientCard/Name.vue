<template>
  <NuxtLink
    :to="`/clients/${client.id}`"
    class="min-w-0 text-sm font-semibold tracking-tight wrap-anywhere text-foreground hover:text-accent sm:text-[15px]"
    :title="$t('client.createdOn', { date: $d(new Date(client.createdAt)) })"
    >{{ client.name }}</NuxtLink
  >
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
