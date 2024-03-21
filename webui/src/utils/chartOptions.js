import { reactive } from 'vue';

const chartOptions = reactive({
  chart: {
    background: 'transparent',
    type: 'bar',
    stacked: false,
    toolbar: {
      show: false,
    },
    animations: {
      enabled: false,
    },
  },
  colors: [
    '#DDDDDD', // rx
    '#EEEEEE', // tx
  ],
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
      show: true,
    },
    axisBorder: {
      show: true,
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
});

export default chartOptions;