<template>
  <Toggle
    :model-value="globalStore.uiShowCharts"
    class="header-control group w-10 rounded-full data-[state=on]:border-subtle data-[state=on]:bg-surface-raised"
    :title="$t('layout.toggleCharts')"
    :aria-label="$t('layout.toggleCharts')"
    @update:model-value="globalStore.toggleCharts"
  >
    <ChartNoAxesColumnIncreasingIcon
      class="size-4 transition-colors group-data-[state=on]:text-foreground"
    />
  </Toggle>
</template>

<script lang="ts" setup>
import { ChartNoAxesColumnIncreasingIcon } from '@lucide/vue';

const globalStore = useGlobalStore();
</script>
