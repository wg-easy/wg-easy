<template>
  <div
    v-for="client in clientsStore.clients"
    :key="client.id"
    class="relative overflow-hidden border-b last:border-b-0 border-gray-100 dark:border-neutral-600 border-solid"
  >
    <Client :client="client" />
  </div>
</template>

<script setup lang="ts">
const clientsStore = useClientsStore();
</script>
