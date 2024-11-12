<template>
  <div
    v-if="client.enabled === true"
    :title="$t('disableClient')"
    class="mr-1 inline-block h-6 w-10 cursor-pointer rounded-full bg-red-800 align-middle transition-all hover:bg-red-700"
    @click="disableClient(client)"
  >
    <div class="m-1 ml-5 h-4 w-4 rounded-full bg-white" />
  </div>

  <div
    v-if="client.enabled === false"
    :title="$t('enableClient')"
    class="mr-1 inline-block h-6 w-10 cursor-pointer rounded-full bg-gray-200 align-middle transition-all hover:bg-gray-300 dark:bg-neutral-400 dark:hover:bg-neutral-500"
    @click="enableClient(client)"
  >
    <div class="m-1 h-4 w-4 rounded-full bg-white" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();

const clientsStore = useClientsStore();

function enableClient(client: WGClient) {
  api
    .enableClient({ clientId: client.id })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => clientsStore.refresh().catch(console.error));
}
function disableClient(client: WGClient) {
  api
    .disableClient({ clientId: client.id })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => clientsStore.refresh().catch(console.error));
}
</script>
