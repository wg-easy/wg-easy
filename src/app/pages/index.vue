<template>
  <main class="page-container">
    <div class="mb-7 flex items-end justify-between gap-4">
      <div>
        <p class="eyebrow mb-3 flex items-center gap-2">
          <ServerIcon class="size-3.5 text-accent" />
          WireGuard
          <span class="text-line">/</span>
          {{ $t('pages.clients') }}
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
        <span class="text-3xl font-semibold tracking-tight text-foreground">
          {{ clientsStore.pagination.total }}
        </span>
        {{ $t('ui.clientsTotal') }}
      </div>
    </div>
    <div class="surface p-4 sm:p-5">
      <div class="flex flex-wrap gap-3">
        <ClientsSearch class="w-full sm:min-w-0 sm:flex-1" />
        <ClientsNew trigger-class="w-full sm:w-auto" />
      </div>
      <ClientsFilters class="mt-4 border-t border-line pt-4" />
    </div>
    <div
      class="mt-6 mb-3 flex items-center justify-between gap-3 text-xs text-subtle"
    >
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>{{ $t('ui.clientList') }}</span>
        <button
          v-if="clientsStore.hasActiveFilters"
          type="button"
          class="inline-flex min-h-8 items-center gap-1 font-medium text-accent hover:text-accent-hover"
          @click="clientsStore.clearFilters()"
        >
          <XIcon class="size-3.5" aria-hidden="true" />
          {{ $t('ui.clearFilters') }}
        </button>
      </div>
      <span v-if="clientsStore.error" class="text-warning">
        {{ $t('ui.connectionIssue') }}
      </span>
      <span
        v-else-if="clientsStore.isUpdatingList"
        role="status"
        class="flex items-center gap-2"
      >
        <LoaderCircleIcon class="size-3 animate-spin" aria-hidden="true" />
        {{ $t('general.loading') }}
      </span>
      <span v-else class="flex items-center gap-2">
        <span class="size-1.5 rounded-full bg-success ring-4 ring-success/10" />
        {{ $t('ui.autoRefresh') }}
      </span>
    </div>
    <div v-if="clientsStore.error" role="alert" class="callout mb-4">
      <TriangleAlertIcon class="size-5 shrink-0 text-warning" />
      <span class="flex-1">{{ $t('ui.loadError') }}</span>
      <button class="font-semibold text-accent" @click="clientsStore.refresh()">
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
      <LoaderCircleIcon class="size-5 animate-spin" />
      {{ $t('general.loading') }}
    </div>
    <ClientsPagination v-if="clientsStore.clients" />
    <p class="mt-5 flex items-start gap-2 text-xs leading-relaxed text-subtle">
      <InfoIcon class="mt-0.5 size-4 shrink-0 text-accent" />
      {{ $t('ui.clientsHint') }}
    </p>
  </main>
</template>

<script setup lang="ts">
import {
  InfoIcon,
  LoaderCircleIcon,
  ServerIcon,
  TriangleAlertIcon,
  XIcon,
} from '@lucide/vue';

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
