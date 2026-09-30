<template>
  <ClientOnly>
    <apexchart
      width="100%"
      height="100%"
      v-bind="$attrs"
      :options="options"
      :series="series"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
import type { VueApexChartsComponentProps } from 'vue3-apexcharts';

defineProps<{
  options: VueApexChartsComponentProps['options'];
  series: VueApexChartsComponentProps['series'];
}>();
</script>
