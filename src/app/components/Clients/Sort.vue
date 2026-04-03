<template>
  <BasePrimaryButton @click="toggleSort">
    <IconsArrowDown
      v-if="clientsStore.sortClient === true"
      class="w-4 md:mr-2"
    />
    <IconsArrowUp v-else class="w-4 md:mr-2" />
    <span class="text-sm max-md:hidden"> {{ $t('client.sort') }}</span>
  </BasePrimaryButton>
</template>

<script setup lang="ts">
const clientsStore = useClientsStore();

function toggleSort() {
  clientsStore.setSortClientQuery(!clientsStore.sortClient)
}
</script>
