<template>
  <div
    :class="`absolute bottom-0 left-0 right-0 z-0 h-6 ${globalStore.uiChartType === 'line' && 'line-chart'}`"
  >
    <BaseChart :options="chartOptionsTX" :series="client.transferTxSeries" />
  </div>
  <div
    :class="`absolute left-0 right-0 top-0 z-0 h-6 ${globalStore.uiChartType === 'line' && 'line-chart'}`"
  >
    <BaseChart
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
  opts.chart.type = globalStore.uiChartType;
  opts.stroke.width = UI_CHART_PROPS[globalStore.uiChartType].strokeWidth;
  return opts;
});

const chartOptionsRX = computed(() => {
  const opts = {
    ...chartOptions,
    colors: [CHART_COLORS.rx[theme.value]],
  };
  opts.chart.type = globalStore.uiChartType;
  opts.stroke.width = UI_CHART_PROPS[globalStore.uiChartType].strokeWidth;
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
