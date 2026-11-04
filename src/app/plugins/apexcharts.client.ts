export default defineNuxtPlugin((nuxtApp) => {
  const VueApexCharts = defineAsyncComponent(async () => {
    const [{ default: component }] = await Promise.all([
      import('vue3-apexcharts/core'),
      // Register the area renderer before mounting the traffic charts.
      import('apexcharts/area'),
    ]);
    return component;
  });

  nuxtApp.vueApp.component('apexchart', VueApexCharts);
});
