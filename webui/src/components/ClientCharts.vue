<template>
  <div v-if="client">
    <!-- TODO: Individual bars are too wide -->
    <div class="absolute z-0 bottom-0 left-0 right-0" style="top: 60%">
      <VueApexCharts
        width="100%"
        height="100%"
        type="bar"
        :options="chartOptions"
        :series="[{ name: 'Upload (TX)', data: client?.transferTxHistory, },]"
      />
    </div>
    <div class="absolute z-0 top-0 left-0 right-0" style="bottom: 60%">
      <VueApexCharts
        width="100%"
        height="100%"
        type="bar"
        :options="chartOptions"
        :series="[{ name: 'Download (RX)', data: client?.transferRxHistory, },]"
        style="transform: scaleY(-1)"
      />
    </div>
  </div>
</template>

<script setup>
import VueApexCharts from 'vue3-apexcharts';
import chartOptions from '@/utils/chartOptions';

defineProps({
  client: {},
});

</script>