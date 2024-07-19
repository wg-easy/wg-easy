export const chartOptions = {
  chart: {
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
};
