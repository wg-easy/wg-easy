<template>
  <BaseButton @click="toggleSort">
    <IconsArrowDown
      v-if="globalStore.sortClient === true"
      class="w-4 md:mr-2"
    />
    <IconsArrowUp v-else class="w-4 md:mr-2" />
    <span class="text-sm max-md:hidden"> {{ $t('client.sort') }}</span>
  </BaseButton>
</template>

<script setup lang="ts">
const globalStore = useGlobalStore();
const clientsStore = useClientsStore();

function toggleSort() {
  globalStore.sortClient = !globalStore.sortClient;
  clientsStore.refresh().catch(console.error);
}
</script>
