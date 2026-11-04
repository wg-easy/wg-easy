<template>
  <div class="relative">
    <SearchIcon
      class="pointer-events-none absolute top-3.5 left-3.5 size-4 text-subtle"
    />
    <input
      v-model="searchQuery"
      type="search"
      :placeholder="$t('clients.list.search')"
      :aria-label="$t('clients.list.search')"
      class="ui-input h-11 bg-surface pr-10 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
      @input="updateSearch"
    />
    <button
      v-if="searchQuery"
      class="absolute top-2 right-2 grid size-7 place-items-center rounded-md text-subtle hover:bg-surface-raised"
      :aria-label="$t('clients.list.clearSearch')"
      @click="clearSearch"
    >
      <XIcon class="size-3" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { SearchIcon, XIcon } from '@lucide/vue';

const clientsStore = useClientsStore();
const searchQuery = ref(clientsStore.query.filter ?? '');
watch(
  () => clientsStore.query.filter,
  (value) => {
    searchQuery.value = value ?? '';
  }
);

const updateSearch = useDebounceFn(() => {
  clientsStore.updateQuery({ filter: searchQuery.value });
}, 300);

function clearSearch() {
  searchQuery.value = '';
  clientsStore.updateQuery({ filter: undefined });
}
</script>
