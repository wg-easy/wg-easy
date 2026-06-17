<template>
  <BasePrimaryButton @click="toggleSort">
    <IconsArrowDown v-if="globalStore.sortClient === 'asc'" class="mr-2 w-4" />
    <IconsArrowUp v-else class="mr-2 w-4" />
    <span class="text-sm">{{ $t('client.sort') }}</span>
  </BasePrimaryButton>
</template>

<script setup lang="ts">
const globalStore = useGlobalStore();
const clientsStore = useClientsStore();

function toggleSort() {
  globalStore.sortClient = globalStore.sortClient === 'asc' ? 'desc' : 'asc';
  clientsStore.refresh().catch(console.error);
}
</script>
