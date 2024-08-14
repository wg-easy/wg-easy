<template>
  <!-- Transfer TX -->
  <div v-if="client.transferTx" class="min-w-20 md:min-w-24">
    <span
      class="flex gap-1"
      :title="$t('totalDownload') + bytes(client.transferTx)"
    >
      <IconsArrowDown class="align-middle h-3 inline mt-0.5" />
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
      <IconsArrowUp class="align-middle h-3 inline mt-0.5" />
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
