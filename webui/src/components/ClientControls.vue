<template>
  <div class="text-gray-400 dark:text-neutral-400 flex gap-1 items-center justify-between">
    <!-- Enable/Disable -->
    <div
      v-if="client.enabled === true"
      :title="$t('disableClient')"
      class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-red-800 cursor-pointer hover:bg-red-700"
      @click="disableClient"
    >
      <div class="rounded-full w-4 h-4 m-1 ml-5 bg-white"></div>
    </div>

    <div
      v-if="client.enabled === false"
      :title="$t('enableClient')"
      class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-gray-200 dark:bg-neutral-400 cursor-pointer hover:bg-gray-300 dark:hover:bg-neutral-500"
      @click="enableClient"
    >
      <div class="rounded-full w-4 h-4 m-1 bg-white"></div>
    </div>

    <!-- Show QR-->

    <button
      :disabled="!client.downloadableConfig"
      class="align-middle bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 p-2 rounded"
      :class="{
        'hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white': client.downloadableConfig,
        'is-disabled': !client.downloadableConfig,
      }"
      :title="!client.downloadableConfig ? $t('noPrivKey') : $t('showQR')"
      @click="getQrCode"
    >
      <IconQRCode />
    </button>

    <!-- Download Config -->
    <a
      :disabled="!client.downloadableConfig"
      :href="'./api/wireguard/client/' + client.id + '/configuration'"
      :download="client.downloadableConfig ? 'configuration' : null"
      class="align-middle inline-block bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 p-2 rounded"
      :class="{
        'hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white': client.downloadableConfig,
        'is-disabled': !client.downloadableConfig,
      }"
      :title="!client.downloadableConfig ? $t('noPrivKey') : $t('downloadConfig')"
      @click="
        if (!client.downloadableConfig) {
          $event.preventDefault();
        }
      "
    >
      <IconDownload />
    </a>

    <!-- Delete -->

    <button
      class="align-middle bg-gray-100 dark:bg-neutral-600 dark:text-neutral-300 hover:bg-red-800 dark:hover:bg-red-800 hover:text-white dark:hover:text-white p-2 rounded"
      :title="$t('deleteClient')"
      @click="handleDeleteClick"
    >
      <IconDelete />
    </button>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';

import IconQRCode from '@/components/icons/IconQRCode.vue';
import IconDownload from '@/components/icons/IconDownload.vue';
import IconDelete from '@/components/icons/IconDelete.vue';

import api from '@/services/apiInstance';

import { useStore } from '@/store/store';
const store = useStore();
const { qrcode, clientToDelete } = storeToRefs(store);

const props = defineProps({
  client: {},
});
const refresh = store.refresh;

function enableClient() {
  api
    .enableClient({ clientId: props.client.id })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => refresh().catch(console.error));
}

function disableClient() {
  api
    .disableClient({ clientId: props.client.id })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => refresh().catch(console.error));
}

async function getQrCode() {
  qrcode.value = await api.getQrCode({ clientId: props.client.id });
}
function handleDeleteClick() {
  clientToDelete.value = props.client;
}
</script>
