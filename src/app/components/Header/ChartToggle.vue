<template>
  <Toggle
    :pressed="globalStore.uiShowCharts"
    class="group flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 transition hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600"
    :title="$t('layout.toggleCharts')"
    @update:pressed="globalStore.toggleCharts"
  >
    <IconsChart
      class="h-5 w-5 transition group-data-[state=on]:fill-gray-600 dark:text-neutral-400 dark:group-data-[state=on]:fill-gray-300"
    />
  </Toggle>
</template>

<script lang="ts" setup>
const globalStore = useGlobalStore();
</script>
