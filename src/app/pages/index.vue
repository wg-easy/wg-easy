<template>
  <main>
    <Panel>
      <PanelHead>
        <PanelHeadTitle>
          {{ $t('pages.clients') }}
        </PanelHeadTitle>
        <PanelHeadBoat>
          <ClientsRestoreConfig />
          <ClientsBackupConfig />
          <ClientsSort />
          <ClientsNew />
        </PanelHeadBoat>
      </PanelHead>

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
    </Panel>

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
  // TODO: remove (to avoid console spam)
  return;
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
