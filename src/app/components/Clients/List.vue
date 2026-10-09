<template>
  <div class="flex flex-col gap-3">
    <ClientCard
      v-for="client in clientsStore.clients"
      :key="client.id"
      :client="client"
    />
  </div>
</template>

<script setup lang="ts">
const clientsStore = useClientsStore();
</script>
