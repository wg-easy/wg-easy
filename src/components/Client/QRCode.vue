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
    <svg
      class="w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();

const modalStore = useModalStore();
</script>
