<template>
  <button
    :disabled="!client.downloadableConfig"
    class="align-middle bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 p-2 rounded transition"
    :class="{
      'hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white':
        client.downloadableConfig,
      'is-disabled': !client.downloadableConfig,
    }"
    :title="!client.downloadableConfig ? $t('noPrivKey') : $t('showQR')"
    @click="
      modalStore.qrcode = `./api/wireguard/client/${client.id}/qrcode.svg`
    "
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
