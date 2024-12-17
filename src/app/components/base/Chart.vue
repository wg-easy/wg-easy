<template>
  <ClientOnly>
    <apexchart width="100%" height="100%" :options="options" :series="series" />
  </ClientOnly>
</template>

<script setup lang="ts">
import type { VueApexChartsComponent } from 'vue3-apexcharts';

defineProps<{
  options: VueApexChartsComponent['options'];
  series: VueApexChartsComponent['series'];
}>();
</script>
