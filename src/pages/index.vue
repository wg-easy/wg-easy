<template>
  <main>
    <div class="container mx-auto max-w-3xl px-3 md:px-0">
      <div
        class="shadow-md rounded-lg bg-white dark:bg-neutral-700 overflow-hidden"
      >
        <div
          class="flex flex-row flex-auto items-center p-3 px-5 border-b-2 border-gray-100 dark:border-neutral-600"
        >
          <div class="flex-grow">
            <p class="text-2xl font-medium dark:text-neutral-200">
              {{ $t('clients') }}
            </p>
          </div>
          <div class="flex md:block md:flex-shrink-0 space-x-1">
            <ClientsRestoreConfig />
            <ClientsBackupConfig />
            <ClientsSort />
            <ClientsNew />
          </div>
        </div>

        <div>
          <Clients
            v-if="clientsStore.clients && clientsStore.clients.length > 0"
          />
        </div>
        <ClientsEmpty
          v-if="clientsStore.clients && clientsStore.clients.length === 0"
        />
        <div
          v-if="clientsStore.clients === null"
          class="text-gray-200 dark:text-red-300 p-5"
        >
          <IconsLoading class="w-5 animate-spin mx-auto" />
        </div>
      </div>
    </div>

    <ClientsQRCodeDialog />
    <ClientsCreateDialog />
    <ClientsDeleteDialog />
  </main>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
authStore.update();
const globalStore = useGlobalStore();
const clientsStore = useClientsStore();

const intervalId = ref<NodeJS.Timeout | null>(null);

clientsStore.refresh();

onMounted(() => {
  // TODO?: replace with websocket or similar
  intervalId.value = setInterval(() => {
    clientsStore
      .refresh({
        updateCharts: globalStore.updateCharts,
      })
      .catch(console.error);
  }, 1000);
});

onUnmounted(() => {
  if (intervalId.value !== null) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
});
</script>
