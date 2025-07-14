import VueApexCharts from 'vue3-apexcharts';

export default defineNuxtPlugin((nuxtApp) => {
  // https://github.com/apexcharts/vue3-apexcharts/issues/141
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nuxtApp.vueApp.use(VueApexCharts as any);
});
