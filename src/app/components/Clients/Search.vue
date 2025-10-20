<template>
  <div class="relative w-60 md:mr-2">
    <div class="relative flex h-full items-center">
      <MagnifyingGlassIcon
        class="absolute left-2.5 h-4 w-4 text-gray-400 dark:text-neutral-500"
      />
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="$t('client.search')"
        class="w-full rounded bg-white py-2 pr-8 text-sm text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-600 dark:bg-neutral-800 dark:text-white dark:ring-neutral-700 dark:placeholder:text-neutral-500 dark:focus:ring-red-700"
        @input="updateSearch"
      />
      <button
        v-if="searchQuery"
        class="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600 dark:hover:text-neutral-100"
        aria-label="Clear search"
        @click="clearSearch"
      >
        <IconsClose class="h-3 w-3" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const clientsStore = useClientsStore();
const searchQuery = ref('');

const updateSearch = useDebounceFn(() => {
  clientsStore.setSearchQuery(searchQuery.value);
}, 300);

function clearSearch() {
  searchQuery.value = '';
  clientsStore.setSearchQuery('');
}
</script>
