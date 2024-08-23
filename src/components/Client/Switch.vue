<template>
  <div
    v-if="client.enabled === true"
    :title="$t('disableClient')"
    class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-red-800 cursor-pointer hover:bg-red-700 transition-all"
    @click="disableClient(client)"
  >
    <div class="rounded-full w-4 h-4 m-1 ml-5 bg-white" />
  </div>

  <div
    v-if="client.enabled === false"
    :title="$t('enableClient')"
    class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-gray-200 dark:bg-neutral-400 cursor-pointer hover:bg-gray-300 dark:hover:bg-neutral-500 transition-all"
    @click="enableClient(client)"
  >
    <div class="rounded-full w-4 h-4 m-1 bg-white" />
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
