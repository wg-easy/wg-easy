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
import type { ApexChart, ApexOptions } from 'apexcharts';

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
  opts.chart = { ...chartOptions.chart, type: globalStore.uiChartType };
  opts.stroke = {
    ...chartOptions.stroke,
    width: UI_CHART_PROPS[globalStore.uiChartType].strokeWidth,
  };
  return opts;
});

const chartOptionsRX = computed(() => {
  const opts = {
    ...chartOptions,
    colors: [CHART_COLORS.rx[theme.value]],
  };
  opts.chart = { ...chartOptions.chart, type: globalStore.uiChartType };
  opts.stroke = {
    ...chartOptions.stroke,
    width: UI_CHART_PROPS[globalStore.uiChartType].strokeWidth,
  };
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
