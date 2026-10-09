<template>
  <NuxtLink
    :to="`/clients/${client.id}`"
    class="truncate text-sm font-semibold tracking-tight text-foreground hover:text-accent sm:text-[15px]"
    :title="$t('client.createdOn', { date: $d(new Date(client.createdAt)) })"
    >{{ client.name }}</NuxtLink
  >
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
