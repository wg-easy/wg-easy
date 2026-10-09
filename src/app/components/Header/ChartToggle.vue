<template>
  <Toggle
    :model-value="globalStore.uiShowCharts"
    class="header-control group w-10 rounded-full data-[state=on]:border-subtle data-[state=on]:bg-surface-raised"
    :title="$t('layout.toggleCharts')"
    :aria-label="$t('layout.toggleCharts')"
    @update:model-value="globalStore.toggleCharts"
  >
    <IconsChart class="size-4 transition group-data-[state=on]:fill-current" />
  </Toggle>
</template>

<script lang="ts" setup>
const globalStore = useGlobalStore();
</script>
