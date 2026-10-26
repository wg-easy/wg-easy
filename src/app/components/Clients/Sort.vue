<template>
  <BaseSecondaryButton
    :aria-label="
      $t(
        globalStore.sortClient === 'asc'
          ? 'ui.sortAscending'
          : 'ui.sortDescending'
      )
    "
    @click="toggleSort"
  >
    <ArrowDownIcon
      v-if="globalStore.sortClient === 'asc'"
      class="mr-2 size-4"
    />
    <ArrowUpIcon v-else class="mr-2 size-4" />
    <span class="text-sm">{{ $t('client.sort') }}</span>
  </BaseSecondaryButton>
</template>

<script setup lang="ts">
import { ArrowDownIcon, ArrowUpIcon } from '@lucide/vue';

const globalStore = useGlobalStore();
const clientsStore = useClientsStore();

function toggleSort() {
  globalStore.sortClient = globalStore.sortClient === 'asc' ? 'desc' : 'asc';
  clientsStore.refresh().catch(console.error);
}
</script>
