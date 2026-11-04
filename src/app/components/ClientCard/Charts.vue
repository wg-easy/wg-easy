<template>
  <div
    class="flex h-14 w-20 shrink-0 flex-col overflow-hidden"
    aria-hidden="true"
  >
    <div class="h-7">
      <BaseChart :options="chartOptionsTX" :series="client.transferTxSeries" />
    </div>
    <div class="h-7">
      <BaseChart :options="chartOptionsRX" :series="client.transferRxSeries" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApexOptions } from 'apexcharts';

defineProps<{
  client: LocalClient;
}>();

const theme = useTheme();

const chartOptionsTX = computed(() => ({
  ...chartOptions,
  colors: [CHART_COLORS.tx[theme.value]],
}));

const chartOptionsRX = computed(() => ({
  ...chartOptions,
  colors: [CHART_COLORS.rx[theme.value]],
}));

const chartOptions = {
  chart: {
    type: 'area',
    background: 'transparent',
    stacked: false,
    accessibility: {
      enabled: false,
    },
    toolbar: {
      show: false,
    },
    animations: {
      enabled: false,
    },
    parentHeightOffset: 0,
    sparkline: {
      enabled: true,
    },
  },
  colors: [],
  stroke: {
    curve: 'smooth',
    width: 0,
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'vertical',
      shadeIntensity: 0,
      inverseColors: false,
      opacityTo: 0,
      stops: [0, 100],
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    labels: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
    axisBorder: {
      show: false,
    },
  },
  yaxis: {
    labels: {
      show: false,
    },
    min: 0,
  },
  tooltip: {
    enabled: false,
  },
  legend: {
    show: false,
  },
  grid: {
    show: false,
    padding: {
      left: -10,
      right: 0,
      bottom: -15,
      top: -15,
    },
    column: {
      opacity: 0,
    },
    xaxis: {
      lines: {
        show: false,
      },
    },
  },
} satisfies ApexOptions;
</script>
