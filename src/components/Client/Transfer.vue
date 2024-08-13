<template>
  <!-- Transfer TX -->
  <div v-if="client.transferTx" class="min-w-20 md:min-w-24">
    <span
      class="flex gap-1"
      :title="$t('totalDownload') + bytes(client.transferTx)"
    >
      <svg
        class="align-middle h-3 inline mt-0.5"
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
      <div>
        <span class="text-gray-700 dark:text-neutral-200"
          >{{ bytes(client.transferTxCurrent) }}/s</span
        >
        <!-- Total TX -->
        <br /><span class="font-regular" style="font-size: 0.85em">{{
          bytes(client.transferTx)
        }}</span>
      </div>
    </span>
  </div>

  <!-- Transfer RX -->
  <div v-if="client.transferRx" class="min-w-20 md:min-w-24">
    <span
      class="flex gap-1"
      :title="$t('totalUpload') + bytes(client.transferRx)"
    >
      <svg
        class="align-middle h-3 inline mt-0.5"
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
      <div>
        <span class="text-gray-700 dark:text-neutral-200"
          >{{ bytes(client.transferRxCurrent) }}/s</span
        >
        <!-- Total RX -->
        <br /><span class="font-regular" style="font-size: 0.85em">{{
          bytes(client.transferRx)
        }}</span>
      </div>
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  client: LocalClient;
}>();
</script>
