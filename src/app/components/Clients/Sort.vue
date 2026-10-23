<template>
  <div class="relative flex items-center">
    <label for="client-sort" class="sr-only">{{ $t('client.sort') }}</label>
    <select
      id="client-sort"
      v-model="globalStore.sortClient"
      class="rounded bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-600 dark:bg-neutral-800 dark:text-white dark:ring-neutral-700 dark:focus:ring-red-700"
      :aria-label="$t('client.sort')"
      @change="refreshClients"
    >
      <option value="name-asc">{{ $t('client.sortNameAsc') }}</option>
      <option value="name-desc">{{ $t('client.sortNameDesc') }}</option>
      <option value="ipv4-asc">{{ $t('client.sortIpv4Asc') }}</option>
      <option value="ipv4-desc">{{ $t('client.sortIpv4Desc') }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
const globalStore = useGlobalStore();
const clientsStore = useClientsStore();

function refreshClients() {
  clientsStore.refresh().catch(console.error);
}
</script>
