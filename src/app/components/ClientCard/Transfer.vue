<template>
  <div class="flex shrink-0 gap-5 text-[11px] tabular-nums">
    <div
      :title="
        $t('clients.traffic.totalDownload', {
          total: bytes(client.transferTx ?? 0),
        })
      "
    >
      <span class="eyebrow">{{ $t('clients.traffic.download') }}</span>
      <span class="mt-1.5 flex items-center gap-1.5 text-muted">
        <ArrowDownIcon class="size-3 text-success" />
        {{ bytes(client.transferTxCurrent) }}/s
      </span>
      <span class="mt-1 block text-subtle">
        {{ bytes(client.transferTx ?? 0) }}
      </span>
    </div>
    <div
      :title="
        $t('clients.traffic.totalUpload', {
          total: bytes(client.transferRx ?? 0),
        })
      "
    >
      <span class="eyebrow">{{ $t('clients.traffic.upload') }}</span>
      <span class="mt-1.5 flex items-center gap-1.5 text-muted">
        <ArrowUpIcon class="size-3 text-accent" />
        {{ bytes(client.transferRxCurrent) }}/s
      </span>
      <span class="mt-1 block text-subtle">
        {{ bytes(client.transferRx ?? 0) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDownIcon, ArrowUpIcon } from '@lucide/vue';

defineProps<{
  client: LocalClient;
}>();
</script>
