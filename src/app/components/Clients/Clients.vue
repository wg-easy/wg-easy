<template>
  <div
    v-for="client in clientsStore.clients"
    :key="client.id"
    class="relative overflow-hidden border-b border-solid border-gray-100 last:border-b-0 dark:border-neutral-600"
  >
    <ClientCard :client="client" />
  </div>
</template>

<script setup lang="ts">
const clientsStore = useClientsStore();
</script>
