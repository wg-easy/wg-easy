<template>
  <div
    class="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-line p-6 text-center"
  >
    <div
      class="grid size-12 place-items-center rounded-xl bg-surface-raised text-subtle"
    >
      <ServerIcon class="size-6" />
    </div>
    <p class="text-sm text-muted">
      {{ $t(clientsStore.hasActiveFilters ? 'ui.noResults' : 'client.empty') }}
    </p>
    <BaseSecondaryButton
      v-if="clientsStore.hasActiveFilters"
      @click="clientsStore.clearFilters()"
    >
      {{ $t('ui.clearFilters') }}
    </BaseSecondaryButton>
    <ClientsCreateDialog v-else>
      <BasePrimaryButton as="span">
        <PlusIcon class="size-4" />
        {{ $t('client.new') }}
      </BasePrimaryButton>
    </ClientsCreateDialog>
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, ServerIcon } from '@lucide/vue';

const clientsStore = useClientsStore();
</script>
