<template>
  <button
    class="rounded bg-gray-100 p-2 align-middle transition hover:bg-red-800 hover:text-white dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
    :title="$t('showQR')"
    @click="modalStore.qrcode = `./api/client/${client.id}/qrcode.svg`"
  >
    <IconsQRCode class="w-5" />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();

const modalStore = useModalStore();
</script>
