<template>
  <div
    v-if="quota"
    class="text-xs"
    :class="
      compact
        ? 'mt-1'
        : 'col-span-2 rounded border border-gray-200 p-3 dark:border-neutral-600'
    "
  >
    <div class="flex flex-wrap items-center gap-2">
      <span class="font-medium text-gray-700 dark:text-neutral-200">{{
        quota.name
      }}</span>
      <span
        class="rounded px-1.5 py-0.5 font-medium"
        :class="
          blocked
            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
            : quota.enabled
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
              : 'bg-gray-100 text-gray-600 dark:bg-neutral-600 dark:text-neutral-300'
        "
      >
        {{
          blocked
            ? $t('quota.status.blocked')
            : quota.enabled
              ? $t('quota.status.active')
              : $t('quota.status.disabled')
        }}
      </span>
      <span class="text-gray-500 dark:text-neutral-400">
        {{ usageLabel }}
      </span>
    </div>
    <div
      v-if="!compact"
      class="mt-2 h-1.5 overflow-hidden rounded bg-gray-100 dark:bg-neutral-600"
    >
      <div
        class="h-full rounded"
        :class="blocked ? 'bg-red-700' : 'bg-emerald-600'"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
type ClientQuota = {
  name: string;
  enabled: boolean;
  mode: 'RX' | 'TX' | 'TOTAL' | 'SEPARATE';
  rxBytes: number | null;
  txBytes: number | null;
  totalBytes: number | null;
  usedRxBytes: number;
  usedTxBytes: number;
  exceededAt: string | null;
};

const props = defineProps<{ quota: ClientQuota | null; compact?: boolean }>();
const blocked = computed(() =>
  Boolean(props.quota?.enabled && props.quota.exceededAt)
);
const values = computed(() => {
  const quota = props.quota;
  if (!quota) return [];
  if (quota.mode === 'RX') return [[quota.usedRxBytes, quota.rxBytes!]];
  if (quota.mode === 'TX') return [[quota.usedTxBytes, quota.txBytes!]];
  if (quota.mode === 'TOTAL') {
    return [[quota.usedRxBytes + quota.usedTxBytes, quota.totalBytes!]];
  }
  return [
    [quota.usedRxBytes, quota.rxBytes!],
    [quota.usedTxBytes, quota.txBytes!],
  ];
});
const progress = computed(() =>
  Math.min(
    100,
    Math.max(...values.value.map(([used, limit]) => (used! / limit!) * 100))
  )
);
const usageLabel = computed(() =>
  values.value
    .map(([used, limit]) => `${bytes(used!)} / ${bytes(limit!)}`)
    .join(' · ')
);
</script>
