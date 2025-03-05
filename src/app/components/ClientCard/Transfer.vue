<template>
  <!-- Transfer TX -->
  <div v-if="client.transferTx" class="min-w-20 md:min-w-24">
    <span
      class="flex gap-1"
      :title="$t('client.totalDownload') + bytes(client.transferTx)"
    >
      <IconsArrowDown class="mt-0.5 inline h-3 align-middle" />
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
      :title="$t('client.totalUpload') + bytes(client.transferRx)"
    >
      <IconsArrowUp class="mt-0.5 inline h-3 align-middle" />
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
