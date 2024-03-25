<template>
  <div>
    <!-- TODO: Individual bars are too wide -->
    <div v-if="updateCharts" class="absolute z-0 bottom-0 left-0 right-0 h-6">
      <VueApexCharts
        width="100%"
        height="100%"
        :options="chartOptionsTX"
        :series="[{ name: 'Upload (TX)', data: client?.transferTxHistory }]"
      />
    </div>
    <div v-if="updateCharts" class="absolute z-0 top-0 left-0 right-0 h-6">
      <VueApexCharts
        width="100%"
        height="100%"
        :options="chartOptionsRX"
        :series="[{ name: 'Download (RX)', data: client?.transferRxHistory }]"
        style="transform: scaleY(-1)"
      />
    </div>
  </div>
</template>

<script setup>
import VueApexCharts from 'vue3-apexcharts';
import { chartOptions } from '@/utils/chartOptions';
import { useStore } from '@/store/store';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

const UI_CHART_TYPES = [
  { type: false, strokeWidth: 0 },
  { type: 'line', strokeWidth: 3 },
  { type: 'area', strokeWidth: 0 },
  { type: 'bar', strokeWidth: 0 },
];

const CHART_COLORS = {
  rx: { light: 'rgba(128,128,128,0.3)', dark: 'rgba(255,255,255,0.3)' },
  tx: { light: 'rgba(128,128,128,0.4)', dark: 'rgba(255,255,255,0.3)' },
  gradient: { light: ['rgba(0,0,0,0.1)', 'rgba(0,0,0,1.0)'], dark: ['rgba(128,128,128,0)', 'rgba(128,128,128,0)'] },
};

defineProps({
  client: {},
});

const store = useStore();
const { uiChartType, uiTheme, prefersDarkScheme, updateCharts } = storeToRefs(store);

const darkOrLight = computed(() => {
  if (uiTheme.value === 'auto') {
    return prefersDarkScheme.value.matches ? 'dark' : 'light';
  }
  return uiTheme.value;
});

const chartOptionsTX = computed(() => {
  const opts = {
    ...chartOptions,
    colors: [CHART_COLORS.tx[darkOrLight.value]],
  };
  opts.chart.type = UI_CHART_TYPES[uiChartType.value].type || false;
  opts.stroke.width = UI_CHART_TYPES[uiChartType.value].strokeWidth;
  opts.fill.gradient.gradientToColors = CHART_COLORS.gradient[darkOrLight.value];
  return opts;
});
const chartOptionsRX = computed(() => {
  const opts = {
    ...chartOptions,
    colors: [CHART_COLORS.rx[darkOrLight.value]],
  };
  opts.chart.type = UI_CHART_TYPES[uiChartType.value].type || false;
  opts.stroke.width = UI_CHART_TYPES[uiChartType.value].strokeWidth;
  opts.fill.gradient.gradientToColors = CHART_COLORS.gradient[darkOrLight.value];
  return opts;
});
</script>
