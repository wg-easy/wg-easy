<template>
  <div class="flex-grow">
    <!-- Name -->
    <ClientName
      :client="client"
      @update-client-name="updateClientName"
    />

    <!-- Info -->
    <div class="text-gray-400 dark:text-neutral-400 text-xs">
      <!-- Address -->
      <ClientAddress :client="client" @update-address="updateClientAddress" />
      <!-- Transfer TX -->
      <ClientTransfer
        :transferData="client.transferTx"
        :transferDataCurrent="client.transferTxCurrent"
        :title="'Total Download: ' + bytes(client.transferTx)"
        ><IconDownArrow
      /></ClientTransfer>

      <!-- Transfer RX -->
      <ClientTransfer
        :transferData="client.transferRx"
        :transferDataCurrent="client.transferRxCurrent"
        :title="'Total Upload: ' + bytes(client.transferRx)"
      >
        <IconUpArrow />
      </ClientTransfer>

      <!-- Last seen -->
      <span
        v-if="client.latestHandshakeAt"
        :title="'Last seen on ' + dateTime(new Date(client.latestHandshakeAt))"
      >
        <!-- FIXME: add "timeago" -->
        <!-- · {{ new Date(client.latestHandshakeAt) | timeago }} -->
        · {{ timeago(client.latestHandshakeAt) }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ClientName from '@/components/ClientName.vue';
import ClientAddress from '@/components/ClientAddress.vue';
import IconUpArrow from '@/components/icons/IconUpArrow.vue';
import IconDownArrow from '@/components/icons/IconDownArrow.vue';
import ClientTransfer from '@/components/ClientTransfer.vue';

import { useDateTime } from '@/composables/useDateTime';
import { useTimeAgo } from '@/composables/useTimeAgo';
import { useBytes } from '@/composables/useBytes';
import API from '@/services/api';

defineProps({
  client: {},
});

const { dateTime } = useDateTime();
const { timeago } = useTimeAgo();
const { bytes } = useBytes();

const api = new API();


</script>
