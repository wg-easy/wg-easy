<template>
  <!-- Inline Transfer TX -->
  <span
    v-if="client.transferTx"
    class="whitespace-nowrap"
    :title="$t('totalDownload') + bytes(client.transferTx)"
  >
    ·
    <IconsArrowDown class="align-middle h-3 inline" />
    {{ bytes(client.transferTxCurrent) }}/s
  </span>

  <!-- Inline Transfer RX -->
  <span
    v-if="client.transferRx"
    class="whitespace-nowrap"
    :title="$t('totalUpload') + bytes(client.transferRx)"
  >
    ·
    <IconsArrowUp class="align-middle h-3 inline" />
    {{ bytes(client.transferRxCurrent) }}/s
  </span>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
