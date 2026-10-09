<template>
  <main class="page-container">
    <div class="mb-7 flex items-end justify-between gap-4">
      <div>
        <p class="eyebrow mb-3 flex items-center gap-2">
          <IconsStack class="size-3.5 text-accent" />WireGuard
          <span class="text-line">/</span> {{ $t('pages.clients') }}
        </p>
        <h1 class="page-title">{{ $t('pages.clients') }}</h1>
        <p class="mt-3 text-sm text-subtle">
          {{ $t('ui.clientsDescription') }}
        </p>
      </div>
      <div
        v-if="clientsStore.clients"
        class="hidden items-baseline gap-2 text-xs text-subtle sm:flex"
      >
        <span class="text-3xl font-semibold tracking-tight text-foreground">{{
          clientsStore.clients.length
        }}</span
        >{{ $t('ui.clientsShown') }}
      </div>
    </div>
    <div class="flex flex-wrap gap-2.5">
      <ClientsSearch class="w-full sm:min-w-0 sm:flex-1" /><ClientsSort
        class="flex-1 sm:flex-none"
      /><ClientsNew trigger-class="flex-1 sm:flex-none" />
    </div>
    <div
      class="mt-6 mb-3 flex items-center justify-between gap-3 text-xs text-subtle"
    >
      <span>{{ $t('ui.clientList') }}</span
      ><span v-if="clientsStore.error" class="text-warning">{{
        $t('ui.connectionIssue')
      }}</span
      ><span v-else class="flex items-center gap-2"
        ><span
          class="size-1.5 rounded-full bg-success ring-4 ring-success/10"
        />{{ $t('ui.autoRefresh') }}</span
      >
    </div>
    <div v-if="clientsStore.error" role="alert" class="callout mb-4">
      <IconsWarning class="size-5 shrink-0 text-warning" /><span
        class="flex-1"
        >{{ $t('ui.loadError') }}</span
      ><button
        class="font-semibold text-accent"
        @click="clientsStore.refresh()"
      >
        {{ $t('ui.retry') }}
      </button>
    </div>
    <ClientsList v-if="clientsStore.clients?.length" />
    <ClientsEmpty v-else-if="clientsStore.clients" />
    <div
      v-else-if="!clientsStore.error"
      role="status"
      class="surface flex min-h-56 items-center justify-center gap-3 text-subtle"
    >
      <IconsLoading class="size-5 animate-spin" />{{ $t('general.loading') }}
    </div>
    <p class="mt-5 flex items-start gap-2 text-xs leading-relaxed text-subtle">
      <IconsInfo class="mt-0.5 size-4 shrink-0 text-accent" />{{
        $t('ui.clientsHint')
      }}
    </p>
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
