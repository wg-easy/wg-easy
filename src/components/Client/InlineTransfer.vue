<template>
  <!-- Inline Transfer TX -->
  <span
    v-if="client.transferTx"
    class="whitespace-nowrap"
    :title="$t('totalDownload') + bytes(client.transferTx)"
  >
    ·
    <svg
      class="align-middle h-3 inline"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fill-rule="evenodd"
        d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
        clip-rule="evenodd"
      />
    </svg>
    {{ bytes(client.transferTxCurrent) }}/s
  </span>

  <!-- Inline Transfer RX -->
  <span
    v-if="client.transferRx"
    class="whitespace-nowrap"
    :title="$t('totalUpload') + bytes(client.transferRx)"
  >
    ·
    <svg
      class="align-middle h-3 inline"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fill-rule="evenodd"
        d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
        clip-rule="evenodd"
      />
    </svg>
    {{ bytes(client.transferRxCurrent) }}/s
  </span>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
