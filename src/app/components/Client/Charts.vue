<template>
  <div
    v-if="globalStore.features.trafficStats.type"
    :class="`absolute z-0 bottom-0 left-0 right-0 h-6 ${globalStore.features.trafficStats.type === 1 && 'line-chart'}`"
  >
    <UiChart :options="chartOptionsTX" :series="client.transferTxSeries" />
  </div>
  <div
    v-if="globalStore.features.trafficStats.type"
    :class="`absolute z-0 top-0 left-0 right-0 h-6 ${globalStore.features.trafficStats.type === 1 && 'line-chart'}`"
  >
    <UiChart
      :options="chartOptionsRX"
      :series="client.transferRxSeries"
      style="transform: scaleY(-1)"
    />
  </div>
</template>

<script setup lang="ts">
import type { ApexOptions } from 'apexcharts';

defineProps<{
  client: LocalClient;
}>();

const globalStore = useGlobalStore();
const theme = useTheme();

const chartOptionsTX = computed(() => {
  const opts = {
    ...chartOptions,
    colors: [CHART_COLORS.tx[theme.value]],
  };
  opts.chart.type =
    UI_CHART_TYPES[globalStore.features.trafficStats.type]?.type || undefined;
  opts.stroke.width =
    UI_CHART_TYPES[globalStore.features.trafficStats.type]?.strokeWidth ?? 0;
  return opts;
});

const chartOptionsRX = computed(() => {
  const opts = {
    ...chartOptions,
    colors: [CHART_COLORS.rx[theme.value]],
  };
  opts.chart.type =
    UI_CHART_TYPES[globalStore.features.trafficStats.type]?.type || undefined;
  opts.stroke.width =
    UI_CHART_TYPES[globalStore.features.trafficStats.type]?.strokeWidth ?? 0;
  return opts;
});

const chartOptions = {
  chart: {
    type: undefined as ApexChart['type'],
    background: 'transparent',
    stacked: false,
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
      gradientToColors: CHART_COLORS.gradient[theme.value],
      inverseColors: false,
      opacityTo: 0,
      stops: [0, 100],
    },
  },
  dataLabels: {
    enabled: false,
  },
  plotOptions: {
    bar: {
      horizontal: false,
    },
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

<style scoped lang="css">
.line-chart .apexcharts-svg {
  transform: translateY(3px);
}
</style>
