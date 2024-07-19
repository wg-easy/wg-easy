<template>
  <div class="flex flex-col xxs:flex-row w-full gap-2">
    <div class="flex flex-col flex-grow gap-1">
      <!-- Name -->
      <ClientName :client="client" />
      <!-- Info -->
      <div class="text-gray-400 dark:text-neutral-400 text-xs">
        <!-- Address -->
        <ClientAddress :client="client" />
        <!-- Transfer TX -->
        <ClientTransfer
          v-if="!uiTrafficStats && client.transferTx"
          :transfer-data="client.transferTx"
          :transfer-data-current="client.transferTxCurrent"
          :title="$t('totalDownload') + bytes(client.transferTx)"
          ><IconDownArrow
        /></ClientTransfer>
        <!-- Transfer RX -->
        <ClientTransfer
          v-if="!uiTrafficStats && client.transferTx"
          :transfer-data="client.transferRx"
          :transfer-data-current="client.transferRxCurrent"
          :title="$t('totalUpload') + bytes(client.transferRx)"
        >
          <IconUpArrow />
        </ClientTransfer>
        <!-- Last seen -->
        <span v-if="client.latestHandshakeAt" :title="'Last seen on ' + dateTime(new Date(client.latestHandshakeAt))">
          {{ !uiTrafficStats ? ' · ' : '' }}
          <!-- eslint-disable-next-line vue/no-undef-components -->
          <Timeago :datetime="client.latestHandshakeAt" :locale="dateFnsLocale" />
        </span>
      </div>
    </div>
    <div
      v-if="uiTrafficStats && client.transferTx && client.transferRx"
      class="flex gap-2 items-center shrink-0 text-gray-400 dark:text-neutral-400 text-xs mt-px justify-end"
    >
      <ClientTrafficStat
        :transfer-data-current="client.transferTxCurrent"
        :transfer-data="client.transferTx"
        type="tx"
      />
      <ClientTrafficStat
        :transfer-data-current="client.transferRxCurrent"
        :transfer-data="client.transferRx"
        type="rx"
      />
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';

import { useStore } from '@/store/store';

import ClientName from '@/components/ClientName.vue';
import ClientAddress from '@/components/ClientAddress.vue';
import IconUpArrow from '@/components/icons/IconUpArrow.vue';
import IconDownArrow from '@/components/icons/IconDownArrow.vue';
import ClientTransfer from '@/components/ClientTransfer.vue';
import ClientTrafficStat from '@/components/ClientTrafficStat.vue';

import { useDateTime } from '@/composables/useDateTime';
import { useBytes } from '@/composables/useBytes';

defineProps({
  client: {},
});

const store = useStore();
const { uiTrafficStats, dateFnsLocale } = storeToRefs(store);

const { dateTime } = useDateTime();
const { bytes } = useBytes();
</script>
