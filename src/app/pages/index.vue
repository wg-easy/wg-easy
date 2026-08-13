<template>
  <main>
    <Panel>
      <PanelHead>
        <PanelHeadTitle>
          {{ $t('pages.clients') }}
        </PanelHeadTitle>
        <PanelHeadBoat>
          <ClientsSearch />
          <div class="flex gap-2">
            <ClientsSort />
            <ClientsNew />
          </div>
        </PanelHeadBoat>
      </PanelHead>

      <div>
        <ClientsList
          v-if="clientsStore.clients && clientsStore.clients.length > 0"
        />
      </div>
      <ClientsEmpty
        v-if="clientsStore.clients && clientsStore.clients.length === 0"
      />
      <div
        v-if="clientsStore.clients === null"
        class="p-5 text-gray-200 dark:text-red-300"
      >
        <IconsLoading class="mx-auto w-5 animate-spin" />
      </div>
    </Panel>
  </main>
</template>

<script setup lang="ts">
const globalStore = useGlobalStore();
const clientsStore = useClientsStore();

// TODO?: use hover card to show more detailed info without leaving the page
// or do something like a accordion

const initialRefresh = clientsStore.refresh();
let pageMounted = false;

const { resume: resumePolling } = useTimeoutPoll(
  async () => {
    try {
      await clientsStore.refresh({
        updateCharts: globalStore.uiShowCharts,
      });
    } catch (error) {
      console.error(error);
    }
  },
  1000,
  { immediate: false }
);

onMounted(() => {
  // TODO?: replace with websocket or similar
  pageMounted = true;

  void initialRefresh.catch(console.error).finally(() => {
    if (pageMounted) {
      resumePolling();
    }
  });
});

onUnmounted(() => {
  pageMounted = false;
});
</script>
