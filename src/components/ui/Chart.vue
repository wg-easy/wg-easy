<template>
  <apexchart
    width="100%"
    height="100%"
    :options="chartOptionsTX"
    :series="client.transferTxSeries"
  />
</template>

<script lang="ts">
import type { VueApexChartsComponent } from 'vue3-apexcharts';

defineProps<{
  options: VueApexChartsComponent['options'];
  series: VueApexChartsComponent['series'];
}>();
</script>
