<template>
  <Toggle
    :pressed="globalStore.uiShowCharts"
    class="group inline-flex h-8 w-8 cursor-pointer items-center justify-center whitespace-nowrap rounded-full bg-gray-200 transition hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600"
    :title="$t('layout.toggleCharts')"
    @update:pressed="globalStore.toggleCharts"
  >
    <IconsChart
      class="h-5 w-5 fill-gray-400 transition group-data-[state=on]:fill-gray-600 dark:fill-neutral-600 dark:group-data-[state=on]:fill-neutral-400"
    />
  </Toggle>
</template>

<script lang="ts" setup>
const globalStore = useGlobalStore();
</script>
