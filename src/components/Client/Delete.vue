<template>
  <button
    class="align-middle bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white p-2 rounded transition"
    :title="$t('deleteClient')"
    @click="modalStore.clientDelete = client"
  >
    <IconsDelete class="w-5" />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();

const modalStore = useModalStore();
</script>
